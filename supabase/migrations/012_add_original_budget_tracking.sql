-- Migration 012: Add Original Budget Tracking to Monthly Budgets
-- Preserves month-start budget state for comparison with in-month adjustments

-- Add column to store original monthly budget state (snapshot at month creation)
ALTER TABLE monthly_budgets 
ADD COLUMN IF NOT EXISTS original_categories JSONB;

-- Backfill existing budgets
-- For existing budgets, we assume current state represents the original
UPDATE monthly_budgets 
SET original_categories = categories 
WHERE original_categories IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE monthly_budgets 
ALTER COLUMN original_categories SET NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN monthly_budgets.original_categories IS 
'Snapshot of budget categories at month creation (starting point). 
Never modified during the month. Reflects pre-month adjustments if made before month start.
Used for tracking in-month changes vs month-start baseline.';

-- Verify migration
DO $$
DECLARE
  total_budgets INT;
  budgets_with_original INT;
  sample_budget RECORD;
BEGIN
  -- Count total budgets
  SELECT COUNT(*) INTO total_budgets FROM monthly_budgets;
  
  -- Count budgets with original_categories
  SELECT COUNT(*) INTO budgets_with_original 
  FROM monthly_budgets 
  WHERE original_categories IS NOT NULL;
  
  -- Get a sample for verification
  SELECT 
    id, 
    year, 
    month, 
    jsonb_object_keys(original_categories) as category_count
  INTO sample_budget
  FROM monthly_budgets 
  LIMIT 1;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Migration 012: Original Budget Tracking';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total monthly budgets: %', total_budgets;
  RAISE NOTICE 'Budgets with original_categories: %', budgets_with_original;
  
  IF total_budgets > 0 AND total_budgets = budgets_with_original THEN
    RAISE NOTICE '✅ All budgets have original state preserved';
    IF sample_budget IS NOT NULL THEN
      RAISE NOTICE 'Sample: % % has original_categories set', 
        sample_budget.month, sample_budget.year;
    END IF;
  ELSIF total_budgets > 0 THEN
    RAISE WARNING '⚠️ Some budgets missing original_categories!';
  ELSE
    RAISE NOTICE 'ℹ️ No existing budgets to migrate';
  END IF;
  
  RAISE NOTICE '============================================';
END $$;
