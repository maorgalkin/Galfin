import { describe, it, expect } from 'vitest';
import { dummyTransactions } from '../src/test/dummyTransactions';
import type { Transaction } from '../src/types';

// Example test suite for dummy transactions

describe('dummyTransactions', () => {
  it('should contain at least one income and one expense', () => {
    const hasIncome = dummyTransactions.some(t => t.type === 'income');
    const hasExpense = dummyTransactions.some(t => t.type === 'expense');
    expect(hasIncome).toBe(true);
    expect(hasExpense).toBe(true);
  });

  it('should have valid amount values', () => {
    dummyTransactions.forEach(t => {
      expect(typeof t.amount).toBe('number');
      expect(t.amount).toBeGreaterThan(0);
    });
  });

  it('should have valid date strings', () => {
    dummyTransactions.forEach(t => {
      expect(typeof t.date).toBe('string');
      expect(new Date(t.date).toString()).not.toBe('Invalid Date');
    });
  });
});

// Add more describe blocks for other modules/features as you expand coverage
