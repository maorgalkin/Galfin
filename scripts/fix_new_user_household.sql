-- ============================================================================
-- FIX: Ensure household auto-creation trigger exists
-- ============================================================================
-- Run this in Supabase SQL Editor to:
-- 1. Check if the trigger exists
-- 2. Create it if missing
-- 3. Optionally create a household for an existing user without one
-- ============================================================================

-- Step 1: Check if trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✓ Trigger on_auth_user_created already exists';
  ELSE
    RAISE NOTICE '✗ Trigger on_auth_user_created is MISSING - creating it now...';
  END IF;
END $$;

-- Step 2: Create/Replace the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id UUID;
  user_first_name TEXT;
BEGIN
  -- Extract first name from user metadata (fallback to 'My' if not available)
  user_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1),
    'My'
  );

  -- Create a personal household for the new user
  INSERT INTO public.households (name, created_by)
  VALUES (user_first_name || '''s Household', NEW.id)
  RETURNING id INTO new_household_id;

  -- Add the user as the owner of their household
  INSERT INTO public.household_members (household_id, user_id, role, invited_by)
  VALUES (new_household_id, NEW.id, 'owner', NEW.id);

  RETURN NEW;
END;
$$;

-- Step 3: Create the trigger (drop if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DO $$ BEGIN RAISE NOTICE '✓ Trigger on_auth_user_created has been created/updated'; END $$;

-- ============================================================================
-- Step 5: Fix existing users without households (OPTIONAL - uncomment to run)
-- ============================================================================
-- This will create households for any users who don't have one

DO $$
DECLARE
  orphan_user RECORD;
  new_household_id UUID;
  user_first_name TEXT;
  users_fixed INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Checking for users without households...';
  
  FOR orphan_user IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN household_members hm ON hm.user_id = u.id
    WHERE hm.id IS NULL
  LOOP
    users_fixed := users_fixed + 1;
    
    -- Extract first name
    user_first_name := COALESCE(
      orphan_user.raw_user_meta_data->>'first_name',
      SPLIT_PART(orphan_user.raw_user_meta_data->>'full_name', ' ', 1),
      'My'
    );
    
    -- Create household
    INSERT INTO public.households (name, created_by)
    VALUES (user_first_name || '''s Household', orphan_user.id)
    RETURNING id INTO new_household_id;
    
    -- Add user as owner
    INSERT INTO public.household_members (household_id, user_id, role, invited_by)
    VALUES (new_household_id, orphan_user.id, 'owner', orphan_user.id);
    
    RAISE NOTICE '  ✓ Created household for user: %', orphan_user.email;
  END LOOP;
  
  IF users_fixed = 0 THEN
    RAISE NOTICE '  All users already have households ✓';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed % user(s) without households', users_fixed;
  END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 
  'Trigger Status' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
    THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

SELECT 
  'Users without households' as check_type,
  COUNT(*)::text as status
FROM auth.users u
LEFT JOIN household_members hm ON hm.user_id = u.id
WHERE hm.id IS NULL;
