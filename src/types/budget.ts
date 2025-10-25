// Budget Configuration Types for Galfin Finance Tracker
// These interfaces define the structure for budget templates and configuration

export interface BudgetCategory {
  monthlyLimit: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  alertThreshold: number; // Percentage (0-100)
  description: string;
  subcategories: string[];
}

export interface FamilyMemberBudget {
  monthlyAllowance: number;
  categories: string[];
  alertThreshold: number;
}

export interface IncomeTarget {
  monthlyTarget: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface AlertConfig {
  enabled: boolean;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface SavingsGoal {
  target: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  monthlyTarget: number;
}

export interface BudgetTemplate {
  version: string;
  currency: string;
  created: string;
  description: string;
  
  monthlyBudgets: {
    totalMonthlyLimit: number;
    categories: Record<string, BudgetCategory>;
  };
  
  familyMemberBudgets: {
    enabled: boolean;
    individual: Record<string, FamilyMemberBudget>;
  };
  
  incomeTargets: {
    monthlyTarget: number;
    categories: Record<string, IncomeTarget>;
  };
  
  alerts: {
    enabled: boolean;
    types: Record<string, AlertConfig>;
  };
  
  savingsGoals: {
    enabled: boolean;
    emergency: SavingsGoal;
    vacation: SavingsGoal;
    homeImprovement: SavingsGoal;
  };
  
  reporting: {
    comparisonPeriods: string[];
    metrics: Record<string, boolean>;
    exportFormats: string[];
  };
  
  settings: {
    autoAdjustBudgets: boolean;
    inflationAdjustment: number;
    reviewPeriod: string;
    rolloverUnusedBudget: boolean;
    strictMode: boolean;
  };
}

// Enhanced Budget interface that extends the existing one
export interface EnhancedBudget extends Budget {
  alertThreshold?: number;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  subcategories?: string[];
  rolloverAmount?: number;
  lastAdjusted?: string;
}

// Budget comparison and analysis types
export interface BudgetComparison {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  status: 'under' | 'over' | 'onTarget';
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface BudgetAnalysis {
  month: string;
  year: number;
  totalBudgeted: number;
  totalSpent: number;
  totalVariance: number;
  categoryComparisons: BudgetComparison[];
  savingsRate: number;
  incomeExpenseRatio: number;
  alerts: BudgetAlert[];
}

export interface BudgetAlert {
  id: string;
  type: 'budgetExceeded' | 'approachingLimit' | 'incomeShortfall' | 'unusualSpending';
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
  amount: number;
  percentage?: number;
  date: string;
  acknowledged: boolean;
}

// Utility functions type definitions
export interface BudgetUtils {
  loadBudgetTemplate: () => BudgetTemplate;
  calculateBudgetVariance: (category: string, month: string, year: number) => BudgetComparison;
  generateBudgetAlerts: (month: string, year: number) => BudgetAlert[];
  getBudgetStatus: (category: string, spent: number, budgeted: number) => 'under' | 'over' | 'onTarget';
  calculateSavingsRate: (income: number, expenses: number) => number;
  adjustBudgetForInflation: (amount: number, rate: number) => number;
  validateBudgetConfig: (template: BudgetTemplate) => boolean;
}

// Import the original Budget interface from existing types
import type { Budget } from './index';
