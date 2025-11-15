-- Migration 011: Fix Missing Household for Existing Users
-- This creates households for any users that don't have one yet
-- (Users created before migration 009 auto-household trigger)

DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
  user_email TEXT;
  user_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting Migration 011: Checking for users without households...';
  
  -- Find all authenticated users who don't have a household
  FOR user_record IN 
    SELECT DISTINCT au.id, au.email, au.created_at
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM household_members hm 
      WHERE hm.user_id = au.id
    )
    ORDER BY au.created_at ASC  -- Process oldest users first
  LOOP
    user_count := user_count + 1;
    
    -- Get user email for household name
    user_email := COALESCE(user_record.email, 'User');
    
    -- Extract first part of email (before @) for a friendly name
    IF user_email LIKE '%@%' THEN
      user_email := SPLIT_PART(user_email, '@', 1);
    END IF;
    
    -- Create a household for this user
    INSERT INTO households (name, created_by)
    VALUES (user_email || '''s Household', user_record.id)
    RETURNING id INTO new_household_id;
    
    -- Add user as owner of their household
    INSERT INTO household_members (household_id, user_id, role, invited_by)
    VALUES (new_household_id, user_record.id, 'owner', user_record.id);
    
    RAISE NOTICE 'Created household % for user % (email: %, created: %)', 
      new_household_id, user_record.id, user_record.email, user_record.created_at;
  END LOOP;
  
  IF user_count = 0 THEN
    RAISE NOTICE 'No users without households found. All users are already assigned.';
  ELSE
    RAISE NOTICE 'Migration 011 complete: Created % household(s) for existing users', user_count;
  END IF;
END $$;

-- Verify migration success
DO $$
DECLARE
  orphaned_users INT;
  total_users INT;
BEGIN
  -- Count users without households
  SELECT COUNT(DISTINCT au.id) INTO orphaned_users
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM household_members hm 
    WHERE hm.user_id = au.id
  );
  
  -- Count total users
  SELECT COUNT(*) INTO total_users FROM auth.users;
  
  IF orphaned_users > 0 THEN
    RAISE WARNING 'WARNING: % user(s) still without households out of % total users', orphaned_users, total_users;
  ELSE
    RAISE NOTICE 'SUCCESS: All % users have households assigned', total_users;
  END IF;
END $$;
