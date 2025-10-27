import React from 'react';

interface DashboardTabNavigationProps {
  activeTab: 'dashboard' | 'transactions' | 'budget';
  onTabChange: (tab: 'dashboard' | 'transactions' | 'budget') => void;
  alertsCount?: number;
}

/**
 * Tab navigation component for switching between Dashboard, Transactions, and Budget views
 */
export const DashboardTabNavigation: React.FC<DashboardTabNavigationProps> = ({
  activeTab,
  onTabChange,
  alertsCount = 0,
}) => {
  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
              activeTab === 'dashboard'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => onTabChange('budget')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'budget'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Budget
          </button>
        </nav>
      </div>
    </div>
  );
};
