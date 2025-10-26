import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BudgetAdjustmentService } from '../../src/services/budgetAdjustmentService';
import { PersonalBudgetService } from '../../src/services/personalBudgetService';
import { MonthlyBudgetService } from '../../src/services/monthlyBudgetService';
import { supabase } from '../../src/lib/supabase';
import type { BudgetAdjustment, CategoryAdjustmentHistory, MonthlyBudget, PersonalBudget } from '../../src/types/budget';

// Mock dependencies
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/personalBudgetService');
vi.mock('../../src/services/monthlyBudgetService');

// Helper to create a complete mock chain for Supabase queries
const createMockChain = (finalResult: any) => {
  const chain: any = {};
  const resultWithChain = {
    ...finalResult,
    then: (resolve: any) => Promise.resolve(finalResult).then(resolve),
    catch: (reject: any) => Promise.resolve(finalResult).catch(reject),
  };

  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(finalResult);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(finalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
  chain.then = resultWithChain.then;
  chain.catch = resultWithChain.catch;

  return chain;
};

describe('BudgetAdjustmentService', () => {
  const mockUserId = 'test-user-123';

  const mockAdjustment: BudgetAdjustment = {
    id: 'adjustment-1',
    user_id: mockUserId,
    category_name: 'Groceries',
    current_limit: 500,
    adjustment_type: 'increase',
    adjustment_amount: 100,
    new_limit: 600,
    effective_year: 2025,
    effective_month: 11,
    is_applied: false,
    created_at: '2025-10-25T10:00:00Z',
  };

  const mockHistory: CategoryAdjustmentHistory = {
    id: 'history-1',
    user_id: mockUserId,
    category_name: 'Groceries',
    adjustment_count: 3,
    last_adjusted_at: '2025-10-25T10:00:00Z',
    total_increased_amount: 300,
    total_decreased_amount: 50,
    first_adjustment_at: '2025-08-01T10:00:00Z',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2025-10-25T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });
  });

  describe('scheduleAdjustment', () => {
    it('should schedule an adjustment for next month', async () => {
      const now = new Date('2025-10-25');
      vi.setSystemTime(now);

      const mockChain = createMockChain({
        data: mockAdjustment,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await BudgetAdjustmentService.scheduleAdjustment(
        'Groceries',
        500,
        600,
        'Need more for holidays'
      );

      expect(result).toEqual(mockAdjustment);
      expect(result.effective_year).toBe(2025);
      expect(result.effective_month).toBe(11); // Next month
      expect(result.adjustment_type).toBe('increase');
      expect(result.adjustment_amount).toBe(100);

      vi.useRealTimers();
    });

    it('should handle year rollover correctly', async () => {
      const now = new Date('2025-12-25');
      vi.setSystemTime(now);

      const nextYearAdjustment = {
        ...mockAdjustment,
        effective_year: 2026,
        effective_month: 1,
      };

      const mockChain = createMockChain({
        data: nextYearAdjustment,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await BudgetAdjustmentService.scheduleAdjustment(
        'Groceries',
        500,
        600
      );

      expect(result.effective_year).toBe(2026);
      expect(result.effective_month).toBe(1);

      vi.useRealTimers();
    });

    it('should schedule a decrease adjustment', async () => {
      const now = new Date('2025-10-25');
      vi.setSystemTime(now);

      const decreaseAdjustment = {
        ...mockAdjustment,
        adjustment_type: 'decrease' as const,
        current_limit: 500,
        new_limit: 400,
        adjustment_amount: 100,
      };

      const mockChain = createMockChain({
        data: decreaseAdjustment,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await BudgetAdjustmentService.scheduleAdjustment(
        'Groceries',
        500,
        400,
        'Cutting back'
      );

      expect(result.adjustment_type).toBe('decrease');
      expect(result.adjustment_amount).toBe(100);

      vi.useRealTimers();
    });
  });

  describe('getPendingAdjustments', () => {
    it('should get all pending adjustments for a specific month', async () => {
      const mockChain = createMockChain({
        data: [mockAdjustment],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await BudgetAdjustmentService.getPendingAdjustments(2025, 11);

      expect(result).toEqual([mockAdjustment]);
      expect(mockChain.eq).toHaveBeenCalledWith('effective_year', 2025);
      expect(mockChain.eq).toHaveBeenCalledWith('effective_month', 11);
      expect(mockChain.eq).toHaveBeenCalledWith('is_applied', false);
    });
  });

  describe('getNextMonthAdjustments', () => {
    it('should get summary of next months pending adjustments', async () => {
      const now = new Date('2025-10-25');
      vi.setSystemTime(now);

      const adjustments = [
        mockAdjustment,
        {
          ...mockAdjustment,
          id: 'adjustment-2',
          category_name: 'Rent',
          adjustment_type: 'decrease' as const,
          adjustment_amount: 200,
        },
      ];

      const mockChain = createMockChain({
        data: adjustments,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);
      vi.mocked(MonthlyBudgetService.formatMonthYear).mockReturnValue('November 2025');

      const result = await BudgetAdjustmentService.getNextMonthAdjustments();

      expect(result.effectiveDate).toBeTruthy();
      expect(result.adjustmentCount).toBe(2);
      expect(result.totalIncrease).toBeGreaterThan(0);
      expect(result.totalDecrease).toBeGreaterThan(0);
      expect(result.adjustments).toHaveLength(2);

      vi.useRealTimers();
    });
  });

  describe('cancelAdjustment', () => {
    it('should cancel a pending adjustment', async () => {
      const mockChain = createMockChain({ error: null });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      await BudgetAdjustmentService.cancelAdjustment('adjustment-1');

      expect(mockChain.eq).toHaveBeenCalledWith('id', 'adjustment-1');
    });
  });

  describe('applyScheduledAdjustments', () => {
    it('should apply all pending adjustments for a month', async () => {
      const mockPersonalBudget: PersonalBudget = {
        id: 'personal-1',
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
        created_at: '2025-10-01T00:00:00Z',
        updated_at: '2025-10-01T00:00:00Z',
        is_active: true,
      };

      const mockMonthlyBudget: MonthlyBudget = {
        id: 'monthly-1',
        user_id: mockUserId,
        personal_budget_id: 'personal-1',
        year: 2025,
        month: 11,
        categories: mockPersonalBudget.categories,
        global_settings: mockPersonalBudget.global_settings,
        adjustment_count: 0,
        is_locked: false,
        created_at: '2025-11-01T00:00:00Z',
        updated_at: '2025-11-01T00:00:00Z',
      };

      const adjustments = [mockAdjustment];

      // Mock get pending adjustments
      const mockChainAdj = createMockChain({
        data: adjustments,
        error: null,
      });

      // Mock update adjustment (mark as applied)
      const mockChainUpdateAdj = createMockChain({ error: null });

      // Mock category history select (existing history)
      const mockChainHistory = createMockChain({
        data: mockHistory,
        error: null,
      });

      // Mock category history upsert
      const mockChainUpsert = createMockChain({ error: null });

      // Mock get/create monthly budget
      vi.mocked(MonthlyBudgetService.getOrCreateMonthlyBudget).mockResolvedValue(
        mockMonthlyBudget
      );

      // Mock update monthly budget
      vi.mocked(MonthlyBudgetService.updateCategoryLimit).mockResolvedValue({
        ...mockMonthlyBudget,
        categories: {
          ...mockMonthlyBudget.categories,
          'Groceries': { monthlyLimit: 600, warningThreshold: 80, isActive: true },
        },
        adjustment_count: 1,
      });

      // Mock get personal budget
      vi.mocked(PersonalBudgetService.getActiveBudget).mockResolvedValue(
        mockPersonalBudget
      );

      // Mock update personal budget
      const updatedPersonalBudget: PersonalBudget = {
        ...mockPersonalBudget,
        version: 2,
        categories: {
          ...mockPersonalBudget.categories,
          'Groceries': { monthlyLimit: 600, warningThreshold: 80, isActive: true },
        },
      };
      vi.mocked(PersonalBudgetService.updateBudget).mockResolvedValue(
        updatedPersonalBudget
      );

      // Track which call we're on for each table
      const tableCallCounts: Record<string, number> = {};

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (!tableCallCounts[table]) tableCallCounts[table] = 0;
        tableCallCounts[table]++;

        if (table === 'budget_adjustments') {
          // First call: get pending adjustments
          if (tableCallCounts[table] === 1) {
            return mockChainAdj;
          }
          // Later calls: update adjustment (mark as applied)
          return mockChainUpdateAdj;
        }
        
        if (table === 'category_adjustment_history') {
          // First call: select existing history
          if (tableCallCounts[table] === 1) {
            return mockChainHistory;
          }
          // Second call: upsert updated history
          return mockChainUpsert;
        }

        return {} as any;
      });

      const result = await BudgetAdjustmentService.applyScheduledAdjustments(
        2025,
        11
      );

      expect(result.appliedCount).toBe(1);
      expect(result.personalBudget).not.toBeNull();
      if (result.personalBudget) {
        expect(result.personalBudget.version).toBe(2);
      }
      expect(PersonalBudgetService.updateBudget).toHaveBeenCalled();
    });

    it('should return 0 when no adjustments to apply', async () => {
      const mockChain = createMockChain({
        data: [],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await BudgetAdjustmentService.applyScheduledAdjustments(
        2025,
        11
      );

      expect(result.appliedCount).toBe(0);
      expect(result.personalBudget).toBeNull();
    });
  });

  describe('getCategoryHistory', () => {
    it('should get adjustment history for a category', async () => {
      const mockChain = createMockChain({
        data: mockHistory,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await BudgetAdjustmentService.getCategoryHistory('Groceries');

      expect(result).toEqual(mockHistory);
      expect(mockChain.eq).toHaveBeenCalledWith('category_name', 'Groceries');
    });

    it('should return null if no history exists', async () => {
      const mockChain = createMockChain({
        data: null,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await BudgetAdjustmentService.getCategoryHistory('NewCategory');

      expect(result).toBeNull();
    });
  });

  describe('getMostAdjustedCategories', () => {
    it('should return top adjusted categories', async () => {
      const histories = [
        { ...mockHistory, category_name: 'Groceries', adjustment_count: 5 },
        { ...mockHistory, category_name: 'Rent', adjustment_count: 3 },
        { ...mockHistory, category_name: 'Entertainment', adjustment_count: 2 },
      ];

      const mockChain = createMockChain({
        data: histories.slice(0, 2),
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await BudgetAdjustmentService.getMostAdjustedCategories(2);

      expect(result).toHaveLength(2);
      expect(result[0].category_name).toBe('Groceries');
      expect(result[0].adjustment_count).toBe(5);
    });
  });

  describe('helper methods', () => {
    it('calculateNetAdjustment should calculate net change', () => {
      const net = BudgetAdjustmentService.calculateNetAdjustment(mockHistory);
      
      // 300 (increased) - 50 (decreased) = 250
      expect(net).toBe(250);
    });

    it('calculateNetAdjustment should handle negative net', () => {
      const negativeHistory = {
        ...mockHistory,
        total_increased_amount: 100,
        total_decreased_amount: 300,
      };
      
      const net = BudgetAdjustmentService.calculateNetAdjustment(negativeHistory);
      
      expect(net).toBe(-200);
    });

    it('getAverageAdjustment should calculate average', () => {
      const avg = BudgetAdjustmentService.getAverageAdjustment(mockHistory);
      
      // Total: 300 (increased) + 50 (decreased) = 350, Count: 3 => 350/3 ≈ 116.67
      expect(avg).toBeCloseTo(116.67, 2);
    });

    it('getAverageAdjustment should return 0 when count is 0', () => {
      const zeroHistory = { ...mockHistory, adjustment_count: 0 };
      
      const avg = BudgetAdjustmentService.getAverageAdjustment(zeroHistory);
      
      expect(avg).toBe(0);
    });

    it('hasPendingNextMonthAdjustments should check for pending adjustments', async () => {
      const now = new Date('2025-10-25');
      vi.setSystemTime(now);

      const adjustments = [mockAdjustment, { ...mockAdjustment, id: 'adjustment-2' }];

      const mockChain = createMockChain({
        data: adjustments,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain);

      const result = await BudgetAdjustmentService.hasPendingNextMonthAdjustments();

      expect(result).toBe(true);

      vi.useRealTimers();
    });
  });
});
