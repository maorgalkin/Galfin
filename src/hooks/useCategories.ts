// React Query hook for categories
// Part of Category Management Restructure (Phase 4)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as categoryService from '../services/categoryService';
import type { 
  CategoryCreateInput, 
  CategoryUpdateInput,
  CategoryMergeResult 
} from '../types/category';

// Query keys
export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
  mergeHistory: () => [...categoryKeys.all, 'mergeHistory'] as const,
};

/**
 * Hook to fetch all active categories
 * @param includeDeleted - Include soft-deleted categories
 * @param type - Filter by category type ('expense' or 'income')
 */
export function useCategories(includeDeleted = false, type?: 'expense' | 'income') {
  return useQuery({
    queryKey: [...categoryKeys.list(), { includeDeleted, type }],
    queryFn: () => categoryService.getCategories(includeDeleted, type),
  });
}

/**
 * Hook to fetch a single category by ID
 */
export function useCategory(categoryId: string | null) {
  return useQuery({
    queryKey: categoryKeys.detail(categoryId || ''),
    queryFn: () => categoryService.getCategoryById(categoryId!),
    enabled: !!categoryId,
  });
}

/**
 * Hook to fetch merge history
 */
export function useMergeHistory() {
  return useQuery({
    queryKey: categoryKeys.mergeHistory(),
    queryFn: () => categoryService.getMergeHistory(),
  });
}

/**
 * Hook to create a new category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CategoryCreateInput) => categoryService.createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() });
    },
  });
}

/**
 * Hook to update a category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: CategoryUpdateInput }) => 
      categoryService.updateCategory(categoryId, input),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() });
      queryClient.setQueryData(categoryKeys.detail(updatedCategory.id), updatedCategory);
    },
  });
}

/**
 * Hook to rename a category
 */
export function useRenameCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ categoryId, newName }: { categoryId: string; newName: string }) => 
      categoryService.renameCategory(categoryId, newName),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() });
      queryClient.setQueryData(categoryKeys.detail(updatedCategory.id), updatedCategory);
    },
  });
}

/**
 * Hook to delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (categoryId: string) => categoryService.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() });
    },
  });
}

/**
 * Hook to restore a deleted category
 */
export function useRestoreCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (categoryId: string) => categoryService.restoreCategory(categoryId),
    onSuccess: (restoredCategory) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() });
      queryClient.setQueryData(categoryKeys.detail(restoredCategory.id), restoredCategory);
    },
  });
}

/**
 * Hook to merge categories
 */
export function useMergeCategories() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      sourceCategoryId, 
      targetCategoryId, 
      reason 
    }: { 
      sourceCategoryId: string; 
      targetCategoryId: string; 
      reason?: string;
    }): Promise<CategoryMergeResult> => 
      categoryService.mergeCategories(sourceCategoryId, targetCategoryId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.mergeHistory() });
      // Also invalidate transactions since category_ids changed
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

/**
 * Hook to undo a category merge
 */
export function useUndoCategoryMerge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (mergeId: string) => categoryService.undoCategoryMerge(mergeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.mergeHistory() });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

/**
 * Hook to update category sort order
 */
export function useUpdateCategorySortOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (categoryIds: string[]) => categoryService.updateCategorySortOrder(categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() });
    },
  });
}

/**
 * Utility: Count transactions for a category
 * This is used to show "X transactions" in the UI
 */
export function useCategoryTransactionCount(categoryId: string | null) {
  return useQuery({
    queryKey: ['transactions', 'count', categoryId],
    queryFn: async () => {
      if (!categoryId) return 0;
      const { supabase } = await import('../lib/supabase');
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!categoryId,
  });
}
