# Budget Adjustment & Tracking System - Implementation Plan

**Version:** 2.0  
**Date:** October 25, 2025  
**Status:** AWAITING APPROVAL

---

## 🎯 Executive Summary

Transform Galfin into an intelligent budget management system that tracks monthly budget adjustments, maintains historical context, and enables future insights/gamification features.

### Key Objectives:
1. **Monthly Budget Versioning** - Each month has its own budget configuration
2. **Personal vs Adjusted Budgets** - Track original baseline vs. monthly adjustments
3. **Forward-Looking Adjustments** - Schedule budget changes for next month
4. **Change Tracking** - Monitor how often categories are adjusted
5. **Future Insights Foundation** - Data structure to support analytics and gamification

---

## 📊 Core Concepts

### Budget Types

1. **Personal Budget (Baseline)**
   - User's ideal/target budget configuration
   - Serves as the reference point for all comparisons
   - Updated only when user explicitly adjusts "next month" settings
   - Stored as a template in `personal_budgets` table

2. **Adjusted Budget (Active Monthly)**
   - The actual budget in use for a specific month
   - May differ from Personal Budget due to one-time circumstances
   - Stored per month in `monthly_budgets` table
   - Inherits from Personal Budget by default

3. **Budget Adjustment (Scheduled)**
   - Changes scheduled to take effect on the 1st of next month
   - When activated, becomes the new Personal Budget
   - Stored in `budget_adjustments` table

### Change Tracking

- Track number of times each category has been adjusted
- Track adjustment reasons (optional text field)
- Track adjustment magnitude (increase/decrease)
- Enable future "budget discipline" insights

---

## 🗄️ Database Schema Changes

### New Tables

#### 1. `personal_budgets`
```sql
CREATE TABLE personal_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  version INT DEFAULT 1,
  name TEXT DEFAULT 'Personal Budget',
  categories JSONB NOT NULL,  -- Same structure as current budget_configs
  global_settings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT one_active_per_user UNIQUE(user_id, is_active) WHERE is_active = true
);

-- RLS policies
ALTER TABLE personal_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal budgets"
  ON personal_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal budgets"
  ON personal_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal budgets"
  ON personal_budgets FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 2. `monthly_budgets`
```sql
CREATE TABLE monthly_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  personal_budget_id UUID REFERENCES personal_budgets(id),
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  categories JSONB NOT NULL,
  global_settings JSONB NOT NULL,
  adjustment_count INT DEFAULT 0,  -- How many times adjusted from personal budget
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_month UNIQUE(user_id, year, month)
);

-- RLS policies
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly budgets"
  ON monthly_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly budgets"
  ON monthly_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly budgets"
  ON monthly_budgets FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 3. `budget_adjustments`
```sql
CREATE TABLE budget_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category_name TEXT NOT NULL,
  current_limit DECIMAL(10, 2) NOT NULL,
  adjustment_type TEXT CHECK (adjustment_type IN ('increase', 'decrease')),
  adjustment_amount DECIMAL(10, 2) NOT NULL,
  new_limit DECIMAL(10, 2) NOT NULL,
  effective_year INT NOT NULL,
  effective_month INT NOT NULL,
  reason TEXT,  -- Optional: why this adjustment?
  is_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  
  CONSTRAINT unique_pending_adjustment UNIQUE(user_id, category_name, effective_year, effective_month, is_applied) WHERE is_applied = false
);

-- RLS policies
ALTER TABLE budget_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget adjustments"
  ON budget_adjustments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget adjustments"
  ON budget_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget adjustments"
  ON budget_adjustments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget adjustments"
  ON budget_adjustments FOR DELETE
  USING (auth.uid() = user_id);
```

#### 4. `category_adjustment_history`
```sql
CREATE TABLE category_adjustment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category_name TEXT NOT NULL,
  adjustment_count INT DEFAULT 0,
  last_adjusted_at TIMESTAMPTZ,
  total_increased_amount DECIMAL(10, 2) DEFAULT 0,
  total_decreased_amount DECIMAL(10, 2) DEFAULT 0,
  
  CONSTRAINT unique_user_category UNIQUE(user_id, category_name)
);

-- RLS policies
ALTER TABLE category_adjustment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adjustment history"
  ON category_adjustment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adjustment history"
  ON category_adjustment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own adjustment history"
  ON category_adjustment_history FOR UPDATE
  USING (auth.uid() = user_id);
```

