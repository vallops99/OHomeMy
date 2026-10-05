/**
 * The panel: three bands, each split into a left and a right half
 * (docs/protocol.md "The region", #41). The protocol's four Regions sit in
 * this frame; the frame itself is the renderer's and is not labelled.
 *
 * ```
 * +---------------------+--------------------------------+
 * |  clock              |           glance: the chips    |   status bar
 * +---------------------+--------------------------------+
 * |  glance: hero,      |                                |
 * |  stats              |  right                         |   body
 * |---------------------|                                |
 * |  left               |                                |
 * +---------------------+--------------------------------+
 * |  footer             |  footer: the Dock              |   floor
 * +---------------------+--------------------------------+
 * ```
 *
 * The sizes are the design system's Casa screen (ADR-0013): a 56 px status
 * bar, a 380 px left column, an 84 px floor, the page padded 24 px top and
 * bottom and 28 px at the sides, and 20 px between the bands.
 *
 * `glance` reaches this component in two halves -- `chips` for the status
 * bar, `glance` for the top of the left column -- and `footer` in two as
 * well -- `footer` beside the Dock, and `dock` itself. Which half is which is
 * `PlacementView`'s and `dock.ts`'s business; this only places them.
 *
 * `glance` is optional in the type on purpose: docs/protocol.md says the
 * region "collapses" when its Home Assistant helper toggle is off. Making it
 * an optional prop is what lets that be expressed in TypeScript rather than
 * as a runtime `if` the type system cannot see -- the caller (whatever reads
 * the toggle) simply omits the prop, and `chips` with it.
 *
 * `left` is optional too, and the left column exists while either of the two
 * is there. It used to go with `glance`, `left` included, on the judgement
 * that without a glance above it the column was a sidebar the protocol never
 * described. That judgement dropped Placed things without a word: a Page
 * whose `glance` held nothing lost its `left` with it, and the toggle took
 * `page:main`'s gates. Something Placed is shown (docs/protocol.md), so the
 * column now collapses only when both are absent, and only then does `right`
 * take the width.
 *
 * The floor goes when it would hold nothing: no `footer` and no Dock, which
 * happens only on `page:main` with nothing Placed in its footer -- everywhere
 * else the Dock is always shown.
 *
 * This component knows nothing about Home Assistant, Areas, entities, or
 * Regions-as-a-source-of-content -- only that it has been handed slots of
 * `ReactNode` (ADR-0002's seam: `src/ui/` takes finished content, `src/ha/`
 * decides what that content is). `PlacementView` (`src/ui/PlacementView.tsx`)
 * is what turns a Region's `Placed[]` into the nodes passed in here.
 */
import { useRef, type ReactNode } from 'react';
import { t } from './theme';
import { useHasMoreBelow } from './useHasMoreBelow';

export type PanelProps = {
  /** The status bar's left half: the time and the date, supplied by the renderer. */
  clock: ReactNode;
  /** The status bar's right half: `glance`'s chips. Absent with `glance`. */
  chips?: ReactNode;
  /** The top of the left column: `glance`'s hero and stats. Absent when the glance toggle is off -- see above. */
  glance?: ReactNode;
  /** The left column, below the glance. Absent when nothing is Placed in it. */
  left?: ReactNode;
  /** The body's right half. Takes the whole width when `glance` and `left` are both absent. */
  right: ReactNode;
  /** The floor's left half: everything in `footer` but its Page Openers. Absent when that is nothing. */
  footer?: ReactNode;
  /** The floor's right half. Absent when the Dock is not shown. */
  dock?: ReactNode;
};

