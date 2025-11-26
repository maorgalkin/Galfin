-- Migration 018: Category Merge History Table
-- Part of Category Management Restructure (Phase 1)
-- See: docs/CATEGORY_MANAGEMENT_RESTRUCTURE.md
--
-- This table provides an audit trail for category merges,
-- enabling potential undo operations and historical analysis.

CREATE TABLE IF NOT EXISTS category_merge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User/household context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  
  -- The merge operation
  source_category_id UUID NOT NULL,  -- The category being merged (will be soft-deleted)
  target_category_id UUID NOT NULL REFERENCES categories(id),  -- The category being merged into
  
  -- Snapshot of source at time of merge (for potential undo)
  source_category_name TEXT NOT NULL,
  source_category_color TEXT,
  source_category_monthly_limit DECIMAL(12,2),
  source_category_settings JSONB,  -- Full snapshot of source settings
  
  -- Counts at time of merge
  transactions_affected INTEGER DEFAULT 0,
  monthly_budgets_affected INTEGER DEFAULT 0,
  
  -- Metadata
  merged_at TIMESTAMPTZ DEFAULT NOW(),
  merged_by UUID NOT NULL REFERENCES auth.users(id),  -- Who performed the merge
  merge_reason TEXT,  -- Optional: why the merge was performed
  
  -- Undo tracking
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_merge_history_user ON category_merge_history(user_id);
CREATE INDEX idx_merge_history_source ON category_merge_history(source_category_id);
CREATE INDEX idx_merge_history_target ON category_merge_history(target_category_id);
CREATE INDEX idx_merge_history_merged_at ON category_merge_history(merged_at DESC);
CREATE INDEX idx_merge_history_household ON category_merge_history(household_id) 
  WHERE household_id IS NOT NULL;

-- Enable RLS
ALTER TABLE category_merge_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own merge history"
  ON category_merge_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own merge history"
  ON category_merge_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own merge history"
  ON category_merge_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Household members can view shared merge history
CREATE POLICY "Household members can view shared merge history"
  ON category_merge_history FOR SELECT
  USING (
    household_id IS NOT NULL AND
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

-- ============================================
-- Function: Merge categories with history tracking
-- ============================================
CREATE OR REPLACE FUNCTION merge_categories(
  p_source_category_id UUID,
  p_target_category_id UUID,
  p_merge_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  merge_id UUID,
  transactions_updated INTEGER,
  monthly_budgets_updated INTEGER,
  source_deleted BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_household_id UUID;
  v_source RECORD;
  v_merge_id UUID;
  v_tx_count INTEGER := 0;
  v_mb_count INTEGER := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get source category details
  SELECT * INTO v_source
  FROM categories
  WHERE id = p_source_category_id AND deleted_at IS NULL;
  
  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Source category not found or already deleted';
  END IF;
  
  -- Verify user owns the source category
  IF v_source.user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to merge this category';
  END IF;
  
  -- Verify target exists and is owned by user
  IF NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE id = p_target_category_id 
      AND user_id = v_user_id 
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Target category not found or not authorized';
  END IF;
  
  -- Create merge history record
  INSERT INTO category_merge_history (
    user_id,
    household_id,
    source_category_id,
    target_category_id,
    source_category_name,
    source_category_color,
    source_category_monthly_limit,
    source_category_settings,
    merged_by,
    merge_reason
  )
  VALUES (
    v_user_id,
    v_source.household_id,
    p_source_category_id,
    p_target_category_id,
    v_source.name,
    v_source.color,
    v_source.monthly_limit,
    jsonb_build_object(
      'description', v_source.description,
      'warning_threshold', v_source.warning_threshold,
      'sort_order', v_source.sort_order,
      'is_active', v_source.is_active
    ),
    v_user_id,
    p_merge_reason
  )
  RETURNING id INTO v_merge_id;
  
  -- Update transactions: move from source to target
  WITH updated AS (
    UPDATE transactions
    SET 
      category_id = p_target_category_id,
      category = (SELECT name FROM categories WHERE id = p_target_category_id),
      original_category_id = COALESCE(original_category_id, p_source_category_id),
      category_changed_at = NOW(),
      category_change_reason = 'merge'
    WHERE category_id = p_source_category_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_tx_count FROM updated;
  
  -- Update monthly_budgets: move from source to target
  -- Note: This may cause duplicates which should be handled by the application
  WITH updated AS (
    UPDATE monthly_budgets
    SET 
      category_id = p_target_category_id,
      category = (SELECT name FROM categories WHERE id = p_target_category_id),
      original_category_id = COALESCE(original_category_id, p_source_category_id)
    WHERE category_id = p_source_category_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_mb_count FROM updated;
  
  -- Update merge history with counts
  UPDATE category_merge_history
  SET 
    transactions_affected = v_tx_count,
    monthly_budgets_affected = v_mb_count
  WHERE id = v_merge_id;
  
  -- Soft-delete the source category
  UPDATE categories
  SET 
    deleted_at = NOW(),
    deleted_reason = 'merged',
    merged_into_id = p_target_category_id,
    is_active = false
  WHERE id = p_source_category_id;
  
  -- Return results
  merge_id := v_merge_id;
  transactions_updated := v_tx_count;
  monthly_budgets_updated := v_mb_count;
  source_deleted := true;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Undo a category merge
-- ============================================
CREATE OR REPLACE FUNCTION undo_category_merge(p_merge_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  transactions_reverted INTEGER,
  monthly_budgets_reverted INTEGER,
  source_restored BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_merge RECORD;
  v_tx_count INTEGER := 0;
  v_mb_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  
  -- Get merge history
  SELECT * INTO v_merge
  FROM category_merge_history
  WHERE id = p_merge_id AND undone_at IS NULL;
  
  IF v_merge IS NULL THEN
    RAISE EXCEPTION 'Merge history not found or already undone';
  END IF;
  
  -- Verify user owns the merge
  IF v_merge.user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to undo this merge';
  END IF;
  
  -- Restore the source category
  UPDATE categories
  SET 
    deleted_at = NULL,
    deleted_reason = NULL,
    merged_into_id = NULL,
    is_active = true,
    name = v_merge.source_category_name,
    color = v_merge.source_category_color,
    monthly_limit = v_merge.source_category_monthly_limit
  WHERE id = v_merge.source_category_id;
  
  -- Revert transactions that have the original_category_id matching source
  WITH updated AS (
    UPDATE transactions
    SET 
      category_id = v_merge.source_category_id,
      category = v_merge.source_category_name,
      category_changed_at = NOW(),
      category_change_reason = 'merge_undone'
    WHERE original_category_id = v_merge.source_category_id
      AND category_changed_at >= v_merge.merged_at
      AND category_change_reason = 'merge'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_tx_count FROM updated;
  
  -- Revert monthly_budgets
  WITH updated AS (
    UPDATE monthly_budgets
    SET 
      category_id = v_merge.source_category_id,
      category = v_merge.source_category_name
    WHERE original_category_id = v_merge.source_category_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_mb_count FROM updated;
  
  -- Mark merge as undone
  UPDATE category_merge_history
  SET 
    undone_at = NOW(),
    undone_by = v_user_id
  WHERE id = p_merge_id;
  
  -- Return results
  success := true;
  transactions_reverted := v_tx_count;
  monthly_budgets_reverted := v_mb_count;
  source_restored := true;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE category_merge_history IS 'Audit trail for category merges, enables undo operations';
COMMENT ON FUNCTION merge_categories IS 'Merges source category into target with full history tracking';
COMMENT ON FUNCTION undo_category_merge IS 'Reverts a category merge using stored history';
