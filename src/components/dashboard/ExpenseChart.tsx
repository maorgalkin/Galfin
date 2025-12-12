import React, { useEffect, useRef, useState } from 'react';
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
  const playgroundRef = useRef<HTMLDivElement>(null);
  const [playgroundLogs, setPlaygroundLogs] = useState<string[]>([]);
  const [playgroundPointerState, setPlaygroundPointerState] = useState({
    isActive: false,
    pointerType: '',
    x: 0,
    y: 0,
  });
  const [playgroundLensState, setPlaygroundLensState] = useState({
    isVisible: false,
    origin: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
  });
  const playgroundPointerIdRef = useRef<number | null>(null);
  const playgroundStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const playgroundLongPressTimerRef = useRef<number | null>(null);

  const logPlayground = (message: string) => {
    setPlaygroundLogs(prev => {
      const next = [`${new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })} ${message}`, ...prev];
      return next.slice(0, 6);
    });
  };

  const getPlaygroundRelativePosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = playgroundRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: event.clientX, y: event.clientY };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const clearPlaygroundLongPressTimer = () => {
    if (playgroundLongPressTimerRef.current !== null) {
      window.clearTimeout(playgroundLongPressTimerRef.current);
      playgroundLongPressTimerRef.current = null;
      logPlayground('long-press timer cleared');
    }
  };

  const handlePlaygroundPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) {
      return;
    }

    const relative = getPlaygroundRelativePosition(event);

    logPlayground(`pointerdown (${event.pointerType})`);

    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
      logPlayground('pointer captured');
      playgroundPointerIdRef.current = event.pointerId;
    } catch (error) {
      logPlayground('pointer capture failed');
    }

    playgroundStartPositionRef.current = relative;

    setPlaygroundPointerState({
      isActive: true,
      pointerType: event.pointerType,
      x: relative.x,
      y: relative.y,
    });

    if (playgroundLongPressTimerRef.current !== null) {
      clearPlaygroundLongPressTimer();
    }

    const delay = event.pointerType === 'touch' ? 450 : 250;
    playgroundLongPressTimerRef.current = window.setTimeout(() => {
      logPlayground('long-press timer fired -> show lens');
      setPlaygroundLensState({
        isVisible: true,
        origin: relative,
        current: relative,
      });
      playgroundLongPressTimerRef.current = null;
    }, delay);
  };

  const handlePlaygroundPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!playgroundPointerState.isActive) {
      return;
    }

    const relative = getPlaygroundRelativePosition(event);

    if (
      playgroundLongPressTimerRef.current !== null &&
      playgroundStartPositionRef.current
    ) {
      const dx = relative.x - playgroundStartPositionRef.current.x;
      const dy = relative.y - playgroundStartPositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 20) {
        logPlayground('movement > 20px -> cancel lens timer');
        clearPlaygroundLongPressTimer();
      }
    }

    setPlaygroundPointerState(prev => ({
      ...prev,
      x: relative.x,
      y: relative.y,
    }));

    setPlaygroundLensState(prev =>
      prev.isVisible
        ? {
            ...prev,
            current: relative,
          }
        : prev
    );
  };

  const handlePlaygroundPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!playgroundPointerState.isActive) {
      return;
    }

    logPlayground('pointerup');
    clearPlaygroundLongPressTimer();

    try {
      const target = event.currentTarget as Element;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
        logPlayground('pointer released');
      }
    } catch (error) {
      logPlayground('pointer release failed');
    }

    playgroundPointerIdRef.current = null;
    playgroundStartPositionRef.current = null;

    setPlaygroundLensState(prev =>
      prev.isVisible
        ? {
            ...prev,
            isVisible: false,
          }
        : prev
    );

    setPlaygroundPointerState(prev => ({
      ...prev,
      isActive: false,
    }));
  };

  useEffect(() => {
    return () => {
      if (playgroundLongPressTimerRef.current !== null) {
        window.clearTimeout(playgroundLongPressTimerRef.current);
      }
    };
  }, []);

  // Update selected category when prop changes
  useEffect(() => {
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

  const handleCategoryClick = (entry: CategoryData) => {
    const totalAmount = categoryData.reduce((sum, cat) => sum + cat.amount, 0);
    const percentage = ((entry.amount / totalAmount) * 100).toFixed(1);

    // On mobile, set focused category to show transactions
    if (window.innerWidth < 768) {
      setFocusedCategory({
        category: entry.category,
        amount: entry.amount,
        percentage
      });
    } else {
      // On desktop, set selected category for side panel
      setSelectedDesktopCategory(entry.category);
    }
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
            animate={{
              width: selectedDesktopCategory ? '40%' : '100%'
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-shrink-0 p-8 relative"
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
                >
                  {categoryData.map((entry, index) => {
                    const colors = getCategoryColor(entry.category, 'expense', personalBudget);
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={colors.hexColor}
                        cursor="pointer"
                        onClick={() => handleCategoryClick(entry)}
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
                    backgroundColor: '#1f2937', // gray-800
                    border: 'none',
                    borderRadius: '0.5rem',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    color: '#f3f4f6',
                    padding: '8px 12px'
                  }}
                  itemStyle={{
                    color: '#f3f4f6'
                  }}
                  wrapperStyle={{
                    outline: 'none'
                  }}
                  cursor={{ fill: 'transparent' }}
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
      <div className="md:hidden">
        <div className="relative">
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
                      onClick={() => handleCategoryClick(entry)}
                    />
                  );
                })}
              </Pie>
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

      {/* Magnifier playground */}
      <div className="mt-8 border border-dashed border-purple-300 rounded-lg bg-purple-50/40 dark:bg-purple-950/20 p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">Magnifier Playground</h3>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Use this sandbox to prototype the hover lens. Safari-friendly behaviors only.
            </p>
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300 text-right">
            <div>Active: {playgroundPointerState.isActive ? 'YES' : 'NO'}</div>
            <div>Pointer: {playgroundPointerState.pointerType || '-'}</div>
            <div>Pos: {Math.round(playgroundPointerState.x)}×{Math.round(playgroundPointerState.y)}</div>
          </div>
        </div>

        <div
          ref={playgroundRef}
          onPointerDown={handlePlaygroundPointerDown}
          onPointerMove={handlePlaygroundPointerMove}
          onPointerUp={handlePlaygroundPointerUp}
          onPointerCancel={handlePlaygroundPointerUp}
          className="relative h-64 rounded-lg bg-white dark:bg-gray-900 shadow-inner overflow-hidden touch-none select-none"
        >
          {playgroundLensState.isVisible ? (
            <>
              <div
                className="absolute w-32 h-32 rounded-full border-2 border-purple-500/80 bg-white/70 dark:bg-gray-900/70 pointer-events-none shadow-lg"
                style={{
                  left: `${playgroundLensState.current.x}px`,
                  top: `${playgroundLensState.current.y}px`,
                  transform: 'translate(-50%, -50%)',
                  transition: 'transform 40ms linear',
                }}
              />
              <div
                className="absolute w-1 h-1 rounded-full bg-purple-600 pointer-events-none"
                style={{
                  left: `${playgroundLensState.origin.x}px`,
                  top: `${playgroundLensState.origin.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              <span>Long-press or hover to trigger the lens timer</span>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-purple-700 dark:text-purple-300 space-y-1">
          {playgroundLogs.length === 0 ? (
            <div>No pointer activity yet. Try long-pressing or hovering.</div>
          ) : (
            playgroundLogs.map((entry, index) => (
              <div key={index}>{entry}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
