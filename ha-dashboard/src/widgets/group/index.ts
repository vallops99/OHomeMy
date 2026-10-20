import { defineWidget } from '../types';
import { GroupWidget } from './GroupWidget';
import { groupSchema } from './schema';

export default defineWidget({
  schema: groupSchema,
  Component: GroupWidget,
  // A Member's row: its shape, and its Open button when it has one
  // (`.ohm-open`, the renderer's). A row that opens a Page across it presses
  // as a Widget's box does.
  css: `
    .ohm-group-member { flex: 1 0 auto; min-width: 0; display: flex; gap: var(--space-2); }
    .ohm-group-member > :first-child { flex: 1 1 auto; min-width: 0; }
    .ohm-group-member[data-opens] { cursor: pointer; border-radius: var(--radius-tile); transition: transform .12s ease; }
    .ohm-group-member[data-opens]:active { transform: scale(.98); }
    .ohm-group-member[data-opens]:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
  `,
});
