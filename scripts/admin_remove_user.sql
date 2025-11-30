-- ============================================================================
-- ADMIN UTILITY: Safe User Removal with Ownership Transfer
-- ============================================================================
-- This script safely removes a user from the system, handling:
-- 1. Household ownership transfer (if user is owner/creator)
-- 2. Data reassignment or deletion
-- 3. User account cleanup
--
-- USAGE: Replace the user_id_to_remove value and run in SQL Editor
-- ============================================================================

-- Configuration
DO $$
DECLARE
  -- ⚠️ CHANGE THIS to the user ID you want to remove
  user_id_to_remove UUID := '5e84ffa6-a3c6-4771-86a2-5ec886e45e82';  -- e.g., '5e84ffa6-a3c6-4771-86a2-5ec886e45e82'
  
  -- Internal variables
  user_email TEXT;
  user_households RECORD;
  household_member_count INT;
  new_owner_id UUID;
  new_owner_email TEXT;
  households_processed INT := 0;
  is_sole_member BOOLEAN;
BEGIN
  -- ============================================================================
  -- STEP 1: Validate User Exists
  -- ============================================================================
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id_to_remove;
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User % not found. Please check the user ID.', user_id_to_remove;
  END IF;
  
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Starting safe removal of user: % (ID: %)', user_email, user_id_to_remove;
  RAISE NOTICE '=================================================================';
  
  -- ============================================================================
  -- STEP 2: Process Each Household the User Belongs To
  -- ============================================================================
  FOR user_households IN 
    SELECT 
      h.id as household_id,
      h.name as household_name,
      h.created_by,
      hm.role
    FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = user_id_to_remove
  LOOP
    households_processed := households_processed + 1;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Processing Household: % (ID: %)', user_households.household_name, user_households.household_id;
    
    -- Count total members in this household
    SELECT COUNT(*) INTO household_member_count
    FROM household_members
    WHERE household_id = user_households.household_id;
    
    is_sole_member := (household_member_count = 1);
    
    RAISE NOTICE '  - Member count: %', household_member_count;
    RAISE NOTICE '  - User role: %', user_households.role;
    RAISE NOTICE '  - Is sole member: %', is_sole_member;
    
    -- ========================================================================
    -- CASE 1: User is the ONLY member - Delete entire household
    -- ========================================================================
    IF is_sole_member THEN
      RAISE NOTICE '  - Action: Deleting entire household (sole member)';
      
      -- All related data will be cascade deleted due to ON DELETE CASCADE
      -- This includes: transactions, budgets, family_members, etc.
      DELETE FROM households WHERE id = user_households.household_id;
      
      RAISE NOTICE '  ✓ Household deleted (cascade deletes all data)';
      
    -- ========================================================================
    -- CASE 2: User is creator/owner - Transfer ownership
    -- ========================================================================
    ELSIF user_households.created_by = user_id_to_remove THEN
      RAISE NOTICE '  - Action: Transferring ownership (user is creator)';
      
      -- Find the earliest added member (excluding the user being removed)
      SELECT hm.user_id, au.email INTO new_owner_id, new_owner_email
      FROM household_members hm
      JOIN auth.users au ON au.id = hm.user_id
      WHERE hm.household_id = user_households.household_id
        AND hm.user_id != user_id_to_remove
      ORDER BY hm.created_at ASC  -- Earliest member
      LIMIT 1;
      
      IF new_owner_id IS NULL THEN
        RAISE EXCEPTION 'Cannot find new owner for household %', user_households.household_id;
      END IF;
      
      -- Transfer ownership
      UPDATE households
      SET created_by = new_owner_id
      WHERE id = user_households.household_id;
      
      RAISE NOTICE '  ✓ Ownership transferred to: % (ID: %)', new_owner_email, new_owner_id;
      
      -- Remove the user from household members
      DELETE FROM household_members
      WHERE household_id = user_households.household_id
        AND user_id = user_id_to_remove;
      
      RAISE NOTICE '  ✓ User removed from household members';
      
    -- ========================================================================
    -- CASE 3: User is regular member - Just remove from household
    -- ========================================================================
    ELSE
      RAISE NOTICE '  - Action: Removing user from household (regular member)';
      
      -- Remove the user from household members
      DELETE FROM household_members
      WHERE household_id = user_households.household_id
        AND user_id = user_id_to_remove;
      
      RAISE NOTICE '  ✓ User removed from household';
    END IF;
    
  END LOOP;
  
  -- ============================================================================
  -- STEP 3: Delete User's Personal Data Not in Households
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Cleaning up personal data...';
  
  -- Note: Most data should already be deleted via household cascade deletion
  -- This is a safety check for any orphaned data
  
  -- Check for any remaining transactions (shouldn't exist)
  DELETE FROM transactions WHERE user_id = user_id_to_remove;
  
  -- Check for any remaining budgets (shouldn't exist)
  DELETE FROM personal_budgets WHERE user_id = user_id_to_remove;
  DELETE FROM monthly_budgets WHERE user_id = user_id_to_remove;
  
  RAISE NOTICE '✓ Personal data cleanup complete';
  
  -- ============================================================================
  -- STEP 4: Delete User Account from Auth
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'Deleting user account from authentication system...';
  
  -- This will cascade delete auth-related data
  DELETE FROM auth.users WHERE id = user_id_to_remove;
  
  RAISE NOTICE '✓ User account deleted';
  
  -- ============================================================================
  -- STEP 5: Summary Report
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'USER REMOVAL COMPLETE';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'User: % (ID: %)', user_email, user_id_to_remove;
  RAISE NOTICE 'Households processed: %', households_processed;
  RAISE NOTICE '';
  RAISE NOTICE 'All data associated with this user has been safely removed.';
  RAISE NOTICE 'Ownership has been transferred where applicable.';
  RAISE NOTICE '=================================================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error during user removal: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;

-- ============================================================================
-- VERIFICATION: Check if user was fully removed
-- ============================================================================
-- Uncomment and run this after removal to verify:
/*
DO $$
DECLARE
  user_id_check UUID := 'REPLACE_WITH_USER_ID';
  found_in_auth BOOLEAN;
  found_in_households BOOLEAN;
  found_in_transactions BOOLEAN;
  found_in_budgets BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id_check) INTO found_in_auth;
  SELECT EXISTS(SELECT 1 FROM household_members WHERE user_id = user_id_check) INTO found_in_households;
  SELECT EXISTS(SELECT 1 FROM transactions WHERE user_id = user_id_check) INTO found_in_transactions;
  SELECT EXISTS(SELECT 1 FROM personal_budgets WHERE user_id = user_id_check) INTO found_in_budgets;
  
  RAISE NOTICE 'Verification Results for User: %', user_id_check;
  RAISE NOTICE '  - Found in auth.users: %', found_in_auth;
  RAISE NOTICE '  - Found in households: %', found_in_households;
  RAISE NOTICE '  - Found in transactions: %', found_in_transactions;
  RAISE NOTICE '  - Found in budgets: %', found_in_budgets;
  
  IF NOT found_in_auth AND NOT found_in_households AND NOT found_in_transactions AND NOT found_in_budgets THEN
    RAISE NOTICE '✓ SUCCESS: User completely removed from system';
  ELSE
    RAISE WARNING '⚠ WARNING: User data still exists in some tables';
  END IF;
END $$;
*/
