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

// DEBUG: Set to true to visualize interaction zones
const DEBUG_ZONES = false;

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
  const [showEducationModal, setShowEducationModal] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressAttemptRef = useRef(false); // Track if we're attempting a long-press
  const chartRef = useRef<HTMLDivElement>(null);
  const mobileChartRef = useRef<HTMLDivElement>(null);
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
      
      // Save current scroll position and body styles
      const scrollY = window.scrollY;
      const prevOverflow = document.body.style.overflow;
      const prevPosition = document.body.style.position;
      const prevTop = document.body.style.top;
      const prevWidth = document.body.style.width;
      const prevTouchAction = document.body.style.touchAction;
      
      // Apply aggressive scroll lock (Safari-compatible)
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      console.log('🔒 Body styles applied:', { 
        position: document.body.style.position,
        top: document.body.style.top,
        overflow: document.body.style.overflow, 
        touchAction: document.body.style.touchAction
      });
      
      // Only prevent touchmove (not touchstart which blocks interactions)
      const preventTouchMove = (e: TouchEvent) => {
        console.log('🚫 Preventing scroll');
        e.preventDefault();
      };
      
      // Add listener only for touchmove
      document.addEventListener('touchmove', preventTouchMove, { passive: false });
      console.log('🔒 Touchmove prevention listener added');
      
      return () => {
        console.log('🔓 UNLOCKING SCROLL');
        
        // Remove listener first
        document.removeEventListener('touchmove', preventTouchMove);
        
        // Restore body styles
        document.body.style.position = prevPosition;
        document.body.style.top = prevTop;
        document.body.style.width = prevWidth;
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
        
        console.log('🔓 Scroll unlocked, restored to position:', scrollY);
      };
    } else {
      console.log('🔓 Magnifier not active, ensuring scroll is unlocked');
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
    
    event.stopPropagation();
    
    // Store initial position
    let x: number, y: number;
    if ('touches' in event) {
      x = event.touches[0].clientX;
      y = event.touches[0].clientY;
    } else {
      x = event.clientX;
      y = event.clientY;
    }
    touchStartRef.current = { x, y };
    
    // Check if press is inside the pie chart area (radius check)
    const bounds = mobileChartRef.current?.getBoundingClientRect() || chartRef.current?.getBoundingClientRect();
    if (!bounds) return;
    
    // Calculate distance from center of chart container
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    // Pie chart radius is 90px. Add a small buffer (100px) to be safe.
    const isInsideChart = distance < 100;
    
    if (isInsideChart) {
      console.log('📍 Press inside chart (dist:', Math.round(distance), ') - will show education modal on long-press');
      // Start timer to show education modal
      longPressTimerRef.current = setTimeout(() => {
        console.log('💡 Showing education modal');
        setShowEducationModal(true);
      }, 500);
      return;
    }
    
    // Press is outside chart - check for small slices and start magnifier
    const hasSmallSlices = categoryData.some(cat => isSmallSlice(cat.amount));
    if (!hasSmallSlices) {
      console.log('❌ No small slices found, magnifier not needed');
      return;
    }
    console.log('✅ Press outside chart (dist:', Math.round(distance), ') with small slices, starting magnifier timer');
    isLongPressAttemptRef.current = true;

    // Position already stored in touchStartRef from earlier in this function
    const startPos = touchStartRef.current;
    console.log('📍 Position for magnifier:', startPos);

    // Start timer for long press (500ms)
    longPressTimerRef.current = setTimeout(() => {
      console.log('⏰ Timer fired! Activating magnifier');
      console.log('📐 Checking refs:', {
        chartRef: !!chartRef.current,
        mobileChartRef: !!mobileChartRef.current
      });
      
      // Get bounds from either desktop or mobile chart
      let bounds: DOMRect | null = null;
      if (mobileChartRef.current) {
        bounds = mobileChartRef.current.getBoundingClientRect();
        console.log('📱 Using mobile chart bounds:', bounds);
      } else if (chartRef.current) {
        bounds = chartRef.current.getBoundingClientRect();
        console.log('🖥️ Using desktop chart bounds:', bounds);
      } else {
        console.error('❌ No chart ref available!');
      }
      
      console.log('📐 Final chart bounds:', bounds);
      setIsMagnifierActive(true);
      setMagnifierData({
        position: { x: startPos.x, y: startPos.y },
        chartBounds: bounds,
        hoveredCategory: null
      });
    }, 500);
  };

  // Handle press end - select category if magnifier was active or detect tap
  const handlePressEnd = (event: React.MouseEvent | React.TouchEvent) => {
    console.log('🔍 Press end', { isMagnifierActive });
    
    // Get end position
    let endX: number, endY: number;
    if ('changedTouches' in event) {
      endX = event.changedTouches[0].clientX;
      endY = event.changedTouches[0].clientY;
    } else {
      endX = event.clientX;
      endY = event.clientY;
    }
    
    if (longPressTimerRef.current) {
      console.log('⏰ Clearing timer');
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    isLongPressAttemptRef.current = false;
    
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
    } else if (touchStartRef.current && !isMagnifierActive) {
      // Handle normal tap (not a long-press) - select category at tap position
      const dx = Math.abs(endX - touchStartRef.current.x);
      const dy = Math.abs(endY - touchStartRef.current.y);
      
      // Only treat as tap if finger didn't move much
      if (dx < 10 && dy < 10) {
        console.log('👆 Tap detected, checking for category');
        // Use detectCategoryAtPosition but allow all slices (not just small ones)
        const category = detectCategoryAtPosition(endX, endY, true);
        
        if (category) {
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
      }
    }
    
    setIsMagnifierActive(false);
    setMagnifierData(null);
    touchStartRef.current = null;
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
    
    // Get fresh bounds from whichever chart is visible
    let bounds = magnifierData?.chartBounds;
    if (mobileChartRef.current) {
      bounds = mobileChartRef.current.getBoundingClientRect();
    } else if (chartRef.current) {
      bounds = chartRef.current.getBoundingClientRect();
    }
    
    setMagnifierData({
      position: { x, y },
      chartBounds: bounds || null,
      hoveredCategory
    });
  };

  // Detect which category is at the given position
  const detectCategoryAtPosition = (x: number, y: number, allowAll: boolean = false): string | null => {
    if (!chartRef.current && !mobileChartRef.current) return null;
    
    // Get all pie slice elements
    const elements = document.elementsFromPoint(x, y);
    
    // Find the pie slice path element
    for (const element of elements) {
      // Check if it's a path (SVG)
      if (element.tagName.toLowerCase() === 'path') {
        // Check if it's inside one of our charts
        const isInsideChart = (chartRef.current && chartRef.current.contains(element)) || 
                              (mobileChartRef.current && mobileChartRef.current.contains(element));
        
        if (isInsideChart) {
           // It's a path inside our chart.
           // Recharts structure:
           // <g class="recharts-layer recharts-pie">
           //   <g class="recharts-layer recharts-pie-sector"> <path ... /> </g>
           //   <g class="recharts-layer recharts-pie-sector"> <path ... /> </g>
           // </g>
           
           let targetIndex = -1;
           let parent = element.parentElement;
           
           // Check if the parent is a sector wrapper (contains 'recharts-pie-sector')
           if (parent && parent.classList.contains('recharts-pie-sector')) {
             // We need to look at the grandparent to find siblings
             const grandParent = parent.parentElement;
             if (grandParent) {
               // Get all sector groups
               const sectors = Array.from(grandParent.children).filter(c => 
                 c.classList.contains('recharts-pie-sector')
               );
               targetIndex = sectors.indexOf(parent);
             }
           } else if (parent) {
             // Fallback: maybe paths are direct children (older Recharts or different config)
             const siblingPaths = Array.from(parent.children).filter(c => c.tagName.toLowerCase() === 'path');
             targetIndex = siblingPaths.indexOf(element);
           }
             
           if (DEBUG_ZONES) {
              console.log('🎯 Hit detection:', { 
                tagName: element.tagName, 
                parentClass: parent?.getAttribute('class'),
                grandParentClass: parent?.parentElement?.getAttribute('class'),
                targetIndex,
                category: categoryData[targetIndex]?.category
              });
           }

           if (targetIndex >= 0 && targetIndex < categoryData.length) {
             const category = categoryData[targetIndex];
             // Return if allowAll is true OR if it's a small slice
             if (allowAll || isSmallSlice(category.amount)) {
               return category.category;
             }
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
            className="flex-shrink-0 p-8 relative"
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
            {DEBUG_ZONES && (
              <>
                {/* Magnifier Zone (Outside) - Blue */}
                <div className="absolute inset-0 bg-blue-500/20 pointer-events-none z-0 border-2 border-blue-500">
                  <div className="absolute top-2 left-2 text-xs text-blue-700 font-bold">Magnifier Zone</div>
                </div>
                {/* Pie Zone (Inside) - Red Circle (Radius 100px = Width 200px) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-red-500/20 pointer-events-none z-10 border-2 border-red-500">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-red-700 font-bold text-center">Pie Zone<br/>(Education)</div>
                </div>
              </>
            )}
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
      <div className="md:hidden p-8">
        <div 
          ref={mobileChartRef}
          className="relative"
          style={{ 
            userSelect: 'none', 
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            touchAction: 'none' // Always prevent default touch actions on chart
          }}
          onMouseDown={handlePressStart}
          onMouseMove={handleMove}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchMove={handleMove}
          onTouchEnd={handlePressEnd}
        >
        {DEBUG_ZONES && (
          <>
            {/* Magnifier Zone (Outside) - Blue */}
            <div className="absolute inset-0 bg-blue-500/20 pointer-events-none z-0 border-2 border-blue-500">
              <div className="absolute top-2 left-2 text-xs text-blue-700 font-bold">Magnifier Zone</div>
            </div>
            {/* Pie Zone (Inside) - Red Circle (Radius 100px = Width 200px) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-red-500/20 pointer-events-none z-10 border-2 border-red-500">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-red-700 font-bold text-center">Pie Zone<br/>(Education)</div>
            </div>
          </>
        )}
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
        </div>
      
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
                left: `${magnifierData.position.x - 80}px`, // 80 = radius, centers the circle
                top: `${magnifierData.position.y - 80}px`, // 80 = radius, centers the circle on finger
                width: '160px',
                height: '160px'
              }}
            >
              {/* Circular lens with border */}
              <div 
                className="relative w-full h-full rounded-full border-4 border-blue-500 shadow-2xl"
                style={{
                  background: '#ffffff',
                  overflow: 'hidden',
                  clipPath: 'circle(50% at 50% 50%)'
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
                      className="absolute"
                      style={{
                        width: `${magnifiedWidth}px`,
                        height: `${magnifiedHeight}px`,
                        left: `${offsetX}px`,
                        top: `${offsetY}px`
                      }}
                    >
                      <svg width={magnifiedWidth} height={magnifiedHeight}>
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

      {/* Education Modal */}
      {showEducationModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowEducationModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 m-4 max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
              💡 Magnifier Tool
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              To inspect small categories more closely, press and hold <strong>outside of the chart area</strong> (in the empty space around the pie).
            </p>
            <button
              onClick={() => setShowEducationModal(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
