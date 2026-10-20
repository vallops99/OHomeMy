import { defineWidget } from '../types';
import { ClockWidget } from './ClockWidget';
import { clockSchema } from './schema';

export default defineWidget({
  schema: clockSchema,
  Component: ClockWidget,
  smallest: { full: { width: 315, height: 44 }, compact: { width: 142, height: 45 } },
  // Nothing happens on a tap, so an `on_tap` makes the whole clock a way to its Page.
  tap: 'none',
  // Time and date share a baseline, as in Casa Panel's status bar, and the
  // date wraps under the time when the box is too narrow for both. Sizes
  // follow the box, never below the design system's `clock` and `body-lg`.
  css: `
    .ohm-clock {
      height: 100%;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      align-content: center;
      column-gap: var(--space-4);
      white-space: nowrap;
      color: var(--ink);
    }
    .ohm-clock-time {
      font-size: clamp(var(--type-clock-size), min(62cqh, 30cqw), 220px);
      line-height: 1.1;
      font-weight: var(--type-clock-weight);
      letter-spacing: var(--type-clock-tracking);
      font-variant-numeric: tabular-nums;
    }
    .ohm-clock-date {
      font-size: clamp(var(--type-body-lg-size), min(20cqh, 4.5cqw), 40px);
      line-height: 1.4;
      color: var(--ink-muted);
    }
  `,
});
