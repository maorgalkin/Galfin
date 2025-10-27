# Database Modification Flow - Step by Step

## Example: User clicks "Save" to update a category limit from $500 to $600

---

## THE COMPLETE FLOW

### 1️⃣ USER ACTION (Browser)
```
User types "600" in input field
User clicks "Save" button
```

### 2️⃣ COMPONENT EVENT HANDLER
**File:** `src/components/MonthlyBudgetView.tsx` (line 47)

```typescript
const handleSaveEdit = async (categoryName: string) => {
  if (!budget) return;

  const newLimit = parseFloat(editValue); // "600" → 600
  
  // Call the mutation from React Query hook
  await updateLimit.mutateAsync({
    monthlyBudgetId: budget.id,           // "uuid-123-abc"
    categoryName,                          // "Groceries"
    newLimit,                              // 600
  });
};
```

**What happens:** Component calls the hook's mutation function

---

### 3️⃣ REACT QUERY HOOK
**File:** `src/hooks/useBudgets.ts` (lines 155-171)

```typescript
export function useUpdateCategoryLimit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    // This function is called when you do mutateAsync()
    mutationFn: ({ monthlyBudgetId, categoryName, newLimit, notes }) => 
      MonthlyBudgetService.updateCategoryLimit(  // 👈 FORWARDS TO SERVICE
        monthlyBudgetId,  // "uuid-123-abc"
        categoryName,     // "Groceries"
        newLimit,         // 600
        notes
      ),
    
    // After successful update, refresh all budget queries
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBudget'] });
    },
  });
}
```

**What happens:** Hook forwards parameters to Service layer

---

### 4️⃣ SERVICE LAYER - BUSINESS LOGIC
**File:** `src/services/monthlyBudgetService.ts` (lines 195-257)

```typescript
static async updateCategoryLimit(
  monthlyBudgetId: string,    // "uuid-123-abc"
  categoryName: string,       // "Groceries"
  newLimit: number,           // 600
  notes?: string
): Promise<MonthlyBudget> {
  
  // 🔐 STEP A: CHECK AUTHENTICATION
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // 📖 STEP B: READ CURRENT BUDGET FROM DATABASE
  const { data: currentBudget, error: fetchError } = await supabase
    .from('monthly_budgets')           // Table name
    .select('*')                       // Get all columns
    .eq('id', monthlyBudgetId)        // WHERE id = 'uuid-123-abc'
    .eq('user_id', user.id)           // AND user_id = current_user
    .single();                         // Return single row

  if (fetchError) throw fetchError;
  
  // Current budget from DB:
  // {
  //   id: "uuid-123-abc",
  //   categories: {
  //     "Groceries": { monthlyLimit: 500, ... },  👈 OLD VALUE
  //     "Transportation": { monthlyLimit: 200, ... }
  //   },
  //   adjustment_count: 3
  // }

  // 🔒 STEP C: CHECK IF LOCKED
  if (currentBudget.is_locked) {
    throw new Error('Cannot modify locked monthly budget');
  }

  // ✅ STEP D: VALIDATE CATEGORY EXISTS
  if (!currentBudget.categories[categoryName]) {
    throw new Error(`Category "${categoryName}" not found`);
  }

  // 🔧 STEP E: BUILD UPDATED CATEGORIES OBJECT
  const updatedCategories = {
    ...currentBudget.categories,           // Keep all other categories
    [categoryName]: {                      // Update just "Groceries"
      ...currentBudget.categories[categoryName],  // Keep other properties
      monthlyLimit: newLimit               // 500 → 600 ✨
    }
  };

  // Result:
  // {
  //   "Groceries": { monthlyLimit: 600, ... },  👈 NEW VALUE!
  //   "Transportation": { monthlyLimit: 200, ... }
  // }

  // 💾 STEP F: WRITE TO DATABASE (THE ACTUAL MODIFICATION!)
  const { data, error } = await supabase
    .from('monthly_budgets')               // Table: monthly_budgets
    .update({                              // SQL UPDATE command
      categories: updatedCategories,       // New categories JSON
      adjustment_count: currentBudget.adjustment_count + 1,  // 3 → 4
      notes: notes || currentBudget.notes
    })
    .eq('id', monthlyBudgetId)            // WHERE id = 'uuid-123-abc'
    .eq('user_id', user.id)               // AND user_id = current_user (RLS)
    .select()                              // Return the updated row
    .single();                             // Return single row

  if (error) throw error;

  return data;  // Return updated MonthlyBudget object
}
```

