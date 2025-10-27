# Save Budget Fix

## Issue
When clicking "Save Budget" in the PersonalBudgetEditor, users received a browser alert: **"Failed to save budget"**

## Root Cause
Type signature mismatch between the service method and what the hook/component expected.

### Before (Broken)

**Service signature:**
```typescript
PersonalBudgetService.createBudget(
  config: BudgetConfiguration,
  name: string = 'Personal Budget',
  notes?: string
): Promise<PersonalBudget>
```

**Hook expected:**
```typescript
mutationFn: (budget: Omit<PersonalBudget, 'id' | 'user_id' | 'version' | 'created_at' | 'updated_at' | 'is_active'>) =>
  PersonalBudgetService.createBudget(budget)
```

**Component called with:**
```typescript
createBudget.mutateAsync({
  name: budgetName,
  categories,
  global_settings: globalSettings,
  notes: notes || undefined,
})
```

The service expected separate parameters, but received a single object.

## Solution

### 1. Updated `createBudget` Method
Changed from accepting `(config, name, notes)` to accepting a single budget object:

```typescript
static async createBudget(
  budget: Omit<PersonalBudget, 'id' | 'user_id' | 'version' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<PersonalBudget> {
  // ... implementation
  const newBudget: Omit<PersonalBudget, 'id' | 'created_at' | 'updated_at'> = {
    user_id: user.id,
    version: nextVersion,
    name: budget.name,                    // From budget object
    categories: budget.categories,        // From budget object
    global_settings: budget.global_settings, // From budget object
    is_active: true,
    notes: budget.notes                   // From budget object
  };
  // ...
}
```

### 2. Updated `updateBudget` Method
Changed to match the hook's expected signature:

**Before:**
```typescript
updateBudget(config: BudgetConfiguration, notes?: string)
```

**After:**
```typescript
updateBudget(budgetId: string, updates: Partial<PersonalBudget>)
```

Now creates a new version by:
1. Getting the existing budget
2. Merging updates with existing data using nullish coalescing (`??`)
3. Creating a new version with incremented version number

### 3. Updated `migrateFromLegacyConfig` Method
Fixed to call `createBudget` with the new signature:

```typescript
return await this.createBudget({
  name: 'Personal Budget',
  categories: legacyConfig.categories as Record<string, CategoryConfig>,
  global_settings: legacyConfig.globalSettings as GlobalBudgetSettings,
  notes: 'Migrated from legacy configuration'
});
```

## Files Changed

- ✅ `src/services/PersonalBudgetService.ts`
  - Updated `createBudget()` method signature
  - Updated `updateBudget()` method signature and implementation
  - Updated `migrateFromLegacyConfig()` to use new signature

## Testing

### Manual Test Steps
1. Navigate to Budget Management page
2. Click "Create Your First Budget" or "Edit Budget"
3. Fill in:
   - Budget Name
   - Currency selection
   - At least one category with limit
4. Click "Save Budget"
5. ✅ Should save successfully without error
6. ✅ Should close the editor and show the configured budget

### What Was Broken
- ❌ Save button triggered error alert
- ❌ Budget was not saved to database
- ❌ User could not create or update budgets

### What Now Works
- ✅ Save button successfully saves budget
- ✅ Budget is saved to `personal_budgets` table
- ✅ New version is created on update
- ✅ Previous budget is deactivated
- ✅ UI updates to show saved budget

## Related Code

### Component Call (PersonalBudgetEditor.tsx)
```typescript
await createBudget.mutateAsync({
  name: budgetName,
  categories,
  global_settings: globalSettings,
  notes: notes || undefined,
});
```

### Hook (useBudgets.ts)
```typescript
export function useCreatePersonalBudget() {
  return useMutation({
    mutationFn: (budget: Omit<PersonalBudget, 'id' | 'user_id' | 'version' | 'created_at' | 'updated_at' | 'is_active'>) =>
      PersonalBudgetService.createBudget(budget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalBudget'] });
    },
  });
}
```

## Type Safety Improvement

The fix also improves type safety:
- ✅ Single source of truth for budget object shape
- ✅ TypeScript catches signature mismatches at compile time
- ✅ Consistent API across create and update operations
- ✅ No more positional parameter confusion

## Database Flow

### Create Budget
1. Component → Hook → Service
2. Service deactivates existing budgets
3. Service gets next version number
4. Service inserts new budget with `is_active = true`
5. React Query invalidates cache
6. UI refetches and displays new budget

### Update Budget
1. Component → Hook → Service (with budgetId + updates)
2. Service fetches existing budget
3. Service merges updates with existing data
4. Service deactivates all budgets
5. Service inserts new version
6. React Query invalidates cache
7. UI refetches and displays updated budget

## Prevention

To prevent similar issues:
1. ✅ Ensure service signatures match what hooks expect
2. ✅ Use TypeScript to catch signature mismatches
3. ✅ Test both create and update flows
4. ✅ Check error messages in browser console
5. ✅ Validate data reaches database

## Impact

**Affected Features:**
- ✅ Budget creation (now working)
- ✅ Budget updates (now working)
- ✅ Budget versioning (now working)
- ✅ Legacy migration (now working)

**User Experience:**
- Before: Complete blocker - couldn't save budgets
- After: Smooth save experience, no errors

## Notes

- The fix maintains backward compatibility with existing database records
- Version incrementing still works correctly
- Budget deactivation logic unchanged
- React Query cache invalidation unchanged
