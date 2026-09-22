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
   * The gate this panel is mostly about (#8).
   *
   * Every ranking that changed a slab's *size* was wrong, and three were
   * tried: type size, icon size and slab height each made the secondary gate
   * read as a smaller control rather than a lesser one -- and with type, a
   * longer name made it look smaller still. Gates are now identical in every
   * dimension, so this currently changes nothing visually.
   *
   * It is kept because the screen still expresses the ranking and the house
   * still decides how many gates exist; whatever marks the primary next --
   * position, a label, an outline -- is a change here and nowhere else.
   */
  primary?: boolean;
};

/** The glyph size, and the floor the slab may not shrink below. */
const ICON = 56;

/**
 * Every gate slab is exactly this tall.
 *
 * The icon, the name's line box, the state line, two gaps and the tile's own
 * padding -- what the contents need, and nothing more. A fixed height rather
 * than a minimum: the slabs must not grow into the sidebar's spare room, or
 * a chip appearing above would resize the controls under someone's thumb.
 */
const SLAB_MIN = ICON + 40 + 24 + 2 * 4 + 2 * 14;

// `primary` is deliberately not destructured: the prop is part of the
// component's contract (see its doc above) but nothing in the rendering reads
// it while every gate is identical.
export function GateSlab({ entity }: GateSlabProps) {
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
      // Every gate is the same height, and none of them grows: the sidebar's
      // spare room goes to the flexible gap above (see ScreenView), so the
      // slabs stay anchored at the foot of the panel and a chip appearing
      // above cannot resize them.
      style={{ flex: '0 0 auto', height: SLAB_MIN }}
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
          // Nothing in here shrinks. As plain flex children the icon was
          // squeezed 56 -> 16 px and the name's line box 40 -> 12 px, which
          // slices the glyphs horizontally instead of hiding them -- a
          // failure that looks like a rendering bug rather than a tight fit.
          minHeight: 0,
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
        <span style={{ flexShrink: 0, display: 'flex' }}>
          <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={ICON} />
        </span>
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
            flexShrink: 0,
          }}
        >
          {entity.name}
        </span>
        <span style={{ fontSize: t.font.body, opacity: 0.9, flexShrink: 0 }}>{stateLabel(entity)}</span>
      </div>
    </Tile>
  );
}
