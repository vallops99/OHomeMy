/**
 * Region-determines-shape: the dispatcher docs/protocol.md calls "the rule
 * that makes the protocol more than addressing" (#13).
 *
 * `usePage` (`src/ha/placement.ts`) already resolves a Page into its four
 * Regions' ordered `Placed[]` -- it says *what* is in each Region, in what
 * order, and nothing about how it looks. This file is the other half: given
 * a `Placed` and the Region it came from, decide the component. The same
 * Area renders as a `RoomRow` in `entities-left`/`entities-right` and as a
 * tappable Page-opener in `footer` -- CONTEXT.md's "Rendering contract" --
 * because the Region, not the kind of thing, decides the shape.
 *
 * This lives in `src/ui/`, not `src/ha/`, because it imports components
 * (`RoomRow`, `GateSlab`, ...) and makes component-selection judgement calls;
 * `placement.ts` stays free of JSX and of every one of these decisions.
 *
 * ## Per-Region rendering contracts
 *
 * `entities-left` / `entities-right`:
 *   - an Area -> `RoomRow`, unchanged from variant D (#6): name, lights-on
 *     count, slider, temperature, all Derived from the Area's own entities.
 *   - an entity -> dispatched by Domain, in `entitySlot` below, mirroring
 *     `screens/ScreenView.tsx`'s function of the same name: `lock` ->
 *     `GateSlab`, `alarm_control_panel` -> `AlarmTile`, `camera` -> folded
 *     into a `CameraGlance` (see the camera note below), `media_player` ->
 *     `MediaBar`. A Domain with no dedicated component falls through to a
 *     visible `FaultTile` rather than rendering nothing -- a Page asking for
 *     something unrenderable is a bug worth seeing, same reasoning
 *     `ScreenView.tsx` used.
 *
 * `footer`:
 *   - an Area -> a tappable block that opens that Area's Page (`page:<area
 *     id>`, per docs/protocol.md's worked example). Wiring the tap to an
 *     actual router is #14, out of scope here, so this follows `NavBar.tsx`'s
 *     precedent (see its header comment): the block is visibly present and
 *     looks tappable -- it just does not navigate yet. A `title` attribute
 *     says so on hover/long-press, the same admission `NavBar` makes for its
 *     four unbuilt destinations.
 *   - an entity -> the same `entitySlot` dispatch as the entity Regions
 *     (`media_player` -> `MediaBar`, docs/protocol.md's worked example places
 *     `media_player.ovunque` in the footer directly).
 *
 * `glance`:
 *   - **Judgement call, since neither docs/protocol.md nor ADR-0005 specifies
 *     an Area's shape in this Region** (the protocol's table only defines
 *     Area-in-entity-Region and Area-in-footer; `glance`'s own description is
 *     "temperature, humidity, lights on, consumption... chips", a fixed
 *     composition, not a place for arbitrary Area rows). An Area placed here
 *     is therefore not malformed placement -- the Region is real and
 *     recognised -- but it is a Placement this Region's contract cannot
 *     honour. docs/protocol.md's "malformed placement renders nothing" rule
 *     is deliberately narrow to unrecognised Regions/pairs; this is a
 *     recognised Region with no defined answer, which is closer to
 *     `ScreenView.tsx`'s "a screen asking for something unrenderable" case
 *     than to a typo. So it renders a visible `FaultTile` rather than being
 *     silently dropped -- `NavBar.tsx`'s and `FaultTile.tsx`'s shared
 *     precedent that an admission beats a silent gap. If a future protocol
 *     revision defines Area-in-glance, this is the one line to change.
 *   - an entity -> by Domain, feeding the existing glance components
 *     (`Hero`, `Stats`, `ChipRow`) rather than being rendered as its own
 *     tile. See `GlanceView` below for the reasoning in full.
 */
import { houseReport, useAreas, usePower, useEntities, type Area, type Entity, type Placed, type Region } from '../ha';
import { AlarmTile } from './AlarmTile';
import { CameraGlance } from './CameraGlance';
import { ChipRow } from './ChipRow';
import { FaultTile } from './FaultTile';
import { GateSlab } from './GateSlab';
import { Hero } from './Hero';
import { Icon } from './Icon';
import { MediaBar } from './MediaBar';
import { RoomRow } from './RoomRow';
import { Stats } from './Stats';
import { t } from './theme';
import { Tile } from './Tile';

