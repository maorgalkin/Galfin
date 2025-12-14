# Expense Chart Magnifier Learnings

## Objectives Achieved
- Delivered a unified magnifier experience on both desktop and mobile pie charts.
- Replaced Recharts tooltip with a custom overlay that aligns with the lens center.
- Implemented long-press detection with pointer capture to keep interactions stable on Safari.
- Synced category selection between magnifier interactions and existing transaction workflows.

## Key Implementation Notes
- **Pointer Flow**: Long-press timers start on `pointerdown`, cancel on movement >20px, and activate the lens + tooltip after 450ms on touch (250ms on mouse).
- **Lens Rendering**: The lens reuses the real pie chart, scaled with a `transform` inside a clipped circle to guarantee visual parity.
- **Tooltip Strategy**: Temporary tooltips follow the lens while active; persistent tooltips appear on tap and now rely on explicit dismissal.
- **Category Detection**: We rely on `document.elementsFromPoint` with `data-category` markers on each `Cell`, ensuring accurate slice detection across browsers.

## Operational Guidance
- Keep long-press timers cleared on movement to avoid ghost activations when users pan.
- Always snapshot container bounds on interaction start; Safari may report stale sizes during orientation changes.
- When iterating on tooltip timing, validate on real iOS hardware to confirm touch event sequencing.
- The sandbox playground is still present in code history; re-enable it locally if future experiments are needed.
