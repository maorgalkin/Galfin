import { describe, it, expect } from 'vitest';
import {
  getPrimaryButtonBg,
  getPrimaryButtonHoverBg,
  getBorderColor,
  getTextColor,
  getHeaderGradient,
  getAccentColor,
  getIconColor,
  getProgressBarBg,
  getProgressBarFill,
  getChartColor,
  getCategoryBadgeBg,
  getCategoryBadgeText,
  getStatCardBorder,
  getStatCardBg,
  getLinkColor,
  getLinkHoverColor,
} from '../../src/utils/themeColors';

describe('Theme Color Utilities', () => {
  const themeColors = ['purple', 'blue', 'green'] as const;

  describe('Primary Button Colors', () => {
    it('returns correct background color for each theme', () => {
      expect(getPrimaryButtonBg('purple')).toBe('bg-purple-600');
      expect(getPrimaryButtonBg('blue')).toBe('bg-blue-600');
      expect(getPrimaryButtonBg('green')).toBe('bg-green-600');
    });

    it('returns correct hover background color for each theme', () => {
      expect(getPrimaryButtonHoverBg('purple')).toBe('hover:bg-purple-700');
      expect(getPrimaryButtonHoverBg('blue')).toBe('hover:bg-blue-700');
      expect(getPrimaryButtonHoverBg('green')).toBe('hover:bg-green-700');
    });

    it('defaults to purple for unknown theme', () => {
      // @ts-expect-error - testing invalid input
      expect(getPrimaryButtonBg('invalid')).toBe('bg-purple-600');
      // @ts-expect-error - testing invalid input
      expect(getPrimaryButtonHoverBg('invalid')).toBe('hover:bg-purple-700');
    });
  });

  describe('Border and Text Colors', () => {
    it('returns correct border color for each theme', () => {
      expect(getBorderColor('purple')).toBe('border-purple-200');
      expect(getBorderColor('blue')).toBe('border-blue-200');
      expect(getBorderColor('green')).toBe('border-green-200');
    });

    it('returns correct text color for each theme', () => {
      expect(getTextColor('purple')).toBe('text-purple-100');
      expect(getTextColor('blue')).toBe('text-blue-100');
      expect(getTextColor('green')).toBe('text-green-100');
    });

    it('returns correct link color for each theme', () => {
      expect(getLinkColor('purple')).toBe('text-purple-600');
      expect(getLinkColor('blue')).toBe('text-blue-600');
      expect(getLinkColor('green')).toBe('text-green-600');
    });

    it('returns correct link hover color for each theme', () => {
      expect(getLinkHoverColor('purple')).toBe('hover:text-purple-700');
      expect(getLinkHoverColor('blue')).toBe('hover:text-blue-700');
      expect(getLinkHoverColor('green')).toBe('hover:text-green-700');
    });
  });

  describe('Gradient and Accent Colors', () => {
    it('returns correct header gradient for each theme', () => {
      expect(getHeaderGradient('purple')).toBe('bg-gradient-to-r from-purple-500 to-purple-600');
      expect(getHeaderGradient('blue')).toBe('bg-gradient-to-r from-blue-500 to-blue-600');
      expect(getHeaderGradient('green')).toBe('bg-gradient-to-r from-green-500 to-green-600');
    });

    it('returns correct accent color with opacity for each theme', () => {
      expect(getAccentColor('purple')).toBe('bg-purple-400/30');
      expect(getAccentColor('blue')).toBe('bg-blue-400/30');
      expect(getAccentColor('green')).toBe('bg-green-400/30');
    });
  });

  describe('Icon and Visual Elements', () => {
    it('returns correct icon color for each theme', () => {
      expect(getIconColor('purple')).toBe('text-purple-200');
      expect(getIconColor('blue')).toBe('text-blue-200');
      expect(getIconColor('green')).toBe('text-green-200');
    });

    it('returns correct progress bar background for each theme', () => {
      expect(getProgressBarBg('purple')).toBe('bg-purple-200');
      expect(getProgressBarBg('blue')).toBe('bg-blue-200');
      expect(getProgressBarBg('green')).toBe('bg-green-200');
    });

    it('returns correct progress bar fill for each theme', () => {
      expect(getProgressBarFill('purple')).toBe('bg-purple-500');
      expect(getProgressBarFill('blue')).toBe('bg-blue-500');
      expect(getProgressBarFill('green')).toBe('bg-green-500');
    });

    it('returns correct chart color for each theme', () => {
      expect(getChartColor('purple')).toBe('rgb(168 85 247)');
      expect(getChartColor('blue')).toBe('rgb(59 130 246)');
      expect(getChartColor('green')).toBe('rgb(34 197 94)');
    });
  });

  describe('Badge and Card Styling', () => {
    it('returns correct category badge background for each theme', () => {
      expect(getCategoryBadgeBg('purple')).toBe('bg-purple-100');
      expect(getCategoryBadgeBg('blue')).toBe('bg-blue-100');
      expect(getCategoryBadgeBg('green')).toBe('bg-green-100');
    });

    it('returns correct category badge text color for each theme', () => {
      expect(getCategoryBadgeText('purple')).toBe('text-purple-800');
      expect(getCategoryBadgeText('blue')).toBe('text-blue-800');
      expect(getCategoryBadgeText('green')).toBe('text-green-800');
    });

    it('returns correct stat card border for each theme', () => {
      expect(getStatCardBorder('purple')).toBe('border-purple-300');
      expect(getStatCardBorder('blue')).toBe('border-blue-300');
      expect(getStatCardBorder('green')).toBe('border-green-300');
    });

    it('returns correct stat card background for each theme', () => {
      expect(getStatCardBg('purple')).toBe('bg-purple-50');
      expect(getStatCardBg('blue')).toBe('bg-blue-50');
      expect(getStatCardBg('green')).toBe('bg-green-50');
    });
  });

  describe('Type Safety', () => {
    it('accepts valid theme color types', () => {
      themeColors.forEach(color => {
        expect(() => getPrimaryButtonBg(color)).not.toThrow();
        expect(() => getHeaderGradient(color)).not.toThrow();
        expect(() => getBorderColor(color)).not.toThrow();
        expect(() => getChartColor(color)).not.toThrow();
      });
    });

    it('returns string type for all utility functions', () => {
      themeColors.forEach(color => {
        expect(typeof getPrimaryButtonBg(color)).toBe('string');
        expect(typeof getTextColor(color)).toBe('string');
        expect(typeof getHeaderGradient(color)).toBe('string');
        expect(typeof getChartColor(color)).toBe('string');
      });
    });
  });

  describe('Consistency', () => {
    it('primary buttons use consistent shade across themes', () => {
      themeColors.forEach(color => {
        expect(getPrimaryButtonBg(color)).toMatch(/-(600)$/);
      });
    });

    it('hover states use darker shades', () => {
      themeColors.forEach(color => {
        expect(getPrimaryButtonHoverBg(color)).toMatch(/-(700)$/);
      });
    });

    it('all functions provide defaults for invalid input', () => {
      const invalidColor = 'invalid' as any;
      
      expect(() => getPrimaryButtonBg(invalidColor)).not.toThrow();
      expect(() => getHeaderGradient(invalidColor)).not.toThrow();
      expect(() => getBorderColor(invalidColor)).not.toThrow();
    });
  });
});
