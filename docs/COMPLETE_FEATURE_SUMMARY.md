# 📊 Galfin - Feature Summary

**Last Updated:** November 6, 2025  
**Platform:** Web Application (React + TypeScript + Supabase)

---

## 🎯 Overview

Galfin is a modern family finance tracker for managing income, expenses, and budgets. Features include transaction tracking, budget management with monthly adjustments, visual analytics, and multi-user family support.

---

## 🏗️ Technology Stack

**Frontend:** React 19.1.1, TypeScript 5.8.3, Vite 7.1.2  
**Styling:** Tailwind CSS 4.1.12, Lucide Icons, Framer Motion  
**Charts:** Recharts 3.1.2  
**Backend:** Supabase 2.75.0 (PostgreSQL + Auth + Real-time)  
**Testing:** Vitest 3.2.4, React Testing Library  
**Routing:** React Router DOM 6.30.1

---

## 🎨 Core Features

### 1. Transaction Management
- **Add/Edit/Delete** transactions with full validation
- **Fields:** Description, amount, type (income/expense), category, family member, date
- **Categories:** 13 expense types + 5 income types
- **Filtering:** By date range, type, category, member, amount, search term

### 2. Budget System
- **Personal Budgets:** Template budgets with category limits and settings
- **Monthly Budgets:** Month-specific budgets that can deviate from personal budget
- **Budget Adjustments:** Schedule changes for next month
- **Comparison View:** Personal vs Monthly budget side-by-side
- **Category Management:** Set limits, thresholds, colors, active/inactive status
- **Global Settings:** Currency, family members, notification preferences

### 3. Dashboard & Analytics
- **Summary Cards:** Income, expenses, balance, budget status
- **Month Carousel:** Navigate through last 24 months
- **Charts:** Expense breakdown (pie), Budget vs Actual (bar)
- **Tabs:** Budget Analysis, Transactions, Budget Management

### 4. Family Management
- **Multi-user:** Track transactions by family member
- **Color Coding:** Assign colors to each member
- **Attribution:** Link transactions to specific family members

### 5. Authentication & Security
- **Supabase Auth:** Email/password with verification
- **Row Level Security (RLS):** User data isolation
- **Session Management:** JWT tokens, auto-refresh

---

## 📊 Key Data Models

### PersonalBudget
```typescript
{
  id: string
  user_id: string
  version: number
  name: string
  categories: Record<string, CategoryConfig>
  global_settings: GlobalSettings
  is_active: boolean
  notes?: string
}
```

### MonthlyBudget
```typescript
{
  id: string
  user_id: string
  personal_budget_id: string
  month: string  // "2025-11"
  categories: Record<string, CategoryConfig>
  notes?: string
}
```

### Transaction
```typescript
{
  id: string
  user_id: string
  date: string
  description: string
  amount: number
  category: string
  type: 'income' | 'expense'
  family_member?: string
}
```

---

## 🚀 Development & Testing

### Commands
```bash
npm run dev       # Development server (localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
npm test          # Run tests (watch mode)
npm run test:run  # Run tests once
npm run test:ui   # Interactive test UI
```

### Testing
- **88 tests** across 6 test files (100% pass rate)
- Coverage: Services, components, utilities
- Framework: Vitest + React Testing Library

---

## � Documentation

- `README.md` - Getting started guide
- `SUPABASE_BRINGUP.md` - Backend setup instructions
- `TEST_DOCUMENTATION.md` - Testing guide
- `DEPRECATED_FEATURES.md` - Retired features
- `COMPLETE_FEATURE_SUMMARY.md` - This file

---

## 📈 Roadmap

- [ ] Recurring transactions
- [ ] Bill reminders & notifications
- [ ] Receipt attachments
- [ ] PDF export & reporting
- [ ] Multi-currency with exchange rates
- [ ] Savings goals tracking
- [ ] CSV import/export
- [ ] Mobile app (React Native)
- [ ] AI-powered insights

---

**Repository:** https://github.com/maorgalkin/Galfin  
**License:** MIT
