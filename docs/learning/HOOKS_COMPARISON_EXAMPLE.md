# React Query Hooks vs Direct Service Calls - Complete Example

## Scenario: Display and Edit Monthly Budget Category

---

## WITHOUT Custom Hooks (Old Way - Direct Service Calls)

```typescript
import React, { useState, useEffect } from 'react';
import { MonthlyBudgetService } from '../services/monthlyBudgetService';
import type { MonthlyBudget } from '../types/budget';

function BudgetEditor() {
  // Manual state management for EVERYTHING
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Fetch data on mount
  useEffect(() => {
    setLoading(true);
    MonthlyBudgetService.getCurrentMonthBudget()
      .then(data => {
        setBudget(data);
        setError(null);
      })
      .catch(err => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Manual save handler
  const handleSave = async (categoryName: string) => {
    if (!budget) return;
    
    setSaving(true);
    try {
      // 🔴 DATABASE MODIFICATION HAPPENS HERE - Step 1
      await MonthlyBudgetService.updateCategoryLimit(
        budget.id,
        categoryName,
        parseFloat(editValue)
      );
      
      // 🔴 Manual refetch to update UI - Step 2
      const updatedBudget = await MonthlyBudgetService.getCurrentMonthBudget();
      setBudget(updatedBudget);
      
    } catch (err) {
      setError(err as Error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!budget) return <div>No budget found</div>;

  return (
    <div>
      <h2>Monthly Budget</h2>
      {Object.entries(budget.categories).map(([name, config]) => (
        <div key={name}>
          <span>{name}: ${config.monthlyLimit}</span>
          <input 
            value={editValue} 
            onChange={e => setEditValue(e.target.value)} 
          />
          <button onClick={() => handleSave(name)} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Problems with this approach:**
- ❌ 50+ lines of boilerplate for a simple component
- ❌ Must manually manage loading, error, and saving states
- ❌ Must manually refetch after mutation
- ❌ If another component changes the budget, this component won't know
- ❌ No caching - refetches every time component mounts

---

## WITH Custom Hooks (New Way - React Query)

```typescript
import React, { useState } from 'react';
import { useCurrentMonthBudget, useUpdateCategoryLimit } from '../hooks/useBudgets';

function BudgetEditor() {
  const [editValue, setEditValue] = useState('');
  
  // ✅ One line gets data + loading + error states
  const { data: budget, isLoading, error } = useCurrentMonthBudget();
  
  // ✅ One line gets mutation function + saving state
  const updateLimit = useUpdateCategoryLimit();

  const handleSave = async (categoryName: string) => {
    if (!budget) return;
    
    // 🔴 DATABASE MODIFICATION HAPPENS HERE
    await updateLimit.mutateAsync({
      monthlyBudgetId: budget.id,
      categoryName,
      newLimit: parseFloat(editValue),
    });
    // ✅ React Query automatically refetches the budget!
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!budget) return <div>No budget found</div>;

  return (
    <div>
      <h2>Monthly Budget</h2>
      {Object.entries(budget.categories).map(([name, config]) => (
        <div key={name}>
          <span>{name}: ${config.monthlyLimit}</span>
          <input 
            value={editValue} 
            onChange={e => setEditValue(e.target.value)} 
          />
          <button 
            onClick={() => handleSave(name)} 
            disabled={updateLimit.isPending}
          >
            {updateLimit.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ 30 lines vs 50+ lines
- ✅ Automatic loading/error state management
- ✅ Automatic refetching after mutations
- ✅ Shared cache across components
- ✅ Background refetching keeps data fresh

---

## WHERE DOES DATABASE MODIFICATION ACTUALLY HAPPEN?

Let me trace the full path:

### 1. Component calls the hook's mutation:
```typescript
// In BudgetEditor component
await updateLimit.mutateAsync({
  monthlyBudgetId: budget.id,
  categoryName,
  newLimit: parseFloat(editValue),
});
```

### 2. Hook forwards to Service:
```typescript
// In src/hooks/useBudgets.ts (lines 155-171)
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
    }) => MonthlyBudgetService.updateCategoryLimit(  // 👈 CALLS SERVICE
      monthlyBudgetId, 
      categoryName, 
      newLimit, 
      notes
    ),
    onSuccess: () => {
      // 👈 AUTO-REFRESH ALL BUDGET QUERIES
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
    },
  });
}
```

### 3. Service modifies database via Supabase:
```typescript
// In src/services/monthlyBudgetService.ts (lines 150-193)
static async updateCategoryLimit(
  monthlyBudgetId: string,
  categoryName: string,
  newLimit: number,
  notes?: string
): Promise<MonthlyBudget> {
  const user = await AuthService.getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  // 🔴 STEP 1: FETCH CURRENT BUDGET FROM DATABASE
  const { data: budget, error: fetchError } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('id', monthlyBudgetId)
    .eq('user_id', user.id)
    .single();

  if (fetchError) throw fetchError;
  if (!budget) throw new Error('Monthly budget not found');

  // STEP 2: UPDATE CATEGORY IN MEMORY
  const updatedCategories = {
    ...budget.categories,
    [categoryName]: {
      ...budget.categories[categoryName],
      monthlyLimit: newLimit,
    },
  };

  // 🔴 STEP 3: WRITE BACK TO DATABASE (ACTUAL DB MODIFICATION!)
  const { data: updated, error: updateError } = await supabase
    .from('monthly_budgets')
    .update({
      categories: updatedCategories,
      adjustment_count: budget.adjustment_count + 1,
      updated_at: new Date().toISOString(),
      notes,
    })
    .eq('id', monthlyBudgetId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated as MonthlyBudget;
}
```

### 4. Supabase communicates with PostgreSQL:
```
Supabase Client (JavaScript)
    ↓
HTTPS Request to Supabase API
    ↓
Supabase Server validates JWT token
    ↓
Checks Row Level Security (RLS) policies
    ↓
Executes SQL: UPDATE monthly_budgets SET ...
    ↓
PostgreSQL Database writes to disk
    ↓
Returns updated row
    ↓
Supabase sends response back
    ↓
Service returns MonthlyBudget object
    ↓
Hook invalidates cache
    ↓
Component automatically refetches and re-renders
```

---

## SUMMARY: The Architecture Layers

```
┌─────────────────────────────────────────────────┐
│  COMPONENT (BudgetEditor)                       │
│  - User clicks "Save"                           │
│  - Calls updateLimit.mutateAsync()              │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  HOOK (useUpdateCategoryLimit)                  │
│  - Wraps service call with React Query          │
│  - Provides loading states                      │
│  - Auto-invalidates cache on success            │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  SERVICE (MonthlyBudgetService)                 │
│  - Business logic                               │
│  - Validation                                   │
│  - Calls Supabase client                        │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  SUPABASE CLIENT                                │
│  - Converts to HTTP request                     │
│  - Adds authentication headers                  │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  SUPABASE API (Cloud)                           │
│  - Validates JWT token                          │
│  - Checks RLS policies                          │
│  - Executes SQL query                           │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  POSTGRESQL DATABASE                            │
│  - Actual data storage                          │
│  - UPDATE monthly_budgets SET ...               │
└─────────────────────────────────────────────────┘
```

**Key Points:**
1. **Database modification** happens in the **Service layer** via `supabase.from('table').update()`
2. **Hooks are optional** - they just make React components cleaner
3. **Services can be used directly** without hooks (like we did before)
4. **React Query hooks** add automatic caching, refetching, and state management

Does this clarify the architecture? The hooks are basically convenience wrappers that make your components simpler!
