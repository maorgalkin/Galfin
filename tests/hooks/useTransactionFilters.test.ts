import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionFilters } from '../../src/hooks/useTransactionFilters';
import type { Transaction } from '../../src/types';
import type { MonthData } from '../../src/utils/transactionFilters';

// Helper to create mock transactions
const createTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'test-id',
  date: '2026-01-15',
  amount: 100,
  category: 'Groceries',
  type: 'expense',
  familyMember: 'member-1',
  description: 'Test transaction',
  ...overrides,
});

// Helper to create mock month data
const createMonthData = (year: number, month: number): MonthData => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  const monthName = start.toLocaleDateString('en-US', { month: 'long' });
  
  return {
    label: `${monthName} ${year}`,
    monthName,
    year: year.toString(),
    start,
    end,
  };
};

describe('useTransactionFilters', () => {
  const months = [
    createMonthData(2026, 0), // January 2026
    createMonthData(2025, 11), // December 2025
  ];
  
  const transactions = [
    createTransaction({ id: '1', date: '2026-01-10', type: 'expense', category: 'Groceries', familyMember: 'member-1' }),
    createTransaction({ id: '2', date: '2026-01-15', type: 'income', category: 'Salary', familyMember: 'member-1' }),
    createTransaction({ id: '3', date: '2026-01-20', type: 'expense', category: 'Entertainment', familyMember: 'member-2' }),
    createTransaction({ id: '4', date: '2025-12-25', type: 'expense', category: 'Groceries', familyMember: 'member-1' }),
  ];
  
  const getTransactionsForMonth = (start: Date, end: Date) => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  };
  
  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
      })
    );
    
    expect(result.current.filters).toEqual({
      type: 'all',
      member: 'all',
      month: 'carousel-0',
      category: 'all',
    });
    expect(result.current.monthIndex).toBe(0);
    expect(result.current.filteredTransactions).toHaveLength(3); // 3 transactions in Jan 2026
  });
  
  it('should initialize with custom month index', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
        initialMonthIndex: 1,
      })
    );
    
    expect(result.current.filters.month).toBe('carousel-1');
    expect(result.current.monthIndex).toBe(1);
    expect(result.current.filteredTransactions).toHaveLength(1); // 1 transaction in Dec 2025
  });
  
  it('should filter by type', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
      })
    );
    
    act(() => {
      result.current.setTypeFilter('expense');
    });
    
    expect(result.current.filters.type).toBe('expense');
    expect(result.current.filteredTransactions).toHaveLength(2);
    expect(result.current.filteredTransactions.every(t => t.type === 'expense')).toBe(true);
  });
  
  it('should filter by member', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
      })
    );
    
    act(() => {
      result.current.setMemberFilter('member-1');
    });
    
    expect(result.current.filters.member).toBe('member-1');
    expect(result.current.filteredTransactions).toHaveLength(2);
    expect(result.current.filteredTransactions.every(t => t.familyMember === 'member-1')).toBe(true);
  });
  
  it('should filter by category', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
      })
    );
    
    act(() => {
      result.current.setCategoryFilter('Groceries');
    });
    
    expect(result.current.filters.category).toBe('Groceries');
    expect(result.current.filteredTransactions).toHaveLength(1);
    expect(result.current.filteredTransactions[0].category).toBe('Groceries');
  });
  
  it('should change month index', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
      })
    );
    
    act(() => {
      result.current.setMonthIndex(1);
    });
    
    expect(result.current.monthIndex).toBe(1);
    expect(result.current.filters.month).toBe('carousel-1');
    expect(result.current.filteredTransactions).toHaveLength(1); // Dec 2025 transaction
  });
  
  it('should apply multiple filters in combination', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
      })
    );
    
    act(() => {
      result.current.setTypeFilter('expense');
      result.current.setMemberFilter('member-1');
      result.current.setCategoryFilter('Groceries');
    });
    
    expect(result.current.filteredTransactions).toHaveLength(1);
    expect(result.current.filteredTransactions[0].id).toBe('1');
  });
  
  it('should reset all filters', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
      })
    );
    
    // Apply some filters
    act(() => {
      result.current.setTypeFilter('expense');
      result.current.setMemberFilter('member-1');
      result.current.setCategoryFilter('Groceries');
    });
    
    // Reset
    act(() => {
      result.current.resetFilters();
    });
    
    expect(result.current.filters).toEqual({
      type: 'all',
      member: 'all',
      month: 'carousel-0',
      category: 'all',
    });
    expect(result.current.filteredTransactions).toHaveLength(3);
  });
  
  it('should reset filters except month', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
      })
    );
    
    // Apply filters and change month
    act(() => {
      result.current.setMonthIndex(1);
      result.current.setTypeFilter('expense');
      result.current.setMemberFilter('member-1');
      result.current.setCategoryFilter('Groceries');
    });
    
    // Reset except month
    act(() => {
      result.current.resetFiltersExceptMonth();
    });
    
    expect(result.current.filters).toEqual({
      type: 'all',
      member: 'all',
      month: 'carousel-1', // Month preserved
      category: 'all',
    });
    expect(result.current.monthIndex).toBe(1);
  });
  
  it('should handle setMonthFilter with explicit month string', () => {
    const { result } = renderHook(() =>
      useTransactionFilters({
        transactions,
        months,
        getTransactionsForMonth,
      })
    );
    
    act(() => {
      result.current.setMonthFilter('2025-12', 1);
    });
    
    expect(result.current.filters.month).toBe('2025-12');
    expect(result.current.monthIndex).toBe(1);
  });
  
  it('should update filteredTransactions when transactions change', () => {
    const { result, rerender } = renderHook(
      ({ transactions, getTransactionsForMonth }) =>
        useTransactionFilters({
          transactions,
          months,
          getTransactionsForMonth,
        }),
      {
        initialProps: { 
          transactions,
          getTransactionsForMonth: (start: Date, end: Date) => {
            return transactions.filter(t => {
              const d = new Date(t.date);
              return d >= start && d <= end;
            });
          },
        },
      }
    );
    
    expect(result.current.filteredTransactions).toHaveLength(3);
    
    // Add new transaction
    const newTransactions = [
      ...transactions,
      createTransaction({ id: '5', date: '2026-01-25', type: 'expense' }),
    ];
    
    const newGetTransactionsForMonth = (start: Date, end: Date) => {
      return newTransactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    };
    
    rerender({ 
      transactions: newTransactions,
      getTransactionsForMonth: newGetTransactionsForMonth,
    });
    
    expect(result.current.filteredTransactions).toHaveLength(4);
  });
});
