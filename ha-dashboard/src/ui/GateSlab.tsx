/**
 * A gate, rendered as a large filled slab.
 *
 * Gates are the most-touched control while arriving or leaving (CONTEXT.md),
 * so this uses `strong` -- the lifted accent floored at 42% lightness -- which
 * ADR-0001 requires for filled controls that must be picked out at 2 m.
 */
import { useActions, type Entity } from '../ha';
import { entityIcon, Icon } from './Icon';
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
   * The ranking is carried by **how much of the column the slab takes**, not
   * by type or icon size. Both of those were tried and both were wrong for
   * the same reason: they shrink the secondary gate, so "Cancelletto" read as
   * a smaller control rather than a lesser one, and a longer name made it
   * look smaller still. Height ranks without shrinking -- every gate keeps
   * the same glyph, the same type and a full-size touch target.
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
    <Tile
      entity={entity}
      active={open}
      strong
      alwaysFilled
      // The primary gate takes twice the share of the sidebar's remaining
      // height. Both stay well above `touch.primary`, so this is weight, not
      // a smaller target (ADR-0001).
      style={{ flex: primary ? 2 : 1, minHeight: t.touch.primary }}
      onClick={() => (open ? actions.lock(entity) : actions.unlock(entity))}
    >
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
        {/*
          The glyph Home Assistant itself shows for this entity, not a
          hardcoded gate: a gate is a `lock`, and Home Assistant draws a lock.
          Showing something else means the panel and the app the owner already
          uses disagree about the same control.

          One size for both gates, like the label. Ranking by icon size made
          the secondary gate look like a smaller control rather than a lesser
          one; the primary is told apart by its brighter surface instead.
        */}
        <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={56} />
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
