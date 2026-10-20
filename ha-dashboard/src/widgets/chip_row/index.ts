import { CASA } from '../../theme/tokens';
import { stepAt } from '../../ui/vars';
import { defineWidget } from '../types';
import { chipRowSchema } from './schema';
import { ChipRowWidget } from './ChipRowWidget';

/** The gap between two chips, and between two lines of them. */
const GAP = 10;

/**
 * Two lines of chips, in px: two chips' height (Casa Panel's `target-min`,
 * at the wall's sizes) and the gap between the lines. A box this tall plus
 * the headroom wraps.
 */
const TWO_LINES = 2 * CASA.size.targetMin + GAP;

export default defineWidget({
  schema: chipRowSchema,
  Component: ChipRowWidget,
  smallest: { full: { width: 45, height: 122 } },
  steps: [{ name: 'two lines, wrapped', box: { width: 500, height: stepAt(TWO_LINES) }, guards: 'height' }],
  // One line in a box one chip tall, as Casa Panel's status bar has it:
  // past the box's width the row scrolls sideways, resting on whole chips,
  // and since the Fault leads, what scrolls out of view is the least urgent.
  // A box tall enough for two lines (`TWO_LINES`, with the headroom) wraps
  // instead, so every chip is shown whole. A chip never wraps inside itself;
  // past the box's width its words end in an ellipsis.
  //
  // The Concern list is portalled out of the box, so its classes are
  // styled against the screen, not the Widget.
  css: `
    .ohm-chip_row {
      display: flex;
      align-items: center;
      align-content: center;
      gap: ${GAP}px;
      min-width: 0;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
    }
    @container widget (height >= ${stepAt(TWO_LINES)}px) {
      .ohm-chip_row { flex-wrap: wrap; overflow-x: hidden; }
    }
    .ohm-chip_row-chip {
      box-sizing: border-box;
      flex: 0 0 auto;
      max-width: 100%;
      height: var(--target-min);
      padding-block: 0;
      padding-inline: var(--space-4) 20px;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      gap: 10px;
      white-space: nowrap;
      scroll-snap-align: start;
      font-size: var(--type-body-size);
      background: var(--surface);
      border: 1px solid var(--line-strong);
      color: var(--ink-soft);
    }
    .ohm-chip_row-chip[data-tone='alert'] {
      background: var(--alert-surface);
      border-color: var(--alert-line);
      color: var(--alert);
      font-weight: 500;
    }
    .ohm-chip_row-chip[role='button']:active { background: var(--surface-control); }
    .ohm-chip_row-chip[data-tone='alert'][role='button']:active { background: var(--alert-surface); filter: brightness(1.2); }
    .ohm-chip_row-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; }

    .ohm-chip_row-list-backdrop {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--bg) 72%, transparent);
      font-family: var(--font-sans);
    }
    .ohm-chip_row-list-card {
      box-sizing: border-box;
      width: min(560px, 100% - 2 * var(--space-3));
      max-height: 80%;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      color: var(--ink);
      border-radius: var(--radius-card);
      border: 1px solid var(--line-strong);
    }
    .ohm-chip_row-list-card[data-level='fault'] { border-color: var(--alert-line); }
    .ohm-chip_row-list-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4);
      padding-inline-start: var(--space-5);
      border-bottom: 1px solid var(--line);
    }
    .ohm-chip_row-list-title {
      font-size: var(--type-row-title-size);
      line-height: var(--type-row-title-line);
      font-weight: var(--type-row-title-weight);
      letter-spacing: var(--type-row-title-tracking);
    }
    .ohm-chip_row-list-card[data-level='fault'] .ohm-chip_row-list-title { color: var(--alert); }
    .ohm-chip_row-list-close {
      flex-shrink: 0;
      width: var(--target-min);
      height: var(--target-min);
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-pill);
      border: 1px solid var(--line-strong);
      background: var(--surface-control);
      color: var(--ink);
      cursor: pointer;
    }
    .ohm-chip_row-list-rows { list-style: none; margin: 0; padding: var(--space-2) 0; overflow-y: auto; min-height: 0; }
    .ohm-chip_row-list-row {
      box-sizing: border-box;
      min-height: var(--target-min);
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-2) var(--space-5);
    }
    .ohm-chip_row-list-icon { display: flex; flex-shrink: 0; color: var(--ink-secondary); }
    .ohm-chip_row-list-card[data-level='fault'] .ohm-chip_row-list-icon { color: var(--alert); }
    .ohm-chip_row-list-text { display: flex; flex-direction: column; min-width: 0; }
    .ohm-chip_row-list-name {
     
      font-size: var(--type-body-lg-size);
      line-height: var(--type-body-lg-line);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ohm-chip_row-list-area { font-size: var(--type-meta-size); line-height: var(--type-meta-line); color: var(--ink-muted); }
  `,
});
