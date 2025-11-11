-- Fix family_members RLS policies to use SECURITY DEFINER function
-- This prevents recursion issues when querying household_members
-- Also adds optional linking between family_members and household_members

-- ============================================================================
-- 1. Add optional link from family_members to household_members
-- ============================================================================

ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS household_member_id UUID REFERENCES household_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN family_members.household_member_id IS 
'Optional link to household_member if this family member is also an app user. 
Allows filtering transactions by logged-in user and future notification features.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_family_members_household_member_id 
ON family_members(household_member_id);

-- ============================================================================
-- 2. Fix RLS policies to use SECURITY DEFINER function
-- ============================================================================

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

COMMENT ON POLICY "Users can view household family members" ON family_members IS 
'Allows household members to see family member labels using SECURITY DEFINER function';
