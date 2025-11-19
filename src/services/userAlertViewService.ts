import { supabase } from '../lib/supabase';

export interface UserAlertView {
  id: string;
  user_id: string;
  alert_id: string;
  viewed_at: string;
  household_id: string;
}

class UserAlertViewService {
  /**
   * Get all alert IDs that the current user has viewed
   */
  async getViewedAlertIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('user_alert_views')
      .select('alert_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching viewed alerts:', error);
      return new Set();
    }

    return new Set(data?.map((row: { alert_id: string }) => row.alert_id) || []);
  }

  /**
   * Mark an alert as viewed by the current user
   */
  async markAlertAsViewed(
    userId: string,
    alertId: string,
    householdId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('user_alert_views')
      .insert({
        user_id: userId,
        alert_id: alertId,
        household_id: householdId
      });

    if (error) {
      // Ignore duplicate key errors (alert already viewed)
      if (error.code === '23505') {
        return true;
      }
      console.error('Error marking alert as viewed:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark multiple alerts as viewed (batch operation)
   */
  async markAlertsAsViewed(
    userId: string,
    alertIds: string[],
    householdId: string
  ): Promise<boolean> {
    if (alertIds.length === 0) return true;

    const records = alertIds.map(alertId => ({
      user_id: userId,
      alert_id: alertId,
      household_id: householdId
    }));

    const { error } = await supabase
      .from('user_alert_views')
      .insert(records);

    if (error) {
      // Ignore duplicate key errors
      if (error.code === '23505') {
        return true;
      }
      console.error('Error marking alerts as viewed:', error);
      return false;
    }

    return true;
  }

  /**
   * Clear all viewed alerts for the current user
   * (Useful for testing or "reset notifications" feature)
   */
  async clearAllViewedAlerts(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_alert_views')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing viewed alerts:', error);
      return false;
    }

    return true;
  }

  /**
   * Clear viewed alerts for specific alert IDs
   */
  async clearSpecificAlerts(
    userId: string,
    alertIds: string[]
  ): Promise<boolean> {
    if (alertIds.length === 0) return true;

    const { error } = await supabase
      .from('user_alert_views')
      .delete()
      .eq('user_id', userId)
      .in('alert_id', alertIds);

    if (error) {
      console.error('Error clearing specific alerts:', error);
      return false;
    }

    return true;
  }

  /**
   * Get count of unviewed alerts from a list of current alerts
   */
  async getUnviewedAlertCount(
    userId: string,
    currentAlertIds: string[]
  ): Promise<number> {
    if (currentAlertIds.length === 0) return 0;

    const viewedIds = await this.getViewedAlertIds(userId);
    return currentAlertIds.filter(id => !viewedIds.has(id)).length;
  }
}

export const userAlertViewService = new UserAlertViewService();
