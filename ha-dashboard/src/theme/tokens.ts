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
    /** 4x2 grid of 303x180 tiles at 1280x800 (research §2.4) */
    grid: { cols: 4, rows: 2, tileW: 303, tileH: 180 },
  };
}

export type Tokens = ReturnType<typeof buildTokens>;
