-- Fix for users who lost data after migration 003
-- This ensures all users are properly assigned to households

-- ============================================================================
-- 1. Check if user has a household, if not create one
-- ============================================================================

DO $$
DECLARE
  current_user_id UUID;
  user_household_id UUID;
  new_household_id UUID;
BEGIN
  -- Get all authenticated users who don't have a household
  FOR current_user_id IN 
    SELECT id FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM household_members)
  LOOP
    -- Create a household for this user
    INSERT INTO households (name, created_by)
    VALUES ('My Household', current_user_id)
    RETURNING id INTO new_household_id;
    
    -- Add user as owner
    INSERT INTO household_members (household_id, user_id, role)
    VALUES (new_household_id, current_user_id, 'owner');
    
    RAISE NOTICE 'Created household % for user %', new_household_id, current_user_id;
  END LOOP;
END $$;

-- ============================================================================
-- 2. Assign orphaned data to user households
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  user_household_id UUID;
BEGIN
  -- For each user, get their household and update orphaned data
  FOR user_record IN 
    SELECT DISTINCT user_id FROM transactions WHERE household_id IS NULL
    UNION
    SELECT DISTINCT user_id FROM personal_budgets WHERE household_id IS NULL
    UNION
    SELECT DISTINCT user_id FROM monthly_budgets WHERE household_id IS NULL
    UNION
    SELECT DISTINCT user_id FROM budget_adjustments WHERE household_id IS NULL
    UNION
    SELECT DISTINCT user_id FROM family_members WHERE household_id IS NULL
  LOOP
    -- Get the user's household
    SELECT household_id INTO user_household_id
    FROM household_members
    WHERE user_id = user_record.user_id
    LIMIT 1;
    
    IF user_household_id IS NOT NULL THEN
      -- Update orphaned transactions
      UPDATE transactions 
      SET household_id = user_household_id 
      WHERE user_id = user_record.user_id AND household_id IS NULL;
      
      -- Update orphaned personal budgets
      UPDATE personal_budgets 
      SET household_id = user_household_id 
      WHERE user_id = user_record.user_id AND household_id IS NULL;
      
      -- Update orphaned monthly budgets
      UPDATE monthly_budgets 
      SET household_id = user_household_id 
      WHERE user_id = user_record.user_id AND household_id IS NULL;
      
      -- Update orphaned budget adjustments
      UPDATE budget_adjustments 
      SET household_id = user_household_id 
      WHERE user_id = user_record.user_id AND household_id IS NULL;
      
      -- Update orphaned family members
      UPDATE family_members 
      SET household_id = user_household_id 
      WHERE user_id = user_record.user_id AND household_id IS NULL;
      
      RAISE NOTICE 'Fixed orphaned data for user % in household %', user_record.user_id, user_household_id;
    ELSE
      RAISE WARNING 'User % has orphaned data but no household!', user_record.user_id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 3. Verify data recovery
-- ============================================================================

DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM (
    SELECT user_id FROM transactions WHERE household_id IS NULL
    UNION ALL
    SELECT user_id FROM personal_budgets WHERE household_id IS NULL
    UNION ALL
    SELECT user_id FROM monthly_budgets WHERE household_id IS NULL
    UNION ALL
    SELECT user_id FROM budget_adjustments WHERE household_id IS NULL
    UNION ALL
    SELECT user_id FROM family_members WHERE household_id IS NULL
  ) orphaned;
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Still have % orphaned records!', orphaned_count;
  ELSE
    RAISE NOTICE 'All data successfully assigned to households!';
  END IF;
END $$;

-- ============================================================================
-- Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Data Recovery Complete!';
  RAISE NOTICE 'All users should now have households';
  RAISE NOTICE 'All data should be visible again';
  RAISE NOTICE '==============================================';
END $$;