/**
 * An entity placed in an entity Region or the footer, dispatched by Domain --
 * the same table `screens/ScreenView.tsx`'s `entitySlot` used, carried
 * forward unchanged because the Domain-to-component mapping is not a layout
 * decision the protocol touches.
 *
 * `camera` has no case of its own here: a single camera is not a
 * Region-shaped unit the way a lock or a media player is -- `CameraGlance`
 * renders a *count* of cameras plus their Areas' motion (its own header
 * comment), so it needs every Placed camera together, not one call per
 * entity. `PlacementView` below pulls every `camera` out of a Region's
 * `Placed[]` before this function ever sees the rest, and renders them as one
 * `CameraGlance` in the position the first camera would otherwise have taken
 * -- ordering (docs/protocol.md: Areas first, then entities, each in
 * registry order) is preserved for what is left, and the fixture's own
 * layout (three cameras placed together in `entities-left`, per the ticket)
 * is exactly this shape. A camera therefore never reaches `entitySlot`.
 */
function entitySlot(entity: Entity) {
  if (entity.domain === 'lock') {
    return <GateSlab key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'alarm_control_panel') {
    return <AlarmTile key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'media_player') {
    return <MediaBar key={entity.id} entities={[entity]} />;
  }
  return <FaultTile key={entity.id} label={`Nessun componente: ${entity.domain}`} />;
}

/**
 * The footer's Area block: a tappable surface that will open `page:<area
 * id>` once #14 wires up a router. Built and styled here per the ticket,
 * rather than as a fifth exported `src/ui/` component, because it has
 * exactly one caller and no state of its own -- `RoomRow`, `GateSlab` and
 * the rest earned their own files by being reused across Regions; this is
 * not.
 *
 * Modelled on `GateSlab`'s slab shape (full tappable surface, icon over
 * name) rather than on `RoomRow`'s row shape, because the footer is a strip
 * of equal-weight blocks (docs/protocol.md: "media, and the blocks that open
 * other pages"), not a vertical list -- the same reason `NavBar`'s
 * destinations are also slabs in a row, not rows in a list.
 */
function AreaOpenerBlock({ area }: { area: Area }) {
  // `title` carries the "not wired yet" admission (see below). `Tile`'s own
  // props have no `title` -- it is not this ticket's place to add one for a
  // single caller -- so the attribute sits on a plain wrapping `div`, which
  // is transparent to `Tile`'s `flex: 1` sizing (`display: 'contents'` would
  // drop the title's hoverable box; a flex passthrough keeps both).
  return (
    <div title={`Apri ${area.name} (navigazione: #14)`} style={{ display: 'flex', flex: 1, minWidth: 0 }}>
      <Tile
        disableModal
        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
        // No `onClick`: opening the Page is #14's router, not this ticket's
        // concern. `NavBar.tsx`'s header comment sets the precedent this
        // follows -- "a destination whose screen has not been built renders
        // visibly disabled rather than as a button that does nothing when
        // pressed" -- but an Area block is not a fixed, known-unbuilt
        // destination the way NavBar's four are: the Area's own Page may
        // already have content once #14 lands, so this renders as an
        // ordinary, *enabled*-looking tappable block (full colour, pointer
        // cursor, the wrapper's `title` naming what a tap will do) rather
        // than dimmed. The honesty NavBar insists on -- do not look live if
        // you are not -- is carried by that `title` text alone, since
        // dimming an Area that is fully configured and simply not yet wired
        // would misstate whose fault the gap is.
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: t.space.xs,
            color: t.color.textPrimary,
          }}
        >
          {/*
            The Area's own registry icon when it has one (#13, same source
            RoomRow now reads) -- recognisable as "that room" rather than as
            a generic nav glyph. The arrow-box is the fallback for an Area
            with no icon set, keeping the "this is a doorway to somewhere"
            reading `NavBar`'s icons give its own destinations.
          */}
          <Icon name={area.icon ?? 'mdi:arrow-right-bold-box-outline'} size={32} />
          <span style={{ fontSize: t.font.glanceM, fontWeight: 600, textAlign: 'center' }}>{area.name}</span>
        </div>
      </Tile>
    </div>
  );
}

