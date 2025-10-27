# Learning Resources

This folder contains detailed explanations and educational materials about the Galfin codebase architecture and patterns.

## Contents

### 🎯 [React Query Hooks Comparison](./HOOKS_COMPARISON_EXAMPLE.md)
Side-by-side comparison of using React Query hooks vs direct service calls. Shows the same component written both ways with detailed explanations of benefits and tradeoffs.

**Topics Covered:**
- useState/useEffect pattern (old way)
- React Query hooks pattern (new way)
- Code comparison: 50+ lines vs 30 lines
- When to use each approach

### 🔄 [Database Modification Flow](./DATABASE_MODIFICATION_FLOW.md)
Complete step-by-step walkthrough of how data flows from user action to database write and back to UI update.

**Topics Covered:**
- Component → Hook → Service → Supabase → PostgreSQL flow
- Exact code at each layer with line numbers
- SQL translation examples
- Authentication and Row Level Security (RLS)
- React Query cache invalidation

### 🎨 [Tailwind Responsive Grid Issue & Solution](./TAILWIND_RESPONSIVE_GRID_ISSUE.md)
Real-world debugging of Tailwind responsive grid utilities not working, and the custom CSS solution that fixed it.

**Topics Covered:**
- When Tailwind JIT compilation fails
- Debugging responsive layout issues
- Custom CSS with @layer components
- Media queries vs Tailwind utilities
- When to use each approach

## When to Read These

- **New to the project?** Start with Database Modification Flow to understand the architecture
- **Adding a new feature?** Reference Hooks Comparison to see the recommended patterns
- **Debugging data flow?** Use Database Modification Flow to trace where things happen
- **Considering refactoring?** Review both to understand the tradeoffs

## Key Takeaways

1. **Database writes happen in Services** - Always in `src/services/*Service.ts`
2. **Hooks are optional wrappers** - They make React components cleaner but aren't required
3. **Services use Supabase client** - Which translates to SQL via REST API
4. **React Query provides:** Auto-caching, auto-refetching, loading states, shared data

## Related Documentation

- [Complete Feature Summary](../COMPLETE_FEATURE_SUMMARY.md) - All app features
- [Supabase Bringup](../SUPABASE_BRINGUP.md) - Database setup guide
- [Test Documentation](../TEST_DOCUMENTATION.md) - Testing patterns
