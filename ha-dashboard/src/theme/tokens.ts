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

/**
 * Casa Panel's colours, dark. Dark is the default: the panel lives on a wall
 * and must not light up a room at night (`tokens.json`: "night, and any time
 * the room is dim").
 */
const DARK = (() => {
  const ink = '#f2f1ec';
  const accent = '#f5c15c';
  return {
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
  };
})();

/** One of Casa Panel's colour sets: every set names the same tokens. */
export type ColorSet = { readonly [K in keyof typeof DARK]: string };

/** A token's name in a colour set, `inkMuted` for `--ink-muted`. */
export type ColorName = keyof ColorSet;

/** Light or dark: which of a Theme's two sets of values is shown. */
export type ColorScheme = 'light' | 'dark';

/**
 * Casa Panel's colours, light: for daytime. The roles are the dark set's
 * (see each token there); only the values change, and `accent` deepens to an
 * amber that still reads as text on a light ground.
 */
const LIGHT: ColorSet = (() => {
  const ink = '#1a1b18';
  const accent = '#9a6210';
  return {
    bg: '#efeee9',
    surface: '#faf9f6',
    surfaceTile: '#ffffff',
    surfaceStatic: '#f5f4f0',
    surfaceWell: '#e9e8e2',
    surfaceControl: '#e6e5df',
    line: '#e2e1db',
    lineStrong: '#d3d2cb',
    lineTile: '#e4e3dd',
    ink,
    inkSoft: '#33342f',
    inkSecondary: '#4a4b45',
    inkMuted: '#65645e',
    inkFaint: '#6e6d67',
    accent,
    accentSoft: '#eaa93a99',
    onAccent: '#ffffff',
    litSurface: '#fbf1dc',
    litLine: '#ebd3a2',
    litInk: '#6b480d',
    switchOff: '#93928b',
    knobOff: '#ffffff',
    alert: '#a8341a',
    alertSurface: '#fce9e3',
    alertLine: '#f2c4b6',
    primary: ink,
    onPrimary: '#faf9f6',
    focus: accent,
  };
})();

/** Casa Panel's tokens, as `tokens.json` (version 1) has them. */
export const CASA = {
  /**
   * Two sets under the same names (#63), each with its references
   * (`primary` is `{ink}`, `focus` is `{accent}`) resolved within it. A
   * Theme (`themes.ts`) shows one or the other by its mode; code that reads
   * a set directly rather than the Theme's custom properties is not themed,
   * and takes `dark`.
   */
  color: { dark: DARK, light: LIGHT } as const satisfies Record<ColorScheme, ColorSet>,
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

/** A token's key as a custom property name: `surfaceTile` is `surface-tile`. */
export const kebab = (name: string | number) => String(name).replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);

/**
 * The tokens as CSS custom properties, under the design system's own names
 * (`--surface-tile`, `--radius-tile`, `--space-3`), so a stylesheet written
 * against its `tokens.css` reads them unchanged. Mounted on `:root` by
 * `HakitTheme`, in the dark set: the page outside a Dashboard is not themed.
 * A Dashboard's own Theme and mode override them inside it (`themeCss`).
 */
export function cssVariables(): string {
  return Object.entries(casaVariables())
    .map(([name, value]) => `--${name}: ${value};`)
    .join('\n');
}

/**
 * The same tokens as a record, custom property name (without `--`) to value,
 * plus each named type style as `type-<name>-size`, `-line`, `-weight` and
 * `-tracking`, in one of the colour sets; everything but colour is the same
 * in both. The document's themes (`themes.ts`) are built from it.
 */
export function casaVariables(scheme: ColorScheme = 'dark'): Record<string, string> {
  const px = (group: string, values: Record<string | number, number>) =>
    Object.entries(values).map(([k, v]) => [`${group}${kebab(k)}`, `${v}px`]);
  const type = Object.entries(CASA.type).flatMap(([name, s]) => [
    [`type-${kebab(name)}-size`, `${s.size}px`],
    [`type-${kebab(name)}-line`, typeof s.lineHeight === 'number' ? String(s.lineHeight) : s.lineHeight],
    [`type-${kebab(name)}-weight`, String(s.weight)],
    [`type-${kebab(name)}-tracking`, s.letterSpacing],
  ]);
  return Object.fromEntries([
    ...Object.entries(CASA.color[scheme]).map(([k, v]) => [kebab(k), v]),
    ['font-sans', CASA.font.sans],
    ...px('space-', CASA.space),
    ...px('radius-', CASA.radius),
    ...px('', CASA.size),
    ...type,
  ]);
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
 * The phone's sizes, as changes to the wall's. Only size changes; colour
 * does not, and touch sizing only grows (a thumb is not smaller than a
 * finger at a wall).
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
    // The one touch size that moves, and it grows (#45): the ADR-0001 floor
    // of 44 predates Casa Panel, whose `target-min` is 52, and the phone's
    // restyle was done when every target on it reached 52. The wall's
    // controls still at 44 (a transport, a setpoint step) go when they are
    // ported, and the wall's measured fit with them.
    touch: { ...wall.touch, floor: CASA.size.targetMin },
    layout: {
      ...wall.layout,
      // A phone row is two lines, the slider under the name: 64 px of
      // slider plus a 28 px line plus the card's padding. A row with no
      // slider has only the first line, centred in the same height, so the
      // list keeps one rhythm.
      tileMaxH: 140,
      // A 420 px floor is wider than the phone.
      mediaBarMinW: 0,
    },
  };
}

function buildWallTokens() {
  // `t` (`ui/theme.ts`) holds values fixed at load, so it cannot follow a
  // Theme's mode: what reads it is not themed, and stays dark.
  const c = CASA.color.dark;
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
     * `touch` and `layout` -- keep the values the label-driven panel was
     * measured against, so restyling onto Casa Panel moved nothing. The
     * renderer's frame takes Casa's numbered `space` and `size`.
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
       * hardcodes a font size. Casa Panel's `temp-hero` since #44 (112
       * before); the phone keeps its own (`armTokens`).
       */
      hero: CASA.type.tempHero.size,
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
     * Sizes the components in `src/ui` share, measured on the wall at
     * 1280x800 when the label-driven panel was drawn with them.
     *
     *   rowRoom      the height of one Area row: a 64 px control plus padding
     *   footerH      a footer floor: exactly `touch.primary`, which is all a
     *                `MediaBar` needs to stay a full touch target
     *   popupClose   the round close button (#24): over `touch.primary`
     *                because it is the only way out, reached for from a step back
     *   tileMaxH     the cap `Tile` puts on every card built on `CardBase`
     *   mediaBarMinW (#32) the least `MediaBar` is squeezed to: 32 icon +
     *                3 x 44 buttons + gaps and padding is 236 px before a
     *                single letter of the title. 420 leaves the title about
     *                180 px.
     */
    layout: {
      rowRoom: 76,
      footerH: 64,
      popupClose: 80,
      tileMaxH: 100,
      mediaBarMinW: 420,
    },
  };
}

export type Tokens = ReturnType<typeof buildTokens>;
