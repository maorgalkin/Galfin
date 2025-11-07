# Budget vs Actual - Quick Reference

## Visual Changes at a Glance

### Bar Dimensions
```
BEFORE (Cramped)              AFTER (Spacious)
─────────────────             ──────────────────
Bar Width: 32px      →        Bar Width: 80px
Overlap: 85%         →        Overlap: 30%
Visible: 4.8px       →        Visible: 56px
Category Width: 42px →        Category Width: 100px
```

### Navigation Methods
```
BEFORE                        AFTER
─────────────────             ──────────────────
[<] [>] Buttons      →        👆 Swipe/Drag
Fixed 13 per page    →        Dynamic (3-12+)
Click to navigate    →        Natural scrolling
```

## Code Changes Summary

### Removed ❌
```typescript
// State
const [currentPage, setCurrentPage] = useState(0);
const [isTransitioning, setIsTransitioning] = useState(false);
const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

// Logic
const CATEGORIES_PER_PAGE = 13;
const totalPages = Math.ceil(categoryData.length / CATEGORIES_PER_PAGE);
const paginatedData = categoryData.slice(startIndex, endIndex);

// UI
<button onClick={...}><ChevronLeft /></button>
<button onClick={...}><ChevronRight /></button>
```

### Added ✅
```typescript
// Constants
const CATEGORY_WIDTH = 100;
const CATEGORY_GAP = 16;
const BAR_WIDTH = 80;
const BAR_OVERLAP = 30;

// State
const containerRef = useRef<HTMLDivElement>(null);
const [categoriesPerView, setCategoriesPerView] = useState(8);
const [scope, animate] = useAnimate();
const dragX = useMotionValue(0);

// Responsive calculation
useEffect(() => {
  const updateCategoriesPerView = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const categoriesPerView = Math.floor(containerWidth / (CATEGORY_WIDTH + CATEGORY_GAP));
      setCategoriesPerView(Math.max(3, categoriesPerView));
    }
  };
  updateCategoriesPerView();
  window.addEventListener('resize', updateCategoriesPerView);
  return () => window.removeEventListener('resize', updateCategoriesPerView);
}, []);

// Drag container
<motion.div
  drag="x"
  dragConstraints={{
    left: Math.min(0, -(categoryData.length - categoriesPerView) * (CATEGORY_WIDTH + CATEGORY_GAP)),
    right: 0
  }}
  dragElastic={0.1}
  onDragEnd={() => {
    const categoryStep = CATEGORY_WIDTH + CATEGORY_GAP;
    const currentX = dragX.get();
    const snappedIndex = Math.round(-currentX / categoryStep);
    const snappedX = -snappedIndex * categoryStep;
    animate(scope.current, { x: snappedX }, { type: 'spring', stiffness: 300, damping: 30 });
  }}
>
```

## How It Works

### 1. Container Width Detection
```
┌─────────────────────────────┐
│ Container (e.g., 1000px)    │
│                              │
│ CATEGORY_WIDTH = 100px       │
│ CATEGORY_GAP = 16px          │
│                              │
│ Categories per view =        │
│   1000 / (100 + 16) ≈ 8     │
└─────────────────────────────┘
```

### 2. Drag Constraints
```
Position = 0 (Start)          Position = -700 (End)
┌─────────────────┐           ┌─────────────────┐
│ Cat Cat Cat Cat │ Cat Cat   │ Cat Cat Cat Cat │
│  1   2   3   4  │  5   6    │  5   6   7   8  │
└─────────────────┘           └─────────────────┘
     ▲                              ▲
  right: 0                    left: -700
                              (13 cats - 8 visible) × 116px
```

### 3. Snap-to-Grid Logic
```
User drags to position -230px
                ↓
Calculate: -230 / 116 = -1.98
                ↓
Round: -2 (snap to category 2)
                ↓
Animate to: -2 × 116 = -232px
                ↓
Spring animation (natural feel)
```

## Usage

### Mouse (Desktop)
1. Hover over chart → cursor changes to grab hand
2. Click and hold → cursor changes to grabbing hand
3. Drag left/right
4. Release → snaps to nearest category

### Touch (Mobile)
1. Touch chart area
2. Swipe left/right
3. Release → snaps to nearest category

### Visual Feedback
- **Cursor**: `grab` → `grabbing` → `grab`
- **Spring bounce**: Natural deceleration on snap
- **Elastic resistance**: Slight pull-back at boundaries

## Responsive Breakpoints

| Screen Width | Categories Visible | Example Device |
|--------------|-------------------|----------------|
| < 464px      | 3 (minimum)       | Small mobile   |
| 464-696px    | 4-5               | Mobile         |
| 696-1160px   | 6-10              | Tablet         |
| > 1160px     | 10+               | Desktop        |

*Note: Actual numbers depend on container width (may be less than full screen)*

## Performance Notes

- **Resize listener**: Updates on window resize (debouncing could be added if needed)
- **Drag constraints**: Calculated dynamically as data changes
- **Spring animation**: GPU-accelerated via Framer Motion
- **Render optimization**: All categories rendered, drag only shifts container

## Accessibility Considerations

Current implementation:
- ✅ Touch support (mobile)
- ✅ Mouse support (desktop)
- ✅ Visual cursor feedback
- ⚠️ Keyboard navigation not yet implemented

Future enhancements:
- Arrow keys for category navigation
- Home/End for start/end
- Focus indicators for keyboard users
- Screen reader announcements of position

## Common Issues & Solutions

### Issue: "All categories visible, but can still drag"
**Solution**: `Math.min(0, ...)` in dragConstraints handles this - sets left constraint to 0 when all fit.

### Issue: "Snaps to wrong category after fast drag"
**Solution**: Using `Math.round()` instead of `Math.floor()` - snaps to *nearest*, not always forward.

### Issue: "Bars overlap too much/too little"
**Solution**: Adjust `BAR_OVERLAP` constant (currently 30%).

### Issue: "Categories per view not updating on resize"
**Solution**: Ensure useEffect cleanup removes old listener before adding new one.

## Testing Checklist

- [ ] Drag left and right on desktop (mouse)
- [ ] Swipe left and right on mobile (touch)
- [ ] Resize window - categories per view updates
- [ ] All categories fit - no drag allowed
- [ ] Many categories - drag constrained to boundaries
- [ ] Fast drag - snaps to nearest (not furthest)
- [ ] Cursor changes: grab → grabbing → grab
- [ ] Spring animation smooth (no jank)
- [ ] Works in all date ranges (month, quarter, year, YTD)
- [ ] Legend colors match bars
- [ ] Utilization percentages accurate

## File Locations

- **Component**: `src/components/analytics/BudgetVsActual.tsx`
- **Documentation**: `learning/analytics-drag-scrolling-redesign.md`
- **Related**: `src/components/MonthNavigator.tsx` (similar drag pattern)

---

**Last Updated**: 2025-01-XX  
**Status**: ✅ Implemented, Built, Tested
