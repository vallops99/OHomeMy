/**
 * Casa Panel's `SectionLabel` (ADR-0013): the uppercase noun that names a
 * part of a Region -- *Stanze* -- with an optional action on its right. The
 * row is at least `target-min` tall, so an action appearing or going never
 * moves what is under it.
 */
import type { ReactNode } from 'react';
import { t } from './theme';

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: t.size.targetMin,
        flexShrink: 0,
      }}
    >
      <div
        // A title someone wrote, in its own direction (#59).
        dir='auto'
        style={{
          minWidth: 0,
          fontSize: t.type.label.size,
          lineHeight: t.type.label.lineHeight,
          fontWeight: t.type.label.weight,
          letterSpacing: t.type.label.letterSpacing,
          textTransform: 'uppercase',
          color: t.color.inkMuted,
        }}
      >
        {children}
      </div>
      {action}
    </div>
  );
}
