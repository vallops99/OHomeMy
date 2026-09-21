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
import { Icon } from './Icon';
import { t } from './theme';

export type FaultTileProps = {
  label: string;
  colSpan?: number;
  rowSpan?: number;
};

export function FaultTile({ label, colSpan = 1, rowSpan = 1 }: FaultTileProps) {
  return (
    <div
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space.xs,
        padding: t.space.md,
        boxSizing: 'border-box',
        borderRadius: t.radius.tile,
        border: `1px solid ${t.color.fault}`,
        background: t.color.faultSurface,
        color: t.color.fault,
        textAlign: 'center',
      }}
    >
      <Icon name='mdi:help-rhombus-outline' size={36} />
      <span style={{ fontSize: t.font.body, fontWeight: 600 }}>{label}</span>
    </div>
  );
}
