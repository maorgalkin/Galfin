import { describe, it, expect } from 'vitest';
import {
  getPrimaryButtonBg,
  getPrimaryButtonHoverBg,
  getBorderColor,
  getTextColor,
  getHeaderGradient,
  getAccentColor,
  getIconColor,
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
      // Note: getBorderColor returns both light and dark mode classes
      expect(getBorderColor('purple')).toContain('border-purple');
      expect(getBorderColor('blue')).toContain('border-blue');
      expect(getBorderColor('green')).toContain('border-green');
    });

    it('returns correct text color for each theme', () => {
      expect(getTextColor('purple')).toBe('text-purple-100');
      expect(getTextColor('blue')).toBe('text-blue-100');
      expect(getTextColor('green')).toBe('text-green-100');
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

  describe('Icon Colors', () => {
    it('returns correct icon color for each theme', () => {
      // Note: getIconColor returns both light and dark mode classes
      expect(getIconColor('purple')).toContain('text-purple');
      expect(getIconColor('blue')).toContain('text-blue');
      expect(getIconColor('green')).toContain('text-green');
    });
  });

  describe('Type Safety', () => {
    it('accepts valid theme color types', () => {
      themeColors.forEach(color => {
        expect(() => getPrimaryButtonBg(color)).not.toThrow();
        expect(() => getHeaderGradient(color)).not.toThrow();
        expect(() => getBorderColor(color)).not.toThrow();
      });
    });

    it('returns string type for all utility functions', () => {
      themeColors.forEach(color => {
        expect(typeof getPrimaryButtonBg(color)).toBe('string');
        expect(typeof getTextColor(color)).toBe('string');
        expect(typeof getHeaderGradient(color)).toBe('string');
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
