import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useActiveBudget } from '../hooks/useBudgets';
import { useDashboardData } from '../hooks/useDashboardData';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import { MonthCarousel } from '../components/transactions/MonthCarousel';
import { TransactionFilters } from '../components/dashboard/TransactionFilters';
import { TransactionsList } from '../components/dashboard/TransactionsList';
import EditTransactionModal from '../components/EditTransactionModal';
import { formatCurrencyFromSettings } from '../utils/formatCurrency';
import { getHeadingColor, getSubheadingColor } from '../utils/themeColors';
import type { Transaction } from '../types';

/**
 * Transactions Page
 * Standalone page for browsing and filtering transaction history
 * Features month carousel, multi-dimensional filtering, and transaction editing
 */
export const Transactions: React.FC = () => {
  const { transactions, familyMembers } = useFinance();
  const { data: personalBudget } = useActiveBudget();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Initialize with month index from filter hook
  const [monthIndex, setMonthIndex] = useState(0);
  
  // Get month data using dashboard data hook
  const {
    months,
    monthCategoryData,
    getTransactionsForMonth,
  } = useDashboardData({
    transactions,
    familyMembers,
    budgetConfig: null,
    activeMonthIndex: monthIndex,
  });
  
  // Use transaction filters hook for state management and filtering
  const {
    filteredTransactions,
    filters,
    setTypeFilter,
    setMemberFilter,
    setMonthFilter,
    setCategoryFilter,
    setMonthIndex: updateMonthIndex,
    resetFiltersExceptMonth,
  } = useTransactionFilters({
    transactions,
    months,
    getTransactionsForMonth,
    initialMonthIndex: 0,
  });
  
  // Sync month index between hook and local state
  const handleMonthIndexChange = (idx: number) => {
    setMonthIndex(idx);
    updateMonthIndex(idx);
    resetFiltersExceptMonth();
  };
  
  // Format currency using budget settings
  const formatCurrency = (amount: number) => {
    return formatCurrencyFromSettings(amount, personalBudget?.global_settings);
  };
  
  // Extract unique categories from current month data for filter dropdown
  const availableCategories = useMemo(() => {
    return monthCategoryData.map(c => c.category).sort();
  }, [monthCategoryData]);
  
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${getHeadingColor('blue')} mb-2`}>
          Transactions
        </h1>
        <p className={getSubheadingColor('blue')}>
          View and manage your transaction history
        </p>
      </div>
      
      {/* Transaction Overview Section */}
      <div className="mb-8">
        {/* Month Carousel */}
        <MonthCarousel
          months={months}
          activeIndex={monthIndex}
          onIndexChange={handleMonthIndexChange}
        />

        {/* Transaction Filters */}
        <TransactionFilters
          typeFilter={filters.type}
          memberFilter={filters.member}
          monthFilter={filters.month}
          categoryFilter={filters.category}
          familyMembers={familyMembers}
          categories={availableCategories}
          months={months}
          activeMonthIndex={monthIndex}
          onTypeChange={setTypeFilter}
          onMemberChange={setMemberFilter}
          onMonthChange={(month, monthIndex) => {
            setMonthFilter(month, monthIndex);
            // Sync carousel if month index provided
            if (monthIndex !== undefined) {
              setMonthIndex(monthIndex);
            }
          }}
          onCategoryChange={setCategoryFilter}
          onMoreClick={() => {
            // Future: Open advanced filters modal
          }}
        />

        {/* Transactions List */}
        <TransactionsList
          transactions={filteredTransactions}
          familyMembers={familyMembers}
          personalBudget={personalBudget}
          formatCurrency={formatCurrency}
          onEditTransaction={setEditingTransaction}
          emptyMessage="No transactions match your filters"
        />
      </div>

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
