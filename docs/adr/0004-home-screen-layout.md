# ADR-0004: The home screen is four unequal rows, and the glance layer is a verdict

**Status:** accepted
**Date:** 2026-09-21
**Ticket:** [#8](https://github.com/vallops99/homeassistant-frontend/issues/8)

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
