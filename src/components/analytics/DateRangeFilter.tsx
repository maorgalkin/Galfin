import React from 'react';
import type { DateRangeType } from '../../utils/dateRangeFilters';
import { getDateRange, formatDateRange } from '../../utils/dateRangeFilters';

interface DateRangeFilterProps {
  selectedRange: DateRangeType;
  onRangeChange: (range: DateRangeType) => void;
  availableMonthsCount?: number; // Number of months with budget data
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ 
  selectedRange, 
  onRangeChange,
  availableMonthsCount = 12, // Default to 12 if not provided
}) => {
  const { startDate, endDate } = getDateRange(selectedRange);

  const filters: { id: DateRangeType; label: string; requiredMonths: number }[] = [
    { id: 'mtd', label: 'Current Month', requiredMonths: 1 },
    { id: 'ytd', label: 'Year to Date', requiredMonths: 3 }, // Show if at least 3 months
    { id: 'qtd', label: 'Quarter to Date', requiredMonths: 2 }, // Show if at least 2 months
    { id: 'lastQuarter', label: 'Last Quarter', requiredMonths: 3 },
    { id: 'lastYear', label: 'Last 12 Months', requiredMonths: 6 }, // Show if at least 6 months
  ];

  // Filter out ranges that require more months than available
  const visibleFilters = filters.filter(f => availableMonthsCount >= f.requiredMonths);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {visibleFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onRangeChange(filter.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedRange === filter.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {formatDateRange(startDate, endDate)}
      </p>
    </div>
  );
};
