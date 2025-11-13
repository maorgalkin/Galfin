import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getButtonBg,
  getButtonHoverBg,
  getBorderColor,
  getIconColor,
  getHeadingColor,
  getSubheadingColor,
  getActiveBg,
  getActiveBorderColor,
  getInactiveBg,
  getInactiveTextColor,
  getInactiveBorderColor,
  type ThemeColor,
} from '../../utils/themeColors';

interface MonthData {
  label: string;
  monthName: string;
  year: string;
  start: Date;
  end: Date;
}

interface MonthNavigatorProps {
  months: MonthData[];
  activeMonthIndex: number;
  onMonthChange: (index: number) => void;
  direction: number;
  onDirectionChange: (direction: number) => void;
  userName?: string;
  themeColor?: ThemeColor;
  householdName?: string;
  ownerName?: string;
}

/**
 * Carousel-style month navigator with animated transitions
 * Shows previous, current, and next month with left/right navigation
 */
export const MonthNavigator: React.FC<MonthNavigatorProps> = ({
  months,
  activeMonthIndex,
  onMonthChange,
  direction,
  onDirectionChange,
  userName,
  themeColor = 'purple',
  householdName,
  ownerName,
}) => {
  const handlePrevious = () => {
    onDirectionChange(-1);
    onMonthChange(activeMonthIndex - 1);
  };

  const handleNext = () => {
    onDirectionChange(1);
    onMonthChange(activeMonthIndex + 1);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
    const swipeThreshold = 50; // Minimum distance for a swipe
    const offsetX = info.offset.x;

    if (offsetX > swipeThreshold && activeMonthIndex > 0) {
      // Swiped right - go to previous (newer) month
      handlePrevious();
    } else if (offsetX < -swipeThreshold && activeMonthIndex < months.length - 1) {
      // Swiped left - go to next (older) month
      handleNext();
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-semibold ${getHeadingColor(themeColor)}`}>
          {householdName && ownerName 
            ? `${householdName} (Owner: ${ownerName})`
            : userName 
              ? `${userName}'s Family Budget` 
              : 'Family Budget'}
        </h2>
        <div className={`text-sm ${getSubheadingColor(themeColor)}`}>
          Select month to analyze budget performance and financial overview
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 w-full max-w-6xl mx-auto px-4">
        {/* Left Arrow - Go to Previous Month in Carousel (Newer - Lower Index) */}
        <button
          onClick={handlePrevious}
          disabled={activeMonthIndex <= 0}
          className={`flex-shrink-0 p-2 sm:p-3 rounded-full ${getButtonBg(themeColor)} border ${getBorderColor(themeColor)} ${getButtonHoverBg(themeColor)} disabled:opacity-30 disabled:cursor-not-allowed transition-all`}
          title="Newer Month"
        >
          <svg className={`w-4 h-4 sm:w-6 sm:h-6 ${getIconColor(themeColor)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Month Carousel - Scrolls LEFT to RIGHT (Current month at leftmost, oldest at rightmost) */}
        <motion.div 
          className="relative w-full sm:w-[560px] h-20 sm:h-32 flex items-center justify-center overflow-visible cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center justify-center gap-0 sm:gap-2">
            <AnimatePresence mode="popLayout">
              {/* Dummy placeholder on the left (when at current month) */}
              {activeMonthIndex === 0 && (
                <motion.div
                  key="future-dummy"
                  initial={{ opacity: 0, x: direction * -50 }}
                  animate={{ opacity: 0.4, x: 0 }}
                  exit={{ opacity: 0, x: direction * 50 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute -left-3 sm:relative w-28 sm:w-40 h-16 sm:h-28 rounded-lg border border-gray-200 bg-gray-50 scale-75 sm:scale-[0.7] flex-shrink-0 flex items-center justify-center z-0 sm:z-auto"
                >
                  <span className="text-xs sm:text-base font-medium text-gray-400">Future</span>
                </motion.div>
              )}

              {months.map((month, idx) => {
                const isActive = idx === activeMonthIndex;

                // Calculate visibility based on position relative to active month
                // Show: previous month (if exists), active month, next month (if exists)
                const showPrevious = idx === activeMonthIndex - 1 && activeMonthIndex > 0;
                const showNext = idx === activeMonthIndex + 1 && activeMonthIndex < months.length - 1;
                const isVisible = isActive || showPrevious || showNext;

                if (!isVisible) return null;

                // Mobile: Tighter overlap with absolute positioning (cards are w-28=112px, scaled to 84px, offset 12px, show 72px visible)
                // Desktop: Normal flexbox flow with gap-2 spacing (cards are w-40=160px, scaled to 112px, 8px gap)
                let positionClass = '';
                if (!isActive && showPrevious) {
                  // Previous month on left - mobile: tighter overlap, desktop: normal flow
                  positionClass = 'absolute -left-3 sm:relative z-0 sm:z-auto';
                } else if (!isActive && showNext) {
                  // Next month on right - mobile: tighter overlap, desktop: normal flow
                  positionClass = 'absolute -right-3 sm:relative z-0 sm:z-auto';
                } else {
                  // Active month - always centered
                  positionClass = 'relative z-10 sm:z-auto';
                }

                return (
                  <motion.button
                    key={month.label}
                    initial={{ opacity: 0, x: direction * 100 }}
                    animate={{ opacity: isActive ? 1 : 0.6, x: 0 }}
                    exit={{ opacity: 0, x: direction * -100 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    onClick={() => onMonthChange(idx)}
                    className={`${positionClass} sm:relative sm:z-auto w-28 sm:w-40 h-16 sm:h-28 rounded-lg border font-medium flex flex-col items-center justify-center flex-shrink-0 ${
                      isActive
                        ? `${getActiveBg(themeColor)} text-white ${getActiveBorderColor(themeColor)} shadow-lg scale-100`
                        : `${getInactiveBg(themeColor)} ${getInactiveTextColor(themeColor)} ${getInactiveBorderColor(themeColor)} scale-75 sm:scale-[0.7] hover:opacity-100 hover:scale-80`
                    }`}
                  >
                    <div className={`text-sm sm:text-xl ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {month.monthName}
                    </div>
                    <div className={`text-xs sm:text-lg ${isActive ? 'font-normal' : 'font-light'} mt-1`}>
                      {month.year}
                    </div>
                  </motion.button>
                );
              })}

              {/* Dummy placeholder on the right (when at oldest month) */}
              {activeMonthIndex === months.length - 1 && (
                <motion.div
                  key="past-dummy"
                  initial={{ opacity: 0, x: direction * 50 }}
                  animate={{ opacity: 0.4, x: 0 }}
                  exit={{ opacity: 0, x: direction * -50 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute -right-3 sm:relative w-28 sm:w-40 h-16 sm:h-28 rounded-lg border border-gray-200 bg-gray-50 scale-75 sm:scale-[0.7] flex-shrink-0 flex items-center justify-center z-0 sm:z-auto"
                >
                  <span className="text-xs sm:text-base font-medium text-gray-400">Past</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Arrow - Go to Next Month in Carousel (Older - Higher Index) */}
        <button
          onClick={handleNext}
          disabled={activeMonthIndex >= months.length - 1}
          className={`flex-shrink-0 p-2 sm:p-3 rounded-full ${getButtonBg(themeColor)} border ${getBorderColor(themeColor)} ${getButtonHoverBg(themeColor)} disabled:opacity-30 disabled:cursor-not-allowed transition-all`}
          title="Older Month"
        >
          <svg className={`w-4 h-4 sm:w-6 sm:h-6 ${getIconColor(themeColor)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};
