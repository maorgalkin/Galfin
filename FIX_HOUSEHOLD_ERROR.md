# Fix: User Not Part of Household

## Problem
Your user account was created before the auto-household creation trigger was installed (Migration 009). This causes the error:
```
Error: User is not part of a household
GET .../household_members?...user_id=eq.5e84ffa6... 406 (Not Acceptable)
```

## Solution - Run This SQL in Supabase

1. **Go to Supabase Dashboard** → SQL Editor
2. **Paste and run this SQL:**

```sql
-- Create household for users without one
DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
  user_email TEXT;
BEGIN
  -- Find all users who don't have a household
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
    
    -- Add user as owner/participant of the household
    INSERT INTO household_members (household_id, user_id, role)
    VALUES (new_household_id, user_record.id, 'participant');
    
    RAISE NOTICE 'Created household % for user % (email: %)', 
      new_household_id, user_record.id, user_record.email;
  END LOOP;
END $$;
```

3. **After running**, refresh your browser and try creating a budget again!

## Alternative: Quick Fix for Single User

If you just want to fix YOUR account quickly:

```sql
-- Replace YOUR_USER_ID with: 5e84ffa6-a3c6-4771-86a2-5ec886e45e82
WITH new_household AS (
  INSERT INTO households (name, created_by)
  VALUES ('My Household', '5e84ffa6-a3c6-4771-86a2-5ec886e45e82')
  RETURNING id
)
INSERT INTO household_members (household_id, user_id, role)
SELECT id, '5e84ffa6-a3c6-4771-86a2-5ec886e45e82', 'participant'
FROM new_household;
```

## Verification

After running, verify with:

```sql
SELECT 
  u.email,
  h.name as household_name,
  hm.role
FROM auth.users u
JOIN household_members hm ON hm.user_id = u.id
JOIN households h ON h.id = hm.household_id
WHERE u.id = '5e84ffa6-a3c6-4771-86a2-5ec886e45e82';
```

You should see one row with your email, household name, and role='participant'.

## Prevention

This was caused by signing up before Migration 009. The trigger `on_auth_user_created` now automatically creates households for new users, so this won't happen to new signups.
