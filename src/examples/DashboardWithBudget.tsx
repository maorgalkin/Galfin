// Example: How to integrate the Budget Overview into your existing Dashboard

import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import BudgetOverview from '../components/BudgetOverview';
import { budgetService } from '../services/budgetService';

// Add this to your existing Dashboard component

const DashboardWithBudget: React.FC = () => {
  const { transactions } = useFinance();
  const [activeTab, setActiveTab] = useState<'overview' | 'budget'>('overview');
  const [selectedMonth] = useState(new Date()); // Use your existing month state

  // Get budget status for summary
  const budgetStatus = budgetService.getBudgetStatusSummary(transactions);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Navigation tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transaction Overview
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'budget'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Budget Analysis
              {budgetStatus.alertsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {budgetStatus.alertsCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div>
          {/* Your existing dashboard content */}
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
          
          {/* Add a budget summary card to your existing summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            {/* Your existing summary cards */}
            
            {/* New Budget Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Budget Status</p>
                  <p className={`text-2xl font-bold ${
                    budgetStatus.categoriesOverBudget === 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {budgetStatus.categoriesOverBudget === 0 ? 'On Track' : `${budgetStatus.categoriesOverBudget} Over`}
                  </p>
                </div>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  budgetStatus.categoriesOverBudget === 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <span className={`text-sm font-bold ${
                    budgetStatus.categoriesOverBudget === 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {budgetStatus.categoriesOverBudget}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-500">
                  {((budgetStatus.totalSpent / budgetStatus.totalBudgeted) * 100).toFixed(0)}% of budget used
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div 
                    className={`h-1 rounded-full ${
                      (budgetStatus.totalSpent / budgetStatus.totalBudgeted) <= 0.8 ? 'bg-green-500' :
                      (budgetStatus.totalSpent / budgetStatus.totalBudgeted) <= 1.0 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ 
                      width: `${Math.min((budgetStatus.totalSpent / budgetStatus.totalBudgeted) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Rest of your existing dashboard content */}
        </div>
      )}

      {activeTab === 'budget' && (
        <div>
          {/* Budget Overview Component */}
          <BudgetOverview selectedMonth={selectedMonth} />
        </div>
      )}
    </div>
  );
};

export default DashboardWithBudget;
