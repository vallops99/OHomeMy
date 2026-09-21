/**
 * The status column on the left of variant D: the one thing read on approach.
 *
 * Uses the `glanceXL` step -- the largest in the scale -- because this is the
 * number the panel exists to show from across the room.
 */
import type { ReactNode } from 'react';
import { t } from './theme';

export type StatusPanelProps = {
  /** The one large value, e.g. the indoor temperature. */
  value: ReactNode;
  label: ReactNode;
  /** Smaller supporting lines beneath. */
  detail?: ReactNode;
  colSpan?: number;
  rowSpan?: number;
};

export function StatusPanel({ value, label, detail, colSpan = 1, rowSpan = 2 }: StatusPanelProps) {
  return (
    <div
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: t.space.lg,
        borderRadius: t.radius.tile,
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        boxSizing: 'border-box',
      }}
    >
      <span style={{ fontSize: t.font.glanceXL, fontWeight: 700, color: t.color.textPrimary, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: t.font.glanceM, color: t.color.textSecondary, marginTop: t.space.sm }}>{label}</span>
      {detail && <div style={{ fontSize: t.font.body, color: t.color.textSecondary, marginTop: t.space.md }}>{detail}</div>}
    </div>
  );
}
