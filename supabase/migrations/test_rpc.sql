-- Test the RPC function
-- First, check if the function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_household_members_with_emails';

-- Test calling the function with your household_id
-- Replace the UUID below with your actual household_id from household_members table
-- SELECT * FROM get_household_members_with_emails('f82eec22-2679-4ee4-bc94-58cb267de4e6'::UUID);
