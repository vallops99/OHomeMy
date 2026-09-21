/**
 * The panel grid: 4x2 tiles of 303x180 at 1280x800 (ADR-0001, tablet research).
 * Columns and rows come from tokens, so revalidating on real hardware is a
 * KNOBS edit rather than a sweep through screens.
 */
import type { ReactNode } from 'react';
import { t } from './theme';

export function Grid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${t.grid.cols}, 1fr)`,
        // Fixed, not `minmax(.., auto)`: a row that grows to fit its tallest
        // tile stretches every neighbour and opens dead space under their
        // content. The 4x2 grid is a hardware constraint (ADR-0001), so rows
        // hold their height and tiles fit themselves to it.
        gridAutoRows: `${t.grid.tileH}px`,
        gap: t.space.md,
        padding: t.space.md,
        width: '100%',
        minHeight: '100vh',
        boxSizing: 'border-box',
        background: t.color.ground,
      }}
    >
      {children}
    </div>
  );
}
