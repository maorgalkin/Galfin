import { supabase } from '../lib/supabase';
import type { Transaction, PersonalBudget, MonthlyBudget } from '../types';

/**
 * Dummy Data Seeder for Analytics Testing
 * Creates a full year of transactions with extreme category patterns:
 * - One category constantly OVER budget (150-200% utilization)
 * - One category constantly UNDER budget (20-40% utilization)
 * - One category NEVER USED (0% utilization)
 * - Other categories with normal variation
 */

const CATEGORY_PATTERNS = {
  ALWAYS_OVER: 'Dining Out',
  ALWAYS_UNDER: 'Entertainment',
  NEVER_USED: 'Pet Care',
} as const;

interface CategoryConfig {
  name: string;
  monthlyBudget: number;
  color: string;
  pattern: 'over' | 'under' | 'zero' | 'normal';
}

const CATEGORIES: CategoryConfig[] = [
  { name: 'Groceries', monthlyBudget: 800, color: '#10b981', pattern: 'normal' },
  { name: CATEGORY_PATTERNS.ALWAYS_OVER, monthlyBudget: 500, color: '#ef4444', pattern: 'over' },
  { name: 'Transportation', monthlyBudget: 400, color: '#3b82f6', pattern: 'normal' },
  { name: CATEGORY_PATTERNS.ALWAYS_UNDER, monthlyBudget: 300, color: '#8b5cf6', pattern: 'under' },
  { name: 'Utilities', monthlyBudget: 250, color: '#f59e0b', pattern: 'normal' },
  { name: 'Healthcare', monthlyBudget: 200, color: '#ec4899', pattern: 'normal' },
  { name: CATEGORY_PATTERNS.NEVER_USED, monthlyBudget: 150, color: '#6b7280', pattern: 'zero' },
  { name: 'Shopping', monthlyBudget: 600, color: '#14b8a6', pattern: 'normal' },
  { name: 'Home Maintenance', monthlyBudget: 350, color: '#a855f7', pattern: 'normal' },
];

const FAMILY_MEMBERS = ['Mom', 'Dad', 'Teen'];

/**
 * Generate transactions for a specific month and category
 */
