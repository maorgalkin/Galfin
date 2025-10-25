# Budget Template & Configuration System

## Overview

The Galfin Budget Template system provides a comprehensive way to manage family finances by setting spending limits, tracking variance, and generating alerts. This system compares actual spending against predefined budgets and provides insights into financial health.

## Files Structure

```
src/
├── config/
│   └── budget-template.json         # Main budget configuration
├── types/
│   └── budget.ts                   # TypeScript interfaces
├── services/
│   └── budgetService.ts            # Budget calculation logic
└── components/
    └── BudgetOverview.tsx          # React component for dashboard
```

## Configuration File (`budget-template.json`)

### Monthly Budgets
Define spending limits for each expense category:

```json
{
  "monthlyBudgets": {
    "totalMonthlyLimit": 15000,
    "categories": {
      "Food & Dining": {
        "monthlyLimit": 2500,
        "priority": "high",
        "alertThreshold": 80,
        "description": "Restaurants, cafes, and dining out",
        "subcategories": ["Restaurants", "Fast Food", "Coffee Shops"]
      }
    }
  }
}
```

**Key Properties:**
- `monthlyLimit`: Maximum amount to spend in this category per month
- `priority`: Importance level (`critical`, `high`, `medium`, `low`)
- `alertThreshold`: Percentage at which to trigger warnings (0-100)
- `subcategories`: Optional breakdown for detailed tracking

### Family Member Budgets
Set individual allowances and restrict categories:

```json
{
  "familyMemberBudgets": {
    "enabled": true,
    "individual": {
      "Maor": {
        "monthlyAllowance": 1000,
        "categories": ["Entertainment", "Shopping"],
        "alertThreshold": 80
      }
    }
  }
}
```

### Income Targets
Define expected income by source:

```json
{
  "incomeTargets": {
    "monthlyTarget": 18000,
    "categories": {
      "Salary": {
        "monthlyTarget": 15000,
        "priority": "critical",
        "description": "Primary salary income"
      }
    }
  }
}
```

### Alert Configuration
Control when and how budget alerts are triggered:

```json
{
  "alerts": {
    "enabled": true,
    "types": {
      "budgetExceeded": {
        "enabled": true,
        "severity": "high",
        "message": "Budget limit exceeded for category: {category}"
      },
      "approachingLimit": {
        "enabled": true,
        "severity": "medium",
        "message": "Approaching budget limit for {category}: {percentage}% used"
      }
    }
  }
}
```

### Savings Goals
Track progress toward financial objectives:

```json
{
  "savingsGoals": {
    "enabled": true,
    "emergency": {
      "target": 50000,
      "priority": "critical",
      "description": "Emergency fund (3 months expenses)",
      "monthlyTarget": 2000
    }
  }
}
```

## How to Use

### 1. Customize Budget Categories

Edit `src/config/budget-template.json` to match your family's needs:

1. **Adjust Monthly Limits**: Set realistic spending limits for each category
2. **Set Priorities**: Mark essential categories as `critical` or `high`
3. **Configure Alerts**: Set thresholds that work for your spending patterns
4. **Update Family Members**: Add/remove family members and their allowances

### 2. Integration with Dashboard

The budget system automatically integrates with your existing dashboard:

```tsx
import BudgetOverview from '../components/BudgetOverview';

// In your Dashboard component
<BudgetOverview selectedMonth={currentMonth} />
```

### 3. Budget Analysis

The system provides several analysis features:

- **Variance Tracking**: Compare actual vs. budgeted spending
- **Alert Generation**: Automatic warnings when approaching/exceeding limits
- **Savings Rate**: Calculate percentage of income saved
- **Category Utilization**: Visual progress bars for each budget category

### 4. Programmatic Access

Use the budget service in your code:

```tsx
import { budgetService } from '../services/budgetService';

// Get budget for a category
const groceryBudget = budgetService.getCategoryBudget('Groceries');

// Analyze performance for a month
const analysis = budgetService.analyzeBudgetPerformance(
  transactions, 
  'August', 
  2025
);

// Get current alerts
const alerts = budgetService.generateBudgetAlerts(
  analysis.categoryComparisons,
  'August',
  2025
);
```

## Customization Examples

### Example 1: Strict Budget Mode
For tight financial control:

```json
{
  "settings": {
    "strictMode": true,
    "autoAdjustBudgets": false,
    "rolloverUnusedBudget": false
  },
  "alerts": {
    "enabled": true,
    "types": {
      "approachingLimit": {
        "enabled": true,
        "severity": "high",
        "message": "WARNING: Approaching 75% of budget for {category}"
      }
    }
  }
}
```

### Example 2: Flexible Family Budget
For families with varying income:

```json
{
  "settings": {
    "autoAdjustBudgets": true,
    "inflationAdjustment": 0.03,
    "rolloverUnusedBudget": true
  },
  "familyMemberBudgets": {
    "enabled": true,
    "individual": {
      "Parent1": { "monthlyAllowance": 1500 },
      "Parent2": { "monthlyAllowance": 1500 },
      "Child1": { "monthlyAllowance": 300 },
      "Child2": { "monthlyAllowance": 200 }
    }
  }
}
```

### Example 3: Savings-Focused Configuration
For aggressive saving goals:

```json
{
  "savingsGoals": {
    "enabled": true,
    "emergency": {
      "target": 100000,
      "monthlyTarget": 3000
    },
    "vacation": {
      "target": 25000,
      "monthlyTarget": 2000
    },
    "homeImprovement": {
      "target": 50000,
      "monthlyTarget": 1500
    }
  }
}
```

## Dashboard Integration

The budget overview component displays:

1. **Summary Cards**: Total budgeted, spent, variance, and utilization percentage
2. **Progress Bars**: Visual representation of budget usage
3. **Alert Notifications**: Real-time warnings and notifications
4. **Category Breakdown**: Detailed view of each budget category
5. **Savings Rate**: Current savings percentage and trends

## Data Comparison

The budget system compares against your existing transaction data by:

- **Category Matching**: Uses the same categories from your `AddTransaction` component
- **Monthly Filtering**: Analyzes spending within specific month periods
- **Family Member Tracking**: Links transactions to individual budget allowances
- **Real-time Updates**: Recalculates when new transactions are added

## Best Practices

1. **Start Conservative**: Set initial budgets slightly lower than your typical spending
2. **Review Monthly**: Adjust budgets based on actual spending patterns
3. **Use Priorities**: Mark essential categories as high priority
4. **Set Realistic Alerts**: Alert thresholds around 75-85% work well for most families
5. **Track Trends**: Use the variance data to identify spending patterns
6. **Regular Updates**: Review and update your budget template quarterly

## Future Enhancements

The budget system is designed for extensibility:

- **Historical Analysis**: Track budget performance over time
- **Predictive Budgeting**: Suggest budget adjustments based on trends
- **Goal Tracking**: Monitor progress toward savings goals
- **Export Features**: Generate budget reports in various formats
- **Integration**: Connect with bank APIs for automatic categorization

## Troubleshooting

### Common Issues

1. **Categories Don't Match**: Ensure budget categories match exactly with transaction categories
2. **Currency Formatting**: Update currency settings in the template if needed
3. **Alert Overload**: Adjust alert thresholds if receiving too many notifications
4. **Budget Validation**: Use `budgetService.validateBudgetConfig()` to check for errors

### Configuration Validation

The system includes built-in validation:

```tsx
const validation = budgetService.validateBudgetConfig();
if (!validation.isValid) {
  console.error('Budget configuration errors:', validation.errors);
}
```

This ensures your budget configuration is mathematically sound and practical.
