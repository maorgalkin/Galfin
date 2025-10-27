import React from 'react';
import { useBudgetComparison } from '../hooks/useBudgets';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Loader2 } from 'lucide-react';
import type { BudgetComparisonResult } from '../types/budget';

interface BudgetComparisonCardProps {
  year: number;
  month: number;
  className?: string;
}

export const BudgetComparisonCard: React.FC<BudgetComparisonCardProps> = ({
  year,
  month,
  className = '',
}) => {
  const { data: comparison, isLoading, error } = useBudgetComparison(year, month);

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading comparison...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Error loading budget comparison</span>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusIcon = (status: 'increased' | 'decreased' | 'unchanged') => {
    switch (status) {
      case 'increased':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreased':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'unchanged':
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: 'increased' | 'decreased' | 'unchanged') => {
    switch (status) {
      case 'increased':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'decreased':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'unchanged':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Budget Comparison
        </h3>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {comparison.personalBudgetName} vs {comparison.monthlyBudgetDate}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {comparison.adjustedCategories} of {comparison.totalCategories} categories adjusted
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Personal Budget</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {formatCurrency(comparison.totalPersonalLimit)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monthly Budget</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {formatCurrency(comparison.totalMonthlyLimit)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Difference</p>
            <p className={`text-lg font-semibold mt-1 ${
              comparison.totalDifference > 0 
                ? 'text-green-600 dark:text-green-400' 
                : comparison.totalDifference < 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-600 dark:text-gray-400'
            }`}>
              {comparison.totalDifference > 0 && '+'}
              {formatCurrency(comparison.totalDifference)}
            </p>
          </div>
        </div>
      </div>

      {/* Category Comparisons */}
      <div className="px-6 py-4 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {comparison.comparisons.map((item) => (
            <div
              key={item.category}
              className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center justify-center w-8 h-8">
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {item.category}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(item.personalLimit)}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.monthlyLimit)}
                    </span>
                  </div>
                </div>
              </div>
              
              {item.status !== 'unchanged' && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                  {item.difference > 0 && '+'}
                  {formatCurrency(item.difference)}
                  <span className="ml-1 text-xs">
                    ({item.differencePercentage > 0 && '+'}
                    {item.differencePercentage.toFixed(1)}%)
                  </span>
                </div>
              )}
              
              {item.status === 'unchanged' && (
                <div className="px-3 py-1 rounded-full text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
                  No change
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
