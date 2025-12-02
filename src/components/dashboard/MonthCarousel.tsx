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
const SIDE_CARDS = 1; // Show 1 card on each side by default (3 total)

export const MonthCarousel: React.FC<MonthCarouselProps> = ({
  months,
  activeIndex,
  onIndexChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  const isDisabled = months.length <= 1;

  // Measure container width to determine how many side cards to show
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setContainerWidth(width);
    }
  }, []);

  // Create circular array: active card + neighbors
  const getVisibleMonths = () => {
    if (months.length === 0) return [];
    if (isDisabled) return [{ ...months[0], displayIndex: 0, actualIndex: 0 }];
    
    // Show 2 cards on each side for larger screens (>= 768px), 1 for smaller
    const sideCards = containerWidth >= 768 ? 2 : 1;
    
    const visible = [];
    for (let i = -sideCards; i <= sideCards; i++) {
      const actualIndex = (activeIndex + i + months.length) % months.length;
      visible.push({
        ...months[actualIndex],
        displayIndex: i,
        actualIndex: actualIndex,
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

  // Animate through cards one by one
  const spinThroughCards = (cardsMoved: number) => {
    if (isAnimating || cardsMoved === 0) return;
    
    setIsAnimating(true);
    const direction = cardsMoved > 0 ? 1 : -1;
    const steps = Math.abs(cardsMoved);
    let currentStep = 0;
    
    // Clear any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    animationRef.current = setInterval(() => {
      currentStep++;
      const newIndex = (activeIndex + (currentStep * direction) + months.length * 100) % months.length;
      onIndexChange(newIndex);
      
      if (currentStep >= steps) {
        clearInterval(animationRef.current!);
        animationRef.current = null;
        setIsAnimating(false);
      }
    }, 200); // 200ms between each card change
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { velocity: { x: number; y: number } }) => {
    setDragging(false);
    
    const velocity = info.velocity.x;
    const dragDistance = x.get();
    
    // Calculate momentum
    const momentumMultiplier = 0.3;
    const totalDistance = dragDistance + (velocity * momentumMultiplier);
    
    // Calculate cards moved
    const totalCardsMoved = Math.round(-totalDistance / (CARD_WIDTH + CARD_GAP));
    
    // Snap back to center visually
    animate(x, 0, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    });
    
    // Then spin through cards
    if (totalCardsMoved !== 0) {
      spinThroughCards(totalCardsMoved);
    }
  };

  const handlePrevious = () => {
    if (isAnimating) return;
    spinThroughCards(-1);
  };

  const handleNext = () => {
    if (isAnimating) return;
    spinThroughCards(1);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

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
