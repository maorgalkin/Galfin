// Add Category Modal
// Part of Category Management Restructure (Phase 4)
// Updated: supports adding now or scheduling for next month

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Calendar, Zap } from 'lucide-react';
import { useCreateCategory, useCategories } from '../../hooks/useCategories';
import { useScheduleAdjustment, useNextMonthAdjustments } from '../../hooks/useBudgets';
import { DEFAULT_CATEGORY_COLORS, getNextCategoryColor } from '../../types/category';

type AddMode = 'now' | 'next-month';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose }) => {
  const { data: existingCategories } = useCategories();
  const { data: nextMonthSummary } = useNextMonthAdjustments();
  const createCategory = useCreateCategory();
  const scheduleAdjustment = useScheduleAdjustment();
  
  const [addMode, setAddMode] = useState<AddMode>('now');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('80');
  const [error, setError] = useState('');

  // Check if name already exists in pending adjustments
  const nameExistsInAdjustments = (categoryName: string): boolean => {
    if (!nextMonthSummary) return false;
    return nextMonthSummary.adjustments.some(
      adj => adj.category_name.toLowerCase() === categoryName.toLowerCase()
    );
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAddMode('now');
      setName('');
      setMonthlyLimit('');
      setWarningThreshold('80');
      setError('');
      
      // Set next available color
      const existingColors = existingCategories?.map(c => c.color.toLowerCase()) || [];
      setColor(getNextCategoryColor(existingColors));
    }
  }, [isOpen, existingCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    // Check for duplicate name in existing categories
    const isDuplicate = existingCategories?.some(
      c => c.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (isDuplicate) {
      setError('A category with this name already exists');
      return;
    }

    // Check for duplicate in pending adjustments (for next-month mode)
    if (addMode === 'next-month' && nameExistsInAdjustments(name.trim())) {
      setError('A category with this name is already scheduled for next month');
      return;
    }

    try {
      if (addMode === 'now') {
        // Create category immediately
        await createCategory.mutateAsync({
          name: name.trim(),
          color,
          monthlyLimit: parseFloat(monthlyLimit) || 0,
          warningThreshold: parseInt(warningThreshold) || 80,
        });
      } else {
        // Schedule as adjustment for next month
        await scheduleAdjustment.mutateAsync({
          categoryName: name.trim(),
          currentLimit: 0,
          newLimit: parseFloat(monthlyLimit) || 0,
          reason: 'New category scheduled for next month',
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const isPending = createCategory.isPending || scheduleAdjustment.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add Category
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Add Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setAddMode('now')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                addMode === 'now'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Zap className="h-4 w-4" />
              Add Now
            </button>
            <button
              type="button"
              onClick={() => setAddMode('next-month')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                addMode === 'next-month'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Next Month
            </button>
          </div>
          
          {addMode === 'next-month' && (
            <p className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
              This category will be created when the new month starts
            </p>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Color - only for immediate add */}
          {addMode === 'now' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          )}

          {/* Monthly Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

          {/* Warning Threshold - only for immediate add */}
          {addMode === 'now' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                addMode === 'now'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {isPending 
                ? (addMode === 'now' ? 'Creating...' : 'Scheduling...') 
                : (addMode === 'now' ? 'Create Category' : 'Schedule for Next Month')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
