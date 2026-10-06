---
status: superseded by ADR-0015
---

# The left column fits, and a committed harness proves it

`glance` holds its measured height and never scrolls; `entities-left` is the
region that yields, scrolling only when a house has placed more into it than
fits, and admitting it with a fade at its bottom edge. The Hero's box is the
size of its ink. `ChipRow` is bounded to one line. `t.layout.gateSlab` is 120
and `GateSlab.tsx` finally reads it. And the measurement behind every one of
those numbers is a committed script — `ha-dashboard/scripts/measure-panel.ts`,
`npm run measure` — rather than a claim in a comment.

## Context

A screenshot of the running panel showed "0 LUCI ACCESE / 320 W CONSUMO"
sliced horizontally by the top edge of the Cancello slab, and the camera
glance crowded beneath it. The left column did not fit.

That is the fourth layout defect in this column found the same way: by a human
looking at the screen. What makes it worth an ADR rather than a fix is that
each of the previous three was closed by a change whose comment says it was
**measured**. `theme/tokens.ts`, `Panel.tsx` and `PlacementView.tsx` between
them carry several hundred words of careful measurement reasoning — `footerH`
"measured down to exactly `touch.primary`", `chipRowFloor` read off "the
rendered 'Un guasto' chip at 1280x800", the Hero's line-height "measured in
0.01 steps". The reasoning is unusually good. It is also, in two places,
provably wrong, and nothing in the repo could have told anyone that.

`playwright-core` has been a devDependency throughout. There was no committed
harness. Every one of those measurements came from a throwaway script that no
longer exists, so no claim could be re-run, re-checked, or regression-tested.
That is the actual defect this ADR is about; the sliced `Stats` is a symptom.

## What was wrong

### The Hero was lying about its height

`Hero.tsx` set `lineHeight: 1.15` and then pulled 26 px back off with
`marginTop: -13; marginBottom: -13`. Its comment explains why at length, and
the explanation is wrong. It claims the 1.15 line box is mostly empty reserve
— "blank font metrics costing the panel a real scrollbar" — and that the
margins reclaim space the glyphs do not use.

Measured: a `Range` over the element's own text is **130 px of ink in a
128.8 px box**, flush at both edges (1 px above, 0.2 px below). There is no
empty reserve. The negative margins were not reclaiming dead space; they made
the element *claim* 103 px while painting 129, so 26 px of the number rendered
outside its own box and over whatever sat next to it. At 1280x768 that was
`Stats`.

The comment's own history records the motive: 1.15 alone "pushed `Stats` behind
a scroll at 1280x800." So the trick existed to hide a fit problem, and `Stats`
was the casualty either way.

### `gateSlab` was dead, and wrong by 60 px

`tokens.ts` carried `layout.gateSlab: 96`. **Nothing read it.** `GateSlab.tsx`
computed its own height locally — `ICON + 40 + 24 + 2 * 4 + 2 * 14` = **156** —
so the token ADR-0001 designates as the single source of sizing disagreed with
the rendered slab by 60 px, unnoticed, for the life of the file. Every budget
comment that reasoned about "two `GateSlab`s" in the column was reasoning about
a slab that does not exist.

### The degradation was continuous, so nothing announced it

`Panel.tsx` gave `glance` `flex: 1; minHeight: 0` and pinned `entities-left`,
on the stated reasoning that "the gates are the primary affordance and must
never be the thing that shrinks or clips to make room for a chip." The ranking
was right. The mechanism was not: a flexible `glance` compresses a little at
*every* viewport, so the column was always silently degrading and only became
visible when it degraded far enough to slice something in half.

`GlanceView` then made that block a scroller with y-snapping, and its own
comment admits the fallback scroll "engages at **every one of the three
acceptance viewports**." A safety net that always fires is not a safety net;
it is a layout that does not fit, wearing a scrollbar as a disguise. And a
`glance` you have to drag into view contradicts what `glance` is for
(CONTEXT.md: the Verdict, read on approach from 2 m).

## The decisions

### 1. The left column does not scroll; `entities-left` is what yields

