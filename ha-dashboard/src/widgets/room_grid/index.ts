import { FULL_TILE_MIN_H, ROW_TILE_MIN_H } from '../room_tile/RoomTile';
import { defineWidget } from '../types';
import { RoomGridWidget } from './RoomGridWidget';
import { roomGridSchema } from './schema';

/**
 * The widest box at which a grid takes at most this many columns, per
 * Variant: a `full` tile wants about 180 px, a row about 250. Below the
 * last, one column.
 */
const NARROW: Record<'full' | 'compact', [maxWidth: number, columns: number][]> = {
  full: [
    [759, 3],
    [569, 2],
    [379, 1],
  ],
  compact: [
    [1079, 3],
    [799, 2],
    [529, 1],
  ],
};

const columns = (n: number) => `grid-template-columns: repeat(${n}, minmax(0, 1fr));`;

/** The column counts the table gives, cut down in a narrow box. */
const COLUMNS_CSS = [
  ...[1, 2, 3, 4].map(n => `.ohm-room-grid-tiles[data-columns='${n}'] { ${columns(n)} }`),
  ...Object.entries(NARROW).flatMap(([variant, steps]) =>
    steps.map(([width, cap]) => {
      const wider = [cap + 1, cap + 2, cap + 3].filter(n => n <= 4);
      const rules = wider.map(n => `.ohm-room-grid-tiles[data-variant='${variant}'][data-columns='${n}'] { ${columns(cap)} }`);
      return `@container widget (max-width: ${width}px) { ${rules.join(' ')} }`;
    })
  ),
].join('\n');

export default defineWidget({
  schema: roomGridSchema,
  Component: RoomGridWidget,
  // The tiles' own stylesheet is the Room Tile kind's (`room_tile/RoomTile.tsx`).
  css: `
    .ohm-room-grid { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: var(--space-3); }
    .ohm-room-grid-tiles {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: none;
      display: grid;
      gap: var(--space-3);
    }
    .ohm-room-grid-tiles[data-variant='full'] { grid-auto-rows: minmax(${FULL_TILE_MIN_H}px, 1fr); }
    .ohm-room-grid-tiles[data-variant='compact'] { grid-auto-rows: minmax(${ROW_TILE_MIN_H}px, 1fr); }
    .ohm-room-grid-tiles[data-more='true'] { mask-image: linear-gradient(to bottom, #000 calc(100% - 40px), transparent); }
    ${COLUMNS_CSS}
    .ohm-room-grid-off {
      height: var(--target-min);
      padding-block: 0;
      padding-inline: var(--space-4) 20px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--line-strong);
      background: transparent;
      color: var(--ink-soft);
      font-family: inherit;
      font-size: var(--type-body-size);
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      white-space: nowrap;
      cursor: pointer;
      touch-action: manipulation;
    }
    .ohm-room-grid-off:disabled { opacity: 0.38; cursor: default; }
  `,
});