**What happens:** 
1. Authenticate user
2. Read current budget from database
3. Validate (not locked, category exists)
4. Build new categories object with updated limit
5. **WRITE TO DATABASE** via `supabase.from().update()`
6. Return updated budget

---

### 5️⃣ SUPABASE CLIENT → API
**Under the hood (you don't write this):**

```typescript
// Supabase client converts to HTTP request
POST https://your-project.supabase.co/rest/v1/monthly_budgets?id=eq.uuid-123-abc

Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  apikey: your-anon-key
  Content-Type: application/json

Body:
{
  "categories": {
    "Groceries": { "monthlyLimit": 600, ... },
    "Transportation": { "monthlyLimit": 200, ... }
  },
  "adjustment_count": 4,
  "updated_at": "2025-10-26T..."
}
```

---

### 6️⃣ SUPABASE SERVER (Cloud)
**Supabase server processes the request:**

```sql
-- 1. Validate JWT token
-- 2. Check Row Level Security (RLS) policy:

-- Policy: monthly_budgets_policy
-- Ensures user can only update their own budgets
CREATE POLICY monthly_budgets_policy ON monthly_budgets
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Execute SQL query:
UPDATE monthly_budgets
SET 
  categories = '{"Groceries": {"monthlyLimit": 600, ...}, ...}',
  adjustment_count = 4,
  updated_at = NOW()
WHERE id = 'uuid-123-abc'
  AND user_id = 'current-user-id'
RETURNING *;
```

---

### 7️⃣ POSTGRESQL DATABASE
**Physical storage on disk:**

```
┌─────────────────────────────────────────────────────────────┐
│ Table: monthly_budgets                                      │
├──────────────┬──────────────┬─────────────┬────────────────┤
│ id           │ user_id      │ categories  │ adj_count      │
├──────────────┼──────────────┼─────────────┼────────────────┤
│ uuid-123-abc │ user-xyz-789 │ {...}       │ 3 → 4 ✅       │
│              │              │ monthlyLimit│                │
│              │              │ 500 → 600 ✅│                │
└──────────────┴──────────────┴─────────────┴────────────────┘

💾 DISK WRITE HAPPENS HERE! Data persisted to PostgreSQL
```

---

### 8️⃣ RESPONSE FLOWS BACK UP

```
PostgreSQL 
  → Returns updated row to Supabase server
    → Supabase server sends HTTP response
      → Supabase client receives response
        → Service returns MonthlyBudget object
          → Hook's onSuccess() callback fires
            → queryClient.invalidateQueries() called
              → All components using budget data refetch
                → UI updates automatically! ✨
```

---

## SUMMARY: Where Database Modification Happens

### The One Line That Actually Writes to DB:

```typescript
// src/services/monthlyBudgetService.ts, line 240
const { data, error } = await supabase
  .from('monthly_budgets')  // 👈 TABLE
  .update({                 // 👈 SQL UPDATE
    categories: updatedCategories,  // 👈 NEW DATA
    adjustment_count: currentBudget.adjustment_count + 1,
  })
  .eq('id', monthlyBudgetId)  // 👈 WHERE CLAUSE
  .eq('user_id', user.id)     // 👈 SECURITY CHECK
```

This translates to SQL:
```sql
UPDATE monthly_budgets 
SET categories = {...}, adjustment_count = 4
WHERE id = 'uuid-123-abc' AND user_id = 'current-user-id'
```

---

## Key Takeaways

1. **Database writes happen in Services** using `supabase.from(table).update()`
2. **Hooks are optional wrappers** that make React components cleaner
3. **You can skip hooks** and call services directly with useState/useEffect
4. **React Query benefits:** Auto-refetch, caching, loading states, shared data

The hooks don't change WHERE or HOW database modification happens - they just make it easier to use from React components!
