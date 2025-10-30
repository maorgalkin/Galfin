import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useActiveBudget, useCurrentMonthBudget, useNextMonthAdjustments } from '../hooks/useBudgets';
import { budgetService } from '../services/budgetService';
import { 
  AlertTriangle, 
  CheckCircle, 
  Target, 
  Calendar, 
  Settings, 
  Loader2, 
  ArrowRight, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { BudgetConfiguration } from '../types';

interface BudgetPerformanceCardProps {
  selectedMonth?: Date;
  isCompact?: boolean;
}

export const BudgetPerformanceCard: React.FC<BudgetPerformanceCardProps> = ({ 
  selectedMonth, 
  isCompact = false 
}) => {
  const navigate = useNavigate();
  const { transactions, budgetConfig: oldBudgetConfig } = useFinance();
  const { data: personalBudget, isLoading: loadingActive } = useActiveBudget();
  const { data: monthlyBudget, isLoading: loadingMonthly } = useCurrentMonthBudget();
  const { data: adjustments } = useNextMonthAdjustments();
  const [showDetails, setShowDetails] = useState(false);

  // Convert personal budget to BudgetConfiguration format
  const budgetConfig = useMemo((): BudgetConfiguration => {
    if (personalBudget) {
      return {
        version: "2.0.0",
        lastUpdated: personalBudget.updated_at,
        categories: personalBudget.categories,
        globalSettings: personalBudget.global_settings
      };
    }
    return oldBudgetConfig;
  }, [personalBudget, oldBudgetConfig]);

  // Get current month or use selected month
  const currentDate = selectedMonth || new Date();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
  const year = currentDate.getFullYear();

  // Calculate budget analysis for the selected month
  const budgetAnalysis = useMemo(() => {
    return budgetService.analyzeBudgetPerformanceWithConfig(transactions, monthName, year, budgetConfig);
  }, [transactions, monthName, year, budgetConfig]);

  // Calculate income and balance for the selected month
  const monthIncome = useMemo(() => {
    return transactions
      .filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentDate.getMonth() && 
               date.getFullYear() === year &&
               t.type === 'income';
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentDate, year]);

  const monthExpense = budgetAnalysis.totalSpent;
  const balance = monthIncome - monthExpense;

  const formatCurrency = (amount: number) => {
    const currency = personalBudget?.global_settings?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusIcon = (status: 'under' | 'over' | 'onTarget') => {
    switch (status) {
      case 'under': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'over': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'onTarget': return <Target className="h-4 w-4 text-blue-600" />;
    }
  };

  const budgetUtilization = budgetAnalysis.totalBudgeted > 0 
    ? (budgetAnalysis.totalSpent / budgetAnalysis.totalBudgeted) * 100 
    : 0;

  const categoriesOverBudget = budgetAnalysis.categoryComparisons.filter(c => c.status === 'over').length;

  if (loadingActive || loadingMonthly) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading budget...</span>
        </div>
      </div>
    );
  }

  // No Budget State
  if (!personalBudget && !monthlyBudget) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
          <h3 className="text-lg font-semibold text-white">Budget Performance</h3>
          <p className="text-sm text-blue-100 mt-1">
            {monthName} {year}
          </p>
        </div>

        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Sparkles className="h-16 w-16 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Welcome to Budget Management! 🎉
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              Get started by creating your first budget. Add your spending categories and set monthly limits to track your financial performance.
            </p>
            <button
              onClick={() => navigate('/?tab=budget')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Sparkles className="h-5 w-5" />
              Create Your First Budget
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              💡 Tip: Start with categories like Groceries, Utilities, and Entertainment
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Budget Performance</h3>
            <p className="text-sm text-blue-100 mt-1">
              {monthName} {year}
            </p>
          </div>
          {personalBudget && (
            <span className="text-xs text-blue-100 bg-blue-400/30 px-2 py-1 rounded truncate max-w-[150px]">
              {personalBudget.name}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Summary Grid - Always Visible */}
        <div className={`grid ${isCompact ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'} gap-4 mb-4`}>
          {/* Income */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Income</p>
            <p className="text-lg font-bold text-green-900 dark:text-green-400">{formatCurrency(monthIncome)}</p>
          </div>

          {/* Expense */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expense</p>
            <p className="text-lg font-bold text-red-900 dark:text-red-400">{formatCurrency(monthExpense)}</p>
          </div>

          {/* Balance */}
          <div className={`rounded-lg p-4 ${balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Balance</p>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-blue-900 dark:text-blue-400' : 'text-orange-900 dark:text-orange-400'}`}>
              {formatCurrency(balance)}
            </p>
          </div>

          {/* Budget Total */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-1">
              <Calendar className="h-3 w-3 mr-1" />
              Budgeted
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(budgetAnalysis.totalBudgeted)}</p>
            {monthlyBudget?.is_locked && (
              <span className="inline-block text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded mt-1">
                Locked
              </span>
            )}
          </div>

          {/* Budget Status */}
          <div className={`rounded-lg p-4 ${
            budgetUtilization <= 80 ? 'bg-green-50 dark:bg-green-900/20' : 
            budgetUtilization <= 100 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
            'bg-red-50 dark:bg-red-900/20'
          }`}>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</p>
            <p className={`text-sm font-bold ${
              budgetUtilization <= 80 ? 'text-green-900 dark:text-green-400' : 
              budgetUtilization <= 100 ? 'text-yellow-900 dark:text-yellow-400' : 
              'text-red-900 dark:text-red-400'
            }`}>
              {categoriesOverBudget === 0 
                ? `On Track` 
                : `${categoriesOverBudget} Over`
              }
            </p>
            <p className={`text-xs font-medium mt-0.5 ${
              budgetUtilization <= 80 ? 'text-green-700 dark:text-green-500' : 
              budgetUtilization <= 100 ? 'text-yellow-700 dark:text-yellow-500' : 
              'text-red-700 dark:text-red-500'
            }`}>
              {budgetUtilization.toFixed(1)}% used
            </p>
          </div>

          {/* Variance */}
          <div className={`rounded-lg p-4 ${budgetAnalysis.totalVariance >= 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Variance</p>
            <p className={`text-lg font-bold ${budgetAnalysis.totalVariance >= 0 ? 'text-red-900 dark:text-red-400' : 'text-green-900 dark:text-green-400'}`}>
              {budgetAnalysis.totalVariance >= 0 ? '+' : ''}{formatCurrency(budgetAnalysis.totalVariance)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{budgetUtilization.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                budgetUtilization <= 80 ? 'bg-green-500' : 
                budgetUtilization <= 100 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Alerts Preview */}
        {budgetAnalysis.alerts.length > 0 && !showDetails && (
          <div className="mb-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {budgetAnalysis.alerts.length} budget alert{budgetAnalysis.alerts.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200"
              >
                View
              </button>
            </div>
          </div>
        )}

        {/* Pending Adjustments */}
        {adjustments && adjustments.adjustmentCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400">
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {adjustments.adjustmentCount} pending adjustment{adjustments.adjustmentCount !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-purple-700 dark:text-purple-300">
                Next month
              </span>
            </div>
          </div>
        )}

        {/* Detailed Category Breakdown */}
        {showDetails && (
          <div className="mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Category Breakdown</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {budgetAnalysis.categoryComparisons
                .filter(comp => comp.budgeted > 0)
                .sort((a, b) => b.budgeted - a.budgeted)
                .map((comparison) => {
                  const utilization = comparison.budgeted > 0 ? (comparison.actual / comparison.budgeted) * 100 : 0;
                  
                  return (
                    <div key={comparison.category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          {getStatusIcon(comparison.status)}
                          <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">{comparison.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(comparison.actual)} / {formatCurrency(comparison.budgeted)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            utilization <= 80 ? 'bg-green-500' : 
                            utilization <= 100 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{utilization.toFixed(1)}%</span>
                        {utilization > 100 && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                            Over by {formatCurrency(comparison.variance)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Details
              </>
            )}
          </button>
          <button
            onClick={() => navigate('/?tab=budget')}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Manage Budget
            <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
