/**
 * Something that toggles, in `footer` (#34): a `siren`, a `light`, a
 * `switch`. `ToggleTile`'s row is 76 px tall and the footer is 64, so the
 * footer gets the compact form -- the Region decides the shape. A tap
 * toggles it, with no confirm (#1's standing preference); a dimmable light
 * loses its slider here, and keeps it in `left`/`right`.
 */
import { useActions, type Entity } from '../ha';
import { entityIcon, Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { Tile } from './Tile';
import { onSurfaceFor, t } from './theme';

export type ToggleBlockProps = { entity: Entity };

export function ToggleBlock({ entity }: ToggleBlockProps) {
  const actions = useActions();
  const active = entity.state === 'on';
  const unavailable = entity.unavailable;
  const fg = unavailable ? t.color.fault : onSurfaceFor({ active, unavailable, strong: true });
  return (
    <Tile
      entity={entity}
      active={active}
      strong
      onClick={() => actions.toggle(entity)}
      // `sm` top and bottom, as a Page block: the footer's 64 px (PlacementView.tsx).
      style={{ minWidth: 0, paddingBlock: t.space.sm }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: t.space.sm, height: '100%', color: fg }}>
        <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={26} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: t.font.body, fontWeight: 700, whiteSpace: 'nowrap' }}>{stateLabel(entity)}</span>
          <span style={{ fontSize: t.font.caption, fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.85 }}>{entity.name}</span>
        </div>
      </div>
    </Tile>
  );
}
