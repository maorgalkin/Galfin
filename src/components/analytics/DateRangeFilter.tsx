import React from 'react';
import type { DateRangeType } from '../../utils/dateRangeFilters';
import { getDateRange, formatDateRange } from '../../utils/dateRangeFilters';

interface DateRangeFilterProps {
  selectedRange: DateRangeType;
  onRangeChange: (range: DateRangeType) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ 
  selectedRange, 
  onRangeChange 
}) => {
  const { startDate, endDate } = getDateRange(selectedRange);

  const filters: { id: DateRangeType; label: string }[] = [
    { id: 'mtd', label: 'Current Month' },
    { id: 'ytd', label: 'Year to Date' },
    { id: 'qtd', label: 'Quarter to Date' },
    { id: 'lastQuarter', label: 'Last Quarter' },
    { id: 'lastYear', label: 'Last 12 Months' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
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
