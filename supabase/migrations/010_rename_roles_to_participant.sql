-- Migration: Rename Household Member Roles to "Participant"
-- Version: 010
-- Date: 2025-11-13
-- Description: Simplify role terminology - Owner and Participant instead of Owner/Admin/Member

-- ============================================================================
-- 1. UPDATE ROLE VALUES IN household_members TABLE
-- ============================================================================

-- Update existing 'admin' and 'member' roles to 'participant'
UPDATE household_members 
SET role = 'participant' 
WHERE role IN ('admin', 'member');

-- ============================================================================
-- 2. UPDATE CHECK CONSTRAINT
-- ============================================================================

-- Drop old constraint
ALTER TABLE household_members 
DROP CONSTRAINT IF EXISTS household_members_role_check;

-- Add new constraint with only 'owner' and 'participant'
ALTER TABLE household_members 
ADD CONSTRAINT household_members_role_check 
CHECK (role IN ('owner', 'participant'));

-- ============================================================================
-- 3. AUTO-CREATE FAMILY MEMBER TAGS FOR PARTICIPANTS
-- ============================================================================

-- Create a trigger function to auto-create family_member tag when participant joins
CREATE OR REPLACE FUNCTION auto_create_family_member_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_first_name TEXT;
  display_name TEXT;
  household_uuid UUID;
BEGIN
  -- Get household_id from the new member
  household_uuid := NEW.household_id;
  
  -- Get user's email and metadata
  SELECT email, raw_user_meta_data->>'first_name' 
  INTO user_email, user_first_name
  FROM auth.users 
  WHERE id = NEW.user_id;
  
  -- Determine display name
  IF user_first_name IS NOT NULL AND LENGTH(TRIM(user_first_name)) > 0 THEN
    display_name := TRIM(user_first_name);
  ELSIF user_email IS NOT NULL THEN
    -- Use part before @ in email
    display_name := SPLIT_PART(user_email, '@', 1);
  ELSE
    display_name := 'Member';
  END IF;
  
  -- Check if a family_member tag already exists linked to this user
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE household_member_id = NEW.id
  ) THEN
    -- Create family_member tag linked to this participant
    INSERT INTO family_members (household_id, user_id, name, color, household_member_id)
    VALUES (
      household_uuid,
      NEW.user_id,
      display_name,
      '#6366f1', -- Default indigo color
      NEW.id     -- Link to household_member record
    );
    
    RAISE NOTICE 'Auto-created family_member tag for % in household %', display_name, household_uuid;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires AFTER insert on household_members
DROP TRIGGER IF EXISTS trigger_auto_create_family_member_tag ON household_members;

CREATE TRIGGER trigger_auto_create_family_member_tag
AFTER INSERT ON household_members
FOR EACH ROW
EXECUTE FUNCTION auto_create_family_member_tag();

-- ============================================================================
-- 4. BACKFILL: Create family_member tags for existing participants without tags
-- ============================================================================

DO $$
DECLARE
  member_record RECORD;
  user_email TEXT;
  user_first_name TEXT;
  display_name TEXT;
  tag_count INT := 0;
BEGIN
  -- For each household_member that doesn't have a linked family_member tag
  FOR member_record IN 
    SELECT hm.id, hm.household_id, hm.user_id
    FROM household_members hm
    LEFT JOIN family_members fm ON fm.household_member_id = hm.id
    WHERE fm.id IS NULL
  LOOP
    -- Get user's email and metadata
    SELECT email, raw_user_meta_data->>'first_name' 
    INTO user_email, user_first_name
    FROM auth.users 
    WHERE id = member_record.user_id;
    
    -- Determine display name
    IF user_first_name IS NOT NULL AND LENGTH(TRIM(user_first_name)) > 0 THEN
      display_name := TRIM(user_first_name);
    ELSIF user_email IS NOT NULL THEN
      display_name := SPLIT_PART(user_email, '@', 1);
    ELSE
      display_name := 'Member';
    END IF;
    
    -- Create family_member tag
    INSERT INTO family_members (household_id, user_id, name, color, household_member_id)
    VALUES (
      member_record.household_id,
      member_record.user_id,
      display_name,
      '#6366f1',
      member_record.id
    );
    
    tag_count := tag_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % family_member tags for existing participants', tag_count;
END $$;

-- ============================================================================
-- 5. UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN household_members.role IS 'owner (full control, budget config) or participant (can add transactions, view data)';
COMMENT ON TABLE family_members IS 'Transaction tags/labels for attributing transactions. Can be linked to Budget Participants (household_members).';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Role Terminology Migration Complete!';
  RAISE NOTICE 'Updated roles: admin/member -> participant';
  RAISE NOTICE 'Added auto-create trigger for family_member tags';
  RAISE NOTICE 'Backfilled tags for existing participants';
END $$;
