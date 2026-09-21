/**
 * The panel grid: four columns, four rows of deliberately unequal height
 * (ADR-0001 as revised by #8). Both come from tokens, so revalidating on real
 * hardware is a KNOBS edit rather than a sweep through screens.
 *
 * The rows are named rather than uniform because the entrance panel has three
 * jobs with different appetites: a glance layer read from 2 m, a touched layer
 * of tiles, and a strip of secondary controls. Sizing them to each other
 * wasted half the panel -- see the note on `grid` in theme/tokens.ts.
 */
import type { ReactNode } from 'react';
import { t } from './theme';

/** The row heights, in order. A screen's slots flow into these. */
const ROWS = [t.grid.rowStatus, t.grid.rowTile, t.grid.rowTile, t.grid.rowStrip];

export function Grid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${t.grid.cols}, 1fr)`,
        // Fixed, not `minmax(.., auto)`: a row that grows to fit its tallest
        // tile stretches every neighbour and opens dead space under their
        // content. The panel is a fixed viewport, so rows hold their height
        // and tiles fit themselves to it.
        gridTemplateRows: ROWS.map(r => `${r}px`).join(' '),
        // A screen that overflows its four rows keeps going at tile height
        // rather than collapsing: too much content is a visible bug, not a
        // silently clipped one.
        gridAutoRows: `${t.grid.rowTile}px`,
        gap: t.space.md,
        padding: t.space.md,
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box',
        background: t.color.ground,
        // The panel is a fixed 1280x800 pane on a wall; nothing scrolls.
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
