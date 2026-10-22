# ADR-0004: The home screen is four unequal rows, and the glance layer is a verdict

**Status:** layout superseded by [ADR-0005](0005-placement-protocol.md) (2026-09-22); its findings stand
**Date:** 2026-09-21
**Ticket:** [#8](https://github.com/vallops99/OHomeMy/issues/8)

> **The region model is superseded twice over.** The four-row grid below was
> reverted to variant D by the amendment at the foot of this file; variant D's
> two intrinsically-sized columns are in turn superseded by
> [ADR-0005](0005-placement-protocol.md)'s 2x2, whose regions are declared in
> Home Assistant rather than composed here.
>
> **What this ADR found still holds**: `houseReport`'s ranking and its rule
> that a fault must not silence an open gate; temperature from a `climate`
> entity rather than a `temperature` sensor scan; a fault being reportable only
> if the dashboard renders the thing at all; cameras as a motion glance and
> media as contextual. Those are about the house, not about the layout.

## Context

The panel hangs at the entrance and is used while arriving or leaving, so
"is the house okay?" and the few most-touched controls must be answerable in
about five seconds, standing, without navigating.

ADR-0001 specified a "4x2 grid of 303x180 tiles at 1280x800". Measured on the
running panel, that grid filled **402 px of the available 800** and the
rendered screen ended at 582 px — the bottom quarter of the panel was empty
and the content had already spilled onto an unplanned third row. The 303 px
column divides 1280 exactly; the 180 px row was never checked against 800.

That is the whole reason the ticket's content did not fit. The budget was not
8 cells, and the missing pieces — alarm, cameras, media, navigation — had
nowhere to go.

## Decision

### Four rows, sized to their jobs

```
row 1  180 px   the glance layer, read from 2 m
row 2  227 px   the arriving row: gates and the rooms you walk into
row 3  227 px   the rest of the house, and what the cameras see
row 4   96 px   media and navigation
```

`14 + (180 + 227 + 227 + 96) + 4 gaps of 14 = 800` exactly. The rows are
**not uniform**, because the panel has three jobs with different appetites and
sizing them to each other is what wasted half the screen. They live in
`theme/tokens.ts` as `rowStatus` / `rowTile` / `rowStrip`, so revalidating on
real hardware stays a KNOBS edit.

Sixteen cells, all sixteen used, nothing dropped.

### The glance layer is a verdict, not a reading

The old status panel put the temperature at `glanceXL` and the house's state
in a footnote — the least actionable number in the largest type. It now leads
with a **verdict** computed in `src/ha/health.ts`, ranked by what would stop
someone leaving:

1. `fault` — something Home Assistant cannot reach (the panel cannot vouch
   for a house it cannot fully see)
2. `open` — a door, window or gate standing open
3. `on` — a zone left lit
4. `ok` — nothing to report

Colour carries the verdict as well as the words, so it reads from further
away than the text does.

**A fault does not silence the rest.** `houseReport` returns the verdict plus
any lower-ranked concern still worth stating, because someone reading "un
guasto" and walking away would leave the gate open. Only "lights are on" is
dropped once something louder is already reported — that is normal in an
occupied house.

### Two faults found by building it

**The house temperature was an Amazon Echo's chip.** `StatusSlot` scanned for
the first `temperature` sensor and found `sensor.echo_di_christian_temperatura`
— a speaker's internal self-heating — and put 21.5° on the wall as the house
reading while the thermostat said 20.5°. Temperature now comes from a
`climate` entity's `current_temperature`: the one Domain that *means* "the
temperature here". Device class is not intent.

**"10 guasti" about nothing.** Counting every unavailable entity swept in
Home Assistant's own housekeeping — backup timestamps that have never run, an
unlocated `person`, an idle `tts` engine. A fault is now reportable only if
the dashboard renders the thing at all: not a `NEVER_FAULT` domain, and
either in an Area or carrying a Label. Ten became two, both genuine.

### Gates are ranked, not duplicated

Both gates were identical slabs, so reaching for "the gate" meant reading two
labels. The `gates` slot takes a `primary` index and that gate gets the larger
icon and type. Both keep a full-size touch target — the hierarchy is weight,
not size. Ranking by position rather than by entity id keeps it backend-driven:
the house still decides how many gates exist.

### Cameras are a motion glance, not a video wall

Streaming is unresolved (bandwidth, latency, hls.js on a wall panel) and the
fakes are still images, so streaming UX cannot be judged yet. What *can* be
answered now is "has anything moved outside?", and the cameras' motion sensors
answer it without a single pixel of video.

### Media is contextual; navigation admits what is not built

Seven media players, idle most of the time — a persistent transport would
spend its life showing "nothing playing" on a panel whose premise is that
every pixel answers something. The strip shows whatever is actually playing
and says so quietly when nothing is.

Navigation is a **bottom bar**: a gesture has no affordance on a wall, and
drill-in would overload tiles whose press already toggles a light. None of the
four destinations (Clima, Sicurezza, Media, Servizi) has a view yet, so each
renders **visibly disabled**. A dead control that looks live is worse than one
that admits it is not there.

### Room tiles earned their new height

At 227 px the tiles had an empty band between title and slider. `AreaBadges`
fills it with what the Area is doing — a door open, motion, the thermostat,
something playing — entirely Derived from Domain and `device_class`, capped at
three so the tile stays readable at 2 m. A quiet room shows none.

## Consequences

- **A fifth filter joined the seam.** `entity_category` (`config` /
  `diagnostic`) is Home Assistant's own marker for plumbing — firmware
  buttons, restart switches, the sun integration's six diagnostic timestamps.
  Honouring it means the denylist does not grow a rule per integration.
- **`hidden` cannot be honoured.** Home Assistant sends the display registry
  compressed and @hakit does not re-expand `hn`, so an entity hidden in Home
  Assistant's own UI still reaches us. The `ignored` Label is the working
  equivalent. Verified against the running instance — the compressed
  spellings (`ei`, `ai`, `lb`) match nothing on our side either.
- **The format absorbed all of it.** Five new `kind`s (`gates`, `alarm`,
  `cameras`, `media`, `nav`) and no new JSX in a screen: `home.ts` is still a
  list of placements. ADR-0003's shape held under the first real screen.
- **Esterno is deliberately not a `room`.** It has no light, so a RoomTile
  there would render an empty control. It is on the panel as its gates and its
  cameras, which is what that Area actually is.
- **The type scale is still unvalidated on hardware.** It now runs on real
  tiles at 1280x800, which pins the layout, but touch sizing has already needed
  one correction from measurement (the slider, 44 → 64 px) and type is likely
  to need the same once a panel is mounted.
- **The ambient/idle state is not built.** The ticket lists it; wake-on-approach
  is a #2 concern and there is no hardware to wake. Left as fog.

## Amendment (2026-09-22): the grid superseded variant D without arguing it

The layout decided above is reverted. The panel is variant D — the layout
[#6](https://github.com/vallops99/OHomeMy/issues/6) chose after
building and judging four candidates at 1280x800 — and this ADR's four-row
grid is superseded.

### What happened

#6 closed by choosing variant D, "Arrivo calmo": a 420 px sidebar (hero
temperature, stats, fault chips, gate slabs) beside a column of full-width
room **rows**. It recorded two rejections that matter here:

- **Variant A was rejected for being a room grid** — "closest to the
  reference image, but ~250 px of dead vertical space".
- **Variant B as originally built was rejected** because "a bordered card
  flooded red for one unreachable light", and D's outline **fault chip** was
  the fix.

This ADR then built a room grid whose glance layer was a bordered card that
floods red. Both rejected forms came back. Neither this ADR nor #8 mentions
variant D anywhere: the reversal was never argued, it happened by omission
while fixing a real and separate bug — the 402 px grid that filled half the
panel. D was drawn before the alarm, cameras, media strip and nav bar
existed, so nothing in it contradicted the new components; it simply was not
consulted.

The lesson is narrow and worth stating: **a decision recorded only in a
closed ticket is a decision that can be lost.** The grid arithmetic lived in
an ADR and survived; the layout choice lived in #6's closing comment and did
not. What is chosen deserves the same durability as what is computed.

### What is kept from this ADR

The reversal is of the *layout*, not of what building it found. All of this
survives:

- **`houseReport`'s ranking** (`fault > open > lit > ok`), unchanged, and its
  rule that a fault must not silence an open gate. Only the *presentation*
  returns to D: the verdict renders as chips, and `also` concerns render as
  further chips.
- **The temperature comes from a `climate` entity's `current_temperature`.**
  The room rows initially reintroduced the Echo bug — a naive scan for a
  `temperature` sensor put an Amazon Echo's self-heating chip on the wall as
  Camera Chri's reading. `RoomRow` now prefers a thermostat, and the Echo
  sensor finally carries the `ignored` Label its own manifest section claimed
  for it.
- **The fault-counting rule**: a fault is reportable only if the dashboard
  renders the thing at all.
- **Cameras as a motion glance, media as contextual, nav as a bottom bar**
  with visibly-disabled destinations. D's sketch had four *static* shortcuts
  there; those were a placeholder drawn before the live components existed,
  not a decision against them. The live components are placed into D's
  regions instead — `CameraGlance` filling what #6 explicitly left as dead
  space in the sidebar.

### What the panel gives up

**Sixteen cells that summed to 800 px exactly.** The grid's four unequal rows
were arithmetic: `14 + (180+227+227+96) + 4 gaps = 800`, provable without
rendering. D's regions size intrinsically, so fit is now a thing to measure.
That trade was made knowingly, and the measurement was done: the panel fills
1280x800 with no scroll in either axis, and the room rows share the column by
`flex: 1` above a `t.layout.rowRoom` floor, so a sixth Area shrinks the rows
(124 → 102 px, verified) rather than pushing the strip off a panel that
cannot scroll.

### ADR-0003 is narrowed

`Span` no longer carries a `row`, and it appears only on the slot kinds that
sit in the bottom strip — the one part of the panel that tiles. The sidebar
and the room list are flows, so a `span` there would be a field that lies.
The `phone` fallback survives unchanged, still unexercised.

`Slot` gains a required `region`. A flat `Slot[]` with a tag was chosen over
a nested `{ sidebar: [], main: [] }` so ADR-0003's edits all still hold:
moving a row is moving a line, and moving something between columns is
changing one word.

### Three faults found by building it, again

- **@hakit nests children three levels deep.** `CardBase` renders
  `.ripple-parent` → `.ripple-inner` → `.contents`, and it is `.contents`
  that holds the children. Styling the card alone left every row's contents
  stacked vertically inside a horizontal row. The nesting is not in @hakit's
  types; it was found by walking the rendered DOM. `Tile` now takes a named
  `row` shape rather than leaving callers to fight the emotion class with
  inline styles — which cannot win, silently.
- **A `Tile` with no entity crashed the panel.** @hakit's `unknown` sentinel
  is documented as a no-op, but `CardBase` still mounts a modal subtree that
  throws on `null.state`, and `disableModal` does not prevent the mount.
  `Tile` now renders the surface itself when there is no entity. Found by
  placing a `room` slot on Esterno, which has no light — something this ADR
  says not to do, but which should render a quiet row rather than take the
  wall panel down.
- **The seam's rule held under both.** Every fix landed in `src/ui/`; no
  screen changed, and nothing above the seam learned that @hakit has a
  `.contents` div.
