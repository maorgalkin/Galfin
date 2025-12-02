import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

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
}

const CARD_WIDTH = 160;
const CARD_GAP = 16;
const VISIBLE_CARDS = 7; // Show cards on both sides of active

export const MonthCarousel: React.FC<MonthCarouselProps> = ({
  months,
  activeIndex,
  onIndexChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  
  const isDisabled = months.length <= 1;

  // Create circular array: render active card in center with cards wrapping around
  const getVisibleMonths = () => {
    if (months.length === 0) return [];
    if (isDisabled) return [{ ...months[0], displayIndex: 0, actualIndex: 0 }];
    
    const visible = [];
    const halfVisible = Math.floor(VISIBLE_CARDS / 2);
    
    for (let i = -halfVisible; i <= halfVisible; i++) {
      // Wrap around using modulo for circular behavior
      let actualIndex = (activeIndex + i + months.length) % months.length;
      visible.push({
        ...months[actualIndex],
        displayIndex: i, // Position relative to center
        actualIndex: actualIndex, // Real index in months array
      });
    }
    
    return visible;
  };

  const visibleMonths = getVisibleMonths();

  // Always center the active card (displayIndex: 0)
  useEffect(() => {
    animate(x, 0, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    });
  }, [activeIndex, x]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { velocity: { x: number; y: number } }) => {
    setDragging(false);
    
    const velocity = info.velocity.x;
    const dragDistance = x.get();
    
    // Calculate momentum: how far the flick should travel
    const momentumMultiplier = 0.4;
    const totalDistance = dragDistance + (velocity * momentumMultiplier);
    
    // Calculate total cards to move through
    const totalCardsMoved = Math.round(-totalDistance / (CARD_WIDTH + CARD_GAP));
    
    if (totalCardsMoved === 0) {
      // Just snap back to center
      animate(x, 0, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
      return;
    }
    
    // For momentum scrolling through multiple cards
    const absCardsMoved = Math.abs(totalCardsMoved);
    const direction = totalCardsMoved > 0 ? 1 : -1;
    
    // Animate through each card with decreasing speed (inertia)
    let currentCard = 0;
    const cardInterval = setInterval(() => {
      currentCard++;
      
      // Calculate new index with wrapping
      let newIndex = (activeIndex + (currentCard * direction) + months.length) % months.length;
      onIndexChange(newIndex);
      
      // Stop when we've moved through all cards
      if (currentCard >= absCardsMoved) {
        clearInterval(cardInterval);
      }
    }, Math.max(50, 300 / absCardsMoved)); // Faster interval for more cards
  };

  const handlePrevious = () => {
    const newIndex = (activeIndex - 1 + months.length) % months.length;
    onIndexChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = (activeIndex + 1) % months.length;
    onIndexChange(newIndex);
  };

  return (
    <div className="relative w-full overflow-hidden py-8">
      {/* Left Arrow */}
      {!isDisabled && (
        <button
          onClick={handlePrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 transition-all shadow-lg"
          aria-label="Previous month"
        >
          <svg className="w-6 h-6 text-blue-700 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="flex justify-center items-center h-40 overflow-hidden"
      >
        <motion.div
          drag={isDisabled ? false : "x"}
          dragConstraints={{ left: -1000, right: 1000 }}
          dragElastic={0.1}
          dragMomentum={!isDisabled}
          onDragStart={() => !isDisabled && setDragging(true)}
          onDragEnd={!isDisabled ? handleDragEnd : undefined}
          style={{ x }}
          className={isDisabled ? "flex gap-4" : "flex gap-4 cursor-grab active:cursor-grabbing"}
        >
          {visibleMonths.map((month) => {
            const absOffset = Math.abs(month.displayIndex);
            const isActive = month.displayIndex === 0;
            
            // Scale and opacity based on distance from center
            const scale = isDisabled ? 1 : Math.max(0.7, 1 - absOffset * 0.12);
            const opacity = isDisabled ? 1 : Math.max(0.3, 1 - absOffset * 0.25);

            return (
              <motion.button
                key={`${month.actualIndex}-${month.displayIndex}`}
                onClick={() => !dragging && !isDisabled && onIndexChange(month.actualIndex)}
                disabled={isDisabled}
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
                } ${isDisabled ? 'cursor-default' : 'cursor-pointer'}`}
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
        </motion.div>
      </div>

      {/* Right Arrow */}
      {!isDisabled && (
        <button
          onClick={handleNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 transition-all shadow-lg"
          aria-label="Next month"
        >
          <svg className="w-6 h-6 text-blue-700 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Month indicator dots */}
      {!isDisabled && months.length > 1 && (
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
      )}
    </div>
  );
};
