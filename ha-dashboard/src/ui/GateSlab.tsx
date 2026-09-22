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

/** The glyph size, and the floor the slab may not shrink below. */
const ICON = 56;

/**
 * The height a slab needs to show everything it contains.
 *
 * The icon, the name's line box, the state line, two gaps and the tile's own
 * padding. A slab shorter than this crushes its contents rather than
 * scrolling -- flex children shrink by default and `Tile` clips what spills,
 * which is how a 659 px viewport sliced "Cancello" through the middle and
 * made "Cancelletto" vanish entirely.
 */
const SLAB_MIN = ICON + 40 + 24 + 2 * 4 + 2 * 14;

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
      // height -- weight, not a smaller target (ADR-0001). `SLAB_MIN` is the
      // floor: on a short viewport the slabs stop shrinking and the panel
      // overflows visibly rather than clipping the gate's own name.
      style={{ flex: primary ? 2 : 1, minHeight: SLAB_MIN }}
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