function generateTransactionsForMonth(
  categoryConfig: CategoryConfig,
  year: number,
  month: number,
  userId: string
): Partial<Transaction>[] {
  const transactions: Partial<Transaction>[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let totalSpending = 0;
  let targetSpending = 0;

  // Determine target spending based on pattern
  switch (categoryConfig.pattern) {
    case 'over':
      // 150-200% of budget
      targetSpending = categoryConfig.monthlyBudget * (1.5 + Math.random() * 0.5);
      break;
    case 'under':
      // 20-40% of budget
      targetSpending = categoryConfig.monthlyBudget * (0.2 + Math.random() * 0.2);
      break;
    case 'zero':
      // No spending
      targetSpending = 0;
      break;
    case 'normal':
      // 70-110% of budget
      targetSpending = categoryConfig.monthlyBudget * (0.7 + Math.random() * 0.4);
      break;
  }

  if (targetSpending === 0) {
    return transactions;
  }

  // Generate 3-8 transactions throughout the month
  const numTransactions = 3 + Math.floor(Math.random() * 6);
  const transactionDays = Array.from(
    { length: numTransactions },
    () => 1 + Math.floor(Math.random() * daysInMonth)
  ).sort((a, b) => a - b);

  for (let i = 0; i < numTransactions; i++) {
    const day = transactionDays[i];
    const date = new Date(year, month, day);

    // Distribute spending somewhat evenly, with some randomness
    const baseAmount = targetSpending / numTransactions;
    const variance = baseAmount * 0.4; // ±40% variance
    let amount = baseAmount + (Math.random() - 0.5) * 2 * variance;

    // Ensure last transaction hits the target
    if (i === numTransactions - 1) {
      amount = targetSpending - totalSpending;
    }

    // Round to 2 decimals
    amount = Math.round(amount * 100) / 100;
    totalSpending += amount;

    const transaction: Partial<Transaction> = {
      user_id: userId,
      date: date.toISOString().split('T')[0],
      category: categoryConfig.name,
      amount,
      description: generateDescription(categoryConfig.name, amount),
      family_member: FAMILY_MEMBERS[Math.floor(Math.random() * FAMILY_MEMBERS.length)],
      created_at: date.toISOString(),
    };

    transactions.push(transaction);
  }

  return transactions;
}

/**
 * Generate realistic transaction descriptions
 */
function generateDescription(category: string, amount: number): string {
  const descriptions: Record<string, string[]> = {
    Groceries: ['Whole Foods', 'Trader Joes', 'Safeway', 'Local Market', 'Costco'],
    'Dining Out': ['Restaurant', 'Pizza Place', 'Sushi Bar', 'Coffee Shop', 'Fast Food'],
    Transportation: ['Gas Station', 'Uber', 'Public Transit', 'Parking', 'Car Wash'],
    Entertainment: ['Movie Theater', 'Concert', 'Streaming Service', 'Game Purchase', 'Amusement Park'],
    Utilities: ['Electric Bill', 'Water Bill', 'Gas Bill', 'Internet Bill', 'Phone Bill'],
    Healthcare: ['Pharmacy', 'Doctor Visit', 'Dentist', 'Medical Supplies', 'Health Insurance'],
    'Pet Care': ['Vet Visit', 'Pet Food', 'Pet Supplies', 'Grooming', 'Pet Medication'],
    Shopping: ['Clothing Store', 'Electronics', 'Home Goods', 'Department Store', 'Online Purchase'],
    'Home Maintenance': ['Hardware Store', 'Plumber', 'Electrician', 'Gardening', 'Home Repairs'],
  };

  const options = descriptions[category] || ['General Purchase'];
  const vendor = options[Math.floor(Math.random() * options.length)];
  return `${vendor} - $${amount.toFixed(2)}`;
}

/**
 * Create or update personal budget
 */
async function createPersonalBudget(userId: string): Promise<void> {
  const categories = CATEGORIES.reduce((acc, cat) => {
    acc[cat.name] = {
      monthlyLimit: cat.monthlyBudget,
      color: cat.color,
    };
    return acc;
  }, {} as Record<string, { monthlyLimit: number; color: string }>);

  const budget: Partial<PersonalBudget> = {
    user_id: userId,
    categories,
    active: true,
    created_at: new Date(2024, 11, 1).toISOString(), // Dec 1, 2024
  };

  // Check if budget exists
  const { data: existing } = await supabase
    .from('personal_budgets')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .single();

  if (existing) {
    await supabase
      .from('personal_budgets')
      .update({ categories })
      .eq('id', existing.id);
    console.log('✅ Updated existing personal budget');
  } else {
    await supabase.from('personal_budgets').insert(budget);
    console.log('✅ Created personal budget');
  }
}

/**
 * Create monthly budgets with some adjustments
 */
async function createMonthlyBudgets(userId: string, year: number): Promise<void> {
  const months = Array.from({ length: 12 }, (_, i) => i);

  for (const month of months) {
    const monthDate = new Date(year, month, 1);
    const monthStr = monthDate.toISOString().split('T')[0].substring(0, 7); // YYYY-MM

    // Create categories with occasional adjustments (±10%)
    const categories = CATEGORIES.reduce((acc, cat) => {
      const shouldAdjust = Math.random() > 0.7; // 30% chance of adjustment
      const adjustmentFactor = shouldAdjust ? 0.9 + Math.random() * 0.2 : 1.0;
      const adjustedBudget = Math.round(cat.monthlyBudget * adjustmentFactor);

      acc[cat.name] = {
        monthlyLimit: adjustedBudget,
        color: cat.color,
      };
      return acc;
    }, {} as Record<string, { monthlyLimit: number; color: string }>);

    const monthlyBudget: Partial<MonthlyBudget> = {
      user_id: userId,
      month: monthStr,
      categories,
      created_at: monthDate.toISOString(),
    };

    // Check if monthly budget exists
    const { data: existing } = await supabase
      .from('monthly_budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('month', monthStr)
      .single();

    if (existing) {
      await supabase
        .from('monthly_budgets')
        .update({ categories })
        .eq('id', existing.id);
    } else {
      await supabase.from('monthly_budgets').insert(monthlyBudget);
    }
  }

  console.log('✅ Created/updated monthly budgets for all 12 months');
}

/**
 * Generate and insert all transactions for the year
 */
async function createTransactions(userId: string, year: number): Promise<void> {
  const allTransactions: Partial<Transaction>[] = [];

  // Generate transactions for each month and category
  for (let month = 0; month < 12; month++) {
    let monthCount = 0;
    for (const categoryConfig of CATEGORIES) {
      const monthTransactions = generateTransactionsForMonth(
        categoryConfig,
        year,
        month,
        userId
      );
      allTransactions.push(...monthTransactions);
      monthCount += monthTransactions.length;
    }
    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
    console.log(`  ${monthName}: ${monthCount} transactions`);
  }

  // Delete existing transactions for the year
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .gte('date', yearStart)
    .lte('date', yearEnd);

  console.log(`📝 Prepared ${allTransactions.length} transactions for insertion...`);

  // Insert in batches of 100
  const batchSize = 100;
  let insertedCount = 0;
  for (let i = 0; i < allTransactions.length; i += batchSize) {
    const batch = allTransactions.slice(i, i + batchSize);
    const { error } = await supabase.from('transactions').insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
      throw error;
    }
    
    insertedCount += batch.length;
    console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} transactions (total: ${insertedCount}/${allTransactions.length})`);
  }

  console.log(`✅ Created ${allTransactions.length} transactions across ${year}`);
}

/**
 * Main seeder function
 */
export async function seedDummyData(): Promise<void> {
  console.log('🌱 Starting dummy data seeder...');

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }

  const userId = user.id;
  const currentYear = new Date().getFullYear();

  try {
    // 1. Create/update personal budget
    console.log('📊 Creating personal budget...');
    await createPersonalBudget(userId);

    // 2. Create monthly budgets
    console.log('📅 Creating monthly budgets...');
    await createMonthlyBudgets(userId, currentYear);

    // 3. Generate transactions
    console.log('💰 Generating transactions...');
    await createTransactions(userId, currentYear);

    console.log('✨ Dummy data seeding complete!');
    console.log('\n📈 Category Patterns:');
    console.log(`  🔴 ${CATEGORY_PATTERNS.ALWAYS_OVER}: Always OVER budget (150-200%)`);
    console.log(`  🟢 ${CATEGORY_PATTERNS.ALWAYS_UNDER}: Always UNDER budget (20-40%)`);
    console.log(`  ⚫ ${CATEGORY_PATTERNS.NEVER_USED}: NEVER used (0%)`);
    console.log('  🔵 Other categories: Normal variation (70-110%)');
  } catch (error) {
    console.error('❌ Error seeding dummy data:', error);
    throw error;
  }
}

/**
 * Clear all dummy data
 */
export async function clearDummyData(): Promise<void> {
  console.log('🧹 Clearing dummy data...');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }

  const userId = user.id;
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  try {
    // Delete transactions
    await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .gte('date', yearStart)
      .lte('date', yearEnd);

    // Delete monthly budgets
    await supabase
      .from('monthly_budgets')
      .delete()
      .eq('user_id', userId)
      .like('month', `${currentYear}-%`);

    console.log('✅ Dummy data cleared');
  } catch (error) {
    console.error('❌ Error clearing dummy data:', error);
    throw error;
  }
}
