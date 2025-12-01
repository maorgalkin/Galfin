/**
 * Integration Test Suite 3: Transactions
 * =======================================
 * 
 * Tests income and expense transaction creation.
 * 
 * Scenarios covered:
 * 1. Create income transactions
 * 2. Create expense transactions
 * 3. Verify transaction totals
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupIntegrationTests,
  createTestUser,
  signInAsTestUser,
  signOut,
  TestUser,
  getCurrentUserId,
} from '../setup';
import {
  createStandardTestBudget,
  TestPersonalBudget,
} from '../helpers/testBudget';
import {
  createIncome,
  createExpenseByName,
  getHouseholdTransactions,
  getCategorySpendingByName,
  getMonthlyIncome,
  getMonthlyExpenses,
  TestTransaction,
} from '../helpers/testTransaction';

// Initialize test clients and cleanup
setupIntegrationTests();

describe('Suite 3: Transactions', () => {
  let testUser: TestUser;
  let budget: TestPersonalBudget;
  const GROCERIES_CATEGORY = 'Groceries';

  beforeAll(async () => {
    // Create user, sign in, and create budget
    testUser = await createTestUser();
    await signInAsTestUser(testUser);
    budget = await createStandardTestBudget();
  });

  describe('Scenario 1: Create income transactions', () => {
    let incomeTransaction: TestTransaction;

    it('should create an income transaction', async () => {
      // Act
      incomeTransaction = await createIncome(5000, 'Salary');

      // Assert
      expect(incomeTransaction).toBeDefined();
      expect(incomeTransaction.id).toBeTruthy();
      expect(incomeTransaction.type).toBe('income');
      expect(incomeTransaction.amount).toBe(5000);
    });

    it('should have correct user and household IDs', async () => {
      // Arrange
      const userId = await getCurrentUserId();

      // Assert
      expect(incomeTransaction.user_id).toBe(userId);
      expect(incomeTransaction.household_id).toBe(budget.household_id);
    });

    it('should appear in household transactions', async () => {
      // Act
      const transactions = await getHouseholdTransactions();

      // Assert
      const found = transactions.find(t => t.id === incomeTransaction.id);
      expect(found).toBeDefined();
      expect(found?.amount).toBe(5000);
    });

    it('should update monthly income total', async () => {
      // Act
      const monthlyIncome = await getMonthlyIncome();

      // Assert
      expect(monthlyIncome).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('Scenario 2: Create expense transactions', () => {
    let expenseTransaction: TestTransaction;

    it('should create an expense transaction with category', async () => {
      // Act
      expenseTransaction = await createExpenseByName(
        150,
        GROCERIES_CATEGORY,
        'Weekly groceries'
      );

      // Assert
      expect(expenseTransaction).toBeDefined();
      expect(expenseTransaction.id).toBeTruthy();
      expect(expenseTransaction.type).toBe('expense');
      expect(expenseTransaction.amount).toBe(150);
    });

    it('should have correct date', async () => {
      // Assert - date should be today
      const today = new Date().toISOString().split('T')[0];
      expect(expenseTransaction.date).toBe(today);
    });

    it('should appear in household transactions', async () => {
      // Act
      const transactions = await getHouseholdTransactions();

      // Assert
      const found = transactions.find(t => t.id === expenseTransaction.id);
      expect(found).toBeDefined();
    });

    it('should update category spending', async () => {
      // Act
      const spending = await getCategorySpendingByName(GROCERIES_CATEGORY);

      // Assert
      expect(spending).toBeGreaterThanOrEqual(150);
    });
  });

  describe('Scenario 3: Verify transaction totals', () => {
    beforeAll(async () => {
      // Create a few more transactions for totals testing
      await createIncome(1000, 'Bonus');
      await createExpenseByName(50, GROCERIES_CATEGORY, 'More groceries');
      await createExpenseByName(25, GROCERIES_CATEGORY, 'Snacks');
    });

    it('should calculate correct monthly income', async () => {
      // Act
      const income = await getMonthlyIncome();

      // Assert - should include 5000 + 1000 = 6000 (minimum)
      expect(income).toBeGreaterThanOrEqual(6000);
    });

    it('should calculate correct monthly expenses', async () => {
      // Act
      const expenses = await getMonthlyExpenses();

      // Assert - should include 150 + 50 + 25 = 225 (minimum)
      expect(expenses).toBeGreaterThanOrEqual(225);
    });

    it('should calculate correct category spending', async () => {
      // Act
      const spending = await getCategorySpendingByName(GROCERIES_CATEGORY);

      // Assert - should include 150 + 50 + 25 = 225 (minimum)
      expect(spending).toBeGreaterThanOrEqual(225);
    });

    it('should have all transactions in household', async () => {
      // Act
      const transactions = await getHouseholdTransactions();

      // Assert - at least 5 transactions created in this test
      expect(transactions.length).toBeGreaterThanOrEqual(5);
    });
  });

  afterAll(async () => {
    await signOut();
  });
});
