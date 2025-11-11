-- ============================================================================
-- INSTRUCTIONS:
-- 1. Delete lines 4-6 (the SELECT query) after you've found your user ID
-- 2. Your user ID is already filled in on line 17: 7f38f208-16b8-4cd1-a8f4-2ede811a4afb
-- 3. Run ONLY the DO $$ block below (lines 15-101)
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID := '7f38f208-16b8-4cd1-a8f4-2ede811a4afb';  -- ← PASTE YOUR USER ID HERE
  v_household_id UUID;
  v_transactions_updated INTEGER;
  v_budgets_updated INTEGER;
  v_monthly_budgets_updated INTEGER;
  v_adjustments_updated INTEGER;
  v_family_updated INTEGER;
BEGIN
  RAISE NOTICE 'Starting fix for user: %', v_user_id;
  
  -- Check if user already has a household
  SELECT household_id INTO v_household_id
  FROM household_members
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- If no household, create one
  IF v_household_id IS NULL THEN
    RAISE NOTICE 'Creating new household...';
    
    INSERT INTO households (name, created_by)
    VALUES ('My Household', v_user_id)
    RETURNING id INTO v_household_id;
    
    -- Add user as owner
    INSERT INTO household_members (household_id, user_id, role)
    VALUES (v_household_id, v_user_id, 'owner');
    
    RAISE NOTICE 'Created household: %', v_household_id;
  ELSE
    RAISE NOTICE 'User already has household: %', v_household_id;
  END IF;
  
  -- Update all transactions for this user
  UPDATE transactions 
  SET household_id = v_household_id 
  WHERE user_id = v_user_id AND (household_id IS NULL OR household_id != v_household_id);
  
  GET DIAGNOSTICS v_transactions_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % transactions', v_transactions_updated;
  
  -- Update all personal budgets
  UPDATE personal_budgets 
  SET household_id = v_household_id 
  WHERE user_id = v_user_id AND (household_id IS NULL OR household_id != v_household_id);
  
  GET DIAGNOSTICS v_budgets_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % personal budgets', v_budgets_updated;
  
  -- Update all monthly budgets
  UPDATE monthly_budgets 
  SET household_id = v_household_id 
  WHERE user_id = v_user_id AND (household_id IS NULL OR household_id != v_household_id);
  
  GET DIAGNOSTICS v_monthly_budgets_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % monthly budgets', v_monthly_budgets_updated;
  
  -- Update all budget adjustments
  UPDATE budget_adjustments 
  SET household_id = v_household_id 
  WHERE user_id = v_user_id AND (household_id IS NULL OR household_id != v_household_id);
  
  GET DIAGNOSTICS v_adjustments_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % budget adjustments', v_adjustments_updated;
  
  -- Update all family members
  UPDATE family_members 
  SET household_id = v_household_id 
  WHERE user_id = v_user_id AND (household_id IS NULL OR household_id != v_household_id);
  
  GET DIAGNOSTICS v_family_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % family members', v_family_updated;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUCCESS! Your data has been restored!';
  RAISE NOTICE 'Household ID: %', v_household_id;
  RAISE NOTICE 'Transactions: %', v_transactions_updated;
  RAISE NOTICE 'Personal Budgets: %', v_budgets_updated;
  RAISE NOTICE 'Monthly Budgets: %', v_monthly_budgets_updated;
  RAISE NOTICE 'Budget Adjustments: %', v_adjustments_updated;
  RAISE NOTICE 'Family Members: %', v_family_updated;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Refresh your app - your data should be back!';
  
END $$;
