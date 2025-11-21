import type { Transaction } from '../types';
import type { PersonalBudget } from '../types/budget';
import type { CategoryAccuracy, AccuracyZone, AccuracyZoneConfig } from '../types/analytics';
import { DEFAULT_ACCURACY_ZONES } from '../types/analytics';
import { monthlyBudgetService } from './monthlyBudgetService';

/**
 * Service for calculating category spending accuracy metrics
 */
class CategoryAccuracyService {
  /**
   * Calculate accuracy metrics for all active categories over a date range
   */
  async calculateCategoryAccuracy(
    transactions: Transaction[],
    personalBudget: PersonalBudget | null | undefined,
    startDate: Date,
    endDate: Date,
    zoneConfig: AccuracyZoneConfig = DEFAULT_ACCURACY_ZONES
  ): Promise<CategoryAccuracy[]> {
    if (!personalBudget) {
      return [];
    }

    const accuracyData: CategoryAccuracy[] = [];
    const activeCategories = Object.entries(personalBudget.categories)
      .filter(([_, config]) => config.isActive)
      .map(([category]) => category);

    // Get monthly budgets for the date range
    const monthlyBudgets = await monthlyBudgetService.getMonthlyBudgetsForDateRange(
      startDate,
      endDate
    );

    // Calculate number of months in range
    const monthsInRange = this.getMonthsBetween(startDate, endDate);

    for (const category of activeCategories) {
      const accuracy = this.calculateCategoryMetrics(
        category,
        transactions,
        monthlyBudgets,
        monthsInRange,
        startDate,
        endDate,
        zoneConfig,
        personalBudget
      );
      accuracyData.push(accuracy);
    }

    return accuracyData;
  }

  /**
   * Calculate metrics for a single category
   */
  private calculateCategoryMetrics(
    category: string,
    transactions: Transaction[],
    monthlyBudgets: any[],
    monthsInRange: number,
    startDate: Date,
    endDate: Date,
    zoneConfig: AccuracyZoneConfig,
    personalBudget?: PersonalBudget
  ): CategoryAccuracy {
    // Calculate total budgeted amount across all months
    let totalBudgeted = monthlyBudgets.reduce((sum, mb) => {
      const categoryConfig = mb.categories[category];
      return sum + (categoryConfig?.monthlyBudget || 0);
    }, 0);
    
    // If no monthly budgets exist, fall back to personal budget * months
    if (totalBudgeted === 0 && personalBudget?.categories[category]?.monthlyLimit) {
      totalBudgeted = personalBudget.categories[category].monthlyLimit * monthsInRange;
    }

    // Calculate total spent in the date range
    const categoryTransactions = transactions.filter(
      t => t.category === category &&
           t.type === 'expense' &&
           new Date(t.date) >= startDate &&
           new Date(t.date) <= endDate
    );

    const totalSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate averages
    const budgetAverage = monthsInRange > 0 ? totalBudgeted / monthsInRange : 0;
    const actualAverage = monthsInRange > 0 ? totalSpent / monthsInRange : 0;

    // Calculate variance
    const variance = actualAverage - budgetAverage;
    const variancePercentage = budgetAverage > 0 ? (variance / budgetAverage) * 100 : 0;

    // Calculate accuracy percentage (inverse of variance)
    // 100% = perfect match, higher = over budget, lower = under budget
    const accuracyPercentage = budgetAverage > 0 ? (actualAverage / budgetAverage) * 100 : 0;

    // Determine states
    const isOverBudget = actualAverage > budgetAverage;
    const isUnused = totalSpent === 0;

    // Determine accuracy zone and target position
    const { accuracyZone, targetPosition } = this.calculateZoneAndPosition(
      accuracyPercentage,
      isUnused,
      zoneConfig
    );

    return {
      category,
      budgetAverage,
      actualAverage,
      accuracyPercentage,
      variance,
      variancePercentage,
      isOverBudget,
      isUnused,
      monthsInRange,
      totalBudgeted,
      totalSpent,
      accuracyZone,
      targetPosition,
    };
  }

