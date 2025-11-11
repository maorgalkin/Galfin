import { supabase } from '../lib/supabase';
import type {
  PersonalBudget,
  CategoryConfig,
  GlobalBudgetSettings
} from '../types/budget';
import type { BudgetConfiguration } from '../types';

// Helper to get current user's household ID
const getHouseholdId = async (): Promise<string> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    throw new Error('User is not part of a household');
  }

  return data.household_id;
};

/**
 * Personal Budget Service
 * Manages user's baseline/ideal budget configuration
 * Serves as the reference point for all monthly budgets
 */
export class PersonalBudgetService {
  /**
   * Get the active personal budget for the current user
   */
  static async getActiveBudget(): Promise<PersonalBudget | null> {
    try {
      const householdId = await getHouseholdId();

      const { data, error } = await supabase
        .from('personal_budgets')
        .select('*')
        .eq('household_id', householdId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No active budget found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching active personal budget:', error);
      throw error;
    }
  }

  /**
   * Get all personal budget versions for the current user
   * Returns budgets ordered by version descending
   */
  static async getBudgetHistory(): Promise<PersonalBudget[]> {
    try {
      const householdId = await getHouseholdId();

      const { data, error } = await supabase
        .from('personal_budgets')
        .select('*')
        .eq('household_id', householdId)
        .order('version', { ascending: false});

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching personal budget history:', error);
      throw error;
    }
  }

  /**
   * Get a specific personal budget by ID
   */
  static async getBudgetById(budgetId: string): Promise<PersonalBudget | null> {
    try {
      const householdId = await getHouseholdId();

      const { data, error } = await supabase
        .from('personal_budgets')
        .select('*')
        .eq('id', budgetId)
        .eq('household_id', householdId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching personal budget by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new personal budget
   * This is typically done during onboarding or when creating a new baseline
   */
  static async createBudget(
    budget: Omit<PersonalBudget, 'id' | 'user_id' | 'version' | 'created_at' | 'updated_at' | 'is_active' | 'household_id'>
  ): Promise<PersonalBudget> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const householdId = await getHouseholdId();

      // Deactivate any existing active budget
      await this.deactivateAllBudgets();

      // Get next version number
      const nextVersion = await this.getNextVersion();

      const newBudget: Omit<PersonalBudget, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        household_id: householdId,
        version: nextVersion,
        name: budget.name,
        categories: budget.categories,
        global_settings: budget.global_settings,
        is_active: true,
        notes: budget.notes
      };

      const { data, error } = await supabase
        .from('personal_budgets')
        .insert([newBudget])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating personal budget:', error);
      throw error;
    }
  }

  /**
   * Update the active personal budget (creates a new version)
   * This is called when scheduled adjustments are applied
   */
  static async updateBudget(
    budgetId: string,
    updates: Partial<PersonalBudget>
  ): Promise<PersonalBudget> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const householdId = await getHouseholdId();

      // Get the existing budget
      const existingBudget = await this.getBudgetById(budgetId);
      
      if (!existingBudget) {
        throw new Error('Budget not found');
      }

      // Deactivate all budgets
      await this.deactivateAllBudgets();

      // Get next version number
      const nextVersion = await this.getNextVersion();

      // Create new version with updates
      const newBudget: Omit<PersonalBudget, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        household_id: householdId,
        version: nextVersion,
        name: updates.name ?? existingBudget.name,
        categories: updates.categories ?? existingBudget.categories,
        global_settings: updates.global_settings ?? existingBudget.global_settings,
        is_active: true,
        notes: updates.notes ?? existingBudget.notes
      };

