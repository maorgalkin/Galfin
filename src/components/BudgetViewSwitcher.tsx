import React, { useState, useEffect } from 'react';
import { MonthlyBudgetService } from '../services/monthlyBudgetService';
import type { MonthlyBudget } from '../types/budget';

export type BudgetViewType = 'personal' | 'current-month' | 'historical-month';

interface BudgetView {
  type: BudgetViewType;
  label: string;
  monthlyBudget?: MonthlyBudget;
}

interface BudgetViewSwitcherProps {
  currentView: BudgetViewType;
  selectedMonth?: { year: number; month: number };
  onViewChange: (view: BudgetViewType, monthlyBudget?: MonthlyBudget) => void;
  className?: string;
}

export const BudgetViewSwitcher: React.FC<BudgetViewSwitcherProps> = ({
  currentView,
  selectedMonth,
  onViewChange,
  className = '',
}) => {
  const [availableMonths, setAvailableMonths] = useState<MonthlyBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadAvailableMonths();
  }, []);

  const loadAvailableMonths = async () => {
    try {
      setLoading(true);
      const months = await MonthlyBudgetService.getAllMonthlyBudgets(12);
      setAvailableMonths(months);
    } catch (error) {
      console.error('Error loading monthly budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayLabel = (): string => {
    if (currentView === 'personal') {
      return '📊 Personal Budget (Baseline)';
    }
    
    if (currentView === 'current-month') {
      const now = new Date();
      const monthName = MonthlyBudgetService.getMonthName(now.getMonth() + 1);
      return `📅 ${monthName} ${now.getFullYear()} (Current)`;
    }
    
    if (currentView === 'historical-month' && selectedMonth) {
      const monthName = MonthlyBudgetService.getMonthName(selectedMonth.month);
      return `🗓️ ${monthName} ${selectedMonth.year}`;
    }
    
    return 'Select Budget View';
  };

  const handleViewSelect = async (view: BudgetViewType, year?: number, month?: number) => {
    setIsOpen(false);

    if (view === 'personal') {
      onViewChange('personal');
      return;
    }

    if (view === 'current-month') {
      try {
        const currentBudget = await MonthlyBudgetService.getCurrentMonthBudget();
        onViewChange('current-month', currentBudget);
      } catch (error) {
        console.error('Error loading current month budget:', error);
      }
      return;
    }

    if (view === 'historical-month' && year && month) {
      try {
        const monthlyBudget = await MonthlyBudgetService.getMonthlyBudget(year, month);
        if (monthlyBudget) {
          onViewChange('historical-month', monthlyBudget);
        }
      } catch (error) {
        console.error('Error loading historical budget:', error);
      }
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {getDisplayLabel()}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {/* Personal Budget Option */}
          <button
            onClick={() => handleViewSelect('personal')}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 ${
              currentView === 'personal' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  📊 Personal Budget
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Your baseline/ideal budget
                </div>
              </div>
              {currentView === 'personal' && (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>

          {/* Current Month Option */}
          <button
            onClick={() => handleViewSelect('current-month')}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 ${
              currentView === 'current-month' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  📅 {MonthlyBudgetService.getMonthName(currentMonth)} {currentYear}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Current month's active budget
                </div>
              </div>
              {currentView === 'current-month' && (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>

          {/* Historical Months Section */}
          {availableMonths.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Historical Months
                </span>
              </div>
              {availableMonths.map((budget) => {
                const isSelected = 
                  currentView === 'historical-month' &&
                  selectedMonth?.year === budget.year &&
                  selectedMonth?.month === budget.month;
                
                // Skip current month in historical list
                if (budget.year === currentYear && budget.month === currentMonth) {
                  return null;
                }

                return (
                  <button
                    key={budget.id}
                    onClick={() => handleViewSelect('historical-month', budget.year, budget.month)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          🗓️ {MonthlyBudgetService.formatMonthYear(budget.year, budget.month)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          {budget.adjustment_count > 0 && (
                            <span className="text-orange-500">
                              ✏️ {budget.adjustment_count} adjustment{budget.adjustment_count !== 1 ? 's' : ''}
                            </span>
                          )}
                          {budget.is_locked && (
                            <span className="text-gray-400">🔒 Locked</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {loading && (
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              Loading months...
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
