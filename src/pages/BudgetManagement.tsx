import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useActiveBudget, useCurrentMonthBudget } from '../hooks/useBudgets';
import { PersonalBudgetEditor } from '../components/PersonalBudgetEditor';
import { PersonalBudgetDisplay } from '../components/PersonalBudgetDisplay';
import { BudgetComparisonCard } from '../components/BudgetComparisonCard';
import { BudgetAdjustmentScheduler } from '../components/BudgetAdjustmentScheduler';
import { CategoryList } from '../components/categories';
import { BudgetSettings } from '../components/settings';
import { Wallet, Settings, Tag, Sliders } from 'lucide-react';
import {
  getHeadingColor,
  getSubheadingColor,
  getInactiveBg,
  getInactiveBorderColor,
  getActiveBorderColor,
  getInactiveTextColor,
} from '../utils/themeColors';

type TabType = 'overview' | 'categories' | 'settings' | 'adjustments';

export const BudgetManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [autoCreate, setAutoCreate] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const { data: monthlyBudget } = useCurrentMonthBudget();
  
  const themeColor = 'green';

  // Check if user has an active budget
  const { data: activeBudget, isLoading: loadingActiveBudget } = useActiveBudget();

  // Check for 'create' parameter on mount
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setActiveTab('overview');
      setAutoCreate(true);
      // Clean up URL
      setSearchParams({});
    }
  }, []);

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Wallet },
    { id: 'categories' as TabType, label: 'Categories', icon: Tag },
    { id: 'settings' as TabType, label: 'Settings', icon: Sliders },
    { id: 'adjustments' as TabType, label: 'Adjustments', icon: Settings },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${getHeadingColor(themeColor)} mb-2`}>
          Budget Management
        </h1>
        <p className={getSubheadingColor(themeColor)}>
          Manage your budget and track monthly spending
        </p>
      </div>

      {/* Tabs */}
      <div className={`${getInactiveBg(themeColor)} rounded-lg shadow-sm border ${getInactiveBorderColor(themeColor)} mb-6`}>
        <div className={`border-b ${getInactiveBorderColor(themeColor)} overflow-x-auto`}>
          <nav className="flex px-2 sm:px-4" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center justify-center flex-1 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${
                      isActive
                        ? `${getActiveBorderColor(themeColor)} ${getSubheadingColor(themeColor)}`
                        : `border-transparent ${getInactiveTextColor(themeColor)} hover:${getSubheadingColor(themeColor)} hover:${getInactiveBorderColor(themeColor)}`
                    }
                  `}
                >
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
          {activeTab === 'overview' && (
            loadingActiveBudget ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Loading budget...
              </div>
            ) : !activeBudget ? (
              // Fresh view - no budget yet
              <div>
                {/* Tips Block - at the top */}
                <div className={`text-sm text-gray-500 dark:text-gray-400 mb-6 p-4 ${getInactiveBg(themeColor)} rounded-lg`}>
                  <p className="font-medium mb-2">💡 Getting Started:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Add your spending categories and set monthly limits</li>
                    <li>Your budget will be created automatically when you save</li>
                    <li>Track spending in real-time with your transaction records</li>
                  </ul>
                </div>
                
                <PersonalBudgetEditor autoCreate={autoCreate} />
              </div>
            ) : isEditingBudget ? (
              // Editing mode - show editor
              <div>
                {/* Tips Block - at the top */}
                <div className={`text-sm text-gray-500 dark:text-gray-400 mb-6 p-4 ${getInactiveBg(themeColor)} rounded-lg`}>
                  <p className="font-medium mb-2">💡 Editing Your Budget:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Changes to your budget apply to future months automatically</li>
                    <li>Add or remove categories based on your spending patterns</li>
                    <li>Adjust limits and warning thresholds as needed</li>
                  </ul>
                </div>
                
                <PersonalBudgetEditor 
                  autoCreate={false}
                  autoEdit={true}
                  onSaveComplete={() => setIsEditingBudget(false)}
                  onCancelEdit={() => setIsEditingBudget(false)}
                />
              </div>
            ) : (
              // Display mode - show configured budget
              <div>
                {/* Tips Block - at the top */}
                <div className={`text-sm text-gray-500 dark:text-gray-400 mb-6 p-4 ${getInactiveBg(themeColor)} rounded-lg`}>
                  <p className="font-medium mb-2">💡 Your Budget:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>This is your configured budget used for all monthly budgets</li>
                    <li>Click "Edit Budget" to modify categories, limits, or settings</li>
                    <li>Changes will apply to future months automatically</li>
                  </ul>
                </div>
                
                <PersonalBudgetDisplay 
                  onEdit={() => setIsEditingBudget(true)}
                />
              </div>
            )
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Category List with full management UI */}
              <CategoryList />

              {/* Tips */}
              <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="font-medium mb-2">💡 Category Management Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Rename:</strong> Change a category name without losing transaction history</li>
                  <li><strong>Merge:</strong> Combine similar categories (e.g., "Food" + "Groceries")</li>
                  <li><strong>Delete:</strong> Remove unused categories - they'll be hidden but history preserved</li>
                  <li><strong>Add:</strong> Create new categories with custom colors and limits</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <BudgetSettings />
          )}

          {activeTab === 'adjustments' && (
            <div className="space-y-6">
              {/* Current Month's Changes */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  This Month's Changes
                </h2>
                {monthlyBudget && monthlyBudget.adjustment_count === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      No changes made to budget this month
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Budget matches the month-start configuration
                    </p>
                  </div>
                ) : (
                  <BudgetComparisonCard 
                    year={currentYear} 
                    month={currentMonth}
                    compareToOriginal={true}
                  />
                )}
              </div>

              {/* Schedule Future Changes */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Next Month Budget Adjustments
                </h2>
                <BudgetAdjustmentScheduler />
              </div>

              {/* Tips */}
              <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="font-medium mb-2">💡 Managing Adjustments:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Current Month:</strong> Shows changes made during this month compared to month start</li>
                  <li><strong>Next Month:</strong> Schedule adjustments that will apply automatically</li>
                  <li>Green indicates increases, red indicates decreases</li>
                  <li>Scheduled adjustments can be reviewed and cancelled before they're applied</li>
                  <li>Use insights to refine your budget configuration over time</li>
                </ul>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
