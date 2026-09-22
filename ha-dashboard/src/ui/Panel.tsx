/**
 * The panel: the protocol's 2x2 (#13, docs/protocol.md, ADR-0005).
 *
 * Layout stops being a decision this repo makes at all. What used to be
 * variant D's two hand-composed regions (sidebar / main, #6) is now a fixed
 * shape the protocol names -- `glance`, `entities-left`, `entities-right`,
 * `footer` -- and Home Assistant labels decide what lands in each one. This
 * component only knows the shape:
 *
 * ```
 * +---------------------+--------------------------------+
 * |  glance             |                                |
 * |                     |  entities-right                |
 * +---------------------+                                |
 * |                     |                                |
 * |  entities-left      |                                |
 * |                     |                                |
 * +---------------------+--------------------------------+
 * |  footer                                              |
 * +------------------------------------------------------+
 * ```
 *
 * `glance` is optional in the type on purpose: docs/protocol.md says the
 * region "collapses" when its Home Assistant helper toggle is off, and at
 * that point `entities-right` takes the panel's whole width. Making `glance`
 * an optional prop is what lets that be expressed in TypeScript rather than
 * as a runtime `if` the type system cannot see -- the caller (whatever reads
 * the toggle) simply omits the prop, and the left column disappears along
 * with it, `entities-left` included: with no glance to sit above it, a left
 * column holding only `entities-left` would be a second, smaller sidebar the
 * protocol never described. Neither ADR-0005 nor docs/protocol.md says what
 * happens to `entities-left` when `glance` collapses, so this is a judgement
 * call, recorded here rather than left implicit: the two-column split is a
 * `glance`-driven shape, so when there is no `glance` there is no split.
 *
 * This component knows nothing about Home Assistant, Areas, entities, or
 * Regions-as-a-source-of-content -- only that it has been handed four slots
 * of `ReactNode` (ADR-0002's seam: `src/ui/` takes finished content, `src/ha/`
 * decides what that content is). `PlacementView` (`src/ui/PlacementView.tsx`)
 * is what turns a Region's `Placed[]` into the nodes passed in here.
 */
import type { ReactNode } from 'react';
import { t } from './theme';

export type PanelProps = {
  /** The top-left quadrant. Absent when the glance toggle is off -- see above. */
  glance?: ReactNode;
  /** The bottom-left quadrant. Only ever shown alongside `glance`. */
  entitiesLeft: ReactNode;
  /** The right column, full height. Takes the whole width when `glance` is absent. */
  entitiesRight: ReactNode;
  /** The strip along the floor. */
  footer: ReactNode;
};

export function Panel({ glance, entitiesLeft, entitiesRight, footer }: PanelProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.lg,
        padding: t.space.lg,
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box',
        background: t.color.ground,
        // The panel is a fixed 1280x800 pane on a wall, so nothing scrolls in
        // the designed case (ADR-0004's amendment: fit is measured, not
        // summed). `auto` rather than `hidden` for the same reason variant D
        // kept it: a viewport shorter than the content, or a Region grown
        // past its share by whatever is Placed into it, is a real condition
        // that should show a scrollbar rather than silently clip -- the
        // failure this panel exists to avoid is a control cut off the bottom
        // edge with nothing on screen to say so.
        overflow: 'auto',
      }}
    >
      {/*
        The top block: the left column (glance over entities-left) beside the
        full-height entities-right. `minHeight: 0` on every flex child that
        must be able to shrink -- carried forward from variant D's Panel and
        from ScreenView's chip row, per the ticket's explicit instruction.
        Without it, a Region that grows past its share (a sixth Area's worth
        of rows, an unbounded chip list) pushes the footer off a panel that
        cannot scroll, which is the exact failure #6 and #8 both found by
        measuring rather than by reading the arithmetic.
      */}
      <div style={{ display: 'flex', flex: 1, gap: t.space.lg, minHeight: 0 }}>
        {glance !== undefined && (
          // The left column exists only because `glance` does -- see the
          // header note. `flexShrink: 0` and a fixed width, same as variant
          // D's sidebar: the left column is the glance layer's column, sized
          // for its content (the 112 px hero, the chip row), not sized against
          // the right column's Area rows.
          //
          // `entities-left` (today: the gates, then the camera glance) is
          // pinned at its own full, fixed size and anchored to the foot of
          // the column with `marginTop: auto` -- the same trick
          // `screens/ScreenView.tsx`'s `cameras` case used ("everything from
          // the cameras down is one pinned block ... a chip appearing above
          // moves none of it"). `glance` takes `flex: 1; minHeight: 0` and so
          // gets whatever height is left over, compressible rather than
          // fixed; within it, `PlacementView`'s `GlanceView` makes `ChipRow`
          // the part that actually yields (scrolls its own concerns) while
          // `Hero` and `Stats` hold their size. This is deliberately the
          // opposite of giving `entities-left` the flexible box: the gates
          // are the primary affordance (CONTEXT.md) and must never be the
          // thing that shrinks or clips to make room for a chip.
          //
          // An earlier version instead gave `entities-left` its own
          // `flex: 1; overflow: auto` sub-box sized to "whatever is left
          // after glance" -- which measured clean at the *document* level
          // (`overflowX/Y: false`) while quietly clipping the camera glance
          // inside that sub-box's own scrollbar. `overflowX/Y: false` on the
          // outer document is not proof of fit (ADR-0004's amendment,
          // restated): a clipped inner scroller does not move the document's
          // own scrollHeight, so it must be checked separately -- and now is,
          // by asserting no element anywhere has `scrollHeight > clientHeight`
          // (see the measurement harness), not only checking `<html>`.
          <div
            style={{
              flex: `0 0 ${t.layout.leftColW}px`,
              display: 'flex',
              flexDirection: 'column',
              // `sm`, not `lg`: measured down from the sidebar's original gap
              // once the glance block's own minimum (Hero + Stats, both
              // fixed) plus the pinned gates-and-cameras block turned out to
              // need every spare pixel the column had -- see the note on
              // `footerH` in theme/tokens.ts for the sibling adjustment, and
              // the matching `sm` gap inside `PlacementView`'s `GlanceView`
              // and below on `entitiesLeft`'s own wrapper.
              gap: t.space.sm,
              minHeight: 0,
            }}
          >
            <div style={{ flex: 1, minHeight: 0 }}>{glance}</div>
            <div style={{ flexShrink: 0, marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: t.space.sm }}>
              {entitiesLeft}
            </div>
          </div>
        )}

        {/*
          entities-right: full height, and the whole width when `glance` (and
          so the left column) is absent -- `flex: 1` does that with no
          conditional styling needed here, since it is the only remaining
          flex item in the row at that point.
        */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: t.space.sm, overflow: 'auto' }}>
          {entitiesRight}
        </div>
      </div>

      {/*
        The footer strip. `flexShrink: 0` so it holds its height and is never
        the thing that gets squeezed when the quadrants above it grow --
        exactly the row that must stay reachable at the foot of a panel that
        cannot scroll.
      */}
      <div style={{ flexShrink: 0, minHeight: t.layout.footerH, display: 'flex', alignItems: 'stretch', gap: t.space.sm }}>{footer}</div>
    </div>
  );
}
