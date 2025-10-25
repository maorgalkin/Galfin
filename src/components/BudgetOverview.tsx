import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { budgetService } from '../services/budgetService';
import { AlertTriangle, CheckCircle, Target } from 'lucide-react';

interface BudgetOverviewProps {
  selectedMonth?: Date;
  isCompact?: boolean;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ selectedMonth, isCompact = false }) => {
  const { transactions, budgetConfig } = useFinance();
  const [showDetails, setShowDetails] = useState(false);

  // Get current month or use selected month
  const currentDate = selectedMonth || new Date();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
  const year = currentDate.getFullYear();

  // Calculate budget analysis for the selected month
  const budgetAnalysis = useMemo(() => {
    return budgetService.analyzeBudgetPerformance(transactions, monthName, year);
  }, [transactions, monthName, year, budgetConfig]);

  // Calculate income and balance for the selected month
  const monthIncome = useMemo(() => {
    return transactions
      .filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentDate.getMonth() && 
               date.getFullYear() === year &&
               t.type === 'income';
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentDate, year]);

  const monthExpense = budgetAnalysis.totalSpent;
  const balance = monthIncome - monthExpense;

  const formatCurrency = (amount: number) => {
    const currency = budgetConfig.globalSettings.currency;
    const locale = currency === 'ILS' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusColor = (status: 'under' | 'over' | 'onTarget') => {
    switch (status) {
      case 'under': return 'text-green-600';
      case 'over': return 'text-red-600';
      case 'onTarget': return 'text-blue-600';
    }
  };

  const getStatusIcon = (status: 'under' | 'over' | 'onTarget') => {
    switch (status) {
      case 'under': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'over': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'onTarget': return <Target className="h-4 w-4 text-blue-600" />;
    }
  };

  const budgetUtilization = budgetAnalysis.totalBudgeted > 0 
    ? (budgetAnalysis.totalSpent / budgetAnalysis.totalBudgeted) * 100 
    : 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${isCompact ? 'p-4' : 'p-6'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-semibold text-gray-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
          {monthName} {year} Budget Performance
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Budget Summary Cards - Desktop: 3 across x 2 down, Mobile: 2 across x 3 down */}
      <div className={`grid ${isCompact ? 'grid-cols-3 gap-3' : 'grid-cols-2 md:grid-cols-3 gap-4'} ${isCompact ? 'mb-4' : 'mb-6'}`}>
        {/* Row 1: Income | Expense | Balance */}
        <div className={`bg-green-50 rounded-lg ${isCompact ? 'p-3' : 'p-4'}`}>
          <div className="flex flex-col">
            <p className={`font-medium text-gray-600 ${isCompact ? 'text-xs' : 'text-sm'} mb-1`}>Income</p>
            <p className={`font-bold text-green-900 ${isCompact ? 'text-sm' : 'text-lg'}`}>{formatCurrency(monthIncome)}</p>
          </div>
        </div>

        <div className={`bg-red-50 rounded-lg ${isCompact ? 'p-3' : 'p-4'}`}>
          <div className="flex flex-col">
            <p className={`font-medium text-gray-600 ${isCompact ? 'text-xs' : 'text-sm'} mb-1`}>Expense</p>
            <p className={`font-bold text-red-900 ${isCompact ? 'text-sm' : 'text-lg'}`}>{formatCurrency(monthExpense)}</p>
          </div>
        </div>

        <div className={`rounded-lg ${isCompact ? 'p-3' : 'p-4'} ${balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className="flex flex-col">
            <p className={`font-medium text-gray-600 ${isCompact ? 'text-xs' : 'text-sm'} mb-1`}>Balance</p>
            <p className={`font-bold ${isCompact ? 'text-sm' : 'text-lg'} ${balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* Row 2: Total Budgeted | Budget Status | Variance */}
        <div className={`bg-gray-50 rounded-lg ${isCompact ? 'p-3' : 'p-4'}`}>
          <div className="flex flex-col">
            <p className={`font-medium text-gray-600 ${isCompact ? 'text-xs' : 'text-sm'} mb-1`}>Total Budgeted</p>
            <p className={`font-bold text-gray-900 ${isCompact ? 'text-sm' : 'text-lg'}`}>{formatCurrency(budgetAnalysis.totalBudgeted)}</p>
          </div>
        </div>

        <div className={`rounded-lg ${isCompact ? 'p-3' : 'p-4'} ${
          budgetUtilization <= 80 ? 'bg-green-50' : 
          budgetUtilization <= 100 ? 'bg-yellow-50' : 'bg-red-50'
        }`}>
          <div className="flex flex-col">
            <p className={`font-medium text-gray-600 ${isCompact ? 'text-xs' : 'text-sm'} mb-1`}>Budget Status</p>
            <p className={`font-bold ${isCompact ? 'text-sm' : 'text-lg'} ${
              budgetUtilization <= 80 ? 'text-green-900' : 
              budgetUtilization <= 100 ? 'text-yellow-900' : 'text-red-900'
            }`}>
              {(() => {
                const categoriesOverBudget = budgetAnalysis.categoryComparisons.filter(c => c.status === 'over').length;
                if (categoriesOverBudget === 0) {
                  return `On Track (${budgetUtilization.toFixed(1)}%)`;
                } else {
                  return `${categoriesOverBudget} ${categoriesOverBudget === 1 ? 'Category' : 'Categories'} Over (${budgetUtilization.toFixed(1)}%)`;
                }
              })()}
            </p>
          </div>
        </div>

        <div className={`rounded-lg ${isCompact ? 'p-3' : 'p-4'} ${budgetAnalysis.totalVariance >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className="flex flex-col">
            <p className={`font-medium text-gray-600 ${isCompact ? 'text-xs' : 'text-sm'} mb-1`}>Variance</p>
            <p className={`font-bold ${isCompact ? 'text-sm' : 'text-lg'} ${budgetAnalysis.totalVariance >= 0 ? 'text-red-900' : 'text-green-900'}`}>
              {budgetAnalysis.totalVariance >= 0 ? '+' : ''}{formatCurrency(budgetAnalysis.totalVariance)}
            </p>
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className={isCompact ? 'mb-4' : 'mb-6'}>
        <div className="flex justify-between items-center mb-2">
          <span className={`font-medium text-gray-700 ${isCompact ? 'text-xs' : 'text-sm'}`}>Overall Budget Progress</span>
          <span className={`text-gray-600 ${isCompact ? 'text-xs' : 'text-sm'}`}>{budgetUtilization.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              budgetUtilization <= 80 ? 'bg-green-500' : 
              budgetUtilization <= 100 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Active Alerts */}
      {budgetAnalysis.alerts.length > 0 && (
        <div className={isCompact ? 'mb-4' : 'mb-6'}>
          <h3 className={`font-medium text-gray-900 mb-3 ${isCompact ? 'text-sm' : 'text-lg'}`}>Budget Alerts</h3>
          <div className="space-y-2">
            {budgetAnalysis.alerts.slice(0, isCompact ? 2 : 3).map((alert) => (
              <div 
                key={alert.id}
                className={`${isCompact ? 'p-2' : 'p-3'} rounded-lg border-l-4 ${
                  alert.severity === 'high' ? 'bg-red-50 border-red-400' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 mr-2 ${
                    alert.severity === 'high' ? 'text-red-500' :
                    alert.severity === 'medium' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`} />
                  <div>
                    <p className={`font-medium text-gray-900 ${isCompact ? 'text-xs' : 'text-sm'}`}>{alert.category}</p>
                    <p className={`text-gray-600 ${isCompact ? 'text-xs' : 'text-sm'}`}>{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Category Breakdown */}
      {showDetails && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {budgetAnalysis.categoryComparisons
              .filter(comp => comp.budgeted > 0) // Only show categories with budgets
              .sort((a, b) => b.budgeted - a.budgeted) // Sort by budget amount
              .map((comparison) => {
                const utilization = comparison.budgeted > 0 ? (comparison.actual / comparison.budgeted) * 100 : 0;
                
                return (
                  <div key={comparison.category} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(comparison.status)}
                        <span className="ml-2 font-medium text-gray-900">{comparison.category}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getStatusColor(comparison.status)}`}>
                          {formatCurrency(comparison.actual)} / {formatCurrency(comparison.budgeted)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {comparison.variance >= 0 ? '+' : ''}{formatCurrency(comparison.variance)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          utilization <= 80 ? 'bg-green-500' : 
                          utilization <= 100 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">{utilization.toFixed(1)}% used</span>
                      {utilization > 100 && (
                        <span className="text-xs text-red-600 font-medium">
                          Over budget by {formatCurrency(comparison.variance)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Savings Rate */}
      {!isCompact && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Savings Rate</span>
            <span className={`text-sm font-bold ${
              budgetAnalysis.savingsRate >= 20 ? 'text-green-600' :
              budgetAnalysis.savingsRate >= 10 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {budgetAnalysis.savingsRate.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Income to Expense Ratio: {budgetAnalysis.incomeExpenseRatio.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetOverview;
