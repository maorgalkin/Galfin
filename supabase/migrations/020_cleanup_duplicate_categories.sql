-- Migration 020: Cleanup Duplicate Categories
-- Part of Category Management Restructure (Phase 4)
-- 
-- This migration consolidates duplicate category records that were created
-- during the initial migration. Duplicates occur when the same category name
-- exists both as a user-only record and a household record.
--
-- Strategy:
-- 1. For each duplicate set, keep the household version (or the oldest if no household)
-- 2. Update all transaction category_id references to point to the surviving record
-- 3. Update all budget references
-- 4. Delete the duplicate records

-- ============================================
-- Function: Cleanup duplicate categories for a user
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_duplicate_categories(p_user_id UUID)
RETURNS TABLE (
  category_name TEXT,
  duplicates_found INT,
  transactions_updated BIGINT,
  kept_category_id UUID,
  deleted_category_ids UUID[]
) AS $$
DECLARE
  v_category_name TEXT;
  v_duplicate_ids UUID[];
  v_keep_id UUID;
  v_delete_ids UUID[];
  v_tx_count BIGINT;
BEGIN
  -- Find all category names that have duplicates for this user
  FOR v_category_name, v_duplicate_ids IN
    SELECT c.name, ARRAY_AGG(c.id ORDER BY 
      CASE WHEN c.household_id IS NOT NULL THEN 0 ELSE 1 END,  -- Prefer household
      c.created_at ASC  -- Then oldest
    )
    FROM categories c
    WHERE c.user_id = p_user_id
      AND c.deleted_at IS NULL
    GROUP BY c.name
    HAVING COUNT(*) > 1
  LOOP
    -- First ID is the one to keep (household preferred, then oldest)
    v_keep_id := v_duplicate_ids[1];
    -- Rest are to be deleted
    v_delete_ids := v_duplicate_ids[2:array_length(v_duplicate_ids, 1)];
    
    -- Update transactions to point to the kept category
    WITH updated AS (
      UPDATE transactions
      SET 
        category_id = v_keep_id,
        original_category_id = COALESCE(original_category_id, category_id),
        category_changed_at = CASE WHEN category_id != v_keep_id THEN NOW() ELSE category_changed_at END,
        category_change_reason = CASE WHEN category_id != v_keep_id THEN 'duplicate_cleanup' ELSE category_change_reason END
      WHERE category_id = ANY(v_delete_ids)
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_tx_count FROM updated;
    
    -- Update personal_budgets references
    UPDATE personal_budgets
    SET category_id = v_keep_id
    WHERE category_id = ANY(v_delete_ids);
    
    -- Update monthly_budgets references
    UPDATE monthly_budgets
    SET 
      category_id = v_keep_id,
      original_category_id = COALESCE(original_category_id, category_id)
    WHERE category_id = ANY(v_delete_ids);
    
    -- Update budget_adjustments references
    UPDATE budget_adjustments
    SET category_id = v_keep_id
    WHERE category_id = ANY(v_delete_ids);
    
    -- Soft-delete the duplicate categories
    UPDATE categories
    SET 
      deleted_at = NOW(),
      deleted_reason = 'merged',
      merged_into_id = v_keep_id,
      is_active = false
    WHERE id = ANY(v_delete_ids);
    
    -- Return the result for this category
    category_name := v_category_name;
    duplicates_found := array_length(v_duplicate_ids, 1);
    transactions_updated := v_tx_count;
    kept_category_id := v_keep_id;
    deleted_category_ids := v_delete_ids;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Cleanup duplicates for ALL users (admin use)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_all_duplicate_categories()
RETURNS TABLE (
  user_id UUID,
  category_name TEXT,
  duplicates_found INT,
  transactions_updated BIGINT,
  kept_category_id UUID
) AS $$
DECLARE
  v_user_id UUID;
  v_result RECORD;
BEGIN
  -- Loop through all users who have categories
  FOR v_user_id IN
    SELECT DISTINCT c.user_id FROM categories c WHERE c.deleted_at IS NULL
  LOOP
    -- Run cleanup for each user
    FOR v_result IN
      SELECT * FROM cleanup_duplicate_categories(v_user_id)
    LOOP
      user_id := v_user_id;
      category_name := v_result.category_name;
      duplicates_found := v_result.duplicates_found;
      transactions_updated := v_result.transactions_updated;
      kept_category_id := v_result.kept_category_id;
      RETURN NEXT;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Run the cleanup for all users
-- ============================================
DO $$
DECLARE
  v_result RECORD;
  v_total_duplicates INT := 0;
  v_total_transactions BIGINT := 0;
BEGIN
  RAISE NOTICE 'Starting duplicate category cleanup...';
  
  FOR v_result IN SELECT * FROM cleanup_all_duplicate_categories()
  LOOP
    RAISE NOTICE 'User %: Merged % duplicates of "%" (% transactions updated)',
      v_result.user_id,
      v_result.duplicates_found,
      v_result.category_name,
      v_result.transactions_updated;
    
    v_total_duplicates := v_total_duplicates + v_result.duplicates_found - 1;
    v_total_transactions := v_total_transactions + v_result.transactions_updated;
  END LOOP;
  
  RAISE NOTICE 'Cleanup complete. Removed % duplicate categories, updated % transactions.',
    v_total_duplicates, v_total_transactions;
END;
$$;

-- Comments
COMMENT ON FUNCTION cleanup_duplicate_categories IS 'Merges duplicate category records for a user, keeping the household version';
COMMENT ON FUNCTION cleanup_all_duplicate_categories IS 'Runs duplicate cleanup for all users in the system';
