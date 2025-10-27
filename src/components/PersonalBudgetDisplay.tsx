import React from 'react';
import { useActiveBudget } from '../hooks/useBudgets';
import { Edit2, Loader2, DollarSign } from 'lucide-react';
import type { CategoryConfig } from '../types/budget';

interface PersonalBudgetDisplayProps {
  className?: string;
  onEdit?: () => void;
}

export const PersonalBudgetDisplay: React.FC<PersonalBudgetDisplayProps> = ({
  className = '',
  onEdit,
}) => {
  const { data: activeBudget, isLoading } = useActiveBudget();

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeBudget?.global_settings?.currency || 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading budget...</span>
        </div>
      </div>
    );
  }

  if (!activeBudget) {
    return null;
  }

  const totalBudget = Object.values(activeBudget.categories).reduce(
    (sum, cat: CategoryConfig) => sum + cat.monthlyLimit,
    0
  );

  const activeCategories = Object.entries(activeBudget.categories).filter(
    ([_, cat]) => cat.isActive
  );

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {activeBudget.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {activeCategories.length} categories • {formatCurrency(totalBudget)} monthly budget
            </p>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Budget
            </button>
          )}
        </div>
      </div>

      {/* Budget Summary */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Monthly Budget
            </span>
          </div>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totalBudget)}
          </span>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCategories.map(([name, config]) => (
            <div
              key={name}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {config.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                  )}
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {name}
                  </h4>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Monthly Limit</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(config.monthlyLimit)}
                  </span>
                </div>
                
                {config.warningThreshold && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Warning at</span>
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {config.warningThreshold}%
                    </span>
                  </div>
                )}
                
                {config.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                    {config.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {activeBudget.notes && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Notes:</span> {activeBudget.notes}
            </p>
          </div>
        )}
      </div>

      {/* Global Settings */}
      {activeBudget.global_settings && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Settings
          </h4>
          <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span>Currency: {activeBudget.global_settings.currency || 'USD'}</span>
            {activeBudget.global_settings.warningNotifications && (
              <span className="text-green-600 dark:text-green-400">✓ Warning Notifications</span>
            )}
            {activeBudget.global_settings.emailAlerts && (
              <span className="text-green-600 dark:text-green-400">✓ Email Alerts</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
