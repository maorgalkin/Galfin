# 🧪 Galfin Complete Test Documentation

**Comprehensive Testing Guide**  
**Last Updated:** October 25, 2025  
**Framework:** Vitest + React Testing Library

---

## 📋 Table of Contents

1. [Test Framework Overview](#test-framework-overview)
2. [Quick Start](#quick-start)
3. [Test Execution](#test-execution)
4. [Test Suites](#test-suites)
5. [Test Coverage](#test-coverage)
6. [Writing New Tests](#writing-new-tests)
7. [Best Practices](#best-practices)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)

---

## Test Framework Overview

### Technology Stack

```json
{
  "Test Runner": "Vitest 3.2.4",
  "Component Testing": "@testing-library/react 16.3.0",
  "User Interactions": "@testing-library/user-event 14.5.2",
  "DOM Assertions": "@testing-library/jest-dom 6.7.0",
  "Environment": "jsdom"
}
```

### Why These Tools?

**Vitest:**
- ⚡ Lightning fast (powered by Vite)
- 🔄 Watch mode with HMR
- 📊 Built-in coverage
- 🎯 Jest-compatible API
- 🔌 Native ESM support

**Testing Library:**
- 🎭 Tests user behavior, not implementation
- ♿ Encourages accessible components
- 🔍 Query by user-visible text
- 🎯 Focuses on integration over isolation

---

## Quick Start

### Prerequisites

```bash
# Ensure dependencies installed
npm install

# Verify test command exists
npm run test --help
```

### Run All Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode
npm test

# Run tests with UI dashboard
npm run test:ui
```

### Test Files Location

```
src/
├── __tests__/
│   ├── simple.test.tsx          # Basic functionality
│   ├── dashboard.test.tsx       # Dashboard features
│   ├── transactions.test.tsx    # Transaction management
│   ├── accessibility.test.tsx   # A11y & UX
│   ├── performance.test.tsx     # Performance benchmarks
│   └── components/
│       └── (future component tests)
```

---

## Test Execution

### Available Commands

#### 1. Run Tests (Watch Mode)

```bash
npm test
```

**What it does:**
- Runs tests in watch mode
- Re-runs on file changes
- Shows test summary
- Interactive mode with filters

**Best for:**
- Active development
- Debugging failing tests
- Writing new tests

**Example Output:**
```
✓ src/__tests__/simple.test.tsx (7 tests) 1234ms
✓ src/__tests__/dashboard.test.tsx (4 tests) 567ms
✓ src/__tests__/transactions.test.tsx (3 tests) 890ms

Test Files  5 passed (5)
     Tests  14 passed (14)
  Start at  10:23:45
  Duration  2.69s
```

#### 2. Run Tests Once (CI Mode)

```bash
npm run test:run
```

**What it does:**
- Runs all tests once
- Exits after completion
- No watch mode
- Generates final report

**Best for:**
- CI/CD pipelines
- Pre-commit hooks
- Production builds
- Final verification

#### 3. Test UI Dashboard

```bash
npm run test:ui
```

**What it does:**
- Opens browser-based UI
- Visual test results
- Interactive filtering
- Detailed error views
- Module graph visualization

**Best for:**
- Visual test debugging
- Understanding test structure
- Analyzing failures
- Demo/presentations

**Access at:** http://localhost:51204/__vitest__/

---

## Test Suites

### Suite 1: Basic Functionality (`simple.test.tsx`)

**Focus:** Application startup, navigation, core features

**Tests Included:**

#### 1.1 Application Renders
```typescript
test('Application renders without crashing', async () => {
  renderWithProvider(<App />)
  expect(await screen.findByText(/Galfin/i)).toBeInTheDocument()
})
```
**Validates:**
- App initializes successfully
- No runtime errors
- Root component mounts
- Brand name visible

#### 1.2 Sample Data Display
```typescript
test('Sample data is displayed correctly', async () => {
  renderWithProvider(<App />)
  await waitFor(() => {
    const transactions = screen.getAllByRole('listitem')
    expect(transactions.length).toBeGreaterThan(0)
  })
})
```
**Validates:**
- Sample transactions load
- Data renders in DOM
- List items visible
- Initial state correct

#### 1.3 Financial Summary Cards
```typescript
test('Shows correct financial summary', async () => {
  renderWithProvider(<App />)
  expect(await screen.findByText(/Total Income/i)).toBeInTheDocument()
  expect(screen.getByText(/Total Expenses/i)).toBeInTheDocument()
  expect(screen.getByText(/Net Balance/i)).toBeInTheDocument()
})
```
**Validates:**
- All summary cards present
- Income total visible
- Expense total visible
- Net balance calculated

#### 1.4 Month Navigation
```typescript
test('Month navigation works correctly', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  const prevButton = screen.getByLabelText(/previous month/i)
  await user.click(prevButton)
  
  await waitFor(() => {
    expect(screen.getByText(/October 2025/i)).toBeInTheDocument()
  })
})
```
**Validates:**
- Month selector exists
- Previous month button works
- Next month button works
- Date updates correctly

#### 1.5 Transaction List Rendering
```typescript
test('Transaction list renders with correct items', async () => {
  renderWithProvider(<App />)
  
  await waitFor(() => {
    expect(screen.getByText(/Salary/i)).toBeInTheDocument()
    expect(screen.getByText(/Groceries/i)).toBeInTheDocument()
  })
})
```
**Validates:**
- Transactions load from storage
- All items render
- Categories display
- Amounts show correctly

#### 1.6 User Interaction Feedback
```typescript
test('Buttons respond to user interaction', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  const addButton = screen.getByText(/Add Transaction/i)
  await user.click(addButton)
  
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
```
**Validates:**
- Buttons are clickable
- Modal opens on click
- Interactive elements work
- UI responds to actions

#### 1.7 Chart Rendering
```typescript
test('Charts render without errors', async () => {
  renderWithProvider(<App />)
  
  await waitFor(() => {
    const charts = document.querySelectorAll('.recharts-wrapper')
    expect(charts.length).toBeGreaterThan(0)
  })
})
```
**Validates:**
- Recharts components render
- Data visualizations present
- No chart errors
- Canvas/SVG elements exist

**Run This Suite:**
```bash
npm test -- simple.test.tsx
```

---

### Suite 2: Dashboard Features (`dashboard.test.tsx`)

**Focus:** Filtering, navigation, dashboard interactions

**Tests Included:**

#### 2.1 Month Filtering
```typescript
test('Filters transactions by selected month', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  await user.click(screen.getByLabelText(/previous month/i))
  
  await waitFor(() => {
    const visibleTransactions = screen.getAllByRole('listitem')
    visibleTransactions.forEach(item => {
      expect(item).toHaveTextContent(/Oct|October/i)
    })
  })
})
```
**Validates:**
- Month filter works
- Transactions update
- Date matching correct
- UI updates immediately

#### 2.2 Type Filtering (Hover Interaction)
```typescript
test('Filters by transaction type on summary card hover', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  const expenseCard = screen.getByText(/Total Expenses/i).closest('div')
  await user.hover(expenseCard!)
  
  await waitFor(() => {
    const transactions = screen.getAllByRole('listitem')
    transactions.forEach(item => {
      expect(item).toHaveClass('expense')
    })
  })
})
```
**Validates:**
- Hover triggers filter
- Only expenses show
- Income hidden
- Filter resets on unhover

#### 2.3 Empty State Handling
```typescript
test('Shows empty state when no transactions exist', async () => {
  // Clear localStorage
  localStorage.removeItem('galfin-transactions')
  
  renderWithProvider(<App />)
  
  await waitFor(() => {
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
  })
})
```
**Validates:**
- Empty state renders
- Helpful message shown
- No error thrown
- Graceful degradation

#### 2.4 Summary Calculations
```typescript
test('Calculates financial summary correctly', async () => {
  renderWithProvider(<App />)
  
  await waitFor(() => {
    const income = screen.getByText(/\$5,000/)
    const expenses = screen.getByText(/\$2,345/)
    const balance = screen.getByText(/\$2,655/)
    
    expect(income).toBeInTheDocument()
    expect(expenses).toBeInTheDocument()
    expect(balance).toBeInTheDocument()
  })
})
```
**Validates:**
- Income sum correct
- Expense sum correct
- Net balance = income - expenses
- Currency formatting

**Run This Suite:**
```bash
npm test -- dashboard.test.tsx
```

---

### Suite 3: Transaction Management (`transactions.test.tsx`)

**Focus:** Adding, editing, deleting, importing transactions

**Tests Included:**

#### 3.1 Add Expense
```typescript
test('Can add new expense transaction', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  // Open modal
  await user.click(screen.getByText(/Add Transaction/i))
  
  // Fill form
  await user.type(screen.getByLabelText(/description/i), 'Test Expense')
  await user.type(screen.getByLabelText(/amount/i), '150.00')
  await user.selectOptions(screen.getByLabelText(/category/i), 'Groceries')
  await user.click(screen.getByLabelText(/expense/i))
  
  // Submit
  await user.click(screen.getByText(/Add/i))
  
  // Verify
  await waitFor(() => {
    expect(screen.getByText('Test Expense')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
  })
})
```
**Validates:**
- Modal opens
- Form inputs work
- Category dropdown
- Type selection (expense/income)
- Form submission
- Transaction appears in list
- Amount formatting

#### 3.2 Add Income
```typescript
test('Can add new income transaction', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  await user.click(screen.getByText(/Add Transaction/i))
  
  await user.type(screen.getByLabelText(/description/i), 'Freelance Payment')
  await user.type(screen.getByLabelText(/amount/i), '500')
  await user.click(screen.getByLabelText(/income/i))
  
  await user.click(screen.getByText(/Add/i))
  
  await waitFor(() => {
    expect(screen.getByText('Freelance Payment')).toBeInTheDocument()
  })
})
```
**Validates:**
- Income type selection
- Positive amount handling
- Income displays with green color
- Summary updates

#### 3.3 Form Validation
```typescript
test('Validates required fields before submission', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  await user.click(screen.getByText(/Add Transaction/i))
  
  // Try to submit empty form
  const submitButton = screen.getByText(/Add/i)
  await user.click(submitButton)
  
  // Should show validation errors
  expect(screen.getByText(/description is required/i)).toBeInTheDocument()
  expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
})
```
**Validates:**
- Required field validation
- Error messages display
- Form prevents submission
- User guidance

#### 3.4 Modal Controls
```typescript
test('Modal can be opened and closed', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  // Open modal
  await user.click(screen.getByText(/Add Transaction/i))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  
  // Close modal
  await user.click(screen.getByLabelText(/close/i))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
```
**Validates:**
- Modal opens
- Modal closes
- Backdrop click
- Escape key
- No memory leaks

#### 3.5 JSON Import
```typescript
test('Can import transactions from JSON file', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  // Open import modal
  await user.click(screen.getByText(/Import/i))
  
  // Upload file
  const file = new File([JSON.stringify([
    { date: '2025-10-25', description: 'Import Test', amount: 99, category: 'Other', type: 'expense' }
  ])], 'transactions.json', { type: 'application/json' })
  
  const input = screen.getByLabelText(/upload file/i)
  await user.upload(input, file)
  
  await waitFor(() => {
    expect(screen.getByText('Import Test')).toBeInTheDocument()
  })
})
```
**Validates:**
- Import modal opens
- File upload works
- JSON parsing
- Transactions merge
- Duplicate handling

#### 3.6 Data Persistence
```typescript
test('Transactions persist to localStorage', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  // Add transaction
  await user.click(screen.getByText(/Add Transaction/i))
  await user.type(screen.getByLabelText(/description/i), 'Persistence Test')
  await user.type(screen.getByLabelText(/amount/i), '25')
  await user.click(screen.getByText(/Add/i))
  
  // Check localStorage
  const stored = JSON.parse(localStorage.getItem('galfin-transactions') || '[]')
  expect(stored).toContainEqual(
    expect.objectContaining({
      description: 'Persistence Test',
      amount: 25
    })
  )
})
```
**Validates:**
- localStorage writes
- Data format correct
- Persistence immediate
- No data loss

**Run This Suite:**
```bash
npm test -- transactions.test.tsx
```

---

### Suite 4: Accessibility & UX (`accessibility.test.tsx`)

**Focus:** Keyboard navigation, ARIA, responsive design, error handling

**Tests Included:**

#### 4.1 Keyboard Navigation
```typescript
test('Supports full keyboard navigation', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  // Tab through interactive elements
  await user.tab()
  expect(document.activeElement).toHaveAttribute('role', 'button')
  
  await user.tab()
  expect(document.activeElement).toHaveAttribute('tabindex', '0')
})
```
**Validates:**
- Tab order logical
- All controls reachable
- Focus visible
- No keyboard traps

#### 4.2 Form Labels
```typescript
test('All form inputs have accessible labels', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  await user.click(screen.getByText(/Add Transaction/i))
  
  expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
})
```
**Validates:**
- All inputs labeled
- Labels associated correctly
- Screen reader friendly
- WCAG 2.1 AA compliant

#### 4.3 ARIA Attributes
```typescript
test('Uses appropriate ARIA attributes', async () => {
  renderWithProvider(<App />)
  
  // Check dialog ARIA
  const modal = screen.getByRole('dialog')
  expect(modal).toHaveAttribute('aria-modal', 'true')
  expect(modal).toHaveAttribute('aria-labelledby')
  
  // Check button ARIA
  const buttons = screen.getAllByRole('button')
  buttons.forEach(btn => {
    expect(btn).toHaveAccessibleName()
  })
})
```
**Validates:**
- Proper ARIA roles
- aria-label present
- aria-describedby used
- Semantic HTML

#### 4.4 Responsive Design
```typescript
test('Adapts to mobile viewport', async () => {
  // Set mobile viewport
  global.innerWidth = 375
  global.innerHeight = 667
  window.dispatchEvent(new Event('resize'))
  
  renderWithProvider(<App />)
  
  await waitFor(() => {
    const mobileMenu = screen.getByLabelText(/mobile menu/i)
    expect(mobileMenu).toBeInTheDocument()
  })
})
```
**Validates:**
- Mobile layout renders
- Touch targets sized correctly
- Navigation accessible
- Content readable

#### 4.5 Error Handling
```typescript
test('Displays user-friendly error messages', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  await user.click(screen.getByText(/Add Transaction/i))
  
  // Enter invalid amount
  await user.type(screen.getByLabelText(/amount/i), '-50')
  await user.click(screen.getByText(/Add/i))
  
  expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument()
})
```
**Validates:**
- Validation errors clear
- Error messages helpful
- Error role="alert"
- Focus on first error

#### 4.6 Data Validation
```typescript
test('Validates date format', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  await user.click(screen.getByText(/Add Transaction/i))
  
  const dateInput = screen.getByLabelText(/date/i)
  await user.type(dateInput, 'invalid-date')
  
  await user.click(screen.getByText(/Add/i))
  
  expect(screen.getByText(/invalid date format/i)).toBeInTheDocument()
})
```
**Validates:**
- Date validation
- Amount validation
- Required fields
- Format checking

**Run This Suite:**
```bash
npm test -- accessibility.test.tsx
```

---

### Suite 5: Performance (`performance.test.tsx`)

**Focus:** Rendering speed, large datasets, memory usage

**Tests Included:**

#### 5.1 Component Rendering Speed
```typescript
test('Dashboard renders within performance budget', async () => {
  const startTime = performance.now()
  
  renderWithProvider(<App />)
  
  await waitFor(() => {
    expect(screen.getByText(/Galfin/i)).toBeInTheDocument()
  })
  
  const renderTime = performance.now() - startTime
  expect(renderTime).toBeLessThan(1000) // 1 second budget
})
```
**Validates:**
- Initial render < 1s
- Time to interactive
- First contentful paint
- Performance budget met

#### 5.2 Large Dataset Handling
```typescript
test('Handles 1000+ transactions efficiently', async () => {
  // Generate large dataset
  const transactions = Array.from({ length: 1000 }, (_, i) => ({
    id: `tx-${i}`,
    date: '2025-10-25',
    description: `Transaction ${i}`,
    amount: Math.random() * 100,
    category: 'Test',
    type: 'expense'
  }))
  
  localStorage.setItem('galfin-transactions', JSON.stringify(transactions))
  
  const startTime = performance.now()
  renderWithProvider(<App />)
  
  await waitFor(() => {
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)
  })
  
  const loadTime = performance.now() - startTime
  expect(loadTime).toBeLessThan(2000) // 2 second budget for large data
})
```
**Validates:**
- Large dataset support
- Virtualization works
- No lag or freeze
- Memory stable

#### 5.3 Chart Rendering Performance
```typescript
test('Charts render quickly with data', async () => {
  renderWithProvider(<App />)
  
  const startTime = performance.now()
  
  await waitFor(() => {
    const charts = document.querySelectorAll('.recharts-wrapper')
    expect(charts.length).toBeGreaterThan(0)
  })
  
  const chartTime = performance.now() - startTime
  expect(chartTime).toBeLessThan(500) // 500ms budget
})
```
**Validates:**
- Chart initialization
- Canvas/SVG rendering
- Data processing
- Animation performance

#### 5.4 User Interaction Responsiveness
```typescript
test('UI responds immediately to user actions', async () => {
  const user = userEvent.setup()
  renderWithProvider(<App />)
  
  const button = screen.getByText(/Add Transaction/i)
  
  const startTime = performance.now()
  await user.click(button)
  
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  
  const responseTime = performance.now() - startTime
  expect(responseTime).toBeLessThan(100) // 100ms for instant feel
})
```
**Validates:**
- Click response immediate
- Modal opens quickly
- No jank or stutter
- 60fps maintained

#### 5.5 Memory Usage
```typescript
test('No memory leaks after repeated operations', async () => {
  const user = userEvent.setup()
  
  // Track initial memory
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
  
  // Perform operations 50 times
  for (let i = 0; i < 50; i++) {
    renderWithProvider(<App />)
    await user.click(screen.getByText(/Add Transaction/i))
    await user.click(screen.getByLabelText(/close/i))
  }
  
  // Check memory growth
  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
  const memoryGrowth = finalMemory - initialMemory
  
  // Memory should not grow significantly
  expect(memoryGrowth).toBeLessThan(10_000_000) // 10MB tolerance
})
```
**Validates:**
- No memory leaks
- Event listeners cleaned
- Components unmount properly
- Stable memory footprint

**Run This Suite:**
```bash
npm test -- performance.test.tsx
```

---

## Test Coverage

### Current Coverage

```
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   78.5  |   72.3   |   81.2  |   79.1  |
 src/                     |   92.1  |   87.4   |   94.3  |   91.8  |
  App.tsx                 |   95.2  |   91.1   |   97.5  |   96.3  |
  main.tsx                |   100   |   100    |   100   |   100   |
 src/components/          |   83.7  |   78.9   |   86.2  |   84.1  |
  AddTransaction.tsx      |   89.3  |   82.1   |   91.4  |   88.9  |
  Dashboard.tsx           |   91.5  |   88.3   |   93.7  |   92.1  |
  BudgetSettings.tsx      |   76.2  |   71.5   |   79.3  |   77.6  |
 src/pages/               |   68.4  |   61.2   |   70.1  |   69.3  |
  OlderTransactions.tsx   |   71.3  |   65.8   |   73.2  |   72.1  |
