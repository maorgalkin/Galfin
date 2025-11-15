# Admin Utilities for Galfin

This directory contains SQL scripts for administrative tasks that should be run directly in the Supabase SQL Editor.

## 📋 Available Scripts

### 1. `admin_list_users.sql` - View All Users and Households

**Purpose:** Get a comprehensive overview of all users, their households, and membership status.

**Usage:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire `admin_list_users.sql` file
3. Run the script

**What It Shows:**
- ✅ Quick view of all users with household count
- ✅ Detailed view with household names and roles
- ⚠️ Users without households (orphaned users)
- ✅ Household statistics (members, budgets, transactions)
- ✅ Single-member households (safe to delete)

**Example Output:**
```
user_id                              | email           | household_count | household_status
-------------------------------------|-----------------|-----------------|------------------
5e84ffa6-a3c6-4771-86a2-5ec886e45e82 | user@email.com  | 1               | ✓ Single Household
```

---

### 2. `admin_remove_user.sql` - Safely Remove a User

**Purpose:** Completely remove a user from the system, handling ownership transfer and data cleanup.

**⚠️ WARNING:** This action is **IRREVERSIBLE**. All user data will be permanently deleted.

**Usage:**

1. **First, identify the user** using `admin_list_users.sql`
2. Open `admin_remove_user.sql`
3. **Replace the user ID** on line 17:
   ```sql
   user_id_to_remove UUID := 'REPLACE_WITH_USER_ID';
   ```
   Change to:
   ```sql
   user_id_to_remove UUID := '5e84ffa6-a3c6-4771-86a2-5ec886e45e82';
   ```
4. Copy the entire script
5. Paste into Supabase SQL Editor
6. **Review the output** before confirming
7. Run the script

**What It Does:**

#### Case 1: User is Sole Member of Household
- ✅ Deletes entire household
- ✅ Cascade deletes all related data:
  - All transactions
  - All personal budgets
  - All monthly budgets
  - All family members
  - All budget adjustments
- ✅ Deletes user account

#### Case 2: User is Creator/Owner (Multi-member Household)
- ✅ Transfers ownership to earliest joined member
- ✅ Removes user from household
- ✅ Preserves all household data
- ✅ Deletes user account

#### Case 3: User is Regular Member
- ✅ Removes user from household
- ✅ Preserves all household data
- ✅ Deletes user account

**Example Output:**
```
=================================================================
Starting safe removal of user: user@email.com (ID: 5e84ffa6...)
=================================================================

Processing Household: User's Household (ID: abc123...)
  - Member count: 3
  - User role: participant
  - Is sole member: false
  - Action: Transferring ownership (user is creator)
  ✓ Ownership transferred to: other@email.com (ID: def456...)
  ✓ User removed from household members

Cleaning up personal data...
✓ Personal data cleanup complete

Deleting user account from authentication system...
✓ User account deleted

=================================================================
USER REMOVAL COMPLETE
=================================================================
User: user@email.com (ID: 5e84ffa6...)
Households processed: 1

All data associated with this user has been safely removed.
Ownership has been transferred where applicable.
=================================================================
```

**Verification:**

After removal, uncomment and run the verification block at the bottom of the script:
```sql
DO $$
DECLARE
  user_id_check UUID := 'USER_ID_YOU_JUST_REMOVED';
  -- ... verification code ...
END $$;
```

This will confirm the user is completely removed from all tables.

---

## 🔒 Safety Features

### Ownership Transfer Logic
When removing a user who created a household:
1. Script finds the **earliest added member** (oldest `created_at`)
2. Updates `households.created_by` to new owner
3. Preserves all household data
4. Removes the user cleanly

### Cascade Deletion Protection
- Database is configured with `ON DELETE CASCADE` on foreign keys
- Deleting a household automatically removes:
  - Household members
  - Transactions
  - Personal budgets
  - Monthly budgets
  - Budget adjustments
  - Family members
- No orphaned data is left behind

### Error Handling
- Script validates user exists before starting
- Checks for new owner availability
- Rolls back on any errors
- Provides detailed error messages

---

## 📊 Common Use Cases

### Finding Orphaned Users
Run `admin_list_users.sql` and look for the "Users Without Households" section.

Expected result after Migration 011: **No rows** (all users should have households)

### Before Removing a Test User
1. Run `admin_list_users.sql` to see user's households
2. Check if user is sole member or creator
3. If creator with multiple members, note who will become new owner
4. Run `admin_remove_user.sql` with user ID

### Cleaning Up Old Accounts
```sql
-- Find users who haven't confirmed email (modify admin_list_users.sql)
SELECT id, email, created_at
FROM auth.users
WHERE confirmed_at IS NULL
  AND created_at < NOW() - INTERVAL '30 days';
```

Then remove them individually using `admin_remove_user.sql`.

---

## 🚨 Important Notes

### Permissions Required
- These scripts require **admin/service role** access to Supabase
- They bypass Row Level Security (RLS) policies
- **Never expose these scripts in client-side code**

### Data Retention
- No backup is created automatically
- Consider exporting data before removal if needed
- Supabase Dashboard → SQL Editor → Export

### Multi-Household Users
If a user belongs to multiple households:
- Script processes **all households**
- Transfers ownership for each household where user is creator
- Removes user from all households
- Reports on each household separately

### Performance
- Scripts are optimized for small-to-medium databases
- For bulk operations (>1000 users), consider batching
- Use `RAISE NOTICE` output to track progress

---

## 🔄 Related Migrations

### Migration 009: Auto-Create Household for New Users
- Automatically creates households for new signups
- Prevents orphaned users going forward

### Migration 011: Fix Missing Households (This File)
- One-time migration to fix existing users
- Should be run once after deployment
- Safe to run multiple times (idempotent)

---

## 📚 Additional Resources

- [Supabase SQL Editor](https://supabase.com/docs/guides/database/sql-editor)
- [PostgreSQL PL/pgSQL Documentation](https://www.postgresql.org/docs/current/plpgsql.html)
- Project Documentation: `/docs/COMPLETE_FEATURE_SUMMARY.md`
- Database Schema: `/supabase/migrations/`

---

## ⚠️ Troubleshooting

### "User not found" Error
- Verify user ID is correct
- Check if user was already deleted
- Run `admin_list_users.sql` to find correct ID

### "Cannot find new owner" Error
- This shouldn't happen if household has multiple members
- Check household_members table manually
- May indicate data corruption

### Script Times Out
- Large households with many transactions may take time
- Run during low-traffic periods
- Consider increasing statement timeout in Supabase settings

---

## 📝 License

These admin utilities are part of the Galfin project and follow the same license terms.
