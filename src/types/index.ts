export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  familyMember?: string;
}

export interface Budget {
  id: string;
  category: string;
  budgetAmount: number;
  spentAmount: number;
  month: string;
  year: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  color: string;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
}

export interface BudgetConfiguration {
  version: string;
  lastUpdated: string;
  categories: {
    [categoryName: string]: {
      monthlyLimit: number;
      warningThreshold: number; // Percentage (e.g., 80 for 80%)
      isActive: boolean;
      color?: string;
      description?: string;
    };
  };
  globalSettings: {
    currency: string;
    warningNotifications: boolean;
    emailAlerts: boolean;
  };
}

export interface BudgetCutoff {
  id: string;
  category: string;
  monthlyLimit: number;
  warningThreshold: number; // Percentage (e.g., 80 for 80%)
  isActive: boolean;
}

// Re-export budget types for convenience
export type {
  BudgetTemplate,
  BudgetCategory,
  FamilyMemberBudget,
  IncomeTarget,
  BudgetComparison,
  BudgetAnalysis,
  BudgetAlert,
  EnhancedBudget
} from './budget';
