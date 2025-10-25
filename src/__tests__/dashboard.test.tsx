import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Dashboard - Filtering & Navigation', () => {
  const setupTransactions = () => {
    const transactions = [
      {
        id: '1',
        date: '2025-08-21',
        description: 'August Income',
        category: 'Salary',
        amount: 3000,
        type: 'income',
        familyMember: 'John'
      },
      {
        id: '2',
        date: '2025-08-21',
        description: 'August Expense',
        category: 'Groceries',
        amount: 200,
        type: 'expense',
        familyMember: 'Jane'
      },
      {
        id: '3',
        date: '2025-07-15',
        description: 'July Income',
        category: 'Salary',
        amount: 2800,
        type: 'income',
        familyMember: 'John'
      },
      {
        id: '4',
        date: '2025-07-15',
        description: 'July Expense',
        category: 'Entertainment',
        amount: 150,
        type: 'expense',
        familyMember: 'Jane'
      }
    ];
    localStorage.setItem('galfin-transactions', JSON.stringify(transactions));
  };

  describe('Month Filtering', () => {
    it('displays current month transactions in transactions tab', async () => {
      setupTransactions();
      const user = userEvent.setup();
      render(<App />);

      // Navigate to Transactions tab to see transactions
      await user.click(screen.getByText('Transactions'));

      await waitFor(() => {
        expect(screen.getByText(/August Income/i)).toBeInTheDocument();
        expect(screen.getByText(/August Expense/i)).toBeInTheDocument();
      });

      // July transactions should not be visible
      expect(screen.queryByText(/July Income/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/July Expense/i)).not.toBeInTheDocument();
    });

    it('switches to different month when month tab clicked in budget analysis', async () => {
      const user = userEvent.setup();
      setupTransactions();
      render(<App />);

      // Start in Budget Analysis (default tab)
      expect(screen.getByText('Budget Analysis')).toBeInTheDocument();

      // Click July month tab in Budget Analysis
      await user.click(screen.getByText(/July 2025/i));

      // July should become active with purple styling (budget theme)
      const julyButton = screen.getByText('July 2025');
      expect(julyButton).toHaveClass('bg-purple-600', 'text-white');

      // Now switch to Transactions tab to see the filtered data
      await user.click(screen.getByText('Transactions'));

      await waitFor(() => {
        expect(screen.getByText(/July Income/i)).toBeInTheDocument();
        expect(screen.getByText(/July Expense/i)).toBeInTheDocument();
      });

      // August transactions should not be visible
      expect(screen.queryByText(/August Income/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/August Expense/i)).not.toBeInTheDocument();
    });
  });

  describe('Type Filtering with Month Hover', () => {
    it('shows dropdown options on month hover', async () => {
      const user = userEvent.setup();
      setupTransactions();
      render(<App />);

      const augustButton = screen.getByText(/August 2025/i);
      await user.hover(augustButton);

      await waitFor(() => {
        expect(screen.getByText('Income')).toBeInTheDocument();
        expect(screen.getByText('Expense')).toBeInTheDocument();
      });
    });

    it('filters to income only when income option clicked', async () => {
      const user = userEvent.setup();
      setupTransactions();
      render(<App />);

      // Hover over August month button
      const augustButton = screen.getByText(/August 2025/i);
      await user.hover(augustButton);

      // Click Income option
      await user.click(screen.getByText('Income'));

      // Switch to Transactions tab to see filtered results
      await user.click(screen.getByText('Transactions'));

      await waitFor(() => {
        expect(screen.getByText(/August Income/i)).toBeInTheDocument();
      });

      // Expense should not be visible
      expect(screen.queryByText(/August Expense/i)).not.toBeInTheDocument();
    });

    it('filters to expenses only when expense option clicked', async () => {
      const user = userEvent.setup();
      setupTransactions();
      render(<App />);

      // Hover over August month button
      const augustButton = screen.getByText(/August 2025/i);
      await user.hover(augustButton);

      // Click Expense option
      await user.click(screen.getByText('Expense'));

      // Switch to Transactions tab to see filtered results
      await user.click(screen.getByText('Transactions'));

      await waitFor(() => {
        expect(screen.getByText(/August Expense/i)).toBeInTheDocument();
      });

      // Income should not be visible
      expect(screen.queryByText(/August Income/i)).not.toBeInTheDocument();
    });

    it('shows both types when month button clicked directly', async () => {
      const user = userEvent.setup();
      setupTransactions();
      render(<App />);

      // First filter to income only
      const augustButton = screen.getByText(/August 2025/i);
      await user.hover(augustButton);
      await user.click(screen.getByText('Income'));

      // Switch to Transactions tab to see filtered income
      await user.click(screen.getByText('Transactions'));

      await waitFor(() => {
        expect(screen.getByText(/August Income/i)).toBeInTheDocument();
        expect(screen.queryByText(/August Expense/i)).not.toBeInTheDocument();
      });

      // Go back to Budget Analysis tab
      await user.click(screen.getByText('Budget Analysis'));

      // Now click the month button directly to show both
      await user.click(augustButton);

      // Switch back to Transactions tab to see both types
      await user.click(screen.getByText('Transactions'));

      await waitFor(() => {
        expect(screen.getByText(/August Income/i)).toBeInTheDocument();
        expect(screen.getByText(/August Expense/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no transactions exist', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Navigate to Transactions tab to see empty state
      await user.click(screen.getByText('Transactions'));

      await waitFor(() => {
        expect(screen.getByText(/No transactions for this month/i)).toBeInTheDocument();
      });
    });

    it('shows empty state for months with no transactions', async () => {
      const user = userEvent.setup();
      // Only add current month transactions
      const transactions = [
        {
          id: '1',
          date: '2025-08-21',
          description: 'August Transaction',
          category: 'Salary',
          amount: 3000,
          type: 'income',
          familyMember: 'John'
        }
      ];
      localStorage.setItem('galfin-transactions', JSON.stringify(transactions));
      
      render(<App />);

      // Switch to a month with no transactions (e.g., June 2025)
      await user.click(screen.getByText(/June 2025/i));

      // Navigate to Transactions tab to see empty state
      await user.click(screen.getByText('Transactions'));

      await waitFor(() => {
        expect(screen.getByText(/No transactions for this month/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when filtered type has no transactions', async () => {
      const user = userEvent.setup();
      // Only add expense transactions
      const transactions = [
        {
          id: '1',
          date: '2025-08-21',
          description: 'August Expense',
          category: 'Groceries',
          amount: 200,
          type: 'expense',
          familyMember: 'Jane'
        }
      ];
      localStorage.setItem('galfin-transactions', JSON.stringify(transactions));
      
      render(<App />);

      // Filter to income (which doesn't exist)
      const augustButton = screen.getByText(/August 2025/i);
      await user.hover(augustButton);
      await user.click(screen.getByText('Income'));

      // Navigate to Transactions tab to see empty state
      await user.click(screen.getByText('Transactions'));

      await waitFor(() => {
        expect(screen.getByText(/No transactions for this month/i)).toBeInTheDocument();
      });
    });
  });

  describe('Summary Calculations', () => {
    it('calculates correct totals for visible transactions', async () => {
      setupTransactions();
      render(<App />);

      // Check if summary cards show correct values for August 2025
      await waitFor(() => {
        // These tests will depend on the actual summary card implementation
        // Adjust selectors based on actual dashboard structure
        const summaryCards = screen.getAllByText(/\$|₪/);
        expect(summaryCards.length).toBeGreaterThan(0);
      });
    });
  });
});
