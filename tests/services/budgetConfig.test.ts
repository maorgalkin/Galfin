import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BudgetConfigService, defaultBudgetConfig } from '../../src/services/budgetConfig';
import type { BudgetConfiguration } from '../../src/types/index';

describe('BudgetConfigService', () => {
  const STORAGE_KEY = 'galfin-budget-config';
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clear localStorage after each test
    localStorage.clear();
  });

  describe('loadConfig', () => {
    it('should return default config when localStorage is empty', () => {
      const config = BudgetConfigService.loadConfig();
      
      expect(config).toBeDefined();
      expect(config.version).toBe(defaultBudgetConfig.version);
      expect(config.categories).toEqual(defaultBudgetConfig.categories);
      expect(config.globalSettings).toEqual(defaultBudgetConfig.globalSettings);
    });

    it('should load config from localStorage when it exists', () => {
      const testConfig: BudgetConfiguration = {
        version: '2.0.0',
        lastUpdated: '2025-01-01T00:00:00Z',
        categories: {
          TestCategory: {
            monthlyLimit: 1000,
            warningThreshold: 85,
            isActive: true,
            color: '#FF0000',
            description: 'Test category'
          }
        },
        globalSettings: {
          currency: 'EUR',
          warningNotifications: false,
          emailAlerts: true
        }
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(testConfig));
      const loaded = BudgetConfigService.loadConfig();
      
      expect(loaded.version).toBe('2.0.0');
      expect(loaded.categories.TestCategory).toBeDefined();
      expect(loaded.globalSettings.currency).toBe('EUR');
    });

    it('should migrate config to add new categories', () => {
      const oldConfig: BudgetConfiguration = {
        version: '1.0.0',
        lastUpdated: '2024-01-01T00:00:00Z',
        categories: {
          Groceries: {
            monthlyLimit: 500,
            warningThreshold: 80,
            isActive: true,
            color: '#10B981',
            description: 'Old groceries'
          }
        },
        globalSettings: {
          currency: 'USD',
          warningNotifications: true,
          emailAlerts: false
        }
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(oldConfig));
      const loaded = BudgetConfigService.loadConfig();
      
      // Should have old category
      expect(loaded.categories.Groceries).toBeDefined();
      expect(loaded.categories.Groceries.description).toBe('Old groceries'); // Preserves old data
      
      // Should have new categories from default
      expect(loaded.categories['Food & Dining']).toBeDefined();
      expect(loaded.categories.Transportation).toBeDefined();
    });

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');
      const config = BudgetConfigService.loadConfig();
      
      // Should return default config
      expect(config.version).toBe(defaultBudgetConfig.version);
    });

    it('should handle config with missing required fields', () => {
      const invalidConfig = {
        version: '1.0.0'
        // Missing categories and globalSettings
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidConfig));
      const config = BudgetConfigService.loadConfig();
      
      // Should return default config
      expect(config.categories).toBeDefined();
      expect(config.globalSettings).toBeDefined();
    });
  });

  describe('saveConfig', () => {
    it('should save config to localStorage', () => {
      const config: BudgetConfiguration = {
        version: '1.0.0',
        lastUpdated: '2025-01-01T00:00:00Z',
        categories: {
          TestCategory: {
            monthlyLimit: 500,
            warningThreshold: 75,
            isActive: true,
            color: '#000000',
            description: 'Test'
          }
        },
        globalSettings: {
          currency: 'USD',
          warningNotifications: true,
          emailAlerts: false
        }
      };

      BudgetConfigService.saveConfig(config);
      
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.categories.TestCategory).toBeDefined();
    });

    it('should update lastUpdated timestamp', () => {
      const config: BudgetConfiguration = {
        version: '1.0.0',
        lastUpdated: '2024-01-01T00:00:00Z',
        categories: {},
        globalSettings: {
          currency: 'USD',
          warningNotifications: true,
          emailAlerts: false
        }
      };

      BudgetConfigService.saveConfig(config);
      
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      
      // lastUpdated should be updated
      expect(parsed.lastUpdated).not.toBe('2024-01-01T00:00:00Z');
      expect(new Date(parsed.lastUpdated).getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());
    });

    it('should handle save errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Quota exceeded');
      });

      const config = BudgetConfigService.loadConfig();
      
      // Should not throw
      expect(() => BudgetConfigService.saveConfig(config)).not.toThrow();
      
      // Restore original method
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('updateCategory', () => {
    beforeEach(() => {
      BudgetConfigService.saveConfig(defaultBudgetConfig);
    });

    it('should update existing category', () => {
      const updated = BudgetConfigService.updateCategory('Groceries', {
        monthlyLimit: 1000,
        warningThreshold: 90
      });

      expect(updated.categories.Groceries.monthlyLimit).toBe(1000);
      expect(updated.categories.Groceries.warningThreshold).toBe(90);
      // Other fields should be preserved
      expect(updated.categories.Groceries.color).toBe('#10B981');
      expect(updated.categories.Groceries.isActive).toBe(true);
    });

    it('should partially update category fields', () => {
      const updated = BudgetConfigService.updateCategory('Groceries', {
        isActive: false
      });

      expect(updated.categories.Groceries.isActive).toBe(false);
      expect(updated.categories.Groceries.monthlyLimit).toBe(600); // Unchanged
    });

    it('should not affect other categories', () => {
      const updated = BudgetConfigService.updateCategory('Groceries', {
        monthlyLimit: 1000
      });

      expect(updated.categories.Transportation.monthlyLimit).toBe(400); // Unchanged
    });

    it('should handle non-existent category gracefully', () => {
      const updated = BudgetConfigService.updateCategory('NonExistent', {
        monthlyLimit: 500
      });

      // Should not create the category
      expect(updated.categories.NonExistent).toBeUndefined();
    });
  });

  describe('addCategory', () => {
    beforeEach(() => {
      BudgetConfigService.saveConfig(defaultBudgetConfig);
    });

    it('should add new category', () => {
      const newCategory = {
        monthlyLimit: 250,
        warningThreshold: 70,
        isActive: true,
        color: '#FF00FF',
        description: 'New category for testing'
      };

      const updated = BudgetConfigService.addCategory('NewCategory', newCategory);

      expect(updated.categories.NewCategory).toBeDefined();
      expect(updated.categories.NewCategory.monthlyLimit).toBe(250);
      expect(updated.categories.NewCategory.description).toBe('New category for testing');
    });

    it('should overwrite existing category', () => {
      const newConfig = {
        monthlyLimit: 5000,
        warningThreshold: 95,
        isActive: false,
        color: '#000000',
        description: 'Overwritten'
      };

      const updated = BudgetConfigService.addCategory('Groceries', newConfig);

      expect(updated.categories.Groceries.monthlyLimit).toBe(5000);
      expect(updated.categories.Groceries.description).toBe('Overwritten');
    });

    it('should persist new category to localStorage', () => {
      const newCategory = {
        monthlyLimit: 300,
        warningThreshold: 80,
        isActive: true,
        color: '#AAAAAA',
        description: 'Persistent category'
      };

      BudgetConfigService.addCategory('PersistentCategory', newCategory);
      
      const loaded = BudgetConfigService.loadConfig();
      expect(loaded.categories.PersistentCategory).toBeDefined();
    });
  });

  describe('removeCategory', () => {
    beforeEach(() => {
      BudgetConfigService.saveConfig(defaultBudgetConfig);
    });

    it('should remove existing category', () => {
      const updated = BudgetConfigService.removeCategory('Groceries');

      expect(updated.categories.Groceries).toBeUndefined();
    });

    it('should not affect other categories', () => {
      const updated = BudgetConfigService.removeCategory('Groceries');

      expect(updated.categories.Transportation).toBeDefined();
      expect(updated.categories['Bills & Utilities']).toBeDefined();
    });

    it('should handle removing non-existent category', () => {
      const updated = BudgetConfigService.removeCategory('NonExistent');

      // Should not throw error
      expect(updated.categories.Groceries).toBeDefined(); // Others still there
    });

    it('should persist removal to localStorage', () => {
      // Add a custom category first
      BudgetConfigService.addCategory('CustomCategory', {
        monthlyLimit: 100,
        warningThreshold: 80,
        isActive: true,
        color: '#000000',
        description: 'Custom'
      });

      // Remove it
      BudgetConfigService.removeCategory('CustomCategory');
      
      const loaded = BudgetConfigService.loadConfig();
      expect(loaded.categories.CustomCategory).toBeUndefined();
    });
  });

  describe('updateGlobalSettings', () => {
    beforeEach(() => {
      BudgetConfigService.saveConfig(defaultBudgetConfig);
    });

    it('should update global settings', () => {
      const updated = BudgetConfigService.updateGlobalSettings({
        currency: 'EUR',
        emailAlerts: true
      });

      expect(updated.globalSettings.currency).toBe('EUR');
      expect(updated.globalSettings.emailAlerts).toBe(true);
      expect(updated.globalSettings.warningNotifications).toBe(true); // Unchanged
    });

    it('should partially update settings', () => {
      const updated = BudgetConfigService.updateGlobalSettings({
        currency: 'GBP'
      });

      expect(updated.globalSettings.currency).toBe('GBP');
      expect(updated.globalSettings.warningNotifications).toBe(true); // Unchanged
      expect(updated.globalSettings.emailAlerts).toBe(false); // Unchanged
    });

    it('should persist settings to localStorage', () => {
      BudgetConfigService.updateGlobalSettings({
        currency: 'JPY',
        emailAlerts: true
      });

      const loaded = BudgetConfigService.loadConfig();
      expect(loaded.globalSettings.currency).toBe('JPY');
      expect(loaded.globalSettings.emailAlerts).toBe(true);
    });
  });

  describe('exportConfig', () => {
    beforeEach(() => {
      BudgetConfigService.saveConfig(defaultBudgetConfig);
    });

    it('should export config as JSON string', () => {
      const exported = BudgetConfigService.exportConfig();

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
      
      // Should be valid JSON
      const parsed = JSON.parse(exported);
      expect(parsed.version).toBeDefined();
      expect(parsed.categories).toBeDefined();
    });

    it('should export current config state', () => {
      BudgetConfigService.updateGlobalSettings({ currency: 'CAD' });
      
      const exported = BudgetConfigService.exportConfig();
      const parsed = JSON.parse(exported);
      
      expect(parsed.globalSettings.currency).toBe('CAD');
    });

    it('should export formatted JSON', () => {
      const exported = BudgetConfigService.exportConfig();
      
      // Should have line breaks (formatted)
      expect(exported).toContain('\n');
    });
  });

  describe('importConfig', () => {
    it('should import valid config', () => {
      const validConfig: BudgetConfiguration = {
        version: '3.0.0',
        lastUpdated: '2025-12-01T00:00:00Z',
        categories: {
          ImportedCategory: {
            monthlyLimit: 750,
            warningThreshold: 85,
            isActive: true,
            color: '#123456',
            description: 'Imported from JSON'
          }
        },
        globalSettings: {
          currency: 'AUD',
          warningNotifications: false,
          emailAlerts: true
        }
      };

      const jsonString = JSON.stringify(validConfig);
      const imported = BudgetConfigService.importConfig(jsonString);

      expect(imported.version).toBe('3.0.0');
      expect(imported.categories.ImportedCategory).toBeDefined();
      expect(imported.globalSettings.currency).toBe('AUD');
    });

    it('should persist imported config to localStorage', () => {
      const validConfig: BudgetConfiguration = {
        version: '2.0.0',
        lastUpdated: '2025-11-01T00:00:00Z',
        categories: {},
        globalSettings: {
          currency: 'EUR',
          warningNotifications: true,
          emailAlerts: false
        }
      };

      BudgetConfigService.importConfig(JSON.stringify(validConfig));
      
      const loaded = BudgetConfigService.loadConfig();
      expect(loaded.version).toBe('2.0.0');
      expect(loaded.globalSettings.currency).toBe('EUR');
    });

    it('should reject invalid JSON', () => {
      expect(() => {
        BudgetConfigService.importConfig('invalid json {');
      }).toThrow();
    });

    it('should reject config missing required fields', () => {
      const invalidConfig = {
        version: '1.0.0'
        // Missing categories and globalSettings
      };

      expect(() => {
        BudgetConfigService.importConfig(JSON.stringify(invalidConfig));
      }).toThrow('Invalid budget configuration format');
    });

    it('should reject config missing version', () => {
      const invalidConfig = {
        categories: {},
        globalSettings: { currency: 'USD', warningNotifications: true, emailAlerts: false }
      };

      expect(() => {
        BudgetConfigService.importConfig(JSON.stringify(invalidConfig));
      }).toThrow('Invalid budget configuration format');
    });
  });

  describe('getRawJSON', () => {
    beforeEach(() => {
      BudgetConfigService.saveConfig(defaultBudgetConfig);
    });

    it('should return formatted JSON string', () => {
      const rawJSON = BudgetConfigService.getRawJSON();

      expect(rawJSON).toBeDefined();
      expect(typeof rawJSON).toBe('string');
      
      // Should be valid JSON
      const parsed = JSON.parse(rawJSON);
      expect(parsed.version).toBeDefined();
    });

    it('should return current config state', () => {
      BudgetConfigService.updateCategory('Groceries', { monthlyLimit: 999 });
      
      const rawJSON = BudgetConfigService.getRawJSON();
      const parsed = JSON.parse(rawJSON);
      
      expect(parsed.categories.Groceries.monthlyLimit).toBe(999);
    });
  });

  describe('saveRawJSON', () => {
    it('should save valid JSON', () => {
      const validConfig: BudgetConfiguration = {
        version: '4.0.0',
        lastUpdated: '2025-10-15T00:00:00Z',
        categories: {
          RawCategory: {
            monthlyLimit: 888,
            warningThreshold: 88,
            isActive: true,
            color: '#888888',
            description: 'Saved from raw JSON'
          }
        },
        globalSettings: {
          currency: 'CHF',
          warningNotifications: true,
          emailAlerts: true
        }
      };

      const saved = BudgetConfigService.saveRawJSON(JSON.stringify(validConfig));

      expect(saved.version).toBe('4.0.0');
      expect(saved.categories.RawCategory).toBeDefined();
    });

    it('should reject invalid JSON', () => {
      expect(() => {
        BudgetConfigService.saveRawJSON('not valid json {{');
      }).toThrow();
    });

    it('should persist saved JSON to localStorage', () => {
      const validConfig: BudgetConfiguration = {
        version: '1.5.0',
        lastUpdated: '2025-09-01T00:00:00Z',
        categories: {},
        globalSettings: {
          currency: 'NZD',
          warningNotifications: false,
          emailAlerts: false
        }
      };

      BudgetConfigService.saveRawJSON(JSON.stringify(validConfig));
      
      const loaded = BudgetConfigService.loadConfig();
      expect(loaded.globalSettings.currency).toBe('NZD');
    });
  });

  describe('defaultBudgetConfig', () => {
    it('should have all required fields', () => {
      expect(defaultBudgetConfig.version).toBeDefined();
      expect(defaultBudgetConfig.lastUpdated).toBeDefined();
      expect(defaultBudgetConfig.categories).toBeDefined();
      expect(defaultBudgetConfig.globalSettings).toBeDefined();
    });

    it('should have multiple default categories', () => {
      const categoryCount = Object.keys(defaultBudgetConfig.categories).length;
      expect(categoryCount).toBeGreaterThan(5);
    });

    it('should have properly structured categories', () => {
      for (const [name, category] of Object.entries(defaultBudgetConfig.categories)) {
        expect(category.monthlyLimit).toBeGreaterThan(0);
        expect(category.warningThreshold).toBeGreaterThan(0);
        expect(category.warningThreshold).toBeLessThanOrEqual(100);
        expect(category.isActive).toBeDefined();
        expect(category.color).toMatch(/^#[0-9A-F]{6}$/i);
        expect(category.description).toBeDefined();
      }
    });

    it('should have valid global settings', () => {
      expect(defaultBudgetConfig.globalSettings.currency).toBeDefined();
      expect(typeof defaultBudgetConfig.globalSettings.warningNotifications).toBe('boolean');
      expect(typeof defaultBudgetConfig.globalSettings.emailAlerts).toBe('boolean');
    });
  });
});
