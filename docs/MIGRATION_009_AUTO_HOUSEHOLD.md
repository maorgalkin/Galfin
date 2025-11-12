# Migration 009: Auto-Create Household for New Users

## Problem

New users signing up for the first time would get stuck on a loading screen when accessing the "My Budget" page. This happened because:

1. The budget system requires users to be part of a **household**
2. No household was automatically created during user registration
3. The `PersonalBudgetService.getActiveBudget()` would throw "User is not part of a household" error
4. The React Query hook would keep retrying indefinitely
5. The UI would show "Loading budget..." forever

## Solution

This migration implements a **database trigger** that automatically creates a personal household for every new user when they sign up.

### Migration Files

1. **`009_auto_create_household_for_new_users.sql`** - Creates the trigger function (apply first)
2. **`009_backfill_existing_users.sql`** - Backfills households for existing users (apply second)

### What It Does

When a new user signs up via Supabase Auth:

1. **Trigger fires** after user row is inserted into `auth.users`
2. **Function extracts** user's first name from metadata
3. **Creates household** named "{FirstName}'s Household"
4. **Adds user** as the owner of their household
5. **User can now** access all budget features immediately

### Example

User signs up:
- Email: `john.doe@example.com`
- First Name: `John`
- Last Name: `Doe`

Automatically created:
- **Household**: "John's Household"
- **Membership**: John as Owner

## How to Apply

### Step 1: Apply Main Migration

In your Supabase SQL Editor, run:

```sql
-- Copy and paste the content of 009_auto_create_household_for_new_users.sql
```

This creates:
- ✅ `handle_new_user()` function
- ✅ `on_auth_user_created` trigger on `auth.users`
- ✅ Proper permissions

### Step 2: Backfill Existing Users

If you have existing users without households:

```sql
-- Copy and paste the content of 009_backfill_existing_users.sql
```

This will:
- ✅ Find all users without a household
- ✅ Create a personal household for each
- ✅ Add them as the owner
- ✅ Log how many users were fixed

### Step 3: Verify

Check that all users now have households:

```sql
-- This should return 0 rows (no users without households)
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.household_members hm ON hm.user_id = au.id
WHERE hm.id IS NULL;
```

## Code Changes

### 1. Hook Error Handling

Updated `src/hooks/useBudgets.ts`:

```typescript
export function useActiveBudget() {
  return useQuery({
    queryKey: ['personalBudget', 'active'],
    queryFn: async () => {
      try {
        return await PersonalBudgetService.getActiveBudget();
      } catch (error: any) {
        // Handle "not part of household" error gracefully
        if (error?.message?.includes('User is not part of a household')) {
          console.warn('User has no household yet');
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry if the user simply doesn't have a household
      if (error?.message?.includes('User is not part of a household')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
```

### 2. Component Loading States

Updated `src/components/PersonalBudgetEditor.tsx`:

```typescript
// Wait for loading to complete before auto-creating budget
useEffect(() => {
  if (autoCreate && !loadingActive && !loadingHistory && 
      !isCreating && !editingBudgetId && !activeBudget) {
    handleStartCreate();
  }
}, [autoCreate, loadingActive, loadingHistory, activeBudget]);
```

## Testing

### Test New User Flow

1. **Create new account** via `/register`
2. **Verify email** (if email confirmation enabled)
3. **Login** to the app
4. **Click "Get Started"** or navigate to "My Budget"
5. **Should see**: Budget creation form (not loading screen)

### Test Existing User Fix

Run the backfill script and verify:

```sql
-- Check household was created
SELECT h.name, hm.role
FROM households h
JOIN household_members hm ON h.id = hm.household_id
WHERE hm.user_id = '{your_user_id}';

-- Should show: "{YourName}'s Household" with role "owner"
```

## Rollback (if needed)

To remove the trigger:

```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();
```

**Note**: This won't delete households already created. To clean up:

```sql
-- Only run if you want to delete all auto-created households
DELETE FROM households WHERE name LIKE '%''s Household';
```

## Related Files

- **Migration**: `supabase/migrations/009_auto_create_household_for_new_users.sql`
- **Backfill**: `supabase/migrations/009_backfill_existing_users.sql`
- **Hook**: `src/hooks/useBudgets.ts`
- **Component**: `src/components/PersonalBudgetEditor.tsx`
- **Service**: `src/services/personalBudgetService.ts` (unchanged)

## Future Improvements

- [ ] Allow users to rename their household
- [ ] Add household settings page
- [ ] Support multiple households per user (switch between them)
- [ ] Household invitation system improvements

---

**Status**: ✅ Ready to Deploy  
**Priority**: 🔴 Critical (blocks new user onboarding)  
**Date**: November 12, 2025
