---
status: accepted
---

# @hakit is confined to two directories, enforced by lint

Every Home Assistant concern enters through `src/ha/`, every pixel through
`src/ui/`. Screens import from those two barrels and never from `@hakit`
directly. A lint rule fails the build if they try.

## Why the seam is not optional

@hakit's licence is proprietary, and clause 1 prohibits **modification** as
well as redistribution and sub-licensing. That removes every remedy short of
replacement: we cannot vendor the source, patch a bug, or fork it if it is
abandoned. Combined with a single maintainer and no release since 2026-03-02
(~6.5 months at the time of writing), the realistic failure mode is "@hakit
stops working against a future Home Assistant release and cannot legally be
fixed."

So the question was never whether to wrap, but how much. We wrap everything:
a @hakit failure is then a rewrite of `src/ha/` and `src/ui/` internals, with
every screen and every component signature untouched.

## What made wrapping everything affordable

Two findings, both from reading the shipped types rather than the docs:

- **`CardBase` accepts `onlyFunctionality`**, which strips its styling and
  keeps its behaviour. We inherit long-press-to-modal, ripples and press
  scaling -- the expensive parts to reimplement -- while our tokens own every
  pixel. Without this, "wrap everything" would have meant rebuilding the modal.
- **`EntityName` degrades to `` `${AllDomains}.${string}` ``** when no types
  are synced. It is a structural template type, not a nominal brand, so our own
  types use plain `string` and widen cleanly. The seam does not fight the
  compiler.

The ticket's premise that we would need a `useLightBrightness` hook was wrong;
no such hook exists. `useEntity` returns `HassEntityWithService`, and the
whole-house state map is available in one store subscription via
`useHass(s => s.entities)` -- which is what `src/ha/registry.ts` uses, because
a hook per tile would mean a subscription per tile.

## Amendment (2026-09-21): @hakit's own surfaces

`onlyFunctionality` means our tokens own every pixel *we* render — but @hakit
also renders surfaces we never author. The long-press entity modal is mounted
into `<body>` by @hakit itself, and it came up in stock navy-and-orange with
Roboto over our dark-neutral green panel. The original verification checked
that the modal *opens*, never what it looked like.

Two corrections, both in `src/ui/` so the seam holds:

- **`HakitTheme.tsx`** drives `ThemeProvider` from our tokens. @hakit derives
  its whole ~700-variable palette from a few roots (`--ha-h/s/l` plus the `A`
  scale), so overriding those retints everything downstream instead of
  restyling components one at a time. What the roots cannot reach is corrected
  in `globalStyles`, keyed to @hakit's own class names.

- **`stateLabel.ts`** supplies Italian state text. @hakit renders the modal's
  headline as `startCase(lowerCase(state))` — the raw state, title-cased,
  never passed through its own `localize`, so a locked gate read "Locked"
  while the tile beneath said "Chiuso". Setting `options={{ locale: 'it' }}`
  on `HassConnect` fixes @hakit's *own* strings ("Mostra attributi", "58
  minuti fa") but not this one. The modal accepts a `stateTitle` that takes
  precedence, so the seam supplies it, and tiles read from the same table —
  a state is worded once and the modal cannot disagree with the tile that
  opened it.

The general lesson for the seam: wrapping a component controls what *it*
renders, not what it *mounts elsewhere*. Any future @hakit component that
portals to `<body>` needs the same treatment, and a visual check rather than
an "it opens" check.

## Consequences

- **`@iconify/react` is now a direct dependency.** It was transitive through
  @hakit; leaving it that way meant our icons would break for an unrelated
  reason if @hakit were removed.
- **The room tile is ours, not @hakit's.** `ButtonCard` has no slider prop, so
  the reference pattern (name, temperature, inline brightness) is `Tile` +
  `Slider` composed by us. Pressing the body toggles the Area's Aggregate; the
  slider is always visible, because a panel glanced at from 2 m should not
  change shape as the house changes state.
- **The slider is 64 px, not its default 44 px.** Measured in the browser: at
  44 px it sat under ADR-0001's primary touch target, with a 121 px tile-toggle
  zone above it -- an easy accidental blackout on a wall panel. It now takes the
  full `touch.primary`, leaving 101 px for the toggle.
- **`ControlSlider` has an intrinsic width that ignores its container** (~320 px
  regardless), so `Slider` wraps it in a constrained box. Found by measuring,
  not by reading.
- **Rich domain cards are not yet wrapped.** `ClimateCard`, `MediaPlayerCard`,
  `AlarmCard` and `CameraCard` have no wrapper because no screen uses one yet.
  Each must gain one in `src/ui/` when its view is built; the lint rule makes
  skipping that a build failure rather than an oversight.
