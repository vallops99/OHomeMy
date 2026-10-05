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
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { t } from './theme';

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
};

export function ReadingBlock({ icon, value, detail, name, unavailable = false, active = false }: ReadingBlockProps) {
  const fg = unavailable ? t.color.fault : active ? t.color.activeStrong : t.color.textPrimary;
  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: t.space.sm,
        // The same height budget as a Page block: 64 px of footer, and
        // `sm` top and bottom (PlacementView.tsx's `PageBlock`).
        minHeight: t.touch.primary,
        padding: `${t.space.sm}px ${t.space.md}px`,
        boxSizing: 'border-box',
        borderRadius: t.radius.tile,
        border: `1px solid ${unavailable ? t.color.faultLine : t.color.border}`,
        background: unavailable ? t.color.faultSurface : t.color.surface,
        color: fg,
      }}
    >
      <Icon name={unavailable ? 'mdi:alert-circle' : icon} size={26} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: t.space.xs, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: t.font.body, fontWeight: 700 }}>{value}</span>
          {detail && <span style={{ fontSize: t.font.caption, color: t.color.textSecondary }}>{detail}</span>}
        </div>
        <span style={{ fontSize: t.font.caption, fontWeight: 600, color: t.color.textSecondary, whiteSpace: 'nowrap' }}>{name}</span>
      </div>
    </div>
  );
}
