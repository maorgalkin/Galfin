# Monthly Budget History Requirements - Analysis & Implementation Plan

## Current State Analysis

### Requirement 1: Original vs Modified Budget Tracking
**Status: ❌ NOT IMPLEMENTED**

**Current Behavior:**
- When a monthly budget is created, it's copied from the personal budget with `adjustment_count: 0`
- When a category is updated via `updateCategoryLimit()`, the existing row is **modified in place**
- The original budget values are **lost** - there's no history tracking

**What's Missing:**
- No snapshot of the "Original" budget (as it was at month start)
- No way to distinguish between "month started this way" vs "changed during month"

### Requirement 2: Adjusted/Modified Indicator
**Status: ⚠️ PARTIALLY IMPLEMENTED**

**Current Behavior:**
- `adjustment_count` field tracks number of times budget was modified
- `adjustment_count === 0` could indicate "Original" state
- But: if count > 0, we don't know WHAT the original values were

**What Works:**
- Can tell IF a budget was adjusted
- BudgetComparisonCard shows changes from Personal Budget

**What's Missing:**
- Can't show "Original" (month-start) values vs "Current" (adjusted) values
- "This Month's Changes" currently compares to Personal Budget, not to Original Monthly Budget

### Requirement 3: Original Month = No Adjustments Display
**Status: ❌ NOT IMPLEMENTED**

**Current Behavior:**
- BudgetComparisonCard always shows comparison to Personal Budget
- Even if `adjustment_count === 0`, it still shows comparisons
- Shows categories as "added" or "removed" based on personal budget differences

**What's Needed:**
- If `adjustment_count === 0`, show "No changes this month" message
- Or: don't show the comparison card at all for unadjusted months

### Requirement 4: Category Added/Deactivated Shows in Changes
**Status: ✅ IMPLEMENTED**

**Current Behavior:**
- BudgetComparisonCard detects and displays:
  - `added` status - category in monthly but not in personal
  - `removed` status - category in personal but deactivated in monthly
  - Shows "New this month" and "Deactivated" labels

**Status Icons:**
- ✅ Added categories: blue TrendingUp icon
- ✅ Removed categories: orange MinusCircle icon
- ✅ Proper visual distinction

### Requirement 5: Keep Original + Latest for Each Month
**Status: ❌ NOT IMPLEMENTED**

**Current Database Design:**
```sql
monthly_budgets (
  id, user_id, household_id,
  year, month,
  categories JSONB,        -- ❌ Only stores CURRENT state
  adjustment_count INT,    -- ✅ Counts modifications
  created_at, updated_at   -- ⚠️ updated_at changes on edit
)
```

**What's Missing:**
- No "original_categories" field to preserve month-start state
- No history table to track all versions
- No way to retrieve "what was the budget when the month started"

---

## Implementation Plan

### Option A: Add Original Snapshot Field (RECOMMENDED)
**Minimal changes, preserves existing behavior**

#### Database Changes
```sql
-- Add column to store original monthly budget state
ALTER TABLE monthly_budgets 
ADD COLUMN original_categories JSONB;

-- Backfill existing budgets (copy current to original)
UPDATE monthly_budgets 
SET original_categories = categories 
WHERE original_categories IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE monthly_budgets 
ALTER COLUMN original_categories SET NOT NULL;
```

#### Service Changes

**1. Update `createMonthlyBudget()` - Set original on creation:**
```typescript
const newMonthlyBudget = {
  // ... existing fields
  categories: personalBudget.categories,
  original_categories: personalBudget.categories, // ✅ NEW
  adjustment_count: 0,
  // ...
};
```

**2. Keep `updateCategoryLimit()` unchanged - only modifies `categories`:**
```typescript
// Already correct - modifies categories but NOT original_categories
.update({
  categories: updatedCategories,
  adjustment_count: currentBudget.adjustment_count + 1,
})
```

