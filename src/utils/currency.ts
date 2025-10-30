/**
 * Currency formatting utilities
 * Provides consistent currency formatting across the application
 */

/**
 * Format a number as currency with consistent symbol placement
 * Always uses en-US locale for consistent left-side symbol placement
 * regardless of currency (USD, EUR, GBP, ILS, etc.)
 * 
 * @param amount - The numeric amount to format
 * @param currency - Currency code (USD, EUR, GBP, ILS, etc.)
 * @returns Formatted currency string with symbol on the left
 * 
 * @example
 * formatCurrency(1234.56, 'USD') // "$1,234.56"
 * formatCurrency(1234.56, 'ILS') // "₪1,234.56"
 * formatCurrency(1234.56, 'EUR') // "€1,234.56"
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // Always use en-US locale for consistent left-side symbol placement
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Get the currency symbol for a given currency code
 * @param currency - Currency code (USD, EUR, GBP, ILS, etc.)
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  });
  
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find(part => part.type === 'currency');
  return symbolPart?.value || currency;
}
