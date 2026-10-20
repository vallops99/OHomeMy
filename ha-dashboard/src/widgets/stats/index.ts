import { stepAt } from '../../ui/vars';
import { defineWidget } from '../types';
import { statsSchema } from './schema';
import { StatsWidget } from './StatsWidget';

/**
 * Two numbers side by side, in px, measured with `npm run fit` in every
 * catalogue: two cards at their least, and the gap. Narrower than that plus
 * the headroom, they go one over the other.
 */
const SIDE_BY_SIDE = 220;

export default defineWidget({
  schema: statsSchema,
  Component: StatsWidget,
  smallest: { full: { width: 112, height: 226 } },
  steps: [{ name: 'two numbers side by side', box: { width: stepAt(SIDE_BY_SIDE), height: 226 }, guards: 'width' }],
  // Two columns whether or not the power card is there, so the lights card
  // keeps its width rather than stretching across the box; one over the
  // other once the box is too narrow for two numbers side by side. A card
  // fills its cell's height, and the number follows the box.
  css: `
    .ohm-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-auto-rows: minmax(0, 1fr);
      gap: var(--space-3);
    }
    @container widget (width < ${stepAt(SIDE_BY_SIDE)}px) {
      .ohm-stats { grid-template-columns: minmax(0, 1fr); }
    }
    .ohm-stats-card {
      box-sizing: border-box;
      min-width: 0;
      min-height: 0;
      padding: var(--space-4) var(--space-5);
      border-radius: var(--radius-card);
      background: var(--surface);
      border: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: var(--space-2);
      overflow: hidden;
    }
    .ohm-stats-icon { display: flex; color: var(--ink-muted); }
    .ohm-stats-card[data-tone='on'] .ohm-stats-icon { color: var(--accent); }
    .ohm-stats-card[data-tone='alert'] { background: var(--alert-surface); border-color: var(--alert-line); }
    .ohm-stats-card[data-tone='alert'] .ohm-stats-icon { color: var(--alert); }
    .ohm-stats-line { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
    .ohm-stats-value {
      font-size: var(--type-stat-size);
      line-height: var(--type-stat-line);
      font-weight: var(--type-stat-weight);
      letter-spacing: var(--type-stat-tracking);
      font-variant-numeric: tabular-nums;
      color: var(--ink);
      white-space: nowrap;
    }
    .ohm-stats-card[data-tone='alert'] .ohm-stats-value {
      font-size: var(--type-body-lg-size);
      line-height: var(--type-body-lg-line);
      font-weight: 600;
      color: var(--alert);
    }
    .ohm-stats-unit {
      font-size: var(--type-body-size);
      color: var(--ink-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,
});
