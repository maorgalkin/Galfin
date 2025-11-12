-- Migration: Backfill Households for Existing Users
-- Version: 009b (companion to 009)
-- Date: 2025-11-12
-- Description: One-time script to create households for any existing users
--              who don't have one yet. Run this AFTER 009_auto_create_household_for_new_users.sql

-- ============================================================================
-- BACKFILL: Create households for existing users without one
-- ============================================================================
-- This script creates a personal household for any user who doesn't have one
-- Safely handles users who already have households (does nothing)

DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
  user_first_name TEXT;
  users_fixed INT := 0;
BEGIN
  -- Find all users without a household membership
  FOR user_record IN
    SELECT au.id, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.household_members hm ON hm.user_id = au.id
    WHERE hm.id IS NULL
  LOOP
    -- Extract first name from user metadata
    user_first_name := COALESCE(
      user_record.raw_user_meta_data->>'first_name',
      SPLIT_PART(user_record.raw_user_meta_data->>'full_name', ' ', 1),
      'My'
    );

    -- Create a personal household
    INSERT INTO public.households (name, created_by)
    VALUES (user_first_name || '''s Household', user_record.id)
    RETURNING id INTO new_household_id;

    -- Add user as owner
    INSERT INTO public.household_members (household_id, user_id, role, invited_by)
    VALUES (new_household_id, user_record.id, 'owner', user_record.id);

    users_fixed := users_fixed + 1;
    
    RAISE NOTICE 'Created household for user: % (ID: %)', user_first_name, user_record.id;
  END LOOP;

  -- Log summary
  IF users_fixed = 0 THEN
    RAISE NOTICE 'All existing users already have households - no action needed';
  ELSE
    RAISE NOTICE 'Successfully created households for % existing user(s)', users_fixed;
  END IF;
END $$;
