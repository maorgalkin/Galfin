# 🐛 Bug Fix: Family Member UUID Issue

## Problem
**Error**: `invalid input syntax for type uuid: "Maor"`

When adding transactions, the app was passing the family member's **name** (string) instead of their **ID** (UUID) to the database, causing a type mismatch error.

## Root Cause
The `<select>` elements in AddTransaction and EditTransactionModal were using `member.name` as the value instead of `member.id`:

```tsx
// WRONG ❌
<option key={member.id} value={member.name}>{member.name}</option>

// CORRECT ✅
<option key={member.id} value={member.id}>{member.name}</option>
```

## Files Fixed

### 1. **src/components/AddTransaction.tsx** (Line 297)
- Changed select option value from `member.name` to `member.id`
- Now passes UUID to database

### 2. **src/components/EditTransactionModal.tsx** (Line 190)
- Changed select option value from `member.name` to `member.id`
- Ensures edit operations use correct ID

### 3. **src/components/Dashboard.tsx** (Line 412)
- Added lookup to display family member name from ID
- Changed from `t.familyMember` to `familyMembers.find(m => m.id === t.familyMember)?.name`
- Shows "Unknown" if member not found

### 4. **src/pages/OlderTransactions.tsx** (Lines 95, 151, 235)
- Added `familyMembers` to useFinance hook
- Updated search filter to lookup name from ID
- Fixed both desktop and mobile views to display name instead of UUID

## Testing
Try adding a transaction now:
1. Select a family member from dropdown
2. Fill in other details
3. Submit
4. ✅ Transaction should be added successfully
5. ✅ Family member name should display correctly in transaction list

## Technical Details

### Database Schema
```sql
family_member_id uuid references public.family_members(id)
```
The `family_member_id` column expects a UUID, not a string name.

### Data Flow
1. **Form**: User selects family member → Stores UUID in form state
2. **Submission**: UUID sent to Supabase
3. **Storage**: UUID stored in `transactions.family_member_id`
4. **Display**: UUID looked up in `familyMembers` array to show name

### Lookup Pattern
```tsx
const memberName = t.familyMember 
  ? familyMembers.find(m => m.id === t.familyMember)?.name 
  : '';
```

This pattern:
- Checks if `familyMember` ID exists
- Finds the matching member object
- Extracts the `name` property
- Falls back to empty string if not found

## Prevention
This issue occurred because:
1. Originally the app used localStorage with name-based references
2. During Supabase migration, the database uses UUID foreign keys
3. The form components weren't updated to match

**Lesson**: When migrating from simple storage to relational database, ensure all references use proper IDs (UUIDs) instead of display values.

## Status
✅ **FIXED** - All components now properly handle family member UUIDs