`glance` is pinned (`flex: '0 0 auto'`) and takes exactly what its contents
need. `entities-left` takes the column's spare room and the job of yielding:
`flex: '0 1 auto'` with `overflowY: auto`, so it is at full size whenever the
column can afford it — which, with the fixture's content, is always — and
becomes a scroller only when a house places more into it than fits.

**This reverses `Panel.tsx`'s stated rule, deliberately.** The gates were
pinned because they are the primary affordance, and that remains true; what
changed is the shape of the failure. The old rule degraded continuously and
invisibly. This one does not degrade at all until something has to, and then
exactly one named region does, visibly. In the overflow case a gate can end up
below the fold — the cost of this decision, accepted because it follows a
deliberate act (a house-editor adding a card) with a visible consequence,
rather than appearing unbidden at a viewport nobody tested.

### 2. Shrink first, then scroll: `gateSlab` is 120

With an honest Hero the glance block needs 274 px. Measured, the largest slab
that still fits at 1280x768 is **128** — with 8 px to spare. **120** leaves
24 px at 768 and 56 px at 800.

120 over 128 because a fit with single-digit slack is one longer gate name away
from being the next defect, and this column has now produced four. Both clear
`touch.primary` (64) comfortably. `GateSlab.tsx` reads the token; `SLAB_MIN` is
deleted.

### 3. The Hero's box is its ink

