-- Add RPC function to get user email (requires auth schema access)
-- This function will be used to display user emails in household member lists

CREATE OR REPLACE FUNCTION get_household_members_with_emails(p_household_id UUID)
RETURNS TABLE (
  id UUID,
  household_id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  invited_by UUID,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hm.id,
    hm.household_id,
    hm.user_id,
    hm.role::TEXT,
    hm.joined_at,
    hm.invited_by,
    COALESCE(
      au.raw_user_meta_data->>'first_name',
      SPLIT_PART((au.raw_user_meta_data->>'full_name'), ' ', 1),
      SPLIT_PART(au.email::TEXT, '@', 1),
      'Unknown'
    ) as email
  FROM public.household_members hm
  LEFT JOIN auth.users au ON hm.user_id = au.id
  WHERE hm.household_id = p_household_id
  ORDER BY hm.joined_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_household_members_with_emails(UUID) TO authenticated;

COMMENT ON FUNCTION get_household_members_with_emails IS 
'Returns household members with their email addresses from auth.users';
