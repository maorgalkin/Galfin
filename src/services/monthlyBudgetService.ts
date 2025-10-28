import { supabase } from '../lib/supabase';
import { PersonalBudgetService } from './personalBudgetService';
import type {
  MonthlyBudget,
  PersonalBudget,
  BudgetComparisonResult,
  BudgetComparisonSummary
} from '../types/budget';

/**
 * Monthly Budget Service
 * Manages budgets for specific months
 * Auto-creates from personal budget, tracks adjustments
 */
export class MonthlyBudgetService {
  /**
   * Get or create monthly budget for a specific month
   * If doesn't exist, creates from active personal budget
   */
  static async getOrCreateMonthlyBudget(
    year: number,
    month: number
  ): Promise<MonthlyBudget> {
    try {
      // Try to get existing monthly budget
      const existing = await this.getMonthlyBudget(year, month);
      if (existing) {
        return existing;
      }

      // Create new monthly budget from personal budget
      return await this.createMonthlyBudget(year, month);
    } catch (error) {
      console.error('Error getting or creating monthly budget:', error);
      throw error;
    }
  }

  /**
   * Sync monthly budget with personal budget
   * Returns a synced copy without modifying the database
   */
  private static async syncWithPersonalBudget(
    monthlyBudget: MonthlyBudget
  ): Promise<MonthlyBudget> {
    const personalBudget = await PersonalBudgetService.getActiveBudget();
    if (!personalBudget) {
      return monthlyBudget;
    }

    // Start with monthly budget categories
    const syncedCategories = { ...monthlyBudget.categories };
    
    // Sync all categories from personal budget
    for (const [categoryName, personalConfig] of Object.entries(personalBudget.categories)) {
      if (syncedCategories[categoryName]) {
        // Category exists in both - sync properties from personal budget
        // Keep monthlyLimit from monthly budget (may have been adjusted)
        syncedCategories[categoryName] = {
          ...syncedCategories[categoryName],
          isActive: personalConfig.isActive,
          color: personalConfig.color,
          description: personalConfig.description,
          warningThreshold: personalConfig.warningThreshold,
        };
      } else {
        // Category added to personal budget but not in monthly yet - add it
        syncedCategories[categoryName] = { ...personalConfig };
      }
    }
    
    // Deactivate categories that were deleted from personal budget
    for (const categoryName of Object.keys(syncedCategories)) {
      if (!personalBudget.categories[categoryName]) {
        syncedCategories[categoryName] = {
          ...syncedCategories[categoryName],
          isActive: false
        };
      }
    }

    return {
      ...monthlyBudget,
      categories: syncedCategories,
      global_settings: personalBudget.global_settings // Sync global settings
    };
  }

