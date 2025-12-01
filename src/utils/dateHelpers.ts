/**
 * Date Helper Utilities
 * Provides functions for date formatting and manipulation
 */

/**
 * Get formatted month and year label (e.g., "January 2025")
 */
export const getMonthLabel = (date: Date): string => {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Get month name only (e.g., "January")
 */
export const getMonthName = (date: Date): string => {
  return date.toLocaleString('en-US', { month: 'long' });
};

/**
 * Get year as string (e.g., "2025")
 */
export const getYear = (date: Date): string => {
  return date.getFullYear().toString();
};

/**
 * Get first day of the month
 */
export const getMonthStart = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * Get last day of the month (at end of day 23:59:59.999)
 */
export const getMonthEnd = (date: Date): Date => {
  // Get the last day of the month at 23:59:59.999 to include the full day
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);
  return lastDay;
};

/**
 * Generate array of last N months with date info
 * @param count Number of months to generate (including current)
 * @returns Array of month objects with label, name, year, start, and end dates
 */
export const getLastNMonths = (count: number = 4) => {
  const now = new Date();
  return Array.from({ length: count }, (_, offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return {
      label: getMonthLabel(d),
      monthName: getMonthName(d),
      year: getYear(d),
      start: getMonthStart(d),
      end: getMonthEnd(d),
    };
  });
};

/**
 * Check if a date falls within a date range
 */
export const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};

/**
 * Get all unique months that have transactions
 * @param transactions Array of transactions
 * @returns Array of month objects sorted from newest to oldest
 */
export const getMonthsWithData = (transactions: { date: string | Date }[]) => {
  if (!transactions || transactions.length === 0) {
    // Return current month if no transactions
    const now = new Date();
    return [{
      label: getMonthLabel(now),
      monthName: getMonthName(now),
      year: getYear(now),
      start: getMonthStart(now),
      end: getMonthEnd(now),
    }];
  }

  // Extract unique year-month combinations
  const monthSet = new Set<string>();
  transactions.forEach(t => {
    const date = new Date(t.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    monthSet.add(key);
  });

  // Convert to sorted array of month objects (newest first)
  const months = Array.from(monthSet)
    .map(key => {
      const [year, month] = key.split('-').map(Number);
      const d = new Date(year, month, 1);
      return {
        label: getMonthLabel(d),
        monthName: getMonthName(d),
        year: getYear(d),
        start: getMonthStart(d),
        end: getMonthEnd(d),
      };
    })
    .sort((a, b) => b.start.getTime() - a.start.getTime());

  return months;
};