### Modified Tables

#### Update `budget_configs` (if still needed)
- This table might become redundant or serve as a temporary workspace
- Consider deprecating in favor of `personal_budgets` and `monthly_budgets`

---

## 🎨 UI/UX Changes

### 1. Budget Settings Modal Enhancements

#### Current View Additions:
- **Header Badge**: Show "Personal Budget" vs "October 2025 Budget"
- **Comparison Indicator**: Small badge showing "3 categories adjusted" if different from personal

#### Category Card Enhancements:
Each category card gets additional controls when viewing monthly budget:

```
┌─────────────────────────────────────────────────────┐
│ 🍽️ Food & Dining                          [Active] │
├─────────────────────────────────────────────────────┤
│ Monthly Limit: ₪2,500                               │
│ Personal Budget: ₪2,500 ✓ (no change)              │
│ Warning Threshold: 80%                              │
│                                                     │
│ ☑ Adjust Next Month's Limit                        │
│   ┌─────────────────────────────────────┐          │
│   │ [−] Amount: 500  [+]                │          │
│   │ New Limit: ₪3,000                   │          │
│   │ Reason (optional):                  │          │
│   │ [Holiday season entertaining]       │          │
│   └─────────────────────────────────────┘          │
│                                                     │
│ Adjusted 3 times this year                         │
└─────────────────────────────────────────────────────┘
```

#### New Toggle/Controls:
- **"Adjust Next Month's Limit"** checkbox
- **+/− buttons** for quick adjustments (increment by 100)
- **Amount input** field for precise control
- **New Limit preview** (calculated in real-time)
- **Reason input** (optional text field)
- **Adjustment history badge** ("Adjusted 3 times")

### 2. Budget View Switcher

New dropdown in Budget Settings header:
```
┌─────────────────────────────────────┐
│ View Budget:                        │
│ [ October 2025 (Current)      ▼ ]  │
│   ├── Personal Budget (Baseline)    │
│   ├── October 2025 (Current)        │
│   ├── November 2025 (Scheduled)     │
│   ├── September 2025               │
│   └── August 2025                  │
└─────────────────────────────────────┘
```

### 3. Comparison View

New tab in Budget Settings Modal:
- **Visual Tab** (existing)
- **JSON Tab** (existing)
- **Comparison Tab** (NEW)

Shows side-by-side:
```
Personal Budget  →  October 2025
────────────────────────────────
Food & Dining
₪2,500          →  ₪3,000 (+20%)
Groceries
₪2,000          →  ₪2,000 (no change)
```

### 4. Pending Adjustments Banner

If user has scheduled adjustments for next month:
```
┌─────────────────────────────────────────────────────┐
│ ⏰ You have 3 adjustments scheduled for Nov 2025    │
│    These will become your new Personal Budget       │
│    [View Scheduled Changes]  [Cancel All]          │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Backend Services Changes

### 1. New Service: `PersonalBudgetService`

**File:** `src/services/personalBudgetService.ts`

```typescript
class PersonalBudgetService {
  // Get active personal budget for user
  async getPersonalBudget(): Promise<PersonalBudget>
  
  // Create initial personal budget (onboarding)
  async createPersonalBudget(config: BudgetConfiguration): Promise<PersonalBudget>
  
  // Update personal budget (creates new version)
  async updatePersonalBudget(config: BudgetConfiguration): Promise<PersonalBudget>
  
  // Get all personal budget versions
  async getBudgetHistory(): Promise<PersonalBudget[]>
}
```

### 2. New Service: `MonthlyBudgetService`

**File:** `src/services/monthlyBudgetService.ts`

```typescript
class MonthlyBudgetService {
  // Get budget for specific month (creates from personal if doesn't exist)
  async getMonthlyBudget(year: number, month: number): Promise<MonthlyBudget>
  
  // Get current month's budget
  async getCurrentMonthBudget(): Promise<MonthlyBudget>
  
  // Create monthly budget from personal budget
  async createMonthlyBudget(year: number, month: number): Promise<MonthlyBudget>
  
  // Update specific month's budget (one-time adjustment)
  async updateMonthlyBudget(monthlyBudget: MonthlyBudget): Promise<MonthlyBudget>
  
  // Compare monthly budget to personal budget
  async compareToPersonal(year: number, month: number): Promise<BudgetComparison>
}
```

### 3. New Service: `BudgetAdjustmentService`

**File:** `src/services/budgetAdjustmentService.ts`

```typescript
class BudgetAdjustmentService {
  // Schedule adjustment for next month
  async scheduleAdjustment(adjustment: BudgetAdjustment): Promise<void>
  
