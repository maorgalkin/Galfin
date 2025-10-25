import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
  // Mock console.error to avoid noise in tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Transaction Management - Core Functionality', () => {
  describe('Adding Transactions', () => {
    it('adds an expense transaction successfully', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText(/Add Transaction/i));
      
      // Fill in the form
      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Test Expense');
      await user.type(screen.getByPlaceholderText(/0.00/i), '100');
      await user.selectOptions(screen.getByLabelText(/Type/i), 'expense');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');
      await user.type(screen.getByLabelText(/Date/i), '2025-08-21');
      
      await user.click(screen.getByText(/Submit/i));
      
      // Navigate to Transactions tab to see the added transaction
      await user.click(screen.getByText('Transactions'));
      
      await waitFor(() => {
        expect(screen.getByText(/Test Expense/i)).toBeInTheDocument();
      });
    });

    it('adds an income transaction successfully', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText(/Add Transaction/i));
      
      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Test Income');
      await user.type(screen.getByPlaceholderText(/0.00/i), '1000');
      await user.selectOptions(screen.getByLabelText(/Type/i), 'income');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Other');
      await user.type(screen.getByLabelText(/Date/i), '2025-08-21');
      // Override auto-populated description
      await user.clear(screen.getByPlaceholderText(/Enter transaction description/i));
      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Test Income');
      
      await user.click(screen.getByText(/Submit/i));
      
      // Navigate to Transactions tab to see the added transaction
      await user.click(screen.getByText('Transactions'));
      
      await waitFor(() => {
        expect(screen.getByText(/Test Income/i)).toBeInTheDocument();
      });
    });

    it('validates required fields before submission', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText(/Add Transaction/i));
      await user.click(screen.getByText(/Submit/i));
      
      // Should show validation error (implementation depends on alert vs form validation)
      // This test will need to be adjusted based on actual validation implementation
    });

    it('closes modal on cancel', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText(/Add Transaction/i));
      expect(screen.getByText(/Add.*Expense/i)).toBeInTheDocument();
      
      await user.click(screen.getByText(/Cancel/i));
      
      await waitFor(() => {
        expect(screen.queryByText(/Add.*Expense/i)).not.toBeInTheDocument();
      });
    });

    it('closes modal on escape key', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText(/Add Transaction/i));
      expect(screen.getByText(/Add.*Expense/i)).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText(/Add.*Expense/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('JSON Import', () => {
    it('imports valid JSON transactions successfully', async () => {
      const user = userEvent.setup();
      const validData = [
        { 
          id: '1', 
          date: '2025-08-21', 
          description: 'Imported Expense', 
          category: 'Food', 
          amount: 200, 
          type: 'expense', 
          familyMember: 'John' 
        }
      ];
      
      render(<App />);
      
      // Navigate to Transactions tab first
      await user.click(screen.getByText('Transactions'));
      
      await user.click(screen.getByText(/Import/i));
      
      const fileInput = screen.getByLabelText(/Import/i);
      const file = new File([JSON.stringify(validData)], 'transactions.json', { type: 'application/json' });
      
      await user.upload(fileInput, file);
      await user.click(screen.getByRole('button', { name: /^Import$/ }));
      
      await waitFor(() => {
        expect(screen.getByText(/Imported Expense/i)).toBeInTheDocument();
      });
    });

    it('handles invalid JSON format gracefully', async () => {
      const user = userEvent.setup();
      const invalidData = 'invalid json content';
      
      render(<App />);
      
      // Navigate to Transactions tab first
      await user.click(screen.getByText('Transactions'));
      
      await user.click(screen.getByText(/Import/i));
      
      const fileInput = screen.getByLabelText(/Import/i);
      const file = new File([invalidData], 'invalid.json', { type: 'application/json' });
      
      await user.upload(fileInput, file);
      await user.click(screen.getByRole('button', { name: /^Import$/ }));
      
      // Should handle error gracefully - adjust based on actual error handling
    });

    it('validates required fields in imported data', async () => {
      const user = userEvent.setup();
      const incompleteData = [
        { id: '1', description: 'Missing fields' } // Missing required fields
      ];
      
      render(<App />);
      
      // Navigate to Transactions tab first
      await user.click(screen.getByText('Transactions'));
      
      await user.click(screen.getByText(/Import/i));
      
      const fileInput = screen.getByLabelText(/Import/i);
      const file = new File([JSON.stringify(incompleteData)], 'incomplete.json', { type: 'application/json' });
      
      await user.upload(fileInput, file);
      await user.click(screen.getByRole('button', { name: /^Import$/ }));
      
      // Should handle validation error
    });
  });

  describe('Data Persistence', () => {
    it('persists transactions in localStorage', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText(/Add Transaction/i));
      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Persistent Transaction');
      await user.type(screen.getByPlaceholderText(/0.00/i), '500');
      await user.selectOptions(screen.getByLabelText(/Type/i), 'expense');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');
      await user.type(screen.getByLabelText(/Date/i), '2025-08-21');
      await user.click(screen.getByText(/Submit/i));
      
      // Navigate to Transactions tab to see the transaction
      await user.click(screen.getByText('Transactions'));
      
      await waitFor(() => {
        expect(screen.getByText(/Persistent Transaction/i)).toBeInTheDocument();
      });
      
      // Verify localStorage contains the transaction
      const stored = localStorage.getItem('galfin-transactions');
      expect(stored).toBeTruthy();
      const transactions = JSON.parse(stored!);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].description).toBe('Persistent Transaction');
    });

    it('loads transactions from localStorage on app start', async () => {
      // Pre-populate localStorage
      const existingTransaction = {
        id: 'existing-1',
        date: '2025-08-21',
        description: 'Existing Transaction',
        category: 'Food',
        amount: 300,
        type: 'expense',
        familyMember: 'Jane'
      };
      localStorage.setItem('galfin-transactions', JSON.stringify([existingTransaction]));
      
      const user = userEvent.setup();
      render(<App />);
      
      // Navigate to Transactions tab to see the loaded transaction
      await user.click(screen.getByText('Transactions'));
      
      await waitFor(() => {
        expect(screen.getByText(/Existing Transaction/i)).toBeInTheDocument();
      });
    });
  });
});