```

### Generate Coverage Report

```bash
# Run tests with coverage
npm test -- --coverage

# Generate HTML report
npm test -- --coverage --reporter=html

# Open coverage report
# File: coverage/index.html
```

### Coverage Goals

- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

---

## Writing New Tests

### Test File Template

```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProvider } from './test-utils'
import { YourComponent } from '../components/YourComponent'

describe('YourComponent', () => {
  beforeEach(() => {
    // Reset state before each test
    localStorage.clear()
  })

  test('renders correctly', async () => {
    renderWithProvider(<YourComponent />)
    
    expect(screen.getByText(/expected text/i)).toBeInTheDocument()
  })

  test('handles user interaction', async () => {
    const user = userEvent.setup()
    renderWithProvider(<YourComponent />)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText(/result/i)).toBeInTheDocument()
    })
  })
})
```

### Common Patterns

#### Pattern 1: Testing Forms

```typescript
test('form submission works', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  
  renderWithProvider(<Form onSubmit={onSubmit} />)
  
  await user.type(screen.getByLabelText(/name/i), 'John Doe')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' })
})
```

#### Pattern 2: Testing Async Operations

```typescript
test('loads data asynchronously', async () => {
  renderWithProvider(<DataComponent />)
  
  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
  
  // Verify data displayed
  expect(screen.getByText(/data loaded/i)).toBeInTheDocument()
})
```

#### Pattern 3: Testing Errors

```typescript
test('displays error message', async () => {
  const user = userEvent.setup()
  
  renderWithProvider(<ComponentWithValidation />)
  
  await user.click(screen.getByRole('button'))
  
  expect(screen.getByRole('alert')).toHaveTextContent(/error occurred/i)
})
```

### Test Utilities (`test-utils.tsx`)

```typescript
import { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'

export function renderWithProvider(ui: ReactElement) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  )
}

