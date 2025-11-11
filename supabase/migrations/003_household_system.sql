-- Migration: Household Multi-User System
-- Version: 003
-- Date: 2025-11-11
-- Description: Enable multiple users to share datasets through households

-- ============================================================================
-- 1. HOUSEHOLDS TABLE
-- ============================================================================
-- Groups users together to share financial data

CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_households_created_by ON households(created_by);
CREATE INDEX IF NOT EXISTS idx_households_created_at ON households(created_at DESC);

-- Enable RLS (policies added after household_members table is created)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. HOUSEHOLD MEMBERS TABLE
-- ============================================================================
-- Join table connecting users to households with roles

CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- One user can only be in one household
  CONSTRAINT unique_user_household UNIQUE(user_id),
  
  -- One owner per household
  CONSTRAINT one_owner_per_household UNIQUE(household_id, role) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Remove the one_owner constraint temporarily for the CHECK constraint
ALTER TABLE household_members DROP CONSTRAINT IF EXISTS one_owner_per_household;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_role ON household_members(role);

-- Partial unique index: Only one owner per household
CREATE UNIQUE INDEX IF NOT EXISTS idx_household_members_one_owner
  ON household_members(household_id)
  WHERE role = 'owner';

-- Enable RLS
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own household members"
  ON household_members FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves into households"
  ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Only owners/admins can remove members (will be refined in Phase 2)
CREATE POLICY "Owners can manage members"
  ON household_members FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 3. ADD RLS POLICIES FOR HOUSEHOLDS (now that household_members exists)
-- ============================================================================

