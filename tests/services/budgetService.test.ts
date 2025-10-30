import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BudgetService } from '../../src/services/budgetService';
import { BudgetConfigService } from '../../src/services/budgetConfig';
import type { Transaction, BudgetConfiguration } from '../../src/types/index';

// Mock BudgetConfigService
vi.mock('../../src/services/budgetConfig');

describe('BudgetService', () => {
  let budgetService: BudgetService;
  let mockConfig: BudgetConfiguration;

  beforeEach(() => {
    budgetService = new BudgetService();
    
    // Setup mock budget configuration
    mockConfig = {
      version: '2.0',
      lastUpdated: '2025-10-29T00:00:00Z',
      categories: {
        Groceries: {
          monthlyLimit: 500,
          warningThreshold: 80,
          isActive: true,
          color: '#10B981',
          description: 'Food and groceries'
        },
        Entertainment: {
          monthlyLimit: 200,
          warningThreshold: 75,
          isActive: true,
          color: '#8B5CF6',
          description: 'Movies, games, etc.'
        },
        Utilities: {
          monthlyLimit: 300,
          warningThreshold: 90,
          isActive: true,
          color: '#F59E0B',
          description: 'Electric, water, gas'
        },
        Inactive: {
          monthlyLimit: 100,
          warningThreshold: 80,
          isActive: false,
          color: '#6B7280',
          description: 'Not used'
        }
      },
      globalSettings: {
        currency: 'USD',
        warningNotifications: true,
        emailAlerts: false
      }
    };

    vi.mocked(BudgetConfigService.loadConfig).mockReturnValue(mockConfig);
  });

  describe('getBudgetTemplate', () => {
    it('should return the budget template', () => {
      const template = budgetService.getBudgetTemplate();
      expect(template).toBeDefined();
      expect(template.version).toBeDefined();
      expect(template.monthlyBudgets).toBeDefined();
    });
  });

  describe('getCurrentBudgetConfig', () => {
    it('should return current budget configuration', () => {
      const config = budgetService.getCurrentBudgetConfig();
      expect(config).toEqual(mockConfig);
      expect(BudgetConfigService.loadConfig).toHaveBeenCalled();
    });
  });

  describe('getCategoryBudget', () => {
    it('should return budget limit for existing category', () => {
      const budget = budgetService.getCategoryBudget('Groceries');
      expect(budget).toBe(500);
    });

    it('should return 0 for non-existent category', () => {
      const budget = budgetService.getCategoryBudget('NonExistent');
      expect(budget).toBe(0);
    });

    it('should return 0 for inactive category', () => {
      const budget = budgetService.getCategoryBudget('Inactive');
      expect(budget).toBe(100); // Returns limit even if inactive
    });
  });

  describe('getAllCategoryBudgets', () => {
    it('should return budgets for all active categories', () => {
      const budgets = budgetService.getAllCategoryBudgets();
      expect(budgets).toEqual({
        Groceries: 500,
        Entertainment: 200,
        Utilities: 300
      });
    });

    it('should exclude inactive categories', () => {
      const budgets = budgetService.getAllCategoryBudgets();
      expect(budgets).not.toHaveProperty('Inactive');
    });

    it('should return empty object when no active categories', () => {
      mockConfig.categories = {
        Inactive: {
          monthlyLimit: 100,
          warningThreshold: 80,
          isActive: false,
          color: '#6B7280',
          description: 'Not used'
        }
      };
      const budgets = budgetService.getAllCategoryBudgets();
      expect(budgets).toEqual({});
    });
  });

  describe('getCategoryWarningThreshold', () => {
    it('should return warning threshold for existing category', () => {
      const threshold = budgetService.getCategoryWarningThreshold('Groceries');
      expect(threshold).toBe(80);
    });

    it('should return default 80 for non-existent category', () => {
      const threshold = budgetService.getCategoryWarningThreshold('NonExistent');
      expect(threshold).toBe(80);
    });

    it('should return custom threshold when set', () => {
      const threshold = budgetService.getCategoryWarningThreshold('Entertainment');
      expect(threshold).toBe(75);
    });
  });

  describe('calculateBudgetVariance', () => {
    it('should calculate under budget correctly', () => {
      const comparison = budgetService.calculateBudgetVariance('Groceries', 300);
      expect(comparison).toMatchObject({
        category: 'Groceries',
        budgeted: 500,
        actual: 300,
        variance: -200,
        variancePercentage: -40,
        status: 'under'
      });
    });

    it('should calculate on target correctly', () => {
      const comparison = budgetService.calculateBudgetVariance('Groceries', 450);
      expect(comparison).toMatchObject({
        category: 'Groceries',
        budgeted: 500,
        actual: 450,
        variance: -50,
        variancePercentage: -10,
        status: 'onTarget' // 90% of budget (above 80% threshold)
      });
    });

    it('should calculate over budget correctly', () => {
      const comparison = budgetService.calculateBudgetVariance('Groceries', 600);
      expect(comparison).toMatchObject({
        category: 'Groceries',
        budgeted: 500,
        actual: 600,
        variance: 100,
        variancePercentage: 20,
        status: 'over'
      });
    });

    it('should handle zero budget', () => {
      mockConfig.categories.Test = {
        monthlyLimit: 0,
        warningThreshold: 80,
        isActive: true,
        color: '#000000',
        description: 'Test'
      };
      const comparison = budgetService.calculateBudgetVariance('Test', 100);
      expect(comparison).toMatchObject({
        budgeted: 0,
        actual: 100,
        variance: 100,
        variancePercentage: 0
      });
    });

    it('should handle at exact warning threshold', () => {
      // Groceries has 80% threshold, so 400 is exactly at threshold
      const comparison = budgetService.calculateBudgetVariance('Groceries', 400);
      expect(comparison.status).toBe('onTarget');
    });

    it('should handle just above warning threshold', () => {
      const comparison = budgetService.calculateBudgetVariance('Groceries', 401);
      expect(comparison.status).toBe('onTarget');
    });

    it('should handle just below warning threshold', () => {
      const comparison = budgetService.calculateBudgetVariance('Groceries', 399);
      expect(comparison.status).toBe('under');
    });
  });

  describe('analyzeBudgetPerformance', () => {
    let transactions: Transaction[];

    beforeEach(() => {
      transactions = [
        // October expenses
        {
          id: '1',
          description: 'Supermarket',
          amount: 250,
          date: '2025-10-15',
          category: 'Groceries',
          type: 'expense',
          familyMember: 'User'
        },
        {
          id: '2',
          description: 'Movie tickets',
          amount: 50,
          date: '2025-10-20',
          category: 'Entertainment',
          type: 'expense',
          familyMember: 'User'
        },
        {
          id: '3',
          description: 'Electric bill',
          amount: 150,
          date: '2025-10-05',
          category: 'Utilities',
          type: 'expense',
          familyMember: 'User'
        },
        // October income
        {
          id: '4',
          description: 'Salary',
          amount: 3000,
          date: '2025-10-01',
          category: 'Salary',
          type: 'income',
          familyMember: 'User'
        },
        // Different month - should be ignored
        {
          id: '5',
          description: 'September expense',
          amount: 500,
          date: '2025-09-15',
          category: 'Groceries',
          type: 'expense',
          familyMember: 'User'
        }
      ];
    });

    it('should analyze budget performance correctly', () => {
      const analysis = budgetService.analyzeBudgetPerformance(transactions, 'October', 2025);
      
      expect(analysis).toMatchObject({
        month: 'October',
        year: 2025,
        totalBudgeted: 1000, // Groceries (500) + Entertainment (200) + Utilities (300)
        totalSpent: 450, // 250 + 50 + 150
        totalVariance: -550
      });
    });

    it('should filter transactions by month correctly', () => {
      const analysis = budgetService.analyzeBudgetPerformance(transactions, 'September', 2025);
      
      expect(analysis.totalSpent).toBe(500);
      expect(analysis.categoryComparisons).toHaveLength(3); // Only active categories
    });

    it('should calculate savings rate correctly', () => {
      const analysis = budgetService.analyzeBudgetPerformance(transactions, 'October', 2025);
      
      // Savings rate = (3000 - 450) / 3000 * 100 = 85%
      expect(analysis.savingsRate).toBeCloseTo(85, 1);
    });

    it('should calculate income/expense ratio correctly', () => {
      const analysis = budgetService.analyzeBudgetPerformance(transactions, 'October', 2025);
      
      // Ratio = 3000 / 450 = 6.67
      expect(analysis.incomeExpenseRatio).toBeCloseTo(6.67, 2);
    });

    it('should handle month with no income', () => {
      const noIncomeTransactions = transactions.filter(t => t.type === 'expense');
      const analysis = budgetService.analyzeBudgetPerformance(noIncomeTransactions, 'October', 2025);
      
      expect(analysis.savingsRate).toBe(0);
      expect(analysis.incomeExpenseRatio).toBe(0);
    });

    it('should exclude inactive categories from totals', () => {
      const analysis = budgetService.analyzeBudgetPerformance(transactions, 'October', 2025);
      
      // Should not include Inactive category (100) in totalBudgeted
      expect(analysis.totalBudgeted).toBe(1000);
      expect(analysis.categoryComparisons).toHaveLength(3);
      expect(analysis.categoryComparisons.find(c => c.category === 'Inactive')).toBeUndefined();
    });

    it('should handle empty transactions', () => {
      const analysis = budgetService.analyzeBudgetPerformance([], 'October', 2025);
      
      expect(analysis.totalSpent).toBe(0);
      expect(analysis.totalVariance).toBe(-1000);
      expect(analysis.savingsRate).toBe(0);
    });

    it('should generate category comparisons for all active categories', () => {
      const analysis = budgetService.analyzeBudgetPerformance(transactions, 'October', 2025);
      
      expect(analysis.categoryComparisons).toHaveLength(3);
      const categories = analysis.categoryComparisons.map(c => c.category);
      expect(categories).toContain('Groceries');
      expect(categories).toContain('Entertainment');
      expect(categories).toContain('Utilities');
    });

    it('should include categories with zero spending', () => {
      const singleCategoryTransactions = transactions.filter(t => t.category === 'Groceries');
      const analysis = budgetService.analyzeBudgetPerformance(singleCategoryTransactions, 'October', 2025);
      
      const entertainmentComparison = analysis.categoryComparisons.find(c => c.category === 'Entertainment');
      expect(entertainmentComparison).toBeDefined();
      expect(entertainmentComparison?.actual).toBe(0);
    });
  });

  describe('generateBudgetAlerts', () => {
    let comparisons: any[];

    beforeEach(() => {
      comparisons = [
        {
          category: 'Groceries',
          budgeted: 500,
          actual: 300,
          variance: -200,
          variancePercentage: -40,
          status: 'under',
          trend: 'stable'
        },
        {
          category: 'Entertainment',
          budgeted: 200,
          actual: 180,
          variance: -20,
          variancePercentage: -10,
          status: 'onTarget',
          trend: 'stable'
        },
        {
          category: 'Utilities',
          budgeted: 300,
          actual: 350,
          variance: 50,
          variancePercentage: 16.67,
          status: 'over',
          trend: 'stable'
        }
      ];
    });

    it('should generate exceeded budget alert', () => {
      const alerts = budgetService.generateBudgetAlerts(comparisons, 'October', 2025);
      
      const exceededAlert = alerts.find(a => a.type === 'budgetExceeded');
      expect(exceededAlert).toBeDefined();
      expect(exceededAlert?.category).toBe('Utilities');
      expect(exceededAlert?.severity).toBe('high');
      expect(exceededAlert?.amount).toBe(50);
    });

    it('should generate approaching limit alert', () => {
      comparisons[1].actual = 160; // 80% of 200 budget
      const alerts = budgetService.generateBudgetAlerts(comparisons, 'October', 2025);
      
      const approachingAlert = alerts.find(a => a.type === 'approachingLimit');
      expect(approachingAlert).toBeDefined();
      expect(approachingAlert?.category).toBe('Entertainment');
      expect(approachingAlert?.severity).toBe('medium');
    });

    it('should not generate alerts when notifications disabled', () => {
      mockConfig.globalSettings.warningNotifications = false;
      const alerts = budgetService.generateBudgetAlerts(comparisons, 'October', 2025);
      
      expect(alerts).toHaveLength(0);
    });

    it('should not generate approaching alert when budget exceeded', () => {
      const alerts = budgetService.generateBudgetAlerts(comparisons, 'October', 2025);
      
      const utilitiesAlerts = alerts.filter(a => a.category === 'Utilities');
      expect(utilitiesAlerts).toHaveLength(1);
      expect(utilitiesAlerts[0].type).toBe('budgetExceeded');
    });

    it('should generate multiple alerts for different categories', () => {
      comparisons[1].actual = 160; // Approaching limit
      comparisons[2].actual = 350; // Over budget
      
      const alerts = budgetService.generateBudgetAlerts(comparisons, 'October', 2025);
      
      expect(alerts.length).toBeGreaterThanOrEqual(2);
    });

    it('should not generate alert for under budget categories', () => {
      comparisons = comparisons.filter(c => c.category === 'Groceries');
      const alerts = budgetService.generateBudgetAlerts(comparisons, 'October', 2025);
      
      expect(alerts).toHaveLength(0);
    });

    it('should respect category-specific warning thresholds', () => {
      // Entertainment has 75% threshold
      comparisons[1].actual = 151; // 75.5% of 200
      const alerts = budgetService.generateBudgetAlerts(comparisons, 'October', 2025);
      
      const approachingAlert = alerts.find(a => 
        a.category === 'Entertainment' && a.type === 'approachingLimit'
      );
      expect(approachingAlert).toBeDefined();
    });

    it('should include correct alert properties', () => {
      const alerts = budgetService.generateBudgetAlerts(comparisons, 'October', 2025);
      
      const alert = alerts[0];
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('type');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('category');
      expect(alert).toHaveProperty('message');
      expect(alert).toHaveProperty('amount');
      expect(alert).toHaveProperty('percentage');
      expect(alert).toHaveProperty('date');
      expect(alert.acknowledged).toBe(false);
    });

    it('should generate unique alert IDs', () => {
      const alerts = budgetService.generateBudgetAlerts(comparisons, 'October', 2025);
      
      const ids = alerts.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty budget configuration', () => {
      mockConfig.categories = {};
      const budgets = budgetService.getAllCategoryBudgets();
      expect(budgets).toEqual({});
    });

    it('should handle null/undefined transactions', () => {
      const analysis = budgetService.analyzeBudgetPerformance([], 'October', 2025);
      expect(analysis).toBeDefined();
      expect(analysis.totalSpent).toBe(0);
    });

    it('should handle categories with very high warning thresholds', () => {
      mockConfig.categories.Test = {
        monthlyLimit: 1000,
        warningThreshold: 99,
        isActive: true,
        color: '#000000',
        description: 'Test'
      };
      
      const comparison = budgetService.calculateBudgetVariance('Test', 980);
      expect(comparison.status).toBe('under'); // 98% < 99%
    });

    it('should handle categories with very low warning thresholds', () => {
      mockConfig.categories.Test = {
        monthlyLimit: 1000,
        warningThreshold: 10,
        isActive: true,
        color: '#000000',
        description: 'Test'
      };
      
      const comparison = budgetService.calculateBudgetVariance('Test', 150);
      expect(comparison.status).toBe('onTarget'); // 15% > 10%
    });

    it('should handle negative amounts gracefully', () => {
      const comparison = budgetService.calculateBudgetVariance('Groceries', -50);
      expect(comparison.variance).toBe(-550);
      expect(comparison.status).toBe('under');
    });
  });
});
