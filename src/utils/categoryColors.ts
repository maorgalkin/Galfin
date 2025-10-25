// Convert hex color to RGB values
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Get category color from budget config and return inline styles
export const getCategoryColor = (category: string, type: 'income' | 'expense', budgetConfig?: any) => {
  let hexColor = '#64748B'; // Default gray
  
  // Try to get color from budget config for expenses
  if (type === 'expense' && budgetConfig?.categories?.[category]?.color) {
    hexColor = budgetConfig.categories[category].color;
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