  /**
   * Determine which accuracy zone the percentage falls into
   * and calculate the position on the target (0-1 for rings, >1 for bust)
   */
  private calculateZoneAndPosition(
    accuracyPercentage: number,
    isUnused: boolean,
    zoneConfig: AccuracyZoneConfig
  ): { accuracyZone: AccuracyZone; targetPosition: number } {
    if (isUnused) {
      return { accuracyZone: 'unused', targetPosition: 0 };
    }

    // Check each zone from center outward
    if (accuracyPercentage >= zoneConfig.bullseye.min && accuracyPercentage <= zoneConfig.bullseye.max) {
      const centerDeviation = Math.abs(accuracyPercentage - 100) / 5; // 5% is bullseye range
      return { accuracyZone: 'bullseye', targetPosition: centerDeviation * 0.2 }; // 0-0.2
    }

    if (accuracyPercentage >= zoneConfig.ring1.min && accuracyPercentage <= zoneConfig.ring1.max) {
      const ring1Deviation = this.calculateRingPosition(accuracyPercentage, zoneConfig.ring1, 100);
      return { accuracyZone: 'ring1', targetPosition: 0.2 + ring1Deviation * 0.2 }; // 0.2-0.4
    }

    if (accuracyPercentage >= zoneConfig.ring2.min && accuracyPercentage <= zoneConfig.ring2.max) {
      const ring2Deviation = this.calculateRingPosition(accuracyPercentage, zoneConfig.ring2, 100);
      return { accuracyZone: 'ring2', targetPosition: 0.4 + ring2Deviation * 0.2 }; // 0.4-0.6
    }

    if (accuracyPercentage >= zoneConfig.ring3.min && accuracyPercentage <= zoneConfig.ring3.max) {
      const ring3Deviation = this.calculateRingPosition(accuracyPercentage, zoneConfig.ring3, 100);
      return { accuracyZone: 'ring3', targetPosition: 0.6 + ring3Deviation * 0.2 }; // 0.6-0.8
    }

    if (accuracyPercentage >= zoneConfig.ring4.min && accuracyPercentage <= zoneConfig.ring4.max) {
      const ring4Deviation = this.calculateRingPosition(accuracyPercentage, zoneConfig.ring4, 100);
      return { accuracyZone: 'ring4', targetPosition: 0.8 + ring4Deviation * 0.2 }; // 0.8-1.0
    }

    // Outside all rings = bust
    const bustDistance = Math.abs(accuracyPercentage - 100) / 100;
    return { accuracyZone: 'bust', targetPosition: 1.0 + Math.min(bustDistance, 0.5) }; // 1.0+
  }

  /**
   * Calculate position within a ring (0 = inner edge, 1 = outer edge)
   */
  private calculateRingPosition(
    percentage: number,
    ring: { min: number; max: number },
    center: number
  ): number {
    const distance = Math.abs(percentage - center);
    const ringSize = Math.max(Math.abs(ring.min - center), Math.abs(ring.max - center));
    return distance / ringSize;
  }

  /**
   * Calculate number of complete and partial months between two dates
   */
  private getMonthsBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const yearsDiff = end.getFullYear() - start.getFullYear();
    const monthsDiff = end.getMonth() - start.getMonth();
    
    // Basic month count
    let months = yearsDiff * 12 + monthsDiff + 1; // +1 to include both start and end months
    
    return months;
  }

  /**
   * Get suggested action message for unused categories
   */
  getSuggestionMessage(_category: string, monthsInRange: number): string {
    const monthText = monthsInRange === 1 ? 'month' : `${monthsInRange} months`;
    return `This budget wasn't used throughout ${monthText}. Consider reallocating to other categories?`;
  }

  /**
   * Get performance label for a category based on its accuracy zone
   */
  getPerformanceLabel(accuracyZone: AccuracyZone): string {
    const labels: Record<AccuracyZone, string> = {
      bullseye: 'Perfect tracking',
      ring1: 'Excellent budgeting',
      ring2: 'Good control',
      ring3: 'Needs attention',
      ring4: 'Poor accuracy',
      bust: 'Significantly over budget',
      unused: 'No activity',
    };
    return labels[accuracyZone];
  }
}

export const categoryAccuracyService = new CategoryAccuracyService();
