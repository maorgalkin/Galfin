-- Migration: User Alert Views
-- Version: 013
-- Date: 2025-11-19
-- Description: Track which budget alerts users have viewed/dismissed for cross-device sync

-- ============================================================================
-- USER ALERT VIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_alert_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  
  -- One user can only view each alert once
  CONSTRAINT unique_user_alert UNIQUE(user_id, alert_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_alert_views_user ON user_alert_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alert_views_household ON user_alert_views(household_id);
CREATE INDEX IF NOT EXISTS idx_user_alert_views_alert_id ON user_alert_views(alert_id);
CREATE INDEX IF NOT EXISTS idx_user_alert_views_viewed_at ON user_alert_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE user_alert_views ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Users can view their own alert views
CREATE POLICY "Users can view own alert views"
  ON user_alert_views FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own alert views
CREATE POLICY "Users can insert own alert views"
  ON user_alert_views FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own alert views
CREATE POLICY "Users can delete own alert views"
  ON user_alert_views FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================
-- Optional: Function to clean up old alert views (alerts older than 90 days)

CREATE OR REPLACE FUNCTION cleanup_old_alert_views()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_alert_views
  WHERE viewed_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_alert_views() TO authenticated;

COMMENT ON TABLE user_alert_views IS 'Tracks which budget alerts users have viewed/dismissed for cross-device synchronization';
COMMENT ON FUNCTION cleanup_old_alert_views() IS 'Removes alert view records older than 90 days to prevent table bloat';
