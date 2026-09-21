---
status: accepted
---

# Design tokens are computed from a handful of knobs, not hand-picked

The Casa Carina panel is read from 1–2 m on a wall, and its palette is expected to change as the house does. So every colour, size and radius derives from a small `KNOBS` object in `src/theme/tokens.ts` — nothing downstream hardcodes a value — and the two foreground tokens **compute themselves from accent lightness** rather than being fixed. Retuning the accent is one edit, and it cannot silently produce unreadable text.

## Why the computed foregrounds

Chosen accent: `hsl(130 35% 30%)`, a dark green, dark-only theme. That broke two assumptions an earlier hand-picked palette had baked in, and both failures were invisible on screen until measured:

- A fixed near-black `onActive` scored **2.56:1** on the new accent, well under WCAG AA's 4.5:1. `onActive` now flips to light text below 50% accent lightness, scoring **6.27:1**.
- The accent alone is **2.96:1** against the page ground, under the 3:1 AA asks of UI components. A filled gate button — the panel's primary affordance — would have been hard to pick out at 2 m. Filled controls use `activeStrong`, floored at **42%** lightness, where ground separation (5.76:1) and its dark text (4.98:1) both clear AA.

The 42% floor is load-bearing, not taste: below it the colour sits in a band where **neither** light nor dark text reaches 4.5:1. Lowering it reintroduces the bug.

## Consequences

- Adding a colour means adding a derivation, not a hex value. This is the point.
- Icons are MDI (`@mdi/js` raw paths) rather than emoji, because MDI tints with `currentColor`: a fault icon turns red, an icon on an active surface takes the active foreground. Names mirror the HA area registry (`mdi:sofa`, `mdi:stove`), so the registry-driven pipeline resolves them rather than a hardcoded map.
- The type scale (112 px hero, 22 px row labels, 17 px body) is extrapolated from the tablet research's 1–2 m guidance and has **not** been validated on physical hardware. It is the most likely part of this ADR to need revising once a panel is mounted.

## Amendment (2026-09-21): the grid was never height-checked (#8)

The "4x2 grid of 303x180 tiles at 1280x800" above is superseded by
[ADR-0004](0004-home-screen-layout.md). The column figure is right — 303 px
divides 1280 exactly — but the row figure was never checked against the 800 px
height: `4 rows of 180 + gaps` fills only 402 px, and the first real screen
rendered with its bottom quarter empty and a third row it had not planned for.

The grid is now four rows of **deliberately unequal** height (180 / 227 / 227 /
96), because the panel has three jobs with different appetites and sizing the
rows to each other is what wasted the space. They are tokens like everything
else, so hardware revalidation stays a KNOBS edit.

The lesson generalises beyond this number: **a dimension derived for one axis
is not a layout.** Both axes have to be checked against the real viewport, and
the cheapest way to find out is to render it and measure.
