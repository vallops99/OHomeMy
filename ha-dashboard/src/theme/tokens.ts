/**
 * Design tokens for the Casa Carina wall panel, ported from the Casa Panel
 * design system's `tokens.json` (ADR-0013, superseding ADR-0001's KNOBS).
 *
 * The design system is the source of truth: a colour, radius or spacing
 * change is made there first and re-ported here, never tuned in place.
 * Colour means state -- `accent` only "on", `alert` only "needs you" -- so
 * nothing downstream may hardcode a colour, a font size, or a radius, and no
 * component may borrow a colour for a meaning it does not carry.
 *
 * Contrast is not decorative here: the panel is read at 1-2 m.
 * `tokens.test.ts` measures every pair the system documents against WCAG AA
 * (text 4.5:1, controls and icons 3:1) rather than trusting the stated ratios.
 */
import { withAlpha } from './color';

/** Casa Panel's tokens, as `tokens.json` (version 1) has them. */
export const CASA = (() => {
  const ink = '#f2f1ec';
  const accent = '#f5c15c';
  return {
    /** Dark only: the panel lives on a wall and must not light up a room at night. */
    color: {
      /** The page ground behind everything. */
      bg: '#0e0f0d',
      /** Grouping cards: stat cards, the Accessi card, the media bar, the dock, neutral chips. */
      surface: '#161715',
      /** A room tile with lights, while they are off. */
      surfaceTile: '#191a18',
      /** A room tile with no controllable light: darker, so it reads as passive. */
      surfaceStatic: '#141513',
      /** Icon wells. */
      surfaceWell: '#20211e',
      /** The unfilled part of a dimmer. */
      surfaceControl: '#232420',
      /** Border of surface cards; the divider between rows. */
      line: '#232421',
      /** Border of neutral chips and outline buttons. */
      lineStrong: '#2a2b28',
      /** Border of an off room tile. */
      lineTile: '#262724',
      /** Primary text and numbers, on every surface. */
      ink,
      /** Text on chips and outline buttons, the media title. */
      inkSoft: '#d9d8d2',
      /** Supporting values, inactive nav labels, off room icons. */
      inkSecondary: '#c9c8c2',
      /** Metadata, section labels, status words, chevrons. */
      inkMuted: '#9c9b95',
      /** Tertiary hints; never smaller than 15 px. */
      inkFaint: '#8e8d87',
      /** The only accent, and it means ON. Never decorative. */
      accent,
      /** Accent at 36%: the dimmer fill and the hold-to-open sweep. */
      accentSoft: '#f5c15c5c',
      /** On an `accent` fill: the switch knob. */
      onAccent: '#15130d',
      /** A room tile with any light on. */
      litSurface: '#26221a',
      litLine: '#4a3f26',
      /** Meta text on a lit tile. */
      litInk: '#e8d9b8',
      /** An off switch track; also the secondary button fill (Chiudi). */
      switchOff: '#2f302d',
      knobOff: '#8c8c86',
      /** Text and icon of something that needs attention: a Fault. Semantic, not the accent. */
      alert: '#ff9b80',
      alertSurface: '#2a1611',
      alertLine: '#5a2a1e',
      /** The one high-contrast action per group (Apri), and the current nav item: `{ink}`. */
      primary: ink,
      onPrimary: '#111210',
      /** Keyboard focus outline: `{accent}`. */
      focus: accent,
    },
    font: { sans: 'Geist, system-ui, -apple-system, "Segoe UI", sans-serif' },
    /** Casa Panel's named type styles, for the components that take them up. */
    type: {
      tempHero: { size: 144, lineHeight: 1, weight: 200, letterSpacing: '-0.05em' },
      stat: { size: 34, lineHeight: '40px', weight: 500, letterSpacing: '-0.02em' },
      clock: { size: 30, lineHeight: '36px', weight: 500, letterSpacing: '-0.02em' },
      tileTitle: { size: 21, lineHeight: '26px', weight: 500, letterSpacing: '-0.01em' },
      rowTitle: { size: 19, lineHeight: '24px', weight: 500, letterSpacing: 'normal' },
      bodyLg: { size: 17, lineHeight: '24px', weight: 400, letterSpacing: 'normal' },
      body: { size: 16, lineHeight: '22px', weight: 400, letterSpacing: 'normal' },
      meta: { size: 15, lineHeight: '20px', weight: 400, letterSpacing: 'normal' },
      label: { size: 14, lineHeight: '18px', weight: 500, letterSpacing: '0.08em' },
    },
    /** 4 px base: 12 between siblings, 20-24 between regions, 28 at the page sides. */
    space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28 },
    /** Radii that nest: the inner one is the outer minus the padding between them. */
    radius: { well: 15, control: 18, card: 22, tile: 24, dock: 26, pill: 9999 },
    /** Touch sizes are floors, not suggestions. */
    size: {
      canvasWidth: 1280,
      canvasHeight: 800,
      targetMin: 52,
      targetControl: 56,
      statusBarHeight: 56,
      dockHeight: 84,
      sidebarWidth: 380,
    },
  };
})();

