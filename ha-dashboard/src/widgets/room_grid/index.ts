import type { Variant } from '../../document/schema';
import { CASA } from '../../theme/tokens';
import { stepAt } from '../../ui/vars';
import { FULL_TILE_MIN_H, ROW_TILE_MIN_H } from '../room_tile/RoomTile';
import { defineWidget, type FitBox, type LayoutStep } from '../types';
import { RoomGridWidget } from './RoomGridWidget';
import { roomGridSchema } from './schema';

/**
 * The width a tile needs, per Variant: a `full` tile about 180 px, a row
 * about 250, Casa Panel's room tile. What a tile needs to show its name and
 * its line whole; a tile still fits narrower, its words cut short.
 */
const TILE_W: Record<Variant, number> = { full: 180, compact: 250 };

/** The gap between two tiles, `--space-3`. */
const GAP = CASA.space[3];

/**
 * The width `columns` tiles need side by side: their widths and the gaps
 * between them. A box narrower than that plus the headroom takes one column
 * fewer, down to one.
 */
const across = (variant: Variant, columns: number) => columns * TILE_W[variant] + (columns - 1) * GAP;

const columns = (n: number) => `grid-template-columns: repeat(${n}, minmax(0, 1fr));`;

/** The column counts the table gives, cut down in a narrow box. */
const COLUMNS_CSS = [
  ...[1, 2, 3, 4].map(n => `.ohm-room-grid-tiles[data-columns='${n}'] { ${columns(n)} }`),
  ...(['full', 'compact'] as const).flatMap(variant =>
    [2, 3, 4].map(wanted => {
      const cap = wanted - 1;
      const rules = [wanted, wanted + 1, wanted + 2]
        .filter(n => n <= 4)
        .map(n => `.ohm-room-grid-tiles[data-variant='${variant}'][data-columns='${n}'] { ${columns(cap)} }`);
      return `@container widget (width < ${stepAt(across(variant, wanted))}px) { ${rules.join(' ')} }`;
    })
  ),
].join('\n');

/** The Smallest box: six Areas, measured with `npm run fit -- --least`. */
const SMALLEST: Record<Variant, FitBox> = { full: { width: 235, height: 788 }, compact: { width: 258, height: 377 } };

/** The lowest box at which each column count holds, for the fit check. */
const steps: LayoutStep[] = (['full', 'compact'] as const).flatMap(variant =>
  [2, 3, 4].map(n => ({
    name: `${n} columns`,
    variants: [variant],
    box: { width: stepAt(across(variant, n)), height: SMALLEST[variant].height },
    guards: 'width' as const,
  }))
);

export default defineWidget({
  schema: roomGridSchema,
  Component: RoomGridWidget,
  smallest: SMALLEST,
  steps,
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
