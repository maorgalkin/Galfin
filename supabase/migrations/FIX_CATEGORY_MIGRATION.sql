-- ============================================================================
-- FIX: Category Migration for JSONB-based personal_budgets
-- Run this in Supabase SQL Editor to fix the migration function
-- ============================================================================

-- Drop the incorrect function
DROP FUNCTION IF EXISTS migrate_categories_from_budgets(UUID);

-- Recreate with correct JSONB handling
CREATE OR REPLACE FUNCTION migrate_categories_from_budgets(p_user_id UUID)
RETURNS TABLE (category_name TEXT, category_id UUID, monthly_limit DECIMAL) AS $$
DECLARE
  v_budget RECORD;
  v_category_key TEXT;
  v_category_data JSONB;
  v_category_id UUID;
  v_monthly_limit DECIMAL;
  v_warning_threshold INTEGER;
  v_color TEXT;
  v_household_id UUID;
BEGIN
  -- Get the user's household_id
  SELECT hm.household_id INTO v_household_id
  FROM household_members hm
  WHERE hm.user_id = p_user_id
  LIMIT 1;

  -- Loop through active personal_budgets for this user's household
  FOR v_budget IN 
    SELECT pb.id, pb.categories, pb.user_id
    FROM personal_budgets pb
    WHERE pb.household_id = v_household_id
      AND pb.is_active = true
      AND pb.categories IS NOT NULL
  LOOP
    -- Loop through each key in the categories JSONB
    FOR v_category_key, v_category_data IN 
      SELECT * FROM jsonb_each(v_budget.categories)
    LOOP
      -- Extract values from the JSONB
      v_monthly_limit := COALESCE((v_category_data->>'monthlyLimit')::DECIMAL, 0);
      v_warning_threshold := COALESCE((v_category_data->>'warningThreshold')::INTEGER, 80);
      v_color := COALESCE(v_category_data->>'color', '#3B82F6');
      
      -- Check if category already exists for this user
      SELECT c.id INTO v_category_id
      FROM categories c
      WHERE c.user_id = p_user_id 
        AND c.name = v_category_key 
        AND c.deleted_at IS NULL;
      
      IF v_category_id IS NULL THEN
        -- Create new category
        INSERT INTO categories (
          user_id, 
          household_id,
          name, 
          monthly_limit, 
          warning_threshold,
          color,
          is_system,
          is_active
        )
        VALUES (
          p_user_id, 
          v_household_id,
          v_category_key, 
          v_monthly_limit, 
          v_warning_threshold,
          v_color,
          false,
          COALESCE((v_category_data->>'isActive')::BOOLEAN, true)
        )
        RETURNING id INTO v_category_id;
      ELSE
        -- Update existing category with budget settings if not already set
        UPDATE categories 
        SET 
          monthly_limit = CASE WHEN categories.monthly_limit = 0 THEN v_monthly_limit ELSE categories.monthly_limit END,
          warning_threshold = COALESCE(categories.warning_threshold, v_warning_threshold),
          color = COALESCE(categories.color, v_color),
          household_id = COALESCE(categories.household_id, v_household_id)
        WHERE id = v_category_id;
      END IF;
      
      -- Return the mapping
      category_name := v_category_key;
      category_id := v_category_id;
      monthly_limit := v_monthly_limit;
      RETURN NEXT;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the main migration function to handle errors gracefully
CREATE OR REPLACE FUNCTION migrate_user_categories(p_user_id UUID)
RETURNS TABLE (step TEXT, result JSONB) AS $$
BEGIN
  -- Step 1: Create categories from budgets (JSONB)
  step := 'migrate_from_budgets';
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO result 
  FROM migrate_categories_from_budgets(p_user_id) r;
  RETURN NEXT;
  
  -- Step 2: Create categories from transactions (fills gaps)
  step := 'migrate_from_transactions';
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO result 
  FROM migrate_categories_from_transactions(p_user_id) r;
  RETURN NEXT;
  
  -- Step 3: Update transaction category_ids
  step := 'update_transactions';
  SELECT COALESCE(row_to_json(r)::jsonb, '{}'::jsonb) INTO result 
  FROM update_transaction_category_ids(p_user_id) r;
  RETURN NEXT;
  
  -- Step 4: Update budget category_ids (skip for now - budgets use JSONB)
  step := 'update_budgets';
  result := '{"note": "personal_budgets uses JSONB categories, no category_id to update"}'::jsonb;
  RETURN NEXT;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test output
SELECT 'Migration functions fixed!' as status;