const kebab = (name: string | number) => String(name).replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);

/**
 * The tokens as CSS custom properties, under the design system's own names
 * (`--surface-tile`, `--radius-tile`, `--space-3`), so a stylesheet written
 * against its `tokens.css` reads them unchanged. Mounted on `:root` by
 * `HakitTheme`.
 */
export function cssVariables(): string {
  const px = (group: string, values: Record<string | number, number>) =>
    Object.entries(values).map(([k, v]) => `--${group}${kebab(k)}: ${v}px;`);
  return [
    ...Object.entries(CASA.color).map(([k, v]) => `--${kebab(k)}: ${v};`),
    `--font-sans: ${CASA.font.sans};`,
    ...px('space-', CASA.space),
    ...px('radius-', CASA.radius),
    ...px('', CASA.size),
  ].join('\n');
}

/**
 * Which reading distance the tokens are sized for (#15, ADR-0011). `wall` is
 * the designed target: the 1280x800 panel read at 1-2 m. `arm` is a phone,
 * held at arm's length.
 */
export type Scale = 'wall' | 'arm';

export function buildTokens(scale: Scale = 'wall') {
  const wall = buildWallTokens();
  return scale === 'wall' ? wall : armTokens(wall);
}

/**
 * The phone's sizes, as changes to the wall's. Only size changes; colour and
 * touch sizing do not (a thumb is not smaller than a finger at a wall).
 *
 * The display sizes shrink by about a third: they were extrapolated for 1-2 m,
 * and a 112 px hero at 40 cm is a third of the screen for one number. Body
 * text barely moves: 17 was already the phone platforms' own body size (iOS
 * 17 pt, Android 16 sp), so the wall's "readable at 2 m" floor was never a
 * wall-sized number. Picked on the #15 prototype, not measured on hardware.
 */
function armTokens(wall: ReturnType<typeof buildWallTokens>): ReturnType<typeof buildWallTokens> {
  return {
    ...wall,
    font: { ...wall.font, hero: 72, glanceXL: 40, glanceL: 26, glanceM: 19, body: 16, caption: 13 },
    layout: {
      ...wall.layout,
      // Sized against the wall's hero, which shrank.
      gateSlab: 84,
      // The icon's inset from the slab's edge, which the name is padded clear
      // of on both sides (GateSlab.tsx). At the wall's 34 a phone-wide slab
      // left "Cancelletto" ~170 px and cut it off.
      gateInset: 14,
      // A phone row is two lines, the slider under the name (ToggleTile.tsx):
      // 64 px of slider plus a 28 px line plus the card's padding. A row
      // with no slider has only the first line, centred in the same height,
      // so the list keeps one rhythm.
      tileMaxH: 140,
      // The phone's footer wraps rather than scrolls (PhoneShell.tsx), and a
      // 420 px floor is wider than the phone.
      mediaBarMinW: 0,
    },
  };
}

