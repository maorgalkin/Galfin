-- Migration 023: Fix user_alert_views foreign key cascade
-- Date: 2025-11-29
-- Description: Ensure household_id foreign key has ON DELETE CASCADE

-- Drop the existing constraint and recreate with CASCADE
ALTER TABLE user_alert_views 
  DROP CONSTRAINT IF EXISTS user_alert_views_household_id_fkey;

ALTER TABLE user_alert_views 
  ADD CONSTRAINT user_alert_views_household_id_fkey 
  FOREIGN KEY (household_id) 
  REFERENCES households(id) 
  ON DELETE CASCADE;

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed user_alert_views household_id foreign key with ON DELETE CASCADE';
END $$;
