import type { BudgetConfiguration } from '../types';

// Default budget configuration JSON
export const defaultBudgetConfig: BudgetConfiguration = {
  version: "1.0.0",
  lastUpdated: new Date().toISOString(),
  categories: {
    "Food & Dining": {
      monthlyLimit: 800,
      warningThreshold: 80,
      isActive: true,
      color: "#EF4444",
      description: "Restaurants, takeout, and dining expenses"
    },
    "Groceries": {
      monthlyLimit: 600,
      warningThreshold: 75,
      isActive: true,
      color: "#10B981",
      description: "Grocery shopping and household food items"
    },
    "Transportation": {
      monthlyLimit: 400,
      warningThreshold: 85,
      isActive: true,
      color: "#3B82F6",
      description: "Gas, public transport, parking, car maintenance"
    },
    "Shopping": {
      monthlyLimit: 300,
      warningThreshold: 80,
      isActive: false,
      color: "#8B5CF6",
      description: "Clothing, electronics, and general shopping"
    },
    "Entertainment": {
      monthlyLimit: 200,
      warningThreshold: 70,
      isActive: false,
      color: "#F59E0B",
      description: "Movies, concerts, games, and fun activities"
    },
    "Bills & Utilities": {
      monthlyLimit: 500,
      warningThreshold: 90,
      isActive: true,
      color: "#6B7280",
      description: "Electricity, water, internet, phone bills"
    },
    "Loan Payments": {
      monthlyLimit: 1000,
      warningThreshold: 95,
      isActive: true,
      color: "#DC2626",
      description: "Mortgage, car loans, personal loans, credit card payments"
    },
    "Healthcare": {
      monthlyLimit: 300,
      warningThreshold: 75,
      isActive: false,
      color: "#EC4899",
      description: "Medical expenses, pharmacy, insurance"
    },
    "Education": {
      monthlyLimit: 150,
      warningThreshold: 80,
      isActive: false,
      color: "#14B8A6",
      description: "Books, courses, training, school supplies"
    },
    "Travel": {
      monthlyLimit: 500,
      warningThreshold: 70,
      isActive: false,
      color: "#F97316",
      description: "Vacations, business trips, travel expenses"
    },
    "Other": {
      monthlyLimit: 200,
      warningThreshold: 80,
      isActive: true,
      color: "#64748B",
      description: "Miscellaneous expenses"
    }
  },
  globalSettings: {
    currency: "USD",
    warningNotifications: true,
    emailAlerts: false
  }
};

export class BudgetConfigService {
  private static readonly STORAGE_KEY = 'galfin-budget-config';

  // Load budget configuration from localStorage or return default
  static loadConfig(): BudgetConfiguration {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as BudgetConfiguration;
        // Validate that it has the required structure
        if (parsed.version && parsed.categories && parsed.globalSettings) {
          // Migrate config to add new categories from default config
          const migrated = this.migrateConfig(parsed);
          return migrated;
        }
      }
    } catch (error) {
      console.warn('Failed to load budget configuration:', error);
    }
    
    // Return default config if none exists or parsing failed
    const config = { ...defaultBudgetConfig };
    this.saveConfig(config);
    return config;
  }

  // Migrate old config to include new categories from default config
  private static migrateConfig(existingConfig: BudgetConfiguration): BudgetConfiguration {
    let updated = false;
    const config = { ...existingConfig };
    
    // Add any missing categories from the default config
    for (const [categoryName, categoryData] of Object.entries(defaultBudgetConfig.categories)) {
      if (!config.categories[categoryName]) {
        config.categories[categoryName] = { ...categoryData };
        updated = true;
        console.log(`Migration: Added new category "${categoryName}"`);
      }
    }
    
    // Save if we made any updates
    if (updated) {
      this.saveConfig(config);
    }
    
    return config;
  }

  // Save budget configuration to localStorage
  static saveConfig(config: BudgetConfiguration): void {
    try {
      config.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save budget configuration:', error);
    }
  }

  // Update a specific category
  static updateCategory(
    categoryName: string, 
    updates: Partial<BudgetConfiguration['categories'][string]>
  ): BudgetConfiguration {
    const config = this.loadConfig();
    if (config.categories[categoryName]) {
      config.categories[categoryName] = {
        ...config.categories[categoryName],
        ...updates
      };
    }
    this.saveConfig(config);
    return config;
  }

  // Add a new category
  static addCategory(
    categoryName: string,
    categoryConfig: BudgetConfiguration['categories'][string]
  ): BudgetConfiguration {
    const config = this.loadConfig();
    config.categories[categoryName] = categoryConfig;
    this.saveConfig(config);
    return config;
  }

  // Remove a category
  static removeCategory(categoryName: string): BudgetConfiguration {
    const config = this.loadConfig();
    delete config.categories[categoryName];
    this.saveConfig(config);
    return config;
  }

  // Update global settings
  static updateGlobalSettings(
    updates: Partial<BudgetConfiguration['globalSettings']>
  ): BudgetConfiguration {
    const config = this.loadConfig();
    config.globalSettings = {
      ...config.globalSettings,
      ...updates
    };
    this.saveConfig(config);
    return config;
  }

  // Export configuration as downloadable JSON
  static exportConfig(): string {
    const config = this.loadConfig();
    return JSON.stringify(config, null, 2);
  }

  // Import configuration from JSON string
  static importConfig(jsonString: string): BudgetConfiguration {
    try {
      const parsed = JSON.parse(jsonString) as BudgetConfiguration;
      
      // Basic validation
      if (!parsed.version || !parsed.categories || !parsed.globalSettings) {
        throw new Error('Invalid budget configuration format');
      }
      
      this.saveConfig(parsed);
      return parsed;
    } catch (error) {
      console.error('Failed to import budget configuration:', error);
      throw error;
    }
  }

  // Get raw JSON string for editing
  static getRawJSON(): string {
    const config = this.loadConfig();
    return JSON.stringify(config, null, 2);
  }

  // Save raw JSON string
  static saveRawJSON(jsonString: string): BudgetConfiguration {
    try {
      const parsed = JSON.parse(jsonString) as BudgetConfiguration;
      this.saveConfig(parsed);
      return parsed;
    } catch (error) {
      console.error('Failed to save raw JSON:', error);
      throw error;
    }
  }
}
