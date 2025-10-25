# Debugging: Adding Transaction Fails

## Quick Checks

### 1. Are you logged in?
- Open http://localhost:5173/
- If you see the login page → **You need to create an account first**
- If you see the dashboard → Continue to step 2

### 2. Check Browser Console
Press **F12** to open DevTools, then click the **Console** tab.

Look for error messages when you try to add a transaction:

#### Possible Errors:

**Error: "User not authenticated"**
- **Cause**: You're not logged in or session expired
- **Fix**: Sign out and sign back in

**Error: "Failed to add transaction: new row violates row-level security policy"**
- **Cause**: RLS policies not set up in Supabase
- **Fix**: Run the RLS SQL script from STEP_1_COMPLETE.md section 2.3

**Error: "relation 'public.transactions' does not exist"**
- **Cause**: Database tables not created
- **Fix**: Run the database setup SQL script from STEP_1_COMPLETE.md section 2.2

**Error: "column 'user_id' does not exist"**
- **Cause**: Table schema is wrong
- **Fix**: Drop the table and re-run the setup script

### 3. Check Network Tab
In DevTools, click the **Network** tab:
- Try adding a transaction
- Look for a request to Supabase (starts with your project URL)
- Click on it to see the response
- Red responses indicate errors

### 4. Verify Database Setup

Go to your Supabase dashboard:
https://supabase.com/dashboard/project/kbhqoiwqoscagryrqiox

#### Check Tables:
1. Click **"Table Editor"** in sidebar
2. Verify these tables exist:
   - ✅ transactions
   - ✅ budget_configs
   - ✅ budget_categories
   - ✅ family_members
   - ✅ budgets

#### Check RLS Policies:
1. Click on the **transactions** table
2. Click the **"Policies"** tab
3. You should see 4 policies:
   - ✅ Users can view their own transactions
   - ✅ Users can insert their own transactions
   - ✅ Users can update their own transactions
   - ✅ Users can delete their own transactions

### 5. Test Authentication

Open browser console and run:
```javascript
// Check if user is logged in
console.log('User:', window.localStorage.getItem('sb-kbhqoiwqoscagryrqiox-auth-token'))
```

If this returns `null`, you're not authenticated.

## Common Solutions

### Solution 1: Create Account First
1. Visit http://localhost:5173/
2. Click "Create an account"
3. Register with email/password
4. **Check your email** for verification link
5. Click the link to verify
6. Sign in to the app
7. Try adding transaction again

### Solution 2: Run Database Setup
If you haven't run the SQL scripts:

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/kbhqoiwqoscagryrqiox/sql
2. Run the database setup script (STEP_1_COMPLETE.md section 2.2)
3. Run the RLS policies script (STEP_1_COMPLETE.md section 2.3)
4. Refresh the app and try again

### Solution 3: Check Email Verification
Supabase requires email verification by default:

1. Check your spam folder for Supabase email
2. Click the verification link
3. Return to app and sign in
4. Try adding transaction

### Solution 4: Clear and Restart
Sometimes the session gets stuck:

1. Sign out from the app
2. Clear browser localStorage:
   ```javascript
   localStorage.clear()
   ```
3. Refresh the page
4. Sign in again
5. Try adding transaction

## Still Not Working?

Share the error message from the browser console (F12 → Console tab) and I can help diagnose the specific issue.

### Information to Share:
1. What error appears in console?
2. Are you logged in? (See the dashboard with user email in navbar?)
3. Did you run both SQL scripts in Supabase?
4. Does the transactions table exist in Table Editor?
5. Are there RLS policies on the transactions table?
