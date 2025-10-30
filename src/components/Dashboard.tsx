import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BudgetPerformanceCard } from './BudgetPerformanceCard';
import EditTransactionModal from './EditTransactionModal';
import FamilyMembersModal from './FamilyMembersModal';
import { BudgetManagement } from '../pages/BudgetManagement';
import { budgetService } from '../services/budgetService';
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
import type { Transaction } from '../types';

const Dashboard: React.FC = () => {
  const { transactions, familyMembers, addTransaction, deleteTransaction, budgetConfig } = useFinance();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeMonthTab, setActiveMonthTab] = useState(0);
  const [direction, setDirection] = useState(0); // Track animation direction: -1 (left), 1 (right)
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budget'>('dashboard');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isFamilyMembersModalOpen, setIsFamilyMembersModalOpen] = useState(false);
  const [selectedDesktopCategory, setSelectedDesktopCategory] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Handle tab query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'budget' || tabParam === 'transactions' || tabParam === 'dashboard') {
      setActiveTab(tabParam);
      // Clear the query param after setting the tab
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('tab');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams.get('tab')]); // Only watch the tab parameter value

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
    budgetConfig,
    activeMonthIndex: activeMonthTab,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  // Get budget status for summary
  const budgetStatus = budgetService.getBudgetStatusSummary(transactions);

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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      
      {/* Tab Navigation */}
      <DashboardTabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertsCount={budgetStatus.alertsCount}
      />

      {activeTab === 'dashboard' && (
        <div>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            
            {/* Dummy Data Controls */}
            <DummyDataControls
              onAddDummyData={handleAddDummyData}
              onRemoveDummyData={handleRemoveDummyData}
            />
          </div>

          {/* Budget Month Navigation - Carousel Style */}
          <MonthNavigator
            months={months}
            activeMonthIndex={activeMonthTab}
            onMonthChange={setActiveMonthTab}
            direction={direction}
            onDirectionChange={setDirection}
            userName={getUserFirstName(user)}
          />

          {/* BUDGET PERFORMANCE - Unified Widget */}
          <div className="mb-8">
            {/* Desktop version - compact grid layout */}
            <div className="max-md:hidden">
              <BudgetPerformanceCard selectedMonth={selectedMonthDate} isCompact={true} />
            </div>
            
            {/* Mobile/Tablet version - full layout */}
            <div className="md:hidden">
              <BudgetPerformanceCard selectedMonth={selectedMonthDate} isCompact={false} />
            </div>
          </div>

          {/* 2. BUDGET CATEGORY BREAKDOWN - Second Priority */}
          <div className="mb-8">
            <ExpenseChart
              categoryData={monthCategoryData}
              transactions={monthTransactions}
              budgetConfig={budgetConfig}
              formatCurrency={formatCurrency}
              onEditTransaction={setEditingTransaction}
              onViewAllTransactions={(category) => {
                setSelectedDesktopCategory(category);
                setIsCategoryModalOpen(true);
              }}
            />
          </div>

          {/* Family Members - Quick Access */}
          <div className="mb-8">
            <FamilyMembersCard
              familyMembersCount={familyMembers.length}
              onOpenModal={() => setIsFamilyMembersModalOpen(true)}
            />
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Transactions</h1>
          
          {/* Transaction Overview Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Transaction History
              </h2>
              <button
                onClick={() => navigate('/older-transactions')}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Clock className="h-4 w-4 mr-2" />
                View Older Transactions
              </button>
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
                className="flex-shrink-0 p-2 sm:p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Newer Month"
              >
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Month Carousel */}
              <div className="relative w-full sm:w-[560px] h-20 sm:h-32 flex items-center justify-center overflow-visible">
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
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-100'
                              : 'bg-white text-gray-500 border-gray-200 scale-75 sm:scale-[0.7] hover:opacity-100 hover:scale-80'
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
                    
                    {/* Dummy placeholder on the right */}
                    {activeMonthTab === months.length - 1 && (
                      <motion.div
                        key="transactions-past-dummy"
                        initial={{ opacity: 0, x: direction * 50 }}
                        animate={{ opacity: 0.4, x: 0 }}
                        exit={{ opacity: 0, x: direction * -50 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute -right-3 sm:relative w-28 sm:w-40 h-16 sm:h-28 rounded-lg border border-gray-200 bg-gray-50 scale-75 sm:scale-[0.7] flex-shrink-0 flex items-center justify-center z-0 sm:z-auto"
                      >
                        <span className="text-xs sm:text-base font-medium text-gray-400">Past</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Arrow */}
              <button
                onClick={() => {
                  setDirection(1);
                  setActiveMonthTab(activeMonthTab + 1);
                }}
                disabled={activeMonthTab >= months.length - 1}
                className="flex-shrink-0 p-2 sm:p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Older Month"
              >
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTransactionTypeFilter('income')}
                className={`px-4 py-2 rounded-md border font-medium transition-all ${
                  transactionTypeFilter === 'income'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setTransactionTypeFilter('expense')}
                className={`px-4 py-2 rounded-md border font-medium transition-all ${
                  transactionTypeFilter === 'expense'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
              budgetConfig={budgetConfig}
              formatCurrency={formatCurrency}
              onEditTransaction={setEditingTransaction}
              emptyMessage="No transactions for this month"
            />
          </div>
        </div>
      )}

      {activeTab === 'budget' && (
        <BudgetManagement />
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {/* Family Members Modal */}
      <FamilyMembersModal
        isOpen={isFamilyMembersModalOpen}
        onClose={() => setIsFamilyMembersModalOpen(false)}
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
        onEditTransaction={setEditingTransaction}
      />
    </div>
  );
};

export default Dashboard;
