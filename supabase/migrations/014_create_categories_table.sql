-- Migration 014: Create Categories Table
-- Part of Category Management Restructure (Phase 1)
-- See: docs/CATEGORY_MANAGEMENT_RESTRUCTURE.md

-- Create dedicated categories table with UUIDs
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  
  -- Category properties
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  icon TEXT,  -- Future: emoji or icon name
  
  -- Budget settings
  monthly_limit DECIMAL(12,2) DEFAULT 0,
  warning_threshold INTEGER DEFAULT 80,  -- Percentage
  
  -- State
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,  -- Tracks "was auto-generated" for analytics
  sort_order INTEGER DEFAULT 0,
  
  -- Soft-delete and merge tracking
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  deleted_reason TEXT,  -- 'merged', 'user_deleted', NULL if active
  merged_into_id UUID REFERENCES categories(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: category names must be unique per user/household for non-deleted categories
-- Using a partial unique index since UNIQUE NULLS NOT DISTINCT isn't available in all Postgres versions
CREATE UNIQUE INDEX idx_categories_unique_name 
  ON categories (user_id, COALESCE(household_id, '00000000-0000-0000-0000-000000000000'::uuid), name) 
  WHERE deleted_at IS NULL;

-- Performance indexes
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_categories_household ON categories(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_categories_active ON categories(user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_deleted ON categories(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_categories_merged_into ON categories(merged_into_id) WHERE merged_into_id IS NOT NULL;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can manage their own categories
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- Household members can view shared categories
CREATE POLICY "Household members can view shared categories"
  ON categories FOR SELECT
  USING (
    household_id IS NOT NULL AND
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

-- Household admins can manage shared categories
CREATE POLICY "Household admins can manage shared categories"
  ON categories FOR ALL
  USING (
    household_id IS NOT NULL AND
    household_id IN (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = auth.uid() AND hm.role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- Comments for documentation
COMMENT ON TABLE categories IS 'Stores budget categories with proper referential integrity';
COMMENT ON COLUMN categories.is_system IS 'True if category was auto-generated during onboarding';
COMMENT ON COLUMN categories.deleted_at IS 'Soft-delete timestamp. NULL means active';
COMMENT ON COLUMN categories.deleted_reason IS 'Why category was deleted: merged, user_deleted';
COMMENT ON COLUMN categories.merged_into_id IS 'If merged, points to the target category';
