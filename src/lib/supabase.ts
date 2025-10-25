import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// These values come from your Supabase project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required variables:\n' +
    '  - VITE_SUPABASE_URL\n' +
    '  - VITE_SUPABASE_ANON_KEY\n\n' +
    'See SUPABASE_SETUP_GUIDE.md for setup instructions.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // Use localStorage for session persistence
  },
});

// Database type definitions for TypeScript
export interface Database {
  public: {
    Tables: {
      budget_configs: {
        Row: {
          id: string;
          user_id: string;
          currency: string;
          warning_notifications: boolean;
          email_alerts: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budget_configs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['budget_configs']['Insert']>;
      };
      budget_categories: {
        Row: {
          id: string;
          budget_config_id: string;
          category_name: string;
          monthly_limit: number;
          warning_threshold: number;
          is_active: boolean;
          color: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budget_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['budget_categories']['Insert']>;
      };
      family_members: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['family_members']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['family_members']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          family_member_id: string | null;
          date: string;
          description: string;
          amount: number;
          category: string;
          type: 'income' | 'expense';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          budget_amount: number;
          spent_amount: number;
          month: number;
          year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>;
      };
    };
  };
}

// Helper type for authenticated user
export type AuthUser = {
  id: string;
  email: string;
  created_at: string;
};

// Export typed supabase client
export type SupabaseClient = typeof supabase;
