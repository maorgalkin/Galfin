import React, { useState } from 'react';
import { 
  useNextMonthAdjustments, 
  useScheduleAdjustment, 
  useCancelAdjustment,
  useActiveBudget 
} from '../hooks/useBudgets';
import { Calendar, TrendingUp, TrendingDown, X, Plus, Loader2, AlertCircle } from 'lucide-react';
import type { CategoryConfig } from '../types/budget';

interface BudgetAdjustmentSchedulerProps {
  className?: string;
}

export const BudgetAdjustmentScheduler: React.FC<BudgetAdjustmentSchedulerProps> = ({
  className = '',
}) => {
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [reason, setReason] = useState('');

  const { data: nextMonthSummary, isLoading } = useNextMonthAdjustments();
  const { data: activeBudget } = useActiveBudget();
  const scheduleAdjustment = useScheduleAdjustment();
  const cancelAdjustment = useCancelAdjustment();

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSchedule = async () => {
    if (!selectedCategory || !newLimit || !activeBudget) return;

    const currentLimit = activeBudget.categories[selectedCategory]?.monthlyLimit || 0;
    const newLimitNum = parseFloat(newLimit);

    if (isNaN(newLimitNum) || newLimitNum < 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await scheduleAdjustment.mutateAsync({
        categoryName: selectedCategory,
        currentLimit,
        newLimit: newLimitNum,
        reason: reason || undefined,
      });

      // Reset form
      setSelectedCategory('');
      setNewLimit('');
      setReason('');
      setIsScheduling(false);
    } catch (error) {
      console.error('Error scheduling adjustment:', error);
      alert('Failed to schedule adjustment');
    }
  };

  const handleCancel = async (adjustmentId: string) => {
    if (!confirm('Are you sure you want to cancel this adjustment?')) return;

    try {
      await cancelAdjustment.mutateAsync(adjustmentId);
    } catch (error) {
      console.error('Error cancelling adjustment:', error);
      alert('Failed to cancel adjustment');
    }
  };

  const activeCategories = activeBudget?.categories || {};
  const availableCategories = Object.keys(activeCategories).filter(
    cat => activeCategories[cat].isActive
  );

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading adjustments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Next Month Adjustments
            </h3>
            {nextMonthSummary && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                {nextMonthSummary.effectiveDate}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsScheduling(!isScheduling)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {isScheduling ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Schedule
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {nextMonthSummary && nextMonthSummary.adjustmentCount > 0 && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Adjustments</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {nextMonthSummary.adjustmentCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 uppercase">Increases</p>
              <p className="text-xl font-semibold text-green-600 dark:text-green-400 mt-1">
                +{formatCurrency(nextMonthSummary.totalIncrease)}
              </p>
            </div>
            <div>
              <p className="text-xs text-red-600 dark:text-red-400 uppercase">Decreases</p>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400 mt-1">
                -{formatCurrency(nextMonthSummary.totalDecrease)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Net Change</p>
              <p className={`text-xl font-semibold mt-1 ${
                nextMonthSummary.netChange > 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : nextMonthSummary.netChange < 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-600 dark:text-gray-400'
              }`}>
                {nextMonthSummary.netChange > 0 && '+'}
                {formatCurrency(nextMonthSummary.netChange)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Form */}
      {isScheduling && (
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select a category...</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} - Current: {formatCurrency(activeCategories[cat].monthlyLimit)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Limit
              </label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="Enter new limit..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you adjusting this category?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={2}
              />
            </div>

            <button
              onClick={handleSchedule}
              disabled={!selectedCategory || !newLimit || scheduleAdjustment.isPending}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {scheduleAdjustment.isPending ? 'Scheduling...' : 'Schedule Adjustment'}
            </button>
          </div>
        </div>
      )}

      {/* Pending Adjustments List */}
      <div className="px-6 py-4">
        {!nextMonthSummary || nextMonthSummary.adjustmentCount === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No adjustments scheduled for next month</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Click "Schedule" to create your first adjustment
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {nextMonthSummary.adjustments.map((adjustment) => (
              <div
                key={adjustment.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div>
                    {adjustment.adjustment_type === 'increase' ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {adjustment.category_name}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>{formatCurrency(adjustment.current_limit)}</span>
                      <span>→</span>
                      <span className="font-medium">{formatCurrency(adjustment.new_limit)}</span>
                      <span className={`ml-2 ${
                        adjustment.adjustment_type === 'increase' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        ({adjustment.adjustment_type === 'increase' ? '+' : '-'}
                        {formatCurrency(adjustment.adjustment_amount)})
                      </span>
                    </div>
                    {adjustment.reason && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                        "{adjustment.reason}"
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(adjustment.id)}
                  disabled={cancelAdjustment.isPending}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Cancel adjustment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
