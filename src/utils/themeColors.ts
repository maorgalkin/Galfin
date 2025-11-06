/**
 * Centralized theme color utilities
 * Provides consistent color schemes across the application
 */

export type ThemeColor = 'purple' | 'blue' | 'green';

/**
 * Get gradient background classes for headers
 */
export const getHeaderGradient = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'bg-gradient-to-r from-purple-500 to-purple-600';
    case 'blue':
      return 'bg-gradient-to-r from-blue-500 to-blue-600';
    case 'green':
      return 'bg-gradient-to-r from-green-500 to-green-600';
    default:
      return 'bg-gradient-to-r from-purple-500 to-purple-600';
  }
};

/**
 * Get accent/badge background color with opacity
 */
export const getAccentColor = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'bg-purple-400/30';
    case 'blue':
      return 'bg-blue-400/30';
    case 'green':
      return 'bg-green-400/30';
    default:
      return 'bg-purple-400/30';
  }
};

/**
 * Get light text color for use on colored backgrounds
 */
export const getTextColor = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'text-purple-100';
    case 'blue':
      return 'text-blue-100';
    case 'green':
      return 'text-green-100';
    default:
      return 'text-purple-100';
  }
};

/**
 * Get primary button background color
 */
export const getButtonBg = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'bg-purple-100 dark:bg-purple-800';
    case 'blue':
      return 'bg-blue-100 dark:bg-blue-800';
    case 'green':
      return 'bg-green-100 dark:bg-green-800';
    default:
      return 'bg-purple-100 dark:bg-purple-800';
  }
};

/**
 * Get button hover background color
 */
export const getButtonHoverBg = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'hover:bg-purple-200 dark:hover:bg-purple-700';
    case 'blue':
      return 'hover:bg-blue-200 dark:hover:bg-blue-700';
    case 'green':
      return 'hover:bg-green-200 dark:hover:bg-green-700';
    default:
      return 'hover:bg-purple-200 dark:hover:bg-purple-700';
  }
};

/**
 * Get border color
 */
export const getBorderColor = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'border-purple-300 dark:border-purple-600';
    case 'blue':
      return 'border-blue-300 dark:border-blue-600';
    case 'green':
      return 'border-green-300 dark:border-green-600';
    default:
      return 'border-purple-300 dark:border-purple-600';
  }
};

/**
 * Get icon/text color for buttons
 */
export const getIconColor = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'text-purple-700 dark:text-purple-200';
    case 'blue':
      return 'text-blue-700 dark:text-blue-200';
    case 'green':
      return 'text-green-700 dark:text-green-200';
    default:
      return 'text-purple-700 dark:text-purple-200';
  }
};

/**
 * Get heading text color
 */
export const getHeadingColor = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'text-purple-900 dark:text-purple-100';
    case 'blue':
      return 'text-blue-900 dark:text-blue-100';
    case 'green':
      return 'text-green-900 dark:text-green-100';
    default:
      return 'text-purple-900 dark:text-purple-100';
  }
};

/**
 * Get subheading/secondary text color
 */
export const getSubheadingColor = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'text-purple-700 dark:text-purple-300';
    case 'blue':
      return 'text-blue-700 dark:text-blue-300';
    case 'green':
      return 'text-green-700 dark:text-green-300';
    default:
      return 'text-purple-700 dark:text-purple-300';
  }
};

/**
 * Get active/selected background color
 */
export const getActiveBg = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'bg-purple-600 dark:bg-purple-700';
    case 'blue':
      return 'bg-blue-600 dark:bg-blue-700';
    case 'green':
      return 'bg-green-600 dark:bg-green-700';
    default:
      return 'bg-purple-600 dark:bg-purple-700';
  }
};

/**
 * Get active border color
 */
export const getActiveBorderColor = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'border-purple-600 dark:border-purple-500';
    case 'blue':
      return 'border-blue-600 dark:border-blue-500';
    case 'green':
      return 'border-green-600 dark:border-green-500';
    default:
      return 'border-purple-600 dark:border-purple-500';
  }
};

/**
 * Get inactive background color (for non-selected items)
 */
export const getInactiveBg = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'bg-white dark:bg-purple-900/20';
    case 'blue':
      return 'bg-white dark:bg-blue-900/20';
    case 'green':
      return 'bg-white dark:bg-green-900/20';
    default:
      return 'bg-white dark:bg-purple-900/20';
  }
};

/**
 * Get inactive text color
 */
export const getInactiveTextColor = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'text-purple-500 dark:text-purple-300';
    case 'blue':
      return 'text-blue-500 dark:text-blue-300';
    case 'green':
      return 'text-green-500 dark:text-green-300';
    default:
      return 'text-purple-500 dark:text-purple-300';
  }
};

/**
 * Get inactive border color
 */
export const getInactiveBorderColor = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'border-purple-200 dark:border-purple-700';
    case 'blue':
      return 'border-blue-200 dark:border-blue-700';
    case 'green':
      return 'border-green-200 dark:border-green-700';
    default:
      return 'border-purple-200 dark:border-purple-700';
  }
};

/**
 * Get primary action button background (solid color for CTAs)
 */
export const getPrimaryButtonBg = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'bg-purple-600';
    case 'blue':
      return 'bg-blue-600';
    case 'green':
      return 'bg-green-600';
    default:
      return 'bg-purple-600';
  }
};

/**
 * Get primary action button hover background
 */
export const getPrimaryButtonHoverBg = (color: ThemeColor): string => {
  switch (color) {
    case 'purple':
      return 'hover:bg-purple-700';
    case 'blue':
      return 'hover:bg-blue-700';
    case 'green':
      return 'hover:bg-green-700';
    default:
      return 'hover:bg-purple-700';
  }
};
