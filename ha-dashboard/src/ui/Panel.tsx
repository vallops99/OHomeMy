/**
 * The panel: the protocol's 2x2 (#13, docs/protocol.md, ADR-0005).
 *
 * Layout stops being a decision this repo makes at all. What used to be
 * variant D's two hand-composed regions (sidebar / main, #6) is now a fixed
 * shape the protocol names -- `glance`, `left`, `right`,
 * `footer` -- and Home Assistant labels decide what lands in each one. This
 * component only knows the shape:
 *
 * ```
 * +---------------------+--------------------------------+
 * |  glance             |                                |
 * |                     |  right                         |
 * +---------------------+                                |
 * |                     |                                |
 * |  left               |                                |
 * |                     |                                |
 * +---------------------+--------------------------------+
 * |  footer                                              |
 * +------------------------------------------------------+
 * ```
 *
 * `glance` is optional in the type on purpose: docs/protocol.md says the
 * region "collapses" when its Home Assistant helper toggle is off, and at
 * that point `right` takes the panel's whole width. Making `glance`
 * an optional prop is what lets that be expressed in TypeScript rather than
 * as a runtime `if` the type system cannot see -- the caller (whatever reads
 * the toggle) simply omits the prop, and the left column disappears along
 * with it, `left` included: with no glance to sit above it, a left
 * column holding only `left` would be a second, smaller sidebar the
 * protocol never described. Neither ADR-0005 nor docs/protocol.md says what
 * happens to `left` when `glance` collapses, so this is a judgement
 * call, recorded here rather than left implicit: the two-column split is a
 * `glance`-driven shape, so when there is no `glance` there is no split.
 *
 * This component knows nothing about Home Assistant, Areas, entities, or
 * Regions-as-a-source-of-content -- only that it has been handed four slots
 * of `ReactNode` (ADR-0002's seam: `src/ui/` takes finished content, `src/ha/`
 * decides what that content is). `PlacementView` (`src/ui/PlacementView.tsx`)
 * is what turns a Region's `Placed[]` into the nodes passed in here.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from './theme';

/**
 * Is this element scrolled short of its end? Drives the fade below.
 *
 * A `ResizeObserver` rather than a one-off measurement, because what makes
 * `left` overflow is a house adding a card -- a change in content,
 * not in viewport -- and a one-off read at mount would miss it. It observes
 * the scroller *and* its children, since the overflow condition changes when a
 * child resizes even though the scroller itself does not.
 */
function useHasMoreBelow(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;

    const measure = () => {
      // A 1 px tolerance: sub-pixel layout routinely leaves scrollHeight a
      // fraction above clientHeight on an element that visually fits, and a
      // fade over nothing is the same lie in the other direction.
      const hidden = el.scrollHeight - el.clientHeight - el.scrollTop;
      setMore(hidden > 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    el.addEventListener('scroll', measure, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', measure);
    };
  });

  return more;
}

export type PanelProps = {
  /** The top-left quadrant. Absent when the glance toggle is off -- see above. */
  glance?: ReactNode;
  /** The bottom-left quadrant. Only ever shown alongside `glance`. */
  left: ReactNode;
  /** The right column, full height. Takes the whole width when `glance` is absent. */
  right: ReactNode;
  /** The strip along the floor. */
  footer: ReactNode;
};

