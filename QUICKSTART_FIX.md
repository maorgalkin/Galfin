# Quick Start: Fix "User is not part of a household" Error

## 🔧 Immediate Fix (Do This Now)

### Step 1: Run Migration 011

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy the contents of `supabase/migrations/011_fix_missing_household.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press F5)

**Expected Output:**
```
NOTICE: Starting Migration 011: Checking for users without households...
NOTICE: Created household abc-123... for user 5e84ffa6... (email: user@example.com, created: 2025-11-10)
NOTICE: Migration 011 complete: Created 1 household(s) for existing users
NOTICE: SUCCESS: All 1 users have households assigned
```

### Step 2: Verify It Worked

Run this quick verification query:
```sql
SELECT 
  u.email,
  h.name as household_name,
  hm.role
FROM auth.users u
JOIN household_members hm ON hm.user_id = u.id
JOIN households h ON h.id = hm.household_id;
```

You should see your email with a household name like "yourname's Household".

### Step 3: Test Budget Creation

1. **Refresh your browser** (important!)
2. Go to Budget Management
3. Click "Create Budget"
4. Configure categories
5. Click "Save Budget"

**It should work now!** ✅

---

## 📊 Admin Tools

### View All Users and Households

Use `scripts/admin_list_users.sql` to see all users and their household memberships.

### Safely Remove a User

Use `scripts/admin_remove_user.sql` to remove users with automatic ownership transfer.

See `scripts/README.md` for detailed documentation.

---

## 🎯 What This Fixed

**Before Migration 011:**
- ❌ Users created before migration 009 had no households
- ❌ Error: "User is not part of a household" (406 Not Acceptable)
- ❌ Cannot create budgets or use app features

**After Migration 011:**
- ✅ All users automatically assigned to households
- ✅ Budget creation works
- ✅ All app features functional
- ✅ New users automatically get households (migration 009 trigger)

---

## 🔄 Migration is Idempotent

Safe to run multiple times:
- Already assigned users are skipped
- No duplicate households created
- No data loss or corruption

---

## 🚨 Still Having Issues?

If you still see the error after running the migration:

1. **Hard refresh** your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache** for the site
3. **Sign out and sign in** again
4. Run the verification query above to confirm household exists
5. Check browser console for different errors

If issues persist, share the new error messages and I'll help debug further!
