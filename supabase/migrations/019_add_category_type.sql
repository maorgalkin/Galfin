-- Migration 019: Add Category Type
-- Part of Category Management Restructure (Phase 4)
-- Adds type column to distinguish between expense and income categories

-- Add type column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income'));

-- Create index for type filtering
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(user_id, type) WHERE deleted_at IS NULL;

-- Update existing categories based on their usage in transactions
-- Categories used in income transactions get marked as 'income'
UPDATE categories c
SET type = 'income'
WHERE EXISTS (
  SELECT 1 FROM transactions t 
  WHERE t.category_id = c.id 
    AND t.type = 'income'
)
AND NOT EXISTS (
  SELECT 1 FROM transactions t 
  WHERE t.category_id = c.id 
    AND t.type = 'expense'
);

-- For categories used in both income and expense, keep as expense (more common)
-- and let users manage manually if needed

COMMENT ON COLUMN categories.type IS 'Category type: expense or income';
