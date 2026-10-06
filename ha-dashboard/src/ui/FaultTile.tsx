/**
 * A tile standing in for something the screen asked for and could not get.
 *
 * Map Notes require that a real fault be visible to whoever is standing at
 * the panel, and the same reasoning applies to a screen definition that has
 * drifted from the house: a slot naming something absent renders this rather
 * than rendering nothing. An empty cell looks like a design choice; this does
 * not.
 *
 * Deliberately NOT built on `Tile`: this stands for the *absence* of an
 * entity, and `CardBase` validates its `entity` prop against the live
 * registry -- a synthetic id throws "entity not found" and takes the tile's
 * grid placement with it. Nothing here needs `CardBase`'s behaviour either,
 * since there is no entity to open a modal for.
 */
import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import { t } from './theme';

export type FaultTileProps = {
  label: string;
  /** Under the label, in capitals: an Unavailable entity's state. */
  detail?: string;
  /** The default is the 'something is missing' glyph; an Unavailable entity takes the alert one. */
  icon?: string;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

export function FaultTile({ label, detail, icon = 'mdi:help-rhombus-outline', style }: FaultTileProps) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space.xs,
        padding: t.space.md,
        boxSizing: 'border-box',
        borderRadius: t.radius.tile,
        border: `1px solid ${t.color.faultLine}`,
        background: t.color.faultSurface,
        color: t.color.fault,
        textAlign: 'center',
        ...style,
      }}
    >
      <Icon name={icon} size={36} />
      <span style={{ fontSize: t.font.body, fontWeight: 600 }}>{label}</span>
      {detail !== undefined && <span style={{ fontSize: t.font.caption, fontWeight: 700 }}>{detail.toUpperCase()}</span>}
    </div>
  );
}
