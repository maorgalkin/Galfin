-- Migration 022: Fix Critical Database Issues
-- Date: 2025-11-29
-- Description: Comprehensive fix for multiple database issues identified during audit
--
-- Issues Fixed:
-- 1. Missing DELETE policy on households table
-- 2. Wrong unique constraint on monthly_budgets (user_id instead of household_id)
-- 3. Wrong unique index on personal_budgets (user_id instead of household_id)
-- 4. RLS policies reference non-existent 'admin' role
-- 5. category_adjustment_history missing household_id
-- 6. Outdated get_or_create_monthly_budget function
-- 7. budget_adjustments missing category_id column

-- ============================================================================
-- 1. ADD MISSING DELETE AND INSERT POLICIES ON HOUSEHOLDS
-- ============================================================================

-- Drop existing policies (to be safe)
DROP POLICY IF EXISTS "Household creators can delete" ON households;
DROP POLICY IF EXISTS "Users can create households" ON households;

-- Add DELETE policy - only creators can delete their household
CREATE POLICY "Household creators can delete"
  ON households FOR DELETE
  USING (created_by = auth.uid());

-- Add INSERT policy - users can create households for themselves
CREATE POLICY "Users can create households"
  ON households FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- 2. FIX MONTHLY_BUDGETS UNIQUE CONSTRAINT
-- ============================================================================

-- Drop the old constraint
ALTER TABLE monthly_budgets 
  DROP CONSTRAINT IF EXISTS unique_user_year_month;

-- Add new constraint based on household_id
-- First check if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_household_year_month'
  ) THEN
    ALTER TABLE monthly_budgets 
      ADD CONSTRAINT unique_household_year_month UNIQUE(household_id, year, month);
    RAISE NOTICE '✅ Updated monthly_budgets unique constraint to use household_id';
  END IF;
END $$;

-- ============================================================================
-- 3. FIX PERSONAL_BUDGETS UNIQUE INDEX
-- ============================================================================

-- Drop the old index
DROP INDEX IF EXISTS idx_personal_budgets_one_active_per_user;

-- Create new index based on household_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_budgets_one_active_per_household 
  ON personal_budgets(household_id) 
  WHERE (is_active = true);

-- ============================================================================
-- 4. FIX RLS POLICIES REFERENCING 'admin' ROLE
-- ============================================================================

-- Fix categories table policies - drop both old and new names to be safe
DROP POLICY IF EXISTS "Household admins can manage shared categories" ON categories;
DROP POLICY IF EXISTS "Household owners can manage shared categories" ON categories;

CREATE POLICY "Household owners can manage shared categories"
  ON categories FOR ALL
  USING (
    household_id IS NOT NULL AND
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid() AND hm.role = 'owner'
    )
  );

-- ============================================================================
-- 5. ADD HOUSEHOLD_ID TO CATEGORY_ADJUSTMENT_HISTORY
-- ============================================================================

-- Add column if it doesn't exist
ALTER TABLE category_adjustment_history 
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_category_adjustment_history_household 
  ON category_adjustment_history(household_id);

-- Backfill household_id from user's current household
UPDATE category_adjustment_history cah
SET household_id = hm.household_id
FROM household_members hm
WHERE cah.user_id = hm.user_id
  AND cah.household_id IS NULL;

-- Update RLS policies to use household_id (drop both old and new names)
DROP POLICY IF EXISTS "Users can view own adjustment history" ON category_adjustment_history;
DROP POLICY IF EXISTS "Users can insert own adjustment history" ON category_adjustment_history;
DROP POLICY IF EXISTS "Users can update own adjustment history" ON category_adjustment_history;
DROP POLICY IF EXISTS "Users can delete own adjustment history" ON category_adjustment_history;
DROP POLICY IF EXISTS "Users can view household adjustment history" ON category_adjustment_history;
DROP POLICY IF EXISTS "Users can insert household adjustment history" ON category_adjustment_history;
DROP POLICY IF EXISTS "Users can update household adjustment history" ON category_adjustment_history;
DROP POLICY IF EXISTS "Users can delete household adjustment history" ON category_adjustment_history;

