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
    chartBounds: DOMRect | null;
    hoveredCategory: string | null;
  } | null>(null);
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const magnifierChartRef = useRef<HTMLDivElement>(null);

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

  // Lock/unlock body scroll when magnifier is active
  useEffect(() => {
    console.log('🔒 Scroll lock effect triggered', { isMagnifierActive });
    if (isMagnifierActive) {
      console.log('🔒 LOCKING SCROLL');
      // Lock scroll
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      console.log('🔒 Body styles applied:', { 
        overflow: document.body.style.overflow, 
        touchAction: document.body.style.touchAction,
        prev: { prevOverflow, prevTouchAction }
      });
      
      // Add global touch move listener to prevent all scrolling
      const preventScroll = (e: TouchEvent) => {
        console.log('🚫 Preventing scroll event');
        e.preventDefault();
        e.stopPropagation();
      };
      document.addEventListener('touchmove', preventScroll, { passive: false });
      console.log('🔒 Global touchmove listener added');
      
      return () => {
        console.log('🔓 UNLOCKING SCROLL');
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
        document.removeEventListener('touchmove', preventScroll);
        console.log('🔓 Scroll unlocked');
      };
    } else {
      console.log('🔓 Magnifier not active, ensuring scroll is unlocked');
      // Unlock scroll
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }, [isMagnifierActive]);

  // Calculate if a category slice is too small (less than 5%)
  const isSmallSlice = (amount: number) => {
    const totalAmount = categoryData.reduce((sum, cat) => sum + cat.amount, 0);
    return (amount / totalAmount) * 100 < 5;
  };

  // Handle long press start
  const handlePressStart = (event: React.MouseEvent | React.TouchEvent) => {
    console.log('🔍 Press start', { type: event.type });
    event.preventDefault(); // Prevent text selection
    event.stopPropagation();
    
    // Check if any small slices exist (commented out for testing)
    // const hasSmallSlices = categoryData.some(cat => isSmallSlice(cat.amount));
    // if (!hasSmallSlices) {
    //   console.log('❌ No small slices found');
    //   return;
    // }
    console.log('✅ Starting magnifier timer');

    // Get position for magnifier
    let x: number, y: number;
    if ('touches' in event) {
      x = event.touches[0].clientX;
      y = event.touches[0].clientY;
      touchStartRef.current = { x, y };
      console.log('📱 Touch position:', { x, y });
    } else {
      x = event.clientX;
      y = event.clientY;
      console.log('🖱️ Mouse position:', { x, y });
    }

    // Start timer for long press (500ms)
    longPressTimerRef.current = setTimeout(() => {
      console.log('⏰ Timer fired! Activating magnifier');
      const bounds = chartRef.current?.getBoundingClientRect() || null;
      console.log('📐 Chart bounds:', bounds);
      setIsMagnifierActive(true);
      setMagnifierData({
        position: { x, y },
        chartBounds: bounds,
        hoveredCategory: null
      });
    }, 500);
  };

  // Handle press end - select category if magnifier was active
  const handlePressEnd = () => {
    console.log('🔍 Press end', { isMagnifierActive });
    if (longPressTimerRef.current) {
      console.log('⏰ Clearing timer');
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // If magnifier was active and we have a hovered category, select it
    if (isMagnifierActive && magnifierData?.hoveredCategory) {
      const category = magnifierData.hoveredCategory;
      const categoryItem = categoryData.find(c => c.category === category);
      
      if (categoryItem) {
        const totalAmount = categoryData.reduce((sum, cat) => sum + cat.amount, 0);
        const percentage = ((categoryItem.amount / totalAmount) * 100).toFixed(1);
        
        // On mobile, set focused category to show transactions
        if (window.innerWidth < 768) {
          setFocusedCategory({
            category: categoryItem.category,
            amount: categoryItem.amount,
            percentage
          });
        } else {
          // On desktop, set selected category for side panel
          setSelectedDesktopCategory(category);
        }
      }
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
          console.log('❌ Movement detected, canceling timer:', { deltaX, deltaY });
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
      return;
    }

    console.log('🔍 Moving magnifier');
    // Prevent scrolling when magnifier is active
    event.preventDefault();
    event.stopPropagation();

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
    const bounds = chartRef.current?.getBoundingClientRect() || magnifierData?.chartBounds || null;
    
    setMagnifierData({
      position: { x, y },
      chartBounds: bounds,
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
            style={{ 
              userSelect: 'none', 
              WebkitUserSelect: 'none',
              touchAction: isMagnifierActive ? 'none' : 'auto'
            }}
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
        style={{ 
          userSelect: 'none', 
          WebkitUserSelect: 'none',
          touchAction: isMagnifierActive ? 'none' : 'auto'
        }}
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

      {/* Magnifier Lens with Zoomed Chart */}
      <AnimatePresence>
        {magnifierData && isMagnifierActive && magnifierData.chartBounds && (() => {
          console.log('🎨 Rendering magnifier', { magnifierData, isMagnifierActive });
          return true;
        })() && (
          <>
            {/* Magnifier Circle - shows zoomed portion of chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed pointer-events-none z-50"
              style={{
                left: `${magnifierData.position.x}px`,
                top: `${magnifierData.position.y - 120}px`, // Finger at bottom of circle (radius 80 + 40)
                transform: 'translate(-50%, 0)',
                width: '160px',
                height: '160px'
              }}
            >
              {/* Circular lens with border */}
              <div 
                className="relative w-full h-full rounded-full border-4 border-blue-500 shadow-2xl"
                style={{
                  background: '#ffffff',
                  overflow: 'hidden'
                }}
              >
                {/* Magnified chart - 2.5x zoom */}
                {(() => {
                  console.log('📊 Rendering magnified chart');
                  console.log('📊 Chart bounds:', magnifierData.chartBounds);
                  console.log('📊 Category data:', categoryData);
                  const zoom = 2.5;
                  const chartWidth = magnifierData.chartBounds.width;
                  const chartHeight = magnifierData.chartBounds.height;
                  console.log('📏 Chart dimensions:', { chartWidth, chartHeight, zoom });
                  
                  if (!chartWidth || !chartHeight) {
                    console.error('❌ Invalid chart dimensions', { chartWidth, chartHeight });
                    return (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-red-600">
                        ERROR: No chart dimensions
                      </div>
                    );
                  }
                  
                  if (chartWidth < 10 || chartHeight < 10) {
                    console.error('❌ Chart dimensions too small', { chartWidth, chartHeight });
                    return (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-red-600">
                        ERROR: Chart too small
                      </div>
                    );
                  }
                  
                  // Calculate relative position within chart (0 to 1)
                  const relX = (magnifierData.position.x - magnifierData.chartBounds.left) / chartWidth;
                  const relY = (magnifierData.position.y - magnifierData.chartBounds.top) / chartHeight;
                  
                  console.log('📍 Relative position:', { relX, relY });
                  
                  // Calculate offset to center the magnified area under the lens
                  const offsetX = -(relX * chartWidth * zoom - 80);
                  const offsetY = -(relY * chartHeight * zoom - 80);
                  
                  console.log('🎯 Offset:', { offsetX, offsetY });
                  
                  const magnifiedWidth = Math.round(chartWidth * zoom);
                  const magnifiedHeight = Math.round(chartHeight * zoom);
                  const magnifiedRadius = Math.round(90 * zoom);
                  
                  console.log('📏 Chart dimensions:', { magnifiedWidth, magnifiedHeight, magnifiedRadius });
                  console.log('✅ About to render chart element');
                  
                  return (
                    <div
                      ref={magnifierChartRef}
                      className="absolute top-0 left-0"
                      style={{
                        width: `${magnifiedWidth}px`,
                        height: `${magnifiedHeight}px`,
                        transform: `translate(${offsetX}px, ${offsetY}px)`,
                        background: 'rgba(255,0,0,0.1)' // Debug: red tint to see if div renders
                      }}
                    >
                      <svg width={magnifiedWidth} height={magnifiedHeight} style={{ background: 'rgba(0,255,0,0.1)' }}>
                        <PieChart width={magnifiedWidth} height={magnifiedHeight}>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={false}
                            outerRadius={magnifiedRadius}
                            innerRadius={0}
                            fill="#8884d8"
                            dataKey="amount"
                            isAnimationActive={false}
                          >
                            {categoryData.map((entry, index) => {
                              const colors = getCategoryColor(entry.category, 'expense', personalBudget);
                              const isHovered = entry.category === magnifierData.hoveredCategory;
                              const isSmall = isSmallSlice(entry.amount);
                              return (
                                <Cell 
                                  key={`cell-magnified-${index}`} 
                                  fill={colors.hexColor}
                                  opacity={isHovered ? 1 : (isSmall ? 0.85 : 0.4)}
                                  stroke={isHovered ? '#1e40af' : 'none'}
                                  strokeWidth={isHovered ? 4 : 0}
                                />
                              );
                            })}
                          </Pie>
                        </PieChart>
                      </svg>
                    </div>
                  );
                })()}
                {/* Crosshair indicator at center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg z-10" />
              </div>
            </motion.div>

            {/* Category info tooltip below magnifier */}
            {magnifierData.hoveredCategory && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="fixed pointer-events-none z-50 bg-gray-900 dark:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-medium max-w-[200px]"
                style={{
                  left: magnifierData.position.x,
                  top: magnifierData.position.y + 95,
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
                      <div className="font-semibold truncate">{category.category}</div>
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
