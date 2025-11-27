// Category List Component
// Part of Category Management Restructure (Phase 4)
// Updated to use unified CategoryEditModal

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { useFinance } from '../../context/FinanceContext';
import type { Category } from '../../types/category';
import { AddCategoryModal } from './AddCategoryModal';
import { CategoryEditModal } from './CategoryEditModal';

interface CategoryListProps {
  onCategorySelect?: (category: Category) => void;
  /** Category to auto-open for editing (e.g., when navigating from Overview) */
  initialEditCategory?: Category | null;
  onInitialEditHandled?: () => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({ 
  onCategorySelect,
  initialEditCategory,
  onInitialEditHandled,
}) => {
  const { data: categories, isLoading, error } = useCategories(false, 'expense');
  const { transactions } = useFinance();
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  // Handle initial edit category from navigation
  useEffect(() => {
    if (initialEditCategory) {
      setEditCategory(initialEditCategory);
      onInitialEditHandled?.();
    }
  }, [initialEditCategory, onInitialEditHandled]);

  // Calculate transaction counts for each category
  // Matches by category_id (new) or category name (legacy)
  const getTransactionCount = (categoryId: string, categoryName: string): number => {
    return transactions.filter(t => 
      t.category_id === categoryId || t.category === categoryName
    ).length;
  };

  // Format currency
  const formatCurrency = (amount: number, currency = '₪') => {
    return `${currency}${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500">Failed to load categories</p>
        <p className="text-sm text-gray-500 mt-2">{error.message}</p>
      </div>
    );
  }

  const activeCategories = categories?.filter(c => c.isActive) || [];

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Your Categories
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeCategories.length} active categories
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Category List */}
      {activeCategories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
            No categories yet
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Create your first category to start tracking expenses
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {activeCategories.map((category) => {
              const transactionCount = getTransactionCount(category.id, category.name);
              
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {/* Left side: Color dot, name, stats */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Color indicator */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    
                    {/* Category info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {category.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatCurrency(category.monthlyLimit)}</span>
                        <span className="flex items-center gap-1" title={`${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`}>
                          <Receipt className="h-3.5 w-3.5" />
                          {transactionCount}
                        </span>
                        {category.warningThreshold < 100 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title={`Alert at ${category.warningThreshold}%`}>
                            <AlertCircle className="h-3.5 w-3.5" />
                            {category.warningThreshold}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Edit link */}
                  <button
                    onClick={() => setEditCategory(category)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddCategoryModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
      
      <CategoryEditModal
        isOpen={!!editCategory}
        category={editCategory}
        onClose={() => setEditCategory(null)}
      />
    </div>
  );
};
