-- Migration 015: Add category_id to Transactions
-- Part of Category Management Restructure (Phase 1)
-- See: docs/CATEGORY_MANAGEMENT_RESTRUCTURE.md

-- Add category_id column to transactions (nullable during migration period)
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Track original category for historical data preservation
-- This preserves the original category before any merges
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS original_category_id UUID REFERENCES categories(id);

-- Track when/why category was changed (for audit trail)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS category_changed_at TIMESTAMPTZ;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS category_change_reason TEXT;  -- 'merge', 'manual', 'bulk_update'

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_category_id 
  ON transactions(category_id) 
  WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_original_category_id 
  ON transactions(original_category_id) 
  WHERE original_category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_category_changed 
  ON transactions(category_changed_at) 
  WHERE category_changed_at IS NOT NULL;

-- Composite index for common query: user's transactions by category
CREATE INDEX IF NOT EXISTS idx_transactions_user_category 
  ON transactions(user_id, category_id, date DESC)
  WHERE category_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN transactions.category_id IS 'FK to categories table. NULL during dual-write migration period for old records';
COMMENT ON COLUMN transactions.original_category_id IS 'Preserves original category before any merges for historical accuracy';
COMMENT ON COLUMN transactions.category_changed_at IS 'Timestamp when category was changed (merge, manual reassignment)';
COMMENT ON COLUMN transactions.category_change_reason IS 'Why category changed: merge, manual, bulk_update';
