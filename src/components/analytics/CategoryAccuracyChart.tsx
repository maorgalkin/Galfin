import React, { useState, useEffect, useMemo } from 'react';
import { AccuracyTarget } from './AccuracyTarget';
import { categoryAccuracyService } from '../../services/categoryAccuracyService';
import type { CategoryAccuracy } from '../../types/analytics';
import type { Transaction } from '../../types';
import type { PersonalBudget } from '../../types/budget';
import type { DateRangeType } from '../../utils/dateRangeFilters';
import { getDateRange } from '../../utils/dateRangeFilters';

interface CategoryAccuracyChartProps {
  transactions: Transaction[];
  personalBudget: PersonalBudget | null | undefined;
  currency?: string;
  selectedRange: DateRangeType;
}

/**
 * Main container for Category Accuracy analysis
 * Displays bullseye targets showing how accurately each category was budgeted
 */
export const CategoryAccuracyChart: React.FC<CategoryAccuracyChartProps> = ({
  transactions,
  personalBudget,
  currency = '$',
  selectedRange,
}) => {
  const [accuracyData, setAccuracyData] = useState<CategoryAccuracy[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    return getDateRange(selectedRange);
  }, [selectedRange]);

  // Calculate accuracy data when range or budget changes
  useEffect(() => {
    const calculateAccuracy = async () => {
      if (!personalBudget) {
        setAccuracyData([]);
        setSelectedCategory('');
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
        
        // Auto-select first category if none selected
        if (!selectedCategory && data.length > 0) {
          setSelectedCategory(data[0].category);
        }
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
  
  // Get the selected category's accuracy data
  const selectedAccuracy = useMemo(() => {
    return accuracyData.find(a => a.category === selectedCategory);
  }, [accuracyData, selectedCategory]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Category Accuracy
        </h2>
        
        {/* Category Selector Dropdown */}
        {accuracyData.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {accuracyData.map((accuracy) => (
              <option key={accuracy.category} value={accuracy.category}>
                {accuracy.category}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Calculating accuracy...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {!isLoading && !error && selectedAccuracy && (
        <div className="flex flex-col items-center gap-6">
          {/* Large Accuracy Target */}
          <div className="flex justify-center">
            <AccuracyTarget
              accuracy={selectedAccuracy}
              currency={currency}
              size={320}
            />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budgeted Average</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {currency}{selectedAccuracy.budgetAverage.toFixed(0)}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Actual Average</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {currency}{selectedAccuracy.actualAverage.toFixed(0)}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Accuracy</div>
              <div className={`text-2xl font-bold ${
                selectedAccuracy.accuracyPercentage >= 95 && selectedAccuracy.accuracyPercentage <= 105
                  ? 'text-green-600 dark:text-green-400'
                  : selectedAccuracy.accuracyPercentage >= 85 && selectedAccuracy.accuracyPercentage <= 115
                  ? 'text-blue-600 dark:text-blue-400'
                  : selectedAccuracy.accuracyPercentage < 50 || selectedAccuracy.accuracyPercentage > 150
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {selectedAccuracy.accuracyPercentage.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Performance Description */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 w-full">
            <p className="text-blue-800 dark:text-blue-200 text-center">
              {categoryAccuracyService.getPerformanceLabel(selectedAccuracy.accuracyZone)}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && accuracyData.length === 0 && (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          No category data available for the selected date range.
        </div>
      )}
    </div>
  );
};
