import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { useActiveBudget } from '../hooks/useBudgets';
import { X, Upload, HelpCircle } from 'lucide-react';
import CategorySelector from './CategorySelector';

interface AddTransactionProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTransaction: React.FC<AddTransactionProps> = ({ isOpen, onClose }) => {
  const { addTransaction, familyMembers, setTransactions } = useFinance();
  const { data: personalBudget } = useActiveBudget();
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    type: 'expense' as 'income' | 'expense',
    familyMember: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Get active expense categories from user's active budget
  const expenseCategories = useMemo(() => {
    if (!personalBudget) return [];
    
    // Get active categories from global settings
    const activeCategories = personalBudget.global_settings?.activeExpenseCategories || [];
    
    // Filter to only include categories that are both in activeCategories list AND marked as active
    const categories = activeCategories.filter(catName => {
      const categoryConfig = personalBudget.categories[catName];
      return categoryConfig && categoryConfig.isActive !== false;
    });
    
    // Sort alphabetically with "Other" at the end
    return categories
      .filter(cat => cat !== 'Other')
      .sort()
      .concat(categories.includes('Other') ? ['Other'] : []);
  }, [personalBudget]);

  // Income categories - sorted alphabetically with "Other" last
  const incomeCategories = [
    'Gift',
    'Government Allowance',
    'Rent',
    'Salary',
    'Other'
  ];

  // Generate default descriptions for income categories
  const getDefaultDescription = (category: string) => {
    const currentDate = new Date();
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    switch (category) {
      case 'Salary':
        return `Salary - ${monthYear}`;
      case 'Rent':
        return `Rental Income - ${monthYear}`;
      case 'Government Allowance':
        return '[Edit: Allowance type] - [Edit: Period]';
      case 'Gift':
        return '[Edit: Gift from whom/occasion]';
      case 'Other':
        return '[Edit: Income source description]';
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    const missingFields = [];
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      missingFields.push('Amount');
    }
    
    if (!formData.category) {
      missingFields.push('Category');
    }
    
    if (!formData.date) {
      missingFields.push('Date');
    }
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      await addTransaction({
        type: formData.type,
        description: formData.description || `${formData.category} transaction`,
        amount: parseFloat(formData.amount),
        category: formData.category,
        familyMember: formData.familyMember || undefined,
        date: formData.date,
      });

      // Reset form
      setFormData({
        type: 'expense',
        description: '',
        amount: '',
        category: '',
        familyMember: '',
        date: new Date().toISOString().split('T')[0],
      });

      onClose();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const handleCategorySelect = (category: string) => {
    let updates: any = { category };
    
    // Auto-populate description for income categories
    if (formData.type === 'income' && category) {
      updates.description = getDefaultDescription(category);
    }
    
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const transactions = JSON.parse(e.target?.result as string);
          if (!Array.isArray(transactions) || transactions.length === 0) {
            alert('Imported file is empty or not an array.');
            return;
          }
          setTransactions(transactions);
          alert(`Successfully imported ${transactions.length} transaction(s)!`);
          onClose();
        } catch (error) {
          alert('Invalid JSON file. Please check the file format matches the example.');
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    event.target.value = '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let updates: any = { [name]: value };
    
    // Clear category when type changes to avoid invalid combinations
    if (name === 'type') {
      updates.category = '';
      updates.description = '';
      setShowCategorySelector(false); // Close category selector if open
    }
    
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  const transactionModal = createPortal(
    <div className="fixed inset-0 overflow-y-auto bg-black bg-opacity-50 z-[1000]" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Add {formData.type === 'income' ? '💰 Income' : '💸 Expense'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-x-hidden">
          <div>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {/* Expense Option */}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  type: 'expense',
                  category: prev.type !== 'expense' ? '' : prev.category // Reset category only if type changes
                }))}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors focus:outline-none ${
                  formData.type === 'expense' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                💸 Expense
              </button>
              
              {/* Income Option */}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  type: 'income',
                  category: prev.type !== 'income' ? '' : prev.category // Reset category only if type changes
                }))}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors focus:outline-none border-l border-gray-300 ${
                  formData.type === 'income' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                💰 Income
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              {formData.type === 'income' ? 'Income' : 'Expense'} Categories
            </label>
            <div className="relative">
              <input
                id="category"
                type="text"
                value={formData.category}
                readOnly
                placeholder={formData.type === 'income' ? 'Select income source' : 'Select expense category'}
                className="w-full px-3 py-2 pr-24 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                onClick={() => setShowCategorySelector(true)}
                required
              />
              <button
                type="button"
                onClick={() => setShowCategorySelector(true)}
                className="absolute right-2 top-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                Choose
              </button>
            </div>

          </div>

          <div>
            <label htmlFor="transaction-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-xs text-gray-500">(optional)</span>
            </label>
            <input
              id="transaction-description"
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter transaction description (optional)"
            />
          </div>

          <div>
            <label htmlFor="transaction-amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              id="transaction-amount"
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label htmlFor="transaction-family-member" className="block text-sm font-medium text-gray-700 mb-1">
              Family Member
            </label>
            <select
              id="transaction-family-member"
              name="familyMember"
              value={formData.familyMember}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select family member (optional)</option>
              {familyMembers.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="transaction-date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <div className="w-full overflow-hidden">
              <input
                id="transaction-date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
          </div>
        </form>

            {/* Import Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-3">
                  Importing multiple transactions from a JSON file?
                </p>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Import Transactions</span>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      onClick={() => setShowTooltip(!showTooltip)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <HelpCircle className="h-5 w-5" />
                    </button>
                    {showTooltip && (
                      <div className="absolute right-0 bottom-8 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-50">
                        <div className="font-semibold mb-2">JSON Format Example:</div>
                        <pre className="bg-gray-800 p-2 rounded overflow-x-auto text-[10px] leading-relaxed">
{`[
  {
    "type": "expense",
    "description": "Groceries",
    "amount": 45.50,
    "category": "Groceries",
    "date": "2024-10-15"
  },
  {
    "type": "income",
    "description": "Salary",
    "amount": 3500.00,
    "category": "Salary",
    "date": "2024-10-01"
  }
]`}
                        </pre>
                        <div className="mt-2 text-[10px] text-gray-300">
                          • <span className="font-semibold">type</span>: "income" or "expense"<br/>
                          • <span className="font-semibold">amount</span>: number<br/>
                          • <span className="font-semibold">date</span>: "YYYY-MM-DD" format<br/>
                          • <span className="font-semibold">category</span>: must match existing categories<br/>
                          • <span className="font-semibold">familyMember</span>: optional UUID
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                  className="hidden"
                  id="import-transactions-file"
                />
                <label
                  htmlFor="import-transactions-file"
                  className="block w-full px-4 py-2 bg-blue-600 text-white text-center text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Choose JSON File
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  // Render CategorySelector separately so it doesn't interfere with the main modal
  const categorySelector = showCategorySelector ? (
    <CategorySelector
      isOpen={showCategorySelector}
      onClose={() => setShowCategorySelector(false)}
      onSelect={handleCategorySelect}
      categories={currentCategories}
      type={formData.type}
    />
  ) : null;

  return (
    <>
      {transactionModal}
      {categorySelector}
    </>
  );
};

export default AddTransaction;
