# ADR-0003: Screen-definition format

**Status:** superseded by [ADR-0005](0005-placement-protocol.md) (2026-09-22)
**Date:** 2026-09-21
**Ticket:** [#9](https://github.com/vallops99/homeassistant-frontend/issues/9)

> **Superseded.** Screens are gone. Layout is declared in Home Assistant with
> `page:` + `region:` labels and this repo holds none of it -- see
> [ADR-0005](0005-placement-protocol.md) and [the protocol](../protocol.md).
> The format below did what it was asked; the requirement changed. Read this
> ADR for *why* compiler-checked names were worth having, because ADR-0005
> gives them up knowingly and records what that costs.

## Context

Map Notes require "easily customizable" in a specific sense: *Valerio editing
TypeScript*, where swapping and moving components is an easy edit to typed
config — explicitly not a runtime drag-and-drop editor. That is an API design
problem, and it is the difference between a dashboard that stays malleable and
one that ossifies into hand-written JSX per screen.

ADR-0002 left a placeholder `Slot[]` behind, good enough to prove the
components composed, with the format itself deferred here.

The ticket set a concrete bar: the edits "move the kitchen tile above the
living room" and "swap the entrance tile from a light to a gate" must each be
a line or two. If either is more, the format is wrong.

### Three findings that reshaped the question

**@hakit's breakpoint props are already inert for us.** The ticket noted that
`CardBase` takes per-breakpoint spans (`AvailableQueries`: `xxs`…`xlg`, each a
1-12 `GridSpan`). It does — but our `Tile` passes `disableColumns`, which
exists precisely to "completely disable the automated column sizes". We opted
out in ADR-0002 so our own CSS Grid owns layout. Routing responsive spans
through @hakit would mean un-picking that decision and adopting a 12-column
system we do not otherwise use.

**The manifest can drive compiler-checked names.** `fake-house/manifest.yaml`
already declares the six Areas and six Labels as literals. Before this change,
`{ kind: 'room', area: 'salonee' }` was a silent no-op rendering nothing — a
typo found by noticing a gap on the wall panel.

**"Can the compiler reject a climate tile pointed at a light?" — not
usefully.** A Slot names an *Area*, never an entity; which entity fills it is
Derived at runtime from the `main` Label. The compiler cannot know Salone has
a climate entity, because that is a fact about the running house, not about
the code. The honest answer is a *runtime* fault tile.

## Decision

**Screens are a typed array of Slot objects**, `Screen = Slot[]`, in
`src/screens/`. A Slot is a discriminated union on `kind`.

### Slot kinds

| kind | places | contents |
| --- | --- | --- |
| `room` | one Area, collapsed to a tile | Derived from the Area's `main` light |
| `group` | every entity carrying a Label | Derived — a new gate appears with no code change |
| `single` | one entity from a Label, by index | Derived, but pinned to one cell |
| `status` | the house-wide status column | Derived from the first Area reporting a temperature |

`group` and `single` both exist deliberately. `group` keeps the backend-driven
rule — the house decides how many gates there are. `single` makes the ticket's
second test edit expressible: putting one specific thing in one specific cell.
With only `group`, that edit is impossible; with only `single`, adding a gate
in Home Assistant would need a code edit.

### Names are compiler-checked, generated from the manifest

`fake-house/scripts/generate-area-types.py` emits
`src/ha/generated/manifest.ts` with `KnownAreaId` and `KnownLabel` unions.
Committed, regenerated via `npm run gen:manifest`, and guarded against drift by
`--check`, which exits non-zero if the file is stale.

This does **not** make the frontend frontend-driven. Area *contents* are still
Derived from Home Assistant's registries at render (#3). Only the *names* are
mirrored, and only because they are fixed by the house rather than by what is
plugged in.

`KnownLabel` is distinct from `Label` in `types.ts`, which stays open
(`string & {}`). An `Entity` may carry any label a user adds in Home
Assistant and the frontend must tolerate that; a *screen composing with* a
label that does not exist is a bug.

### Spans carry breakpoints now, phone is optional

```ts
type Span = {
  tablet: { col: number; row: number };
  phone?: { col: number; row: number };
};
```

The shape exists up front so the phone view is a fill-in-the-blank rather than
a type change. `phone` is optional and falls back to `tablet`: the phone
layout has had no design work, so a slot that omits it inherits rather than
carrying an invented number.

These are CSS Grid spans, not @hakit's `AvailableQueries` — see the finding
above.

### A mis-composed screen renders a visible fault

A slot naming something absent renders `FaultTile`, not nothing. This extends
the map's rule that a real fault must be visible to whoever is standing at the
panel: an empty cell looks like a design choice, a red tile does not.

`FaultTile` is deliberately **not** built on `Tile`. It stands for the absence
of an entity, and `CardBase` validates its `entity` prop against the live
registry — a synthetic id throws "entity not found" and takes the tile's grid
placement with it. This was found by rendering the fault path, not by reading.

## Consequences

**The two test edits are each one line**, both verified:

```diff
# move a tile
-  { kind: 'room', area: 'salone', icon: 'mdi:sofa' },
   { kind: 'room', area: 'camera_chri', icon: 'mdi:bed' },
+  { kind: 'room', area: 'salone', icon: 'mdi:sofa' },

# swap a tile from a light to a gate
-  { kind: 'room', area: 'ingresso', icon: 'mdi:door-open' },
+  { kind: 'single', label: 'gate' },
```

**Five classes of mistake now fail `tsc`**, each verified by injection:

| mistake | error |
| --- | --- |
| `area: 'salonee'` | `TS2820 … Did you mean '"salone"'?` |
| `label: 'gaet'` | `TS2322 Type '"gaet"' is not assignable to type 'KnownLabel'` |
| `kind: 'sttaus'` | `TS2820 … Did you mean '"status"'?` |
| `area` on a `group` slot | `TS2353 'area' does not exist in type …` |
| `span` missing `tablet` | `TS2741 Property 'tablet' is missing` |

**Adding a Slot kind is a compile-time checklist.** The union and the `switch`
in `ScreenView.tsx` must agree, so a new kind cannot be half-wired.

**The manifest gains a second consumer.** It already generated Home Assistant
packages; it now also generates frontend types. Editing `areas` or `labels`
without regenerating is caught by `--check` rather than surfacing as a typo
that still compiles.

**Rendering rules live in one file.** `ScreenView.tsx` is the only place that
knows how a `kind` becomes a component. Entities placed by Label are currently
routed by Domain, and only `lock` has a component — everything else renders a
fault tile naming the missing Domain. That is ADR-0002's un-wrapped rich domain
cards showing up honestly rather than as blank cells.

**The phone view will need a decision this ADR does not make.** Whether the
phone layout is a re-span of the tablet screen or a separate composition is
open; the optional `phone` span assumes the former is at least sometimes
enough. If it turns out phone is a genuinely different screen, a second
`Screen` array is the escape hatch and costs nothing already built.