export function Panel({ glance, left, right, footer }: PanelProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const leftHasMore = useHasMoreBelow(leftRef);

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
        The top block: the left column (`glance` over `left`) beside the
        full-height `right`. `minHeight: 0` on every flex child that
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
          // `left` (today: the gates; the camera glance moved to `glance`, #29) is
          // pinned at its own full, fixed size and anchored to the foot of
          // the column with `marginTop: auto` -- the same trick
          // `screens/ScreenView.tsx`'s `cameras` case used ("everything from
          // the cameras down is one pinned block ... a chip appearing above
          // moves none of it"). `glance` takes `flex: 1; minHeight: 0` and so
          // gets whatever height is left over, compressible rather than
          // fixed; within it, `PlacementView`'s `GlanceView` makes `ChipRow`
          // the part that actually yields (scrolls its own concerns) while
          // `Hero` and `Stats` hold their size. This is deliberately the
          // opposite of giving `left` the flexible box: the gates
          // are the primary affordance (CONTEXT.md) and must never be the
          // thing that shrinks or clips to make room for a chip.
          //
          // An earlier version instead gave `left` its own
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
              // `flex: 0 0 <w>` is not rigid on its own: a flex item's
              // `min-width` defaults to `auto`, which is its *content's*
              // minimum, and that floor beats the basis. `ChipRow` is a row
              // of `nowrap` chips, so its intrinsic minimum is the sum of
              // every chip -- a third concern widened this column from 420
              // to 440 px and shoved `right` sideways, which is
              // house state changing the panel's geometry, the exact class
              // of defect ADR-0007 removed from the column's *height*.
              // `minWidth: 0` lets the basis actually hold; the chip row
              // handles its own overflow within it.
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              // `sm`, not `lg`: measured down from the sidebar's original gap
              // once the glance block's own minimum (Hero + Stats, both
              // fixed) plus the pinned gates-and-cameras block turned out to
              // need every spare pixel the column had -- see the note on
              // `footerH` in theme/tokens.ts for the sibling adjustment, and
              // the matching `sm` gap inside `PlacementView`'s `GlanceView`
              // and below on `left`'s own wrapper.
              gap: t.space.sm,
              minHeight: 0,
            }}
          >
            {/*
              `glance` holds its measured height and never scrolls (ADR-0007).
              `flex: '0 0 auto'`, not `flex: 1`: it takes exactly what its
              contents need, and `scripts/measure-panel.ts` asserts that the
              column always has that much to give at every supported viewport.

              This is the reverse of what this column did before ADR-0007,
              and the reversal is the point. `glance` used to be the flexible
              box and `left` the pinned one, on the reasoning that
              the gates are the primary affordance and must never be what
              shrinks. The reasoning was right about the ranking and wrong
              about the mechanism: making `glance` flexible made its
              degradation *continuous*, so the column silently compressed the
              house's Verdict a few pixels at every viewport until `Stats`
              was sliced in half at 1280x768 with nothing to announce it. A
              glance you have to scroll is not a glance (CONTEXT.md: read on
              approach from 2 m).
            */}
            <div style={{ flex: '0 0 auto', minHeight: 0 }}>{glance}</div>
            {/*
              `left` is the region that yields (ADR-0007), and it
              yields *discretely*: `flex: '0 1 auto'` with `overflowY: auto`
              means it is at full size whenever the column can afford it --
              which, with the fixture's content, is always -- and becomes a
              scroller only when a house adds enough to `left` to
              overflow the column. Nothing degrades until something has to,
              and then exactly one named region does, visibly.

              `marginTop: 'auto'` still pins the block to the foot of the
              column, so the gates stay where the hand expects them.
            */}
            <div
              ref={leftRef}
              style={{
                flex: '0 1 auto',
                marginTop: 'auto',
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: t.space.sm,
                // The fade that admits there is more below (ADR-0007). A
                // scrollbar is not an affordance on this hardware: Fully
                // Kiosk hides them, and at 2 m a 4 px track is invisible
                // anyway -- so a gate cut off by an unannounced scroll
                // boundary is content that exists with no sign that it does.
                // That is the deleted NavBar.tsx's own principle, quoted
                // twice in ADR-0006: "a dead control that looks live is worse
                // than one that admits it is not there."
                //
                // Conditional, never permanent: `useHasMoreBelow` turns it on
                // only while something is actually hidden, because a fade
                // over a column that fits would be the same lie pointing the
                // other way. `maskImage` rather than a gradient overlay so it
                // costs no extra element and cannot intercept a tap meant for
                // the gate underneath it.
                maskImage: leftHasMore ? 'linear-gradient(to bottom, #000 calc(100% - 40px), transparent)' : undefined,
              }}
            >
              {left}
            </div>
          </div>
        )}

        {/*
          `right`: full height, and the whole width when `glance` (and
          so the left column) is absent -- `flex: 1` does that with no
          conditional styling needed here, since it is the only remaining
          flex item in the row at that point.
        */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: t.space.sm, overflow: 'auto' }}>{right}</div>
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
