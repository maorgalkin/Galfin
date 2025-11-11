-- Final diagnostic - let's see what's actually in your database

-- 1. Check all transactions and their user_id/household_id
SELECT 
  'Transactions' as table_name,
  user_id,
  household_id,
  COUNT(*) as count
FROM transactions
GROUP BY user_id, household_id
ORDER BY count DESC;

-- 2. Check all personal budgets
SELECT 
  'Personal Budgets' as table_name,
  user_id,
  household_id,
  COUNT(*) as count
FROM personal_budgets
GROUP BY user_id, household_id
ORDER BY count DESC;

-- 3. Check all monthly budgets
SELECT 
  'Monthly Budgets' as table_name,
  user_id,
  household_id,
  COUNT(*) as count
FROM monthly_budgets
GROUP BY user_id, household_id
ORDER BY count DESC;

-- 4. Check all households
SELECT 
  'Households' as table_name,
  id as household_id,
  name,
  created_by as user_id
FROM households;

-- 5. Check all household members
SELECT 
  'Household Members' as table_name,
  household_id,
  user_id,
  role
FROM household_members;

-- 6. Check family members
SELECT 
  'Family Members' as table_name,
  user_id,
  household_id,
  name,
  color
FROM family_members;
