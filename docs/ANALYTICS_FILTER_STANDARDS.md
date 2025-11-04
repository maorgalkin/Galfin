# Analytics Filter Standards

**Date:** October 30, 2025  
**Purpose:** Standardized date range filters for all analytics views

## Standard Date Range Filters

All analytics views must include these five date range options:

### 1. Current Month to Date (MTD)
- **Range:** From 1st of current month to today
- **Example:** October 1, 2025 - October 30, 2025
- **Use Case:** Track current month's progress
- **Calculation:**
  ```typescript
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = today;
  ```

### 2. Current Year to Date (YTD)
- **Range:** From January 1st of current year to today
- **Example:** January 1, 2025 - October 30, 2025
- **Use Case:** Track annual progress and trends
- **Calculation:**
  ```typescript
  const today = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1);
  const endDate = today;
  ```

### 3. Quarter to Date (QTD)
- **Range:** From start of current quarter to today
- **Quarters:**
  - Q1: January - March
  - Q2: April - June
  - Q3: July - September
  - Q4: October - December
- **Example:** If today is October 30, 2025 → Q4 2025 (October 1 - October 30, 2025)
- **Use Case:** Track current quarter's progress (includes current partial month)
- **Calculation:**
  ```typescript
  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3);
  const quarterStartMonth = currentQuarter * 3;
  
  const startDate = new Date(today.getFullYear(), quarterStartMonth, 1);
  const endDate = today;
  ```

### 4. Last Full Quarter (Q1/Q2/Q3/Q4)
- **Range:** Complete previous quarter (3 months)
- **Example:** If today is October 30, 2025 → Q3 2025 (July 1 - September 30, 2025)
- **Use Case:** Analyze complete quarterly performance
- **Calculation:**
  ```typescript
  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3);
  const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
  const lastQuarterYear = currentQuarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
  
  const startDate = new Date(lastQuarterYear, lastQuarter * 3, 1);
  const endDate = new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0);
  ```

### 5. Last 12 Months (Rolling Year)
- **Range:** Complete 12-month rolling period ending with last completed month
- **Example:** If today is November 4, 2025 → October 1, 2024 - October 31, 2025
- **Use Case:** Full year trends without calendar year constraints, continuous 12-month view
- **Calculation:**
  ```typescript
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Last completed month
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  // 12 months before last completed month
  const startMonth = lastMonth;
  const startYear = lastMonthYear - 1;
  
  const startDate = new Date(startYear, startMonth, 1);
  const endDate = new Date(lastMonthYear, lastMonth + 1, 0); // Last day of last month
  ```

## Implementation Guidelines

### UI Component Structure

```tsx
interface DateRangeFilterProps {
  selectedRange: DateRangeType;
  onRangeChange: (range: DateRangeType) => void;
}

type DateRangeType = 'mtd' | 'ytd' | 'qtd' | 'lastQuarter' | 'lastYear';

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ selectedRange, onRangeChange }) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onRangeChange('mtd')}
        className={selectedRange === 'mtd' ? 'active' : ''}
      >
        Current Month
      </button>
      <button
        onClick={() => onRangeChange('ytd')}
        className={selectedRange === 'ytd' ? 'active' : ''}
      >
        Year to Date
      </button>
      <button
        onClick={() => onRangeChange('qtd')}
        className={selectedRange === 'qtd' ? 'active' : ''}
      >
        Quarter to Date
      </button>
      <button
        onClick={() => onRangeChange('lastQuarter')}
        className={selectedRange === 'lastQuarter' ? 'active' : ''}
      >
        Last Quarter
      </button>
      <button
        onClick={() => onRangeChange('lastYear')}
        className={selectedRange === 'lastYear' ? 'active' : ''}
      >
        Last 12 Months
      </button>
    </div>
  );
};
```

### Utility Function

Create a shared utility in `src/utils/dateRangeFilters.ts`:

