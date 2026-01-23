/**
 * Transaction Filters Hook
 * Manages filter state and orchestrates filter application
 * Provides a unified interface for transaction filtering across the app
 */

import { useState, useMemo, useCallback } from 'react';
import type { Transaction } from '../types';
import type { TransactionFilterState, MonthData } from '../utils/transactionFilters';
import {
  applyTransactionFilters,
  createInitialFilterState,
  resetFiltersExceptMonth as resetFiltersUtil,
} from '../utils/transactionFilters';

export interface UseTransactionFiltersOptions {
  transactions: Transaction[];
  months: MonthData[];
  getTransactionsForMonth: (start: Date, end: Date) => Transaction[];
  initialMonthIndex?: number;
}

export interface UseTransactionFiltersReturn {
  // Filtered results
  filteredTransactions: Transaction[];
  
  // Current filter state
  filters: TransactionFilterState;
  monthIndex: number;
  
  // Filter setters
  setTypeFilter: (type: 'all' | 'income' | 'expense') => void;
  setMemberFilter: (member: string) => void;
  setMonthFilter: (month: string, monthIndex?: number) => void;
  setCategoryFilter: (category: string) => void;
  setMonthIndex: (index: number) => void;
  
  // Utilities
  resetFilters: () => void;
  resetFiltersExceptMonth: () => void;
}

/**
 * Hook to manage transaction filtering state and logic
 * 
 * @example
 * const {
 *   filteredTransactions,
 *   filters,
 *   setTypeFilter,
 *   setMonthIndex,
 * } = useTransactionFilters({
 *   transactions,
 *   months,
 *   getTransactionsForMonth,
 *   initialMonthIndex: 0,
 * });
 */
export function useTransactionFilters({
  transactions,
  months,
  getTransactionsForMonth,
  initialMonthIndex = 0,
}: UseTransactionFiltersOptions): UseTransactionFiltersReturn {
  
  // Filter state
  const [filters, setFilters] = useState<TransactionFilterState>(() => 
    createInitialFilterState(initialMonthIndex)
  );
  
  // Track month carousel index separately for coordination
  const [monthIndex, setMonthIndexState] = useState(initialMonthIndex);
  
  // Apply filters to transactions (memoized for performance)
  const filteredTransactions = useMemo(() => {
    return applyTransactionFilters(
      transactions,
      filters,
      months,
      getTransactionsForMonth
    );
  }, [transactions, filters, months, getTransactionsForMonth]);
  
  // Filter setters (wrapped in useCallback to prevent unnecessary re-renders)
  const setTypeFilter = useCallback((type: 'all' | 'income' | 'expense') => {
    setFilters(prev => ({ ...prev, type }));
  }, []);
  
  const setMemberFilter = useCallback((member: string) => {
    setFilters(prev => ({ ...prev, member }));
  }, []);
  
  const setMonthFilter = useCallback((month: string, monthIndex?: number) => {
    setFilters(prev => ({ ...prev, month }));
    if (monthIndex !== undefined) {
      setMonthIndexState(monthIndex);
    }
  }, []);
  
  const setCategoryFilter = useCallback((category: string) => {
    setFilters(prev => ({ ...prev, category }));
  }, []);
  
  const setMonthIndex = useCallback((index: number) => {
    setMonthIndexState(index);
    setFilters(prev => ({ ...prev, month: `carousel-${index}` }));
  }, []);
  
  // Reset all filters to initial state
  const resetFilters = useCallback(() => {
    setFilters(createInitialFilterState(monthIndex));
  }, [monthIndex]);
  
  // Reset all filters except month (useful when changing months)
  const resetFiltersExceptMonth = useCallback(() => {
    setFilters(prev => resetFiltersUtil(prev, prev.month));
  }, []);
  
  return {
    filteredTransactions,
    filters,
    monthIndex,
    setTypeFilter,
    setMemberFilter,
    setMonthFilter,
    setCategoryFilter,
    setMonthIndex,
    resetFilters,
    resetFiltersExceptMonth,
  };
}