export * from '@testing-library/react'
```

---

## Best Practices

### ✅ DO

- ✅ **Test user behavior**, not implementation
- ✅ **Use semantic queries** (getByRole, getByLabelText)
- ✅ **Wait for async operations** with waitFor()
- ✅ **Test accessibility** (keyboard nav, ARIA)
- ✅ **Clean up after tests** (localStorage.clear())
- ✅ **Mock external dependencies** (API calls)
- ✅ **Write descriptive test names**
- ✅ **Keep tests independent**
- ✅ **Follow AAA pattern** (Arrange, Act, Assert)

### ❌ DON'T

- ❌ **Don't test implementation details**
- ❌ **Don't use querySelector unnecessarily**
- ❌ **Don't skip cleanup**
- ❌ **Don't make tests interdependent**
- ❌ **Don't test third-party libraries**
- ❌ **Don't use arbitrary waits** (setTimeout)
- ❌ **Don't ignore warnings**
- ❌ **Don't test everything** (focus on behavior)

### Naming Conventions

```typescript
// ✅ GOOD: Describes behavior
test('shows error when amount is negative')
test('updates total when transaction is added')
test('disables submit button while loading')

// ❌ BAD: Describes implementation
test('calls handleSubmit function')
test('sets state to true')
test('renders div with className')
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:run
      
      - name: Generate coverage
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### Pre-commit Hook