```typescript
export type DateRangeType = 'mtd' | 'ytd' | 'qtd' | 'lastQuarter' | 'lastYear';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
  abbreviation: string;
}

export function getDateRange(rangeType: DateRangeType): DateRange {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  
  switch (rangeType) {
    case 'mtd':
      return {
        startDate: new Date(currentYear, currentMonth, 1),
        endDate: today,
        label: `${today.toLocaleDateString('en-US', { month: 'long' })} ${currentYear} (MTD)`,
        abbreviation: 'MTD'
      };
    
    case 'ytd':
      return {
        startDate: new Date(currentYear, 0, 1),
        endDate: today,
        label: `${currentYear} (YTD)`,
        abbreviation: 'YTD'
      };
    
    case 'lastQuarter':
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const lastQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear;
      const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
      
      return {
        startDate: new Date(lastQuarterYear, lastQuarter * 3, 1),
        endDate: new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0),
        label: `${quarterNames[lastQuarter]} ${lastQuarterYear}`,
        abbreviation: quarterNames[lastQuarter]
      };
    
    case 'lastYear':
      // Last 12 months: from 1st of last completed month's year-ago to last day of last completed month
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const startMonth = lastMonth;
      const startYear = lastMonthYear - 1;
      
      return {
        startDate: new Date(startYear, startMonth, 1),
        endDate: new Date(lastMonthYear, lastMonth + 1, 0), // Last day of month
        label: `Last 12 Months`,
        abbreviation: '12M'
      };
  }
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  rangeType: DateRangeType
): Transaction[] {
  const { startDate, endDate } = getDateRange(rangeType);
  
  return transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= startDate && transactionDate <= endDate;
  });
}
```

## Display Standards

### Filter Bar Position
- Place at top of analytics view
- Horizontal layout for desktop
- May stack for mobile
- Always visible (sticky on scroll optional)

### Active State
- Highlight selected filter with primary color
- Clear visual distinction from inactive filters
- Smooth transition animations

### Label Format
- **Desktop:** Full text ("Current Month", "Year to Date", etc.)
- **Mobile:** May use abbreviations ("MTD", "YTD", "Q3", "2024")

### Date Range Display
- Show selected date range below filters or in header
- Format: "January 1, 2025 - October 30, 2025"
- Update dynamically when filter changes

## Analytics View Requirements

Every analytics view must:

1. ✅ Include all five date range filters
2. ✅ Default to "Year to Date" (YTD) on first load
3. ✅ Persist selected filter in component state
4. ✅ Update all charts/metrics when filter changes
5. ✅ Show loading state during filter change
6. ✅ Display selected date range prominently
7. ✅ Handle edge cases (no data, partial data)

## Example Usage

```tsx
const SpendingTrendsAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRangeType>('ytd');
  const { transactions } = useFinance();
  
  const filteredTransactions = useMemo(() => {
    return filterTransactionsByDateRange(transactions, dateRange);
  }, [transactions, dateRange]);
  
  const { startDate, endDate, label } = getDateRange(dateRange);
  
  return (
    <div>
      <div className="mb-6">
        <DateRangeFilter
          selectedRange={dateRange}
          onRangeChange={setDateRange}
        />
        <p className="text-sm text-gray-500 mt-2">
          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </p>
      </div>
      
      <SpendingChart data={filteredTransactions} />
      <CategoryBreakdown data={filteredTransactions} />
      <TrendAnalysis data={filteredTransactions} />
    </div>
  );
};
```

## Future Enhancements

Potential additions for future consideration:
- Custom date range picker
- Comparison mode (e.g., YTD 2025 vs YTD 2024)
- Rolling periods (Last 30 days, Last 90 days)
- Fiscal year support (non-calendar year)
- Preset saved filters

## Testing Requirements

All date range filters must be tested for:
- Correct date calculations
- Boundary conditions (year/quarter transitions)
- Leap years
- Empty result sets
- Performance with large datasets

---

**Note:** This is a **mandatory standard** for all analytics features. Any new analytics view must implement these five date range filters.
