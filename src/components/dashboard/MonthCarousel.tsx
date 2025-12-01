import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';

interface MonthData {
  label: string;
  monthName: string;
  year: string;
  start: Date;
  end: Date;
}

interface MonthCarouselProps {
  months: MonthData[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onOlderClick: () => void;
}

const CARD_WIDTH = 160; // Width of each card in pixels
const CARD_GAP = 16; // Gap between cards

export const MonthCarousel: React.FC<MonthCarouselProps> = ({
  months,
  activeIndex,
  onIndexChange,
  onOlderClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  // Calculate the center position for the active card
  const getPositionForIndex = (index: number) => {
    // Center the active card in the viewport
    // Add 1 for the "Future" card offset
    const offset = (index + 1) * (CARD_WIDTH + CARD_GAP);
    const centerOffset = containerWidth / 2 - CARD_WIDTH / 2;
    return centerOffset - offset;
  };

  // Animate to the active index whenever it changes
  useEffect(() => {
    if (containerWidth === 0) return;
    const targetX = getPositionForIndex(activeIndex);
    animate(x, targetX, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    });
  }, [activeIndex, x, containerWidth]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragging(false);
    
    const velocity = info.velocity.x;
    const currentX = x.get();
    
    // Calculate which card we're closest to
    // Account for the "Future" card offset
    const centerOffset = containerWidth / 2 - CARD_WIDTH / 2;
    const relativeX = currentX - centerOffset;
    const estimatedIndex = Math.round(-relativeX / (CARD_WIDTH + CARD_GAP)) - 1;
    
    let newIndex = activeIndex;
    
    if (Math.abs(velocity) > 500) {
      // High velocity - calculate momentum-based target
      const momentumDistance = velocity * 0.2; // Adjust multiplier for desired momentum feel
      const momentumIndex = Math.round((currentX + momentumDistance - centerOffset) / -(CARD_WIDTH + CARD_GAP)) - 1;
      newIndex = momentumIndex;
    } else {
      // Low velocity - snap to nearest card
      newIndex = estimatedIndex;
    }
    
    // Clamp to valid range
    newIndex = Math.max(0, Math.min(months.length - 1, newIndex));
    
    if (newIndex !== activeIndex) {
      onIndexChange(newIndex);
    } else {
      // Snap back to current position
      const targetX = getPositionForIndex(activeIndex);
      animate(x, targetX, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
    }
  };

  return (
    <div className="relative w-full overflow-hidden py-8">
      {/* Left Arrow */}
      <button
        onClick={() => onIndexChange(Math.max(0, activeIndex - 1))}
        disabled={activeIndex <= 0}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
        aria-label="Previous month"
      >
        <svg className="w-6 h-6 text-blue-700 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="flex justify-center items-center h-40 overflow-hidden"
      >
        <motion.div
          drag="x"
          dragConstraints={{ 
            left: -((months.length + 1) * (CARD_WIDTH + CARD_GAP)) - containerWidth / 2,
            right: containerWidth / 2 + (CARD_WIDTH + CARD_GAP)
          }}
          dragElastic={0.15}
          dragTransition={{ bounceStiffness: 200, bounceDamping: 20 }}
          dragMomentum={true}
          onDragStart={() => setDragging(true)}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="flex gap-4 cursor-grab active:cursor-grabbing"
        >
          {/* Future placeholder */}
          <div
            className="flex-shrink-0 w-40 h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30 flex items-center justify-center opacity-40"
            style={{ width: CARD_WIDTH }}
          >
            <span className="text-sm font-medium text-gray-400">Future</span>
          </div>

          {/* Month cards */}
          {months.map((month, idx) => {
            const offset = idx - activeIndex;
            const absOffset = Math.abs(offset);
            
            // Calculate scale and opacity based on distance from center
            const scale = Math.max(0.7, 1 - absOffset * 0.15);
            const opacity = Math.max(0.4, 1 - absOffset * 0.3);
            const isActive = idx === activeIndex;

            return (
              <motion.button
                key={month.label}
                onClick={() => !dragging && onIndexChange(idx)}
                style={{
                  width: CARD_WIDTH,
                  scale: dragging ? 1 : scale,
                  opacity: dragging ? 1 : opacity,
                  zIndex: isActive ? 10 : Math.max(0, 5 - absOffset),
                }}
                animate={{
                  scale: dragging ? 1 : scale,
                  opacity: dragging ? 1 : opacity,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`flex-shrink-0 h-32 rounded-xl border-2 font-medium flex flex-col items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-500 shadow-xl'
                    : 'bg-white dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <div className={`text-xl ${isActive ? 'font-bold' : 'font-semibold'}`}>
                  {month.monthName}
                </div>
                <div className={`text-base ${isActive ? 'font-medium' : 'font-normal'} mt-1 opacity-90`}>
                  {month.year}
                </div>
              </motion.button>
            );
          })}

          {/* Older button */}
          <motion.button
            onClick={onOlderClick}
            style={{ width: CARD_WIDTH }}
            className="flex-shrink-0 h-32 rounded-xl border-2 border-dashed border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 hover:border-blue-500 dark:hover:border-blue-400 flex items-center justify-center transition-all opacity-70 hover:opacity-100"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-bold text-blue-700 dark:text-blue-300">Older</span>
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </motion.button>
        </motion.div>
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => onIndexChange(Math.min(months.length - 1, activeIndex + 1))}
        disabled={activeIndex >= months.length - 1}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
        aria-label="Next month"
      >
        <svg className="w-6 h-6 text-blue-700 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Month indicator dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {months.map((_, idx) => (
          <button
            key={idx}
            onClick={() => onIndexChange(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === activeIndex
                ? 'w-8 bg-blue-600 dark:bg-blue-400'
                : 'w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
            aria-label={`Go to ${months[idx].monthName} ${months[idx].year}`}
          />
        ))}
      </div>
    </div>
  );
};
