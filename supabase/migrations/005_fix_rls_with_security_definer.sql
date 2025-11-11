-- FIX v2: Use SECURITY DEFINER function to bypass RLS recursion
-- The problem: ANY policy that queries household_members causes recursion

-- ============================================================================
-- 1. DROP ALL policies on household_members
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own membership" ON household_members;
DROP POLICY IF EXISTS "Users can view household members in same household" ON household_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON household_members;
DROP POLICY IF EXISTS "Owners can delete members" ON household_members;
DROP POLICY IF EXISTS "Members can be updated by owners" ON household_members;

-- ============================================================================
-- 2. CREATE SECURITY DEFINER function that bypasses RLS
-- ============================================================================

-- This function runs with elevated privileges, bypassing RLS
CREATE OR REPLACE FUNCTION user_is_in_household(p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION user_is_household_owner_or_admin(p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$;

-- ============================================================================
-- 3. CREATE simple policies using SECURITY DEFINER functions
-- ============================================================================

-- Users can see their own membership record directly
CREATE POLICY "Users can view own membership"
  ON household_members FOR SELECT
  USING (user_id = auth.uid());

-- Users can see other members if they're in the same household (using function)
CREATE POLICY "Users can view same household members"
  ON household_members FOR SELECT
  USING (user_is_in_household(household_id));

-- Users can insert themselves
CREATE POLICY "Users can insert own membership"
  ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Owners/admins can delete members
CREATE POLICY "Owners can delete members"
  ON household_members FOR DELETE
  USING (user_is_household_owner_or_admin(household_id));

-- Owners/admins can update members
CREATE POLICY "Owners can update members"
  ON household_members FOR UPDATE
  USING (user_is_household_owner_or_admin(household_id));

-- ============================================================================
-- Success!
-- ============================================================================

-- Now fix family_members policies to use the same function
DROP POLICY IF EXISTS "Users can view household family members" ON family_members;
DROP POLICY IF EXISTS "Users can insert household family members" ON family_members;
DROP POLICY IF EXISTS "Users can update household family members" ON family_members;
DROP POLICY IF EXISTS "Users can delete household family members" ON family_members;

CREATE POLICY "Users can view household family members"
  ON family_members FOR SELECT
  USING (user_is_in_household(household_id));

CREATE POLICY "Users can insert household family members"
  ON family_members FOR INSERT
  WITH CHECK (user_is_in_household(household_id));

CREATE POLICY "Users can update household family members"
  ON family_members FOR UPDATE
  USING (user_is_in_household(household_id));

CREATE POLICY "Users can delete household family members"
  ON family_members FOR DELETE
  USING (user_is_in_household(household_id));

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Fixed household_members RLS with SECURITY DEFINER!';
  RAISE NOTICE 'Fixed family_members RLS to use same function!';
  RAISE NOTICE 'Policies now use elevated functions to avoid recursion';
  RAISE NOTICE 'Refresh your app - data should load now!';
  RAISE NOTICE '==========================================';
END $$;
