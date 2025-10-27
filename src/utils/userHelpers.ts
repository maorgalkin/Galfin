/**
 * User Helper Utilities
 * Provides functions for extracting and formatting user information
 */

import type { User } from '@supabase/supabase-js';

/**
 * Extract user's first name from Supabase User object
 * Tries multiple sources in order of preference:
 * 1. user_metadata.first_name
 * 2. user_metadata.full_name (first word)
 * 3. Email address (before @ symbol, capitalized)
 * 4. Fallback to "User"
 */
export const getUserFirstName = (user: User | null): string => {
  if (!user) return 'User';
  
  // Check if user has metadata with first_name
  if (user.user_metadata?.first_name) {
    return user.user_metadata.first_name;
  }
  
  // Fall back to full_name if available
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name.split(' ')[0];
  }
  
  // Otherwise, extract from email (everything before @ or .)
  if (user.email) {
    const emailName = user.email.split('@')[0];
    // Capitalize first letter
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }
  
  return 'User';
};

/**
 * Get user's full display name
 */
export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'User';
  
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name;
  }
  
  if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
    return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
  }
  
  return getUserFirstName(user);
};