  /**
   * Get monthly budget for a specific month
   * Returns null if doesn't exist
   * Syncs with personal budget for category metadata
   */
  static async getMonthlyBudget(
    year: number,
    month: number
  ): Promise<MonthlyBudget | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Sync with personal budget
      return await this.syncWithPersonalBudget(data);
    } catch (error) {
      console.error('Error fetching monthly budget:', error);
      throw error;
    }
  }

  /**
   * Get current month's budget
   * Syncs with personal budget to ensure all categories and isActive status are current
   */
  static async getCurrentMonthBudget(): Promise<MonthlyBudget> {
    const now = new Date();
    const monthlyBudget = await this.getOrCreateMonthlyBudget(
      now.getFullYear(),
      now.getMonth() + 1
    );

    // Sync with personal budget
    return await this.syncWithPersonalBudget(monthlyBudget);
  }

  /**
   * Get monthly budgets for a specific year
   */
  static async getYearBudgets(year: number): Promise<MonthlyBudget[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', year)
        .order('month', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching year budgets:', error);
      throw error;
    }
  }

  /**
   * Get all monthly budgets ordered by date descending
   */
  static async getAllMonthlyBudgets(limit: number = 12): Promise<MonthlyBudget[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching all monthly budgets:', error);
      throw error;
    }
  }

  /**
   * Create monthly budget from active personal budget
   */
  static async createMonthlyBudget(
    year: number,
    month: number,
    notes?: string
  ): Promise<MonthlyBudget> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get active personal budget
      const personalBudget = await PersonalBudgetService.getActiveBudget();
      
      if (!personalBudget) {
        throw new Error('No active personal budget found. Please create one first.');
      }

      const newMonthlyBudget: Omit<MonthlyBudget, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        personal_budget_id: personalBudget.id,
        year,
        month,
        categories: personalBudget.categories,
        global_settings: personalBudget.global_settings,
        adjustment_count: 0,
        is_locked: false,
        notes
      };

      const { data, error } = await supabase
        .from('monthly_budgets')
        .insert([newMonthlyBudget])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating monthly budget:', error);
      throw error;
    }
  }

  /**
   * Update a specific category in monthly budget
   * Increments adjustment_count
   */
  static async updateCategoryLimit(
    monthlyBudgetId: string,
    categoryName: string,
    newLimit: number,
    notes?: string
  ): Promise<MonthlyBudget> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current monthly budget
      const { data: currentBudget, error: fetchError } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('id', monthlyBudgetId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentBudget) throw new Error('Monthly budget not found');

      if (currentBudget.is_locked) {
        throw new Error('Cannot modify locked monthly budget');
      }

      // Validate category exists
      if (!currentBudget.categories[categoryName]) {
        throw new Error(`Category "${categoryName}" not found`);
      }

      // Update the category limit
      const updatedCategories = {
        ...currentBudget.categories,
        [categoryName]: {
          ...currentBudget.categories[categoryName],
          monthlyLimit: newLimit
        }
      };

      const { data, error } = await supabase
        .from('monthly_budgets')
        .update({
          categories: updatedCategories,
          adjustment_count: currentBudget.adjustment_count + 1,
          notes: notes || currentBudget.notes
        })
        .eq('id', monthlyBudgetId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating category limit:', error);
      throw error;
    }
  }

  /**
   * Lock a monthly budget (prevent further modifications)
   * Typically done for past months
   */
  static async lockMonthlyBudget(
    year: number,
    month: number
  ): Promise<MonthlyBudget> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('monthly_budgets')
        .update({ is_locked: true })
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error locking monthly budget:', error);
      throw error;
    }
  }

  /**
   * Unlock a monthly budget
   */
  static async unlockMonthlyBudget(
    year: number,
    month: number
  ): Promise<MonthlyBudget> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('monthly_budgets')
        .update({ is_locked: false })
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error unlocking monthly budget:', error);
      throw error;
    }
  }

  /**
   * Compare monthly budget to personal budget
   * Returns detailed comparison for each category
   */
  static async compareToPersonalBudget(
    year: number,
    month: number
  ): Promise<BudgetComparisonSummary> {
    try {
      const monthlyBudget = await this.getMonthlyBudget(year, month);
      
      if (!monthlyBudget) {
        throw new Error('Monthly budget not found');
      }

      let personalBudget: PersonalBudget | null = null;
      
      if (monthlyBudget.personal_budget_id) {
        personalBudget = await PersonalBudgetService.getBudgetById(
          monthlyBudget.personal_budget_id
        );
      }

      if (!personalBudget) {
        personalBudget = await PersonalBudgetService.getActiveBudget();
      }

      if (!personalBudget) {
        throw new Error('No personal budget found for comparison');
      }

      const comparisons: BudgetComparisonResult[] = [];
      let totalPersonal = 0;
      let totalMonthly = 0;
      let adjustedCount = 0;
      let addedCount = 0;
      let removedCount = 0;
      let activeCount = 0;

      // Calculate total personal budget (all active categories in personal budget)
      for (const [, categoryConfig] of Object.entries(personalBudget.categories)) {
        if (categoryConfig.isActive) {
          totalPersonal += categoryConfig.monthlyLimit;
        }
      }

      // Get all categories from both budgets
      const allCategories = new Set([
        ...Object.keys(monthlyBudget.categories),
        ...Object.keys(personalBudget.categories)
      ]);

      // Compare each category
      for (const categoryName of allCategories) {
        const monthlyConfig = monthlyBudget.categories[categoryName];
        const personalConfig = personalBudget.categories[categoryName];
        
        // Determine category status
        let status: 'increased' | 'decreased' | 'unchanged' | 'added' | 'removed';
        let personalLimit: number | null = personalConfig?.monthlyLimit ?? null;
        let monthlyLimit: number = monthlyConfig?.monthlyLimit ?? 0;
        let isActive = monthlyConfig?.isActive ?? false;
        
        if (!personalConfig && monthlyConfig) {
          // Category added in monthly budget
          status = 'added';
          addedCount++;
          if (isActive) {
            activeCount++;
            totalMonthly += monthlyLimit;
          }
        } else if (personalConfig && !monthlyConfig?.isActive) {
          // Category exists in personal but deactivated in monthly budget
          status = 'removed';
          removedCount++;
          continue; // Don't add to comparisons, skip deactivated categories
        } else if (personalConfig && monthlyConfig && monthlyConfig.isActive) {
          // Category exists in both and is active in monthly
          isActive = true;
          activeCount++;
          const difference = monthlyLimit - personalLimit!;
          
          if (difference > 0) {
            status = 'increased';
            adjustedCount++;
          } else if (difference < 0) {
            status = 'decreased';
            adjustedCount++;
          } else {
            status = 'unchanged';
          }
          
          // Don't add to totalPersonal here - already calculated above
          totalMonthly += monthlyLimit;
        } else {
          continue; // Skip inactive or undefined categories
        }

        const difference = personalLimit !== null ? monthlyLimit - personalLimit : monthlyLimit;
        const differencePercentage = personalLimit && personalLimit > 0
          ? (difference / personalLimit) * 100 
          : 0;

        comparisons.push({
          category: categoryName,
          personalLimit,
          monthlyLimit,
          difference,
          differencePercentage,
          status,
          isActive
        });
      }

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];

      return {
        personalBudgetName: personalBudget.name,
        monthlyBudgetDate: `${monthNames[month - 1]} ${year}`,
        currency: personalBudget.global_settings.currency,
        totalCategories: allCategories.size,
        activeCategories: activeCount,
        adjustedCategories: adjustedCount,
        addedCategories: addedCount,
        removedCategories: removedCount,
        comparisons,
        totalPersonalLimit: totalPersonal,
        totalMonthlyLimit: totalMonthly,
        totalDifference: totalMonthly - totalPersonal
      };
    } catch (error) {
      console.error('Error comparing to personal budget:', error);
      throw error;
    }
  }

  /**
   * Get total monthly limit across all active categories
   */
  static getTotalMonthlyLimit(budget: MonthlyBudget): number {
    return Object.values(budget.categories)
      .filter(cat => cat.isActive)
      .reduce((sum, cat) => sum + cat.monthlyLimit, 0);
  }

  /**
   * Check if monthly budget has been adjusted from personal
   */
  static hasAdjustments(budget: MonthlyBudget): boolean {
    return budget.adjustment_count > 0;
  }

  /**
   * Get month name from number
   */
  static getMonthName(month: number): string {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month - 1] || 'Unknown';
  }

  /**
   * Format month/year for display
   */
  static formatMonthYear(year: number, month: number): string {
    return `${this.getMonthName(month)} ${year}`;
  }
}

// Export singleton instance
export const monthlyBudgetService = MonthlyBudgetService;