/**
 * The glance Region: "the house at a glance" (docs/protocol.md), composed
 * from whatever is Placed into it rather than laid out as its own list of
 * tiles.
 *
 * `Hero`, `Stats` and `ChipRow` already existed as variant D's glance layer
 * and take computed values, not entities -- `houseTemperature(areas)`,
 * `usePower()`, `houseReport(entities)`. Under the protocol, `glance`
 * receives *placed entities* instead of a fixed screen composing those
 * calls, so this function is the seam between the two: it reads what is
 * Placed here and feeds it to the same three components, unchanged.
 *
 * The reading adopted (documented, since the ticket asks for the reasoning
 * to be recorded, not just the code):
 *
 *   - the `climate` entity Placed in `glance` is the one `Hero` reads for
 *     temperature -- `current_temperature`, never a `temperature` sensor.
 *     This is the Echo-chip guard restated at the Placement layer: even
 *     though the entity arrived here by explicit Label rather than by a
 *     house-wide scan, the *rule* ("a climate entity's own reading, not a
 *     sensor's") still applies, because `sensor.echo_di_christian_temperatura`
 *     is exactly the kind of `sensor` that could be labelled into `glance`
 *     by mistake -- Labels are edited from a phone (ADR-0005) and nothing
 *     stops someone placing the wrong sensor. So this function looks
 *     specifically for a `climate` entity among what is Placed, and only
 *     that Domain feeds Hero's temperature; a `temperature`-class `sensor`
 *     placed in `glance` is not a fallback for it (there being no Area to
 *     fall back to at the house level the way `RoomRow.areaTemperature` can)
 *     and is simply not consulted for temperature at all.
 *   - a `sensor` Placed in `glance` with `device_class: humidity` feeds
 *     `Hero`'s humidity line.
 *   - a `sensor` Placed in `glance` with `device_class: power` feeds
 *     `Stats`'s consumption line -- `usePower()` is not called here, in
 *     favour of reading the specific Placed entity, so a house that places
 *     a *different* power sensor in `glance` than the one `usePower`'s
 *     house-wide scan would have found gets what it actually placed.
 *   - the `alarm_control_panel` Placed in `glance` feeds `ChipRow`'s `alarm`
 *     prop, same as `ScreenView.tsx`'s `chips` case did by Label.
 *   - `Stats`'s `lightsOn` count and `ChipRow`'s `report` (the Verdict,
 *     `houseReport`) are **not** sourced from what is Placed in `glance`.
 *     Both are whole-house Derived facts -- "how many zones are lit
 *     anywhere", "the worst concern anywhere" -- and nothing in the set of
 *     Domains this function looks for (`climate`, `sensor`,
 *     `alarm_control_panel`) stands for either of those the way a
 *     thermostat stands for "the temperature here". Inventing a Label that
 *     would let someone place "the lights-on count" or "the verdict" itself
 *     is not something docs/protocol.md asks for, and `houseReport`'s
 *     ranking is exactly what ADR-0004 and ADR-0005 both say must survive
 *     unchanged -- computing it from the full entity set, as `ScreenView.tsx`
 *     always did, is what keeps that ranking intact rather than narrowing it
 *     to whatever happens to be labelled into `glance`.
 */
