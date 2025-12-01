/**
 * Transaction Test Helpers
 * =========================
 * 
 * Utilities for testing transaction-related operations:
 * - Income/expense creation
 * - Transaction verification
 * - Spending calculations
 */

import { getAnonClient, getServiceClient, TEST_PREFIX, testName, getCurrentUserId } from '../setup';

// =============================================================================
// TYPES
// =============================================================================

export interface TestTransaction {
  id: string;
  household_id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string | null;
  description: string;
  date: string;
  family_member_id: string | null;
}

export interface CreateTransactionParams {
  type: 'income' | 'expense';
  amount: number;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  date?: string;
  familyMemberId?: string;
}

// =============================================================================
// TRANSACTION OPERATIONS
// =============================================================================

/**
 * Create a test transaction.
 * Uses the authenticated user's household.
 */
export async function createTestTransaction(
  params: CreateTransactionParams
): Promise<TestTransaction> {
  const client = getAnonClient();
  
  // Get user ID and household
  const userId = await getCurrentUserId();
  
  // First, get ALL memberships to debug
  const { data: allMemberships } = await client
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId);
  
  const { data: membership, error: memberError } = await client
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single();

  if (memberError || !membership) {
    throw new Error(`User has no household membership. Error: ${memberError?.message || 'No data returned'}. UserID: ${userId}. Found ${allMemberships?.length || 0} memberships.`);
  }

  const transactionData = {
    household_id: membership.household_id,
    user_id: userId,
    type: params.type,
    amount: params.amount,
    category: params.categoryName || 'Uncategorized',
    category_id: params.categoryId || null,
    description: params.description || testName(`Transaction-${params.type}`),
    date: params.date || new Date().toISOString().split('T')[0],
    family_member_id: params.familyMemberId || null,
  };

  const { data, error } = await client
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  console.log(`✓ Created ${params.type} transaction: $${params.amount}`);
  return data;
}

/**
 * Create an income transaction.
 */
export async function createIncome(
  amount: number, 
  description?: string
): Promise<TestTransaction> {
  return createTestTransaction({
    type: 'income',
    amount,
    description: description || testName('Income'),
  });
}

/**
 * Create an expense transaction with category ID.
 */
export async function createExpense(
  amount: number,
  categoryId: string,
  description?: string,
  categoryName?: string
): Promise<TestTransaction> {
  return createTestTransaction({
    type: 'expense',
    amount,
    categoryId,
    categoryName: categoryName || 'TestExpense',
    description: description || testName('Expense'),
  });
}

/**
 * Create an expense transaction with just a category name (no UUID).
 * Use this when you don't have a real category UUID.
 */
export async function createSimpleExpense(
  amount: number,
  categoryName: string,
  description?: string
): Promise<TestTransaction> {
  return createTestTransaction({
    type: 'expense',
    amount,
    categoryId: undefined, // Will be null in DB
    categoryName,
    description: description || testName('Expense'),
  });
}

/**
 * Alias for createSimpleExpense for better readability.
 */
export async function createExpenseByName(
  amount: number,
  categoryName: string,
  description?: string
): Promise<TestTransaction> {
  return createSimpleExpense(amount, categoryName, description);
}

/**
 * Get all transactions for the current user's household.
 */
export async function getHouseholdTransactions(): Promise<TestTransaction[]> {
  const client = getAnonClient();

  const { data: membership } = await client
    .from('household_members')
    .select('household_id')
    .single();

  if (!membership) return [];

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Failed to get transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get transactions for a specific category in the current month.
 */
export async function getCategoryTransactions(
  categoryId: string,
  year?: number,
  month?: number
): Promise<TestTransaction[]> {
  const client = getAnonClient();
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  // Build date range for the month
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('category_id', categoryId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to get category transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get transactions for a specific category NAME in the current month.
 * Use this when you don't have a real category UUID.
 */
export async function getCategoryTransactionsByName(
  categoryName: string,
  year?: number,
  month?: number
): Promise<TestTransaction[]> {
  const client = getAnonClient();
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  // Build date range for the month
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('category', categoryName)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to get category transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Calculate total spending for a category in the current month.
 */
export async function getCategorySpending(
  categoryId: string,
  year?: number,
  month?: number
): Promise<number> {
  const transactions = await getCategoryTransactions(categoryId, year, month);
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate total spending for a category NAME in the current month.
 * Use this when you don't have a real category UUID.
 */
export async function getCategorySpendingByName(
  categoryName: string,
  year?: number,
  month?: number
): Promise<number> {
  const transactions = await getCategoryTransactionsByName(categoryName, year, month);
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Get total income for the current month.
 */
export async function getMonthlyIncome(
  year?: number,
  month?: number
): Promise<number> {
  const client = getAnonClient();
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

  const { data, error } = await client
    .from('transactions')
    .select('amount')
    .eq('type', 'income')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to get income: ${error.message}`);
  }

  return (data || []).reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Get total expenses for the current month.
 */
export async function getMonthlyExpenses(
  year?: number,
  month?: number
): Promise<number> {
  const client = getAnonClient();
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

  const { data, error } = await client
    .from('transactions')
    .select('amount')
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to get expenses: ${error.message}`);
  }

  return (data || []).reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Delete all test transactions (those with TEST_PREFIX in description).
 */
export async function cleanupTestTransactions(): Promise<void> {
  const client = getServiceClient();

  const { error } = await client
    .from('transactions')
    .delete()
    .like('description', `${TEST_PREFIX}%`);

  if (error) {
    console.warn(`Could not cleanup test transactions: ${error.message}`);
  }
}
