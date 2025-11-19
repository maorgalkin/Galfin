import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { useActiveBudget } from '../hooks/useBudgets';
import { budgetService } from '../services/budgetService';
import { userAlertViewService } from '../services/userAlertViewService';
import { motion, AnimatePresence } from 'framer-motion';
import { BudgetPerformanceCard } from './BudgetPerformanceCard';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import EditTransactionModal from './EditTransactionModal';
import HouseholdSettingsModal from './HouseholdSettingsModal';
import { BudgetManagement } from '../pages/BudgetManagement';
import { getUserFirstName } from '../utils/userHelpers';
import { generateDummyTransactions, countDummyTransactions, isDummyTransaction } from '../utils/dummyData';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardTabNavigation } from './dashboard/DashboardTabNavigation';
import { MonthNavigator } from './dashboard/MonthNavigator';
import { ExpenseChart } from './dashboard/ExpenseChart';
import { DummyDataControls } from './dashboard/DummyDataControls';
import { FamilyMembersCard } from './dashboard/FamilyMembersCard';
import { TransactionsList } from './dashboard/TransactionsList';
import { CategoryTransactionsModal } from './dashboard/CategoryTransactionsModal';
import CustomDateRangeModal from './CustomDateRangeModal';
import * as HouseholdService from '../services/householdService';
import type { Transaction, BudgetConfiguration } from '../types';
import type { Household, HouseholdMember } from '../services/householdService';

