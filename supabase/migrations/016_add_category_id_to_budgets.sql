-- Migration 016: Add category_id to Budget Tables
-- Part of Category Management Restructure (Phase 1)
-- See: docs/CATEGORY_MANAGEMENT_RESTRUCTURE.md

-- ============================================
-- Personal Budgets
-- ============================================

-- Add category_id column (nullable during migration)
ALTER TABLE personal_budgets
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- Index for category_id lookups
CREATE INDEX IF NOT EXISTS idx_personal_budgets_category_id 
  ON personal_budgets(category_id) 
  WHERE category_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN personal_budgets.category_id IS 'FK to categories table. During dual-write, both this and category (text) are maintained';

-- ============================================
-- Monthly Budgets
-- ============================================

-- Add category_id column (nullable during migration)
ALTER TABLE monthly_budgets
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- Track original category for historical data preservation
ALTER TABLE monthly_budgets
  ADD COLUMN IF NOT EXISTS original_category_id UUID REFERENCES categories(id);

-- Index for category_id lookups
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_category_id 
  ON monthly_budgets(category_id) 
  WHERE category_id IS NOT NULL;

-- Composite index for common query: user's budgets by category and month
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_category_month
  ON monthly_budgets(user_id, category_id, month, year)
  WHERE category_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN monthly_budgets.category_id IS 'FK to categories table. During dual-write, both this and category (text) are maintained';
COMMENT ON COLUMN monthly_budgets.original_category_id IS 'Preserves original category before any merges for historical accuracy';