**3. Add new comparison method:**
```typescript
/**
 * Compare current monthly budget to its ORIGINAL state
 * (what it was at the start of the month)
 */
static async compareToOriginal(
  year: number,
  month: number
): Promise<BudgetComparisonSummary> {
  const monthlyBudget = await this.getMonthlyBudget(year, month);
  if (!monthlyBudget) throw new Error('Monthly budget not found');

  // Compare current categories to original_categories
  const comparisons: BudgetComparison[] = [];
  
  // Categories in original
  Object.keys(monthlyBudget.original_categories).forEach(categoryName => {
    const originalConfig = monthlyBudget.original_categories[categoryName];
    const currentConfig = monthlyBudget.categories[categoryName];

    if (!currentConfig) {
      // Category was removed/deactivated during month
      comparisons.push({
        category: categoryName,
        personalLimit: originalConfig.monthlyLimit,
        monthlyLimit: 0,
        difference: -originalConfig.monthlyLimit,
        differencePercentage: -100,
        status: 'removed'
      });
    } else if (currentConfig.monthlyLimit !== originalConfig.monthlyLimit) {
      // Category limit was adjusted
      const diff = currentConfig.monthlyLimit - originalConfig.monthlyLimit;
      comparisons.push({
        category: categoryName,
        personalLimit: originalConfig.monthlyLimit,
        monthlyLimit: currentConfig.monthlyLimit,
        difference: diff,
        differencePercentage: (diff / originalConfig.monthlyLimit) * 100,
        status: diff > 0 ? 'increased' : 'decreased'
      });
    } else {
      // Unchanged
      comparisons.push({
        category: categoryName,
        personalLimit: originalConfig.monthlyLimit,
        monthlyLimit: currentConfig.monthlyLimit,
        difference: 0,
        differencePercentage: 0,
        status: 'unchanged'
      });
    }
  });

  // Categories added during month
  Object.keys(monthlyBudget.categories).forEach(categoryName => {
    if (!monthlyBudget.original_categories[categoryName]) {
      comparisons.push({
        category: categoryName,
        personalLimit: null,
        monthlyLimit: monthlyBudget.categories[categoryName].monthlyLimit,
        difference: monthlyBudget.categories[categoryName].monthlyLimit,
        differencePercentage: 100,
        status: 'added'
      });
    }
  });

  // Calculate totals
  const totalOriginal = Object.values(monthlyBudget.original_categories)
    .reduce((sum, c) => sum + c.monthlyLimit, 0);
  const totalCurrent = Object.values(monthlyBudget.categories)
    .filter(c => c.isActive)
    .reduce((sum, c) => sum + c.monthlyLimit, 0);

  return {
    monthlyBudgetDate: `${this.getMonthName(month)} ${year}`,
    totalPersonalLimit: totalOriginal,
    totalMonthlyLimit: totalCurrent,
    totalDifference: totalCurrent - totalOriginal,
    activeCategories: Object.values(monthlyBudget.categories).filter(c => c.isActive).length,
    adjustedCategories: comparisons.filter(c => c.status === 'increased' || c.status === 'decreased').length,
    addedCategories: comparisons.filter(c => c.status === 'added').length,
    currency: monthlyBudget.global_settings.currency,
    comparisons
  };
}
```

#### UI Changes

**1. Update BudgetComparisonCard to accept comparison type:**
```tsx
interface BudgetComparisonCardProps {
  year: number;
  month: number;
  compareToOriginal?: boolean; // ✅ NEW: compare to month-start vs personal
  className?: string;
}
```

**2. Update BudgetManagement to show correct comparison:**
```tsx
{activeTab === 'adjustments' && (
  <div className="space-y-6">
    {/* Current Month's Changes - compare to ORIGINAL */}
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        This Month's Changes
      </h2>
      {monthlyBudget?.adjustment_count === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-500">
          No changes made to budget this month
        </div>
      ) : (
        <BudgetComparisonCard 
          year={currentYear} 
          month={currentMonth}
          compareToOriginal={true}  // ✅ Compare to month-start
        />
      )}
    </div>
    
    {/* ... rest of component */}
  </div>
)}
```

**3. Add hook for original comparison:**
```typescript
export function useBudgetComparisonToOriginal(year: number, month: number) {
  return useQuery({
    queryKey: ['budgetComparison', 'original', year, month],
    queryFn: () => MonthlyBudgetService.compareToOriginal(year, month),
    staleTime: 30 * 1000,
  });
}
```

#### Migration File

**File:** `supabase/migrations/012_add_original_budget_tracking.sql`