export function Panel({ clock, chips, glance, left, right, footer, dock }: PanelProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const leftHasMore = useHasMoreBelow(leftRef);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space[5],
        padding: `${t.space[6]}px ${t.space[7]}px`,
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
        The status bar: the Clock on the left, the chips on the right. A
        fixed height, so house state -- how many chips there are -- never
        moves the body. The chips get whatever width the Clock leaves and sit
        flush right; past that, `ChipRow` scrolls its own row sideways rather
        than pushing the Clock over.
      */}
      <div style={{ flex: `0 0 ${t.size.statusBarHeight}px`, display: 'flex', alignItems: 'center', gap: t.space[6], minWidth: 0 }}>
        <div style={{ flex: '0 0 auto' }}>{clock}</div>
        {chips !== undefined && <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>{chips}</div>}
      </div>

      {/*
        The body: the left column (`glance` over `left`) beside `right`.
        `minHeight: 0` on every flex child that must be able to shrink --
        carried forward from variant D's Panel and from ScreenView's chip row.
        Without it, a Region that grows past its share (a sixth Area's worth
        of rows) pushes the floor off a panel that cannot scroll, which is the
        exact failure #6 and #8 both found by measuring rather than by reading
        the arithmetic.
      */}
      <div style={{ display: 'flex', flex: 1, gap: t.space[6], minHeight: 0 }}>
        {(glance !== undefined || left !== undefined) && (
          // The left column exists while `glance` or `left` does -- see the
          // header note. A fixed width, the design system's `sidebar-width`:
          // sized for its own content (the hero, the gates), not against the
          // right column's.
          //
          // An earlier version gave `left` its own `flex: 1; overflow: auto`
          // sub-box sized to "whatever is left after glance" -- which
          // measured clean at the *document* level while quietly clipping
          // the camera glance inside that sub-box's own scrollbar.
          // `overflowX/Y: false` on the outer document is not proof of fit
          // (ADR-0004's amendment, restated): a clipped inner scroller does
          // not move the document's own scrollHeight, so it must be checked
          // separately -- and is, by `scripts/measure-panel.ts`.
          <div
            style={{
              flex: `0 0 ${t.size.sidebarWidth}px`,
              // `flex: 0 0 <w>` is not rigid on its own: a flex item's
              // `min-width` defaults to `auto`, which is its *content's*
              // minimum, and that floor beats the basis. A row of `nowrap`
              // chips once widened this column by 20 px and shoved `right`
              // sideways, which is house state changing the panel's
              // geometry, the exact class of defect ADR-0007 removed from the
              // column's *height*. `minWidth: 0` lets the basis actually hold.
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
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
            {glance !== undefined && <div style={{ flex: '0 0 auto', minHeight: 0 }}>{glance}</div>}
            {/*
              `left` is the region that yields (ADR-0007), and it
              yields *discretely*: `flex: '0 1 auto'` with `overflowY: auto`
              means it is at full size whenever the column can afford it --
              which, with the fixture's content, is always -- and becomes a
              scroller only when a house adds enough to `left` to
              overflow the column. Nothing degrades until something has to,
              and then exactly one named region does, visibly.

              `marginTop: 'auto'` still pins the block to the foot of the
              column under a glance, so the gates stay where the hand expects
              them. With no glance above it, `left` is all the column holds
              and starts at the top.
            */}
            <div
              ref={leftRef}
              style={{
                flex: '0 1 auto',
                marginTop: glance !== undefined ? 'auto' : undefined,
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
          `right`: the body's full height, and the whole width when the left
          column is absent -- `flex: 1` does that with no conditional styling
          needed here, since it is the only remaining flex item in the row at
          that point.
        */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: t.space.sm, overflow: 'auto' }}>{right}</div>
      </div>

      {(footer !== undefined || dock !== undefined) && (
        // The floor: `dock-height`, and never the thing squeezed when the
        // body grows -- exactly the row that must stay reachable at the foot
        // of a panel that cannot scroll. A floor, not a cap: something
        // Placed in `footer` that is taller (a gate is `gateSlab`, 100) makes
        // it taller rather than being clipped, and the body gives way.
        // The Dock holds its own width on the right; `footer` takes the rest,
        // and all of it when there is no Dock.
        <div style={{ flex: '0 0 auto', minHeight: t.size.dockHeight, display: 'flex', gap: t.space[3], minWidth: 0 }}>
          {/*
            A house that places more than fits (#32) gets a strip that scrolls
            sideways, resting on whole blocks, as `ChipRow` rests on whole
            chips: a block is either all there or scrolled to, never clipped.
            Every item `PlacementView` puts here is a `scrollSnapAlign:
            'start'` point. At the fixture's busy footer nothing scrolls
            (`npm run measure`).
          */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'stretch',
              gap: t.space.sm,
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollSnapType: 'x mandatory',
              // A scrollbar would take height from a strip measured to the
              // pixel; Fully Kiosk hides them anyway, and the snapping says
              // there is more.
              scrollbarWidth: 'none',
            }}
          >
            {footer}
          </div>
          {dock}
        </div>
      )}
    </div>
  );
}
