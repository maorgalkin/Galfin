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
      <div className="border-b-2 border-gray-200 dark:border-gray-700">
        <nav className="-mb-0.5 flex justify-between sm:justify-start">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`py-3 px-2 sm:px-4 font-medium text-sm transition-colors flex flex-col items-center ${
              activeTab === 'dashboard'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="relative">
              Dashboard
              {alertsCount > 0 && (
                <span className="absolute -top-1 -right-3 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {alertsCount}
                </span>
              )}
            </span>
            {activeTab === 'dashboard' && (
              <span className="mt-2 w-4 h-1 bg-purple-500 rounded-full" />
            )}
            {activeTab !== 'dashboard' && <span className="mt-2 w-4 h-1" />}
          </button>
          <button
            onClick={() => onTabChange('transactions')}
            className={`py-3 px-2 sm:px-4 font-medium text-sm transition-colors flex flex-col items-center ${
              activeTab === 'transactions'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>Transactions</span>
            {activeTab === 'transactions' && (
              <span className="mt-2 w-4 h-1 bg-blue-500 rounded-full" />
            )}
            {activeTab !== 'transactions' && <span className="mt-2 w-4 h-1" />}
          </button>
          <button
            onClick={() => onTabChange('budget')}
            className={`py-3 px-2 sm:px-4 font-medium text-sm transition-colors flex flex-col items-center ${
              activeTab === 'budget'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>Budget</span>
            {activeTab === 'budget' && (
              <span className="mt-2 w-4 h-1 bg-green-500 rounded-full" />
            )}
            {activeTab !== 'budget' && <span className="mt-2 w-4 h-1" />}
          </button>
          <button
            onClick={() => onTabChange('insights')}
            className={`py-3 px-2 sm:px-4 font-medium text-sm transition-colors flex flex-col items-center ${
              activeTab === 'insights'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>Insights</span>
            {activeTab === 'insights' && (
              <span className="mt-2 w-4 h-1 bg-indigo-500 rounded-full" />
            )}
            {activeTab !== 'insights' && <span className="mt-2 w-4 h-1" />}
          </button>
        </nav>
      </div>
    </div>
  );
};
