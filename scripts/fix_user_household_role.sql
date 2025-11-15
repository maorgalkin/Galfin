-- Fix User Household Role to Owner
-- Run this if you ran migration 011 before it was fixed
-- This updates users who are the sole member of their household to be 'owner' instead of 'participant'

-- Preview what will be changed
SELECT 
  hm.user_id,
  au.email,
  h.id as household_id,
  h.name as household_name,
  h.created_by,
  hm.role as current_role,
  COUNT(*) OVER (PARTITION BY hm.household_id) as member_count
FROM household_members hm
JOIN households h ON h.id = hm.household_id
JOIN auth.users au ON au.id = hm.user_id
WHERE hm.role = 'participant'
  AND h.created_by = hm.user_id  -- User created the household
  AND (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) = 1  -- Sole member
ORDER BY au.email;

-- Uncomment to execute the fix:
/*
UPDATE household_members
SET role = 'owner'
WHERE role = 'participant'
  AND household_id IN (
    SELECT h.id
    FROM households h
    WHERE h.created_by = household_members.user_id  -- User created their own household
      AND (SELECT COUNT(*) FROM household_members hm2 WHERE hm2.household_id = h.id) = 1  -- Sole member
  );

SELECT 'Fixed ' || ROW_COUNT() || ' household memberships to owner role';
*/