const Dashboard: React.FC = () => {
  const { transactions, familyMembers, addTransaction, deleteTransaction } = useFinance();
  const { data: personalBudget } = useActiveBudget();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeMonthTab, setActiveMonthTab] = useState(0);
  const [direction, setDirection] = useState(0); // Track animation direction: -1 (left), 1 (right)
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check OS/browser dark mode preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  
  // Initialize activeTab from URL query parameter
  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam === 'budget' || tabParam === 'transactions' || tabParam === 'dashboard') 
    ? tabParam 
    : 'dashboard';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budget'>(initialTab);
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isHouseholdSettingsModalOpen, setIsHouseholdSettingsModalOpen] = useState(false);
  const [selectedDesktopCategory, setSelectedDesktopCategory] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCustomDateRangeModalOpen, setIsCustomDateRangeModalOpen] = useState(false);
  const [showBreakdownInHeader, setShowBreakdownInHeader] = useState(false);
  const [viewedAlertIds, setViewedAlertIds] = useState<Set<string>>(new Set());
  const [viewingTransactionDetails, setViewingTransactionDetails] = useState<Transaction | null>(null);
  const expenseChartRef = React.useRef<HTMLDivElement>(null);

  // Household data
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);

  // Calculate budget alerts for the current month
  // Count unique categories with alerts/warnings (not individual alert IDs)
  const currentAlertsCount = useMemo(() => {
    if (!personalBudget) return 0;
    
    const budgetConfig: BudgetConfiguration = {
      version: "2.0.0",
      lastUpdated: personalBudget.updated_at,
      categories: personalBudget.categories,
      globalSettings: personalBudget.global_settings
    };
    
    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const year = currentDate.getFullYear();
    
    const analysis = budgetService.analyzeBudgetPerformanceWithConfig(
      transactions,
      monthName,
      year,
      budgetConfig
    );
    
    // Get unique categories with alerts that haven't been viewed
    const unviewedCategories = new Set<string>();
    const unviewedAlertsByCategory: Record<string, string[]> = {};
    
    analysis.alerts.forEach(alert => {
      if (!viewedAlertIds.has(alert.id)) {
        unviewedCategories.add(alert.category);
        if (!unviewedAlertsByCategory[alert.category]) {
          unviewedAlertsByCategory[alert.category] = [];
        }
        unviewedAlertsByCategory[alert.category].push(alert.type);
      }
    });
    
    return unviewedCategories.size;
  }, [personalBudget, transactions, viewedAlertIds]);

  // Memoize callback to prevent effect re-runs
  const handleBreakdownVisible = useCallback((visible: boolean) => {
    setShowBreakdownInHeader(visible);
  }, []);

  // Mark all current alerts as viewed
  const handleAlertsViewed = useCallback(async () => {
    if (!personalBudget || !user?.id || !household?.id) return;
    
    const budgetConfig: BudgetConfiguration = {
      version: "2.0.0",
      lastUpdated: personalBudget.updated_at,
      categories: personalBudget.categories,
      globalSettings: personalBudget.global_settings
    };
    
    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const year = currentDate.getFullYear();
    
    const analysis = budgetService.analyzeBudgetPerformanceWithConfig(
      transactions,
      monthName,
      year,
      budgetConfig
    );
    
    // Get alert IDs to mark as viewed
    const alertIds = analysis.alerts.map(alert => alert.id);
    
    // Save to database
    await userAlertViewService.markAlertsAsViewed(user.id, alertIds, household.id);
    
    // Update local state
    setViewedAlertIds(prev => {
      const newSet = new Set(prev);
      alertIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [personalBudget, transactions, user?.id, household?.id]);

  // Handle category click from Budget Performance Card
  const handleCategoryClick = useCallback((category: string) => {
    // Set the selected category
    setSelectedDesktopCategory(category);
    
    // Scroll to expense chart with a small delay to ensure state updates
    setTimeout(() => {
      if (expenseChartRef.current) {
        expenseChartRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  }, []);

  // Track dark mode changes based on OS/browser preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    
    // Set initial value
    setIsDarkMode(mediaQuery.matches);
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load viewed alert IDs from database and household data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        const [viewedIds, householdData, membersData] = await Promise.all([
          userAlertViewService.getViewedAlertIds(user.id),
          HouseholdService.getUserHousehold(),
          HouseholdService.getHouseholdMembers(),
        ]);
        
        setViewedAlertIds(viewedIds);
        setHousehold(householdData);
        setHouseholdMembers(membersData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [user?.id]);

  // Listen to URL changes and update activeTab accordingly
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const targetTab = (urlTab === 'budget' || urlTab === 'transactions') ? urlTab : 'dashboard';
    
    if (targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  }, [searchParams]);

  // Sync URL with activeTab changes (when user clicks tabs)
  useEffect(() => {
    const currentUrlTab = searchParams.get('tab');
    
    if (activeTab === 'dashboard' && currentUrlTab !== null) {
      // Remove tab param for dashboard (clean URL)
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('tab');
      setSearchParams(newParams, { replace: true });
    } else if (activeTab !== 'dashboard' && currentUrlTab !== activeTab) {
      // Set tab param for transactions/budget
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', activeTab);
      setSearchParams(newParams, { replace: true });
    }
  }, [activeTab]);

  // Use custom hook for data management
  const {
    months,
    monthTransactions,
    monthCategoryData,
    selectedMonthDate,
    getTransactionsForMonth,
    getFamilyMemberName,
  } = useDashboardData({
    transactions,
    familyMembers,
    budgetConfig: null, // No longer needed
    activeMonthIndex: activeMonthTab,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  // Dummy data handlers
  const handleAddDummyData = async () => {
    const monthStart = months[activeMonthTab].start;
    const monthEnd = months[activeMonthTab].end;
    const memberIds = familyMembers.map(m => m.id);
    const dummyTransactions = generateDummyTransactions(monthStart, monthEnd, memberIds);
    
    try {
      for (const transaction of dummyTransactions) {
        await addTransaction(transaction);
      }
      alert(`Added ${dummyTransactions.length} dummy transactions to ${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
    } catch (error) {
      console.error('Error adding dummy data:', error);
      alert('Error adding dummy data. Check console for details.');
    }
  };

  const handleRemoveDummyData = async () => {
    const dummyCount = countDummyTransactions(transactions);
    
    if (dummyCount === 0) {
      alert('No dummy data found to remove.');
      return;
    }

    if (!confirm(`Remove all ${dummyCount} dummy transactions?`)) {
      return;
    }

    try {
      const dummyIds = transactions.filter(t => isDummyTransaction(t)).map(t => t.id);
      for (const id of dummyIds) {
        await deleteTransaction(id);
      }
      alert(`Removed ${dummyCount} dummy transactions.`);
    } catch (error) {
      console.error('Error removing dummy data:', error);
      alert('Error removing dummy data. Check console for details.');
    }
  };

  const handleClearViewedAlerts = async () => {
    if (!user?.id) return;
    
    await userAlertViewService.clearAllViewedAlerts(user.id);
    setViewedAlertIds(new Set());
  };

  // Dynamic background based on active tab with subtle textures
  const getBackgroundClass = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'bg-purple-100 dark:bg-purple-950/30';
      case 'transactions':
        return 'bg-blue-100 dark:bg-blue-950/30';
      case 'budget':
        return 'bg-green-100 dark:bg-green-950/30';
      default:
        return 'bg-white dark:bg-gray-900';
    }
  };

  const getTextureStyle = (): React.CSSProperties => {
    // Flat honeycomb hexagon pattern with white lines (only in light mode, flat in dark mode)
    if (isDarkMode) {
      return {}; // No pattern in dark mode
    }
    
    const lineWidth = 2;
    const lineStart = 50;
    const lineEnd = lineStart + lineWidth;
    
    return {
      backgroundImage: [
        `repeating-linear-gradient(0deg, transparent 0px, transparent ${lineStart}px, rgba(255, 255, 255, 0.2) ${lineStart}px, rgba(255, 255, 255, 0.2) ${lineEnd}px)`,
        `repeating-linear-gradient(60deg, transparent 0px, transparent ${lineStart}px, rgba(255, 255, 255, 0.2) ${lineStart}px, rgba(255, 255, 255, 0.2) ${lineEnd}px)`,
        `repeating-linear-gradient(120deg, transparent 0px, transparent ${lineStart}px, rgba(255, 255, 255, 0.2) ${lineStart}px, rgba(255, 255, 255, 0.2) ${lineEnd}px)`
      ].join(', '),
      backgroundSize: '100% 100%',
    };
  };

  return (
    <div 
      className={`min-h-screen transition-all duration-500 ${getBackgroundClass()}`}
      style={getTextureStyle()}
    >
      <div className="px-3 sm:px-4 lg:px-6 py-8 max-w-7xl mx-auto">
      
      {/* Tab Navigation */}
      <DashboardTabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertsCount={currentAlertsCount}
      />

      {activeTab === 'dashboard' && (
        <div>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-purple-900 dark:text-purple-100">Dashboard</h1>
            
            {/* Dummy Data Controls - Development Only */}
            {import.meta.env.DEV && (
              <div className="flex gap-2">
                <DummyDataControls
                  onAddDummyData={handleAddDummyData}
                  onRemoveDummyData={handleRemoveDummyData}
                />
                <button
                  onClick={handleClearViewedAlerts}
                  className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                  title="Clear viewed alerts (dev only)"
                >
                  Clear Alerts
                </button>
              </div>
            )}
          </div>

          {/* Budget Month Navigation - Carousel Style */}
          <MonthNavigator
            months={months}
            activeMonthIndex={activeMonthTab}
            onMonthChange={setActiveMonthTab}
            direction={direction}
            onDirectionChange={setDirection}
            userName={getUserFirstName(user)}
            themeColor="purple"
            householdName={household?.name}
            ownerName={householdMembers.find(m => m.role === 'owner')?.email?.split('@')[0] || householdMembers.find(m => m.role === 'owner')?.user_id}
          />

          {/* Family Members - Quick Access */}
          <div className="mb-8">
            {/* Mobile Sticky Header */}
            <div className="md:hidden sticky top-0 z-10 bg-purple-100 dark:bg-purple-950/30 -mx-3 px-3 py-3 mb-4 border-b-2 border-purple-300 dark:border-purple-700">
              <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                {household?.name || 'Family Members'}
              </h2>
            </div>
            
            <FamilyMembersCard
              familyMembersCount={familyMembers.length}
              onOpenModal={() => setIsHouseholdSettingsModalOpen(true)}
              householdName={household?.name}
            />
          </div>

          {/* BUDGET PERFORMANCE - Unified Widget */}
          <div className="mb-8">
            {/* Mobile Sticky Header */}
            <div className="md:hidden sticky top-0 z-10 bg-purple-100 dark:bg-purple-950/30 -mx-3 px-3 py-3 mb-4 border-b-2 border-purple-300 dark:border-purple-700">
              <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                Budget Performance{showBreakdownInHeader && ' | Breakdown'}
              </h2>
            </div>
            
            {/* Desktop version - compact grid layout */}
            <div className="max-md:hidden">
              <BudgetPerformanceCard 
                selectedMonth={selectedMonthDate} 
                isCompact={true} 
                themeColor="purple"
                onAlertsViewed={handleAlertsViewed}
                onCategoryClick={handleCategoryClick}
              />
            </div>
            
            {/* Mobile/Tablet version - full layout with breakdown observer */}
            <div className="md:hidden">
              <BudgetPerformanceCard 
                selectedMonth={selectedMonthDate} 
                isCompact={false} 
                themeColor="purple"
                onBreakdownVisible={handleBreakdownVisible}
                onAlertsViewed={handleAlertsViewed}
                onCategoryClick={handleCategoryClick}
              />
            </div>
          </div>

          {/* 2. BUDGET CATEGORY BREAKDOWN - Second Priority */}
          <div ref={expenseChartRef} className="mb-8">
            {/* Mobile Sticky Header */}
            <div className="md:hidden sticky top-0 z-10 bg-purple-100 dark:bg-purple-950/30 -mx-3 px-3 py-3 mb-4 border-b-2 border-purple-300 dark:border-purple-700">
              <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Expenses by Category</h2>
            </div>
            
            <ExpenseChart
              categoryData={monthCategoryData}
              transactions={monthTransactions}
              personalBudget={personalBudget}
              formatCurrency={formatCurrency}
              selectedCategory={selectedDesktopCategory}
              onEditTransaction={setViewingTransactionDetails}
              onViewAllTransactions={(category) => {
                setSelectedDesktopCategory(category);
                setIsCategoryModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-8">Transactions</h1>
          
          {/* Transaction Overview Section */}
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100">
                Transaction History
              </h2>
            </div>

            {/* Month Carousel Navigation with Arrows */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 w-full max-w-6xl mx-auto">
              {/* Left Arrow */}
              <button
                onClick={() => {
                  setDirection(-1);
                  setActiveMonthTab(activeMonthTab - 1);
                }}
                disabled={activeMonthTab <= 0}
                className="flex-shrink-0 p-2 sm:p-3 rounded-full bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Newer Month"
              >
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-blue-700 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Month Carousel - Swipeable/Draggable */}
              <motion.div 
                className="relative w-full sm:w-[560px] h-20 sm:h-32 flex items-center justify-center overflow-visible cursor-grab active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_event, info) => {
                  const swipeThreshold = 50;
                  const offsetX = info.offset.x;

                  if (offsetX > swipeThreshold && activeMonthTab > 0) {
                    setDirection(-1);
                    setActiveMonthTab(activeMonthTab - 1);
                  } else if (offsetX < -swipeThreshold && activeMonthTab < months.length - 1) {
                    setDirection(1);
                    setActiveMonthTab(activeMonthTab + 1);
                  }
                }}
              >
                <div className="flex items-center justify-center gap-0 sm:gap-2">
                  <AnimatePresence mode="popLayout">
                    {/* Dummy placeholder on the left */}
                    {activeMonthTab === 0 && (
                      <motion.div
                        key="transactions-future-dummy"
                        initial={{ opacity: 0, x: direction * -50 }}
                        animate={{ opacity: 0.4, x: 0 }}
                        exit={{ opacity: 0, x: direction * 50 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute -left-3 sm:relative w-28 sm:w-40 h-16 sm:h-28 rounded-lg border border-gray-200 bg-gray-50 scale-75 sm:scale-[0.7] flex-shrink-0 flex items-center justify-center z-0 sm:z-auto"
                      >
                        <span className="text-xs sm:text-base font-medium text-gray-400">Future</span>
                      </motion.div>
                    )}
                    
                    {months.map((month, idx) => {
                      const isActive = idx === activeMonthTab;
                      const showPrevious = idx === activeMonthTab - 1 && activeMonthTab > 0;
                      const showNext = idx === activeMonthTab + 1 && activeMonthTab < months.length - 1;
                      const isVisible = isActive || showPrevious || showNext;

                      if (!isVisible) return null;

                      let positionClass = '';
                      if (!isActive && showPrevious) {
                        positionClass = 'absolute -left-3 sm:relative z-0 sm:z-auto';
                      } else if (!isActive && showNext) {
                        positionClass = 'absolute -right-3 sm:relative z-0 sm:z-auto';
                      } else {
                        positionClass = 'relative z-10 sm:z-auto';
                      }

                      return (
                        <motion.button
                          key={month.label}
                          initial={{ opacity: 0, x: direction * 100 }}
                          animate={{ opacity: isActive ? 1 : 0.6, x: 0 }}
                          exit={{ opacity: 0, x: direction * -100 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          onClick={() => {
                            setActiveMonthTab(idx);
                            setTransactionTypeFilter('all');
                          }}
                          className={`${positionClass} sm:relative sm:z-auto w-28 sm:w-40 h-16 sm:h-28 rounded-lg border font-medium flex flex-col items-center justify-center flex-shrink-0 ${
                            isActive
                              ? 'bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-500 shadow-lg scale-100'
                              : 'bg-white dark:bg-blue-900/20 text-blue-500 dark:text-blue-300 border-blue-200 dark:border-blue-700 scale-75 sm:scale-[0.7] hover:opacity-100 hover:scale-80'
                          }`}
                        >
                          <div className={`text-sm sm:text-xl ${isActive ? 'font-semibold' : 'font-medium'}`}>
                            {month.monthName}
                          </div>
                          <div className={`text-xs sm:text-lg ${isActive ? 'font-normal' : 'font-light'} mt-1`}>
                            {month.year}
                          </div>
                        </motion.button>
                      );
                    })}
                    
                    {/* "Older" button on the right */}
                    {activeMonthTab === months.length - 1 && (
                      <motion.button
                        key="transactions-older-button"
                        initial={{ opacity: 0, x: direction * 50 }}
                        animate={{ opacity: 0.7, x: 0 }}
                        exit={{ opacity: 0, x: direction * -50 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        onClick={() => setIsCustomDateRangeModalOpen(true)}
                        className="absolute -right-3 sm:relative w-24 sm:w-32 h-16 sm:h-28 rounded-lg border border-blue-400 dark:border-blue-500 bg-blue-100 dark:bg-blue-800/50 hover:bg-blue-200 dark:hover:bg-blue-700/50 hover:opacity-100 scale-75 sm:scale-[0.7] flex-shrink-0 flex items-center justify-center z-0 sm:z-auto transition-all"
                      >
                        <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-200">Older</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Right Arrow */}
              <button
                onClick={() => {
                  setDirection(1);
                  setActiveMonthTab(activeMonthTab + 1);
                }}
                disabled={activeMonthTab >= months.length - 1}
                className="flex-shrink-0 p-2 sm:p-3 rounded-full bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Older Month"
              >
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-blue-700 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Transaction Type Filter Buttons */}
            <div className="flex justify-center gap-2 mb-6">
              <button
                onClick={() => setTransactionTypeFilter('all')}
                className={`px-4 py-2 rounded-md border font-medium transition-all ${
                  transactionTypeFilter === 'all'
                    ? 'bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-500'
                    : 'bg-white dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-800/30'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTransactionTypeFilter('income')}
                className={`px-4 py-2 rounded-md border font-medium transition-all ${
                  transactionTypeFilter === 'income'
                    ? 'bg-green-600 dark:bg-green-700 text-white border-green-600 dark:border-green-500'
                    : 'bg-white dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-800/30'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setTransactionTypeFilter('expense')}
                className={`px-4 py-2 rounded-md border font-medium transition-all ${
                  transactionTypeFilter === 'expense'
                    ? 'bg-red-600 dark:bg-red-700 text-white border-red-600 dark:border-red-500'
                    : 'bg-white dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-800/30'
                }`}
              >
                Expenses
              </button>
            </div>

            {/* Monthly Transaction Cards with Filter */}
            <TransactionsList
              transactions={(() => {
                let filtered = getTransactionsForMonth(months[activeMonthTab].start, months[activeMonthTab].end);
                if (transactionTypeFilter !== 'all') {
                  filtered = filtered.filter(t => t.type === transactionTypeFilter);
                }
                return filtered;
              })()}
              familyMembers={familyMembers}
              personalBudget={personalBudget}
              formatCurrency={formatCurrency}
              onEditTransaction={setEditingTransaction}
              emptyMessage="No transactions for this month"
            />
          </div>
        </div>
      )}

      {activeTab === 'budget' && (
        <div>
          <BudgetManagement />
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {/* Household Settings Modal */}
      <HouseholdSettingsModal
        isOpen={isHouseholdSettingsModalOpen}
        onClose={() => setIsHouseholdSettingsModalOpen(false)}
      />

      {/* Category Expenses Modal */}
      <CategoryTransactionsModal
        isOpen={isCategoryModalOpen && selectedDesktopCategory !== null}
        category={selectedDesktopCategory || ''}
        transactions={monthTransactions
          .filter(t => t.type === 'expense' && t.category === selectedDesktopCategory)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        formatCurrency={formatCurrency}
        getFamilyMemberName={getFamilyMemberName}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedDesktopCategory(null);
        }}
        onEditTransaction={setViewingTransactionDetails}
      />

      {/* Custom Date Range Modal */}
      <CustomDateRangeModal
        isOpen={isCustomDateRangeModalOpen}
        onClose={() => setIsCustomDateRangeModalOpen(false)}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={viewingTransactionDetails}
        isOpen={viewingTransactionDetails !== null}
        onClose={() => setViewingTransactionDetails(null)}
        formatCurrency={formatCurrency}
        familyMembers={familyMembers}
      />
      </div>
    </div>
  );
};

export default Dashboard;
