import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonthlyBudgetService } from '../../src/services/monthlyBudgetService';
import { PersonalBudgetService } from '../../src/services/personalBudgetService';
import { supabase } from '../../src/lib/supabase';
import type { MonthlyBudget, PersonalBudget } from '../../src/types/budget';

// Mock Supabase client
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock PersonalBudgetService
vi.mock('../../src/services/personalBudgetService');

describe('MonthlyBudgetService', () => {
  const mockUserId = 'test-user-123';
  const mockPersonalBudget: PersonalBudget = {
    id: 'personal-budget-1',
    user_id: mockUserId,
    version: 1,
    name: 'My Budget',
    categories: {
      'Groceries': { monthlyLimit: 500, warningThreshold: 80, isActive: true },
      'Rent': { monthlyLimit: 1500, warningThreshold: 80, isActive: true },
    },
    global_settings: {
      currency: 'USD',
      warningNotifications: true,
      emailAlerts: false,
      familyMembers: [],
      activeExpenseCategories: ['Groceries', 'Rent'],
    },
    created_at: '2025-10-25T10:00:00Z',
    updated_at: '2025-10-25T10:00:00Z',
    is_active: true,
  };

  const mockMonthlyBudget: MonthlyBudget = {
    id: 'monthly-budget-1',
    user_id: mockUserId,
    personal_budget_id: 'personal-budget-1',
    year: 2025,
    month: 10,
    categories: mockPersonalBudget.categories,
    global_settings: mockPersonalBudget.global_settings,
    adjustment_count: 0,
    is_locked: false,
    created_at: '2025-10-25T10:00:00Z',
    updated_at: '2025-10-25T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });
  });

  describe('getOrCreateMonthlyBudget', () => {
    it('should return existing monthly budget if it exists', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockMonthlyBudget,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      } as any);

      const result = await MonthlyBudgetService.getOrCreateMonthlyBudget(2025, 10);

      expect(result).toEqual(mockMonthlyBudget);
      expect(mockEq).toHaveBeenCalledWith('year', 2025);
      expect(mockEq).toHaveBeenCalledWith('month', 10);
    });

    it('should create new monthly budget from personal budget if not exists', async () => {
      // Mock no existing monthly budget
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock get personal budget
      vi.mocked(PersonalBudgetService.getActiveBudget).mockResolvedValue(
        mockPersonalBudget
      );

      // Mock insert
      const mockInsertSelect = vi.fn().mockResolvedValue({
        data: [mockMonthlyBudget],
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'monthly_budgets') {
          return {
            select: mockSelect,
            eq: mockEq,
            maybeSingle: mockMaybeSingle,
            insert: mockInsert,
          } as any;
        }
        return {} as any;
      });

      const result = await MonthlyBudgetService.getOrCreateMonthlyBudget(2025, 10);

      expect(PersonalBudgetService.getActiveBudget).toHaveBeenCalled();
      expect(result).toEqual(mockMonthlyBudget);
    });

    it('should throw error if no personal budget exists', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      } as any);

      vi.mocked(PersonalBudgetService.getActiveBudget).mockResolvedValue(null);

      await expect(
        MonthlyBudgetService.getOrCreateMonthlyBudget(2025, 10)
      ).rejects.toThrow('No active personal budget found');
    });
  });

  describe('getCurrentMonthBudget', () => {
    it('should get budget for current month', async () => {
      const now = new Date('2025-10-25');
      vi.setSystemTime(now);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockMonthlyBudget,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      } as any);

      const result = await MonthlyBudgetService.getCurrentMonthBudget();

      expect(result).toEqual(mockMonthlyBudget);
      expect(mockEq).toHaveBeenCalledWith('year', 2025);
      expect(mockEq).toHaveBeenCalledWith('month', 10);

      vi.useRealTimers();
    });
  });

  describe('updateCategoryLimit', () => {
    it('should update category limit and increment adjustment count', async () => {
      const updatedBudget = {
        ...mockMonthlyBudget,
        categories: {
          ...mockMonthlyBudget.categories,
          'Groceries': { ...mockMonthlyBudget.categories['Groceries'], monthlyLimit: 600 },
        },
        adjustment_count: 1,
      };

      // Mock get current budget
      const mockSelect = vi.fn().mockReturnThis();
      const mockEqSingle = vi.fn().mockResolvedValue({
        data: mockMonthlyBudget,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockEqSingle });

      // Mock update
      const mockUpdateEqSelect = vi.fn().mockResolvedValue({
        data: [updatedBudget],
        error: null,
      });
      const mockUpdateSelect = vi.fn().mockReturnValue({ eq: mockUpdateEqSelect });
      const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
      const mockUpdateSet = vi.fn().mockReturnValue({ eq: mockUpdateEq });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

      vi.mocked(supabase.from).mockImplementation(() => ({
        select: mockSelect,
        eq: mockEq,
        update: mockUpdate,
      } as any));

      const result = await MonthlyBudgetService.updateCategoryLimit(
        'monthly-budget-1',
        'Groceries',
        600,
        'Increased for holidays'
      );

      expect(result.adjustment_count).toBe(1);
      expect(result.categories['Groceries'].monthlyLimit).toBe(600);
    });

    it('should throw error if category does not exist', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEqSingle = vi.fn().mockResolvedValue({
        data: mockMonthlyBudget,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockEqSingle });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as any);

      await expect(
        MonthlyBudgetService.updateCategoryLimit(
          'monthly-budget-1',
          'NonExistentCategory',
          100
        )
      ).rejects.toThrow('Category "NonExistentCategory" not found');
    });
  });

  describe('lockMonthlyBudget', () => {
    it('should lock a monthly budget', async () => {
      const lockedBudget = { ...mockMonthlyBudget, is_locked: true };

      const mockUpdateEqSelect = vi.fn().mockResolvedValue({
        data: [lockedBudget],
        error: null,
      });
      const mockUpdateSelect = vi.fn().mockReturnValue({ eq: mockUpdateEqSelect });
      const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
      const mockUpdateSet = vi.fn().mockReturnValue({ eq: mockUpdateEq });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await MonthlyBudgetService.lockMonthlyBudget(2025, 10);

      expect(result.is_locked).toBe(true);
    });
  });

  describe('compareToPersonalBudget', () => {
    it('should compare monthly budget to personal budget', async () => {
      const adjustedMonthly = {
        ...mockMonthlyBudget,
        categories: {
          'Groceries': { monthlyLimit: 600, warningThreshold: 80, isActive: true },
          'Rent': { monthlyLimit: 1500, warningThreshold: 80, isActive: true },
        },
        adjustment_count: 1,
      };

      // Mock get monthly budget
      const mockSelectMonth = vi.fn().mockReturnThis();
      const mockEqMonth = vi.fn().mockReturnThis();
      const mockMaybeSingleMonth = vi.fn().mockResolvedValue({
        data: adjustedMonthly,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelectMonth,
        eq: mockEqMonth,
        maybeSingle: mockMaybeSingleMonth,
      } as any);

      // Mock get personal budget
      vi.mocked(PersonalBudgetService.getActiveBudget).mockResolvedValue(
        mockPersonalBudget
      );

      const result = await MonthlyBudgetService.compareToPersonalBudget(2025, 10);

      expect(result).toBeDefined();
      expect(result.totalPersonalLimit).toBe(2000); // 500 + 1500
      expect(result.totalMonthlyLimit).toBe(2100); // 600 + 1500
      expect(result.comparisons).toHaveLength(2);
      
      const groceries = result.comparisons.find(c => c.category === 'Groceries');
      expect(groceries?.personalLimit).toBe(500);
      expect(groceries?.monthlyLimit).toBe(600);
      expect(groceries?.difference).toBe(100);
      expect(groceries?.differencePercentage).toBeCloseTo(20, 1); // (600-500)/500 * 100
    });

    it('should throw error if monthly budget not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      } as any);

      await expect(
        MonthlyBudgetService.compareToPersonalBudget(2025, 10)
      ).rejects.toThrow('Monthly budget not found');
    });
  });

  describe('helper methods', () => {
    it('getTotalMonthlyLimit should calculate total limit', () => {
      const total = MonthlyBudgetService.getTotalMonthlyLimit(mockMonthlyBudget);
      
      expect(total).toBe(2000); // 500 + 1500
    });

    it('hasAdjustments should return true when adjustment_count > 0', () => {
      const adjusted = { ...mockMonthlyBudget, adjustment_count: 2 };
      
      expect(MonthlyBudgetService.hasAdjustments(adjusted)).toBe(true);
      expect(MonthlyBudgetService.hasAdjustments(mockMonthlyBudget)).toBe(false);
    });

    it('getMonthName should return correct month name', () => {
      expect(MonthlyBudgetService.getMonthName(1)).toBe('January');
      expect(MonthlyBudgetService.getMonthName(10)).toBe('October');
      expect(MonthlyBudgetService.getMonthName(12)).toBe('December');
    });

    it('formatMonthYear should format correctly', () => {
      expect(MonthlyBudgetService.formatMonthYear(2025, 10)).toBe('October 2025');
      expect(MonthlyBudgetService.formatMonthYear(2024, 1)).toBe('January 2024');
    });
  });
});
