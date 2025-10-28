import type { 
  BudgetTemplate, 
  BudgetComparison, 
  BudgetAnalysis, 
  BudgetAlert
} from '../types/budget';
import type { Transaction, BudgetConfiguration } from '../types/index';
import { budgetTemplate } from '../config/budgetTemplate';
import { BudgetConfigService } from './budgetConfig';

/**
 * Budget Configuration Service
 * Handles budget template loading, calculations, and analysis
 */
export class BudgetService {
  private budgetTemplate: BudgetTemplate;

  constructor() {
    this.budgetTemplate = budgetTemplate;
  }

  /**
   * Load the budget template configuration
   */
  getBudgetTemplate(): BudgetTemplate {
    return this.budgetTemplate;
  }

  /**
   * Get current budget configuration (from JSON config or fallback to template)
   */
  getCurrentBudgetConfig(): BudgetConfiguration {
    return BudgetConfigService.loadConfig();
  }

  /**
   * Get budget limit for a specific category from current configuration
   */
  getCategoryBudget(category: string): number {
    const config = this.getCurrentBudgetConfig();
    return config.categories[category]?.monthlyLimit || 0;
  }

  /**
   * Get all category budgets from current configuration
   */
  getAllCategoryBudgets(): Record<string, number> {
    const config = this.getCurrentBudgetConfig();
    const budgets: Record<string, number> = {};
    
    for (const [category, categoryConfig] of Object.entries(config.categories)) {
      if (categoryConfig.isActive) {
        budgets[category] = categoryConfig.monthlyLimit;
      }
    }
    return budgets;
  }

  /**
   * Get warning threshold for a specific category
   */
  getCategoryWarningThreshold(category: string): number {
    const config = this.getCurrentBudgetConfig();
    return config.categories[category]?.warningThreshold || 80;
  }

  /**
   * Calculate budget variance for a category in a specific month
   */
  calculateBudgetVariance(
    category: string, 
    actualSpent: number
  ): BudgetComparison {
    const config = this.getCurrentBudgetConfig();
    return this.calculateBudgetVarianceWithConfig(category, actualSpent, config);
  }

  /**
   * Calculate budget variance for a category with provided config
   */
  calculateBudgetVarianceWithConfig(
    category: string, 
    actualSpent: number,
    config: BudgetConfiguration
  ): BudgetComparison {
    const categoryConfig = config.categories[category];
    const budgeted = categoryConfig?.monthlyLimit || 0;
    const warningThreshold = categoryConfig?.warningThreshold || 80;
    const variance = actualSpent - budgeted;
    const variancePercentage = budgeted > 0 ? (variance / budgeted) * 100 : 0;
    
    let status: 'under' | 'over' | 'onTarget' = 'onTarget';
    const warningAmount = budgeted * (warningThreshold / 100);
    
    if (actualSpent > budgeted) {
      status = 'over';
    } else if (actualSpent >= warningAmount) {
      status = 'onTarget';
    } else {
      status = 'under';
    }

    return {
      category,
      budgeted,
      actual: actualSpent,
      variance,
      variancePercentage,
      status,
      trend: 'stable' // Would need historical data to calculate actual trend
    };
  }

  /**
   * Analyze budget performance for a specific month
   */
  analyzeBudgetPerformance(
    transactions: Transaction[], 
    month: string, 
    year: number
  ): BudgetAnalysis {
    // Get current budget configuration
    const config = this.getCurrentBudgetConfig();
    return this.analyzeBudgetPerformanceWithConfig(transactions, month, year, config);
  }