function buildWallTokens() {
  const c = CASA.color;
  return {
    /**
     * Casa Panel's palette under its own names, then ADR-0001's names for the
     * same roles, so components written against them read Casa values. New
     * code uses the Casa names; the old ones go as the components are ported.
     */
    color: {
      ...c,
      /** the page itself */
      ground: c.bg,
      /** a raised element on a card: a button, a well */
      surfaceRaised: c.surfaceWell,
      /** an on tile: lit, not filled -- the accent is kept for the glyph */
      active: c.litSurface,
      onActive: c.ink,
      /** a filled control that is on */
      activeStrong: c.accent,
      onActiveStrong: c.onAccent,
      textPrimary: c.ink,
      textSecondary: c.inkMuted,
      /** unavailable: never hidden, always visibly faulted */
      fault: c.alert,
      faultSurface: c.alertSurface,
      faultLine: c.alertLine,
      border: c.line,
      /**
       * Dims the panel behind a modal, so the dialog reads as the focus. Not a
       * design system token: Casa Panel has no overlay, so this is its ground
       * at ADR-0001's 72%.
       */
      backdrop: withAlpha(c.bg, 0.72),
    },
    /**
     * Sizes that place things -- the font sizes below, `space`'s named steps,
     * `touch` and `layout` -- keep the values the current frame was measured
     * against (`npm run measure`), so restyling onto Casa Panel moves no
     * Region. The frame (`Panel.tsx`, #41) has taken up Casa's numbered
     * `space` and `size`; the components inside it follow as they are ported.
     */
    type: CASA.type,
    size: CASA.size,
    /**
     * Two tiers, per the tablet research: glanceable content must read at 1-2 m,
     * interactive content at 0.5-0.7 m.
     */
    font: {
      /**
       * Geist, loaded from Google Fonts with `display=swap` (index.html), over
       * the system stack: the panel boots offline-first, and a font request
       * that stalls must leave the house labelled in the fallback, not blank.
       */
      family: CASA.font.sans,
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
    space: { ...CASA.space, xs: 4, sm: 8, md: 14, lg: 22, xl: 34 },
    /** `tile` for every card, `sm` for a control inside one. */
    radius: { ...CASA.radius, sm: CASA.radius.control },
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
     * along the floor. #41 replaced the 2x2 with the design system's frame
     * -- status bar, body, floor -- sized by `size` above, not by these.
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
     * #13 agent's report for the harness output. Since #41 the wall's floor
     * is `size.dockHeight` (84); `footerH` is the phone's footer floor only.
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
     * `popupSlotW` (#28) is one slot of a Popup's bottom row, sized for a
     * `GateSlab`. Measured on the real app at 1280x800 and 1280x768 with
     * `page:citofono`'s three gates: at 403 px "Cancelletto" ellipsised
     * (218 px of name in 209); at 412, with the row's `md` padding and `sm`
     * gap, all three names fit whole. Barely -- a fourth gate, a longer name
     * or a wider gap brings the ellipsis back. `popupClose` is the Popup's
     * round close button (#24): over `touch.primary` because it is the only
     * way out, reached for from a step back.
     *
     * `feedThumbW` (#29) is the width of the camera Page's strip of
     * thumbnails beside the big Feed, as in variant B of the prototype:
     * 16:9 at 300 px is 169 px of picture, so two thumbnails and their
     * captions sit beside the big Feed at 1280x800 with room to spare.
     *
     * `tileMaxH` is the cap `Tile` puts on every card built on `CardBase`. A
     * Row's swipe wrapper (#27) takes the same cap, or it grows past the
     * card with the Region and the label it reveals shows below the row
     * (measured on the real app at 1280x800: 162 px wrapper, 100 px card).
     *
     * `mediaBarMinW` (#32) is the least `MediaBar` is squeezed to before the
     * footer scrolls sideways instead. Without a floor the strip, `flex: 1;
     * minWidth: 0`, gave way first and a busy footer crushed the transport
     * rather than scrolling: 32 icon + 3 x 44 buttons + gaps and padding is
     * 236 px before a single letter of the title. 420 leaves the title
     * about 180 px. `npm run measure`'s busy footer asserts it.
     */
    layout: {
      sidebarW: 420,
      rowRoom: 76,
      rowStrip: 96,
      gateSlab: 100,
      /** A GateSlab icon's inset from the slab's edge. */
      gateInset: 34,
      footerH: 64,
      popupSlotW: 412,
      popupClose: 80,
      feedThumbW: 300,
      tileMaxH: 100,
      mediaBarMinW: 420,
    },
  };
}

export type Tokens = ReturnType<typeof buildTokens>;
