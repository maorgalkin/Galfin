# 🚀 Supabase Setup Guide for Galfin

## Prerequisites
- ✅ Supabase client library installed (`@supabase/supabase-js`)
- 📧 Email address for Supabase account
- 🌐 Internet connection

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email
4. Verify your email

### 1.2 Create New Project
1. Click "New Project"
2. Choose your organization (or create one)
3. **Project Name**: `galfin-finance` (or your preference)
4. **Database Password**: Generate a strong password (SAVE THIS!)
5. **Region**: Choose closest to you (e.g., "West US" or "East US")
6. Click "Create new project"
7. ⏳ Wait 2-3 minutes for project initialization

### 1.3 Get Your API Credentials
Once project is ready:
1. Go to **Settings** → **API** (in left sidebar)
2. Copy these two values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)

## Step 2: Configure Environment Variables

### 2.1 Create `.env` File
In your project root (`c:\Users\mgalkin\repos\Galfin`), create a file named `.env`:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Replace** `your_project_url_here` and `your_anon_key_here` with values from Step 1.3

### 2.2 Add `.env` to `.gitignore`
Make sure `.env` is in your `.gitignore` file (it should already be there for Vite projects)

## Step 3: Create Database Tables

### 3.1 Open SQL Editor
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New query"

### 3.2 Run Database Setup Script
Copy and paste this SQL script (creates all tables with proper relationships):

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table is automatically created by Supabase Auth
-- We'll reference it as auth.users

-- Budget Configurations Table
create table public.budget_configs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  currency varchar(3) default 'USD' not null,
  warning_notifications boolean default true,
  email_alerts boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Budget Categories Table
create table public.budget_categories (
  id uuid default uuid_generate_v4() primary key,
  budget_config_id uuid references public.budget_configs(id) on delete cascade not null,
  category_name varchar(100) not null,
  monthly_limit decimal(10,2) not null,
  warning_threshold integer default 80,
  is_active boolean default true,
  color varchar(7),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(budget_config_id, category_name)
);

-- Family Members Table
create table public.family_members (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name varchar(100) not null,
  color varchar(7) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions Table
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  family_member_id uuid references public.family_members(id) on delete set null,
  date date not null,
  description text not null,
  amount decimal(10,2) not null,
  category varchar(100) not null,
  type varchar(10) not null check (type in ('income', 'expense')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Budgets Table (monthly tracking)
create table public.budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category varchar(100) not null,
  budget_amount decimal(10,2) not null,
  spent_amount decimal(10,2) default 0,
  month integer not null check (month >= 1 and month <= 12),
  year integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, category, month, year)
);

-- Create indexes for better query performance
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_date on public.transactions(date);
create index idx_transactions_category on public.transactions(category);
create index idx_budget_configs_user_id on public.budget_configs(user_id);
create index idx_family_members_user_id on public.family_members(user_id);
create index idx_budgets_user_id on public.budgets(user_id);
```

3. Click **"Run"** button
4. ✅ You should see "Success. No rows returned" - this is good!

### 3.3 Set Up Row Level Security (RLS)
This ensures users can ONLY see their own data. Run this script:

```sql
-- Enable Row Level Security on all tables
alter table public.budget_configs enable row level security;
alter table public.budget_categories enable row level security;
alter table public.family_members enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

-- Budget Configs Policies
create policy "Users can view their own budget config"
  on public.budget_configs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own budget config"
  on public.budget_configs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own budget config"
  on public.budget_configs for update
  using (auth.uid() = user_id);

-- Budget Categories Policies
create policy "Users can view their own budget categories"
  on public.budget_categories for select
  using (
    exists (
      select 1 from public.budget_configs
      where budget_configs.id = budget_categories.budget_config_id
      and budget_configs.user_id = auth.uid()
    )
  );

create policy "Users can insert their own budget categories"
  on public.budget_categories for insert
  with check (
    exists (
      select 1 from public.budget_configs
      where budget_configs.id = budget_categories.budget_config_id
      and budget_configs.user_id = auth.uid()
    )
  );

create policy "Users can update their own budget categories"
  on public.budget_categories for update
  using (
    exists (
      select 1 from public.budget_configs
      where budget_configs.id = budget_categories.budget_config_id
      and budget_configs.user_id = auth.uid()
    )
  );

create policy "Users can delete their own budget categories"
  on public.budget_categories for delete
  using (
    exists (
      select 1 from public.budget_configs
      where budget_configs.id = budget_categories.budget_config_id
      and budget_configs.user_id = auth.uid()
    )
  );

-- Family Members Policies
create policy "Users can view their own family members"
  on public.family_members for select
  using (auth.uid() = user_id);

create policy "Users can insert their own family members"
  on public.family_members for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own family members"
  on public.family_members for update
  using (auth.uid() = user_id);

create policy "Users can delete their own family members"
  on public.family_members for delete
  using (auth.uid() = user_id);

-- Transactions Policies
create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Budgets Policies
create policy "Users can view their own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);
```

## Step 4: Configure Email Authentication

### 4.1 Enable Email Authentication
1. Go to **Authentication** → **Providers** (left sidebar)
2. Ensure **Email** is enabled (should be by default)
3. Configure email templates if desired

### 4.2 Configure Email Settings (Optional)
For production, you'll want to configure SMTP for custom emails:
1. Go to **Settings** → **Auth**
2. Scroll to "SMTP Settings"
3. Configure your email provider (Gmail, SendGrid, etc.)

For development, Supabase's default email works fine!

## Step 5: Test Your Setup

### 5.1 Verify Tables Created
1. Go to **Table Editor** (left sidebar)
2. You should see 5 tables:
   - ✅ budget_configs
   - ✅ budget_categories  
   - ✅ family_members
   - ✅ transactions
   - ✅ budgets

### 5.2 Check RLS Policies
1. Click on any table
2. Click "Policies" tab
3. You should see policies for select, insert, update, delete

## Step 6: Ready for Code Implementation

✅ Your Supabase backend is ready!

Now you can:
- Create the Supabase client in your React app
- Build authentication UI (Login/Register)
- Migrate localStorage data to Supabase
- Add real-time sync across devices

## Next Steps

Refer to the implementation files:
- `src/lib/supabase.ts` - Supabase client configuration
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/pages/auth/` - Login and registration pages

## Troubleshooting

### Issue: "No rows returned" errors
- **Solution**: Check that RLS policies are set up correctly
- **Verify**: Go to SQL Editor and run `SELECT * FROM auth.users;` to see if user exists

### Issue: "Invalid API key"
- **Solution**: Double-check your `.env` file has correct credentials
- **Verify**: Restart dev server after changing `.env`

### Issue: Can't insert data
- **Solution**: Ensure user is authenticated before trying to insert
- **Verify**: Check browser console for Supabase errors

## Resources

- 📚 [Supabase Documentation](https://supabase.com/docs)
- 🎓 [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- 💬 [Supabase Discord Community](https://discord.supabase.com)
- 🎥 [Supabase YouTube Channel](https://www.youtube.com/c/Supabase)

---

**Need help?** Check the Supabase dashboard for real-time logs and debugging information!
