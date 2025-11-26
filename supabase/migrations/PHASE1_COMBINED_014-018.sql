-- ============================================================================
-- COMBINED CATEGORY SYSTEM MIGRATIONS (014-018)
-- Part of Category Management Restructure (Phase 1)
-- See: docs/CATEGORY_MANAGEMENT_RESTRUCTURE.md
--
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- MIGRATION 014: Create Categories Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  
  -- Category properties
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  icon TEXT,
  
  -- Budget settings
  monthly_limit DECIMAL(12,2) DEFAULT 0,
  warning_threshold INTEGER DEFAULT 80,
  
  -- State
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Soft-delete and merge tracking
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  deleted_reason TEXT,
  merged_into_id UUID REFERENCES categories(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint for non-deleted categories
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_name 
  ON categories (user_id, COALESCE(household_id, '00000000-0000-0000-0000-000000000000'::uuid), name) 
  WHERE deleted_at IS NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_household ON categories(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_deleted ON categories(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_merged_into ON categories(merged_into_id) WHERE merged_into_id IS NOT NULL;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Household members can view shared categories" ON categories FOR SELECT
  USING (
    household_id IS NOT NULL AND
    household_id IN (SELECT hm.household_id FROM household_members hm WHERE hm.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Household admins can manage shared categories" ON categories FOR ALL
  USING (
    household_id IS NOT NULL AND
    household_id IN (SELECT hm.household_id FROM household_members hm WHERE hm.user_id = auth.uid() AND hm.role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

COMMENT ON TABLE categories IS 'Stores budget categories with proper referential integrity';

-- ============================================================================
-- MIGRATION 015: Add category_id to Transactions
-- ============================================================================

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_category_id UUID REFERENCES categories(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_changed_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_change_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_original_category_id ON transactions(original_category_id) WHERE original_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category_changed ON transactions(category_changed_at) WHERE category_changed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id, date DESC) WHERE category_id IS NOT NULL;

-- ============================================================================
-- MIGRATION 016: Add category_id to Budget Tables
-- ============================================================================

ALTER TABLE personal_budgets ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_personal_budgets_category_id ON personal_budgets(category_id) WHERE category_id IS NOT NULL;

ALTER TABLE monthly_budgets ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE monthly_budgets ADD COLUMN IF NOT EXISTS original_category_id UUID REFERENCES categories(id);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_category_id ON monthly_budgets(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_category_month ON monthly_budgets(user_id, category_id, month, year) WHERE category_id IS NOT NULL;

-- ============================================================================
-- MIGRATION 017: Category Migration Utilities
-- ============================================================================

-- Function: Create categories from existing transaction data
CREATE OR REPLACE FUNCTION migrate_categories_from_transactions(p_user_id UUID)
RETURNS TABLE (category_name TEXT, category_id UUID, transaction_count BIGINT) AS $$
DECLARE
  v_category_name TEXT;
  v_category_id UUID;
  v_count BIGINT;
BEGIN
  FOR v_category_name, v_count IN 
    SELECT t.category, COUNT(*)
    FROM transactions t
    WHERE t.user_id = p_user_id AND t.category IS NOT NULL AND t.category != ''
    GROUP BY t.category
  LOOP
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.user_id = p_user_id AND c.name = v_category_name AND c.deleted_at IS NULL;
    
    IF v_category_id IS NULL THEN
      INSERT INTO categories (user_id, name, is_system)
      VALUES (p_user_id, v_category_name, true)
      RETURNING id INTO v_category_id;
    END IF;
    
    category_name := v_category_name;
    category_id := v_category_id;
    transaction_count := v_count;
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create categories from personal_budgets
CREATE OR REPLACE FUNCTION migrate_categories_from_budgets(p_user_id UUID)
RETURNS TABLE (category_name TEXT, category_id UUID, monthly_limit DECIMAL) AS $$
DECLARE
  v_budget RECORD;
  v_category_id UUID;
BEGIN
  FOR v_budget IN 
    SELECT pb.category, pb.monthly_limit, pb.warning_threshold
    FROM personal_budgets pb
    WHERE pb.user_id = p_user_id AND pb.category IS NOT NULL AND pb.category != ''
  LOOP
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.user_id = p_user_id AND c.name = v_budget.category AND c.deleted_at IS NULL;
    
    IF v_category_id IS NULL THEN
      INSERT INTO categories (user_id, name, monthly_limit, warning_threshold, is_system)
      VALUES (p_user_id, v_budget.category, v_budget.monthly_limit, COALESCE(v_budget.warning_threshold, 80), false)
      RETURNING id INTO v_category_id;
    ELSE
      UPDATE categories 
      SET monthly_limit = COALESCE(categories.monthly_limit, v_budget.monthly_limit),
          warning_threshold = COALESCE(categories.warning_threshold, v_budget.warning_threshold)
      WHERE id = v_category_id AND (monthly_limit IS NULL OR monthly_limit = 0);
    END IF;
    
    category_name := v_budget.category;
    category_id := v_category_id;
    monthly_limit := v_budget.monthly_limit;
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update transaction category_ids
CREATE OR REPLACE FUNCTION update_transaction_category_ids(p_user_id UUID)
RETURNS TABLE (updated_count BIGINT, failed_count BIGINT, missing_categories TEXT[]) AS $$
DECLARE
  v_updated BIGINT := 0;
  v_failed BIGINT := 0;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  WITH category_mapping AS (
    SELECT c.id, c.name FROM categories c WHERE c.user_id = p_user_id AND c.deleted_at IS NULL
  ),
  updates AS (
    UPDATE transactions t
    SET category_id = cm.id, original_category_id = COALESCE(t.original_category_id, cm.id)
    FROM category_mapping cm
    WHERE t.user_id = p_user_id AND t.category = cm.name AND t.category_id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated FROM updates;
  
  SELECT COUNT(*), ARRAY_AGG(DISTINCT t.category)
  INTO v_failed, v_missing
  FROM transactions t
  WHERE t.user_id = p_user_id AND t.category IS NOT NULL AND t.category != '' AND t.category_id IS NULL;
  
  updated_count := v_updated;
  failed_count := COALESCE(v_failed, 0);
  missing_categories := COALESCE(v_missing, ARRAY[]::TEXT[]);
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update budget category_ids
CREATE OR REPLACE FUNCTION update_budget_category_ids(p_user_id UUID)
RETURNS TABLE (personal_updated BIGINT, monthly_updated BIGINT, missing_categories TEXT[]) AS $$
DECLARE
  v_personal BIGINT := 0;
  v_monthly BIGINT := 0;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  WITH category_mapping AS (
    SELECT c.id, c.name FROM categories c WHERE c.user_id = p_user_id AND c.deleted_at IS NULL
  ),
  updates AS (
    UPDATE personal_budgets pb SET category_id = cm.id
    FROM category_mapping cm
    WHERE pb.user_id = p_user_id AND pb.category = cm.name AND pb.category_id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_personal FROM updates;
  
  WITH category_mapping AS (
    SELECT c.id, c.name FROM categories c WHERE c.user_id = p_user_id AND c.deleted_at IS NULL
  ),
  updates AS (
    UPDATE monthly_budgets mb
    SET category_id = cm.id, original_category_id = COALESCE(mb.original_category_id, cm.id)
    FROM category_mapping cm
    WHERE mb.user_id = p_user_id AND mb.category = cm.name AND mb.category_id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_monthly FROM updates;
  
  SELECT ARRAY_AGG(DISTINCT category) INTO v_missing
  FROM (
    SELECT pb.category FROM personal_budgets pb WHERE pb.user_id = p_user_id AND pb.category_id IS NULL AND pb.category IS NOT NULL
    UNION
    SELECT mb.category FROM monthly_budgets mb WHERE mb.user_id = p_user_id AND mb.category_id IS NULL AND mb.category IS NOT NULL
  ) missing;
  
  personal_updated := v_personal;
  monthly_updated := v_monthly;
  missing_categories := COALESCE(v_missing, ARRAY[]::TEXT[]);
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Full migration for a user
CREATE OR REPLACE FUNCTION migrate_user_categories(p_user_id UUID)
RETURNS TABLE (step TEXT, result JSONB) AS $$
DECLARE
  v_result RECORD;
BEGIN
  step := 'migrate_from_budgets';
  SELECT jsonb_agg(row_to_json(r)) INTO result FROM migrate_categories_from_budgets(p_user_id) r;
  RETURN NEXT;
  
  step := 'migrate_from_transactions';
  SELECT jsonb_agg(row_to_json(r)) INTO result FROM migrate_categories_from_transactions(p_user_id) r;
  RETURN NEXT;
  
  step := 'update_transactions';
  SELECT row_to_json(r)::jsonb INTO result FROM update_transaction_category_ids(p_user_id) r;
  RETURN NEXT;
  
  step := 'update_budgets';
  SELECT row_to_json(r)::jsonb INTO result FROM update_budget_category_ids(p_user_id) r;
  RETURN NEXT;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION 018: Category Merge History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS category_merge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  source_category_id UUID NOT NULL,
  target_category_id UUID NOT NULL REFERENCES categories(id),
  source_category_name TEXT NOT NULL,
  source_category_color TEXT,
  source_category_monthly_limit DECIMAL(12,2),
  source_category_settings JSONB,
  transactions_affected INTEGER DEFAULT 0,
  monthly_budgets_affected INTEGER DEFAULT 0,
  merged_at TIMESTAMPTZ DEFAULT NOW(),
  merged_by UUID NOT NULL REFERENCES auth.users(id),
  merge_reason TEXT,
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_merge_history_user ON category_merge_history(user_id);
CREATE INDEX IF NOT EXISTS idx_merge_history_source ON category_merge_history(source_category_id);
CREATE INDEX IF NOT EXISTS idx_merge_history_target ON category_merge_history(target_category_id);
CREATE INDEX IF NOT EXISTS idx_merge_history_merged_at ON category_merge_history(merged_at DESC);
CREATE INDEX IF NOT EXISTS idx_merge_history_household ON category_merge_history(household_id) WHERE household_id IS NOT NULL;

ALTER TABLE category_merge_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own merge history" ON category_merge_history FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own merge history" ON category_merge_history FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own merge history" ON category_merge_history FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Household members can view shared merge history" ON category_merge_history FOR SELECT
  USING (household_id IS NOT NULL AND household_id IN (SELECT hm.household_id FROM household_members hm WHERE hm.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Function: Merge categories with history tracking
CREATE OR REPLACE FUNCTION merge_categories(
  p_source_category_id UUID,
  p_target_category_id UUID,
  p_merge_reason TEXT DEFAULT NULL
)
RETURNS TABLE (merge_id UUID, transactions_updated INTEGER, monthly_budgets_updated INTEGER, source_deleted BOOLEAN) AS $$
DECLARE
  v_user_id UUID;
  v_source RECORD;
  v_merge_id UUID;
  v_tx_count INTEGER := 0;
  v_mb_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_source FROM categories WHERE id = p_source_category_id AND deleted_at IS NULL;
  IF v_source IS NULL THEN RAISE EXCEPTION 'Source category not found or already deleted'; END IF;
  IF v_source.user_id != v_user_id THEN RAISE EXCEPTION 'Not authorized to merge this category'; END IF;
  IF NOT EXISTS (SELECT 1 FROM categories WHERE id = p_target_category_id AND user_id = v_user_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Target category not found or not authorized';
  END IF;
  
  INSERT INTO category_merge_history (user_id, household_id, source_category_id, target_category_id, source_category_name, source_category_color, source_category_monthly_limit, source_category_settings, merged_by, merge_reason)
  VALUES (v_user_id, v_source.household_id, p_source_category_id, p_target_category_id, v_source.name, v_source.color, v_source.monthly_limit,
    jsonb_build_object('description', v_source.description, 'warning_threshold', v_source.warning_threshold, 'sort_order', v_source.sort_order, 'is_active', v_source.is_active),
    v_user_id, p_merge_reason)
  RETURNING id INTO v_merge_id;
  
  WITH updated AS (
    UPDATE transactions
    SET category_id = p_target_category_id, category = (SELECT name FROM categories WHERE id = p_target_category_id),
        original_category_id = COALESCE(original_category_id, p_source_category_id), category_changed_at = NOW(), category_change_reason = 'merge'
    WHERE category_id = p_source_category_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_tx_count FROM updated;
  
  WITH updated AS (
    UPDATE monthly_budgets
    SET category_id = p_target_category_id, category = (SELECT name FROM categories WHERE id = p_target_category_id),
        original_category_id = COALESCE(original_category_id, p_source_category_id)
    WHERE category_id = p_source_category_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_mb_count FROM updated;
  
  UPDATE category_merge_history SET transactions_affected = v_tx_count, monthly_budgets_affected = v_mb_count WHERE id = v_merge_id;
  UPDATE categories SET deleted_at = NOW(), deleted_reason = 'merged', merged_into_id = p_target_category_id, is_active = false WHERE id = p_source_category_id;
  
  merge_id := v_merge_id;
  transactions_updated := v_tx_count;
  monthly_budgets_updated := v_mb_count;
  source_deleted := true;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Undo a category merge
CREATE OR REPLACE FUNCTION undo_category_merge(p_merge_id UUID)
RETURNS TABLE (success BOOLEAN, transactions_reverted INTEGER, monthly_budgets_reverted INTEGER, source_restored BOOLEAN) AS $$
DECLARE
  v_user_id UUID;
  v_merge RECORD;
  v_tx_count INTEGER := 0;
  v_mb_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_merge FROM category_merge_history WHERE id = p_merge_id AND undone_at IS NULL;
  IF v_merge IS NULL THEN RAISE EXCEPTION 'Merge history not found or already undone'; END IF;
  IF v_merge.user_id != v_user_id THEN RAISE EXCEPTION 'Not authorized to undo this merge'; END IF;
  
  UPDATE categories
  SET deleted_at = NULL, deleted_reason = NULL, merged_into_id = NULL, is_active = true,
      name = v_merge.source_category_name, color = v_merge.source_category_color, monthly_limit = v_merge.source_category_monthly_limit
  WHERE id = v_merge.source_category_id;
  
  WITH updated AS (
    UPDATE transactions
    SET category_id = v_merge.source_category_id, category = v_merge.source_category_name, category_changed_at = NOW(), category_change_reason = 'merge_undone'
    WHERE original_category_id = v_merge.source_category_id AND category_changed_at >= v_merge.merged_at AND category_change_reason = 'merge'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_tx_count FROM updated;
  
  WITH updated AS (
    UPDATE monthly_budgets SET category_id = v_merge.source_category_id, category = v_merge.source_category_name
    WHERE original_category_id = v_merge.source_category_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_mb_count FROM updated;
  
  UPDATE category_merge_history SET undone_at = NOW(), undone_by = v_user_id WHERE id = p_merge_id;
  
  success := true;
  transactions_reverted := v_tx_count;
  monthly_budgets_reverted := v_mb_count;
  source_restored := true;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE! All migrations complete.
-- ============================================================================
SELECT 'Category system migrations complete!' as status;
