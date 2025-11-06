import { describe, it, expect } from 'vitest';
import {
  CATEGORY_COLOR_PALETTE,
  getNextAvailableColor,
  getDistinctColor,
  isColorDistinct,
} from '../../src/utils/categoryColors';

describe('Category Color System', () => {
  describe('CATEGORY_COLOR_PALETTE', () => {
    it('should contain 20 distinct colors', () => {
      expect(CATEGORY_COLOR_PALETTE).toHaveLength(20);
      
      // All should be valid hex colors
      CATEGORY_COLOR_PALETTE.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should have unique colors in palette', () => {
      const uniqueColors = new Set(CATEGORY_COLOR_PALETTE.map(c => c.toUpperCase()));
      expect(uniqueColors.size).toBe(CATEGORY_COLOR_PALETTE.length);
    });
  });

  describe('getNextAvailableColor', () => {
    it('should return first color when no colors are used', () => {
      const result = getNextAvailableColor([]);
      expect(result).toBe(CATEGORY_COLOR_PALETTE[0]);
    });

    it('should skip used colors', () => {
      const usedColors = [CATEGORY_COLOR_PALETTE[0]];
      const result = getNextAvailableColor(usedColors);
      expect(result).toBe(CATEGORY_COLOR_PALETTE[1]);
    });

    it('should be case-insensitive when checking used colors', () => {
      const usedColors = [CATEGORY_COLOR_PALETTE[0].toLowerCase()];
      const result = getNextAvailableColor(usedColors);
      expect(result).toBe(CATEGORY_COLOR_PALETTE[1]);
    });

    it('should generate a new color when all palette colors are used', () => {
      const usedColors = [...CATEGORY_COLOR_PALETTE];
      const result = getNextAvailableColor(usedColors);
      
      // Should return a valid hex color
      expect(result).toMatch(/^#[0-9A-F]{6}$/i);
      // Should not be in the palette (new generated color)
      expect(CATEGORY_COLOR_PALETTE).not.toContain(result);
    });

    it('should skip multiple used colors in sequence', () => {
      const usedColors = [
        CATEGORY_COLOR_PALETTE[0],
        CATEGORY_COLOR_PALETTE[1],
        CATEGORY_COLOR_PALETTE[2],
      ];
      const result = getNextAvailableColor(usedColors);
      expect(result).toBe(CATEGORY_COLOR_PALETTE[3]);
    });
  });

  describe('isColorDistinct', () => {
    it('should return true for colors far apart in hue', () => {
      const existingColors = ['#FF0000']; // Red
      const newColor = '#00FF00'; // Green (120° apart)
      expect(isColorDistinct(newColor, existingColors)).toBe(true);
    });

    it('should return false for colors too close in hue', () => {
      const existingColors = ['#FF0000']; // Red
      const newColor = '#FF1111'; // Slightly different red
      expect(isColorDistinct(newColor, existingColors)).toBe(false);
    });

    it('should handle multiple existing colors', () => {
      const existingColors = ['#FF0000', '#00FF00', '#0000FF'];
      const newColor = '#FFFF00'; // Yellow, between red and green
      // Should be distinct enough from all
      expect(isColorDistinct(newColor, existingColors, 30)).toBe(true);
    });

    it('should respect custom minimum hue difference', () => {
      const existingColors = ['#FF0000'];
      const newColor = '#FF4400'; // 15° apart
      
      // With 30° minimum, should be false
      expect(isColorDistinct(newColor, existingColors, 30)).toBe(false);
      
      // With 10° minimum, should be true
      expect(isColorDistinct(newColor, existingColors, 10)).toBe(true);
    });

    it('should handle circular hue space (red wraps to red)', () => {
      const existingColors = ['#FF0000']; // Red at 0°
      const newColor = '#FF0044'; // Red-ish at 350°
      // Should be close in circular space
      expect(isColorDistinct(newColor, existingColors, 30)).toBe(false);
    });
  });

  describe('getDistinctColor', () => {
    it('should return preferred color if it is distinct', () => {
      const existingColors = ['#FF0000']; // Red
      const preferredColor = '#00FF00'; // Green, very distinct
      const result = getDistinctColor(existingColors, preferredColor);
      expect(result).toBe(preferredColor);
    });

    it('should return next available color if preferred is not distinct', () => {
      const existingColors = [CATEGORY_COLOR_PALETTE[0]];
      const preferredColor = CATEGORY_COLOR_PALETTE[0]; // Same as existing
      const result = getDistinctColor(existingColors, preferredColor);
      expect(result).not.toBe(preferredColor);
      expect(result).toBe(CATEGORY_COLOR_PALETTE[1]);
    });

    it('should return next available color if no preferred color given', () => {
      const existingColors = [CATEGORY_COLOR_PALETTE[0]];
      const result = getDistinctColor(existingColors);
      expect(result).toBe(CATEGORY_COLOR_PALETTE[1]);
    });
  });

  describe('Color Generation Algorithm', () => {
    it('should generate new colors when palette exhausted', () => {
      const usedColors = [...CATEGORY_COLOR_PALETTE];
      
      // Generate 3 new colors
      const newColors: string[] = [];
      for (let i = 0; i < 3; i++) {
        const newColor = getNextAvailableColor([...usedColors, ...newColors]);
        newColors.push(newColor);
      }
      
      // All should be valid hex colors
      newColors.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
      
      // Should not be in the original palette
      newColors.forEach(color => {
        expect(CATEGORY_COLOR_PALETTE).not.toContain(color);
      });
      
      // Should all be unique
      expect(new Set(newColors).size).toBe(3);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle creating 5 categories with distinct colors', () => {
      const categories: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const newColor = getNextAvailableColor(categories);
        categories.push(newColor);
      }
      
      // All colors should be from the palette
      expect(categories.every(c => CATEGORY_COLOR_PALETTE.includes(c))).toBe(true);
      
      // All colors should be unique
      expect(new Set(categories).size).toBe(5);
    });

    it('should handle editing a category without color conflicts', () => {
      const categories = [
        CATEGORY_COLOR_PALETTE[0],
        CATEGORY_COLOR_PALETTE[1],
        CATEGORY_COLOR_PALETTE[2],
      ];
      
      // Edit second category - other colors should still be "used"
      const otherColors = [categories[0], categories[2]];
      const newColor = getNextAvailableColor(otherColors);
      
      // Should not be one of the other colors
      expect(otherColors).not.toContain(newColor);
    });

    it('should handle deleting a category (color becomes available)', () => {
      const categories = [
        CATEGORY_COLOR_PALETTE[0],
        CATEGORY_COLOR_PALETTE[1],
        CATEGORY_COLOR_PALETTE[2],
      ];
      
      // Delete middle category
      const remainingCategories = [categories[0], categories[2]];
      
      // Next color should be able to use the freed color
      const nextColor = getNextAvailableColor(remainingCategories);
      
      // Could be the freed color or the next in palette
      expect([CATEGORY_COLOR_PALETTE[1], CATEGORY_COLOR_PALETTE[3]]).toContain(nextColor);
    });
  });
});