  // Get all pending adjustments for a month
  async getPendingAdjustments(year: number, month: number): Promise<BudgetAdjustment[]>
  
  // Cancel scheduled adjustment
  async cancelAdjustment(adjustmentId: string): Promise<void>
  
  // Apply scheduled adjustments (called on 1st of month)
  async applyScheduledAdjustments(year: number, month: number): Promise<void>
  
  // Get adjustment history for category
  async getCategoryHistory(categoryName: string): Promise<CategoryHistory>
}
```

### 4. Background Job: Monthly Budget Initialization

**File:** `src/services/backgroundJobs.ts`

```typescript
// Supabase Edge Function or cron job
async function initializeMonthlyBudgets() {
  // On the 1st of each month:
  // 1. Get all users
  // 2. For each user:
  //    a. Check for pending adjustments
  //    b. If adjustments exist, apply them to personal budget
  //    c. Create new monthly budget from updated personal budget
  //    d. Record adjustment history
}
```

---

## 📱 Component Changes

### 1. `BudgetSettings.tsx` (Major Update)

**New Features:**
- Budget view switcher dropdown
- Month selector for historical viewing
- Comparison mode toggle
- Pending adjustments banner

### 2. New Component: `CategoryAdjustmentControl.tsx`

**Purpose:** Render the "Adjust Next Month's Limit" toggle and controls

**Props:**
```typescript
interface CategoryAdjustmentControlProps {
  categoryName: string;
  currentLimit: number;
  personalLimit: number;
  onScheduleAdjustment: (adjustment: BudgetAdjustment) => void;
  existingAdjustment?: BudgetAdjustment;
}
```

### 3. New Component: `BudgetComparisonView.tsx`

**Purpose:** Show side-by-side comparison of Personal vs Monthly budget

**Features:**
- Visual diff highlighting
- Percentage change indicators
- Color coding (green=decrease, red=increase)

### 4. New Component: `PendingAdjustmentsBanner.tsx`

**Purpose:** Alert user to scheduled changes

**Features:**
- Count of pending adjustments
- Next effective date
- Quick actions (view, cancel all)

### 5. Update: `CategoryCard.tsx`

**New Props:**
- `adjustmentCount: number` - How many times adjusted
- `personalLimit?: number` - Baseline for comparison
- `onScheduleAdjustment?: (adjustment) => void` - Handler for scheduling

---

## 🔄 Data Migration Strategy

### Phase 1: Schema Creation
1. Create new tables in Supabase
2. Set up RLS policies
3. Create indexes for performance

### Phase 2: Data Migration
1. For each user in `budget_configs`:
   - Create `personal_budgets` record
   - Create `monthly_budgets` for current month
2. Keep `budget_configs` as fallback during transition

### Phase 3: Application Update
1. Update services to use new tables
2. Update components to show new features
3. Test with existing users

### Phase 4: Cleanup
1. Archive `budget_configs` table
2. Remove legacy code paths

---

## 🧪 Testing Strategy

### Unit Tests

1. **PersonalBudgetService**
   - Create/update personal budget
   - Version management
   - Active budget selection

2. **MonthlyBudgetService**
   - Create from personal budget
   - Update monthly budget
   - Comparison logic

3. **BudgetAdjustmentService**
   - Schedule adjustments
   - Apply adjustments
   - History tracking

### Integration Tests

1. **Full Adjustment Flow**
   - User schedules adjustment for next month
   - System applies on 1st of month
   - Personal budget updated
   - History recorded

2. **Multiple Users**
   - Each user has isolated budgets
   - RLS prevents data leakage

### UI Tests

1. **Category Adjustment Control**
   - Toggle enables/disables controls
   - Amount validation
   - Preview calculation

2. **Budget Comparison**
   - Shows differences accurately
   - Highlights adjusted categories

---

## 📈 Future Insights Foundation

### Data Collection (Ready for Phase 2)

The new schema enables future analytics:

1. **Budget Discipline Score**
   - Track adjustments vs. adherence
   - Reward users who stick to personal budget

2. **Category Trends**
   - Which categories adjusted most often
   - Seasonal patterns (holiday spending)

3. **Savings Insights**
   - Months where spending < budget
   - Accumulation tracking

4. **Gamification**
   - Achievements for budget adherence
   - Streaks for staying under budget
   - Peer comparisons (anonymized)

### Insights Dashboard (Future)
```
┌──────────────────────────────────────┐
│ 🎯 Your Budget Performance           │
├──────────────────────────────────────┤
│ Budget Discipline Score: 85/100 🌟   │
│                                      │
│ This Month:                          │
│ ✓ On track in 8/10 categories       │
│ ⚠ Over in 2 categories              │
│                                      │
│ Achievements:                        │
│ 🏆 3 months under budget streak      │
│ 💰 Saved ₪1,500 vs. Personal Budget  │
└──────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Database & Core Services (Week 1)
- [ ] Create database schema
- [ ] Write migration scripts
- [ ] Implement PersonalBudgetService
- [ ] Implement MonthlyBudgetService
- [ ] Implement BudgetAdjustmentService
- [ ] Write unit tests

