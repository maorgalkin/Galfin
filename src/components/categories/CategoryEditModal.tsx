// Unified Category Edit Modal
// Combines editing, renaming, merging, adjustments, and deleting capabilities

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Edit3, 
  Type, 
  GitMerge, 
  Trash2, 
  DollarSign, 
  AlertTriangle,
  Check,
  Info,
  ArrowRight,
  Palette,
  Calendar,
  TrendingUp,
  TrendingDown,
  HelpCircle
} from 'lucide-react';
import { 
  useUpdateCategory, 
  useRenameCategory, 
  useDeleteCategory,
  useMergeCategories,
  useCategories 
} from '../../hooks/useCategories';
import {
  useNextMonthAdjustments,
  useScheduleAdjustment,
  useCancelAdjustment,
  useActiveBudget
} from '../../hooks/useBudgets';
import { useFinance } from '../../context/FinanceContext';
import type { Category } from '../../types/category';
import { DEFAULT_CATEGORY_COLORS } from '../../types/category';

type TabType = 'edit' | 'rename' | 'merge' | 'adjustment';

interface CategoryEditModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  initialTab?: TabType;
}

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  isOpen,
  category,
  onClose,
  initialTab = 'edit',
}) => {
  const { data: allCategories } = useCategories(false, 'expense');
  const { transactions } = useFinance();
  const { data: nextMonthSummary } = useNextMonthAdjustments();
  const { data: activeBudget } = useActiveBudget();
  
  const updateCategory = useUpdateCategory();
  const renameCategory = useRenameCategory();
  const deleteCategory = useDeleteCategory();
  const mergeCategories = useMergeCategories();
  const scheduleAdjustment = useScheduleAdjustment();
  const cancelAdjustment = useCancelAdjustment();
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Edit tab state
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('80');
  const [color, setColor] = useState('#3B82F6');
  
  // Rename tab state
  const [newName, setNewName] = useState('');
  
  // Merge tab state
  const [targetCategoryId, setTargetCategoryId] = useState('');
  
  // Adjustment tab state
  const [nextMonthLimit, setNextMonthLimit] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Calculate transaction count
  const transactionCount = useMemo(() => {
    if (!category) return 0;
    return transactions.filter(t => t.category_id === category.id).length;
  }, [transactions, category]);

  // Get other categories for merge/reassign
  const otherCategories = useMemo(() => {
    return allCategories?.filter(c => c.id !== category?.id && c.isActive) || [];
  }, [allCategories, category]);

  // Target category for merge
  const targetCategory = otherCategories.find(c => c.id === targetCategoryId);

  // Target transaction count for merge preview
  const targetTransactionCount = useMemo(() => {
    if (!targetCategoryId) return 0;
    return transactions.filter(t => t.category_id === targetCategoryId).length;
  }, [transactions, targetCategoryId]);

  // Combined budget for merge preview
  const combinedBudget = useMemo(() => {
    if (!category || !targetCategory) return 0;
    return category.monthlyLimit + targetCategory.monthlyLimit;
  }, [category, targetCategory]);

  // Get pending adjustment for this category
  const categoryAdjustment = useMemo(() => {
    if (!nextMonthSummary || !category) return null;
    return nextMonthSummary.adjustments.find(
      adj => adj.category_name === category.name
    );
  }, [nextMonthSummary, category]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    const currency = activeBudget?.global_settings?.currency || 'ILS';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Reset form when category changes or modal opens
  useEffect(() => {
    if (isOpen && category) {
      setActiveTab(initialTab);
      setError('');
      setShowDeleteConfirm(false);
      
      // Edit tab
      setMonthlyLimit(category.monthlyLimit.toString());
      setWarningThreshold(category.warningThreshold.toString());
      setColor(category.color);
      
      // Rename tab
      setNewName(category.name);
      
      // Merge tab
      setTargetCategoryId('');
      
      // Adjustment tab
      setNextMonthLimit(categoryAdjustment?.new_limit.toString() || category.monthlyLimit.toString());
      setAdjustmentReason('');
    }
  }, [isOpen, category, initialTab, categoryAdjustment]);

  const isPending = updateCategory.isPending || renameCategory.isPending || 
                    deleteCategory.isPending || mergeCategories.isPending ||
                    scheduleAdjustment.isPending || cancelAdjustment.isPending;

  // Check if edit form has changes
  const editHasChanges = category && (
    parseFloat(monthlyLimit) !== category.monthlyLimit ||
    parseInt(warningThreshold) !== category.warningThreshold ||
    color !== category.color
  );

  const handleSaveEdit = async () => {
    if (!category) return;
    setError('');

    try {
      await updateCategory.mutateAsync({
        categoryId: category.id,
        input: {
          monthlyLimit: parseFloat(monthlyLimit) || 0,
          warningThreshold: Math.min(100, Math.max(0, parseInt(warningThreshold) || 80)),
          color,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleRename = async () => {
    if (!category) return;
    setError('');

    if (!newName.trim()) {
      setError('Category name is required');
      return;
    }

    if (newName.trim() === category.name) {
      onClose();
      return;
    }

    // Check for duplicate name
    const isDuplicate = allCategories?.some(
      c => c.id !== category.id && c.name.toLowerCase() === newName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setError('A category with this name already exists');
      return;
    }

    try {
      await renameCategory.mutateAsync({
        categoryId: category.id,
        newName: newName.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename category');
    }
  };

  const handleMerge = async () => {
    if (!category || !targetCategoryId) return;
    setError('');

    try {
      await mergeCategories.mutateAsync({
        sourceCategoryId: category.id,
        targetCategoryId,
        reason: `Merged ${category.name} into ${targetCategory?.name}`,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge categories');
    }
  };

  const handleScheduleAdjustment = async () => {
    if (!category) return;
    setError('');

    const newLimitNum = parseFloat(nextMonthLimit);
    if (isNaN(newLimitNum) || newLimitNum < 0) {
      setError('Please enter a valid amount (0 or greater)');
      return;
    }

    // If there's already an adjustment, cancel it first
    if (categoryAdjustment) {
      try {
        await cancelAdjustment.mutateAsync(categoryAdjustment.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update adjustment');
        return;
      }
    }

    // If the new limit is the same as current, just cancel (already done above)
    if (newLimitNum === category.monthlyLimit) {
      onClose();
      return;
    }

    try {
      await scheduleAdjustment.mutateAsync({
        categoryName: category.name,
        currentLimit: category.monthlyLimit,
        newLimit: newLimitNum,
        reason: adjustmentReason || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule adjustment');
    }
  };

  const handleCancelAdjustment = async () => {
    if (!categoryAdjustment) return;
    setError('');

    try {
      await cancelAdjustment.mutateAsync(categoryAdjustment.id);
      setNextMonthLimit(category?.monthlyLimit.toString() || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel adjustment');
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    setError('');

    try {
      await deleteCategory.mutateAsync(category.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleClose = () => {
    if (!isPending) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  if (!isOpen || !category) return null;

  const tabs = [
    { id: 'edit' as TabType, label: 'Details', icon: Edit3 },
    { id: 'rename' as TabType, label: 'Rename', icon: Type },
    { id: 'merge' as TabType, label: 'Merge', icon: GitMerge },
    { id: 'adjustment' as TabType, label: 'Next Month', icon: Calendar },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: activeTab === 'edit' ? color : category.color }}
            />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {category.name}
            </h2>
            {/* Help tooltip trigger */}
            <div className="relative">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Help"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Help Tooltip - positioned inside modal content area */}
        {showHelp && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowHelp(false)} />
            <div className="absolute left-4 right-4 top-16 p-3 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-20 text-sm">
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Category Actions</p>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li><strong className="text-gray-800 dark:text-gray-100">Details:</strong> Change limits, colors, warnings — updates your budget template immediately</li>
                <li><strong className="text-gray-800 dark:text-gray-100">Next Month:</strong> Temporary adjustment for next month only. Great for holidays or one-time events</li>
                <li><strong className="text-gray-800 dark:text-gray-100">Merge:</strong> Combine categories — all transactions move to target</li>
                <li><strong className="text-gray-800 dark:text-gray-100">Rename:</strong> Change name — history is preserved</li>
              </ul>
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasAdjustment = tab.id === 'adjustment' && categoryAdjustment;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError('');
                  setShowDeleteConfirm(false);
                }}
                disabled={isPending}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative
                  ${isActive 
                    ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                  disabled:opacity-50
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {hasAdjustment && (
                  <span className="absolute top-1 right-1 sm:relative sm:top-0 sm:right-0 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 min-h-[280px] max-h-[60vh] overflow-y-auto">
          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Edit Tab */}
          {activeTab === 'edit' && (
            <div className="space-y-4">
              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Palette className="inline h-4 w-4 mr-1" />
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        color === c 
                          ? 'border-gray-900 dark:border-white scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Monthly Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Monthly Limit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="50"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Warning Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <AlertTriangle className="inline h-4 w-4 mr-1" />
                  Warning Threshold
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(e.target.value)}
                    min="50"
                    max="100"
                    step="5"
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                    {warningThreshold}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Alert when spending reaches this percentage of the limit
                </p>
              </div>

              {/* Preview */}
              {editHasChanges && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                    Changes Preview
                  </h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    {color !== category.color && (
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <ArrowRight className="h-3 w-3" />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        Color changed
                      </li>
                    )}
                    {parseFloat(monthlyLimit) !== category.monthlyLimit && (
                      <li>Limit: ₪{category.monthlyLimit} → ₪{parseFloat(monthlyLimit) || 0}</li>
                    )}
                    {parseInt(warningThreshold) !== category.warningThreshold && (
                      <li>Warning: {category.warningThreshold}% → {parseInt(warningThreshold) || 80}%</li>
                    )}
                  </ul>
                </div>
              )}

            </div>
          )}

          {/* Rename Tab */}
          {activeTab === 'rename' && (
            <div className="space-y-4">
              {/* Current name */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Current name:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
                </div>
              </div>

              {/* New name input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter new name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Renaming updates the name everywhere. All transactions and budget history 
                  will automatically show the new name.
                </p>
              </div>

            </div>
          )}

          {/* Merge Tab */}
          {activeTab === 'merge' && (
            <div className="space-y-4">
              {/* Source category */}
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Merge from:
                </label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ₪{category.monthlyLimit.toLocaleString()} budget • {transactionCount} transactions
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-gray-400 rotate-90" />
              </div>

              {/* Target selector */}
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Merge into:
                </label>
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select a category...</option>
                  {otherCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (₪{c.monthlyLimit.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Merge preview */}
              {targetCategory && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium">
                    <Info className="h-4 w-4" />
                    After merge:
                  </div>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1 ml-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      New budget: ₪{combinedBudget.toLocaleString()} / month
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      {transactionCount + targetTransactionCount} total transactions
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      "{category.name}" will be archived
                    </li>
                  </ul>
                </div>
              )}

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 rounded-lg text-sm">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Merging combines two categories. All transactions from "{category.name}" 
                  will be moved to the target category.
                </p>
              </div>
            </div>
          )}

          {/* Adjustment Tab */}
          {activeTab === 'adjustment' && (
            <div className="space-y-4">
              {/* Current vs Next Month */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Current Limit</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(category.monthlyLimit)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${
                  categoryAdjustment 
                    ? categoryAdjustment.adjustment_type === 'increase'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : categoryAdjustment.new_limit === 0
                        ? 'bg-gray-100 dark:bg-gray-600/50'
                        : 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Next Month</p>
                  {categoryAdjustment ? (
                    categoryAdjustment.new_limit === 0 ? (
                      <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                        Deactivated
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        {categoryAdjustment.adjustment_type === 'increase' ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                        <p className={`text-lg font-semibold ${
                          categoryAdjustment.adjustment_type === 'increase'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(categoryAdjustment.new_limit)}
                        </p>
                      </div>
                    )
                  ) : (
                    <p className="text-lg font-semibold text-gray-400 dark:text-gray-500">
                      No change
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              {!categoryAdjustment && category.monthlyLimit > 0 && (
                <button
                  onClick={() => {
                    setNextMonthLimit('0');
                    setAdjustmentReason('Deactivating category');
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <TrendingDown className="h-4 w-4" />
                  Deactivate Next Month
                </button>
              )}

              {/* Pending adjustment info */}
              {categoryAdjustment && (
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Scheduled adjustment</span>
                  </div>
                  <button
                    onClick={handleCancelAdjustment}
                    disabled={isPending}
                    className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* New limit input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Next Month's Limit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                  <input
                    type="number"
                    value={nextMonthLimit}
                    onChange={(e) => setNextMonthLimit(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="50"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Set to 0 to deactivate this category next month
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Why are you adjusting this category?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Preview */}
              {parseFloat(nextMonthLimit) !== category.monthlyLimit && nextMonthLimit !== '' && (
                <div className={`p-3 rounded-lg ${
                  parseFloat(nextMonthLimit) > category.monthlyLimit
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {parseFloat(nextMonthLimit) > category.monthlyLimit ? (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        Increase of {formatCurrency(parseFloat(nextMonthLimit) - category.monthlyLimit)}
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4" />
                        Decrease of {formatCurrency(category.monthlyLimit - parseFloat(nextMonthLimit))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Delete and Action buttons */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete this category
              </button>
              
              {/* Tab-specific action button */}
              {activeTab === 'edit' && (
                <button
                  onClick={handleSaveEdit}
                  disabled={isPending || !editHasChanges}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateCategory.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              {activeTab === 'rename' && (
                <button
                  onClick={handleRename}
                  disabled={isPending || newName.trim() === category.name}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {renameCategory.isPending ? 'Renaming...' : 'Rename Category'}
                </button>
              )}
              {activeTab === 'merge' && (
                <button
                  onClick={handleMerge}
                  disabled={isPending || !targetCategoryId}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <GitMerge className="h-4 w-4" />
                  {mergeCategories.isPending ? 'Merging...' : 'Merge Categories'}
                </button>
              )}
              {activeTab === 'adjustment' && (
                <button
                  onClick={handleScheduleAdjustment}
                  disabled={isPending || nextMonthLimit === '' || parseFloat(nextMonthLimit) === category.monthlyLimit}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {scheduleAdjustment.isPending ? 'Scheduling...' : 
                   categoryAdjustment ? 'Update Adjustment' : 'Schedule Adjustment'}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600 dark:text-red-400">
                {transactionCount > 0 
                  ? `Delete? (${transactionCount} transactions will keep their categorization)`
                  : 'Delete this category permanently?'
                }
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  {deleteCategory.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

