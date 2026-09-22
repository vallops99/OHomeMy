/**
 * A gate, rendered as a large filled slab.
 *
 * Gates are the most-touched control while arriving or leaving (CONTEXT.md),
 * so this uses `strong` -- the lifted accent floored at 42% lightness -- which
 * ADR-0001 requires for filled controls that must be picked out at 2 m.
 */
import { useActions, type Entity } from '../ha';
import { Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { Tile } from './Tile';
import { onSurfaceFor, t } from './theme';

export type GateSlabProps = {
  entity: Entity;
  /**
   * The gate this panel is mostly about. Two gates rendered identically are
   * ambiguous at arm's length (#8) -- reaching for "the gate" should not
   * require reading. The primary one gets the larger icon and type; the
   * secondary stays a full control, just visibly the lesser of the two.
   */
  primary?: boolean;
};

export function GateSlab({ entity, primary }: GateSlabProps) {
  const actions = useActions();
  // `unlocked` is the state worth shouting about: a gate left open.
  const open = entity.state === 'unlocked';
  const unavailable = entity.unavailable;
  // Filled in both states -- see `alwaysFilled` on Tile.
  const fg = onSurfaceFor({ active: true, unavailable, strong: true });

  return (
    <Tile entity={entity} active={open} strong alwaysFilled onClick={() => (open ? actions.lock(entity) : actions.unlock(entity))}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: t.space.xs,
          color: fg,
        }}
      >
        <Icon name={unavailable ? 'mdi:alert-circle' : open ? 'mdi:gate-open' : 'mdi:gate'} size={primary ? 64 : 40} />
        <span style={{ fontSize: primary ? t.font.glanceL : t.font.glanceM, fontWeight: 600, textAlign: 'center' }}>{entity.name}</span>
        <span style={{ fontSize: t.font.body, opacity: 0.9 }}>{stateLabel(entity)}</span>
      </div>
    </Tile>
  );
}
