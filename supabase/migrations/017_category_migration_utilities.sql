-- Migration 017: Category Migration Utilities
-- Part of Category Management Restructure (Phase 1)
-- See: docs/CATEGORY_MANAGEMENT_RESTRUCTURE.md
-- 
-- These functions help migrate existing string-based categories to the new UUID system.
-- They are designed to be run incrementally and can be re-run safely.

-- ============================================
-- Function: Create categories from existing transaction data
-- ============================================
CREATE OR REPLACE FUNCTION migrate_categories_from_transactions(p_user_id UUID)
RETURNS TABLE (
  category_name TEXT,
  category_id UUID,
  transaction_count BIGINT
) AS $$
DECLARE
  v_category_name TEXT;
  v_category_id UUID;
  v_count BIGINT;
BEGIN
  -- Loop through all unique categories for this user
  FOR v_category_name, v_count IN 
    SELECT t.category, COUNT(*)
    FROM transactions t
    WHERE t.user_id = p_user_id 
      AND t.category IS NOT NULL 
      AND t.category != ''
    GROUP BY t.category
  LOOP
    -- Check if category already exists
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.user_id = p_user_id 
      AND c.name = v_category_name
      AND c.deleted_at IS NULL;
    
    -- If not exists, create it
    IF v_category_id IS NULL THEN
      INSERT INTO categories (user_id, name, is_system)
      VALUES (p_user_id, v_category_name, true)
      RETURNING id INTO v_category_id;
    END IF;
    
    -- Return the mapping
    category_name := v_category_name;
    category_id := v_category_id;
    transaction_count := v_count;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Create categories from personal_budgets
-- ============================================
CREATE OR REPLACE FUNCTION migrate_categories_from_budgets(p_user_id UUID)
RETURNS TABLE (
  category_name TEXT,
  category_id UUID,
  monthly_limit DECIMAL
) AS $$
DECLARE
  v_budget RECORD;
  v_category_id UUID;
BEGIN
  -- Loop through all personal budgets for this user
  FOR v_budget IN 
    SELECT pb.category, pb.monthly_limit, pb.warning_threshold
    FROM personal_budgets pb
    WHERE pb.user_id = p_user_id 
      AND pb.category IS NOT NULL 
      AND pb.category != ''
  LOOP
    -- Check if category already exists
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.user_id = p_user_id 
      AND c.name = v_budget.category
      AND c.deleted_at IS NULL;
    
    -- If not exists, create it with budget settings
    IF v_category_id IS NULL THEN
      INSERT INTO categories (
        user_id, 
        name, 
        monthly_limit, 
        warning_threshold,
        is_system
      )
      VALUES (
        p_user_id, 
        v_budget.category, 
        v_budget.monthly_limit, 
        COALESCE(v_budget.warning_threshold, 80),
        false
      )
      RETURNING id INTO v_category_id;
    ELSE
      -- Update existing category with budget settings if not already set
      UPDATE categories 
      SET 
        monthly_limit = COALESCE(categories.monthly_limit, v_budget.monthly_limit),
        warning_threshold = COALESCE(categories.warning_threshold, v_budget.warning_threshold)
      WHERE id = v_category_id
        AND (monthly_limit IS NULL OR monthly_limit = 0);
    END IF;
    
    -- Return the mapping
    category_name := v_budget.category;
    category_id := v_category_id;
    monthly_limit := v_budget.monthly_limit;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Update transaction category_ids from category names
