# RLS Recursion and SECURITY DEFINER Functions

## The Problem: Infinite Recursion in RLS Policies

### What We Tried to Do
When implementing the household system, we wanted users to see data from their household:

```sql
-- This policy seems logical but causes infinite recursion!
CREATE POLICY "Users can view household family members"
  ON family_members FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members  -- 👈 PROBLEM: Queries same table policy checks!
      WHERE user_id = auth.uid()
    )
  );
```

### What Went Wrong

**The Infinite Loop:**
1. User queries `family_members` table
2. PostgreSQL checks RLS policy
3. Policy needs to query `household_members` 
4. `household_members` also has RLS policies!
5. To check those policies, it queries `household_members` again
6. Which triggers the policy check again
7. Which queries `household_members` again
8. **INFINITE RECURSION!** 🔁

**Error Message:**
```
infinite recursion detected in policy for relation "household_members"
```

### Why This Happens

RLS policies are **recursive by nature**. When a policy contains a subquery:
- The subquery is executed **within the same security context**
- If that subquery references a table with RLS policies, those policies are checked
- If those policies also have subqueries... infinite loop!

---

## The Solution: SECURITY DEFINER Functions

### What is SECURITY DEFINER?

A `SECURITY DEFINER` function runs with the **privileges of the function owner** (not the caller).

Think of it like `sudo` in Linux:
- Normal function: runs as current user → must pass RLS checks
- SECURITY DEFINER: runs as database owner → **bypasses RLS checks**

### The Fix

**Step 1: Create a SECURITY DEFINER function**

```sql
CREATE OR REPLACE FUNCTION user_is_in_household(p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER              -- 👈 Runs with elevated privileges!
SET search_path = public      -- 👈 Security best practice
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM household_members    -- 👈 This query bypasses RLS!
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
  );
END;
$$;
```

**Step 2: Use the function in policies**

```sql
-- Now the policy doesn't query the table directly!
CREATE POLICY "Users can view household family members"
  ON family_members FOR SELECT
  USING (user_is_in_household(household_id));  -- 👈 Calls function instead!

CREATE POLICY "Users can view same household members"
  ON household_members FOR SELECT
  USING (user_is_in_household(household_id));  -- 👈 No more recursion!
```

### How It Breaks the Recursion

**Before (Broken):**
```
User queries family_members
  → Policy checks household_members
    → Policy checks household_members
      → Policy checks household_members
        → INFINITE RECURSION!
```

**After (Fixed):**
```
User queries family_members
  → Policy calls user_is_in_household()
    → Function runs with elevated privileges
      → Queries household_members WITHOUT triggering policies
        → Returns TRUE/FALSE
          → Policy allows/denies access
            → ✅ SUCCESS!
```

---

## Security Considerations

### Why SET search_path = public?

Without this, a malicious user could create a function with the same name in their own schema:

```sql
-- Attacker creates malicious function in their schema
CREATE SCHEMA attacker;
CREATE FUNCTION attacker.auth.uid() RETURNS UUID AS $$
BEGIN
  RETURN 'some-other-user-id';  -- Impersonate other users!
END;
$$ LANGUAGE plpgsql;

-- Then sets their search path
SET search_path = attacker, public;

-- Now when SECURITY DEFINER function calls auth.uid()...
-- It might call the attacker's version! 😱
```

**The Fix:**
```sql
SET search_path = public  -- Only use public schema functions
```

This ensures the function only uses trusted system functions.

### Why SECURITY DEFINER is Safe Here

The function still checks `auth.uid()`:
```sql
WHERE user_id = auth.uid()  -- 👈 Still validates current user!
```

It's not a security bypass - it's just:
- Bypassing RLS **during the policy check**
- Still enforcing security **by checking the user ID**

---

## Real-World Example: Our Household System

### The Full Implementation

**Migration: 005_fix_rls_with_security_definer.sql**

```sql
-- Create helper functions
CREATE OR REPLACE FUNCTION user_is_in_household(p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION user_is_household_owner_or_admin(p_household_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$;

-- Use in policies
CREATE POLICY "Users can view household family members"
  ON family_members FOR SELECT
  USING (user_is_in_household(household_id));

CREATE POLICY "Owners can invite members"
  ON household_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR user_is_household_owner_or_admin(household_id)
  );
```

### What We Fixed

**Tables affected:**
- ✅ `household_members` - No more self-referencing policies
- ✅ `family_members` - Uses function instead of subquery
- ✅ `transactions` - Uses function for household checks
- ✅ `personal_budgets` - Uses function for household checks
- ✅ `monthly_budgets` - Uses function for household checks

**Result:**
- No more infinite recursion errors
- All data loads correctly
- Invites work
- Data sharing works across household members

---

## Lessons Learned

### ❌ Don't Do This
```sql
-- Policy that queries the same table it's protecting
CREATE POLICY "bad_policy" ON my_table
  USING (
    id IN (SELECT related_id FROM my_table WHERE ...)  -- ❌ Recursion!
  );
```

### ✅ Do This Instead
```sql
-- Create a SECURITY DEFINER function
CREATE FUNCTION check_access(p_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (...); END; $$;

-- Use the function in policy
CREATE POLICY "good_policy" ON my_table
  USING (check_access(id));  -- ✅ No recursion!
```

### Key Principles

1. **SECURITY DEFINER functions bypass RLS** - Use carefully!
2. **Always set search_path = public** - Prevents schema injection
3. **Still validate auth.uid()** - Functions should still check permissions
4. **Use for policy helpers only** - Don't expose to application code
5. **Document why you need it** - Future you will thank you

---

## Debugging Tips

### How to Detect RLS Recursion

**Symptoms:**
- Queries hang or timeout
- Error: "infinite recursion detected in policy"
- Queries work for database owner but not regular users

**Check your policies:**
```sql
-- List all policies
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'your_table';

-- Look for policies that query the same table
```

**Test without RLS:**
```sql
-- Temporarily disable RLS to test queries
ALTER TABLE my_table DISABLE ROW LEVEL SECURITY;

-- Run your query
SELECT * FROM my_table;

-- Re-enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
```

### Tools That Help

**Supabase Studio:**
- Shows RLS policies in UI
- Can test policies as different users
- Displays policy errors clearly

**pgAdmin:**
- View policy definitions
- Explain query plans (shows policy evaluation)

---

## When to Use SECURITY DEFINER

### ✅ Good Use Cases
- Breaking RLS recursion in policy checks
- Accessing auth.users table (not accessible to regular users)
- Complex permission checks that need elevated access
- Audit logging that shouldn't be restricted by RLS

### ❌ Bad Use Cases
- Bypassing security checks entirely
- Letting users access data they shouldn't see
- Performance optimization (use views or materialized views instead)

---

## Related Migrations

- **003_household_system.sql** - Initial implementation (had recursion bug)
- **005_fix_rls_with_security_definer.sql** - Fixed recursion with SECURITY DEFINER
- **007_add_user_email_lookup.sql** - Another SECURITY DEFINER example (accessing auth.users)
- **008_fix_family_members_rls.sql** - Extended fix to family_members table

---

## Further Reading

- [PostgreSQL SECURITY DEFINER Documentation](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL search_path Security](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
