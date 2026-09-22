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
   * require reading.
   *
   * The primary one is told apart by its **icon**, not by its type size:
   * every gate's name is set at the same size, so a longer name is not a
   * smaller name. Sizing type per gate made "Cancelletto" read as the lesser
   * control because it is the longer word, which is the opposite of what the
   * ranking means.
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
        {/*
          One size for every gate, however long its name: a longer word must
          not read as a smaller control. The label grows horizontally instead
          -- `nowrap` keeps it on one line, and the slab's own width is the
          safe bound. Measured at 34 px: names up to about sixteen characters
          ("Cancello Carraio") render in full.
          
          Past that it ellipsises rather than clipping. A name cut off mid-
          word with no mark looks like the house named the gate that way;
          an ellipsis says the panel is the one running out of room. `title`
          carries the full name for anyone who needs it.
        */}
        <span
          title={entity.name}
          style={{
            fontSize: t.font.glanceL,
            fontWeight: 600,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {entity.name}
        </span>
        <span style={{ fontSize: t.font.body, opacity: 0.9 }}>{stateLabel(entity)}</span>
      </div>
    </Tile>
  );
}
