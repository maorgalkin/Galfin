# Category Pace Tracker Insight

## Goal
Surface checkpoints that show how a category is pacing against its monthly budget so households can spot over-spend early.

## Data Sources
- **Transactions**: Expense transactions filtered by the currently selected Insights date range.
- **Budget Limits**: Active personal budget category limits (`personalBudget.categories`).
- **Date Range Context**: Computed via existing `getDateRange` utility to support presets such as MTD or custom spans.

## Checkpoint Logic
- Baseline checkpoints: day 7 (end of week 1), day 15 (mid-month), and day 28 (end of week 4).
- Current checkpoint: uses today’s day-of-month when the latest bucket is the current month; otherwise falls back to that month’s final day.
- Amounts are cumulative up to each checkpoint using absolute expense values.
- Remaining budget = `monthlyLimit - cumulativeSpent` (floored at zero).

## Historical Averages
- When more than one month exists in the selected range, all prior months feed the “Historical Avg” column.
- Each checkpoint averages cumulative spend across those months after clamping the checkpoint day to the month length (e.g., February).
- Variance percentages compare the latest month’s checkpoint to the historical average for the same checkpoint.

## UX Notes
- Only active expense categories appear in the selector; first active category auto-selects.
- Warns the user when no personal budget or active categories are available.
- Highlights variance with traffic-light tones: red (>+5%), emerald (<-5%), amber otherwise.
- Table shows spent, remaining, and (when available) historical comparison per checkpoint.

## Known Assumptions
- Uses personal budget limits for every month in the range; monthly budget overrides are not yet queried.
- Transactions prior to the selected date range are ignored even if they share the same month.
- Currency formatting respects global budget settings (rounded vs exact).

## Future Enhancements
- Allow comparing multiple categories concurrently.
- Pull month-specific adjusted limits from monthly budgets when available.
- Offer a sparkline to visualize pacing vs average over time.