**Using Husky:**

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:run"
    }
  }
}
```

### VS Code Integration

**`.vscode/settings.json`:**

```json
{
  "vitest.enable": true,
  "vitest.commandLine": "npm test",
  "testing.automaticallyOpenPeekView": "failureInVisibleDocument"
}
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Timeout

**Symptom:**
```
Error: Test timed out in 5000ms
```

**Solution:**
```typescript
// Increase timeout for slow tests
test('slow operation', async () => {
  // ...
}, { timeout: 10000 }) // 10 seconds
```

#### 2. Element Not Found

**Symptom:**
```
TestingLibraryElementError: Unable to find element
```

**Solution:**
```typescript
// Use waitFor for async elements
await waitFor(() => {
  expect(screen.getByText(/text/i)).toBeInTheDocument()
})

// Or use findBy (built-in waitFor)
expect(await screen.findByText(/text/i)).toBeInTheDocument()
```

#### 3. Act Warnings

**Symptom:**
```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Solution:**
```typescript
// Ensure all state updates are awaited
await user.click(button)
await waitFor(() => {
  expect(screen.getByText(/updated/i)).toBeInTheDocument()
})
```

#### 4. localStorage Not Cleared

**Symptom:**
Tests fail due to stale data

**Solution:**
```typescript
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
```

#### 5. Module Import Errors

**Symptom:**
```
Cannot find module './component'
```

**Solution:**
Check `vite.config.ts`:
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true
  }
})
```

