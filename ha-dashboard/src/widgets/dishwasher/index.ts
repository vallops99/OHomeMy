import { defineWidget } from '../types';
import { DishwasherWidget } from './DishwasherWidget';
import { dishwasherSchema } from './schema';

export default defineWidget({
  schema: dishwasherSchema,
  Component: DishwasherWidget,
  smallest: { full: { width: 165, height: 295 }, compact: { width: 307, height: 67 } },
  // A tap outside its controls does nothing; with an `on_tap` the whole
  // Widget becomes a way to its Page (#32).
  tap: 'none',
  // `full` stacks the title, the state with its countdown, the bar, the
  // meta line and the controls; `compact` is the title and one line beside
  // it. Both sit on Casa Panel's tile, as a Room Tile or a Link does: it is
  // a device, not a reading on the ground. Its controls take `target-min`.
  // Tones: `accent` is "on" (ADR-0013); a warning is the alert colour;
  // `success` has no colour of its own, so Done reads in the plain ink.
  css: `
    .ohm-dishwasher {
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-4);
      border: 1px solid var(--line-tile);
      border-radius: var(--radius-tile);
      background: var(--surface-tile);
      color: var(--ink);
      min-width: 0;
    }
    /* The Fault tile is a card of its own. */
    .ohm-dishwasher[data-fault] { display: block; padding: 0; border: none; background: none; }
    .ohm-dishwasher-head {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
      font-size: var(--type-tile-title-size);
      line-height: var(--type-tile-title-line);
      font-weight: var(--type-tile-title-weight);
      letter-spacing: var(--type-tile-title-tracking);
      color: var(--ink);
      white-space: nowrap;
    }
    .ohm-dishwasher-icon { display: flex; flex-shrink: 0; color: var(--ink-secondary); }
    .ohm-dishwasher-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .ohm-dishwasher-line {
      display: flex;
      align-items: baseline;
      gap: var(--space-3);
      min-width: 0;
      white-space: nowrap;
      font-size: var(--type-body-lg-size);
    }
    .ohm-dishwasher-state { font-weight: 600; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .ohm-dishwasher-state[data-tone='muted'] { color: var(--ink-muted); }
    .ohm-dishwasher-state[data-tone='accent'] { color: var(--accent); }
    .ohm-dishwasher-state[data-tone='warning'] { color: var(--alert); }
    .ohm-dishwasher-state[data-tone='success'] { color: var(--ink); }
    .ohm-dishwasher-countdown { color: var(--ink-secondary); flex-shrink: 0; font-variant-numeric: tabular-nums; }
    .ohm-dishwasher-bar {
      display: block;
      height: 6px;
      border-radius: var(--radius-pill);
      background: var(--surface-well);
      overflow: hidden;
    }
    .ohm-dishwasher-bar-fill { display: block; height: 100%; background: var(--accent); }
    .ohm-dishwasher-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-3);
      font-size: var(--type-meta-size);
      color: var(--ink-muted);
    }
    .ohm-dishwasher-warning { color: var(--alert); }
    .ohm-dishwasher-controls { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-2); }
    .ohm-dishwasher-start { display: flex; flex-direction: column; gap: var(--space-1); }
    .ohm-dishwasher-hint { font-size: var(--type-meta-size); color: var(--ink-muted); max-width: 16em; }
    .ohm-dishwasher-button {
      position: relative;
      overflow: hidden;
      min-height: var(--target-min);
      padding: 0 var(--space-4);
      border: none;
      border-radius: var(--radius-pill);
      background: var(--surface-control);
      color: var(--ink);
      font-family: inherit;
      font-size: var(--type-body-size);
      font-weight: 600;
      white-space: nowrap;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .ohm-dishwasher-button[data-primary] { background: var(--primary); color: var(--on-primary); }
    .ohm-dishwasher-button:disabled { opacity: 0.38; }
    .ohm-dishwasher-button-face { position: relative; display: inline-flex; align-items: center; gap: var(--space-2); }
    .ohm-dishwasher-sweep { position: absolute; top: 0; bottom: 0; inset-inline-start: 0; background: var(--accent-soft); }
    .ohm-dishwasher[data-variant='compact'] {
      flex-direction: row;
      align-items: center;
      gap: var(--space-4);
    }
    .ohm-dishwasher[data-variant='compact'] .ohm-dishwasher-head { flex-shrink: 0; }
    .ohm-dishwasher[data-variant='compact'] .ohm-dishwasher-line { min-width: 0; }
  `,
});
