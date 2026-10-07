/**
 * Casa Panel's `SectionLabel` (ADR-0013): the uppercase noun that names a
 * part of a Region -- *Stanze* -- with an optional action on its right. The
 * row is at least `target-min` tall, so an action appearing or going never
 * moves what is under it.
 */
import type { ReactNode } from 'react';
import { v } from './vars';

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: v.size.targetMin,
        flexShrink: 0,
      }}
    >
      <div
        // A title someone wrote, in its own direction (#59).
        dir='auto'
        style={{
          minWidth: 0,
          fontSize: v.type.label.size,
          lineHeight: v.type.label.lineHeight,
          fontWeight: v.type.label.weight,
          letterSpacing: v.type.label.letterSpacing,
          textTransform: 'uppercase',
          color: v.color.inkMuted,
        }}
      >
        {children}
      </div>
      {action}
    </div>
  );
}
