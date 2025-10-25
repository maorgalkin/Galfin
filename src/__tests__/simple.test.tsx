import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../test/utils';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
});

describe('Galfin Application - Basic Tests', () => {
  describe('Application Startup', () => {
    it('renders the main dashboard', () => {
      renderWithProvider(<App />);
      
      expect(screen.getByText('Family Finance Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Galfin')).toBeInTheDocument();
      expect(screen.getByText('Family Finance Tracker')).toBeInTheDocument();
    });

    it('displays tab navigation with Budget Analysis as default', () => {
      renderWithProvider(<App />);
      
      expect(screen.getByText('Budget Analysis')).toBeInTheDocument();
      expect(screen.getByText('Transactions')).toBeInTheDocument();
      
      // Budget Analysis should be active by default
      const budgetTab = screen.getByText('Budget Analysis');
      expect(budgetTab.closest('button')).toHaveClass('border-purple-500', 'text-purple-600');
    });

    it('shows main action buttons', () => {
      renderWithProvider(<App />);
      
      expect(screen.getByText('Add Transaction')).toBeInTheDocument();
      expect(screen.getByText('Import Transactions')).toBeInTheDocument();
    });
  });

  describe('Sample Data Display', () => {
    it('shows sample transactions in transactions tab', async () => {
      const user = userEvent.setup();
      renderWithProvider(<App />);
      
      // Switch to Transactions tab to see transaction data
      await user.click(screen.getByText('Transactions'));
      
      expect(screen.getByText('Salary - August 2025')).toBeInTheDocument();
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Gift from Grandma')).toBeInTheDocument();
      expect(screen.getByText('Electricity Bill')).toBeInTheDocument();
    });

    it('displays family members in transactions', async () => {
      const user = userEvent.setup();
      renderWithProvider(<App />);
      
      // Switch to Transactions tab to see family member data
      await user.click(screen.getByText('Transactions'));
      
      // These names appear in transaction details, use getAllByText for multiple matches
      const maorElements = screen.getAllByText((_, element) => 
        element?.textContent?.includes('Maor') || false
      );
      expect(maorElements.length).toBeGreaterThan(0);
      
      const michalElements = screen.getAllByText((_, element) => 
        element?.textContent?.includes('Michal') || false
      );
      expect(michalElements.length).toBeGreaterThan(0);
      
      const almaElements = screen.getAllByText((_, element) => 
        element?.textContent?.includes('Alma') || false
      );
      expect(almaElements.length).toBeGreaterThan(0);
    });

    it('shows transaction categories in transactions tab', async () => {
      const user = userEvent.setup();
      renderWithProvider(<App />);
      
      // Switch to Transactions tab to see category data
      await user.click(screen.getByText('Transactions'));
      
      // Categories appear in transaction details, use getAllByText for multiple matches
      const salaryElements = screen.getAllByText((_, element) => 
        element?.textContent?.includes('Salary') || false
      );
      expect(salaryElements.length).toBeGreaterThan(0);
      
      const giftElements = screen.getAllByText((_, element) => 
        element?.textContent?.includes('Gift') || false
      );
      expect(giftElements.length).toBeGreaterThan(0);
      
      const billsElements = screen.getAllByText((_, element) => 
        element?.textContent?.includes('Bills & Utilities') || false
      );
      expect(billsElements.length).toBeGreaterThan(0);
    });
  });

  describe('Financial Summary Cards', () => {
    it('displays all summary cards in budget analysis', () => {
      renderWithProvider(<App />);
      
      // Summary cards are shown in Budget Analysis tab (default)
      expect(screen.getByText('Total Income')).toBeInTheDocument();
      expect(screen.getByText('Total Expenses')).toBeInTheDocument();
      expect(screen.getByText('Balance')).toBeInTheDocument();
      expect(screen.getByText('Family Members')).toBeInTheDocument();
      expect(screen.getByText('Budget Status')).toBeInTheDocument();
    });

    it('shows correct family member count', () => {
      renderWithProvider(<App />);
      
      // Should show 4 family members
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('displays currency formatting', () => {
      renderWithProvider(<App />);
      
      // Check for currency symbols
      const currencyElements = screen.getAllByText(/₪/);
      expect(currencyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Month Navigation', () => {
    it('shows month tabs', () => {
      renderWithProvider(<App />);
      
      expect(screen.getByText('August 2025')).toBeInTheDocument();
      expect(screen.getByText('July 2025')).toBeInTheDocument();
      expect(screen.getByText('June 2025')).toBeInTheDocument();
      expect(screen.getByText('May 2025')).toBeInTheDocument();
    });

    it('highlights current month', () => {
      renderWithProvider(<App />);
      
      const augustButton = screen.getByText('August 2025');
      expect(augustButton).toHaveClass('bg-blue-600', 'text-white');
    });
  });

  describe('Transaction List', () => {
    it('displays transaction amounts correctly', () => {
      renderWithProvider(<App />);
      
      // Check for positive income formatting
      expect(screen.getByText(/\+.*12,000\.00/)).toBeInTheDocument();
      
      // Check for negative expense formatting  
      expect(screen.getByText(/-.*800\.00/)).toBeInTheDocument();
    });

    it('shows transaction dates', () => {
      renderWithProvider(<App />);
      
      // Should show today's date in transactions
      const dateElements = screen.getAllByText(/21\/08\/2025/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    it('can click on add transaction button', async () => {
      const user = userEvent.setup();
      renderWithProvider(<App />);

      const addButton = screen.getByText('Add Transaction');
      await user.click(addButton);

      // Modal should open (basic verification)
      expect(screen.getByText(/Add.*Expense/i)).toBeInTheDocument();
    });

    it('can switch between Budget Analysis and Transactions tabs', async () => {
      const user = userEvent.setup();
      renderWithProvider(<App />);

      // Start on Budget Analysis (default)
      expect(screen.getByText('Budget Analysis')).toBeInTheDocument();
      
      // Switch to Transactions tab
      await user.click(screen.getByText('Transactions'));
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
      
      // Should see Filter Transactions button in transactions tab
      expect(screen.getByText('Filter Transactions')).toBeInTheDocument();
      
      // Switch back to Budget Analysis
      await user.click(screen.getByText('Budget Analysis'));
      expect(screen.getByText('Budget Analysis')).toBeInTheDocument();
    });

    it('can navigate month tabs in budget analysis', async () => {
      const user = userEvent.setup();
      renderWithProvider(<App />);

      // Should be on Budget Analysis tab by default
      const julyButton = screen.getByText('July 2025');
      await user.click(julyButton);

      // July should become active with purple styling (budget theme)
      expect(julyButton).toHaveClass('bg-purple-600', 'text-white');
    });

    it('can open transaction filter modal', async () => {
      const user = userEvent.setup();
      renderWithProvider(<App />);

      // Switch to Transactions tab
      await user.click(screen.getByText('Transactions'));
      
      // Click Filter Transactions button
      await user.click(screen.getByText('Filter Transactions'));
      
      // Filter modal should open
      expect(screen.getByText('Filter Transactions')).toBeInTheDocument();
      expect(screen.getByText('Quick Date Ranges')).toBeInTheDocument();
    });
  });

  describe('Charts and Visualization', () => {
    it('displays expenses by category chart section', () => {
      renderWithProvider(<App />);
      
      expect(screen.getByText('Expenses by Category')).toBeInTheDocument();
    });

    it('has chart container', () => {
      renderWithProvider(<App />);
      
      const chartContainer = document.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });
  });
});
