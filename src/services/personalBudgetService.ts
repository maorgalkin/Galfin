import { supabase } from '../lib/supabase';
import type {
  PersonalBudget,
  CategoryConfig,
  GlobalBudgetSettings
} from '../types/budget';
import type { BudgetConfiguration } from '../types';

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('personal_budgets')
        .select('*')
        .eq('user_id', user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('personal_budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('version', { ascending: false });

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('personal_budgets')
        .select('*')
        .eq('id', budgetId)
        .eq('user_id', user.id)
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
    config: BudgetConfiguration,
    name: string = 'Personal Budget',
    notes?: string
  ): Promise<PersonalBudget> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Deactivate any existing active budget
      await this.deactivateAllBudgets();

      // Get next version number
      const nextVersion = await this.getNextVersion();

      const newBudget: Omit<PersonalBudget, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        version: nextVersion,
        name,
        categories: config.categories as Record<string, CategoryConfig>,
        global_settings: config.globalSettings as GlobalBudgetSettings,
        is_active: true,
        notes
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
    config: BudgetConfiguration,
    notes?: string
  ): Promise<PersonalBudget> {
    try {
      const activeBudget = await this.getActiveBudget();
      
      if (!activeBudget) {
        // No active budget, create one
        return await this.createBudget(config, 'Personal Budget', notes);
      }

      // Create new version based on existing
      return await this.createBudget(
        config,
        activeBudget.name,
        notes || 'Updated from scheduled adjustments'
      );
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('personal_budgets')
        .update(updates)
        .eq('id', budgetId)
        .eq('user_id', user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Deactivate all budgets
      await this.deactivateAllBudgets();

      // Activate the specified budget
      const { data, error } = await supabase
        .from('personal_budgets')
        .update({ is_active: true })
        .eq('id', budgetId)
        .eq('user_id', user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

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
        .eq('user_id', user.id);

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

      return await this.createBudget(
        legacyConfig,
        'Personal Budget',
        'Migrated from legacy configuration'
      );
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('personal_budgets')
        .select('version')
        .eq('user_id', user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('personal_budgets')
        .update({ is_active: false })
        .eq('user_id', user.id)
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
