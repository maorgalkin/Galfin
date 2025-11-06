import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PersonalBudgetService } from '../services/personalBudgetService';
import { MonthlyBudgetService } from '../services/monthlyBudgetService';
import { BudgetAdjustmentService } from '../services/budgetAdjustmentService';
import type { PersonalBudget } from '../types/budget';

/**
 * Hook to get the active personal budget
 */
export function useActiveBudget() {
  return useQuery({
    queryKey: ['personalBudget', 'active'],
    queryFn: () => PersonalBudgetService.getActiveBudget(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get personal budget history
 */
export function usePersonalBudgetHistory() {
  return useQuery({
    queryKey: ['personalBudget', 'history'],
    queryFn: () => PersonalBudgetService.getBudgetHistory(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get a specific personal budget by ID
 */
export function usePersonalBudgetById(budgetId?: string) {
  return useQuery({
    queryKey: ['personalBudget', budgetId],
    queryFn: () => budgetId ? PersonalBudgetService.getBudgetById(budgetId) : null,
    enabled: !!budgetId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new personal budget
 */
export function useCreatePersonalBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (budget: Omit<PersonalBudget, 'id' | 'user_id' | 'version' | 'created_at' | 'updated_at' | 'is_active'>) =>
      PersonalBudgetService.createBudget(budget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
      // Invalidate monthly budgets since new personal budget created
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
    },
  });
}

/**
 * Hook to update a personal budget (creates new version)
 */
export function useUpdatePersonalBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ budgetId, updates }: { 
      budgetId: string; 
      updates: Partial<PersonalBudget>;
    }) => PersonalBudgetService.updateBudget(budgetId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
      // Invalidate monthly budgets since categories might have changed
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
    },
  });
}

/**
 * Hook to set a budget as active
 */
export function useSetActiveBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (budgetId: string) => PersonalBudgetService.setActiveBudget(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
      // Invalidate monthly budgets since active budget changed
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
    },
  });
}

/**
 * Hook to delete a personal budget
 */
export function useDeletePersonalBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (budgetId: string) => PersonalBudgetService.deleteBudget(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
      // Invalidate monthly budgets since personal budget deleted
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
    },
  });
}

/**
 * Hook to get current month's budget
 */
export function useCurrentMonthBudget() {
  return useQuery({
    queryKey: ['monthlyBudget', 'current'],
    queryFn: () => MonthlyBudgetService.getCurrentMonthBudget(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get a specific monthly budget
 */
export function useMonthlyBudget(year?: number, month?: number) {
  return useQuery({
    queryKey: ['monthlyBudget', year, month],
    queryFn: () => year && month ? MonthlyBudgetService.getOrCreateMonthlyBudget(year, month) : null,
    enabled: !!year && !!month,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get all monthly budgets for a year
 */
export function useYearBudgets(year: number) {
  return useQuery({
    queryKey: ['monthlyBudget', 'year', year],
    queryFn: () => MonthlyBudgetService.getYearBudgets(year),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get all monthly budgets (recent history)
 */
export function useAllMonthlyBudgets(limit: number = 12) {
  return useQuery({
    queryKey: ['monthlyBudget', 'all', limit],
    queryFn: () => MonthlyBudgetService.getAllMonthlyBudgets(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get monthly budgets for a date range
 */
export function useMonthlyBudgetsForDateRange(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['monthlyBudget', 'dateRange', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: () => startDate && endDate ? MonthlyBudgetService.getMonthlyBudgetsForDateRange(startDate, endDate) : [],
    enabled: !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to update a category limit in a monthly budget
 */
export function useUpdateCategoryLimit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      monthlyBudgetId, 
      categoryName, 
      newLimit, 
      notes 
    }: {
      monthlyBudgetId: string;
      categoryName: string;
      newLimit: number;
      notes?: string;
    }) => MonthlyBudgetService.updateCategoryLimit(monthlyBudgetId, categoryName, newLimit, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
    },
  });
}

/**
 * Hook to lock a monthly budget
 */
export function useLockMonthlyBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      MonthlyBudgetService.lockMonthlyBudget(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
    },
  });
}

/**
 * Hook to unlock a monthly budget
 */
export function useUnlockMonthlyBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      MonthlyBudgetService.unlockMonthlyBudget(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
    },
  });
}

/**
 * Hook to compare monthly budget to personal budget
 */
export function useBudgetComparison(year?: number, month?: number) {
  return useQuery({
    queryKey: ['budgetComparison', year, month],
    queryFn: () => year && month ? MonthlyBudgetService.compareToPersonalBudget(year, month) : null,
    enabled: !!year && !!month,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get pending adjustments for a specific month
 */
export function usePendingAdjustments(year?: number, month?: number) {
  return useQuery({
    queryKey: ['budgetAdjustments', 'pending', year, month],
    queryFn: () => year && month ? BudgetAdjustmentService.getPendingAdjustments(year, month) : [],
    enabled: !!year && !!month,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get next month's pending adjustments summary
 */
export function useNextMonthAdjustments() {
  return useQuery({
    queryKey: ['budgetAdjustments', 'nextMonth'],
    queryFn: () => BudgetAdjustmentService.getNextMonthAdjustments(),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook to check if there are pending adjustments for next month
 */
export function useHasPendingNextMonthAdjustments() {
  return useQuery({
    queryKey: ['budgetAdjustments', 'hasPendingNextMonth'],
    queryFn: () => BudgetAdjustmentService.hasPendingNextMonthAdjustments(),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook to schedule a budget adjustment
 */
export function useScheduleAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      categoryName, 
      currentLimit, 
      newLimit, 
      reason 
    }: {
      categoryName: string;
      currentLimit: number;
      newLimit: number;
      reason?: string;
    }) => BudgetAdjustmentService.scheduleAdjustment(categoryName, currentLimit, newLimit, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetAdjustments'] });
    },
  });
}

/**
 * Hook to cancel a pending adjustment
 */
export function useCancelAdjustment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (adjustmentId: string) => BudgetAdjustmentService.cancelAdjustment(adjustmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetAdjustments'] });
    },
  });
}

/**
 * Hook to apply scheduled adjustments for a month
 */
export function useApplyScheduledAdjustments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      BudgetAdjustmentService.applyScheduledAdjustments(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetAdjustments'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
      queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
    },
  });
}

/**
 * Hook to get category adjustment history
 */
export function useCategoryHistory(categoryName?: string) {
  return useQuery({
    queryKey: ['categoryHistory', categoryName],
    queryFn: () => categoryName ? BudgetAdjustmentService.getCategoryHistory(categoryName) : null,
    enabled: !!categoryName,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get most adjusted categories
 */
export function useMostAdjustedCategories(limit: number = 5) {
  return useQuery({
    queryKey: ['categoryHistory', 'mostAdjusted', limit],
    queryFn: () => BudgetAdjustmentService.getMostAdjustedCategories(limit),
    staleTime: 5 * 60 * 1000,
  });
}
