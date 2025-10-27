# BudgetQuickView Cache Invalidation Fix

**Date:** 2025-01-27  
**Issue:** BudgetQuickView not updating when personal budget categories changed  
**Root Cause:** React Query cache not being invalidated properly

---

## Problem

When updating a personal budget's category `isActive` status in PersonalBudgetEditor:
1. The personal budget updates correctly in the database
2. PersonalBudgetEditor re-renders with the new data
3. **BUT** BudgetQuickView still shows the old total

This happens because:
- BudgetQuickView uses `useCurrentMonthBudget()` which reads from the monthly budget
- Monthly budget is derived from the personal budget
- When personal budget changes, only `personalBudget` query cache was invalidated
- `monthlyBudget` query cache was NOT invalidated, so it kept showing stale data

---

## Solution

Updated 4 mutation hooks in `src/hooks/useBudgets.ts` to invalidate both `personalBudget` AND `monthlyBudget` caches:

### 1. `useCreatePersonalBudget` (Line 52-62)
```typescript
// BEFORE
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
},

// AFTER
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
  // Invalidate monthly budgets since new personal budget created
  queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
},
```

### 2. `useUpdatePersonalBudget` (Line 66-78)
```typescript
// BEFORE
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
},

// AFTER
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
  // Invalidate monthly budgets since categories might have changed
  queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
},
```

### 3. `useSetActiveBudget` (Line 82-94)
```typescript
// BEFORE
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
},

// AFTER
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
  // Invalidate monthly budgets since active budget changed
  queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
},
```

### 4. `useDeletePersonalBudget` (Line 98-110)
```typescript
// BEFORE
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
},

// AFTER
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
  // Invalidate monthly budgets since personal budget deleted
  queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
},
```

---

## How It Works Now

### Data Flow:
```
1. User toggles category.isActive in PersonalBudgetEditor
   ↓
2. useUpdatePersonalBudget() mutation called
   ↓
3. Database updated with new isActive value
   ↓
4. onSuccess() callback fires:
   - Invalidates personalBudget cache ✅
   - Invalidates monthlyBudget cache ✅ (NEW!)
   ↓
5. Both queries refetch from database:
   - useActiveBudget() refetches → PersonalBudgetEditor updates
   - useCurrentMonthBudget() refetches → BudgetQuickView updates
   ↓
6. All components show consistent data! 🎉
```

### Cache Invalidation Chain:
```
Personal Budget Mutations
    ↓
Invalidate Both Caches
    ↓
┌──────────────────┬──────────────────┐
│ personalBudget   │ monthlyBudget    │
│ cache cleared    │ cache cleared    │
└────────┬─────────┴────────┬─────────┘
         ↓                   ↓
   PersonalBudgetEditor  BudgetQuickView
   (refetches data)      (refetches data)
         ↓                   ↓
   Shows new total       Shows new total
```

---

## Components Affected

### ✅ Now Updates Correctly:
1. **BudgetQuickView** - Dashboard widget showing monthly budget total
2. **MonthlyBudgetView** - Full monthly budget page
3. **BudgetViewSwitcher** - Budget management tabs
4. **Any component using `useCurrentMonthBudget()`**

### Already Working:
1. **PersonalBudgetEditor** - Uses `useActiveBudget()` which always invalidated correctly
2. **PersonalBudgetDisplay** - Same as above

---

## Testing Checklist

- [x] Toggle category isActive in PersonalBudgetEditor
- [x] BudgetQuickView total updates immediately
- [x] MonthlyBudgetView total updates immediately
- [x] Create new personal budget → monthly budget refreshes
- [x] Set budget as active → monthly budget refreshes
- [x] Delete personal budget → monthly budget refreshes
- [x] All totals filter by isActive correctly

---

## Related Files Modified

1. **src/hooks/useBudgets.ts**
   - Lines 52-110: Added monthlyBudget invalidation to 4 mutations
   - Impact: All personal budget changes now refresh monthly budget cache

---

## Technical Notes

### React Query Cache Keys:
```typescript
['personalBudget']           // Personal budget queries
['personalBudget', 'active'] // Active personal budget
['monthlyBudget']            // All monthly budget queries
['monthlyBudget', 'current'] // Current month's budget
['monthlyBudget', year, month] // Specific month's budget
```

### Stale Time:
- Personal budgets: 5 minutes
- Monthly budgets: 2 minutes
- Both will refetch automatically after stale time expires
- Manual invalidation forces immediate refetch

### Why Both Invalidations Needed:
Monthly budgets are **derived** from personal budgets but stored separately in the database. When the personal budget template changes, existing monthly budgets don't automatically update in the database, but the React Query cache needs to refetch to get the latest computed values.

---

## Performance Impact

**Minimal** - Only affects cache invalidation on mutations (user actions):
- Creating a budget: ~1 extra query
- Updating a budget: ~1 extra query
- Deleting a budget: ~1 extra query
- Setting active budget: ~1 extra query

These are infrequent user actions, so the performance impact is negligible while ensuring data consistency across all views.

---

## Conclusion

✅ **Problem:** BudgetQuickView showed stale totals after category changes  
✅ **Solution:** Invalidate monthly budget cache when personal budget changes  
✅ **Result:** All components now show consistent, up-to-date totals immediately

This fix ensures that any change to the personal budget (categories, limits, active status) immediately reflects in all UI components that display monthly budget data.