-- RLS Policies: Users can view households they belong to
CREATE POLICY "Users can view own household"
  ON households FOR SELECT
  USING (
    id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Only household creators can update household details (for now)
CREATE POLICY "Household creators can update"
  ON households FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- 4. ADD HOUSEHOLD_ID TO EXISTING TABLES
-- ============================================================================

-- Add household_id column to transactions (nullable initially)
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transactions_household ON transactions(household_id);

-- Add household_id column to personal_budgets
ALTER TABLE personal_budgets 
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_personal_budgets_household ON personal_budgets(household_id);

-- Add household_id column to monthly_budgets
ALTER TABLE monthly_budgets 
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_household ON monthly_budgets(household_id);

-- Add household_id column to budget_adjustments
ALTER TABLE budget_adjustments 
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_budget_adjustments_household ON budget_adjustments(household_id);

-- Add household_id column to family_members
ALTER TABLE family_members 
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_family_members_household ON family_members(household_id);

-- ============================================================================
-- 5. DATA MIGRATION: Assign Existing Users to Individual Households
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
BEGIN
  -- For each user with existing data, create a household
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM transactions
    UNION
    SELECT DISTINCT user_id 
    FROM personal_budgets
    UNION
    SELECT DISTINCT user_id 
    FROM monthly_budgets
  LOOP
    -- Create a household for this user
    INSERT INTO households (name, created_by)
    VALUES ('My Household', user_record.user_id)
    RETURNING id INTO new_household_id;
    
    -- Add user as owner of the household
    INSERT INTO household_members (household_id, user_id, role)
    VALUES (new_household_id, user_record.user_id, 'owner');
    
    -- Update all their transactions
    UPDATE transactions 
    SET household_id = new_household_id 
    WHERE user_id = user_record.user_id;
    
    -- Update all their personal budgets
    UPDATE personal_budgets 
    SET household_id = new_household_id 
    WHERE user_id = user_record.user_id;
    
    -- Update all their monthly budgets
    UPDATE monthly_budgets 
    SET household_id = new_household_id 
    WHERE user_id = user_record.user_id;
    
    -- Update all their budget adjustments
    UPDATE budget_adjustments 
    SET household_id = new_household_id 
    WHERE user_id = user_record.user_id;
    
    -- Update all their family members
    UPDATE family_members 
    SET household_id = new_household_id 
    WHERE user_id = user_record.user_id;
    
    RAISE NOTICE 'Migrated user % to household %', user_record.user_id, new_household_id;
  END LOOP;
END $$;

-- ============================================================================
-- 6. UPDATE RLS POLICIES TO USE HOUSEHOLD_ID
-- ============================================================================

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

CREATE POLICY "Users can view household transactions"
  ON transactions FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household transactions"
  ON transactions FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household transactions"
  ON transactions FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- PERSONAL BUDGETS
DROP POLICY IF EXISTS "Users can view own personal budgets" ON personal_budgets;
DROP POLICY IF EXISTS "Users can insert own personal budgets" ON personal_budgets;
DROP POLICY IF EXISTS "Users can update own personal budgets" ON personal_budgets;
DROP POLICY IF EXISTS "Users can delete own personal budgets" ON personal_budgets;

CREATE POLICY "Users can view household personal budgets"
  ON personal_budgets FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household personal budgets"
  ON personal_budgets FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household personal budgets"
  ON personal_budgets FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household personal budgets"
  ON personal_budgets FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- MONTHLY BUDGETS
DROP POLICY IF EXISTS "Users can view own monthly budgets" ON monthly_budgets;
DROP POLICY IF EXISTS "Users can insert own monthly budgets" ON monthly_budgets;
DROP POLICY IF EXISTS "Users can update own monthly budgets" ON monthly_budgets;
DROP POLICY IF EXISTS "Users can delete own monthly budgets" ON monthly_budgets;

CREATE POLICY "Users can view household monthly budgets"
  ON monthly_budgets FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household monthly budgets"
  ON monthly_budgets FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household monthly budgets"
  ON monthly_budgets FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household monthly budgets"
  ON monthly_budgets FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- BUDGET ADJUSTMENTS
DROP POLICY IF EXISTS "Users can view own budget adjustments" ON budget_adjustments;
DROP POLICY IF EXISTS "Users can insert own budget adjustments" ON budget_adjustments;
DROP POLICY IF EXISTS "Users can update own budget adjustments" ON budget_adjustments;
DROP POLICY IF EXISTS "Users can delete own budget adjustments" ON budget_adjustments;

CREATE POLICY "Users can view household budget adjustments"
  ON budget_adjustments FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household budget adjustments"
  ON budget_adjustments FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household budget adjustments"
  ON budget_adjustments FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household budget adjustments"
  ON budget_adjustments FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- FAMILY MEMBERS
DROP POLICY IF EXISTS "Users can view own family members" ON family_members;
DROP POLICY IF EXISTS "Users can insert own family members" ON family_members;
DROP POLICY IF EXISTS "Users can update own family members" ON family_members;
DROP POLICY IF EXISTS "Users can delete own family members" ON family_members;

CREATE POLICY "Users can view household family members"
  ON family_members FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household family members"
  ON family_members FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household family members"
  ON family_members FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household family members"
  ON family_members FOR DELETE
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's household_id
CREATE OR REPLACE FUNCTION get_user_household_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_household_id UUID;
BEGIN
  SELECT household_id INTO v_household_id
  FROM household_members
  WHERE user_id = p_user_id;
  
  RETURN v_household_id;
END;
$$;

-- Function to check if user is household owner
CREATE OR REPLACE FUNCTION is_household_owner(p_user_id UUID, p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM household_members
    WHERE user_id = p_user_id
      AND household_id = p_household_id
      AND role = 'owner'
  ) INTO v_is_owner;
  
  RETURN v_is_owner;
END;
$$;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on households
CREATE OR REPLACE FUNCTION update_household_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_household_timestamp
BEFORE UPDATE ON households
FOR EACH ROW
EXECUTE FUNCTION update_household_timestamp();

-- ============================================================================
-- 9. COMMENTS
-- ============================================================================

COMMENT ON TABLE households IS 'Groups users together to share financial data';
COMMENT ON TABLE household_members IS 'Join table connecting users to households with roles';
COMMENT ON COLUMN household_members.role IS 'owner (creator, full control), admin (manage members), member (view/edit data)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Household Multi-User System Migration Complete!';
  RAISE NOTICE 'Created tables: households, household_members';
  RAISE NOTICE 'Added household_id to: transactions, personal_budgets, monthly_budgets, budget_adjustments, family_members';
  RAISE NOTICE 'Updated all RLS policies to use household-based access';
  RAISE NOTICE 'Migrated existing users to individual households';
END $$;