### Phase 2: UI Components (Week 2)
- [ ] Update BudgetSettings modal
- [ ] Create CategoryAdjustmentControl
- [ ] Create BudgetComparisonView
- [ ] Create PendingAdjustmentsBanner
- [ ] Update CategoryCard
- [ ] Write component tests

### Phase 3: Integration & Background Jobs (Week 3)
- [ ] Implement monthly initialization job
- [ ] Connect UI to services
- [ ] Test full adjustment flow
- [ ] Migration for existing users
- [ ] Integration tests

### Phase 4: Polish & Documentation (Week 4)
- [ ] User documentation
- [ ] Admin documentation
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Final testing

---

## 📋 Acceptance Criteria

### Must Have
- ✅ Users can view Personal Budget (baseline)
- ✅ Users can view current month's budget
- ✅ Users can schedule adjustments for next month
- ✅ Adjustments auto-apply on 1st of month
- ✅ Personal budget updates when adjustments applied
- ✅ Category adjustment count tracked
- ✅ All existing functionality preserved

### Should Have
- ✅ Comparison view (Personal vs Monthly)
- ✅ Adjustment history per category
- ✅ Pending adjustments banner
- ✅ Optional adjustment reason field

### Nice to Have
- ⭐ Budget version history (all past personal budgets)
- ⭐ Bulk adjustment (adjust all categories)
- ⭐ Template suggestions based on history
- ⭐ Undo recent adjustment

---

## 🎯 Success Metrics

1. **Technical**
   - All tests passing
   - No performance degradation
   - Database queries optimized (< 100ms)

2. **User Experience**
   - Adjustment flow < 3 clicks
   - Clear visual feedback
   - No confusion about which budget is active

3. **Data Quality**
   - 100% of adjustments tracked
   - Complete audit trail
   - Accurate comparison calculations

---

## ⚠️ Risks & Mitigation

### Risk 1: Data Migration Complexity
- **Mitigation:** Phased rollout, keep old system as fallback

### Risk 2: Monthly Job Failure
- **Mitigation:** Manual trigger option, monitoring alerts

### Risk 3: User Confusion
- **Mitigation:** Clear labeling, tooltips, onboarding guide

### Risk 4: Performance with Historical Data
- **Mitigation:** Pagination, lazy loading, database indexing

---

## 🔐 Security Considerations

1. **RLS Policies:** All new tables have proper RLS
2. **User Isolation:** Each user sees only their data
3. **Validation:** Server-side validation for all adjustments
4. **Audit Trail:** All changes logged with timestamps

---

## 📚 Documentation Updates

1. **COMPLETE_FEATURE_SUMMARY.md**
   - Add Budget Versioning section
   - Add Adjustment Tracking section

2. **SUPABASE_BRINGUP.md**
   - Add new table creation steps
   - Add RLS policy setup

3. **TEST_DOCUMENTATION.md**
   - Add new test suites

4. **New: BUDGET_ADJUSTMENT_GUIDE.md**
   - User guide for adjustment features
   - FAQ section

---

## 🎬 Next Steps

**AWAITING YOUR APPROVAL**

Once approved, I will:
1. ✅ Create database migration scripts
2. ✅ Implement core services
3. ✅ Build UI components
4. ✅ Write comprehensive tests
5. ✅ Update documentation
6. ✅ Deploy to production

**Estimated Timeline:** 3-4 weeks for complete implementation

---

**Questions? Concerns? Suggestions?**

Please review this plan and provide feedback before we begin implementation!