```sql
-- Migration 012: Add Original Budget Tracking to Monthly Budgets
-- Preserves month-start budget state for comparison with adjusted values

-- Add column to store original monthly budget state
ALTER TABLE monthly_budgets 
ADD COLUMN original_categories JSONB;

-- Backfill existing budgets (copy current to original)
-- For existing budgets, we assume current state is original
UPDATE monthly_budgets 
SET original_categories = categories 
WHERE original_categories IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE monthly_budgets 
ALTER COLUMN original_categories SET NOT NULL;

-- Add comment
COMMENT ON COLUMN monthly_budgets.original_categories IS 
'Snapshot of budget categories at month creation - never modified, used for tracking changes';

-- Verify
DO $$
DECLARE
  total_budgets INT;
  budgets_with_original INT;
BEGIN
  SELECT COUNT(*) INTO total_budgets FROM monthly_budgets;
  SELECT COUNT(*) INTO budgets_with_original 
  FROM monthly_budgets 
  WHERE original_categories IS NOT NULL;
  
  RAISE NOTICE 'Migration 012 complete:';
  RAISE NOTICE '  Total monthly budgets: %', total_budgets;
  RAISE NOTICE '  Budgets with original_categories: %', budgets_with_original;
  
  IF total_budgets != budgets_with_original THEN
    RAISE WARNING 'Some budgets missing original_categories!';
  ELSE
    RAISE NOTICE '  ✅ All budgets have original state preserved';
  END IF;
END $$;
```

---

### Option B: Create Separate History Table
**More complex, better for audit trails**

#### Database Changes
```sql
CREATE TABLE monthly_budget_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_budget_id UUID REFERENCES monthly_budgets(id) ON DELETE CASCADE NOT NULL,
  version INT NOT NULL,
  categories JSONB NOT NULL,
  global_settings JSONB NOT NULL,
  changed_by_user_id UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(monthly_budget_id, version)
);

-- Index for fast lookups
CREATE INDEX idx_monthly_budget_history_budget_id 
ON monthly_budget_history(monthly_budget_id);
```

**Pros:**
- Complete audit trail of all changes
- Can see every version, not just original + current
- Easier to add "undo" functionality later

**Cons:**
- More complex queries
- More storage space
- Need to maintain version numbers
- Requires trigger or explicit history creation

---

## Recommendation

**Use Option A: Add Original Snapshot Field**

**Reasons:**
1. ✅ Minimal code changes
2. ✅ No breaking changes to existing queries
3. ✅ Solves all 5 requirements
4. ✅ Simple to understand and maintain
5. ✅ Fast queries (no JOINs needed)
6. ✅ Easy migration and backfill

**When to consider Option B:**
- Need complete audit trail of ALL changes (not just original + current)
- Regulatory compliance requires version history
- Want "undo" or "rollback" functionality
- Need to track WHO made each change and WHEN

---

## Summary Checklist

After implementing Option A:

- [✅] Requirement 1: Original vs Modified tracking
  - `original_categories` stores month-start state
  - `categories` stores current state (may be modified)

- [✅] Requirement 2: Adjusted/Modified indicator
  - `adjustment_count > 0` means modified
  - Can compare `categories` vs `original_categories`

- [✅] Requirement 3: Original month shows no adjustments
  - Check `adjustment_count === 0`
  - Show "No changes" message instead of comparison

- [✅] Requirement 4: Added/deactivated categories shown
  - Already works in BudgetComparisonCard
  - Will work with original comparison too

- [✅] Requirement 5: Keep original + latest
  - `original_categories` = month-start snapshot (never changes)
  - `categories` = current/latest state (updated via adjustments)
  - Both stored in same row for easy access

---

## Files to Modify

### Database
- [ ] `supabase/migrations/012_add_original_budget_tracking.sql` (NEW)

### Types
- [ ] `src/types/budget.ts` - Add `original_categories` to `MonthlyBudget` interface

### Services
- [ ] `src/services/monthlyBudgetService.ts`
  - Update `createMonthlyBudget()` to set `original_categories`
  - Add `compareToOriginal()` method
  - Ensure `updateCategoryLimit()` doesn't touch `original_categories`

### Hooks
- [ ] `src/hooks/useBudgets.ts` - Add `useBudgetComparisonToOriginal()` hook

### Components
- [ ] `src/components/BudgetComparisonCard.tsx` - Add `compareToOriginal` prop
- [ ] `src/pages/BudgetManagement.tsx` - Use original comparison for "This Month's Changes"

### Documentation
- [ ] Update `docs/COMPLETE_FEATURE_SUMMARY.md` with history tracking details
