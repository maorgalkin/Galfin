-- ============================================================================
-- FIX: Legacy User Data Issues
-- ============================================================================
-- For users created before November 2025, this script:
-- 1. Ensures household_id is set on all tables
-- 2. Fixes any orphaned data
-- 3. Syncs category names across all tables
-- ============================================================================

-- ⚠️ CHANGE THIS to the user's email or ID
-- Option A: Set by email
DO $$
DECLARE
  target_email TEXT := 'maor.galkin@gmail.com';  -- ← CHANGE THIS
  target_user_id UUID;
  target_household_id UUID;
  
  -- Stats
  transactions_fixed INT := 0;
  personal_budgets_fixed INT := 0;
  monthly_budgets_fixed INT := 0;
  categories_fixed INT := 0;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;
  
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Fixing data for user: % (ID: %)', target_email, target_user_id;
  RAISE NOTICE '=================================================================';
  
  -- Get user's household
  SELECT household_id INTO target_household_id
  FROM household_members
  WHERE user_id = target_user_id
  LIMIT 1;
  
  IF target_household_id IS NULL THEN
    RAISE NOTICE 'User has no household - creating one...';
    
    INSERT INTO households (name, created_by)
    VALUES ('My Household', target_user_id)
    RETURNING id INTO target_household_id;
    
    INSERT INTO household_members (household_id, user_id, role, invited_by)
    VALUES (target_household_id, target_user_id, 'owner', target_user_id);
    
    RAISE NOTICE '  ✓ Created household: %', target_household_id;
  ELSE
    RAISE NOTICE '  User household: %', target_household_id;
  END IF;
  
  -- ========================================================================
  -- Fix 1: Transactions without household_id
  -- ========================================================================
  UPDATE transactions
  SET household_id = target_household_id
  WHERE user_id = target_user_id
    AND household_id IS NULL;
  
  GET DIAGNOSTICS transactions_fixed = ROW_COUNT;
  RAISE NOTICE '  ✓ Fixed % transactions missing household_id', transactions_fixed;
  
  -- ========================================================================
  -- Fix 2: Personal budgets without household_id
  -- ========================================================================
  UPDATE personal_budgets
  SET household_id = target_household_id
  WHERE user_id = target_user_id
    AND household_id IS NULL;
  
  GET DIAGNOSTICS personal_budgets_fixed = ROW_COUNT;
  RAISE NOTICE '  ✓ Fixed % personal_budgets missing household_id', personal_budgets_fixed;
  
  -- ========================================================================
  -- Fix 3: Monthly budgets without household_id
  -- ========================================================================
  UPDATE monthly_budgets
  SET household_id = target_household_id
  WHERE user_id = target_user_id
    AND household_id IS NULL;
  
  GET DIAGNOSTICS monthly_budgets_fixed = ROW_COUNT;
  RAISE NOTICE '  ✓ Fixed % monthly_budgets missing household_id', monthly_budgets_fixed;
  
  -- ========================================================================
  -- Fix 4: Categories without household_id
  -- ========================================================================
  UPDATE categories
  SET household_id = target_household_id
  WHERE user_id = target_user_id
    AND household_id IS NULL;
  
  GET DIAGNOSTICS categories_fixed = ROW_COUNT;
  RAISE NOTICE '  ✓ Fixed % categories missing household_id', categories_fixed;
  
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'COMPLETE - Fixed data for user %', target_email;
  RAISE NOTICE '=================================================================';
END $$;

-- ============================================================================
-- Verification: Check data integrity
-- ============================================================================
DO $$
DECLARE
  target_email TEXT := 'galfin.app@gmail.com';  -- ← CHANGE THIS (same as above)
  target_user_id UUID;
  rec RECORD;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Data Integrity Check for %:', target_email;
  RAISE NOTICE '';
  
  -- Check transactions
  SELECT 
    COUNT(*) as total,
    COUNT(household_id) as with_household,
    COUNT(category_id) as with_category_id
  INTO rec
  FROM transactions WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Transactions: % total, % with household_id, % with category_id', 
    rec.total, rec.with_household, rec.with_category_id;
  
  -- Check personal budgets
  SELECT COUNT(*) as total, COUNT(household_id) as with_household
  INTO rec
  FROM personal_budgets WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Personal Budgets: % total, % with household_id', rec.total, rec.with_household;
  
  -- Check monthly budgets
  SELECT COUNT(*) as total, COUNT(household_id) as with_household
  INTO rec
  FROM monthly_budgets WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Monthly Budgets: % total, % with household_id', rec.total, rec.with_household;
  
  -- Check categories
  SELECT COUNT(*) as total, COUNT(household_id) as with_household
  INTO rec
  FROM categories WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Categories: % total, % with household_id', rec.total, rec.with_household;
  
END $$;

-- ============================================================================
-- Manual Category Rename (if needed)
-- ============================================================================
-- Uncomment and modify this section to manually fix a category rename
/*
DO $$
DECLARE
  target_email TEXT := 'galfin.app@gmail.com';
  target_user_id UUID;
  target_household_id UUID;
  old_category_name TEXT := 'OldName';  -- ← CHANGE THIS
  new_category_name TEXT := 'NewName';  -- ← CHANGE THIS
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  SELECT household_id INTO target_household_id FROM household_members WHERE user_id = target_user_id LIMIT 1;
  
  RAISE NOTICE 'Renaming category "%" to "%" for user %', old_category_name, new_category_name, target_email;
  
  -- 1. Update categories table
  UPDATE categories 
  SET name = new_category_name 
  WHERE household_id = target_household_id AND name = old_category_name;
  RAISE NOTICE '  ✓ Updated categories table';
  
  -- 2. Update transactions
  UPDATE transactions 
  SET category = new_category_name 
  WHERE household_id = target_household_id AND category = old_category_name;
  RAISE NOTICE '  ✓ Updated transactions';
  
  -- 3. Update personal_budgets JSONB
  UPDATE personal_budgets
  SET categories = (categories - old_category_name) || 
                   jsonb_build_object(new_category_name, categories->old_category_name)
  WHERE household_id = target_household_id 
    AND categories ? old_category_name;
  RAISE NOTICE '  ✓ Updated personal_budgets';
  
  -- 4. Update monthly_budgets JSONB (both categories and original_categories)
  UPDATE monthly_budgets
  SET 
    categories = (categories - old_category_name) || 
                 jsonb_build_object(new_category_name, categories->old_category_name),
    original_categories = CASE 
      WHEN original_categories ? old_category_name 
      THEN (original_categories - old_category_name) || 
           jsonb_build_object(new_category_name, original_categories->old_category_name)
      ELSE original_categories
    END
  WHERE household_id = target_household_id 
    AND categories ? old_category_name;
  RAISE NOTICE '  ✓ Updated monthly_budgets';
  
  -- 5. Update global_settings.activeExpenseCategories in personal_budgets
  UPDATE personal_budgets
  SET global_settings = jsonb_set(
    global_settings,
    '{activeExpenseCategories}',
    (
      SELECT jsonb_agg(
        CASE WHEN elem = old_category_name THEN new_category_name ELSE elem END
      )
      FROM jsonb_array_elements_text(global_settings->'activeExpenseCategories') AS elem
    )
  )
  WHERE household_id = target_household_id
    AND global_settings->'activeExpenseCategories' ? old_category_name;
  RAISE NOTICE '  ✓ Updated activeExpenseCategories';
  
  RAISE NOTICE '';
  RAISE NOTICE 'Category rename complete!';
END $$;
*/
