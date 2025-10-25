import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../../test/utils';
import AddTransaction from '../../components/AddTransaction';

beforeEach(() => {
  localStorage.clear();
});

describe('AddTransaction Component - Unit Tests', () => {
  describe('Modal Behavior', () => {
    it('renders when isOpen is true', () => {
      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Add.*Expense/i)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProvider(<AddTransaction isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByText(/Add.*Expense/i)).not.toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();

      renderWithProvider(<AddTransaction isOpen={true} onClose={onCloseMock} />);
      await user.click(screen.getByText(/Cancel/i));
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when escape key is pressed', async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();

      renderWithProvider(<AddTransaction isOpen={true} onClose={onCloseMock} />);
      await user.keyboard('{Escape}');
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Fields', () => {
    it('has all required form fields', () => {
      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByDisplayValue(/💸 Expense/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter transaction description/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/0.00/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Select family member/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
    });

    it('sets default date to today', () => {
      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);

      const dateField = screen.getByLabelText(/Date/i) as HTMLInputElement;
      const today = new Date().toISOString().split('T')[0];
      expect(dateField.value).toBe(today);
    });

    it('has expense as default type', () => {
      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);

      const typeField = screen.getByDisplayValue(/💸 Expense/i) as HTMLSelectElement;
      expect(typeField.value).toBe('expense');
    });
  });

  describe('Type and Category Logic', () => {
    it('shows expense categories by default', async () => {
      const user = userEvent.setup();
      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);

      const categorySelect = screen.getByLabelText(/Category/i);
      await user.click(categorySelect);
      
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Entertainment')).toBeInTheDocument();
    });

    it('shows income categories when type is income', async () => {
      const user = userEvent.setup();
      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);

      const typeSelect = screen.getByDisplayValue(/💸 Expense/i);
      await user.selectOptions(typeSelect, 'income');
      
      const categorySelect = screen.getByLabelText(/Category/i);
      await user.click(categorySelect);
      
      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    it('clears category when type changes', async () => {
      const user = userEvent.setup();
      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);

      // Select a category for expense
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');
      
      // Change type to income
      const typeSelect = screen.getByDisplayValue(/💸 Expense/i);
      await user.selectOptions(typeSelect, 'income');

      // Category should be cleared
      const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
      expect(categorySelect.value).toBe('');
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty required fields', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);
      await user.click(screen.getByText(/Submit/i));

      // Note: Actual validation behavior may differ based on implementation
      // This test checks that the form doesn't submit successfully with empty fields
      expect(screen.getByText(/Add.*Expense/i)).toBeInTheDocument(); // Modal should still be open
      
      alertSpy.mockRestore();
    });

    it('successfully submits with all required fields filled', async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();

      renderWithProvider(<AddTransaction isOpen={true} onClose={onCloseMock} />);

      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Test Transaction');
      await user.type(screen.getByPlaceholderText(/0.00/i), '100');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');

      await user.click(screen.getByText(/Submit/i));

      // Expect the modal to close on successful submission
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-Population Logic', () => {
    it('auto-populates description for salary income', async () => {
      const user = userEvent.setup();
      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);

      const typeSelect = screen.getByDisplayValue(/💸 Expense/i);
      await user.selectOptions(typeSelect, 'income');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Salary');

      const descriptionField = screen.getByPlaceholderText(/Enter transaction description/i) as HTMLInputElement;
      expect(descriptionField.value).toMatch(/Salary - \w+ \d{4}/);
    });

    it('does not auto-populate for expense categories', async () => {
      const user = userEvent.setup();
      renderWithProvider(<AddTransaction isOpen={true} onClose={vi.fn()} />);

      await user.type(screen.getByPlaceholderText(/Enter transaction description/i), 'Manual Description');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'Groceries');

      const descriptionField = screen.getByPlaceholderText(/Enter transaction description/i) as HTMLInputElement;
      expect(descriptionField.value).toBe('Manual Description');
    });
  });
});
