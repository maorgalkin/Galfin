// Category List Component
// Part of Category Management Restructure (Phase 4)
// Updated to use unified CategoryEditModal with adjustments

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Edit3,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  Receipt,
  Calendar,
  TrendingUp,
  TrendingDown,
  X,
  Sparkles
} from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { useFinance } from '../../context/FinanceContext';
import { useNextMonthAdjustments, useCancelAdjustment, useActiveBudget } from '../../hooks/useBudgets';
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
  const { data: nextMonthSummary } = useNextMonthAdjustments();
  const { data: activeBudget } = useActiveBudget();
  const cancelAdjustment = useCancelAdjustment();
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editInitialTab, setEditInitialTab] = useState<'edit' | 'adjustment'>('edit');

  // Handle initial edit category from navigation
  useEffect(() => {
    if (initialEditCategory) {
      setEditCategory(initialEditCategory);
      setEditInitialTab('edit');
      onInitialEditHandled?.();
    }
  }, [initialEditCategory, onInitialEditHandled]);

  // Get adjustment for a category by name
  const getCategoryAdjustment = (categoryName: string) => {
    return nextMonthSummary?.adjustments.find(adj => adj.category_name === categoryName);
  };

  // Get new category adjustments (categories that don't exist yet)
  const newCategoryAdjustments = useMemo(() => {
    if (!nextMonthSummary || !categories) return [];
    const existingNames = new Set(categories.map(c => c.name));
    return nextMonthSummary.adjustments.filter(adj => !existingNames.has(adj.category_name));
  }, [nextMonthSummary, categories]);

  // Calculate transaction counts for each category
  // Matches by category_id (new) or category name (legacy)
  const getTransactionCount = (categoryId: string, categoryName: string): number => {
    return transactions.filter(t => 
      t.category_id === categoryId || t.category === categoryName
    ).length;
  };

  // Format currency
  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || activeBudget?.global_settings?.currency || 'ILS';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  const handleCancelAdjustment = async (adjustmentId: string) => {
    try {
      await cancelAdjustment.mutateAsync(adjustmentId);
    } catch (error) {
      console.error('Failed to cancel adjustment:', error);
    }
  };

  const handleEditWithTab = (category: Category, tab: 'edit' | 'adjustment') => {
    setEditInitialTab(tab);
    setEditCategory(category);
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
              const adjustment = getCategoryAdjustment(category.name);
              
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
                        {/* Adjustment badge */}
                        {adjustment && (
                          <button
                            onClick={() => handleEditWithTab(category, 'adjustment')}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                              adjustment.adjustment_type === 'increase'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                            title={`Next month: ${formatCurrency(adjustment.new_limit)}`}
                          >
                            {adjustment.adjustment_type === 'increase' ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span className="hidden sm:inline">
                              {adjustment.adjustment_type === 'increase' ? '+' : '-'}
                              {formatCurrency(adjustment.adjustment_amount)}
                            </span>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        {/* Monthly limit - compact on small, full on medium+ */}
                        <span>
                          {formatCurrency(category.monthlyLimit)}
                          <span className="hidden md:inline"> / month</span>
                        </span>
                        {/* Transaction count - icon only on small, with label on medium+ */}
                        <span className="flex items-center gap-1" title={`${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`}>
                          <Receipt className="h-3.5 w-3.5" />
                          <span>{transactionCount}</span>
                          <span className="hidden md:inline">txn{transactionCount !== 1 ? 's' : ''}</span>
                        </span>
                        {/* Warning threshold - icon only on small, with label on medium+ */}
                        {category.warningThreshold < 100 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title={`Alert at ${category.warningThreshold}%`}>
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Alert at </span>
                            {category.warningThreshold}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Edit link */}
                  <button
                    onClick={() => handleEditWithTab(category, 'edit')}
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

      {/* Adjustments Summary */}
      {nextMonthSummary && nextMonthSummary.adjustmentCount > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  Next Month Adjustments
                </h3>
              </div>
              <span className="text-sm text-orange-600 dark:text-orange-400">
                {nextMonthSummary.effectiveDate}
              </span>
            </div>
          </div>
          
          {/* Summary stats */}
          <div className="px-4 py-3 grid grid-cols-3 gap-4 text-center border-b border-orange-200 dark:border-orange-800">
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 uppercase">Changes</p>
              <p className="text-lg font-semibold text-orange-800 dark:text-orange-200">{nextMonthSummary.adjustmentCount}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 uppercase">Increases</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">+{formatCurrency(nextMonthSummary.totalIncrease)}</p>
            </div>
            <div>
              <p className="text-xs text-red-600 dark:text-red-400 uppercase">Decreases</p>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">-{formatCurrency(nextMonthSummary.totalDecrease)}</p>
            </div>
          </div>

          {/* New categories being added */}
          {newCategoryAdjustments.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  New categories next month
                </span>
              </div>
              <div className="space-y-2">
                {newCategoryAdjustments.map((adj) => (
                  <div key={adj.id} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{adj.category_name}</span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{formatCurrency(adj.new_limit)}</span>
                    </div>
                    <button
                      onClick={() => handleCancelAdjustment(adj.id)}
                      disabled={cancelAdjustment.isPending}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
        onClose={() => {
          setEditCategory(null);
          setEditInitialTab('edit');
        }}
        initialTab={editInitialTab}
      />
    </div>
  );
};
