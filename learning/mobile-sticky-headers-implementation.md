# Mobile-Optimized Dashboard Views

## Overview
Implemented a comprehensive mobile-first design system for the Dashboard that adapts content presentation and navigation based on device type, prioritizing usability and information density for different screen sizes.

## Key Features

### 1. Sticky Section Headers (Mobile Only)
**Implementation**: On mobile devices, major section headers lock to the top of the viewport while scrolling:
- "Budget Performance"
- "Expenses by Category"
- "Family Members"

**Technical Details**:
- Uses `sticky top-0 z-10` positioning
- Purple theme styling matching dashboard color scheme
- Full-width design extending to screen edges
- Headers slide under each other as you scroll to the next section

### 2. Dynamic Header Context (Budget Performance)
**Smart Header Updates**: The "Budget Performance" header dynamically updates based on scroll position:
- Initially displays: **"Budget Performance"**
- When scrolled past summary grid (Income/Expense/Balance): **"Budget Performance | Breakdown"**

**Technical Implementation**:
- Intersection Observer API monitors summary grid visibility
- Triggers when summary section scrolls above viewport
- Uses `useCallback` for stable callback reference
- Waits for data loading to complete before initializing observer
- `rootMargin: '-60px'` accounts for sticky header height

### 3. Mobile vs Desktop Content Differences

#### Budget Performance Card
**Mobile (`isCompact=false`)**:
- No card header (uses sticky section header instead)
- Category breakdown always expanded
- No "Show Details" button
- No scroll container - natural page scrolling
- All categories fully visible

**Desktop (`isCompact=true`)**:
- Colored gradient header with budget name
- Category breakdown hidden by default
- "Show Details" toggle button
- Scrollable container (`max-h-96 overflow-y-auto`)
- Compact grid layout

#### Expenses by Category
**Mobile**:
- No component header (uses sticky section header)
- Pie chart for visual overview
- Tap category to view ALL transactions for that category
- Transaction list fully expanded (no scroll frame)
- Transactions scroll naturally with page content

**Desktop**:
- Component header included
- Interactive pie chart with side-by-side layout
- Click category to show transaction list in slide-out panel
- Shows first 5 transactions with "See All" button
- Smooth animation when panel appears

## Technical Architecture

### State Management
```typescript
const [showBreakdownInHeader, setShowBreakdownInHeader] = useState(false);
const handleBreakdownVisible = useCallback((visible: boolean) => {
  setShowBreakdownInHeader(visible);
}, []);
```

### Intersection Observer Pattern
```typescript
// In BudgetPerformanceCard.tsx
const summaryRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!onBreakdownVisible || isCompact || loadingActive || loadingMonthly) return;

  const element = summaryRef.current;
  if (!element) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      // When summary is NOT intersecting (scrolled out), breakdown is visible
      const breakdownVisible = !entry.isIntersecting;
      onBreakdownVisible(breakdownVisible);
    },
    {
      threshold: 0,
      rootMargin: '-60px 0px 0px 0px' // Account for sticky header height
    }
  );

  observer.observe(element);
  return () => observer.disconnect();
}, [onBreakdownVisible, isCompact, loadingActive, loadingMonthly]);
```

**Key Learnings**:
- Observer observes summary grid element
- Returns inverted state (summary NOT visible = breakdown visible)
- Must wait for async data loading (`loadingActive`, `loadingMonthly`)
- Cleans up observer on unmount
- Callback must be memoized with `useCallback` to prevent unnecessary re-renders

### Responsive Design Strategy
- `md:hidden` / `max-md:hidden` for conditional rendering
- `isCompact` prop determines mobile vs desktop behavior
- Shared components with different configurations
- Theme consistency across breakpoints

### Sticky Header Implementation
```tsx
{/* Mobile Sticky Header */}
<div className="md:hidden sticky top-0 z-10 bg-purple-100 dark:bg-purple-950/30 -mx-3 px-3 py-3 mb-4 border-b-2 border-purple-300 dark:border-purple-700">
  <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
    Budget Performance{showBreakdownInHeader && ' | Breakdown'}
  </h2>
</div>
```

**Key Techniques**:
- Negative margins (`-mx-3`) extend to screen edges
- Matching padding (`px-3`) maintains text alignment
- Conditional text concatenation for dynamic context
- Dark mode support with theme variables

## Common Pitfalls & Solutions

### Issue 1: Intersection Observer Not Firing on Initial Load
**Problem**: Observer only worked after changing views and returning to dashboard.

**Root Cause**: Component renders loading state initially, so the observed element (`summaryRef.current`) doesn't exist when the effect first runs.

**Solution**: Add loading states to effect dependencies:
```typescript
useEffect(() => {
  if (!onBreakdownVisible || isCompact || loadingActive || loadingMonthly) return;
  // ... observer setup
}, [onBreakdownVisible, isCompact, loadingActive, loadingMonthly]);
```

### Issue 2: Effect Re-running Unnecessarily
**Problem**: Passing `setShowBreakdownInHeader` directly caused the effect to re-run on every render.

**Solution**: Wrap callback in `useCallback`:
```typescript
const handleBreakdownVisible = useCallback((visible: boolean) => {
  setShowBreakdownInHeader(visible);
}, []);
```

### Issue 3: Sticky Element Not Sticking Inside Card
**Problem**: Attempted to make "Category Breakdown" subheading sticky within the card component.

**Root Cause**: Card has `overflow-hidden` which breaks sticky positioning for child elements.

**Solution**: Don't use nested sticky elements. Instead, use Intersection Observer to update the parent sticky header.

## Benefits

### Mobile Users
✅ Clear context with sticky headers  
✅ No hunting for "Show Details" buttons  
✅ Full content visibility without nested scrolling  
✅ Smart header updates show current section  
✅ Natural scrolling behavior  

### Desktop Users
✅ Compact, information-dense layouts  
✅ Interactive slide-out panels  
✅ Collapsible sections for focus  
✅ Original header designs preserved  
✅ Efficient use of screen real estate  

## Files Modified
- `src/components/Dashboard.tsx` - Section headers and state management
- `src/components/BudgetPerformanceCard.tsx` - Responsive layout and intersection observer
- `src/components/dashboard/ExpenseChart.tsx` - Mobile transaction list behavior

## Testing Checklist
- [ ] Fresh page load on mobile shows correct initial header
- [ ] Scrolling past summary updates header to "| Breakdown"
- [ ] Scrolling to next section changes header
- [ ] Works after navigating away and returning
- [ ] Dark mode styling correct
- [ ] Desktop view unaffected
- [ ] No console errors
- [ ] Smooth performance (no jank)

## Related Concepts
- Intersection Observer API
- React useCallback hook
- Responsive design patterns
- CSS sticky positioning
- Conditional rendering in React
- useEffect dependency management
