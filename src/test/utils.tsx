import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { FinanceProvider } from '../context/FinanceContext';
import type { Transaction, FamilyMember } from '../types';
import { dummyTransactions } from './dummyTransactions';

// Test data generators
export const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: Date.now().toString(),
  date: '2025-08-21',
  description: 'Test Transaction',
  category: 'Test Category',
  amount: 100,
  type: 'expense',
  familyMember: 'Test Member',
  ...overrides,
});

export const createMockFamilyMember = (overrides: Partial<FamilyMember> = {}): FamilyMember => ({
  id: Date.now().toString(),
  name: 'Test Member',
  color: '#3B82F6',
  ...overrides,
});

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialTransactions?: Transaction[];
}

export const renderWithProvider = (
  ui: React.ReactElement,
  { initialTransactions = [], ...renderOptions }: CustomRenderOptions = {}
) => {
  // Pre-populate localStorage if initial transactions provided
  if (initialTransactions.length > 0) {
    localStorage.setItem('galfin-transactions', JSON.stringify(initialTransactions));
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <FinanceProvider>{children}</FinanceProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Test data sets - use actual dummy data from JSON
export const sampleTransactions: Transaction[] = dummyTransactions.slice(0, 10); // First 10 transactions

// Get transactions by month helper
export const getTransactionsByMonth = (month: number, year: number): Transaction[] => {
  return dummyTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate.getMonth() === month - 1 && transactionDate.getFullYear() === year;
  });
};

// Pre-defined month data
export const augustTransactions = getTransactionsByMonth(8, 2025);
export const julyTransactions = getTransactionsByMonth(7, 2025);
export const juneTransactions = getTransactionsByMonth(6, 2025);

export const largeTransactionDataset = (count: number): Transaction[] => {
  const transactions: Transaction[] = [];
  const categories = ['Groceries', 'Entertainment', 'Transport', 'Healthcare'];
  const types: ('income' | 'expense')[] = ['income', 'expense'];
  const members = ['John', 'Jane', 'Mike', 'Sarah'];

  for (let i = 0; i < count; i++) {
    transactions.push(createMockTransaction({
      id: `transaction-${i}`,
      description: `Transaction ${i + 1}`,
      amount: Math.floor(Math.random() * 1000) + 10,
      type: types[Math.floor(Math.random() * types.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      familyMember: members[Math.floor(Math.random() * members.length)],
      date: new Date(2025, 7, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    }));
  }

  return transactions;
};

// Helper functions for common test scenarios
export const addTransactionViaUI = async (user: any, transactionData: Partial<Transaction>) => {
  const {
    description = 'Test Transaction',
    amount = 100,
    type = 'expense',
    category = 'Groceries',
    familyMember,
    date = '2025-08-21',
  } = transactionData;

  // Fill out the form
  if (description) {
    await user.type(screen.getByPlaceholderText(/Enter transaction description/i), description);
  }
  
  if (amount) {
    await user.type(screen.getByPlaceholderText(/0.00/i), amount.toString());
  }
  
  if (type) {
    await user.selectOptions(screen.getByLabelText(/Type/i), type);
  }
  
  if (category) {
    await user.selectOptions(screen.getByLabelText(/Category/i), category);
  }
  
  if (familyMember) {
    await user.selectOptions(screen.getByLabelText(/Family Member/i), familyMember);
  }
  
  if (date) {
    await user.clear(screen.getByLabelText(/Date/i));
    await user.type(screen.getByLabelText(/Date/i), date);
  }

  // Submit the form
  await user.click(screen.getByText(/Submit/i));
};
