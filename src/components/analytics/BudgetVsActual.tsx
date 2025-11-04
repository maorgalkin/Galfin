import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useActiveBudget, useMonthlyBudgetsForDateRange } from '../../hooks/useBudgets';
import { DateRangeFilter } from './DateRangeFilter';
import { filterTransactionsByDateRange, getDateRange } from '../../utils/dateRangeFilters';
import type { DateRangeType } from '../../utils/dateRangeFilters';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export const BudgetVsActual: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRangeType>('ytd');
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const { transactions } = useFinance();
  const { data: personalBudget, isLoading: loadingPersonal } = useActiveBudget();
  
  const dateRangeData = useMemo(() => getDateRange(dateRange), [dateRange]);
  const { startDate, endDate } = dateRangeData;
  
  const { data: monthlyBudgets, isLoading: loadingMonthly } = useMonthlyBudgetsForDateRange(startDate, endDate);

  console.log('BudgetVsActual render:', { 
    loadingPersonal, 
    loadingMonthly, 
    personalBudget: !!personalBudget,
    monthlyBudgetsCount: monthlyBudgets?.length,
    dateRange,
    startDate,
    endDate
  });

  const filteredTransactions = useMemo(() => {
    return filterTransactionsByDateRange(transactions, dateRange);
  }, [transactions, dateRange]);

  const categoryData = useMemo(() => {
    if (!personalBudget || !monthlyBudgets) return [];

    const data: {
      category: string;
      originalBudget: number;
      currentBudget: number;
      actualSpending: number;
      color: string;
    }[] = [];

    // Get all active categories
    const activeCategories = Object.keys(personalBudget.categories).filter(
      cat => personalBudget.categories[cat].isActive
    );

    // Calculate number of months in the date range
    const monthsInRange = monthlyBudgets.length;

    activeCategories.forEach(categoryName => {
      const personalConfig = personalBudget.categories[categoryName];

      // Original budget: personal budget × number of months
      // (Assumes personal budget is constant across the period)
      const originalBudget = personalConfig.monthlyLimit * monthsInRange;

      // Current budget: sum of all monthly budgets for this category
      // (Includes any adjustments made in each month)
      const currentBudget = monthlyBudgets.reduce((sum, mb) => {
        const monthlyConfig = mb.categories[categoryName];
        return sum + (monthlyConfig?.monthlyLimit || personalConfig.monthlyLimit);
      }, 0);

      // Actual spending (from filtered transactions)
      const actualSpending = filteredTransactions
        .filter(t => t.type === 'expense' && t.category === categoryName)
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        category: categoryName,
        originalBudget,
        currentBudget,
        actualSpending,
        color: personalConfig.color || '#3B82F6',
      });
    });

    // Sort by actual spending (highest first)
    return data.sort((a, b) => b.actualSpending - a.actualSpending);
  }, [personalBudget, monthlyBudgets, filteredTransactions]);

  // Pagination logic
  const CATEGORIES_PER_PAGE = 13;
  const totalPages = Math.ceil(categoryData.length / CATEGORIES_PER_PAGE);
  const startIndex = currentPage * CATEGORIES_PER_PAGE;
  const endIndex = startIndex + CATEGORIES_PER_PAGE;
  const paginatedData = categoryData.slice(startIndex, endIndex);

  // Reset to first page when date range changes
  useMemo(() => {
    setCurrentPage(0);
  }, [dateRange]);

  const summary = useMemo(() => {
    return categoryData.reduce(
      (acc, cat) => ({
        totalOriginal: acc.totalOriginal + cat.originalBudget,
        totalCurrent: acc.totalCurrent + cat.currentBudget,
        totalSpent: acc.totalSpent + cat.actualSpending,
      }),
      { totalOriginal: 0, totalCurrent: 0, totalSpent: 0 }
    );
  }, [categoryData]);

  const formatCurrency = (amount: number) => {
    const currency = personalBudget?.global_settings?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getUtilizationColor = (spent: number, budget: number) => {
    if (budget === 0) return 'text-gray-500';
    const percentage = (spent / budget) * 100;
    if (percentage > 100) return 'text-red-600 dark:text-red-400';
    if (percentage > 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getUtilizationIcon = (spent: number, budget: number) => {
    if (budget === 0) return <Minus className="h-4 w-4" />;
    const percentage = (spent / budget) * 100;
    if (percentage > 100) return <AlertTriangle className="h-4 w-4" />;
    if (percentage > 80) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  if (loadingPersonal || loadingMonthly) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading budget data...</span>
      </div>
    );
  }

  if (!personalBudget) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No personal budget configured. Please set up your budget first.
        </p>
      </div>
    );
  }

  if (!monthlyBudgets || monthlyBudgets.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Creating monthly budgets for the selected period...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Budget vs Actual
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Compare budgeted amounts with actual spending across categories
        </p>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter selectedRange={dateRange} onRangeChange={setDateRange} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Original Budget
          </p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-400">
            {formatCurrency(summary.totalOriginal)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Planned at start of period
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Current Budget
          </p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-400">
            {formatCurrency(summary.totalCurrent)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {summary.totalCurrent !== summary.totalOriginal
              ? `Adjusted ${summary.totalCurrent > summary.totalOriginal ? '+' : ''}${formatCurrency(summary.totalCurrent - summary.totalOriginal)}`
              : 'No adjustments'}
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Actual Spending
          </p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-400">
            {formatCurrency(summary.totalSpent)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {summary.totalCurrent > 0
              ? `${((summary.totalSpent / summary.totalCurrent) * 100).toFixed(1)}% utilized`
              : 'No budget set'}
          </p>
        </div>
      </div>

      {/* Category Breakdown - Column Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Category Breakdown
        </h3>

        {categoryData.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No budget categories configured
          </p>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-400 dark:bg-gray-600" />
                <span className="text-gray-700 dark:text-gray-300">Original</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-400 dark:bg-blue-600" />
                <span className="text-gray-700 dark:text-gray-300">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-400 dark:bg-green-600" />
                <span className="text-gray-700 dark:text-gray-300">Actual (Good)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-400 dark:bg-yellow-600" />
                <span className="text-gray-700 dark:text-gray-300">Actual (Warning)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-400 dark:bg-red-600" />
                <span className="text-gray-700 dark:text-gray-300">Actual (Over)</span>
              </div>
            </div>

            {/* Column Chart - Overlapping Bars with Pagination */}
            <div className="relative overflow-hidden">
              <div 
                className={`flex items-end gap-4 px-8 transition-all duration-300 ${
                  isTransitioning 
                    ? slideDirection === 'right'
                      ? '-translate-x-full opacity-0' 
                      : 'translate-x-full opacity-0'
                    : 'translate-x-0 opacity-100'
                }`}
                style={{ height: '480px' }}
              >
                {paginatedData.map((cat) => {
                  // Find the maximum value across all categories (not just current page) to normalize the chart height
                  const maxValue = Math.max(
                    ...categoryData.map(c => Math.max(c.originalBudget, c.currentBudget, c.actualSpending))
                  );
                  
                  // Calculate heights as percentage of maxValue
                  const originalHeight = maxValue > 0 ? (cat.originalBudget / maxValue) * 100 : 0;
                  const currentHeight = maxValue > 0 ? (cat.currentBudget / maxValue) * 100 : 0;
                  const actualHeight = maxValue > 0 ? (cat.actualSpending / maxValue) * 100 : 0;
                  
                  const utilizationPercent = cat.currentBudget > 0 
                    ? (cat.actualSpending / cat.currentBudget) * 100 
                    : 0;

                  // Determine actual spending color based on comparison to current budget
                  const actualColor = cat.actualSpending > cat.currentBudget
                    ? 'bg-red-400 dark:bg-red-600'
                    : utilizationPercent > 80
                    ? 'bg-yellow-400 dark:bg-yellow-600'
                    : 'bg-green-400 dark:bg-green-600';

                  // Truncate category name if too long (max 18 chars for better readability)
                  const displayName = cat.category.length > 18 
                    ? cat.category.substring(0, 18) + '...' 
                    : cat.category;

                  // Bar width: 32px, with 85% overlap means each bar shows 15% (4.8px) of itself
                  // Total width = 32 + 4.8 + 4.8 = 41.6px per category
                  const barWidth = 32;
                  const overlapPercent = 85;
                  const visibleWidth = barWidth * (1 - overlapPercent / 100);

                  return (
                    <div key={cat.category} className="flex flex-col items-center gap-2">
                      {/* Bar Container with 3 overlapping bars */}
                      <div className="relative flex items-end" style={{ height: '350px', width: `${barWidth + visibleWidth * 2}px` }}>
                        {/* Original Budget (Gray) - leftmost */}
                        <div
                          className="absolute bottom-0 left-0 bg-gray-400 dark:bg-gray-600 rounded-t transition-all duration-500 shadow-md border-r border-gray-500 dark:border-gray-700"
                          style={{ 
                            height: `${originalHeight}%`, 
                            minHeight: cat.originalBudget > 0 ? '4px' : '0',
                            width: `${barWidth}px`,
                            zIndex: 1
                          }}
                          title={`${cat.category} - Original: ${formatCurrency(cat.originalBudget)}`}
                        />

                        {/* Current Budget (Blue) - middle, overlaps gray */}
                        <div
                          className="absolute bottom-0 bg-blue-400 dark:bg-blue-600 rounded-t transition-all duration-500 shadow-md border-r border-blue-500 dark:border-blue-700"
                          style={{ 
                            height: `${currentHeight}%`, 
                            minHeight: cat.currentBudget > 0 ? '4px' : '0',
                            width: `${barWidth}px`,
                            left: `${visibleWidth}px`,
                            zIndex: 2
                          }}
                          title={`${cat.category} - Current: ${formatCurrency(cat.currentBudget)}`}
                        />

                        {/* Actual Spending (Green/Yellow/Red) - rightmost, overlaps purple */}
                        <div
                          className={`absolute bottom-0 rounded-t transition-all duration-500 shadow-md ${actualColor}`}
                          style={{ 
                            height: `${actualHeight}%`, 
                            minHeight: cat.actualSpending > 0 ? '4px' : '0',
                            width: `${barWidth}px`,
                            left: `${visibleWidth * 2}px`,
                            zIndex: 3
                          }}
                          title={`${cat.category} - Actual: ${formatCurrency(cat.actualSpending)}`}
                        />
                      </div>

                      {/* Category Name (Diagonal) and Utilization */}
                      <div className="flex flex-col items-center" style={{ height: '100px', width: '40px' }}>
                        {/* Diagonal Label - positioned to be visible */}
                        <div className="relative" style={{ height: '80px', width: '40px' }}>
                          <div
                            className="absolute bottom-0 left-1/2 origin-bottom-left whitespace-nowrap"
                            style={{ 
                              transform: 'translateX(-50%) rotate(-45deg)',
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span 
                                className="text-xs font-medium text-gray-900 dark:text-gray-100"
                                title={cat.category}
                              >
                                {displayName}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Utilization */}
                        <div className={`flex items-center justify-center gap-0.5 text-[10px] font-medium mt-1 ${getUtilizationColor(cat.actualSpending, cat.currentBudget)}`}>
                          <span className="scale-75">{getUtilizationIcon(cat.actualSpending, cat.currentBudget)}</span>
                          <span>{utilizationPercent.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => {
                      setSlideDirection('left');
                      setIsTransitioning(true);
                      setTimeout(() => {
                        setCurrentPage(prev => Math.max(0, prev - 1));
                        setIsTransitioning(false);
                      }, 150);
                    }}
                    disabled={currentPage === 0 || isTransitioning}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSlideDirection('right');
                      setIsTransitioning(true);
                      setTimeout(() => {
                        setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
                        setIsTransitioning(false);
                      }, 150);
                    }}
                    disabled={currentPage === totalPages - 1 || isTransitioning}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
