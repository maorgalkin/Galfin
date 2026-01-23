/**
 * Transaction Filtering Utilities
 * Pure functions for filtering transactions based on various criteria
 * Extracted from Dashboard.tsx to enable reusability and testing
 */

import type { Transaction } from '../types';

export interface TransactionFilterState {
  type: 'all' | 'income' | 'expense';
  member: string; // 'all' or member ID
  month: string; // 'carousel-N' or 'YYYY-MM' format
  category: string; // 'all' or category name
}

export interface MonthData {
  label: string;
  monthName: string;
  year: string;
  start: Date;
  end: Date;
}

/**
 * Apply month filter to transactions
 * Supports two formats:
 * - 'carousel-N': Use month from carousel array at index N
 * - 'YYYY-MM': Parse year and month directly
 */
export function filterByMonth(
  transactions: Transaction[],
  monthFilter: string,
  months: MonthData[],
  getTransactionsForMonth: (start: Date, end: Date) => Transaction[]
): Transaction[] {
  if (monthFilter.startsWith('carousel-')) {
    // Extract carousel index and get transactions for that month
    const index = parseInt(monthFilter.split('-')[1], 10);
    if (index < 0 || index >= months.length) {
      return [];
    }
    return getTransactionsForMonth(months[index].start, months[index].end);
  } else {
    // Parse YYYY-MM format for older months
    const parts = monthFilter.split('-');
    if (parts.length !== 2) {
      return transactions; // Invalid format, return all
    }
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    
    if (isNaN(year) || isNaN(month)) {
      return transactions; // Invalid numbers, return all
    }
    
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });
  }
}

/**
 * Apply transaction type filter (income/expense)
 */
export function filterByType(
  transactions: Transaction[],
  typeFilter: 'all' | 'income' | 'expense'
): Transaction[] {
  if (typeFilter === 'all') {
    return transactions;
  }
  return transactions.filter(t => t.type === typeFilter);
}

/**
 * Apply family member filter
 */
export function filterByMember(
  transactions: Transaction[],
  memberFilter: string
): Transaction[] {
  if (memberFilter === 'all') {
    return transactions;
  }
  return transactions.filter(t => t.familyMember === memberFilter);
}

/**
 * Apply category filter
 */
export function filterByCategory(
  transactions: Transaction[],
  categoryFilter: string
): Transaction[] {
  if (categoryFilter === 'all') {
    return transactions;
  }
  return transactions.filter(t => t.category === categoryFilter);
}

/**
 * Apply all filters to transaction list
 * This is the main entry point that orchestrates all filters
 */
export function applyTransactionFilters(
  transactions: Transaction[],
  filters: TransactionFilterState,
  months: MonthData[],
  getTransactionsForMonth: (start: Date, end: Date) => Transaction[]
): Transaction[] {
  // Apply filters in sequence
  let filtered = filterByMonth(transactions, filters.month, months, getTransactionsForMonth);
  filtered = filterByType(filtered, filters.type);
  filtered = filterByMember(filtered, filters.member);
  filtered = filterByCategory(filtered, filters.category);
  
  return filtered;
}

/**
 * Create initial filter state
 */
export function createInitialFilterState(initialMonthIndex: number = 0): TransactionFilterState {
  return {
    type: 'all',
    member: 'all',
    month: `carousel-${initialMonthIndex}`,
    category: 'all',
  };
}

/**
 * Reset all filters except month
 * Useful when changing months in the carousel
 */
export function resetFiltersExceptMonth(
  _currentFilters: TransactionFilterState,
  newMonthFilter: string
): TransactionFilterState {
  return {
    type: 'all',
    member: 'all',
    month: newMonthFilter,
    category: 'all',
  };
}
