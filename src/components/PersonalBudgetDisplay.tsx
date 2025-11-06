import React from 'react';
import { useActiveBudget } from '../hooks/useBudgets';
import { Edit2, Loader2, DollarSign } from 'lucide-react';
import type { CategoryConfig } from '../types/budget';
import {
  getPrimaryButtonBg,
  getPrimaryButtonHoverBg,
  getInactiveBg,
  getIconColor,
} from '../utils/themeColors';

interface PersonalBudgetDisplayProps {
  className?: string;
  onEdit?: () => void;
}

export const PersonalBudgetDisplay: React.FC<PersonalBudgetDisplayProps> = ({
  className = '',
  onEdit,
}) => {
  const { data: activeBudget, isLoading } = useActiveBudget();
  const themeColor = 'green';

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
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading budget...</span>
        </div>
      </div>
    );
  }

  if (!activeBudget) {
    return null;
  }

  const totalBudget = Object.values(activeBudget.categories)
    .filter(cat => cat.isActive)
    .reduce((sum, cat: CategoryConfig) => sum + cat.monthlyLimit, 0);

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
              className={`flex items-center px-4 py-2 ${getPrimaryButtonBg(themeColor)} text-white rounded-md ${getPrimaryButtonHoverBg(themeColor)} transition-colors text-sm font-medium`}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Budget
            </button>
          )}
        </div>
      </div>

      {/* Budget Summary */}
      <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${getInactiveBg(themeColor)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className={`h-5 w-5 ${getIconColor(themeColor)} mr-2`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Monthly Budget
            </span>
          </div>
          <span className={`text-2xl font-bold ${getIconColor(themeColor)}`}>
            {formatCurrency(totalBudget)}
          </span>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="px-6 py-4">
        <div className="budget-category-grid">
          {activeCategories.map(([name, config]) => (
            <div
              key={name}
              className="p-4 bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  {/* Color Badge */}
                  {config.color && (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                  )}
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                    {name}
                  </h4>
                </div>
                {!config.isActive && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">Inactive</span>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Limit</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(config.monthlyLimit)}
                  </span>
                </div>
                
                {config.warningThreshold && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Warning</span>
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {config.warningThreshold}%
                    </span>
                  </div>
                )}
                
                {config.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
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
