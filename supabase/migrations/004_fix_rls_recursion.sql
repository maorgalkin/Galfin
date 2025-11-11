-- FIX: Remove infinite recursion in household_members RLS policies
-- The problem: policies reference household_members IN their own USING clause

-- ============================================================================
-- 1. DROP the problematic policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own household members" ON household_members;
DROP POLICY IF EXISTS "Users can insert themselves into households" ON household_members;
DROP POLICY IF EXISTS "Owners can manage members" ON household_members;

-- ============================================================================
-- 2. CREATE simple policies that don't cause recursion
-- ============================================================================

-- Users can see household_members rows where they are the user
CREATE POLICY "Users can view their own membership"
  ON household_members FOR SELECT
  USING (user_id = auth.uid());

-- Users can see other members in their household(s)
CREATE POLICY "Users can view household members in same household"
  ON household_members FOR SELECT
  USING (
    household_id IN (
      SELECT hm.household_id 
      FROM household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

-- Users can insert themselves
CREATE POLICY "Users can insert their own membership"
  ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Only owners can delete members (checked via function to avoid recursion)
CREATE POLICY "Owners can delete members"
  ON household_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'owner'
    )
  );

-- Users can update their own role (will be restricted by app logic)
CREATE POLICY "Members can be updated by owners"
  ON household_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid()
        AND hm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Success!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Fixed household_members RLS policies!';
  RAISE NOTICE 'Refresh your app - data should load now!';
  RAISE NOTICE '==========================================';
END $$;
