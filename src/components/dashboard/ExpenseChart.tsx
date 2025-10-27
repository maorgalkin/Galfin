import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategoryColor } from '../../utils/categoryColors';
import type { Transaction, BudgetConfiguration } from '../../types';

interface CategoryData {
  category: string;
  amount: number;
}

interface ExpenseChartProps {
  categoryData: CategoryData[];
  transactions: Transaction[];
  budgetConfig: BudgetConfiguration | null;
  formatCurrency: (amount: number) => string;
  onEditTransaction: (transaction: Transaction) => void;
  onViewAllTransactions: (category: string) => void;
}

/**
 * Interactive pie chart for expense breakdown by category
 * Desktop: Click to show transaction list in side panel
 * Mobile: Tap to show category details below chart
 */
export const ExpenseChart: React.FC<ExpenseChartProps> = ({
  categoryData,
  transactions,
  budgetConfig,
  formatCurrency,
  onEditTransaction,
  onViewAllTransactions,
}) => {
  const [selectedDesktopCategory, setSelectedDesktopCategory] = useState<string | null>(null);
  const [focusedCategory, setFocusedCategory] = useState<{
    category: string;
    amount: number;
    percentage: string;
  } | null>(null);

  if (categoryData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Expenses by Category</h2>
        <p className="text-gray-500 text-center py-12">No expense data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Expenses by Category</h2>

      {/* Desktop Layout - Chart slides left when category selected */}
      <div className="max-md:hidden">
        <div className="flex gap-6">
          {/* Chart Container - slides to left when category selected */}
          <motion.div
            animate={{
              width: selectedDesktopCategory ? '40%' : '100%'
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-shrink-0"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={90}
                  innerRadius={0}
                  fill="#8884d8"
                  dataKey="amount"
                  onMouseDown={(data: any, index: number) => {
                    console.log('Pie onMouseDown:', data, index, categoryData[index]);
                    if (categoryData[index]) {
                      setSelectedDesktopCategory(categoryData[index].category);
                    }
                  }}
                >
                  {categoryData.map((entry, index) => {
                    const colors = getCategoryColor(entry.category, 'expense', budgetConfig);
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={colors.hexColor}
                        cursor="pointer"
                      />
                    );
                  })}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any, _name: any, props: any) => [
                    formatCurrency(value as number),
                    props.payload.category
                  ]}
                  labelFormatter={() => ''}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  wrapperStyle={{
                    animation: 'fadeIn 0.2s ease-in'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Transaction List - appears when category selected */}
          <AnimatePresence>
            {selectedDesktopCategory && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="flex-1 border-l pl-4 pr-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedDesktopCategory} Transactions
                  </h3>
                  <button
                    onClick={() => setSelectedDesktopCategory(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {(() => {
                  const categoryTransactions = transactions
                    .filter(t => t.type === 'expense' && t.category === selectedDesktopCategory)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5);

                  const totalTransactions = transactions
                    .filter(t => t.type === 'expense' && t.category === selectedDesktopCategory).length;

                  return (
                    <>
                      <div className="space-y-1.5">
                        {categoryTransactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => onEditTransaction(transaction)}
                          >
                            <div className="flex-1 min-w-0 text-sm text-gray-900 truncate">
                              {transaction.description}
                            </div>
                            <div className="text-sm font-semibold text-gray-900 ml-3 flex-shrink-0">
                              {formatCurrency(transaction.amount)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Button container with fixed height to prevent layout shift */}
                      <div className="mt-4 min-h-[40px]">
                        {totalTransactions > 5 && (
                          <button
                            onClick={() => onViewAllTransactions(selectedDesktopCategory)}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            See All {selectedDesktopCategory} Expenses ({totalTransactions})
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Layout - Original tap behavior */}
      <div className="md:hidden">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={90}
              innerRadius={0}
              fill="#8884d8"
              dataKey="amount"
              onClick={(data) => {
                const totalAmount = categoryData.reduce((sum, cat) => sum + cat.amount, 0);
                const percentage = ((data.amount / totalAmount) * 100).toFixed(1);
                setFocusedCategory({
                  category: data.category,
                  amount: data.amount,
                  percentage
                });
              }}
            >
              {categoryData.map((entry, index) => {
                const colors = getCategoryColor(entry.category, 'expense', budgetConfig);
                return (
                  <Cell key={`cell-${index}`} fill={colors.hexColor} />
                );
              })}
            </Pie>
            <RechartsTooltip 
              formatter={(value: any, _name: any, props: any) => [
                formatCurrency(value as number),
                props.payload.category
              ]}
              labelFormatter={() => ''}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      
        {/* Mobile-only: Focused Category Display */}
        {focusedCategory ? (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {focusedCategory.category}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {focusedCategory.percentage}% of expenses
              </div>
              <div className="text-xl font-bold text-blue-600 mt-2">
                {formatCurrency(focusedCategory.amount)}
              </div>
            </div>
            <button
              onClick={() => setFocusedCategory(null)}
              className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Tap another category or click here to clear
            </button>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border text-center text-sm text-gray-500">
            Tap on a category above to see details
          </div>
        )}
      </div>
    </div>
  );
};
