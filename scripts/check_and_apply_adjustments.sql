-- ============================================================================
-- Check and Apply Pending Budget Adjustments
-- ============================================================================
-- Run this in Supabase SQL Editor to see and optionally apply pending adjustments
-- ============================================================================

-- ⚠️ CHANGE THIS to your email
DO $$
DECLARE
  target_email TEXT := 'maor.galkin@gmail.com';  -- ← CHANGE THIS
  target_user_id UUID;
  rec RECORD;
  adjustment_count INT := 0;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Pending Budget Adjustments for %', target_email;
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  
  -- List all pending adjustments
  FOR rec IN 
    SELECT 
      id,
      category_name,
      adjustment_type,
      current_limit,
      new_limit,
      adjustment_amount,
      effective_year,
      effective_month,
      reason,
      created_at
    FROM budget_adjustments
    WHERE user_id = target_user_id
      AND is_applied = false
    ORDER BY effective_year, effective_month, category_name
  LOOP
    adjustment_count := adjustment_count + 1;
    RAISE NOTICE '% | %-20s | % → % (% %) | Effective: %-%', 
      rec.id,
      rec.category_name,
      rec.current_limit,
      rec.new_limit,
      rec.adjustment_type,
      rec.adjustment_amount,
      rec.effective_year,
      rec.effective_month;
  END LOOP;
  
  IF adjustment_count = 0 THEN
    RAISE NOTICE 'No pending adjustments found.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'Total: % pending adjustment(s)', adjustment_count;
  END IF;
  
END $$;

-- ============================================================================
-- VIEW PENDING ADJUSTMENTS (as a table)
-- ============================================================================
SELECT 
  id,
  category_name,
  adjustment_type,
  current_limit,
  new_limit,
  adjustment_amount,
  effective_year || '-' || effective_month AS effective_date,
  reason,
  created_at
FROM budget_adjustments
WHERE is_applied = false
ORDER BY effective_year, effective_month, category_name;

-- ============================================================================
-- CLEANUP: Delete stale adjustments from past months
-- ============================================================================
-- These are adjustments that were scheduled for months that have already passed
-- and will never be applied automatically.

-- First, see what would be deleted:
SELECT 
  id,
  category_name,
  effective_year || '-' || effective_month AS effective_date,
  'STALE - will be deleted' AS status
FROM budget_adjustments
WHERE is_applied = false
  AND (effective_year < 2025 OR (effective_year = 2025 AND effective_month < 12));

-- ⚠️ UNCOMMENT to actually delete stale adjustments:

DELETE FROM budget_adjustments
WHERE is_applied = false
  AND (effective_year < 2025 OR (effective_year = 2025 AND effective_month < 12));


-- ============================================================================
-- MANUAL APPLY: Apply all December 2025 adjustments
-- ============================================================================
-- ⚠️ UNCOMMENT the section below to apply the adjustments
-- This will:
--   1. Update personal_budgets.categories with the new limits
--   2. Mark each adjustment as is_applied = true

/*
DO $$
DECLARE
  target_email TEXT := 'maor.galkin@gmail.com';  -- ← CHANGE THIS
  target_user_id UUID;
  target_household_id UUID;
  personal_budget_id UUID;
  current_categories JSONB;
  updated_categories JSONB;
  rec RECORD;
  applied_count INT := 0;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  SELECT household_id INTO target_household_id FROM household_members WHERE user_id = target_user_id LIMIT 1;
  
  -- Get the active personal budget
  SELECT id, categories INTO personal_budget_id, current_categories
  FROM personal_budgets
  WHERE household_id = target_household_id AND is_active = true
  LIMIT 1;
  
  IF personal_budget_id IS NULL THEN
    RAISE EXCEPTION 'No active personal budget found';
  END IF;
  
  updated_categories := current_categories;
  
  RAISE NOTICE 'Applying adjustments to personal budget: %', personal_budget_id;
  RAISE NOTICE '';
  
  -- Apply each adjustment for December 2025
  FOR rec IN 
    SELECT *
    FROM budget_adjustments
    WHERE user_id = target_user_id
      AND is_applied = false
      AND effective_year = 2025
      AND effective_month = 12
  LOOP
    -- Update the category's monthlyLimit in the JSONB
    IF updated_categories ? rec.category_name THEN
      updated_categories := jsonb_set(
        updated_categories,
        ARRAY[rec.category_name, 'monthlyLimit'],
        to_jsonb(rec.new_limit)
      );
      RAISE NOTICE '  ✓ Updated "%" limit to %', rec.category_name, rec.new_limit;
      applied_count := applied_count + 1;
    ELSE
      RAISE NOTICE '  ⚠ Category "%" not found in personal budget', rec.category_name;
    END IF;
    
    -- Mark as applied
    UPDATE budget_adjustments
    SET is_applied = true, applied_at = NOW()
    WHERE id = rec.id;
  END LOOP;
  
  -- Update the personal budget with new categories
  IF applied_count > 0 THEN
    UPDATE personal_budgets
    SET 
      categories = updated_categories,
      updated_at = NOW()
    WHERE id = personal_budget_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Successfully applied % adjustment(s)!', applied_count;
    RAISE NOTICE '=================================================================';
  ELSE
    RAISE NOTICE 'No adjustments were applied.';
  END IF;
  
END $$;
*/
