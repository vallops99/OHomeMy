/**
 * The bottom strip: the one part of the panel that tiles.
 *
 * The sidebar and the room list are vertical flows that size themselves, so
 * `span` means nothing to them (#9, as revised). Here it does: the strip lays
 * its children out in columns along the floor of the panel, and a slot's
 * `span` says how many each takes.
 *
 * It is `marginTop: auto` so it sits on the floor however many Areas the
 * house has -- adding a room pushes the rows down, not the strip off-screen.
 */
import type { ReactNode } from 'react';
import { t } from './theme';

export type StripProps = {
  /** Each child with the number of columns it occupies. */
  items: { node: ReactNode; span: number }[];
};

export function Strip({ items }: StripProps) {
  const total = items.reduce((n, i) => n + i.span, 0);

  return (
    <div
      style={{
        marginTop: 'auto',
        display: 'grid',
        gridTemplateColumns: `repeat(${total}, 1fr)`,
        gap: t.space.sm,
        height: t.layout.rowStrip,
        flexShrink: 0,
      }}
    >
      {items.map((item, i) => (
        <div key={i} style={{ gridColumn: `span ${item.span}`, minWidth: 0, display: 'flex' }}>
          {item.node}
        </div>
      ))}
    </div>
  );
}
