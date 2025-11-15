-- ============================================================================
-- ADMIN UTILITY: List All Users and Their Households
-- ============================================================================
-- This script provides a comprehensive view of all users and their household
-- memberships. Use this to identify users before removal.
-- ============================================================================

-- Quick View: All Users with Household Info
SELECT 
  au.id as user_id,
  au.email,
  au.created_at as user_created,
  au.confirmed_at as email_confirmed,
  COALESCE(household_count.count, 0) as household_count,
  CASE 
    WHEN household_count.count IS NULL THEN '⚠️ NO HOUSEHOLD'
    WHEN household_count.count = 1 THEN '✓ Single Household'
    ELSE '⚠️ Multiple Households'
  END as household_status
FROM auth.users au
LEFT JOIN (
  SELECT user_id, COUNT(*) as count
  FROM household_members
  GROUP BY user_id
) household_count ON household_count.user_id = au.id
ORDER BY au.created_at DESC;

-- Detailed View: Users with Household Details
SELECT 
  au.id as user_id,
  au.email,
  h.id as household_id,
  h.name as household_name,
  hm.role as user_role,
  CASE 
    WHEN h.created_by = au.id THEN '👑 Creator/Owner'
    ELSE '👤 Member'
  END as ownership_status,
  hm.created_at as joined_household,
  (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as total_members
FROM auth.users au
LEFT JOIN household_members hm ON hm.user_id = au.id
LEFT JOIN households h ON h.id = hm.household_id
ORDER BY au.created_at DESC, h.name;

-- Users Without Households (Should be empty after migration 011)
SELECT 
  au.id as user_id,
  au.email,
  au.created_at,
  '⚠️ ORPHANED - No Household' as status
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM household_members hm 
  WHERE hm.user_id = au.id
);

-- Household Summary Statistics
SELECT 
  h.id as household_id,
  h.name,
  u.email as creator_email,
  h.created_at as household_created,
  member_count.count as member_count,
  budget_count.count as personal_budgets,
  transaction_count.count as transactions
FROM households h
JOIN auth.users u ON u.id = h.created_by
LEFT JOIN (
  SELECT household_id, COUNT(*) as count
  FROM household_members
  GROUP BY household_id
) member_count ON member_count.household_id = h.id
LEFT JOIN (
  SELECT household_id, COUNT(*) as count
  FROM personal_budgets
  GROUP BY household_id
) budget_count ON budget_count.household_id = h.id
LEFT JOIN (
  SELECT household_id, COUNT(*) as count
  FROM transactions
  GROUP BY household_id
) transaction_count ON transaction_count.household_id = h.id
ORDER BY h.created_at DESC;

-- Single-Member Households (Safe to delete with user)
SELECT 
  h.id as household_id,
  h.name,
  u.email as sole_member,
  u.id as user_id,
  h.created_at
FROM households h
JOIN auth.users u ON u.id = h.created_by
WHERE (
  SELECT COUNT(*) 
  FROM household_members hm 
  WHERE hm.household_id = h.id
) = 1
ORDER BY h.created_at DESC;