-- ============================================
CREATE OR REPLACE FUNCTION update_transaction_category_ids(p_user_id UUID)
RETURNS TABLE (
  updated_count BIGINT,
  failed_count BIGINT,
  missing_categories TEXT[]
) AS $$
DECLARE
  v_updated BIGINT := 0;
  v_failed BIGINT := 0;
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_category_name TEXT;
BEGIN
  -- Update all transactions that have a category name but no category_id
  WITH category_mapping AS (
    SELECT c.id, c.name
    FROM categories c
    WHERE c.user_id = p_user_id AND c.deleted_at IS NULL
  ),
  updates AS (
    UPDATE transactions t
    SET 
      category_id = cm.id,
      original_category_id = COALESCE(t.original_category_id, cm.id)
    FROM category_mapping cm
    WHERE t.user_id = p_user_id
      AND t.category = cm.name
      AND t.category_id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated FROM updates;
  
  -- Count transactions with categories that don't exist
  SELECT COUNT(*), ARRAY_AGG(DISTINCT t.category)
  INTO v_failed, v_missing
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.category IS NOT NULL
    AND t.category != ''
    AND t.category_id IS NULL;
  
  -- Return results
  updated_count := v_updated;
  failed_count := COALESCE(v_failed, 0);
  missing_categories := COALESCE(v_missing, ARRAY[]::TEXT[]);
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Update budget category_ids from category names
-- ============================================
CREATE OR REPLACE FUNCTION update_budget_category_ids(p_user_id UUID)
RETURNS TABLE (
  personal_updated BIGINT,
  monthly_updated BIGINT,
  missing_categories TEXT[]
) AS $$
DECLARE
  v_personal BIGINT := 0;
  v_monthly BIGINT := 0;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Update personal_budgets
  WITH category_mapping AS (
    SELECT c.id, c.name
    FROM categories c
    WHERE c.user_id = p_user_id AND c.deleted_at IS NULL
  ),
  updates AS (
    UPDATE personal_budgets pb
    SET category_id = cm.id
    FROM category_mapping cm
    WHERE pb.user_id = p_user_id
      AND pb.category = cm.name
      AND pb.category_id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_personal FROM updates;
  
  -- Update monthly_budgets
  WITH category_mapping AS (
    SELECT c.id, c.name
    FROM categories c
    WHERE c.user_id = p_user_id AND c.deleted_at IS NULL
  ),
  updates AS (
    UPDATE monthly_budgets mb
    SET 
      category_id = cm.id,
      original_category_id = COALESCE(mb.original_category_id, cm.id)
    FROM category_mapping cm
    WHERE mb.user_id = p_user_id
      AND mb.category = cm.name
      AND mb.category_id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_monthly FROM updates;
  
  -- Find missing categories in budgets
  SELECT ARRAY_AGG(DISTINCT category)
  INTO v_missing
  FROM (
    SELECT pb.category FROM personal_budgets pb
    WHERE pb.user_id = p_user_id AND pb.category_id IS NULL AND pb.category IS NOT NULL
    UNION
    SELECT mb.category FROM monthly_budgets mb
    WHERE mb.user_id = p_user_id AND mb.category_id IS NULL AND mb.category IS NOT NULL
  ) missing;
  
  -- Return results
  personal_updated := v_personal;
  monthly_updated := v_monthly;
  missing_categories := COALESCE(v_missing, ARRAY[]::TEXT[]);
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Full migration for a user
-- Runs all migration steps in order
-- ============================================
CREATE OR REPLACE FUNCTION migrate_user_categories(p_user_id UUID)
RETURNS TABLE (
  step TEXT,
  result JSONB
) AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Step 1: Create categories from budgets first (has budget settings)
  step := 'migrate_from_budgets';
  SELECT jsonb_agg(row_to_json(r)) INTO result
  FROM migrate_categories_from_budgets(p_user_id) r;
  RETURN NEXT;
  
  -- Step 2: Create categories from transactions (fills gaps)
  step := 'migrate_from_transactions';
  SELECT jsonb_agg(row_to_json(r)) INTO result
  FROM migrate_categories_from_transactions(p_user_id) r;
  RETURN NEXT;
  
  -- Step 3: Update transaction category_ids
  step := 'update_transactions';
  SELECT row_to_json(r)::jsonb INTO result
  FROM update_transaction_category_ids(p_user_id) r;
  RETURN NEXT;
  
  -- Step 4: Update budget category_ids
  step := 'update_budgets';
  SELECT row_to_json(r)::jsonb INTO result
  FROM update_budget_category_ids(p_user_id) r;
  RETURN NEXT;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION migrate_categories_from_transactions IS 'Creates category records from unique transaction categories for a user';
COMMENT ON FUNCTION migrate_categories_from_budgets IS 'Creates category records from personal_budgets with budget settings';
COMMENT ON FUNCTION update_transaction_category_ids IS 'Updates transaction.category_id based on category name matching';
COMMENT ON FUNCTION update_budget_category_ids IS 'Updates budget tables category_id based on category name matching';
COMMENT ON FUNCTION migrate_user_categories IS 'Runs complete category migration for a user in correct order';
