-- Migration: Budget Adjustment System
-- Version: 002
-- Date: 2025-10-25
-- Description: Add Personal Budget, Monthly Budget, and Adjustment tracking tables

-- ============================================================================
-- 1. PERSONAL BUDGETS TABLE
-- ============================================================================
-- Stores the user's baseline/ideal budget configuration
-- This is the reference point for all comparisons and adjustments

CREATE TABLE IF NOT EXISTS personal_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version INT DEFAULT 1 NOT NULL,
  name TEXT DEFAULT 'Personal Budget' NOT NULL,
  categories JSONB NOT NULL,
  global_settings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  
  -- Ensure only one active personal budget per user
  CONSTRAINT one_active_personal_budget_per_user 
    UNIQUE(user_id, is_active) 
    WHERE is_active = true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_budgets_user_id ON personal_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_budgets_active ON personal_budgets(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_personal_budgets_created_at ON personal_budgets(created_at DESC);

-- Enable Row Level Security
ALTER TABLE personal_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own personal budgets"
  ON personal_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal budgets"
  ON personal_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal budgets"
  ON personal_budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal budgets"
  ON personal_budgets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. MONTHLY BUDGETS TABLE
-- ============================================================================
-- Stores the active budget for each month
-- Inherits from personal budget but can be adjusted

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  personal_budget_id UUID REFERENCES personal_budgets(id) ON DELETE SET NULL,
  year INT NOT NULL CHECK (year >= 2020 AND year <= 2100),
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  categories JSONB NOT NULL,
  global_settings JSONB NOT NULL,
  adjustment_count INT DEFAULT 0 NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes TEXT,
  
  -- Ensure one budget per user per month
  CONSTRAINT unique_user_year_month UNIQUE(user_id, year, month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_id ON monthly_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_year_month ON monthly_budgets(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_personal_budget ON monthly_budgets(personal_budget_id);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_created_at ON monthly_budgets(created_at DESC);

-- Enable Row Level Security
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own monthly budgets"
  ON monthly_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly budgets"
  ON monthly_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly budgets"
  ON monthly_budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly budgets"
  ON monthly_budgets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. BUDGET ADJUSTMENTS TABLE
-- ============================================================================
-- Stores scheduled adjustments that will be applied on the 1st of next month

CREATE TABLE IF NOT EXISTS budget_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_name TEXT NOT NULL,
  current_limit DECIMAL(10, 2) NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
  adjustment_amount DECIMAL(10, 2) NOT NULL CHECK (adjustment_amount > 0),
  new_limit DECIMAL(10, 2) NOT NULL CHECK (new_limit >= 0),
  effective_year INT NOT NULL CHECK (effective_year >= 2020 AND effective_year <= 2100),
  effective_month INT NOT NULL CHECK (effective_month >= 1 AND effective_month <= 12),
  reason TEXT,
  is_applied BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  applied_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id),
  
  -- Ensure only one pending adjustment per category per month
  CONSTRAINT unique_pending_adjustment_per_category 
    UNIQUE(user_id, category_name, effective_year, effective_month) 
    WHERE is_applied = false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_adjustments_user_id ON budget_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_adjustments_effective_date ON budget_adjustments(effective_year, effective_month);
CREATE INDEX IF NOT EXISTS idx_budget_adjustments_pending ON budget_adjustments(user_id, is_applied) WHERE is_applied = false;
CREATE INDEX IF NOT EXISTS idx_budget_adjustments_category ON budget_adjustments(user_id, category_name);

-- Enable Row Level Security
ALTER TABLE budget_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own budget adjustments"
  ON budget_adjustments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget adjustments"
  ON budget_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget adjustments"
  ON budget_adjustments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget adjustments"
  ON budget_adjustments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. CATEGORY ADJUSTMENT HISTORY TABLE
-- ============================================================================
-- Tracks how often each category has been adjusted (for insights)

CREATE TABLE IF NOT EXISTS category_adjustment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_name TEXT NOT NULL,
  adjustment_count INT DEFAULT 0 NOT NULL,
  last_adjusted_at TIMESTAMPTZ,
  total_increased_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  total_decreased_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  first_adjustment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one history record per user per category
  CONSTRAINT unique_user_category_history UNIQUE(user_id, category_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_history_user_id ON category_adjustment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_category_history_category ON category_adjustment_history(category_name);
CREATE INDEX IF NOT EXISTS idx_category_history_count ON category_adjustment_history(adjustment_count DESC);

-- Enable Row Level Security
ALTER TABLE category_adjustment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own adjustment history"
  ON category_adjustment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adjustment history"
  ON category_adjustment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own adjustment history"
  ON category_adjustment_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own adjustment history"
  ON category_adjustment_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create current month's budget
CREATE OR REPLACE FUNCTION get_or_create_monthly_budget(
  p_user_id UUID,
  p_year INT,
  p_month INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_monthly_budget_id UUID;
  v_personal_budget_id UUID;
  v_categories JSONB;
  v_global_settings JSONB;
BEGIN
  -- Check if monthly budget already exists
  SELECT id INTO v_monthly_budget_id
  FROM monthly_budgets
  WHERE user_id = p_user_id
    AND year = p_year
    AND month = p_month;
  
  -- If exists, return it
  IF v_monthly_budget_id IS NOT NULL THEN
    RETURN v_monthly_budget_id;
  END IF;
  
  -- Get active personal budget
  SELECT id, categories, global_settings
  INTO v_personal_budget_id, v_categories, v_global_settings
  FROM personal_budgets
  WHERE user_id = p_user_id
    AND is_active = true
  LIMIT 1;
  
  -- If no personal budget exists, return NULL
  IF v_personal_budget_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Create new monthly budget from personal budget
  INSERT INTO monthly_budgets (
    user_id,
    personal_budget_id,
    year,
    month,
    categories,
    global_settings,
    adjustment_count
  ) VALUES (
    p_user_id,
    v_personal_budget_id,
    p_year,
    p_month,
    v_categories,
    v_global_settings,
    0
  )
  RETURNING id INTO v_monthly_budget_id;
  
  RETURN v_monthly_budget_id;
END;
$$;

-- Function to update category adjustment history
CREATE OR REPLACE FUNCTION update_category_adjustment_history(
  p_user_id UUID,
  p_category_name TEXT,
  p_adjustment_type TEXT,
  p_adjustment_amount DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update history record
  INSERT INTO category_adjustment_history (
    user_id,
    category_name,
    adjustment_count,
    last_adjusted_at,
    total_increased_amount,
    total_decreased_amount,
    first_adjustment_at
  ) VALUES (
    p_user_id,
    p_category_name,
    1,
    NOW(),
    CASE WHEN p_adjustment_type = 'increase' THEN p_adjustment_amount ELSE 0 END,
    CASE WHEN p_adjustment_type = 'decrease' THEN p_adjustment_amount ELSE 0 END,
    NOW()
  )
  ON CONFLICT (user_id, category_name)
  DO UPDATE SET
    adjustment_count = category_adjustment_history.adjustment_count + 1,
    last_adjusted_at = NOW(),
    total_increased_amount = category_adjustment_history.total_increased_amount + 
      CASE WHEN p_adjustment_type = 'increase' THEN p_adjustment_amount ELSE 0 END,
    total_decreased_amount = category_adjustment_history.total_decreased_amount + 
      CASE WHEN p_adjustment_type = 'decrease' THEN p_adjustment_amount ELSE 0 END,
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp on personal_budgets
CREATE OR REPLACE FUNCTION update_personal_budget_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_personal_budget_timestamp
BEFORE UPDATE ON personal_budgets
FOR EACH ROW
EXECUTE FUNCTION update_personal_budget_timestamp();

-- Trigger to update updated_at timestamp on monthly_budgets
CREATE OR REPLACE FUNCTION update_monthly_budget_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_monthly_budget_timestamp
BEFORE UPDATE ON monthly_budgets
FOR EACH ROW
EXECUTE FUNCTION update_monthly_budget_timestamp();

-- Trigger to update updated_at timestamp on category_adjustment_history
CREATE OR REPLACE FUNCTION update_category_history_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_category_history_timestamp
BEFORE UPDATE ON category_adjustment_history
FOR EACH ROW
EXECUTE FUNCTION update_category_history_timestamp();

-- ============================================================================
-- 7. COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE personal_budgets IS 'Stores user baseline/ideal budget configurations';
COMMENT ON TABLE monthly_budgets IS 'Stores active budget for each month, can differ from personal budget';
COMMENT ON TABLE budget_adjustments IS 'Stores scheduled adjustments to be applied on 1st of month';
COMMENT ON TABLE category_adjustment_history IS 'Tracks adjustment frequency per category for insights';

COMMENT ON COLUMN personal_budgets.is_active IS 'Only one active personal budget per user';
COMMENT ON COLUMN personal_budgets.version IS 'Version number for tracking budget evolution';
COMMENT ON COLUMN monthly_budgets.adjustment_count IS 'Number of times this month budget was adjusted from personal';
COMMENT ON COLUMN monthly_budgets.is_locked IS 'Prevents further modifications (for closed months)';
COMMENT ON COLUMN budget_adjustments.is_applied IS 'Whether this adjustment has been applied to personal budget';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Budget Adjustment System Migration Complete!';
  RAISE NOTICE 'Created tables: personal_budgets, monthly_budgets, budget_adjustments, category_adjustment_history';
  RAISE NOTICE 'Created helper functions: get_or_create_monthly_budget, update_category_adjustment_history';
  RAISE NOTICE 'All RLS policies enabled';
END $$;