function GlanceView({ placed }: { placed: Placed[] }) {
  const entities = useEntities();
  const watts = usePower();

  const placedEntities = placed.filter((p): p is { kind: 'entity'; entity: Entity } => p.kind === 'entity').map(p => p.entity);

  const climate = placedEntities.find(e => e.domain === 'climate' && !e.unavailable) ?? null;
  const temperature = (() => {
    const value = Number(climate?.attributes.current_temperature);
    return climate && !Number.isNaN(value) ? value : null;
  })();

  const humiditySensor = placedEntities.find(e => e.domain === 'sensor' && e.attributes.device_class === 'humidity' && !e.unavailable);
  const humidity = (() => {
    const value = Number(humiditySensor?.state);
    return humiditySensor && !Number.isNaN(value) ? value : null;
  })();

  const powerSensor = placedEntities.find(e => e.domain === 'sensor' && e.attributes.device_class === 'power' && !e.unavailable);
  const placedWatts = (() => {
    const value = Number(powerSensor?.state);
    return powerSensor && !Number.isNaN(value) ? value : null;
  })();

  const alarm = placedEntities.find(e => e.domain === 'alarm_control_panel') ?? null;

  // Whole-house Derived, deliberately not narrowed to `placedEntities` -- see
  // the header note above.
  const lightsOn = [...entities.values()].filter(e => e.domain === 'light' && e.labels.includes('main') && e.state === 'on').length;
  const report = houseReport([...entities.values()]);

  return (
    // `minHeight: 0` so this whole block can be *compressed* by whatever
    // flex height `Panel` gives it -- see `Panel`'s left column, which pins
    // `entities-left` (the gates, the camera glance) at their full fixed
    // size and gives `glance` the space left over rather than the reverse.
    // Within that space, `Hero` and `Stats` hold their own height
    // (`flexShrink: 0` below) and `ChipRow` is the one element that yields:
    // it scrolls its own concerns rather than being cut, restoring the
    // precedent `screens/ScreenView.tsx`'s `chips` case set ("the chip row
    // is the part of the sidebar that yields") for the same reason -- a
    // fault chip appearing must not be able to push a gate off the panel,
    // and the gates must not be what shrinks to make room for it.
    // `sm`, not `md`: measured down alongside the other gaps in `Panel`'s
    // left column once the ChipRow's own minimum turned out to need every
    // spare pixel available -- see the note on `footerH` in
    // `theme/tokens.ts` for the sibling adjustment and the reasoning.
    <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.sm, minHeight: 0, height: '100%' }}>
      <div style={{ flexShrink: 0 }}>
        <Hero temperature={temperature} humidity={humidity} />
      </div>
      {/*
        `placedWatts` falls back to the house-wide `usePower()` scan only when
        `glance` carries no `sensor.device_class:power` of its own -- a Page
        that places a power sensor gets that one; a Page that places none
        still shows the ambient house reading rather than going blank for a
        reason unrelated to whether power is being drawn.
      */}
      <div style={{ flexShrink: 0 }}>
        <Stats lightsOn={lightsOn} watts={placedWatts ?? watts} />
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          // A chip is a whole row of its own, so scrolling snaps to one --
          // ChipRow.tsx's own children already carry `scrollSnapAlign`, this
          // is the scrolling ancestor `scroll-snap-type` needs to pair it
          // with (the same treatment `screens/ScreenView.tsx`'s `chips` case
          // used).
          scrollSnapType: 'y mandatory',
        }}
      >
        <ChipRow report={report} alarm={alarm} />
      </div>
    </div>
  );
}

/**
 * One Region's contents, dispatched to its rendering contract.
 *
 * `usePage` already grouped and ordered everything (Areas first, then
 * entities, each in registry order -- docs/protocol.md); this only decides
 * *how* each `Placed` becomes a node, according to which Region called it.
 *
 * Cameras are pulled out ahead of the per-item dispatch and rendered as one
 * `CameraGlance`, in the slot the first camera occupied -- see the note on
 * `entitySlot` above. `useAreas()` is called unconditionally (hooks cannot be
 * conditional) to give `CameraGlance` the Areas it needs for motion lookup;
 * it is cheap, the same whole-house subscription every other hook here reads
 * (`src/ha/registry.ts`), not a second one.
 */
export function PlacementView({ region, placed }: { region: Region; placed: Placed[] }) {
  const areas = useAreas();

  if (region === 'glance') {
    return <GlanceView placed={placed} />;
  }

  const cameras = placed.filter((p): p is { kind: 'entity'; entity: Entity } => p.kind === 'entity' && p.entity.domain === 'camera');
  // The index of the *first* camera in `placed`, so the grouped
  // `CameraGlance` can be rendered exactly once, in the position the first
  // camera held -- computed up front rather than with a mutable flag toggled
  // during the `.map` below, which oxlint flags as unsafe render-time state.
  const firstCameraIndex = placed.findIndex(p => p.kind === 'entity' && p.entity.domain === 'camera');

  return (
    <>
      {placed.map((item, i) => {
        if (item.kind === 'area') {
          if (region === 'footer') {
            return <AreaOpenerBlock key={item.area.id} area={item.area} />;
          }
          // entities-left / entities-right: the Row, unchanged from variant D.
          // The icon comes from Home Assistant's own area registry (#13) --
          // `useAreas()` now carries it alongside `labels` -- rather than
          // from a hardcoded per-Area map the way `screens/home.ts` used to
          // supply it; `undefined` (Area.icon is null) falls through to
          // RoomRow's own generic default, unchanged.
          return <RoomRow key={item.area.id} area={item.area} icon={item.area.icon ?? undefined} />;
        }
        if (item.entity.domain === 'camera') {
          // Every camera renders once, together, as one `CameraGlance` --
          // the rest are skipped here, having already been folded into it.
          if (i !== firstCameraIndex) return null;
          return <CameraGlance key='cameras' cameras={cameras.map(c => c.entity)} areas={areas} />;
        }
        return entitySlot(item.entity);
      })}
    </>
  );
}
