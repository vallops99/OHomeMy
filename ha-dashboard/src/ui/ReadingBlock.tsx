/**
 * The compact form of something that is read rather than pressed (#33): a
 * block in `footer` with an icon, a value and a name under it. What a
 * `sensor` and a `climate` become there -- the footer is a strip of blocks,
 * so the full card's rows and controls have no room in it.
 *
 * Not a control, and so not a `Tile`: nothing happens on a tap, and a ripple
 * would say otherwise. A footer member's chevron, when it has one, is added
 * beside it (`FooterMember`), never inside.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import { v } from './vars';

export type ReadingBlockProps = {
  icon: string;
  /** The reading, large: "20,5°", "320 W". */
  value: ReactNode;
  /** Beside the value, quieter: the setpoint, a unit. */
  detail?: ReactNode;
  name: string;
  unavailable?: boolean;
  /** Draw the value in the accent: a door open, a siren sounding. */
  active?: boolean;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

export function ReadingBlock({ icon, value, detail, name, unavailable = false, active = false, style }: ReadingBlockProps) {
  const fg = unavailable ? v.color.alert : active ? v.color.accent : v.color.ink;
  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: v.space.sm,
        // A footer's height budget: 64 px, and `sm` top and bottom.
        minHeight: v.touch.primary,
        padding: `${v.space.sm} ${v.space.md}`,
        boxSizing: 'border-box',
        borderRadius: v.radius.tile,
        border: `1px solid ${unavailable ? v.color.alertLine : v.color.line}`,
        background: unavailable ? v.color.alertSurface : v.color.surface,
        color: fg,
        ...style,
      }}
    >
      <Icon name={unavailable ? 'mdi:alert-circle' : icon} size={26} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: v.space.xs, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: v.font.body, fontWeight: 700 }}>{value}</span>
          {detail && <span style={{ fontSize: v.font.caption, color: v.color.inkMuted }}>{detail}</span>}
        </div>
        <span dir='auto' style={{ fontSize: v.font.caption, fontWeight: 600, color: v.color.inkMuted, whiteSpace: 'nowrap' }}>
          {name}
        </span>
      </div>
    </div>
  );
}
