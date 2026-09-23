/**
 * Design tokens for the Casa Carina wall panel. Validated in the #6 prototype
 * (branch `prototype/design-system`); see docs/adr/0001-design-system.md.
 *
 * Every colour derives from the KNOBS below, so a new palette is one edit here
 * rather than a sweep through components. Nothing downstream may hardcode a
 * colour, a font size, or a radius.
 *
 * Contrast is not decorative here: the panel is read at 1-2 m. `onActive` and
 * `activeStrong` compute themselves from accent lightness precisely so that
 * retuning `accentHue`/`accentLight` cannot silently produce unreadable text.
 */

export type Knobs = {
  /** hue of the "active/on" accent, degrees. 45 = warm amber */
  accentHue: number;
  accentSat: number;
  accentLight: number;
  /** hue of the dark ground; a few degrees of warmth stops it looking like dead CRT black */
  groundHue: number;
  groundSat: number;
  /** fault colour, deliberately far from the accent so "unavailable" never reads as "on" */
  faultHue: number;
  /** global corner radius in px */
  radius: number;
};

export const KNOBS: Knobs = {
  accentHue: 130,
  accentSat: 35,
  accentLight: 30,
  groundHue: 40,
  groundSat: 6,
  faultHue: 8,
  radius: 10,
};

