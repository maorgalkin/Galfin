import React, { useState, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategoryColor } from '../../utils/categoryColors';
import type { Transaction } from '../../types';
import type { PersonalBudget } from '../../types/budget';

interface CategoryData {
  category: string;
  amount: number;
}

interface ExpenseChartProps {
  categoryData: CategoryData[];
  transactions: Transaction[];
  personalBudget: PersonalBudget | null | undefined;
  formatCurrency: (amount: number) => string;
  selectedCategory?: string | null;
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
  personalBudget,
  formatCurrency,
  selectedCategory,
  onEditTransaction,
  onViewAllTransactions,
}) => {
  const [selectedDesktopCategory, setSelectedDesktopCategory] = useState<string | null>(selectedCategory || null);
  const [focusedCategory, setFocusedCategory] = useState<{
    category: string;
    amount: number;
    percentage: string;
  } | null>(null);
  
  // Magnifier state
  const [magnifierData, setMagnifierData] = useState<{
    position: { x: number; y: number };
    hoveredCategory: string | null;
  } | null>(null);
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Update selected category when prop changes
  React.useEffect(() => {
    if (selectedCategory) {
      setSelectedDesktopCategory(selectedCategory);
      
      // For mobile: also set focusedCategory
      const categoryItem = categoryData.find(c => c.category === selectedCategory);
      if (categoryItem) {
        const totalAmount = categoryData.reduce((sum, cat) => sum + cat.amount, 0);
        const percentage = ((categoryItem.amount / totalAmount) * 100).toFixed(1);
        setFocusedCategory({
          category: categoryItem.category,
          amount: categoryItem.amount,
          percentage
        });
      }
    }
  }, [selectedCategory, categoryData]);

  // Cleanup long press timer
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Calculate if a category slice is too small (less than 5%)
  const isSmallSlice = (amount: number) => {
    const totalAmount = categoryData.reduce((sum, cat) => sum + cat.amount, 0);
    return (amount / totalAmount) * 100 < 5;
  };

  // Handle long press start
  const handlePressStart = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault(); // Prevent text selection
    
    // Check if any small slices exist
    const hasSmallSlices = categoryData.some(cat => isSmallSlice(cat.amount));
    if (!hasSmallSlices) return;

    // Get position for magnifier
    let x: number, y: number;
    if ('touches' in event) {
      x = event.touches[0].clientX;
      y = event.touches[0].clientY;
      touchStartRef.current = { x, y };
    } else {
      x = event.clientX;
      y = event.clientY;
    }

    // Start timer for long press (500ms)
    longPressTimerRef.current = setTimeout(() => {
      setIsMagnifierActive(true);
      setMagnifierData({
        position: { x, y },
        hoveredCategory: null
      });
    }, 500);
  };

  // Handle press end
  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsMagnifierActive(false);
    setMagnifierData(null);
  };

  // Handle mouse/touch move
  const handleMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isMagnifierActive) {
      // Check if we're in the initial press timer
      if (touchStartRef.current && longPressTimerRef.current) {
        let x: number, y: number;
        if ('touches' in event) {
          x = event.touches[0].clientX;
          y = event.touches[0].clientY;
        } else {
          x = event.clientX;
          y = event.clientY;
        }
        
        const deltaX = Math.abs(x - touchStartRef.current.x);
        const deltaY = Math.abs(y - touchStartRef.current.y);
        
        // Cancel if moved more than 10px during initial press
        if (deltaX > 10 || deltaY > 10) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
      return;
    }

    // Update magnifier position when active
    let x: number, y: number;
    if ('touches' in event) {
      x = event.touches[0].clientX;
      y = event.touches[0].clientY;
    } else {
      x = event.clientX;
      y = event.clientY;
    }

    // Detect which category is under the magnifier
    const hoveredCategory = detectCategoryAtPosition(x, y);
    
    setMagnifierData({
      position: { x, y },
      hoveredCategory
    });
  };

  // Detect which small category is at the given position
  const detectCategoryAtPosition = (x: number, y: number): string | null => {
    if (!chartRef.current) return null;
    
    // Get all pie slice elements
    const elements = document.elementsFromPoint(x, y);
    
    // Find the pie slice path element
    for (const element of elements) {
      if (element.tagName === 'path' && element.parentElement?.classList.contains('recharts-pie-sector')) {
        // Try to find associated category from data
        const pathIndex = Array.from(element.parentElement.children).indexOf(element);
        if (pathIndex >= 0 && pathIndex < categoryData.length) {
          const category = categoryData[pathIndex];
          // Only return if it's a small slice
          if (isSmallSlice(category.amount)) {
            return category.category;
          }
        }
      }
    }
    return null;
  };

  if (categoryData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Expenses by Category</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">No expense data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h2 className="max-md:hidden text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Expenses by Category</h2>

      {/* Desktop Layout - Chart slides left when category selected */}
      <div className="max-md:hidden">
        <div className="flex gap-6">
          {/* Chart Container - slides to left when category selected */}
          <motion.div
            ref={chartRef}
            animate={{
              width: selectedDesktopCategory ? '40%' : '100%'
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-shrink-0"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            onMouseDown={handlePressStart}
            onMouseMove={handleMove}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchMove={handleMove}
            onTouchEnd={handlePressEnd}
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
                    const colors = getCategoryColor(entry.category, 'expense', personalBudget);
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

                      {/* Button container - always show See All button */}
                      <div className="mt-4">
                        <button
                          onClick={() => onViewAllTransactions(selectedDesktopCategory)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          See All {selectedDesktopCategory} Expenses ({totalTransactions})
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Layout - Pie chart with transaction list */}
      <div 
        className="md:hidden"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        onMouseDown={handlePressStart}
        onMouseMove={handleMove}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchMove={handleMove}
        onTouchEnd={handlePressEnd}
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
                const colors = getCategoryColor(entry.category, 'expense', personalBudget);
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
      
        {/* Mobile-only: Transaction list when category selected */}
        {focusedCategory ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {focusedCategory.category}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {focusedCategory.percentage}% of expenses • {formatCurrency(focusedCategory.amount)}
                </p>
              </div>
              <button
                onClick={() => setFocusedCategory(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {(() => {
              const categoryTransactions = transactions
                .filter(t => t.type === 'expense' && t.category === focusedCategory.category)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return (
                <>
                  <div className="space-y-2">
                    {categoryTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                        onClick={() => onEditTransaction(transaction)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {transaction.description}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-3 flex-shrink-0">
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {categoryTransactions.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                      No transactions in this category
                    </p>
                  )}

                  <div className="mt-3 text-center">
                    <button
                      onClick={() => setFocusedCategory(null)}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Tap another category or click here to close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-center text-sm text-gray-500 dark:text-gray-400">
            Tap on a category above to see all transactions
          </div>
        )}
      </div>

      {/* Magnifier Circle for Small Slices */}
      <AnimatePresence>
        {magnifierData && isMagnifierActive && (
          <>
            {/* Magnifier Circle */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed pointer-events-none z-50"
              style={{
                left: magnifierData.position.x,
                top: magnifierData.position.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Magnifier circle with border */}
              <div className="relative w-32 h-32 rounded-full border-4 border-blue-500 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-2xl flex items-center justify-center">
                {/* Magnifying glass icon */}
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </motion.div>

            {/* Category info tooltip below magnifier */}
            {magnifierData.hoveredCategory && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="fixed pointer-events-none z-50 bg-gray-900 dark:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-medium"
                style={{
                  left: magnifierData.position.x,
                  top: magnifierData.position.y + 80,
                  transform: 'translateX(-50%)'
                }}
              >
                {(() => {
                  const category = categoryData.find(c => c.category === magnifierData.hoveredCategory);
                  if (!category) return null;
                  const totalAmount = categoryData.reduce((sum, cat) => sum + cat.amount, 0);
                  const percentage = ((category.amount / totalAmount) * 100).toFixed(1);
                  return (
                    <>
                      <div className="font-semibold">{category.category}</div>
                      <div className="text-xs opacity-90">
                        {formatCurrency(category.amount)} • {percentage}%
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Instruction hint when small slices exist */}
      {categoryData.some(cat => isSmallSlice(cat.amount)) && !magnifierData && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Long-press on the chart to magnify small categories
          </p>
        </div>
      )}
    </div>
  );
};
