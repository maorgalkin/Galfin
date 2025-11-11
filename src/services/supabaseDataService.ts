import { supabase } from '../lib/supabase';
import type { 
  Transaction, 
  FamilyMember, 
  BudgetConfiguration 
} from '../types';

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user.id;
};

// Helper to get current user's household ID
const getHouseholdId = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('User is not part of a household');
  }

  return data.household_id;
};

// ==================== TRANSACTIONS ====================

export const getTransactions = async (): Promise<Transaction[]> => {
  const householdId = await getHouseholdId();
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('household_id', householdId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }

  return data.map(row => ({
    id: row.id,
    date: row.date,
    description: row.description,
    amount: parseFloat(row.amount),
    category: row.category,
    type: row.type as 'income' | 'expense',
    familyMember: row.family_member_id || undefined,
  }));
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const userId = await getCurrentUserId();
  const householdId = await getHouseholdId();
  
  console.log('SupabaseService: Adding transaction for household:', householdId);
  console.log('Transaction data:', transaction);

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      household_id: householdId,
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      type: transaction.type,
      family_member_id: transaction.familyMember || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase error details:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error hint:', error.hint);
    throw new Error(`Failed to add transaction: ${error.message}`);
  }

  console.log('Transaction added successfully to Supabase:', data);

  return {
    id: data.id,
    date: data.date,
    description: data.description,
    amount: parseFloat(data.amount),
    category: data.category,
    type: data.type as 'income' | 'expense',
    familyMember: data.family_member_id || undefined,
  };
};

export const updateTransaction = async (id: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const householdId = await getHouseholdId();

  const { data, error } = await supabase
    .from('transactions')
    .update({
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      type: transaction.type,
      family_member_id: transaction.familyMember || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('household_id', householdId) // Ensure user can only update household transactions
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }

  return {
    id: data.id,
    date: data.date,
    description: data.description,
    amount: parseFloat(data.amount),
    category: data.category,
    type: data.type as 'income' | 'expense',
    familyMember: data.family_member_id || undefined,
  };
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId); // RLS will enforce this, but good practice

  if (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

// ==================== FAMILY MEMBERS ====================

export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
  const householdId = await getHouseholdId();

  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching family members:', error);
    throw error;
  }

  return data.map(row => ({
    id: row.id,
    name: row.name,
    color: row.color,
    household_member_id: row.household_member_id,
  }));
};

export const addFamilyMember = async (member: Omit<FamilyMember, 'id'>): Promise<FamilyMember> => {
  const userId = await getCurrentUserId();
  const householdId = await getHouseholdId();

  const { data, error } = await supabase
    .from('family_members')
    .insert({
      user_id: userId,
      household_id: householdId,
      name: member.name,
      color: member.color,
      household_member_id: member.household_member_id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding family member:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    color: data.color,
    household_member_id: data.household_member_id,
  };
};

export const updateFamilyMember = async (id: string, member: Omit<FamilyMember, 'id'>): Promise<FamilyMember> => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('family_members')
    .update({
      name: member.name,
      color: member.color,
      household_member_id: member.household_member_id,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating family member:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    color: data.color,
    household_member_id: data.household_member_id,
  };
};

export const deleteFamilyMember = async (id: string): Promise<void> => {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting family member:', error);
    throw error;
  }
};

// ==================== BUDGET CONFIG ====================

export const getBudgetConfig = async (): Promise<BudgetConfiguration | null> => {
  const userId = await getCurrentUserId();

  // First, get the budget config
  const { data: configData, error: configError } = await supabase
    .from('budget_configs')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (configError) {
    if (configError.code === 'PGRST116') {
      // No config found
      return null;
    }
    console.error('Error fetching budget config:', configError);
    throw configError;
  }

  // Then, get the categories for this config
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('budget_config_id', configData.id)
    .order('category_name', { ascending: true });

  if (categoriesError) {
    console.error('Error fetching budget categories:', categoriesError);
    throw categoriesError;
  }

  const categories: Record<string, {
    monthlyLimit: number;
    warningThreshold: number;
    isActive: boolean;
    color?: string;
    description?: string;
  }> = {};
  
  categoriesData.forEach(cat => {
    categories[cat.category_name] = {
      monthlyLimit: parseFloat(cat.monthly_limit),
      warningThreshold: cat.warning_threshold,
      isActive: cat.is_active,
      color: cat.color || undefined,
      description: cat.description || undefined,
    };
  });

  return {
    version: '1.0',
    lastUpdated: configData.updated_at,
    categories,
    globalSettings: {
      currency: configData.currency,
      warningNotifications: configData.warning_notifications,
      emailAlerts: configData.email_alerts,
    },
  };
};

