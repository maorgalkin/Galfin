import { supabase } from '../lib/supabase';

export interface Household {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  invited_by: string | null;
  email?: string;  // Added from auth.users join
}

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user.id;
};

// ==================== HOUSEHOLD QUERIES ====================

/**
 * Get the current user's household
 */
export const getUserHousehold = async (): Promise<Household | null> => {
  const userId = await getCurrentUserId();

  // First get the household_id from household_members
  const { data: memberData, error: memberError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single();

  if (memberError || !memberData) {
    return null;
  }

  // Then get the household details
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', memberData.household_id)
    .single();

  if (error) {
    console.error('Error fetching household:', error);
    throw error;
  }

  return data;
};

/**
 * Get all members of the current user's household
 */
export const getHouseholdMembers = async (): Promise<HouseholdMember[]> => {
  const userId = await getCurrentUserId();

  // First get the user's household_id
  const { data: memberData, error: memberError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single();

  if (memberError || !memberData) {
    return [];
  }

  // Get all members of this household with emails using RPC
  const { data, error } = await supabase
    .rpc('get_household_members_with_emails', {
      p_household_id: memberData.household_id
    });

  if (error) {
    console.error('Error fetching household members:', error);
    throw error;
  }

  // Cast role from TEXT back to the proper type
  return (data || []).map((member: any) => ({
    ...member,
    role: member.role as 'owner' | 'admin' | 'member',
  }));
};

/**
 * Get current user's role in their household
 */
export const getUserRole = async (): Promise<'owner' | 'admin' | 'member' | null> => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
};

// ==================== HOUSEHOLD MUTATIONS ====================

/**
 * Create a new household (typically only called during user registration)
 */
export const createHousehold = async (name: string): Promise<Household> => {
  const userId = await getCurrentUserId();

  // Create the household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({
      name,
      created_by: userId,
    })
    .select()
    .single();

  if (householdError) {
    console.error('Error creating household:', householdError);
    throw householdError;
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: household.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberError) {
    console.error('Error adding household owner:', memberError);
    throw memberError;
  }

  return household;
};

/**
 * Update household name
 */
export const updateHouseholdName = async (householdId: string, name: string): Promise<Household> => {
  const { data, error } = await supabase
    .from('households')
    .update({ name })
    .eq('id', householdId)
    .select()
    .single();

  if (error) {
    console.error('Error updating household name:', error);
    throw error;
  }

  return data;
};

/**
 * Invite a member to the household (simplified - just adds them directly)
 * In Phase 2, this would send an email invitation
 */
export const inviteMemberByEmail = async (email: string, role: 'admin' | 'member' = 'member'): Promise<void> => {
  const userId = await getCurrentUserId();

  // Get the inviter's household
  const { data: memberData, error: memberError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single();

  if (memberError || !memberData) {
    throw new Error('User is not part of a household');
  }

  // Look up user by email
  // Note: This requires a database function or admin API call
  // For now, this is a placeholder - will be implemented in Phase 2
  throw new Error('Email invitation not yet implemented. Use inviteMemberByUserId instead.');
};

/**
 * Invite a member by their user ID (for testing/development)
 */
export const inviteMemberByUserId = async (
  inviteeUserId: string, 
  role: 'admin' | 'member' = 'member'
): Promise<HouseholdMember> => {
  const userId = await getCurrentUserId();

  // Get the inviter's household
  const { data: memberData, error: memberError } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', userId)
    .single();

  if (memberError || !memberData) {
    throw new Error('User is not part of a household');
  }

  // Check if inviter has permission (owner or admin)
  if (memberData.role !== 'owner' && memberData.role !== 'admin') {
    throw new Error('Only owners and admins can invite members');
  }

  // Add the new member
  const { data, error } = await supabase
    .from('household_members')
    .insert({
      household_id: memberData.household_id,
      user_id: inviteeUserId,
      role,
      invited_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding household member:', error);
    throw error;
  }

  return data;
};

/**
 * Remove a member from the household
 */
export const removeMember = async (memberId: string): Promise<void> => {
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing household member:', error);
    throw error;
  }
};

/**
 * Leave the current household
 */
export const leaveHousehold = async (): Promise<void> => {
  const userId = await getCurrentUserId();

  // Get user's membership
  const { data: memberData, error: memberError } = await supabase
    .from('household_members')
    .select('role, household_id')
    .eq('user_id', userId)
    .single();

  if (memberError || !memberData) {
    throw new Error('User is not part of a household');
  }

  // Prevent owner from leaving (must transfer ownership first)
  if (memberData.role === 'owner') {
    throw new Error('Owner cannot leave household. Transfer ownership first or delete the household.');
  }

  // Remove the member
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving household:', error);
    throw error;
  }
};

/**
 * Update a member's role
 */
export const updateMemberRole = async (
  memberId: string, 
  newRole: 'admin' | 'member'
): Promise<HouseholdMember> => {
  const { data, error } = await supabase
    .from('household_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    console.error('Error updating member role:', error);
    throw error;
  }

  return data;
};
