import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useActiveBudget } from '../hooks/useBudgets';
import { PersonalBudgetEditor } from '../components/PersonalBudgetEditor';
import { PersonalBudgetDisplay } from '../components/PersonalBudgetDisplay';
import { BudgetComparisonCard } from '../components/BudgetComparisonCard';
import { BudgetAdjustmentScheduler } from '../components/BudgetAdjustmentScheduler';
import { Wallet, TrendingUp, Settings } from 'lucide-react';

type TabType = 'budget' | 'comparison' | 'adjustments';

export const BudgetManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const [autoCreate, setAutoCreate] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Check if user has an active budget
  const { data: activeBudget, isLoading: loadingActiveBudget } = useActiveBudget();

  // Check for 'create' parameter on mount
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setActiveTab('budget');
      setAutoCreate(true);
      // Clean up URL
      setSearchParams({});
    }
  }, []);

  const tabs = [
    { id: 'budget' as TabType, label: 'My Budget', icon: Wallet },
    { id: 'comparison' as TabType, label: 'Comparison', icon: TrendingUp },
    { id: 'adjustments' as TabType, label: 'Adjustments', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Budget Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your budget and track monthly spending
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-1 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors
                      ${
                        isActive
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'budget' && (
            loadingActiveBudget ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Loading budget...
              </div>
            ) : !activeBudget ? (
              // Fresh view - no budget yet
              <div>
                {/* Tips Block - at the top */}
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
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
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
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
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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

          {activeTab === 'comparison' && (
            <div>
              <BudgetComparisonCard year={currentYear} month={currentMonth} />
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="font-medium mb-2">💡 Understanding Comparisons:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>See how your monthly budget differs from your configured budget</li>
                  <li>Green indicates increases, red indicates decreases</li>
                  <li>Track which categories you adjust most frequently</li>
                  <li>Use insights to refine your budget configuration</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'adjustments' && (
            <div>
              <BudgetAdjustmentScheduler />
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="font-medium mb-2">💡 Scheduling Adjustments:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Schedule changes to take effect in the next month</li>
                  <li>Adjustments update your budget when applied</li>
                  <li>Review and cancel pending adjustments before they're applied</li>
                  <li>Automatically creates next month's budget with adjustments</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
