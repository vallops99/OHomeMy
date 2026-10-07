import { defineWidget } from '../types';
import { statusChipsSchema } from './schema';
import { StatusChipsWidget } from './StatusChipsWidget';

export default defineWidget({
  schema: statusChipsSchema,
  Component: StatusChipsWidget,
  // One line in a box one chip tall, as Casa Panel's status bar has it:
  // past the box's width the row scrolls sideways, resting on whole chips,
  // and since the Fault leads, what scrolls out of view is the least urgent.
  // A box tall enough for two lines wraps instead, so every chip is shown
  // whole. A chip never wraps inside itself; past the box's width its words
  // end in an ellipsis.
  //
  // The Concern list is portalled out of the box, so its classes are
  // styled against the screen, not the Widget.
  css: `
    .ohm-status_chips {
      display: flex;
      align-items: center;
      align-content: center;
      gap: 10px;
      min-width: 0;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
    }
    @container widget (min-height: 106px) {
      .ohm-status_chips { flex-wrap: wrap; overflow-x: hidden; }
    }
    .ohm-status_chips-chip {
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
    .ohm-status_chips-chip[data-tone='alert'] {
      background: var(--alert-surface);
      border-color: var(--alert-line);
      color: var(--alert);
      font-weight: 500;
    }
    .ohm-status_chips-chip[role='button']:active { background: var(--surface-control); }
    .ohm-status_chips-chip[data-tone='alert'][role='button']:active { background: var(--alert-surface); filter: brightness(1.2); }
    .ohm-status_chips-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; }

    .ohm-status_chips-list-backdrop {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--bg) 72%, transparent);
      font-family: var(--font-sans);
    }
    .ohm-status_chips-list-card {
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
    .ohm-status_chips-list-card[data-level='fault'] { border-color: var(--alert-line); }
    .ohm-status_chips-list-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4);
      padding-inline-start: var(--space-5);
      border-bottom: 1px solid var(--line);
    }
    .ohm-status_chips-list-title {
      font-size: var(--type-row-title-size);
      line-height: var(--type-row-title-line);
      font-weight: var(--type-row-title-weight);
      letter-spacing: var(--type-row-title-tracking);
    }
    .ohm-status_chips-list-card[data-level='fault'] .ohm-status_chips-list-title { color: var(--alert); }
    .ohm-status_chips-list-close {
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
    .ohm-status_chips-list-rows { list-style: none; margin: 0; padding: var(--space-2) 0; overflow-y: auto; min-height: 0; }
    .ohm-status_chips-list-row {
      box-sizing: border-box;
      min-height: var(--target-min);
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-2) var(--space-5);
    }
    .ohm-status_chips-list-icon { display: flex; flex-shrink: 0; color: var(--ink-secondary); }
    .ohm-status_chips-list-card[data-level='fault'] .ohm-status_chips-list-icon { color: var(--alert); }
    .ohm-status_chips-list-text { display: flex; flex-direction: column; min-width: 0; }
    .ohm-status_chips-list-name {
     
      font-size: var(--type-body-lg-size);
      line-height: var(--type-body-lg-line);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ohm-status_chips-list-area { font-size: var(--type-meta-size); line-height: var(--type-meta-line); color: var(--ink-muted); }
  `,
});
