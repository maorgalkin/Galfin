-- FIX: Allow owners/admins to invite other users
-- Problem: INSERT policy only allows inserting yourself

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own membership" ON household_members;

-- Create new INSERT policy that allows owners/admins to invite others
CREATE POLICY "Owners can invite members"
  ON household_members FOR INSERT
  WITH CHECK (
    -- Either inserting yourself
    user_id = auth.uid()
    OR
    -- Or you're an owner/admin of the household you're adding someone to
    user_is_household_owner_or_admin(household_id)
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Fixed INSERT policy for household_members';
  RAISE NOTICE 'Owners and admins can now invite other users';
  RAISE NOTICE '==========================================';
END $$;
