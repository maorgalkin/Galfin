# Monthly Budget History - Quick Start Guide

## Overview

The monthly budget history feature tracks both the **starting point** (month creation) and **current state** (with in-month adjustments) for each monthly budget.

## How It Works

### Two Budget States

Each monthly budget now maintains two snapshots:

1. **`original_categories`** - Budget at month creation (starting point)
   - Set when the month is created
   - **Never modified** during the month
   - Reflects any pre-month adjustments if budget was created early

2. **`categories`** - Current budget state (end point)
   - Starts as a copy of personal budget
   - **Can be adjusted** during the month
   - Shows the active, working budget

### Key Scenarios

#### Scenario 1: Budget Created Before Month Starts
```
January 25: Create February budget from personal budget
  → original_categories = personal budget (baseline for February)
  → categories = personal budget (same initially)

February 5: Adjust "Groceries" from $500 to $600
  → original_categories = still shows $500 (unchanged)
  → categories = now shows $600 (current state)
```

**Result:** "This Month's Changes" shows Groceries increased by $100 from month-start baseline.

#### Scenario 2: Budget Created After Month Starts
```
March 1: Month starts, no budget exists yet

March 3: Create March budget from personal budget
  → original_categories = personal budget (March baseline)
  → categories = personal budget (same initially)

March 10: Adjust "Dining Out" from $300 to $250
  → original_categories = still shows $300
  → categories = now shows $250
```

**Result:** "This Month's Changes" shows Dining Out decreased by $50 from month-start.

#### Scenario 3: No Changes Made
```
April 1: Create April budget from personal budget
  → original_categories = personal budget
  → categories = personal budget
  → adjustment_count = 0

April 15: No adjustments made
  → original_categories = still same
  → categories = still same
  → adjustment_count = still 0
```

**Result:** UI shows "No changes made to budget this month" instead of comparison card.

## User Interface

### Budget Management → Adjustments Tab

#### "This Month's Changes" Section

**When adjustment_count = 0:**
```
┌─────────────────────────────────────────┐
│  No changes made to budget this month   │
│  Budget matches the month-start config  │
└─────────────────────────────────────────┘
```

**When adjustment_count > 0:**
```
┌─────────────────────────────────────────┐
│  November 2025 compared to Month Start  │
│  2 adjusted · 1 added · 8 active        │
├─────────────────────────────────────────┤
│  Month Start    Current      Net Change │
│  $3,500        $3,650       +$150       │
├─────────────────────────────────────────┤
│  📈 Groceries                           │
│  $500 → $600          +$100 (+20%)     │
│                                         │
│  📉 Dining Out                          │
│  $300 → $250          -$50 (-16.7%)    │
└─────────────────────────────────────────┘
```

### Comparison Options

**Compare to Month Start (original_categories):**
- Shows in-month adjustments
- Used in "This Month's Changes"
- Answers: "What did I change since the month started?"

**Compare to My Budget (personal budget):**
- Shows deviation from baseline configuration
- Used in analytics and history
- Answers: "How does this month differ from my standard budget?"

## Implementation Details

### Database Schema

```sql
CREATE TABLE monthly_budgets (
  -- ... other fields ...
  categories JSONB NOT NULL,           -- Current state
  original_categories JSONB NOT NULL,  -- Month-start snapshot
  adjustment_count INT DEFAULT 0,      -- Number of adjustments
  -- ... other fields ...
);
```

### Service Methods

**Creating a Monthly Budget:**
```typescript
MonthlyBudgetService.createMonthlyBudget(year, month)
// Sets both original_categories and categories to personal budget
```

**Editing Monthly Budget:**
```typescript
MonthlyBudgetService.updateCategoryLimit(budgetId, categoryName, newLimit)
// Only modifies categories, NOT original_categories (permanent for this month)
// Increments adjustment_count
```

**Comparing:**
```typescript
// Compare to month-start baseline
MonthlyBudgetService.compareToOriginal(year, month)

// Compare to personal budget
MonthlyBudgetService.compareToPersonalBudget(year, month)
```

### React Hooks

```typescript
// In-month changes
const { data } = useBudgetComparisonToOriginal(2025, 11);

// Deviation from baseline
const { data } = useBudgetComparison(2025, 11);
```

## Migration Guide

### For Existing Users

Run migration 012 in Supabase SQL Editor:

```sql
-- Migration will:
-- 1. Add original_categories column
-- 2. Backfill with current categories
-- 3. Make it NOT NULL
```

**Impact on Existing Budgets:**
- Existing monthly budgets will have `original_categories` = `categories`
- Since we can't know the historical "original" state, we use current as baseline
- Future budgets will have proper tracking

### For New Users

- Automatic - migration is part of database setup
- All monthly budgets will track original vs current from day one

## Best Practices

### 1. Create Monthly Budgets Early
Create next month's budget a few days before month-end to:
- Lock in your planned budget as the baseline
- Make pre-month adjustments that become the "original"
- Avoid day-1 adjustments that don't show in "This Month's Changes"

### 2. Review "This Month's Changes" Regularly
- Check weekly to see in-month deviations
- Helps identify patterns and reactive adjustments
- Informs future budget planning

### 3. Use Both Comparisons
- **Month Start:** For in-month tracking and discipline
- **My Budget:** For overall trends and standard deviations

## Troubleshooting

### "This Month's Changes" shows empty comparison
**Cause:** `adjustment_count = 0` (no changes made)
**Solution:** This is correct! It means you stuck to your month-start budget.

### Changes I made aren't showing
**Check:**
1. Are you looking at the right month/year?
2. Did you save the adjustment (check `adjustment_count > 0`)?
3. Are you comparing to the right baseline (original vs personal)?

### Original categories seem wrong
**For old budgets:** Backfilled with current state (historical data unavailable)
**For new budgets:** Should match personal budget at creation

## Future Enhancements

Potential additions:
- Full version history (all changes, not just original + current)
- Change log with timestamps and reasons
- Rollback to original functionality
- Monthly budget templates
- Pre-month adjustment workflows

## Related Documentation

- `/docs/COMPLETE_FEATURE_SUMMARY.md` - Full feature list
- `/docs/MONTHLY_BUDGET_HISTORY_ANALYSIS.md` - Implementation analysis
- `/docs/SUPABASE_BRINGUP.md` - Database setup
