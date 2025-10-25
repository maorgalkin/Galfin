import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { getCategoryColor } from '../utils/categoryColors';
import { ArrowLeft, Calendar, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EditTransactionModal from '../components/EditTransactionModal';
import type { Transaction } from '../types';

function getMonthLabel(date: Date) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function getMonthName(date: Date) {
  return date.toLocaleString('en-US', { month: 'long' });
}

function getYear(date: Date) {
  return date.getFullYear().toString();
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

const OlderTransactions: React.FC = () => {
  const { transactions, familyMembers } = useFinance();
  const navigate = useNavigate();
  const now = new Date();
  
  // Generate last 4 months for quick access
  const recentMonths = [0, 1, 2, 3].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return {
      label: getMonthLabel(d),
      monthName: getMonthName(d),
      year: getYear(d),
      start: getMonthStart(d),
      end: getMonthEnd(d),
    };
  });

  // Generate all months for the past 2 years
  const allMonths = Array.from({ length: 24 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return {
      label: getMonthLabel(d),
      start: getMonthStart(d),
      end: getMonthEnd(d),
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  const [activeTab, setActiveTab] = useState(0);
  const [direction, setDirection] = useState(0); // Track animation direction: -1 (left), 1 (right)
  const [showEarlier, setShowEarlier] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  const filtered = (start: Date, end: Date) =>
    transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

  const getFilteredEarlierTransactions = () => {
    let filtered = transactions;

    // Filter by selected month if specified
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      filtered = filtered.filter(t => {
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
      });
    } else {
      // Filter to show transactions older than 4 months
      const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      filtered = filtered.filter(t => new Date(t.date) < fourMonthsAgo);
    }

    // Filter by transaction type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(t => {
        const memberName = t.familyMember ? familyMembers.find(m => m.id === t.familyMember)?.name : '';
        return (
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          memberName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Older Transactions</h1>
        <button
          onClick={() => navigate('/')}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
      </div>
      
      {/* Month Carousel Navigation */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 w-full max-w-6xl mx-auto px-4">
        {/* Left Arrow - Go to Previous Month in Carousel (Newer - Lower Index) */}
        <button
          onClick={() => {
            setDirection(-1); // Animate from left
            setActiveTab(activeTab - 1);
            setShowEarlier(false);
          }}
          disabled={activeTab <= 0}
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
              {/* Dummy placeholder on the left (when at current month) */}
              {activeTab === 0 && (
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
              
              {recentMonths.map((month, idx) => {
                const isActive = idx === activeTab;
                
                // Calculate visibility based on position relative to active month
                const showPrevious = idx === activeTab - 1 && activeTab > 0;
                const showNext = idx === activeTab + 1 && activeTab < recentMonths.length - 1;
                const isVisible = isActive || showPrevious || showNext;

                if (!isVisible) return null;

                // Mobile: Tighter overlap with absolute positioning
                // Desktop: Normal flexbox flow with gap spacing
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
                      setActiveTab(idx);
                      setShowEarlier(false);
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
              
              {/* Dummy placeholder on the right (when at oldest month) */}
              {activeTab === recentMonths.length - 1 && (
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
            setActiveTab(activeTab + 1);
            setShowEarlier(false);
          }}
          disabled={activeTab >= recentMonths.length - 1}
          className="flex-shrink-0 p-2 sm:p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Older Month"
        >
          <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Earlier (2 Years) Button */}
      <div className="flex justify-center mb-6">
        <button
          className={`px-6 py-3 rounded-md border font-medium transition-all ${showEarlier ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
          onClick={() => setShowEarlier(true)}
        >
          <Calendar className="inline h-5 w-5 mr-2" />
          Earlier (2 Years)
        </button>
      </div>

      {!showEarlier ? (
        <div className="grid gap-4">
          {filtered(recentMonths[activeTab].start, recentMonths[activeTab].end).length > 0 ? (
            filtered(recentMonths[activeTab].start, recentMonths[activeTab].end).map(t => {
              const categoryColors = getCategoryColor(t.category, t.type);
              return (
                <div key={t.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${categoryColors.bg} ${categoryColors.border} ${categoryColors.text} border`}>
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
                    <div className={`font-bold text-lg ml-4 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-500 text-center py-8">No transactions for this month</div>
          )}
        </div>
      ) : (
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Search Transactions (Past 2 Years)
            </h2>
            
            <div className="flex flex-col sm:grid sm:grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Month Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All months (older than 4 months)</option>
                  {allMonths.slice(4).map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All transactions</option>
                  <option value="income">Income only</option>
                  <option value="expense">Expenses only</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Description, category, or family member"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Filtered Results */}
          <div className="grid gap-4">
            {getFilteredEarlierTransactions().length > 0 ? (
              getFilteredEarlierTransactions().map(t => {
                const categoryColors = getCategoryColor(t.category, t.type);
                return (
                  <div key={t.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${categoryColors.bg} ${categoryColors.border} ${categoryColors.text} border`}>
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
              <div className="text-gray-500 text-center py-8">
                No transactions found for the selected criteria
              </div>
            )}
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
    </div>
  );
};

export default OlderTransactions;
