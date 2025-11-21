import React, { useState, useEffect, useMemo } from 'react';
import { AccuracyTargetGrid } from './AccuracyTargetGrid';
import { categoryAccuracyService } from '../../services/categoryAccuracyService';
import type { CategoryAccuracy } from '../../types/analytics';
import type { Transaction } from '../../types';
import type { PersonalBudget } from '../../types/budget';

type AccuracyDateRange = 'last-month' | 'last-3-months' | 'last-6-months' | 'last-12-months' | 'ytd' | 'all-time';

interface CategoryAccuracyChartProps {
  transactions: Transaction[];
  personalBudget: PersonalBudget | null | undefined;
  currency?: string;
  oldestTransactionDate?: Date;
}

/**
 * Main container for Category Accuracy analysis
 * Displays bullseye targets showing how accurately each category was budgeted
 */
export const CategoryAccuracyChart: React.FC<CategoryAccuracyChartProps> = ({
  transactions,
  personalBudget,
  currency = '$',
  oldestTransactionDate,
}) => {
  const [selectedRange, setSelectedRange] = useState<AccuracyDateRange>('last-3-months');
  const [accuracyData, setAccuracyData] = useState<CategoryAccuracy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    
    switch (selectedRange) {
      case 'last-month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        break;
      case 'last-3-months':
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setDate(1);
        break;
      case 'last-6-months':
        startDate.setMonth(startDate.getMonth() - 6);
        startDate.setDate(1);
        break;
      case 'last-12-months':
        startDate.setMonth(startDate.getMonth() - 12);
        startDate.setDate(1);
        break;
      case 'ytd':
        startDate = new Date(startDate.getFullYear(), 0, 1);
        break;
      case 'all-time':
        startDate = oldestTransactionDate || new Date(startDate.getFullYear() - 1, 0, 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setDate(1);
    }
    
    startDate.setHours(0, 0, 0, 0);
    
    return { startDate, endDate };
  }, [selectedRange, oldestTransactionDate]);

  // Calculate accuracy data when range or budget changes
  useEffect(() => {
    const calculateAccuracy = async () => {
      if (!personalBudget) {
        setAccuracyData([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await categoryAccuracyService.calculateCategoryAccuracy(
          transactions,
          personalBudget,
          dateRange.startDate,
          dateRange.endDate
        );
        setAccuracyData(data);
      } catch (err) {
        console.error('Error calculating category accuracy:', err);
        setError('Failed to calculate accuracy data. Please try again.');
        setAccuracyData([]);
      } finally {
        setIsLoading(false);
      }
    };

    calculateAccuracy();
  }, [transactions, personalBudget, dateRange.startDate, dateRange.endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Category Accuracy
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            See how accurately you've budgeted for each category
          </p>
        </div>

        {/* Custom Date Range Selector */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'last-month' as AccuracyDateRange, label: 'Last Month' },
            { id: 'last-3-months' as AccuracyDateRange, label: 'Last 3 Months' },
            { id: 'last-6-months' as AccuracyDateRange, label: 'Last 6 Months' },
            { id: 'last-12-months' as AccuracyDateRange, label: 'Last 12 Months' },
            { id: 'ytd' as AccuracyDateRange, label: 'Year to Date' },
            { id: 'all-time' as AccuracyDateRange, label: 'All Time' },
          ].map(range => (
            <button
              key={range.id}
              onClick={() => setSelectedRange(range.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedRange === range.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description Card */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎯</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              How to Read the Targets
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 space-y-1">
              <p>
                • <strong>Bullseye (Green):</strong> Perfect accuracy - spending matches budget within 5%
              </p>
              <p>
                • <strong>Outer Rings (Yellow/Orange/Red):</strong> Further from center means greater variance
              </p>
              <p>
                • <strong>Bust (Red X):</strong> Significantly over budget (&gt;80% over)
              </p>
              <p>
                • <strong>Grayed Out:</strong> No spending - consider reallocating this budget
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-sm font-medium text-red-800 dark:text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* Accuracy Grid */}
      <AccuracyTargetGrid
        accuracyData={accuracyData}
        currency={currency}
        isLoading={isLoading}
      />
    </div>
  );
};
