-- Diagnostic: Check current state of data and households
-- Run this in Supabase SQL Editor to see what's going on

-- 1. Check if you have a household
SELECT 
  'Your Households' as info,
  h.id,
  h.name,
  hm.role,
  hm.joined_at
FROM households h
JOIN household_members hm ON h.id = hm.household_id
WHERE hm.user_id = auth.uid();

-- 2. Check transactions (bypassing RLS to see what's there)
SELECT 
  'All Transactions (no RLS)' as info,
  COUNT(*) as total_count,
  COUNT(household_id) as with_household,
  COUNT(*) FILTER (WHERE household_id IS NULL) as without_household
FROM transactions;

-- 3. Check what you can see with RLS
SELECT 
  'Transactions You Can See (with RLS)' as info,
  COUNT(*) as count
FROM transactions
WHERE household_id IN (
  SELECT household_id 
  FROM household_members 
  WHERE user_id = auth.uid()
);

-- 4. Check personal budgets
SELECT 
  'Personal Budgets (no RLS)' as info,
  COUNT(*) as total_count,
  COUNT(household_id) as with_household,
  COUNT(*) FILTER (WHERE household_id IS NULL) as without_household
FROM personal_budgets;

-- 5. Check monthly budgets
SELECT 
  'Monthly Budgets (no RLS)' as info,
  COUNT(*) as total_count,
  COUNT(household_id) as with_household,
  COUNT(*) FILTER (WHERE household_id IS NULL) as without_household
FROM monthly_budgets;

-- 6. Check family members
SELECT 
  'Family Members (no RLS)' as info,
  COUNT(*) as total_count,
  COUNT(household_id) as with_household,
  COUNT(*) FILTER (WHERE household_id IS NULL) as without_household
FROM family_members;

-- 7. Check your user ID
SELECT 
  'Your User Info' as info,
  auth.uid() as your_user_id,
  email
FROM auth.users
WHERE id = auth.uid();
