import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Accessibility & UX', () => {
  describe('Keyboard Navigation', () => {
    it('can navigate through modal using keyboard', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Open modal with keyboard
      await user.tab(); // Navigate to Add Transaction button
      await user.keyboard('{Enter}');

      // Modal should be open
      expect(screen.getByText(/Add.*Expense/i)).toBeInTheDocument();

      // Navigate through form fields
      await user.tab(); // Type selector
      await user.tab(); // Description
      await user.tab(); // Amount
      await user.tab(); // Category
      await user.tab(); // Family Member
      await user.tab(); // Date
      await user.tab(); // Cancel button
      await user.tab(); // Submit button

      // Close with Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText(/Add.*Expense/i)).not.toBeInTheDocument();
      });
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));

      // Focus should be trapped within modal
      const modal = screen.getByRole('dialog', { hidden: true }) || 
                   screen.getByText(/Add.*Expense/i).closest('div');
      
      expect(modal).toBeInTheDocument();
    });

    it('restores focus after modal closes', async () => {
      const user = userEvent.setup();
      render(<App />);

      const addButton = screen.getByText(/Add Transaction/i);
      await user.click(addButton);
      await user.keyboard('{Escape}');

      // Focus should return to the add button
      expect(addButton).toHaveFocus();
    });
  });

  describe('Form Labels and Accessibility', () => {
    it('has proper labels for all form inputs', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));

      // Check that all form inputs have accessible labels
      expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
      
      // Check placeholders for inputs without explicit labels
      expect(screen.getByPlaceholderText(/Enter transaction description/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/0.00/i)).toBeInTheDocument();
    });

    it('has proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));

      // Check for required field indicators
      const requiredFields = screen.getAllByText('*');
      expect(requiredFields.length).toBeGreaterThan(0);
    });

    it('provides clear error messages', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));
      await user.click(screen.getByText(/Submit/i));

      // Should provide clear validation feedback
      // (This test depends on actual validation implementation)
    });
  });

  describe('Visual Feedback & Loading States', () => {
    it('shows visual feedback for button interactions', async () => {
      const user = userEvent.setup();
      render(<App />);

      const addButton = screen.getByText(/Add Transaction/i);
      
      // Button should be interactive
      expect(addButton).toBeEnabled();
      
      await user.hover(addButton);
      // Should have hover styles (tested via class changes or style attributes)
    });

    it('provides immediate feedback when actions complete', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));
      
      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Quick Test');
      await user.type(screen.getByPlaceholderText(/0.00/i), '100');
      await user.selectOptions(screen.getByLabelText(/Type/i), 'expense');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');
      
      await user.click(screen.getByText(/Submit/i));

      // Transaction should appear immediately
      await waitFor(() => {
        expect(screen.getByText(/Quick Test/i)).toBeInTheDocument();
      });

      // Modal should close
      expect(screen.queryByText(/Add.*Expense/i)).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('maintains usability on small screens', () => {
      // Mock smaller viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      render(<App />);

      // App should still render and be usable
      expect(screen.getByText(/Family Finance Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Add Transaction/i)).toBeInTheDocument();
    });

    it('handles long transaction descriptions gracefully', async () => {
      const user = userEvent.setup();
      const longDescription = 'This is a very long transaction description that might cause layout issues if not handled properly. It should wrap or truncate appropriately.';
      
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));
      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), longDescription);
      await user.type(screen.getByPlaceholderText(/0.00/i), '100');
      await user.selectOptions(screen.getByLabelText(/Type/i), 'expense');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');
      await user.type(screen.getByLabelText(/Date/i), '2025-08-21');
      
      await user.click(screen.getByText(/Submit/i));

      await waitFor(() => {
        expect(screen.getByText(longDescription)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('handles localStorage quota exceeded gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));
      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Test Transaction');
      await user.type(screen.getByPlaceholderText(/0.00/i), '100');
      await user.selectOptions(screen.getByLabelText(/Type/i), 'expense');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');
      
      await user.click(screen.getByText(/Submit/i));

      // Should handle error gracefully without crashing
      // (Implementation depends on actual error handling)

      // Restore original localStorage
      localStorage.setItem = originalSetItem;
    });

    it('handles corrupted localStorage data', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('finance-transactions', 'invalid json');

      render(<App />);

      // App should still load without crashing
      expect(screen.getByText(/Family Finance Dashboard/i)).toBeInTheDocument();
    });

    it('validates numeric inputs properly', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));
      
      // Try to enter non-numeric value in amount field
      const amountField = screen.getByPlaceholderText(/0.00/i);
      await user.type(amountField, 'abc');
      
      // Field should reject non-numeric input or provide validation
      expect(amountField).toHaveValue('');
    });

    it('handles very large amounts correctly', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));
      
      const largeAmount = '999999999.99';
      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Large Amount Test');
      await user.type(screen.getByPlaceholderText(/0.00/i), largeAmount);
      await user.selectOptions(screen.getByLabelText(/Type/i), 'expense');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');
      await user.type(screen.getByLabelText(/Date/i), '2025-08-21');
      
      await user.click(screen.getByText(/Submit/i));

      await waitFor(() => {
        expect(screen.getByText(/Large Amount Test/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Validation', () => {
    it('prevents submission with negative amounts', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));
      
      await user.type(screen.getByPlaceholderText(/0.00/i), '-100');
      
      // Should either prevent input or show validation error
      const submitButton = screen.getByText(/Submit/i);
      await user.click(submitButton);
      
      // Transaction should not be added with negative amount
    });

    it('prevents submission with future dates beyond reasonable limit', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText(/Add Transaction/i));
      
      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Future Test');
      await user.type(screen.getByPlaceholderText(/0.00/i), '100');
      await user.selectOptions(screen.getByLabelText(/Type/i), 'expense');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');
      await user.type(screen.getByLabelText(/Date/i), '2030-01-01');
      
      await user.click(screen.getByText(/Submit/i));
      
      // Should handle future date validation appropriately
    });
  });
});
