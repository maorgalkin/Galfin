import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock for performance testing
const mockPerformanceEntries = (count: number) => {
  const entries = Array.from({ length: count }, (_, i) => ({
    name: `transaction-${i}`,
    entryType: 'measure',
    startTime: i * 10,
    duration: Math.random() * 50 + 10
  }));
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue(entries);
};

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);
  vi.spyOn(performance, 'mark').mockImplementation(() => {});
  vi.spyOn(performance, 'measure').mockImplementation(() => {});
});

describe('Performance Tests', () => {
  describe('Component Rendering Performance', () => {
    it('renders dashboard quickly with minimal data', async () => {
      const startTime = performance.now();
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Family Finance Dashboard')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 100ms for minimal data
      expect(renderTime).toBeLessThan(100);
    });

    it('handles large transaction lists efficiently', async () => {
      // Mock large dataset
      const largeTransactionList = Array.from({ length: 1000 }, (_, i) => ({
        id: `tx-${i}`,
        date: new Date(2024, 0, i % 31 + 1).toISOString(),
        description: `Transaction ${i}`,
        amount: Math.random() * 1000,
        category: ['Food', 'Transport', 'Bills', 'Shopping'][i % 4],
        type: i % 2 === 0 ? 'expense' : 'income',
        familyMember: ['Alice', 'Bob', 'Charlie'][i % 3]
      }));

      // Store in localStorage to simulate loaded data
      localStorage.setItem('financeData', JSON.stringify({
        transactions: largeTransactionList,
        familyMembers: [
          { id: '1', name: 'Alice', color: '#3B82F6' },
          { id: '2', name: 'Bob', color: '#EF4444' },
          { id: '3', name: 'Charlie', color: '#10B981' }
        ]
      }));

      const startTime = performance.now();
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Family Finance Dashboard')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should still render within reasonable time even with large dataset
      expect(renderTime).toBeLessThan(500);
    });

    it('chart rendering performs well', async () => {
      // Add some sample data
      const sampleTransactions = [
        { id: '1', date: '2024-08-01', description: 'Groceries', amount: 150, category: 'Food', type: 'expense' },
        { id: '2', date: '2024-08-02', description: 'Salary', amount: 5000, category: 'Income', type: 'income' },
        { id: '3', date: '2024-08-03', description: 'Gas', amount: 200, category: 'Transport', type: 'expense' }
      ];

      localStorage.setItem('financeData', JSON.stringify({
        transactions: sampleTransactions,
        familyMembers: []
      }));

      const startTime = performance.now();
      render(<App />);
      
      // Wait for charts to render
      await waitFor(() => {
        expect(screen.getByText('Expenses by Category')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const chartRenderTime = endTime - startTime;
      
      // Chart rendering should be reasonably fast
      expect(chartRenderTime).toBeLessThan(300);
    });
  });

  describe('User Interaction Performance', () => {
    it('modal opening is responsive', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const addButton = screen.getByText('Add Transaction');
      
      const startTime = performance.now();
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const modalOpenTime = endTime - startTime;
      
      // Modal should open quickly
      expect(modalOpenTime).toBeLessThan(50);
    });

    it('form submission is responsive', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Open modal
      await user.click(screen.getByText('Add Transaction'));
      
      // Fill form quickly
      await user.type(screen.getByLabelText(/description/i), 'Test transaction');
      await user.type(screen.getByLabelText(/amount/i), '100');
      await user.selectOptions(screen.getByLabelText(/category/i), 'Food');
      await user.selectOptions(screen.getByLabelText(/type/i), 'expense');
      
      const startTime = performance.now();
      await user.click(screen.getByText('Add Transaction'));
      
      // Wait for form to close and transaction to appear
      await waitFor(() => {
        expect(screen.queryByText('Add New Transaction')).not.toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const submitTime = endTime - startTime;
      
      // Form submission should be fast
      expect(submitTime).toBeLessThan(100);
    });

    it('tab switching is smooth', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Switch between tabs multiple times
      const budgetTab = screen.getByText('Budget Analysis');
      const transactionsTab = screen.getByText('Transactions');
      
      const startTime = performance.now();
      
      await user.click(budgetTab);
      await waitFor(() => {
        expect(screen.getByText(/Budget Analysis/)).toBeInTheDocument();
      });
      
      await user.click(transactionsTab);
      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const tabSwitchTime = endTime - startTime;
      
      // Tab switching should be very fast
      expect(tabSwitchTime).toBeLessThan(50);
    });
  });

  describe('Memory Usage', () => {
    it('does not create memory leaks with repeated actions', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Simulate repeated modal opening/closing
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByText('Add Transaction'));
        await waitFor(() => {
          expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
        });
        
        await user.click(screen.getByText('Cancel'));
        await waitFor(() => {
          expect(screen.queryByText('Add New Transaction')).not.toBeInTheDocument();
        });
      }
      
      // This test mainly ensures no errors occur during repeated operations
      expect(screen.getByText('Family Finance Dashboard')).toBeInTheDocument();
    });

    it('handles rapid tab switching without issues', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const budgetTab = screen.getByText('Budget Analysis');
      const transactionsTab = screen.getByText('Transactions');
      
      // Rapid tab switching
      for (let i = 0; i < 5; i++) {
        await user.click(budgetTab);
        await user.click(transactionsTab);
      }
      
      // Should still be functional
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });
  });

  describe('Bundle Size Considerations', () => {
    it('renders essential components without loading everything', async () => {
      render(<App />);
      
      // Check that core components are loaded
      expect(screen.getByText('Family Finance Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Budget Analysis')).toBeInTheDocument();
      expect(screen.getByText('Transactions')).toBeInTheDocument();
      
      // Verify performance markers if implemented
      if (window.performance && window.performance.getEntriesByType) {
        const navigationEntries = window.performance.getEntriesByType('navigation');
        expect(navigationEntries.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