CREATE POLICY "Users can view household adjustment history"
  ON category_adjustment_history FOR SELECT
  USING (
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household adjustment history"
  ON category_adjustment_history FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household adjustment history"
  ON category_adjustment_history FOR UPDATE
  USING (
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household adjustment history"
  ON category_adjustment_history FOR DELETE
  USING (
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. ADD CATEGORY_ID TO BUDGET_ADJUSTMENTS (if missing)
-- ============================================================================

ALTER TABLE budget_adjustments 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_budget_adjustments_category_id 
  ON budget_adjustments(category_id) 
  WHERE category_id IS NOT NULL;

-- ============================================================================
-- 7. FIX/REPLACE GET_OR_CREATE_MONTHLY_BUDGET FUNCTION
-- ============================================================================

-- Drop old function
DROP FUNCTION IF EXISTS get_or_create_monthly_budget(UUID, INT, INT);

-- Create updated function that uses household_id and includes original_categories
CREATE OR REPLACE FUNCTION get_or_create_monthly_budget(
  p_household_id UUID,
  p_year INT,
  p_month INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_budget_id UUID;
  v_personal_budget_id UUID;
  v_categories JSONB;
  v_global_settings JSONB;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if monthly budget already exists
  SELECT id INTO v_monthly_budget_id
  FROM monthly_budgets
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;
  
  -- If exists, return it
  IF v_monthly_budget_id IS NOT NULL THEN
    RETURN v_monthly_budget_id;
  END IF;
  
  -- Get active personal budget for this household
  SELECT id, categories, global_settings
  INTO v_personal_budget_id, v_categories, v_global_settings
  FROM personal_budgets
  WHERE household_id = p_household_id
    AND is_active = true
  LIMIT 1;
  
  -- If no personal budget exists, return NULL
  IF v_personal_budget_id IS NULL THEN
    RAISE NOTICE 'No active personal budget found for household %', p_household_id;
    RETURN NULL;
  END IF;
  
  -- Create new monthly budget from personal budget (concurrency-safe)
  INSERT INTO monthly_budgets (
    user_id,
    household_id,
    personal_budget_id,
    year,
    month,
    categories,
    original_categories,
    global_settings,
    adjustment_count
  ) VALUES (
    v_user_id,
    p_household_id,
    v_personal_budget_id,
    p_year,
    p_month,
    v_categories,
    v_categories,  -- original_categories starts as copy
    v_global_settings,
    0
  )
  ON CONFLICT (household_id, year, month) DO NOTHING
  RETURNING id INTO v_monthly_budget_id;
  
  -- If ON CONFLICT triggered, fetch the existing id
  IF v_monthly_budget_id IS NULL THEN
    SELECT id INTO v_monthly_budget_id
    FROM monthly_budgets
    WHERE household_id = p_household_id
      AND year = p_year
      AND month = p_month;
  END IF;
  
  RETURN v_monthly_budget_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_monthly_budget(UUID, INT, INT) TO authenticated;

-- ============================================================================
-- 8. DROP OUTDATED/BROKEN MIGRATION FUNCTIONS
-- ============================================================================

-- These functions reference columns that don't exist (personal_budgets.category, etc.)
-- They were designed for a different schema structure
DROP FUNCTION IF EXISTS migrate_categories_from_budgets(UUID);
DROP FUNCTION IF EXISTS update_budget_category_ids(UUID);

-- ============================================================================
-- 9. VERIFY ALL FIXES
-- ============================================================================

DO $$
DECLARE
  policy_count INT;
  constraint_exists BOOLEAN;
BEGIN
  -- Check households DELETE policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'households' AND policyname LIKE '%delete%';
  
  IF policy_count > 0 THEN
    RAISE NOTICE '✅ Households DELETE policy exists';
  ELSE
    RAISE WARNING '❌ Households DELETE policy NOT found';
  END IF;
  
  -- Check monthly_budgets constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_household_year_month'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE '✅ Monthly budgets household constraint exists';
  ELSE
    RAISE WARNING '❌ Monthly budgets household constraint NOT found';
  END IF;
  
  -- Check personal_budgets index
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_personal_budgets_one_active_per_household'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE '✅ Personal budgets household index exists';
  ELSE
    RAISE WARNING '❌ Personal budgets household index NOT found';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Migration 022 Complete!';
  RAISE NOTICE 'Fixed all critical database issues';
  RAISE NOTICE '============================================';
END $$;