export const saveBudgetConfig = async (config: BudgetConfiguration): Promise<void> => {
  const userId = await getCurrentUserId();

  // First, upsert the budget_config
  const { data: configData, error: configError } = await supabase
    .from('budget_configs')
    .upsert({
      user_id: userId,
      currency: config.globalSettings.currency,
      warning_notifications: config.globalSettings.warningNotifications,
      email_alerts: config.globalSettings.emailAlerts,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (configError) {
    console.error('Error saving budget config:', configError);
    throw configError;
  }

  // Delete all existing categories for this config
  await supabase
    .from('budget_categories')
    .delete()
    .eq('budget_config_id', configData.id);

  // Insert new categories
  const categoriesToInsert = Object.entries(config.categories).map(([name, category]) => ({
    budget_config_id: configData.id,
    category_name: name,
    monthly_limit: category.monthlyLimit,
    warning_threshold: category.warningThreshold,
    is_active: category.isActive,
    color: category.color || null,
    description: category.description || null,
  }));

  if (categoriesToInsert.length > 0) {
    const { error: categoriesError } = await supabase
      .from('budget_categories')
      .insert(categoriesToInsert);

    if (categoriesError) {
      console.error('Error saving budget categories:', categoriesError);
      throw categoriesError;
    }
  }
};

// ==================== DATA MIGRATION ====================

/**
 * Migrate data from localStorage to Supabase
 * Call this once after user logs in for the first time
 */
export const migrateFromLocalStorage = async (): Promise<{
  success: boolean;
  message: string;
  details?: {
    transactions: number;
    familyMembers: number;
    budgetConfig: boolean;
  };
}> => {
  try {
    const userId = await getCurrentUserId();

    // Check if user already has data in Supabase
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existingTransactions && existingTransactions.length > 0) {
      return {
        success: false,
        message: 'User already has data in Supabase. Migration skipped.',
      };
    }

    let migratedTransactions = 0;
    let migratedFamilyMembers = 0;
    let migratedBudgetConfig = false;

    // Migrate family members
    const localFamilyMembers = localStorage.getItem('familyMembers');
    if (localFamilyMembers) {
      try {
        const members: FamilyMember[] = JSON.parse(localFamilyMembers);
        for (const member of members) {
          await addFamilyMember({ name: member.name, color: member.color });
          migratedFamilyMembers++;
        }
      } catch (e) {
        console.error('Error migrating family members:', e);
      }
    }

    // Migrate transactions
    const localTransactions = localStorage.getItem('transactions');
    if (localTransactions) {
      try {
        const transactions: Transaction[] = JSON.parse(localTransactions);
        for (const transaction of transactions) {
          await addTransaction({
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount,
            category: transaction.category,
            type: transaction.type,
            familyMember: transaction.familyMember,
          });
          migratedTransactions++;
        }
      } catch (e) {
        console.error('Error migrating transactions:', e);
      }
    }

    // Migrate budget config
    const localBudgetConfig = localStorage.getItem('budgetConfig');
    if (localBudgetConfig) {
      try {
        const config: BudgetConfiguration = JSON.parse(localBudgetConfig);
        await saveBudgetConfig(config);
        migratedBudgetConfig = true;
      } catch (e) {
        console.error('Error migrating budget config:', e);
      }
    }

    return {
      success: true,
      message: 'Data successfully migrated from localStorage to Supabase',
      details: {
        transactions: migratedTransactions,
        familyMembers: migratedFamilyMembers,
        budgetConfig: migratedBudgetConfig,
      },
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during migration',
    };
  }
};
