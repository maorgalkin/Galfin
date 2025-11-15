-- Migration 011: Fix Missing Household for Existing Users
-- This creates households for any users that don't have one yet
-- (Users created before migration 009 auto-household trigger)

DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
  user_email TEXT;
BEGIN
  -- Find all authenticated users who don't have a household
  FOR user_record IN 
    SELECT DISTINCT au.id, au.email
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM household_members hm 
      WHERE hm.user_id = au.id
    )
  LOOP
    -- Get user email for household name
    user_email := COALESCE(user_record.email, 'User');
    
    -- Extract first part of email (before @)
    IF user_email LIKE '%@%' THEN
      user_email := SPLIT_PART(user_email, '@', 1);
    END IF;
    
    -- Create a household for this user
    INSERT INTO households (name, created_by)
    VALUES (user_email || '''s Household', user_record.id)
    RETURNING id INTO new_household_id;
    
    -- Add user as owner of the household
    INSERT INTO household_members (household_id, user_id, role)
    VALUES (new_household_id, user_record.id, 'participant');
    
    RAISE NOTICE 'Created household % for user % (email: %)', 
      new_household_id, user_record.id, user_record.email;
  END LOOP;
  
  RAISE NOTICE 'Migration 011 complete: Fixed missing households for existing users';
END $$;
