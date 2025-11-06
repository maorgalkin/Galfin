/**
 * Category Color Palette System
 * Ensures all category colors are distinct and readable
 */

// Predefined palette of distinct, accessible colors
// Chosen for good contrast against both light and dark backgrounds
export const CATEGORY_COLOR_PALETTE = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#A855F7', // Purple
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#0EA5E9', // Sky
  '#D946EF', // Fuchsia
  '#DC2626', // Red-600
  '#059669', // Emerald-600
  '#7C3AED', // Violet-600
  '#DB2777', // Pink-600
];

// Convert hex color to RGB values
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Get the next available color from the palette
 * Returns a color that isn't already used by existing categories
 */
export function getNextAvailableColor(usedColors: string[]): string {
  // Normalize used colors to lowercase for comparison
  const normalizedUsed = usedColors.map(c => c.toLowerCase());
  
  // Find first color not in use
  const availableColor = CATEGORY_COLOR_PALETTE.find(
    color => !normalizedUsed.includes(color.toLowerCase())
  );
  
  // If all colors are used, generate a distinct color
  if (!availableColor) {
    return generateDistinctColor(usedColors);
  }
  
  return availableColor;
}

/**
 * Generate a distinct color when palette is exhausted
 * Uses HSL color space to create colors that are sufficiently different
 */
function generateDistinctColor(usedColors: string[]): string {
  // Convert used colors to HSL to find gaps in hue spectrum
  const usedHues = usedColors
    .map(hexToHsl)
    .filter(hsl => hsl !== null)
    .map(hsl => hsl!.h);
  
  if (usedHues.length === 0) {
    return CATEGORY_COLOR_PALETTE[0]; // Fallback to first palette color
  }
  
  // Generate a hue that's maximally distant from existing hues
  let maxDistance = 0;
  let bestHue = 0;
  
  for (let testHue = 0; testHue < 360; testHue += 15) {
    const minDistance = Math.min(...usedHues.map(h => {
      const diff = Math.abs(testHue - h);
      return Math.min(diff, 360 - diff); // Account for circular hue space
    }));
    if (minDistance > maxDistance) {
      maxDistance = minDistance;
      bestHue = testHue;
    }
  }
  
  // Generate color with good saturation and lightness
  return hslToHex(bestHue, 65, 55);
}

/**
 * Convert hex color to HSL
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }
  
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Check if a color is sufficiently distinct from existing colors
 * Minimum hue difference of 30 degrees ensures visual distinction
 */
export function isColorDistinct(color: string, existingColors: string[], minHueDiff: number = 30): boolean {
  const colorHsl = hexToHsl(color);
  if (!colorHsl) return false;
  
  for (const existingColor of existingColors) {
    const existingHsl = hexToHsl(existingColor);
    if (!existingHsl) continue;
    
    const hueDiff = Math.abs(colorHsl.h - existingHsl.h);
    const circularDiff = Math.min(hueDiff, 360 - hueDiff);
    
    // Check if colors are too similar
    if (circularDiff < minHueDiff) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get a distinct color, optionally validating a preferred color
 * @param existingColors Array of hex colors already in use
 * @param preferredColor Optional preferred color (will be used if sufficiently distinct)
 */
export function getDistinctColor(
  existingColors: string[],
  preferredColor?: string
): string {
  // If preferred color is provided and distinct enough, use it
  if (preferredColor && isColorDistinct(preferredColor, existingColors)) {
    return preferredColor;
  }
  
  // Otherwise get next available from palette
  return getNextAvailableColor(existingColors);
}

// Get category color from personal budget and return inline styles
export const getCategoryColor = (
  category: string, 
  type: 'income' | 'expense', 
  personalBudget?: { categories?: Record<string, { color?: string }> } | null
) => {
  let hexColor = '#64748B'; // Default gray
  
  // Try to get color from personal budget for expenses
  if (type === 'expense' && personalBudget?.categories?.[category]?.color) {
    hexColor = personalBudget.categories[category].color!;
  } else if (type === 'income') {
    // Income categories with predefined colors
    const incomeColors: Record<string, string> = {
      'Salary': '#10B981',      // Green
      'Rent': '#3B82F6',        // Blue
      'Government Allowance': '#8B5CF6',  // Purple
      'Gift': '#EC4899',        // Pink
      'Other': '#6B7280',       // Gray
    };
    hexColor = incomeColors[category] || '#10B981';
  }
  
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return {
      bg: '#f1f5f9',
      border: '#cbd5e1',
      text: '#475569',
      tile: '#f8fafc',
      hexColor: '#64748B'
    };
  }
  
  // Return CSS color values that can be used with style prop
  return {
    bg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
    text: hexColor,
    tile: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`,
    hexColor: hexColor
  };
};