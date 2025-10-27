# Dashboard Refactoring Plan

## Current State
**File:** `src/components/Dashboard.tsx`  
**Lines:** ~1008 lines  
**Complexity:** Very high - multiple concerns mixed together

## Identified Logical Sections

### 1. **Tab Navigation** (~40 lines)
- Tab buttons (Dashboard, Transactions, Budget)
- Active tab state management
- Tab styling logic

**Proposed:** `DashboardTabNavigation.tsx`

### 2. **Dashboard Tab Content** (~400 lines)
Contains:
- Welcome message
- Dummy data controls
- Month navigation
- Budget Quick View
- Expense breakdown chart
- Category list
- Family members card

**Proposed Split:**
- `DashboardOverview.tsx` - Main dashboard view
- `MonthNavigator.tsx` - Month tabs with navigation
- `ExpenseChart.tsx` - Pie chart visualization
- `CategoryExpenseList.tsx` - Category breakdown list
- `FamilyMembersCard.tsx` - Family members summary

### 3. **Transactions Tab Content** (~200 lines)
Contains:
- Transaction filters
- Transaction list
- Transaction cards
- Edit/delete actions

**Proposed:** `TransactionsList.tsx`

### 4. **Budget Tab Content** (~5 lines)
Simply renders BudgetManagement component

**Keep inline** - already extracted

### 5. **Category Modal** (~150 lines)
Full-screen modal showing transactions for a specific category

**Proposed:** `CategoryTransactionsModal.tsx`

### 6. **Helper Functions & Hooks** (~100 lines)
- Date utilities
- Currency formatting
- User name extraction
- Data filtering

**Proposed:** 
- `src/hooks/useDashboardData.ts` - Custom hook for data logic
- `src/utils/dateHelpers.ts` - Date utility functions
- `src/utils/userHelpers.ts` - User name extraction

### 7. **State Management** (~30 lines)
Multiple useState hooks

**Proposed:** Extract to custom hook `useDashboardState.ts`

## Refactoring Strategy

### Phase 1: Extract Utilities (Low Risk)
1. ✅ Create `src/utils/dateHelpers.ts`
2. ✅ Create `src/utils/userHelpers.ts`
3. ✅ Update Dashboard to use utilities

### Phase 2: Extract Helper Hook (Medium Risk)
1. ✅ Create `src/hooks/useDashboardData.ts`
2. ✅ Move data filtering logic
3. ✅ Move budget calculations
4. ✅ Update Dashboard to use hook

### Phase 3: Extract Components (High Value)
1. ✅ Create `DashboardTabNavigation.tsx`
2. ✅ Create `MonthNavigator.tsx`
3. ✅ Create `ExpenseChart.tsx`
4. ✅ Create `CategoryExpenseList.tsx`
5. ✅ Create `CategoryTransactionsModal.tsx`
6. ✅ Create `TransactionsList.tsx`
7. ✅ Create `DashboardOverview.tsx`
8. ✅ Update Dashboard to compose components

### Phase 4: Final Cleanup
1. ✅ Remove unused imports
2. ✅ Add TypeScript interfaces
3. ✅ Add JSDoc comments
4. ✅ Verify all functionality works

## Expected Result

### Before
```
Dashboard.tsx (1008 lines)
├── All state management
├── All helper functions
├── All UI rendering
├── All business logic
└── Multiple modals
```

### After
```
Dashboard.tsx (~100 lines)
├── Tab state
├── Component composition
└── Event handlers

src/components/dashboard/
├── DashboardTabNavigation.tsx (~50 lines)
├── DashboardOverview.tsx (~200 lines)
│   ├── MonthNavigator.tsx (~80 lines)
│   ├── ExpenseChart.tsx (~100 lines)
│   ├── CategoryExpenseList.tsx (~80 lines)
│   └── FamilyMembersCard.tsx (~60 lines)
├── TransactionsList.tsx (~150 lines)
└── CategoryTransactionsModal.tsx (~120 lines)

src/hooks/
└── useDashboardData.ts (~100 lines)

src/utils/
├── dateHelpers.ts (~40 lines)
└── userHelpers.ts (~20 lines)
```

## Benefits

### 1. **Maintainability**
- Each component has single responsibility
- Easy to find and fix bugs
- Clear separation of concerns

### 2. **Reusability**
- Components can be reused in other views
- Utilities shared across app
- Hooks encapsulate complex logic

### 3. **Testability**
- Smaller components easier to test
- Utilities can be unit tested
- Hooks can be tested in isolation

### 4. **Performance**
- Components can be memoized individually
- Easier to identify performance bottlenecks
- Potential for lazy loading

### 5. **Collaboration**
- Multiple developers can work on different sections
- Clearer code ownership
- Easier code reviews

### 6. **Type Safety**
- Better TypeScript inference
- Clearer prop interfaces
- Easier to catch type errors

## Implementation Steps

### Step 1: Create Directory Structure
```bash
mkdir src/components/dashboard
mkdir src/hooks
mkdir src/utils
```

### Step 2: Extract Utilities
Start with pure functions - lowest risk

### Step 3: Extract Hook
Move data logic to custom hook

### Step 4: Extract Presentational Components
Move UI to dedicated components

### Step 5: Update Main Dashboard
Compose extracted components

### Step 6: Test & Verify
Ensure all functionality works

## File Size Comparison

| Component | Before | After |
|-----------|--------|-------|
| Dashboard.tsx | 1008 lines | ~100 lines |
| DashboardOverview.tsx | - | ~200 lines |
| TransactionsList.tsx | - | ~150 lines |
| CategoryTransactionsModal.tsx | - | ~120 lines |
| Other components | - | ~400 lines |
| Utilities | - | ~60 lines |
| Hooks | - | ~100 lines |
| **Total** | 1008 lines | ~1130 lines* |

*Slight increase due to imports/exports, but much better organized

## Breaking Changes

### None Expected!
- Same props interface
- Same functionality
- Same user experience
- Only internal structure changes

## Rollback Plan

If issues arise:
1. Git stash/revert changes
2. Components are standalone - can roll back individually
3. Original logic preserved in git history

## Success Criteria

✅ All dashboard functionality works  
✅ All tests pass  
✅ No console errors  
✅ Same user experience  
✅ Code is more maintainable  
✅ Components are reusable  
✅ TypeScript has no errors  

## Timeline Estimate

- Phase 1 (Utilities): 30 minutes
- Phase 2 (Hook): 45 minutes
- Phase 3 (Components): 2-3 hours
- Phase 4 (Cleanup): 30 minutes
- **Total: 4-5 hours**

## Priority

**HIGH** - Dashboard is a core component that will continue to grow. Refactoring now prevents future technical debt.
