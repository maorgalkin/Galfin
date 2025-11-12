-- Migration: Auto-create Household for New Users
-- Version: 009
-- Date: 2025-11-12
-- Description: Automatically create a personal household when a new user signs up
--              Fixes the issue where new users get stuck in loading state because
--              they don't have a household and can't access budget features.

-- ============================================================================
-- FUNCTION: Auto-create household for new user
-- ============================================================================
-- This function creates a personal household and adds the user as owner
-- when they first sign up. Runs in the auth.users context.

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

-- ============================================================================
-- TRIGGER: On new user signup
-- ============================================================================
-- Trigger the household creation when a new user is created in auth.users
-- This runs AFTER the user row is inserted, ensuring NEW.id is available

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Ensure the trigger function can be executed

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user IS 
'Automatically creates a personal household and membership for new users upon signup';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
'Creates household and membership for new user - fixes loading state issue for first-time users';
