import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PersonalBudgetService } from '../../src/services/personalBudgetService';
import { supabase } from '../../src/lib/supabase';
import type { Budget } from '../../src/types';
import type { PersonalBudget } from '../../src/types/budget';

// Mock Supabase client
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('PersonalBudgetService', () => {
  const mockUserId = 'test-user-123';
  const mockBudgetConfig: Budget = {
    monthlyLimit: 5000,
    categories: {
      'Groceries': { limit: 500, spent: 0, threshold: 80, active: true },
      'Rent': { limit: 1500, spent: 0, threshold: 80, active: true },
      'Entertainment': { limit: 200, spent: 0, threshold: 80, active: true },
    },
    globalSettings: {
      currency: 'USD',
      notificationsEnabled: true,
      familyMembers: ['Alice', 'Bob'],
      activeExpenseCategories: ['Groceries', 'Rent', 'Entertainment'],
    },
  };

  const mockPersonalBudget: PersonalBudget = {
    id: 'budget-1',
    user_id: mockUserId,
    version: 1,
    name: 'My Personal Budget',
    categories: mockBudgetConfig.categories,
    global_settings: mockBudgetConfig.globalSettings,
    created_at: '2025-10-25T10:00:00Z',
    updated_at: '2025-10-25T10:00:00Z',
    is_active: true,
    notes: 'Initial budget',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });
  });

  describe('getActiveBudget', () => {
    it('should return the active personal budget', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockPersonalBudget,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await PersonalBudgetService.getActiveBudget();

      expect(supabase.from).toHaveBeenCalledWith('personal_budgets');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockPersonalBudget);
    });

    it('should return null when no active budget exists', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await PersonalBudgetService.getActiveBudget();

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      await expect(PersonalBudgetService.getActiveBudget()).rejects.toThrow(
        'Failed to fetch active personal budget'
      );
    });
  });

  describe('getBudgetHistory', () => {
    it('should return budget history ordered by version descending', async () => {
      const mockBudgets = [
        { ...mockPersonalBudget, id: 'budget-3', version: 3, is_active: true },
        { ...mockPersonalBudget, id: 'budget-2', version: 2, is_active: false },
        { ...mockPersonalBudget, id: 'budget-1', version: 1, is_active: false },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockBudgets,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      const result = await PersonalBudgetService.getBudgetHistory();

      expect(supabase.from).toHaveBeenCalledWith('personal_budgets');
      expect(mockOrder).toHaveBeenCalledWith('version', { ascending: false });
      expect(result).toEqual(mockBudgets);
    });
  });

  describe('createBudget', () => {
    it('should create a new personal budget with version 1', async () => {
      const newBudget = { ...mockPersonalBudget, id: 'new-budget' };

      // Mock deactivate existing budgets
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateSet = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      // Mock insert new budget
      const mockInsertSelect = vi.fn().mockResolvedValue({
        data: [newBudget],
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'personal_budgets') {
          return {
            update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
            insert: mockInsert,
          } as any;
        }
        return {} as any;
      });

      const result = await PersonalBudgetService.createBudget(
        mockBudgetConfig,
        'My First Budget',
        'Starting fresh'
      );

      expect(result).toEqual(newBudget);
    });

    it('should throw error when insert fails', async () => {
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateSet = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      const mockInsertSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

      vi.mocked(supabase.from).mockImplementation(() => ({
        update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
        insert: mockInsert,
      } as any));

      await expect(
        PersonalBudgetService.createBudget(mockBudgetConfig)
      ).rejects.toThrow('Failed to create personal budget');
    });
  });

  describe('updateBudget', () => {
    it('should create a new version of the budget', async () => {
      const currentBudget = mockPersonalBudget;
      const updatedBudget = {
        ...mockPersonalBudget,
        id: 'budget-2',
        version: 2,
        categories: {
          ...mockBudgetConfig.categories,
          'Groceries': { limit: 600, spent: 0, threshold: 80, active: true },
        },
      };

      // Mock get current version
      const mockSelectSingle = vi.fn().mockResolvedValue({
        data: currentBudget,
        error: null,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      // Mock deactivate current
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateSet = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      // Mock insert new version
      const mockInsertSelect = vi.fn().mockResolvedValue({
        data: [updatedBudget],
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
        insert: mockInsert,
      } as any));

      const result = await PersonalBudgetService.updateBudget(
        { ...mockBudgetConfig, categories: updatedBudget.categories },
        'Updated groceries limit'
      );

      expect(result.version).toBe(2);
    });
  });

  describe('setActiveBudget', () => {
    it('should set a different budget version as active', async () => {
      const targetBudget = { ...mockPersonalBudget, id: 'budget-2', version: 2 };

      // Mock deactivate all
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateSet = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      // Mock activate target
      const mockActivateEq = vi.fn().mockResolvedValue({
        data: [{ ...targetBudget, is_active: true }],
        error: null,
      });
      const mockActivateSelect = vi.fn().mockReturnValue({ eq: mockActivateEq });
      const mockActivateSet = vi.fn().mockReturnValue({ select: mockActivateSelect });

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: deactivate all
          return {
            update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
          } as any;
        } else {
          // Second call: activate target
          return {
            update: vi.fn().mockReturnValue({ set: mockActivateSet }),
          } as any;
        }
      });

      const result = await PersonalBudgetService.setActiveBudget('budget-2');

      expect(result.is_active).toBe(true);
      expect(result.id).toBe('budget-2');
    });
  });

  describe('deleteBudget', () => {
    it('should delete a non-active budget version', async () => {
      const budgetToDelete = { ...mockPersonalBudget, is_active: false };

      // Mock check if active
      const mockSelectSingle = vi.fn().mockResolvedValue({
        data: budgetToDelete,
        error: null,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      // Mock delete
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        delete: mockDelete,
      } as any));

      await expect(
        PersonalBudgetService.deleteBudget('budget-1')
      ).resolves.not.toThrow();
    });

    it('should throw error when trying to delete active budget', async () => {
      const activeBudget = { ...mockPersonalBudget, is_active: true };

      const mockSelectSingle = vi.fn().mockResolvedValue({
        data: activeBudget,
        error: null,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(
        PersonalBudgetService.deleteBudget('budget-1')
      ).rejects.toThrow('Cannot delete the active budget');
    });
  });

  describe('migrateFromLegacyConfig', () => {
    it('should create a personal budget from legacy config', async () => {
      const newBudget = { ...mockPersonalBudget, name: 'Migrated Budget' };

      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateSet = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      const mockInsertSelect = vi.fn().mockResolvedValue({
        data: [newBudget],
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

      vi.mocked(supabase.from).mockImplementation(() => ({
        update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
        insert: mockInsert,
      } as any));

      const result = await PersonalBudgetService.migrateFromLegacyConfig(
        mockBudgetConfig
      );

      expect(result.name).toBe('Migrated Budget');
      expect(result.version).toBe(1);
    });
  });

  describe('helper methods', () => {
    it('getTotalMonthlyLimit should calculate total of active categories', () => {
      const total = PersonalBudgetService.getTotalMonthlyLimit(mockPersonalBudget);
      
      // 500 (Groceries) + 1500 (Rent) + 200 (Entertainment) = 2200
      expect(total).toBe(2200);
    });

    it('getActiveCategoryCount should count active categories', () => {
      const count = PersonalBudgetService.getActiveCategoryCount(mockPersonalBudget);
      
      expect(count).toBe(3);
    });

    it('getActiveCategoryCount should exclude inactive categories', () => {
      const budgetWithInactive = {
        ...mockPersonalBudget,
        categories: {
          ...mockPersonalBudget.categories,
          'Inactive': { limit: 100, spent: 0, threshold: 80, active: false },
        },
      };

      const count = PersonalBudgetService.getActiveCategoryCount(budgetWithInactive);
      
      expect(count).toBe(3); // Still 3, not 4
    });
  });
});
