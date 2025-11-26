import React from 'react';

interface DashboardTabNavigationProps {
  activeTab: 'dashboard' | 'transactions' | 'budget' | 'insights';
  onTabChange: (tab: 'dashboard' | 'transactions' | 'budget' | 'insights') => void;
  alertsCount?: number;
}

/**
 * Tab navigation component for switching between Dashboard, Transactions, Budget, and Insights views
 */
export const DashboardTabNavigation: React.FC<DashboardTabNavigationProps> = ({
  activeTab,
  onTabChange,
  alertsCount = 0,
}) => {
  return (
    <div className="mb-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`py-3 px-4 border-b-2 font-medium text-sm relative transition-colors ${
              activeTab === 'dashboard'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Dashboard
            {alertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {alertsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange('transactions')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => onTabChange('budget')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'budget'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Budget
          </button>
          <button
            onClick={() => onTabChange('insights')}
            className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'insights'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Insights
          </button>
        </nav>
      </div>
    </div>
  );
};
