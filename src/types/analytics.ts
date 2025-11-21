/**
 * Analytics Types
 * Types for analytics features including category accuracy tracking
 */

/**
 * Represents accuracy zones on the bullseye target
 */
export type AccuracyZone = 'bullseye' | 'ring1' | 'ring2' | 'ring3' | 'ring4' | 'bust' | 'unused';

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
}

/**
 * Configuration for accuracy zone thresholds
 */
export interface AccuracyZoneConfig {
  bullseye: { min: number; max: number }; // e.g., 95-105%
  ring1: { min: number; max: number };    // e.g., 80-120%
  ring2: { min: number; max: number };    // e.g., 60-140%
  ring3: { min: number; max: number };    // e.g., 40-160%
  ring4: { min: number; max: number };    // e.g., 20-180%
  // Below 20% or above 180% = bust
}

/**
 * Default accuracy zone thresholds (% of budget)
 */
export const DEFAULT_ACCURACY_ZONES: AccuracyZoneConfig = {
  bullseye: { min: 95, max: 105 },   // Within 5% of budget
  ring1: { min: 85, max: 115 },      // Within 15% of budget
  ring2: { min: 70, max: 130 },      // Within 30% of budget
  ring3: { min: 50, max: 150 },      // Within 50% of budget
  ring4: { min: 20, max: 180 },      // Within 80% of budget
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
    description: 'Within 5% of budget',
  },
  ring1: {
    color: '#84cc16', // lime-500
    label: 'Excellent',
    description: 'Within 15% of budget',
  },
  ring2: {
    color: '#eab308', // yellow-500
    label: 'Good',
    description: 'Within 30% of budget',
  },
  ring3: {
    color: '#f97316', // orange-500
    label: 'Fair',
    description: 'Within 50% of budget',
  },
  ring4: {
    color: '#ef4444', // red-500
    label: 'Poor',
    description: 'Within 80% of budget',
  },
  bust: {
    color: '#dc2626', // red-600
    label: 'Over Budget',
    description: 'Exceeded budget significantly',
  },
  unused: {
    color: '#9ca3af', // gray-400
    label: 'Unused',
    description: 'No spending in this period',
  },
};
