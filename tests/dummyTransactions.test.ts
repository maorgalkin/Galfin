import { describe, it, expect } from 'vitest';
import { generateDummyTransactions } from '../src/utils/dummyData';
import type { Transaction } from '../src/types';

// Example test suite for dummy transactions generator

describe('generateDummyTransactions', () => {
  const monthStart = new Date('2025-01-01');
  const monthEnd = new Date('2025-01-31');
  const memberIds = ['member1', 'member2'];
  const dummyTransactions = generateDummyTransactions(monthStart, monthEnd, memberIds);

  it('should generate transactions with both income and expense types', () => {
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

  it('should have valid date strings within the specified range', () => {
    dummyTransactions.forEach(t => {
      expect(typeof t.date).toBe('string');
      const date = new Date(t.date);
      expect(date.toString()).not.toBe('Invalid Date');
      expect(date >= monthStart && date <= monthEnd).toBe(true);
    });
  });

  it('should mark all transactions with [DUMMY] prefix in description', () => {
    dummyTransactions.forEach(t => {
      expect(t.description).toContain('[DUMMY]');
    });
  });
});

// Add more describe blocks for other modules/features as you expand coverage
