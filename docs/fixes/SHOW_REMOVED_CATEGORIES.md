# Show Deactivated Categories in Budget Comparison

**Date:** 2025-10-28  
**Feature:** Display removed/deactivated categories in budget comparison  
**User Request:** Show deactivated categories with negative amount indication

## Feature Description

When a category is deactivated in My Budget after a month has started, it now appears in the Budget Comparison view with:
- **Status:** "removed"
- **Display:** Shows the budget amount being removed (negative value)
- **Visual:** Distinctive styling with strikethrough, dimmed appearance, and orange badge
- **Impact:** Clearly shows budget reduction from deactivation

## Changes Made

### Service Layer (`src/services/monthlyBudgetService.ts`)

#### Before
```typescript
else if (personalConfig && !monthlyConfig?.isActive) {
  // Category exists in personal but deactivated in monthly budget
  status = 'removed';
  removedCount++;
  continue; // Don't add to comparisons, skip deactivated categories
}
```

**Problem:** Deactivated categories were completely hidden from comparison

#### After
```typescript
else if (personalConfig && !monthlyConfig?.isActive) {
  // Category exists in personal but deactivated in monthly budget
  status = 'removed';
  removedCount++;
  isActive = false;
  // Show as removed from monthly budget
  personalLimit = personalConfig.monthlyLimit;
  monthlyLimit = 0; // It's deactivated, so monthly limit is effectively 0
  difference = -personalLimit; // Negative to show reduction
  differencePercentage = -100; // 100% reduction
}
```

**Improvements:**
- Sets `monthlyLimit` to 0 (category is deactivated)
- Calculates `difference` as negative value (shows budget reduction)
- Sets `differencePercentage` to -100% (complete removal)
- Includes category in comparisons array

### UI Component (`src/components/BudgetComparisonCard.tsx`)

#### 1. Icon Update
```typescript
case 'removed':
  return <MinusCircle className="h-4 w-4 text-orange-500" />;
```
- Changed from gray TrendingDown to orange MinusCircle
- Distinctive visual indicator for deactivation

#### 2. Color Scheme
```typescript
case 'removed':
  return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
```
- Orange theme for removed categories (distinct from red/green/blue)
- Stands out from other status types

#### 3. Category Row Styling
```typescript
<div className={`... ${
  item.status === 'removed' 
    ? 'bg-gray-50 dark:bg-gray-800 opacity-75' 
    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
}`}>
```
- Dimmed background for removed categories
- Reduced opacity to indicate inactive state

#### 4. Category Name Styling
```typescript
<p className={`font-medium ${
  item.status === 'removed' 
    ? 'text-gray-500 dark:text-gray-400 line-through' 
    : 'text-gray-900 dark:text-gray-100'
}`}>
```
- Strikethrough text for removed categories
- Muted color to indicate deactivation

#### 5. Amount Display
```typescript
{item.status === 'removed' ? (
  <>
    <span>{formatCurrency(item.personalLimit!)}</span>
    <span>→</span>
    <span>Deactivated</span>
  </>
) : /* other cases */}
```
- Shows original budget amount
- Arrow pointing to "Deactivated" text
- Clear indication of status change

#### 6. Badge Display
```typescript
{item.status === 'removed' && (
  <span>{formatCurrency(item.difference)}</span>
)}
```
- Shows negative amount (e.g., "-₪1,000")
- Orange badge color matches icon
- Clearly indicates budget reduction

## User Experience

### Before
```
[Hidden - no indication category was deactivated]
```

### After
```
┌─────────────────────────────────────────────────────────────┐
│ 🟠 Loan Payments                        [-₪1,000]           │
│    ₪1,000 → Deactivated                                     │
└─────────────────────────────────────────────────────────────┘
```

**Visual Features:**
- 🟠 Orange MinusCircle icon
- Strikethrough category name
- Dimmed, semi-transparent background
- Shows original budget amount
- "Deactivated" status text
- Negative difference in orange badge

## Example Scenarios

### Scenario 1: Deactivate High-Value Category
**Action:** User deactivates "Loan Payments" (₪1,000) mid-month

**Comparison Display:**
```
My Budget: ₪32,523
October 2025: ₪33,523
Net Change: +₪1,000

Categories:
- Food & Dining: ₪800 → ₪800 (No change)
- Groceries: ₪600 → ₪600 (No change)
- Loan Payments: ₪1,000 → Deactivated (-₪1,000) 🟠
```

**Impact:** 
- User sees ₪1,000 budget was removed
- Understands why totals changed
- Can see which category was deactivated

### Scenario 2: Add and Remove Categories
**Actions:**
1. Add "Travel" (+₪123)
2. Deactivate "Shopping" (-₪500)

**Comparison Display:**
```
My Budget: ₪32,523
October 2025: ₪33,023
Net Change: +₪500

Categories:
- Travel: Not in My Budget → ₪123 (New this month) 🔵
- Shopping: ₪500 → Deactivated (-₪500) 🟠
- [other categories...]
```

## Benefits

1. **Transparency**
   - Users see all budget changes, not just active categories
   - Clear indication of what was removed

2. **Audit Trail**
   - Shows historical budget decisions
   - Helps understand why totals changed

3. **Visual Clarity**
   - Strikethrough and dimmed styling clearly indicate deactivation
   - Orange color distinguishes from increases/decreases

4. **Consistency**
   - Mirrors "added" category behavior
   - Symmetrical treatment of additions and removals

5. **Budget Understanding**
   - Shows negative impact of deactivations
   - Helps users see total budget adjustments

## Testing Checklist

- [ ] Deactivate category → appears in comparison with "removed" status
- [ ] Removed category shows negative difference
- [ ] Category name has strikethrough styling
- [ ] Background is dimmed/semi-transparent
- [ ] Icon is orange MinusCircle
- [ ] Badge shows negative amount in orange
- [ ] Amount display shows "Original → Deactivated"
- [ ] Removed categories counted in removedCategories stat
- [ ] Total calculations exclude removed categories
- [ ] Multiple deactivations all shown correctly

## Related Files

- `src/services/monthlyBudgetService.ts` - Comparison logic
- `src/components/BudgetComparisonCard.tsx` - UI display
- `src/types/budget.ts` - Type definitions (already had 'removed' status)

## Future Enhancements

- [ ] Add tooltip explaining why category was removed
- [ ] Show date when category was deactivated
- [ ] Add "Reactivate" button for removed categories
- [ ] Group removed categories in separate section
- [ ] Add filter to show/hide removed categories
- [ ] Show spending on removed category before deactivation

## Notes

This feature provides symmetry with the "added" category feature - users can now see both additions and removals in the budget comparison, giving complete visibility into all budget changes.
