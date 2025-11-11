# Phase 1: Multi-User Shared Datasets

## Overview
Enable 2 or more users to share one dataset (transactions, budgets, family members).

## Database Changes

### 1. New `households` Table
```sql
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
```

### 2. New `household_members` Table (Join Table)
```sql
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- One user can only be in one household (for now)
  CONSTRAINT unique_user_household UNIQUE(user_id)
);
```

### 3. Add `household_id` to Existing Tables
- `transactions` → add `household_id UUID REFERENCES households(id)`
- `personal_budgets` → add `household_id UUID REFERENCES households(id)`
- `monthly_budgets` → add `household_id UUID REFERENCES households(id)`
- `budget_adjustments` → add `household_id UUID REFERENCES households(id)`
- `family_members` → add `household_id UUID REFERENCES households(id)`

### 4. Update RLS Policies
Change from:
```sql
USING ((SELECT auth.uid()) = user_id)
```

To:
```sql
USING (
  household_id IN (
    SELECT household_id 
    FROM household_members 
    WHERE user_id = auth.uid()
  )
)
```

## Migration Strategy

### Option A: Fresh Start (Easier, but loses data)
1. Drop existing tables
2. Create new schema with household support
3. Users start fresh

### Option B: Data Migration (Preserves existing data)
1. Create new tables (`households`, `household_members`)
2. Add `household_id` columns to existing tables (nullable initially)
3. For each existing user:
   - Create a household
   - Add user as owner
   - Update all their records with household_id
4. Make `household_id` NOT NULL
5. Update RLS policies
6. Remove old `user_id`-based policies

## UI Changes Needed

### 1. Household Management Page
- View current household name and members
- Invite new members (email)
- Remove members (admin/owner only)
- Leave household

### 2. Invitation System
- Generate invitation codes/links
- Accept invitation flow
- Email notifications (optional)

### 3. Member Indicators
- Show which household member made each transaction
- Display household name in header

## Implementation Steps

### Step 1: Database Migration (THIS STEP)
- [ ] Create migration file `003_household_system.sql`
- [ ] Create `households` table
- [ ] Create `household_members` table
- [ ] Add `household_id` to all existing tables
- [ ] Create migration script to assign existing users to individual households
- [ ] Update all RLS policies
- [ ] Test with multiple users

### Step 2: Backend Services (Phase 1b)
- [ ] Create `householdService.ts`
- [ ] Add methods: createHousehold, inviteMember, removeMember, leaveHousehold
- [ ] Update existing services to use household_id
- [ ] Test all CRUD operations

### Step 3: UI Components (Phase 1c)
- [ ] Create `HouseholdSettings` component
- [ ] Create `InviteMember` modal
- [ ] Create `HouseholdMembersList` component
- [ ] Add household indicator to header
- [ ] Test user flows

## Rollback Plan
Keep backup of database before migration. If issues arise:
1. Restore from backup
2. Revert migration
3. Keep operating in single-user mode

## Next Phases
- **Phase 2**: User Roles (owner, admin, member with different permissions)
- **Phase 3**: Associate Family Members with User Accounts