  /**
   * Analyze budget performance for a specific month with provided config
   */
  analyzeBudgetPerformanceWithConfig(
    transactions: Transaction[], 
    month: string, 
    year: number,
    config: BudgetConfiguration
  ): BudgetAnalysis {
    // Filter transactions for the specific month/year
    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === new Date(`${month} 1, ${year}`).getMonth() && 
             date.getFullYear() === year &&
             t.type === 'expense';
    });

    // Calculate spending by category
    const categorySpending: Record<string, number> = {};
    monthTransactions.forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

    // Generate category comparisons (only for active categories)
    const categoryComparisons: BudgetComparison[] = [];
    for (const [category, categoryConfig] of Object.entries(config.categories)) {
      if (categoryConfig.isActive) {
        const spent = categorySpending[category] || 0;
        const comparison = this.calculateBudgetVarianceWithConfig(category, spent, config);
        categoryComparisons.push(comparison);
      }
    }

    // Calculate totals (only for active categories)
    const totalBudgeted = Object.entries(config.categories)
      .filter(([, categoryConfig]) => categoryConfig.isActive)
      .reduce((sum, [, categoryConfig]) => sum + categoryConfig.monthlyLimit, 0);
    
    // Calculate total spent (only for active categories)
    const totalSpent = Object.entries(categorySpending)
      .filter(([category]) => config.categories[category]?.isActive)
      .reduce((sum, [, amount]) => sum + amount, 0);
    
    const totalVariance = totalSpent - totalBudgeted;

    // Calculate income for the month
    const monthIncome = transactions
      .filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === new Date(`${month} 1, ${year}`).getMonth() && 
               date.getFullYear() === year &&
               t.type === 'income';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsRate = monthIncome > 0 ? ((monthIncome - totalSpent) / monthIncome) * 100 : 0;
    const incomeExpenseRatio = totalSpent > 0 ? monthIncome / totalSpent : 0;

    // Generate alerts
    const alerts = this.generateBudgetAlerts(categoryComparisons, month, year);

    return {
      month,
      year,
      totalBudgeted,
      totalSpent,
      totalVariance,
      categoryComparisons,
      savingsRate,
      incomeExpenseRatio,
      alerts
    };
  }

  /**
   * Generate budget alerts based on current spending
   */
  generateBudgetAlerts(
    comparisons: BudgetComparison[], 
    month: string, 
    year: number
  ): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];
    const config = this.getCurrentBudgetConfig();

    if (!config.globalSettings.warningNotifications) {
      return alerts;
    }

    comparisons.forEach(comparison => {
      const categoryConfig = config.categories[comparison.category];
      if (!categoryConfig || !categoryConfig.isActive) return;

      const spentPercentage = (comparison.actual / comparison.budgeted) * 100;
      const warningThreshold = categoryConfig.warningThreshold;

      // Budget exceeded alert
      if (comparison.status === 'over') {
        alerts.push({
          id: `exceeded-${comparison.category}-${month}-${year}`,
          type: 'budgetExceeded',
          severity: 'high',
          category: comparison.category,
          message: `Budget exceeded for ${comparison.category}. Spent ${comparison.actual.toFixed(2)} ${config.globalSettings.currency} of ${comparison.budgeted.toFixed(2)} ${config.globalSettings.currency} budget.`,
          amount: comparison.variance,
          percentage: comparison.variancePercentage,
          date: new Date().toISOString(),
          acknowledged: false
        });
      }

      // Approaching limit alert
      if (spentPercentage >= warningThreshold && 
          spentPercentage < 100) {
        alerts.push({
          id: `approaching-${comparison.category}-${month}-${year}`,
          type: 'approachingLimit',
          severity: 'medium',
          category: comparison.category,
          message: `Budget warning for ${comparison.category}. You've spent ${Math.round(spentPercentage)}% of your budget.`,
          amount: comparison.actual,
          percentage: spentPercentage,
          date: new Date().toISOString(),
          acknowledged: false
        });
      }
    });

    return alerts;
  }

  /**
   * Get family member budget information
   * Note: Family member budgets are not yet implemented in the JSON configuration
   */
  getFamilyMemberBudget(_memberName: string): { allowance: number; categories: string[] } | null {
    // Family member budgets feature not yet implemented in JSON configuration
    return null;
  }

  /**
   * Get income targets
   * Note: Income targets are not yet implemented in the JSON configuration
   */
  getIncomeTargets(): Record<string, number> {
    // Income targets feature not yet implemented in JSON configuration
    return {};
  }

  /**
   * Validate budget configuration
   */
  validateBudgetConfig(): { isValid: boolean; errors: string[] } {
    const config = BudgetConfigService.loadConfig();
    const errors: string[] = [];

    // Check warning thresholds
    for (const [category, categoryConfig] of Object.entries(config.categories)) {
      if (categoryConfig.warningThreshold < 0 || categoryConfig.warningThreshold > 100) {
        errors.push(`Invalid warning threshold for ${category}: ${categoryConfig.warningThreshold}% (must be 0-100)`);
      }
      
      if (categoryConfig.monthlyLimit <= 0) {
        errors.push(`Invalid monthly limit for ${category}: ${categoryConfig.monthlyLimit} (must be greater than 0)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Update budget configuration
   */
  updateBudgetConfig(updates: Partial<BudgetConfiguration>): void {
    const config = BudgetConfigService.loadConfig();
    const updatedConfig = { ...config, ...updates };
    BudgetConfigService.saveConfig(updatedConfig);
  }

  /**
   * Get budget status summary for dashboard
   */
  getBudgetStatusSummary(transactions: Transaction[]): {
    totalBudgeted: number;
    totalSpent: number;
    categoriesOverBudget: number;
    alertsCount: number;
  } {
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const currentYear = currentDate.getFullYear();

    const analysis = this.analyzeBudgetPerformance(transactions, currentMonth, currentYear);

    return {
      totalBudgeted: analysis.totalBudgeted,
      totalSpent: analysis.totalSpent,
      categoriesOverBudget: analysis.categoryComparisons.filter(c => c.status === 'over').length,
      alertsCount: analysis.alerts.length
    };
  }
}

// Export singleton instance
export const budgetService = new BudgetService();
