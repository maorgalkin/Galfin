/**
 * Budget Test Helpers
 * ====================
 * 
 * Utilities for testing budget-related operations:
 * - Personal budget creation/verification
 * - Category management
 * - Monthly budget sync
 */

import { getAnonClient, getServiceClient, TEST_PREFIX, testName, getCurrentUserId } from '../setup';

// =============================================================================
// TYPES
// =============================================================================

export interface TestCategory {
  id: string;
  name: string;
  icon: string;
  monthlyLimit: number;
}

export interface TestPersonalBudget {
  id: string;
  household_id: string;
  name: string;
  version: number;
  is_active: boolean;
  categories: TestCategory[];
  global_settings: {
    activeCategories: string[];
    familyMembers: string[];
  };
}

export interface TestMonthlyBudget {
  id: string;
  household_id: string;
  year: number;
  month: number;
  categories: TestCategory[];
}

// =============================================================================
// PERSONAL BUDGET OPERATIONS
// =============================================================================

/**
 * Create a personal budget with specified categories.
 * Uses the authenticated user's household.
 */
export async function createTestBudget(
  categories: Omit<TestCategory, 'id'>[],
  name?: string
): Promise<TestPersonalBudget> {
  const client = getAnonClient();
  
  // Get current user ID
  const userId = await getCurrentUserId();
  
  // Get user's household
  const { data: membership, error: memberError } = await client
    .from('household_members')
    .select('household_id')
    .single();

  if (memberError || !membership) {
    throw new Error('User has no household membership');
  }

  const budgetName = name || testName('Budget');
  
  // Create categories with IDs
  const categoriesWithIds = categories.map((cat, index) => ({
    ...cat,
    id: `test-cat-${Date.now()}-${index}`,
  }));

  const budgetData = {
    user_id: userId,
    household_id: membership.household_id,
    name: budgetName,
    version: 1,
    is_active: true,
    categories: categoriesWithIds,
    global_settings: {
      activeCategories: categoriesWithIds.map(c => c.id),
      familyMembers: [],
    },
  };

  const { data, error } = await client
    .from('personal_budgets')
    .insert(budgetData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create budget: ${error.message}`);
  }

  console.log(`✓ Created test budget: ${budgetName} with ${categories.length} categories`);
  return data;
}

/**
 * Get the active personal budget for the current user's household.
 */
export async function getActiveBudget(): Promise<TestPersonalBudget | null> {
  const client = getAnonClient();

  const { data: membership } = await client
    .from('household_members')
    .select('household_id')
    .single();

  if (!membership) return null;

  const { data, error } = await client
    .from('personal_budgets')
    .select('*')
    .eq('household_id', membership.household_id)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows
    throw new Error(`Failed to get budget: ${error.message}`);
  }

  return data;
}

/**
 * Verify a budget exists with expected categories.
 */
export async function verifyBudgetCategories(
  budgetId: string, 
  expectedCategories: string[]
): Promise<void> {
  const client = getServiceClient();

  const { data, error } = await client
    .from('personal_budgets')
    .select('categories')
    .eq('id', budgetId)
    .single();

  if (error || !data) {
    throw new Error(`Budget ${budgetId} not found`);
  }

  const categoryNames = data.categories.map((c: TestCategory) => c.name);
  
  for (const expected of expectedCategories) {
    if (!categoryNames.includes(expected)) {
      throw new Error(`Category "${expected}" not found in budget`);
    }
  }
}

/**
 * Get category limit from active budget.
 */
export async function getCategoryLimit(categoryId: string): Promise<number> {
  const budget = await getActiveBudget();
  if (!budget) {
    throw new Error('No active budget');
  }

  const category = budget.categories.find(c => c.id === categoryId);
  if (!category) {
    throw new Error(`Category ${categoryId} not found`);
  }

  return category.monthlyLimit;
}

// =============================================================================
// MONTHLY BUDGET OPERATIONS
// =============================================================================

/**
 * Get the monthly budget for a specific month.
 */
export async function getMonthlyBudget(
  year: number, 
  month: number
): Promise<TestMonthlyBudget | null> {
  const client = getAnonClient();

  const { data: membership } = await client
    .from('household_members')
    .select('household_id')
    .single();

  if (!membership) return null;

  const { data, error } = await client
    .from('monthly_budgets')
    .select('*')
    .eq('household_id', membership.household_id)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows
    throw new Error(`Failed to get monthly budget: ${error.message}`);
  }

  return data;
}

/**
 * Delete monthly budget for a specific month.
 * Useful for forcing re-sync from personal budget.
 */
export async function deleteMonthlyBudget(year: number, month: number): Promise<void> {
  const client = getServiceClient();

  // Get household ID first
  const { data: membership } = await client
    .from('household_members')
    .select('household_id')
    .limit(1)
    .single();

  if (!membership) return;

  const { error } = await client
    .from('monthly_budgets')
    .delete()
    .eq('household_id', membership.household_id)
    .eq('year', year)
    .eq('month', month);

  if (error) {
    console.warn(`Could not delete monthly budget: ${error.message}`);
  }
}

// =============================================================================
// STANDARD TEST CATEGORIES
// =============================================================================

/**
 * Standard set of 10 test categories matching user requirements.
 */
export const STANDARD_TEST_CATEGORIES: Omit<TestCategory, 'id'>[] = [
  { name: 'Groceries', icon: '🛒', monthlyLimit: 1000 },
  { name: 'Restaurants', icon: '🍽️', monthlyLimit: 500 },
  { name: 'Transportation', icon: '🚗', monthlyLimit: 400 },
  { name: 'Utilities', icon: '💡', monthlyLimit: 300 },
  { name: 'Entertainment', icon: '🎬', monthlyLimit: 200 },
  { name: 'Healthcare', icon: '🏥', monthlyLimit: 250 },
  { name: 'Shopping', icon: '🛍️', monthlyLimit: 350 },
  { name: 'Education', icon: '📚', monthlyLimit: 150 },
  { name: 'Travel', icon: '✈️', monthlyLimit: 500 },
  { name: 'Miscellaneous', icon: '📦', monthlyLimit: 200 },
];

/**
 * Create a budget with the standard 10 categories.
 */
export async function createStandardTestBudget(): Promise<TestPersonalBudget> {
  return createTestBudget(STANDARD_TEST_CATEGORIES, testName('StandardBudget'));
}