const hsl = (h: number, s: number, l: number, a = 1) => (a === 1 ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${a})`);

export function buildTokens(k: Knobs = KNOBS) {
  return {
    color: {
      /** the page itself */
      ground: hsl(k.groundHue, k.groundSat, 4),
      /** an inactive tile */
      surface: hsl(k.groundHue, k.groundSat, 9),
      surfaceRaised: hsl(k.groundHue, k.groundSat, 13),
      /** an ACTIVE tile — the accent is a fill, not an outline: it must read at 2 m */
      active: hsl(k.accentHue, k.accentSat, k.accentLight),
      activeDim: hsl(k.accentHue, k.accentSat - 20, k.accentLight - 12),
      /**
       * Text ON an active surface. Computed, not fixed: a light accent (amber at
       * 65%) needs near-black text, a dark one (green at 30%) needs near-white.
       * Flipping at 50% lightness keeps any hue the knobs produce above WCAG AA.
       */
      onActive: k.accentLight >= 50 ? hsl(k.accentHue, 60, 8) : hsl(k.accentHue, 12, 97),
      /**
       * A dark accent barely separates from the ground — hsl(130 35% 30%) is only
       * 2.96:1 against it, under the 3:1 WCAG asks for UI components. Filled
       * controls that must read as "on" at 2 m use this lifted variant, floored
       * at 42% lightness where both ground separation (5.76:1) and dark text on
       * it (4.98:1) clear AA. Below that floor nothing passes: the colour sits
       * in the middle where neither light nor dark text works.
       */
      activeStrong: hsl(k.accentHue, k.accentSat + 12, Math.max(k.accentLight + 18, 42)),
      /** text ON activeStrong — always the dark one, since activeStrong is >= 42% */
      onActiveStrong: hsl(k.accentHue, 60, 8),
      textPrimary: hsl(k.groundHue, 8, 97),
      textSecondary: hsl(k.groundHue, 6, 62),
      /** unavailable: never hidden, always visibly faulted (map Notes) */
      fault: hsl(k.faultHue, 74, 55),
      faultSurface: hsl(k.faultHue, 40, 13),
      border: hsl(k.groundHue, 6, 20),
      /** Dims the panel behind a modal, so the dialog reads as the focus. */
      backdrop: hsl(k.groundHue, k.groundSat, 2, 0.72),
    },
    /**
     * Two tiers, per the tablet research: glanceable content must read at 1-2 m,
     * interactive content at 0.5-0.7 m.
     */
    font: {
      /**
       * The system stack, not a webfont: the panel boots offline-first and a
       * font request that stalls would leave the house unlabelled.
       */
      family: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      /**
       * The hero temperature, read on approach from 2 m. Variant D sets this
       * as the one number the panel leads with (#6); it is a token rather
       * than a literal so ADR-0001's rule holds -- nothing downstream
       * hardcodes a font size.
       */
      hero: 112,
      glanceXL: 56, // the one number you read on approach
      glanceL: 34,
      glanceM: 22,
      body: 17, // research floor: never below ~16 at 2 m
      caption: 14,
    },
    space: { xs: 4, sm: 8, md: 14, lg: 22, xl: 34 },
    radius: { tile: k.radius, pill: 999, sm: Math.round(k.radius / 2) },
    /** 64 px minimum for primary controls, 44 px absolute floor (research §2.3) */
    touch: { primary: 64, floor: 44 },
    /**
     * The panel layout at 1280x800: variant D, "Arrivo calmo" (#6).
     *
     * Two regions side by side, not a uniform grid. The sidebar is the glance
     * layer -- the hero temperature, the house's concerns as chips, what the
     * cameras see, and the gates -- at a fixed width so the hero's 112 px
     * number has a column it can live in. The main region is the touched
     * layer: one row per Area, then a strip of secondary controls.
     *
     *   sidebar  420  fixed; the arrival column
     *   main     rest; room rows over a bottom strip
     *
     * The regions size their contents intrinsically rather than by row
     * arithmetic. An earlier 4x4 grid (#8) computed four unequal rows that
     * filled 800 px exactly, which is a real property this layout gives up:
     * fit here is a matter of measurement, not of adding the rows up. That
     * was the trade accepted when variant D was restored -- see the
     * amendment on ADR-0004.
     *
     *   rowRoom  the height of one Area row: a 64 px control plus padding
     *   strip    the bottom strip, matching the old grid's secondary row
     *
     * #13 replaces the two-region layout above with the protocol's 2x2
     * (docs/protocol.md, ADR-0005): `glance` top-left, `left`
     * bottom-left, `right` the full-height right column, `footer`
     * along the floor. `leftColW` reuses `sidebarW`'s value rather than a new
     * number -- 420 px was already the arrival column's measured width and
     * nothing about the 2x2 changes what a comfortable left column is.
     *
     * The 2x2 inherits variant D's obligation (ADR-0004's amendment): these
     * are starting sizes, not a row/column arithmetic that is claimed to sum
     * to 800 -- fit is measured, not added up. `footerH` was first set to
     * the old `rowStrip` (96), then measured down to exactly `touch.primary`
     * (64): at 1280x800 with `glance` on, the left column's fixed content
     * (two `GateSlab`s, a `CameraGlance`, `Hero`, `Stats`, and `ChipRow`'s own
     * minimum) needed those 32 px back, and nothing in the footer --
     * `MediaBar`, `AreaOpenerBlock` -- needs more than the ADR-0001 touch
     * floor to remain a full touch target. Measured, not guessed: see the
     * #13 agent's report for the harness output.
     *
     * `gateSlab` (ADR-0007) was a lie for the whole life of this file.
     * Nothing read it: `GateSlab.tsx` computed its own height locally
     * (`ICON + 40 + 24 + 2 * 4 + 2 * 14` = 156), so the token said 96 while
     * the slab rendered at 156 -- ADR-0001's single source of sizing wrong by
     * 60 px and unread, which is how every budget above could be computed
     * carefully and still be computed against a slab that does not exist.
     * `GateSlab.tsx` now reads this token (and re-exports it as
     * `GATE_SLAB_H`), so the two cannot drift again.
     *
     * 100 is the mockup's height, and it fits with room to spare: the
     * measurement is committed this time:
     * `scripts/measure-panel.ts`. With the Hero's negative margins gone
     * (ADR-0007: they pulled 26 px of real ink outside the element's box, and
     * the "blank metrics" they claimed to reclaim do not exist -- a Range over
     * the glyphs measures 130 px of ink in a 128.8 px box), the glance block
     * needs 274 px. The largest slab that still fits at 1280x768 is 128; 100
     * leaves 64 px spare at 768 and 96 px at 800. The slab used to be 120 and
     * a vertical stack; the row layout (icon beside the name, ADR-0008) says
     * what a gate is in less height, so the extra 20 px goes back to the
     * column as headroom -- ADR-0007 chooses headroom over presence, and 100
     * is still far above `touch.primary` (64). Re-derive with `npm run
     * measure` rather than assuming this number survives a change to the
     * column's contents.
     *
     * `chipRowLines` (2) is how many rows of chips the box holds, and with
     * `chipRowFloor` it is the box's whole height: two lines plus the
     * `space.sm` between them. The row wraps within that box and scrolls
     * vertically past it, so house state changes which chips are *visible*
     * and never how tall the column is -- ADR-0007's property, kept while
     * allowing the second line the one-line row refused.
     *
     * Two rather than three, and the budget is why: the left column has
     * 48 px spare at 1280x768 once `glance` and `left` have taken
     * theirs, and a second chip line costs exactly 48 (`chipRowFloor` plus
     * the `space.sm` gap). It fits at the floor with nothing left over; a
     * third line does not fit at all. The room came from `gateSlab` dropping
     * 120 -> 100 in the same pass -- two slabs, 20 px each. If the slab
     * grows back, this must return to one line: re-derive with
     * `npm run measure` rather than assuming the second line still fits.
     *
     * `chipRowFloor` (panel layout defect pass, following #14): `ChipRow`
     * was the left column's one flexible element -- `flex: 1; minHeight: 0`
     * in `GlanceView` -- so it silently absorbed whatever the rest of the
     * column did not use, down to a measured 8 px at 1280x768 while a real
     * chip ("Un guasto") is 40 px tall. A chip sliced to 8 px is unreadable,
     * which is a worse failure than the column needing to scroll. 40 is not
     * a guess: it is `chip.getBoundingClientRect().height` read directly off
     * the rendered "Un guasto" chip at 1280x800 (`ChipRow.tsx`'s `Chip`:
     * `body` text at `space.sm` padding top and bottom, `alignItems: center`
     * against a 20 px icon) -- close to but deliberately not reusing
     * `touch.floor` (44), because that is a touch-target minimum for
     * controls and a chip is not pressable; the two numbers coinciding would
     * be a coincidence this token does not want to depend on. If a future
     * chip's contents change height, remeasure and update this number rather
     * than assume it still matches.
     */
    layout: { sidebarW: 420, rowRoom: 76, rowStrip: 96, gateSlab: 100, leftColW: 420, footerH: 64, chipRowFloor: 40, chipRowLines: 2 },
  };
}

export type Tokens = ReturnType<typeof buildTokens>;
