import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Users, Clock, Edit2, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BudgetOverview from './BudgetOverview';
import EditTransactionModal from './EditTransactionModal';
import FamilyMembersModal from './FamilyMembersModal';
import { BudgetQuickView } from './BudgetQuickView';
import { budgetService } from '../services/budgetService';
import { getCategoryColor } from '../utils/categoryColors';
import { generateDummyTransactions, countDummyTransactions, isDummyTransaction } from '../utils/dummyData';
import type { Transaction } from '../types';

const Dashboard: React.FC = () => {
  const { transactions, familyMembers, addTransaction, deleteTransaction, budgetConfig } = useFinance();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeMonthTab, setActiveMonthTab] = useState(0);
  const [direction, setDirection] = useState(0); // Track animation direction: -1 (left), 1 (right)
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [activeTab, setActiveTab] = useState<'budget' | 'transactions'>('budget');
  const [focusedCategory, setFocusedCategory] = useState<{category: string, amount: number, percentage: string} | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isFamilyMembersModalOpen, setIsFamilyMembersModalOpen] = useState(false);
  const [selectedDesktopCategory, setSelectedDesktopCategory] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Extract user's first name from email or metadata
  const getUserFirstName = () => {
    if (!user) return 'User';
    
    // Check if user has metadata with first_name
    if (user.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    
    // Fall back to full_name if available
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    
    // Otherwise, extract from email (everything before @ or .)
    if (user.email) {
      const emailName = user.email.split('@')[0];
      // Capitalize first letter
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    return 'User';
  };

  // Helper functions for date calculations
  const getMonthLabel = (date: Date) => {
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleString('en-US', { month: 'long' });
  };

  const getYear = (date: Date) => {
    return date.getFullYear().toString();
  };

  const getMonthStart = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getMonthEnd = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  // Generate last 4 months (current month + 3 previous)
  const now = new Date();
  const months = [0, 1, 2, 3].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return {
      label: getMonthLabel(d),
      monthName: getMonthName(d),
      year: getYear(d),
      start: getMonthStart(d),
      end: getMonthEnd(d),
    };
  });

  // Filter transactions by date range
  const getTransactionsForMonth = (start: Date, end: Date) =>
    transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  // Filter transactions for the selected month
  const selectedMonthStart = months[activeMonthTab].start;
  const selectedMonthEnd = months[activeMonthTab].end;
  const monthTransactions = getTransactionsForMonth(selectedMonthStart, selectedMonthEnd);

  // Calculate category-wise expenses for the selected month
  const monthCategoryData: { category: string; amount: number }[] = monthTransactions
    .filter((t: Transaction) => t.type === 'expense')
    .reduce((acc: { category: string; amount: number }[], transaction: Transaction) => {
      const existing = acc.find((item) => item.category === transaction.category);
      if (existing) {
        existing.amount += transaction.amount;
      } else {
        acc.push({ category: transaction.category, amount: transaction.amount });
      }
      return acc;
    }, []);

  // Get budget status for summary
  const budgetStatus = budgetService.getBudgetStatusSummary(transactions);
  const selectedMonthDate = months[activeMonthTab].start;

  // Helper to get family member name from ID
  const getFamilyMemberName = (id: string | undefined): string | undefined => {
    if (!id) return undefined;
    const member = familyMembers.find(m => m.id === id);
    return member?.name;
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('budget')}
              className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'budget'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
              {budgetStatus.alertsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {budgetStatus.alertsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'budget' && (
        <div>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            
            {/* Dummy Data Controls */}
            <div className="flex gap-2">
              <button
                onClick={handleAddDummyData}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add Dummy Data
              </button>
              <button
                onClick={handleRemoveDummyData}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                🗑️ Remove All Dummy
              </button>
            </div>
          </div>

          {/* Budget Quick View Widget */}
          <div className="mb-8">
            <BudgetQuickView />
          </div>
          
          {/* Budget Month Navigation - Carousel Style */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">{getUserFirstName()}'s Family Budget</h2>
              <div className="text-sm text-gray-600">
                Select month to analyze budget performance and financial overview
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 w-full max-w-6xl mx-auto px-4">
              {/* Left Arrow - Go to Previous Month in Carousel (Newer - Lower Index) */}
              <button
                onClick={() => {
                  setDirection(-1); // Animate from left
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

              {/* Month Carousel - Scrolls LEFT to RIGHT (Current month at leftmost, oldest at rightmost) */}
              <div className="relative w-full sm:w-[560px] h-20 sm:h-32 flex items-center justify-center overflow-visible">
                <div className="flex items-center justify-center gap-0 sm:gap-2">
                  <AnimatePresence mode="popLayout">
                    {/* Dummy placeholder on the left (when at current month) */}
                    {activeMonthTab === 0 && (
                      <motion.div
                        key="future-dummy"
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
                      
                      // Calculate visibility based on position relative to active month
                      // Show: previous month (if exists), active month, next month (if exists)
                      const showPrevious = idx === activeMonthTab - 1 && activeMonthTab > 0;
                      const showNext = idx === activeMonthTab + 1 && activeMonthTab < months.length - 1;
                      const isVisible = isActive || showPrevious || showNext;

                      if (!isVisible) return null;

                      // Mobile: Tighter overlap with absolute positioning (cards are w-28=112px, scaled to 84px, offset 12px, show 72px visible)
                      // Desktop: Normal flexbox flow with gap-2 spacing (cards are w-40=160px, scaled to 112px, 8px gap)
                      let positionClass = '';
                      if (!isActive && showPrevious) {
                        // Previous month on left - mobile: tighter overlap, desktop: normal flow
                        positionClass = 'absolute -left-3 sm:relative z-0 sm:z-auto';
                      } else if (!isActive && showNext) {
                        // Next month on right - mobile: tighter overlap, desktop: normal flow
                        positionClass = 'absolute -right-3 sm:relative z-0 sm:z-auto';
                      } else {
                        // Active month - always centered
                        positionClass = 'relative z-10 sm:z-auto';
                      }

                      return (
                        <motion.button
                          key={month.label}
                          initial={{ opacity: 0, x: direction * 100 }}
                          animate={{ opacity: isActive ? 1 : 0.6, x: 0 }}
                          exit={{ opacity: 0, x: direction * -100 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          onClick={() => setActiveMonthTab(idx)}
                          className={`${positionClass} sm:relative sm:z-auto w-28 sm:w-40 h-16 sm:h-28 rounded-lg border font-medium flex flex-col items-center justify-center flex-shrink-0 ${
                            isActive
                              ? 'bg-purple-600 text-white border-purple-600 shadow-lg scale-100'
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
                    
                    {/* Dummy placeholder on the right (when at oldest month) */}
                    {activeMonthTab === months.length - 1 && (
                      <motion.div
                        key="past-dummy"
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

              {/* Right Arrow - Go to Next Month in Carousel (Older - Higher Index) */}
              <button
                onClick={() => {
                  setDirection(1); // Animate from right
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
          </div>

          {/* 1. BUDGET PERFORMANCE - Most Important */}
          <div className="mb-8">
            {/* Desktop version - compact 2x2 grid layout */}
            <div className="max-md:hidden">
              <BudgetOverview selectedMonth={selectedMonthDate} isCompact={true} />
            </div>
            
            {/* Mobile/Tablet version - full layout */}
            <div className="md:hidden">
              <BudgetOverview selectedMonth={selectedMonthDate} isCompact={false} />
            </div>
          </div>

          {/* 2. BUDGET CATEGORY BREAKDOWN - Second Priority */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Expenses by Category</h2>
              {monthCategoryData.length > 0 ? (
                <>
                  {/* Desktop Layout - Chart slides left when category selected */}
                  <div className="max-md:hidden">
                    <div className="flex gap-6">
                      {/* Chart Container - slides to left when category selected */}
                      <motion.div
                        animate={{
                          width: selectedDesktopCategory ? '40%' : '100%'
                        }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="flex-shrink-0"
                      >
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={monthCategoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={false}
                              outerRadius={90}
                              innerRadius={0}
                              fill="#8884d8"
                              dataKey="amount"
                              onMouseDown={(data: any, index: number) => {
                                console.log('Pie onMouseDown:', data, index, monthCategoryData[index]);
                                if (monthCategoryData[index]) {
                                  setSelectedDesktopCategory(monthCategoryData[index].category);
                                }
                              }}
                            >
                              {monthCategoryData.map((entry, index) => {
                                const colors = getCategoryColor(entry.category, 'expense', budgetConfig);
                                return (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={colors.hexColor}
                                    cursor="pointer"
                                  />
                                );
                              })}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: any, _name: any, props: any) => [
                                formatCurrency(value as number),
                                props.payload.category
                              ]}
                              labelFormatter={() => ''}
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                              wrapperStyle={{
                                animation: 'fadeIn 0.2s ease-in'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </motion.div>

                      {/* Transaction List - appears when category selected */}
                      <AnimatePresence>
                        {selectedDesktopCategory && (
                          <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="flex-1 border-l pl-4 pr-2"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {selectedDesktopCategory} Transactions
                              </h3>
                              <button
                                onClick={() => setSelectedDesktopCategory(null)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            {(() => {
                              const categoryTransactions = monthTransactions
                                .filter(t => t.type === 'expense' && t.category === selectedDesktopCategory)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, 5);

                              const totalTransactions = monthTransactions
                                .filter(t => t.type === 'expense' && t.category === selectedDesktopCategory).length;

                              return (
                                <>
                                  <div className="space-y-1.5">
                                    {categoryTransactions.map((transaction) => (
                                      <div
                                        key={transaction.id}
                                        className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => setEditingTransaction(transaction)}
                                      >
                                        <div className="flex-1 min-w-0 text-sm text-gray-900 truncate">
                                          {transaction.description}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900 ml-3 flex-shrink-0">
                                          {formatCurrency(transaction.amount)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Button container with fixed height to prevent layout shift */}
                                  <div className="mt-4 min-h-[40px]">
                                    {totalTransactions > 5 && (
                                      <button
                                        onClick={() => setIsCategoryModalOpen(true)}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                      >
                                        See All {selectedDesktopCategory} Expenses ({totalTransactions})
                                      </button>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Mobile Layout - Original tap behavior */}
                  <div className="md:hidden">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={monthCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={90}
                          innerRadius={0}
                          fill="#8884d8"
                          dataKey="amount"
                          onClick={(data) => {
                            const totalAmount = monthCategoryData.reduce((sum, cat) => sum + cat.amount, 0);
                            const percentage = ((data.amount / totalAmount) * 100).toFixed(1);
                            setFocusedCategory({
                              category: data.category,
                              amount: data.amount,
                              percentage
                            });
                          }}
                        >
                          {monthCategoryData.map((entry, index) => {
                            const colors = getCategoryColor(entry.category, 'expense', budgetConfig);
                            return (
                              <Cell key={`cell-${index}`} fill={colors.hexColor} />
                            );
                          })}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: any, _name: any, props: any) => [
                            formatCurrency(value as number),
                            props.payload.category
                          ]}
                          labelFormatter={() => ''}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  
                    {/* Mobile-only: Focused Category Display */}
                    {focusedCategory ? (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">
                            {focusedCategory.category}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {focusedCategory.percentage}% of expenses
                          </div>
                          <div className="text-xl font-bold text-blue-600 mt-2">
                            {formatCurrency(focusedCategory.amount)}
                          </div>
                        </div>
                        <button
                          onClick={() => setFocusedCategory(null)}
                          className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700"
                        >
                          Tap another category or click here to clear
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border text-center text-sm text-gray-500">
                        Tap on a category above to see details
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-12">No expense data available</p>
              )}
            </div>
          </div>

          {/* Family Members - Quick Access */}
          <div className="mb-8">
            <button
              onClick={() => setIsFamilyMembersModalOpen(true)}
              className="bg-white rounded-lg shadow-sm border p-4 w-full hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Family Members</p>
                    <p className="text-xs text-gray-500">Click to manage family members</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-600">{familyMembers.length}</p>
              </div>
            </button>
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
            <div className="grid gap-4">
              {
                (() => {
                  let filtered = getTransactionsForMonth(months[activeMonthTab].start, months[activeMonthTab].end);
                  if (transactionTypeFilter !== 'all') {
                    filtered = filtered.filter(t => t.type === transactionTypeFilter);
                  }
                  return filtered.length > 0 ? (
                    filtered.map(t => {
                      const categoryColors = getCategoryColor(t.category, t.type, budgetConfig);
                      return (
                        <div key={t.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <span 
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                                  style={{
                                    backgroundColor: categoryColors.bg,
                                    borderColor: categoryColors.border,
                                    color: categoryColors.text
                                  }}
                                >
                                  {t.category}
                                </span>
                              </div>
                              {t.description && (
                                <div className="text-sm text-gray-700 mb-2">{t.description}</div>
                              )}
                              <div className="text-sm text-gray-500">
                                {new Date(t.date).toLocaleDateString()} 
                                {t.familyMember && ` • ${familyMembers.find(m => m.id === t.familyMember)?.name || 'Unknown'}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                              </div>
                              <button
                                onClick={() => setEditingTransaction(t)}
                                className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                title="Edit transaction"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500 text-center py-8">No transactions for this month</div>
                  );
                })()
              }
            </div>
          </div>
        </div>
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
      {isCategoryModalOpen && selectedDesktopCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedDesktopCategory} Expenses
                  </h2>
                  <p className="text-blue-100 mt-1">
                    All transactions in this category
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setSelectedDesktopCategory(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {(() => {
                const categoryTransactions = monthTransactions
                  .filter((t: Transaction) => 
                    t.type === 'expense' && t.category === selectedDesktopCategory
                  )
                  .sort((a: Transaction, b: Transaction) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  );

                const categoryTotal = categoryTransactions.reduce(
                  (sum: number, t: Transaction) => sum + t.amount,
                  0
                );

                const categoryAverage = categoryTransactions.length > 0
                  ? categoryTotal / categoryTransactions.length
                  : 0;

                return (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {categoryTransactions.length}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(categoryTotal)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-1">Average</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(categoryAverage)}
                        </p>
                      </div>
                    </div>

                    {/* Transactions List */}
                    {categoryTransactions.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No transactions found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {categoryTransactions.map((transaction: Transaction) => (
                          <motion.div
                            key={transaction.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setIsCategoryModalOpen(false);
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">
                                  {transaction.description}
                                </h4>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                  <span>
                                    {new Date(transaction.date).toLocaleDateString()}
                                  </span>
                                  {transaction.familyMember && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {getFamilyMemberName(transaction.familyMember)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-red-600">
                                  -{formatCurrency(transaction.amount)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