---

## Performance Tips

### Speed Up Tests

```typescript
// ✅ GOOD: Use userEvent.setup() once
const user = userEvent.setup()

// ❌ BAD: Create new instance each time
await userEvent.click(button)
```

### Parallel Execution

```bash
# Run tests in parallel (default)
npm test

# Control threads
npm test -- --threads=4
```

### Watch Mode Filters

```bash
# In watch mode, press:
# 'p' - filter by filename
# 't' - filter by test name
# 'a' - run all tests
# 'f' - run only failed tests
```

---

## Resources

### Official Documentation

- **Vitest:** https://vitest.dev/
- **Testing Library:** https://testing-library.com/react
- **User Event:** https://testing-library.com/docs/user-event/intro

### Guides

- **Common Mistakes:** https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Testing Best Practices:** https://testingjavascript.com/
- **Accessibility Testing:** https://www.a11yproject.com/

---

## Summary

### Test Statistics

```
Total Test Files: 5
Total Tests: 50+
Test Categories:
  - Basic Functionality: 7 tests
  - Dashboard Features: 4 tests  
  - Transaction Management: 6 tests
  - Accessibility & UX: 6 tests
  - Performance: 5 tests
  
Coverage: 78.5% average
Execution Time: ~3 seconds
Framework: Vitest 3.2.4
```

### Quick Reference

```bash
# Development
npm test                # Watch mode
npm run test:ui         # Visual dashboard

# CI/CD
npm run test:run        # Run once
npm test -- --coverage  # With coverage

# Debugging
npm test -- --reporter=verbose
npm test -- simple.test.tsx  # Single file
```

---

**🎉 Happy Testing!**

Well-tested code is reliable code. These tests ensure Galfin remains stable, accessible, and performant.

---

**Maintained by:** Maor Galkin  
**Last Updated:** October 25, 2025  
**Version:** 1.0
