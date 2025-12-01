/**
 * Alert Test Helpers
 * ===================
 * 
 * Utilities for testing alert-related operations:
 * - Budget alerts (warning/exceeded)
 * - Alert visibility across household members
 * - Alert purging
 */

import { getAnonClient, getServiceClient, getCurrentUserId } from '../setup';

// =============================================================================
// TYPES
// =============================================================================

export interface TestAlert {
  id: string;
  household_id: string;
  category_id: string;
  type: 'warning' | 'exceeded';
  percentage: number;
  year: number;
  month: number;
  created_at: string;
}

export interface TestAlertView {
  id: string;
  alert_id: string;
  user_id: string;
  viewed_at: string;
}

// =============================================================================
// ALERT OPERATIONS
// =============================================================================

/**
 * Get all alerts for the current user's household.
 */
export async function getHouseholdAlerts(): Promise<TestAlert[]> {
  const client = getAnonClient();

  const { data: membership } = await client
    .from('household_members')
    .select('household_id')
    .single();

  if (!membership) return [];

  const { data, error } = await client
    .from('budget_alerts')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get alerts: ${error.message}`);
  }

  return data || [];
}

/**
 * Get unviewed alerts for the current user.
 * These are alerts that exist but the user hasn't dismissed.
 */
export async function getUnviewedAlerts(): Promise<TestAlert[]> {
  const client = getAnonClient();
  const userId = await getCurrentUserId();

  const { data: membership } = await client
    .from('household_members')
    .select('household_id')
    .single();

  if (!membership) return [];

  // Get all household alerts
  const { data: alerts, error: alertError } = await client
    .from('budget_alerts')
    .select('*')
    .eq('household_id', membership.household_id);

  if (alertError) {
    throw new Error(`Failed to get alerts: ${alertError.message}`);
  }

  if (!alerts || alerts.length === 0) return [];

  // Get user's viewed alerts
  const { data: views, error: viewError } = await client
    .from('user_alert_views')
    .select('alert_id')
    .eq('user_id', userId);

  if (viewError) {
    throw new Error(`Failed to get alert views: ${viewError.message}`);
  }

  const viewedAlertIds = new Set((views || []).map(v => v.alert_id));

  // Return alerts not yet viewed by this user
  return alerts.filter(alert => !viewedAlertIds.has(alert.id));
}

/**
 * Get the alert badge count (unviewed alerts) for the current user.
 */
export async function getAlertBadgeCount(): Promise<number> {
  const unviewedAlerts = await getUnviewedAlerts();
  return unviewedAlerts.length;
}

/**
 * Get alerts for a specific category.
 */
export async function getCategoryAlerts(categoryId: string): Promise<TestAlert[]> {
  const client = getAnonClient();

  const { data, error } = await client
    .from('budget_alerts')
    .select('*')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get category alerts: ${error.message}`);
  }

  return data || [];
}

/**
 * Verify an alert exists for a category with expected type.
 */
export async function verifyAlertExists(
  categoryId: string,
  expectedType: 'warning' | 'exceeded',
  year?: number,
  month?: number
): Promise<TestAlert> {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  const client = getServiceClient();

  const { data, error } = await client
    .from('budget_alerts')
    .select('*')
    .eq('category_id', categoryId)
    .eq('type', expectedType)
    .eq('year', targetYear)
    .eq('month', targetMonth)
    .single();

  if (error || !data) {
    throw new Error(
      `Expected ${expectedType} alert for category ${categoryId} ` +
      `in ${targetYear}-${targetMonth} not found`
    );
  }

  return data;
}

/**
 * Purge (mark as viewed) all alerts for the current user.
 */
export async function purgeAllAlerts(): Promise<number> {
  const client = getAnonClient();
  const userId = await getCurrentUserId();
  
  const unviewedAlerts = await getUnviewedAlerts();
  
  if (unviewedAlerts.length === 0) {
    console.log('✓ No alerts to purge');
    return 0;
  }

  const viewRecords = unviewedAlerts.map(alert => ({
    alert_id: alert.id,
    user_id: userId,
  }));

  const { error } = await client
    .from('user_alert_views')
    .insert(viewRecords);

  if (error) {
    throw new Error(`Failed to purge alerts: ${error.message}`);
  }

  console.log(`✓ Purged ${unviewedAlerts.length} alerts`);
  return unviewedAlerts.length;
}

/**
 * Verify alerts are cleared (badge count is 0) for current user.
 */
export async function verifyAlertsCleared(): Promise<void> {
  const count = await getAlertBadgeCount();
  if (count !== 0) {
    throw new Error(`Expected 0 unviewed alerts, but found ${count}`);
  }
}

/**
 * Verify a specific user still has unviewed alerts.
 * Uses service role to check another user's alert views.
 */
export async function verifyUserHasUnviewedAlerts(
  userId: string,
  expectedCount?: number
): Promise<number> {
  const client = getServiceClient();

  // Get user's household
  const { data: membership } = await client
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single();

  if (!membership) {
    throw new Error(`User ${userId} has no household`);
  }

  // Get household alerts
  const { data: alerts } = await client
    .from('budget_alerts')
    .select('id')
    .eq('household_id', membership.household_id);

  if (!alerts || alerts.length === 0) return 0;

  // Get user's viewed alerts
  const { data: views } = await client
    .from('user_alert_views')
    .select('alert_id')
    .eq('user_id', userId);

  const viewedAlertIds = new Set((views || []).map(v => v.alert_id));
  const unviewedCount = alerts.filter(a => !viewedAlertIds.has(a.id)).length;

  if (expectedCount !== undefined && unviewedCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} unviewed alerts for user ${userId}, ` +
      `but found ${unviewedCount}`
    );
  }

  return unviewedCount;
}

/**
 * Clean up test alerts (delete alerts and views).
 */
export async function cleanupTestAlerts(householdId: string): Promise<void> {
  const client = getServiceClient();

  // Get all alerts for this household
  const { data: alerts } = await client
    .from('budget_alerts')
    .select('id')
    .eq('household_id', householdId);

  if (alerts && alerts.length > 0) {
    const alertIds = alerts.map(a => a.id);

    // Delete alert views first
    await client
      .from('user_alert_views')
      .delete()
      .in('alert_id', alertIds);

    // Delete alerts
    await client
      .from('budget_alerts')
      .delete()
      .eq('household_id', householdId);
  }
}
