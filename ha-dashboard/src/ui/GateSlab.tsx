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

/**
 * The glyph size.
 *
 * 48 rather than the stack layout's 56: the icon now sits beside the name
 * rather than above it, so it is read against the cap height of a 34 px word
 * instead of standing alone. At 56 it out-weighed the name it labels.
 */
const ICON = 48;

/**
 * Every gate slab is exactly this tall.
 *
 * A fixed height rather than a minimum: the slabs must not grow into the
 * column's spare room, or a chip appearing above would resize the controls
 * under someone's thumb.
 *
 * The number comes from `t.layout.gateSlab`, not from arithmetic over the
 * contents. It used to be the latter -- `ICON + 40 + 24 + 2 * 4 + 2 * 14`,
 * i.e. 156 -- while `tokens.ts` carried `gateSlab: 96` that nothing read: the
 * token ADR-0001 designates as the single source of sizing was wrong by 60 px
 * and unread, so every budget reasoned against it was reasoning about a slab
 * that does not exist (ADR-0007). `scripts/measure-panel.ts` asserts the
 * column against this same token, so the harness and the slab cannot disagree
 * about how tall a gate is.
 */
const GATE_SLAB_H = t.layout.gateSlab;

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
      style={{ flex: '0 0 auto', height: GATE_SLAB_H }}
      onClick={() => (open ? actions.lock(entity) : actions.unlock(entity))}
    >
      <div
        style={{
          // The name is centred on the *slab*, and the icon hangs at a fixed
          // left inset beside it -- not the two centred together as a pair.
          // Centring the pair was measurably wrong against the mockup: it
          // put the name at 58.3% of the slab's width instead of 49.8%, and
          // it slid the icon rightward as the name grew, so a column of
          // gates had its glyphs in a different place on every slab. A
          // `relative` box with the icon taken out of flow is what pins the
          // glyph while leaving the name centred in the full width.
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: fg,
          // Nothing in here shrinks. As plain flex children the icon was
          // squeezed 48 -> 16 px and the name's line box 40 -> 12 px, which
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
        <span
          style={{
            // Out of flow, so the name's width cannot move it: measured at
            // 47 px from the slab's edge in the mockup, which is the tile's
            // own `space.md` padding plus `space.xl` here. A token pair
            // rather than a 33 px literal -- ADR-0001 keeps sizing in
            // `tokens.ts`, and this lands within a pixel of the mockup.
            position: 'absolute',
            left: t.space.xl,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
          }}
        >
          <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={ICON} />
        </span>
        {/*
          Name over state, centred on the slab. Hanging the state under the
          name keeps the pair reading as one label rather than two rows of a
          table, and centring it on the whole slab -- not on the space left
          over beside the icon -- is what holds the name in the same place
          from gate to gate.

          It is padded clear of the icon on *both* sides, so the centring
          stays true: padding only on the left would re-centre the text in
          the remaining width and push it right again, which is the defect
          this layout replaced. The reserved width is the icon's own inset
          plus its size.

          `minWidth: 0` is what lets the name's ellipsis below actually fire.
          Without it this flex child takes its content's intrinsic width and
          simply overflows the slab, so a long name is clipped by the tile's
          own `overflow: hidden` with no mark at all -- the failure the
          ellipsis exists to avoid.
        */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 0,
            width: '100%',
            paddingLeft: t.space.xl + ICON,
            paddingRight: t.space.xl + ICON,
            boxSizing: 'border-box',
          }}
        >
          {/*
            One size for every gate, however long its name: a longer word must
            not read as a smaller control. The label grows horizontally instead
            -- `nowrap` keeps it on one line, and the slab's own width less the
            icon is the safe bound.

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
              // The line box must contain the glyphs, not crop them. With
              // `overflow: hidden` here (which the ellipsis needs), a line
              // box shorter than the font's own line height makes this span
              // a 1 px scroller -- `scripts/measure-panel.ts` fails on it,
              // and on the panel it is a hairline shaved off the descenders.
              // 1.2 is the smallest that clears the 34 px face; tighten it
              // only with a `npm run measure` run to back the new number.
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {entity.name}
          </span>
          <span style={{ fontSize: t.font.body, opacity: 0.9, flexShrink: 0 }}>{stateLabel(entity)}</span>
        </div>
      </div>
    </Tile>
  );
}