      const { data, error } = await supabase
        .from('personal_budgets')
        .insert([newBudget])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating personal budget:', error);
      throw error;
    }
  }

  /**
   * Update budget metadata (name, notes) without creating new version
   */
  static async updateBudgetMetadata(
    budgetId: string,
    updates: {
      name?: string;
      notes?: string;
    }
  ): Promise<PersonalBudget> {
    try {
      const householdId = await getHouseholdId();

      const { data, error } = await supabase
        .from('personal_budgets')
        .update(updates)
        .eq('id', budgetId)
        .eq('household_id', householdId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating budget metadata:', error);
      throw error;
    }
  }

  /**
   * Set a specific budget version as active
   * Deactivates all other budgets
   */
  static async setActiveBudget(budgetId: string): Promise<PersonalBudget> {
    try {
      const householdId = await getHouseholdId();

      // Deactivate all budgets
      await this.deactivateAllBudgets();

      // Activate the specified budget
      const { data, error } = await supabase
        .from('personal_budgets')
        .update({ is_active: true })
        .eq('id', budgetId)
        .eq('household_id', householdId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error setting active budget:', error);
      throw error;
    }
  }

  /**
   * Delete a personal budget
   * Cannot delete if it's the only budget or if it's referenced by monthly budgets
   */
  static async deleteBudget(budgetId: string): Promise<void> {
    try {
      const householdId = await getHouseholdId();

      // Check if this is the only budget
      const allBudgets = await this.getBudgetHistory();
      if (allBudgets.length <= 1) {
        throw new Error('Cannot delete the only personal budget');
      }

      // Check if this budget is active
      const budget = await this.getBudgetById(budgetId);
      if (budget?.is_active) {
        // Find another budget to activate
        const otherBudget = allBudgets.find(b => b.id !== budgetId);
        if (otherBudget) {
          await this.setActiveBudget(otherBudget.id);
        }
      }

      const { error } = await supabase
        .from('personal_budgets')
        .delete()
        .eq('id', budgetId)
        .eq('household_id', householdId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting personal budget:', error);
      throw error;
    }
  }

  /**
   * Convert legacy budget configuration to personal budget
   * Used for migration from old budget_configs table
   */
  static async migrateFromLegacyConfig(
    legacyConfig: BudgetConfiguration
  ): Promise<PersonalBudget> {
    try {
      // Check if personal budget already exists
      const existing = await this.getActiveBudget();
      if (existing) {
        console.log('Personal budget already exists, skipping migration');
        return existing;
      }

      return await this.createBudget({
        name: 'Personal Budget',
        categories: legacyConfig.categories as Record<string, CategoryConfig>,
        global_settings: legacyConfig.globalSettings as GlobalBudgetSettings,
        notes: 'Migrated from legacy configuration'
      });
    } catch (error) {
      console.error('Error migrating from legacy config:', error);
      throw error;
    }
  }

  /**
   * Get the next version number for a new budget
   */
  private static async getNextVersion(): Promise<number> {
    try {
      const householdId = await getHouseholdId();

      const { data, error } = await supabase
        .from('personal_budgets')
        .select('version')
        .eq('household_id', householdId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No budgets exist, start with version 1
          return 1;
        }
        throw error;
      }

      return (data?.version || 0) + 1;
    } catch (error) {
      console.error('Error getting next version:', error);
      return 1; // Default to version 1 if error
    }
  }

  /**
   * Deactivate all personal budgets for the current user
   */
  private static async deactivateAllBudgets(): Promise<void> {
    try {
      const householdId = await getHouseholdId();

      const { error } = await supabase
        .from('personal_budgets')
        .update({ is_active: false })
        .eq('household_id', householdId)
        .eq('is_active', true);

      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating budgets:', error);
      throw error;
    }
  }

  /**
   * Get total monthly limit across all categories
   */
  static getTotalMonthlyLimit(budget: PersonalBudget): number {
    return Object.values(budget.categories)
      .filter(cat => cat.isActive)
      .reduce((sum, cat) => sum + cat.monthlyLimit, 0);
  }

  /**
   * Get count of active categories
   */
  static getActiveCategoryCount(budget: PersonalBudget): number {
    return Object.values(budget.categories).filter(cat => cat.isActive).length;
  }
}

// Export singleton instance
export const personalBudgetService = PersonalBudgetService;
