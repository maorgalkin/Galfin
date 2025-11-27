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
        <nav className="-mb-px flex justify-between sm:justify-start">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`py-3 px-2 sm:px-4 font-medium text-sm relative transition-colors ${
              activeTab === 'dashboard'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Dashboard
            {alertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {alertsCount}
              </span>
            )}
            {activeTab === 'dashboard' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => onTabChange('transactions')}
            className={`py-3 px-2 sm:px-4 font-medium text-sm relative transition-colors ${
              activeTab === 'transactions'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Transactions
            {activeTab === 'transactions' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => onTabChange('budget')}
            className={`py-3 px-2 sm:px-4 font-medium text-sm relative transition-colors ${
              activeTab === 'budget'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Budget
            {activeTab === 'budget' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-green-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => onTabChange('insights')}
            className={`py-3 px-2 sm:px-4 font-medium text-sm relative transition-colors ${
              activeTab === 'insights'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Insights
            {activeTab === 'insights' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        </nav>
      </div>
    </div>
  );
};
