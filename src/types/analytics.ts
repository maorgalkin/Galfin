/**
 * Analytics Types
 * Types for analytics features including category accuracy tracking
 */

/**
 * Represents accuracy zones on the bullseye target
 * New model: 0-105% is within target, >105% is bust
 * Bullseye (96-100%), Ring1 (81-95% or 101-105%), Ring2 (61-80%), Ring3 (41-60%), Ring4 (21-40%), Ring5 (1-20%)
 */
export type AccuracyZone = 'bullseye' | 'ring1' | 'ring2' | 'ring3' | 'ring4' | 'ring5' | 'bust' | 'unused';

/**
 * Category spending accuracy metrics over a date range
 */
export interface CategoryAccuracy {
  /** Category name */
  category: string;
  
  /** Average monthly budget for this category */
  budgetAverage: number;
  
  /** Average monthly actual spending */
  actualAverage: number;
  
  /** Accuracy percentage (100% = perfect match to budget) */
  accuracyPercentage: number;
  
  /** Absolute variance (actualAverage - budgetAverage) */
  variance: number;
  
  /** Variance as percentage of budget */
  variancePercentage: number;
  
  /** Whether spending exceeded budget */
  isOverBudget: boolean;
  
  /** Whether category had zero spending */
  isUnused: boolean;
  
  /** Number of months included in calculation */
  monthsInRange: number;
  
  /** Total budgeted amount across all months */
  totalBudgeted: number;
  
  /** Total spent amount across all months */
  totalSpent: number;
  
  /** Which zone on the target this category falls into */
  accuracyZone: AccuracyZone;
  
  /** Visual position on target (0 = center, 1 = edge, >1 = bust) */
  targetPosition: number;
  
  /** Deterministic random angle (radians) for hit marker placement */
  hitAngle: number;
  
  /** Number of transactions in this category */
  transactionCount: number;
  
  /** Day of month when budget was exceeded (if applicable, null otherwise) */
  dayExceeded: number | null;
}

/**
 * Configuration for accuracy zone thresholds
 * New asymmetric model: underspending (0-100%) has different zones than overspending (>100%)
 */
export interface AccuracyZoneConfig {
  bullseye: { min: number; max: number }; // 96-100% (perfect)
  ring1Upper: { min: number; max: number }; // 101-105% (slightly over, still excellent)
  ring1Lower: { min: number; max: number }; // 81-95% (excellent underspend)
  ring2: { min: number; max: number };    // 61-80%
  ring3: { min: number; max: number };    // 41-60%
  ring4: { min: number; max: number };    // 21-40%
  ring5: { min: number; max: number };    // 1-20% (edge)
  // Above 105% = bust (over budget)
}

/**
 * Default accuracy zone thresholds (% of budget)
 * Asymmetric: 0-105% within target, >105% is bust
 */
export const DEFAULT_ACCURACY_ZONES: AccuracyZoneConfig = {
  bullseye: { min: 96, max: 100 },     // Perfect: 96-100%
  ring1Upper: { min: 101, max: 105 },  // Slightly over but acceptable
  ring1Lower: { min: 81, max: 95 },    // Excellent underspend
  ring2: { min: 61, max: 80 },         // Good
  ring3: { min: 41, max: 60 },         // Fair
  ring4: { min: 21, max: 40 },         // Poor
  ring5: { min: 1, max: 20 },          // Edge (very under)
};

/**
 * Visual styling for each accuracy zone
 */
export interface AccuracyZoneStyle {
  color: string;
  label: string;
  description: string;
}

/**
 * Zone styles for the bullseye visualization
 */
export const ACCURACY_ZONE_STYLES: Record<AccuracyZone, AccuracyZoneStyle> = {
  bullseye: {
    color: '#10b981', // green-500
    label: 'Perfect',
    description: '96-100% of budget',
  },
  ring1: {
    color: '#84cc16', // lime-500
    label: 'Excellent',
    description: '81-95% or 101-105% of budget',
  },
  ring2: {
    color: '#eab308', // yellow-500
    label: 'Good',
    description: '61-80% of budget',
  },
  ring3: {
    color: '#f97316', // orange-500
    label: 'Fair',
    description: '41-60% of budget',
  },
  ring4: {
    color: '#ef4444', // red-500
    label: 'Poor',
    description: '21-40% of budget',
  },
  ring5: {
    color: '#991b1b', // red-800
    label: 'Very Under',
    description: '1-20% of budget',
  },
  bust: {
    color: '#dc2626', // red-600
    label: 'Over Budget',
    description: 'Exceeded 105% of budget',
  },
  unused: {
    color: '#9ca3af', // gray-400
    label: 'Unused',
    description: 'No spending in this period',
  },
};
