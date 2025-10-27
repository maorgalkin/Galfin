import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveBudget, useCurrentMonthBudget, useNextMonthAdjustments } from '../hooks/useBudgets';
import { Calendar, FileText, Settings, TrendingUp, Loader2, ArrowRight, Sparkles } from 'lucide-react';

export const BudgetQuickView: React.FC = () => {
  const navigate = useNavigate();
  const { data: activeBudget, isLoading: loadingActive } = useActiveBudget();
  const { data: monthlyBudget, isLoading: loadingMonthly } = useCurrentMonthBudget();
  const { data: adjustments } = useNextMonthAdjustments();

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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

  const monthlyTotal = monthlyBudget
    ? Object.values(monthlyBudget.categories).reduce((sum, cat) => sum + cat.monthlyLimit, 0)
    : 0;

  const personalTotal = activeBudget
    ? Object.values(activeBudget.categories).reduce((sum, cat) => sum + cat.monthlyLimit, 0)
    : 0;

  const difference = monthlyTotal - personalTotal;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
        <h3 className="text-lg font-semibold text-white">Budget Overview</h3>
        <p className="text-sm text-blue-100 mt-1">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {!activeBudget && !monthlyBudget ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-16 w-16 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Welcome to Budget Management! 🎉
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              Get started by creating your first budget. Add your spending categories and set monthly limits.
            </p>
            <button
              onClick={() => navigate('/budget-management?create=true')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Sparkles className="h-5 w-5" />
              Create Your First Budget
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              💡 Tip: Start with categories like Groceries, Utilities, and Entertainment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Monthly Budget
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(monthlyTotal)}
                </p>
                {monthlyBudget?.is_locked && (
                  <span className="inline-block text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded mt-2">
                    Locked
                  </span>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <FileText className="h-4 w-4 mr-1" />
                  Template
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(personalTotal)}
                </p>
                {activeBudget && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block truncate">
                    {activeBudget.name}
                  </span>
                )}
              </div>
            </div>

            {/* Difference Indicator */}
            {monthlyBudget && activeBudget && difference !== 0 && (
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                difference > 0
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center">
                  <TrendingUp className={`h-5 w-5 mr-2 ${
                    difference > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400 transform rotate-180'
                  }`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {difference > 0 ? 'Increased' : 'Decreased'} by
                  </span>
                </div>
                <span className={`font-semibold ${
                  difference > 0
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {difference > 0 && '+'}{formatCurrency(difference)}
                </span>
              </div>
            )}

            {/* Pending Adjustments */}
            {adjustments && adjustments.adjustmentCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <div className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {adjustments.adjustmentCount} pending adjustment{adjustments.adjustmentCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-xs text-orange-700 dark:text-orange-300">
                  Next month
                </span>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => navigate('/budget-management')}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Manage
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
              <button
                onClick={() => navigate('/budget-management')}
                className="flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                View Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
