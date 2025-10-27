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
 * Get last day of the month
 */
export const getMonthEnd = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
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