The negative margins are gone. `lineHeight: 1.15` (the lowest value that
reports no overflow: 0.92 → 13 px over, 1.0 → 9, 1.1 → 3, 1.13 → 1, 1.15 → 0),
`fontSize: 112` untouched — "Arrivo calmo" (ADR-0001, #6) reads exactly as
large as it always did. The 26 px it costs is paid out of decision 2, not by
lying about the element's height.

### 4. `ChipRow` is bounded to one line

The chip row was `flexWrap: 'wrap'`, which made it the one element in the
column whose height was a function of *house state*: a third and fourth concern
wrapped it to a second line and pushed everything below it down. No fit could
ever be proven at build time, because the column's height depended on how many
things were wrong with the house at the moment someone looked.

It is now a fixed `chipRowFloor` box scrolling horizontally, with per-chip
snapping. What yields is horizontal, and that is safe because of the ordering
the component already guarantees: `report.verdict` leads, worst concern first
(ADR-0004's `fault > open > lit > ok`), so the chip that scrolls out of view is
always the least urgent one. The fault chip is never the one that goes.

### 5. The fade, because a scrollbar is not an affordance here

When `entities-left` actually has more below, it gets a `mask-image` fade at
its bottom edge. Fully Kiosk hides scrollbars, and at 2 m a 4 px track is
invisible anyway — so a gate cut off by an unannounced scroll boundary is
content that exists with no sign that it does. That is the deleted
`NavBar.tsx`'s own principle, quoted twice in ADR-0006: *"a dead control that
looks live is worse than one that admits it is not there."*

Conditional, via a `ResizeObserver`, never permanent: a fade over a column that
fits would be the same lie pointing the other way. An observer rather than a
one-off read because what makes this overflow is a change in *content* — a
house adding a card — not in viewport.

### 6. The measurement is committed

`ha-dashboard/scripts/measure-panel.ts`, run with `npm run measure`, asserts
two properties at 1280x768 (the supported floor) and 1280x800 (the panel's
native size):

1. **Nothing in the left column scrolls**, except `entities-left`, which is
   the region that yields by design.
2. **No two vertically stacked siblings overlap** — which is what catches ink
   pulled outside its own box, and what a `scrollHeight` probe alone is blind
   to. The old harness (per the comments) checked only `scrollHeight >
   clientHeight`, a condition a deliberate scroller satisfies by construction
   and which therefore could not have failed on this defect.

Stated as a property of every viewport at or above the floor rather than a list
of samples: a fit proven on samples and broken between them is exactly how this
defect reached the wall. It was verified to fail — reintroducing the Hero's
negative margins produces `#hero-number paints 5.0px over div.` at both
viewports — and to pass the overflow case: adding a third card to
`entities-left` leaves `glance` at its full 274 px while `entities-left` needs
468 and gets 356, i.e. it scrolls, and nothing else breaks.

`flake.nix` gains `pkgs.chromium` and exports `CHROME`. Playwright's own
bundled Chromium cannot run on NixOS (it dies on `libglib-2.0.so.0`) and the
system Firefox lacks Playwright's Juggler protocol, so previous sessions each
re-derived a bare `/nix/store/...` path by hand and lost it again. A committed
test whose browser is not also committed is a test nobody can run.

## What is given up, deliberately

**A gate can be below the fold** (decision 1), in a house that has placed more
in `entities-left` than the column holds. The fade says so. The alternative —
the old rule — kept the gates always visible by compressing the Verdict a
little at every viewport, which is how `Stats` ended up sliced.

**A chip can be off the right edge** (decision 4), in a house with more
concerns than fit one line. Worst-first ordering means it is always the least
urgent one, and the row snaps per chip so a chip is either fully readable or
fully scrolled to, never half-drawn.

**8 px of gate slab** (decision 2), spent on headroom rather than presence.

## What the harness does not cover

It measures a **faithful static reproduction** of the left column, not the
running app, because the app needs a live Home Assistant (`VITE_HA_URL`) and a
layout check should not depend on the house being up. Every *size* in it comes
from `buildTokens()`, so a token change moves the harness with it — but a
component that changes its own internal structure can drift from what is
asserted here without failing. If the column's structure changes, update the
harness markup in the same commit. Driving the real app against the
`fake-house` fixture is the honest upgrade, and is worth doing when the fixture
can be served without a live Home Assistant.

## Consequences

- `Panel.tsx`: `glance` pinned, `entities-left` yields and scrolls, fade via
  `useHasMoreBelow`. Its left-column comment, which stated the opposite rule,
  is rewritten rather than amended — the old reasoning is recorded here.
- `PlacementView.tsx`'s `GlanceView` is no longer a scroller: no `overflowY`,
  no y-snapping, no per-child snap alignment. The Hero → ChipRow → Stats order
  introduced for the scroll is kept, now on the plain grounds that the chip
  saying something is wrong belongs under the number you read on approach.
- `Hero.tsx`: negative margins deleted, with the corrected reasoning in place
  of the old.
- `ChipRow.tsx`: one line, horizontal scroll, chips hold their size.
- `GateSlab.tsx`: `SLAB_MIN` deleted, reads `t.layout.gateSlab`.
- `tokens.ts`: `gateSlab` 96 → 120, with the dead-token history recorded.
- `package.json` gains `measure`; `flake.nix` gains `pkgs.chromium` and
  `CHROME`.
- **ADR-0004's amendment is restated once more, and sharpened.** "Fit is
  measured, not added up" was right and was followed; it was not enough,
  because a measurement nobody can re-run is indistinguishable from a guess
  the moment the code around it changes. The rule this ADR adds: a sizing
  claim in a comment must name the committed check that verifies it.

## Amendment (2026-10-05): Casa Panel's column, and what "ink" means (#44)

The column this ADR measured is gone, and its figures with it: since
[ADR-0013](0013-casa-panel-replaces-the-computed-palette.md) it is 380 px
wide, the gates are `AccessRow`s in the Accessi card (201 px for two;
`gateSlab` no longer sizes anything in it), the chips are in the status bar
rather than the column, and the camera glance is a chip there too. The glance
block is the Hero over two StatCards: 315 px, with 16 px to spare at 1280x768
(`npm run measure`). The decisions stand -- `glance` pinned, `left` yields,
the measurement committed.

Decision 3 does not, as worded. The Hero is now Casa Panel's `temp-hero`:
144 px, weight 200, **line-height 1**, which `scrollHeight` reports as 21 px
over its 144 px box. That is not ink. A `Range` over the text measures the
font's content area -- ascent plus descent, about 1.15 em -- and so does
`scrollHeight`; the "130 px of ink in a 128.8 px box" above was that box, not
the glyphs. The glyphs of a temperature, measured from the baseline with
canvas `TextMetrics`, sit at least 18 px inside the box at both edges. What
the negative margins did was still a defect: they made the box smaller than
the glyphs. What `measure` asserts now is the property that matters --
the Hero's *glyphs* stay inside its box, for the reading shown and for the
tallest a temperature can be -- and the rest of the column keeps the
`scrollHeight` rule.
