/**
 * Region-determines-shape: the dispatcher docs/protocol.md calls "the rule
 * that makes the protocol more than addressing" (#13).
 *
 * `usePage` (`src/ha/placement.ts`) already resolves a Page into its four
 * Regions' ordered `Placed[]` -- it says *what* is in each Region, in what
 * order, and nothing about how it looks. This file is the other half: given
 * a `Placed` and the Region it came from, decide the component. The same
 * Area renders as a Room Tile in `left`/`right` and as a
 * tappable Page-opener in `footer` -- CONTEXT.md's "Rendering contract" --
 * because the Region, not the kind of thing, decides the shape.
 *
 * This lives in `src/ui/`, not `src/ha/`, because it imports components
 * (`RoomGrid`, `AccessRow`, ...) and makes component-selection judgement calls;
 * `placement.ts` stays free of JSX and of every one of these decisions.
 *
 * ## Per-Region rendering contracts
 *
 * `left` / `right`:
 *   - an Area -> a `RoomTile` (#42): name, lights-on count, temperature, a
 *     switch and a dimmer for its `main` light, all Derived from the Area's
 *     own entities; a tap opens the Area's Page. A Region's Areas render
 *     together, as one `RoomGrid`, where the first of them would be -- the
 *     same move as the cameras' `Feeds` below.
 *   - an entity -> dispatched by Domain, in `entitySlot` below, mirroring
 *     `screens/ScreenView.tsx`'s function of the same name: `lock` ->
 *     `AccessRow` (#43), `alarm_control_panel` -> `AlarmPanel`, `camera` -> a Feed,
 *     every camera of the Region together in one `Feeds` block (see the
 *     camera note below), `media_player` ->
 *     `MediaBar`, `light` and `switch` -> `ToggleTile` (#16). A Domain with
 *     no dedicated component falls through to a visible `FaultTile` rather
 *     than rendering nothing -- a Page asking for something unrenderable is a
 *     bug worth seeing, same reasoning `ScreenView.tsx` used.
 *   - an `input_button` -> a Page Opener (ADR-0012): the same block an Area
 *     gets in `footer`, opening the Page its object id names.
 *   - a Group (ADR-0014, #43) -> one `Card` titled with the helper's name,
 *     its members as the rows, each by `memberSlot` in the shape its own
 *     Domain takes here. The helper's own state and controls never render.
 *     In `footer` and `glance` a Group is a `FaultTile` naming it.
 *   - a `lock` -> an `AccessRow` (#43), in its Group's card or alone in a
 *     card of its own: hold Apri to open, tap Chiudi to close.
 *   - where a Domain has a full and a compact form, `left`/`right` get the
 *     full one and `footer` the compact one (#31): `climate` -> `ClimateCard`
 *     / `ClimateBlock`, `sensor` -> `SensorTile` / `SensorBlock` (#33).
 *     `weather` -> `WeatherCard`, in `left`/`right` only.
 *     `media_player` is the one exception: `MediaCard` in `right` only, and
 *     `MediaBar` in `left` as well as `footer` (#35).
 *     `alarm_control_panel` -> `AlarmPanel` / `AlarmTile`, `binary_sensor`
 *     -> `BinarySensorTile` / `BinarySensorBlock`, and `light`, `switch`,
 *     `siren` -> `ToggleTile` / `ToggleBlock` (#34). `vacuum` ->
 *     `VacuumCard` and `select` -> `SelectTile`, in `left`/`right` only (#36).
 *
 * `footer`:
 *   - an Area -> a tappable block that opens that Area's Page (`page:<area
 *     id>`, per docs/protocol.md's worked example), wired for real as of
 *     #14: `AreaOpenerBlock`'s `onClick` calls `openPage(area.id)` from
 *     `NavigationContext`. Before #14 this block rendered enabled-looking but
 *     inert, admitting as much through its `title`; that admission is gone
 *     because it is no longer true, but the principle behind it survives
 *     unchanged and now governs another decision in this file: see
 *     `EmptyPageMessage` below for where it resurfaces. That
 *     principle, inherited from the deleted `NavBar.tsx`
 *     (#8) and worth restating here since nothing points at that file any
 *     more: **a dead control that looks live is worse than one that admits
 *     it is not there.** The deleted `NavBar.tsx` chose a bottom bar over an edge gesture
 *     or drill-in tiles for the same reason a footer block does now -- the
 *     panel is used standing, often one-handed, often by someone who is not
 *     the house's owner, so the control has to be discoverable and
 *     unambiguous without a hidden gesture, and it must not overload a tile
 *     whose press already toggles a light.
 *   - a Page Opener -> on the wall, an item of the Dock (#41): `Dashboard`
 *     splits it off with `besideDock`/`dockItems` (`dock.ts`) before this
 *     file sees the footer, so it never reaches here. On a phone, which has
 *     no Dock, and in a Popup, which has none either, it is still the same
 *     block as an Area, opening its Page -- and there it is skipped on its own
 *     Page, as it is in `left` and `right`: the Dock is the one place it
 *     stays, marked current, and these have no Dock.
 *   - any other entity -> the same `entitySlot` dispatch as `left` and
 *     `right` (`media_player` -> `MediaBar`). Its tap stays its own. When the
 *     same entity is also Placed in `left` or `right` on another Page, it
 *     gains a trailing chevron and a right swipe to that Page (#32,
 *     `FooterMember`), as the Row did; with no such Page, nothing is added.
 *   - the renderer's own way home is no longer here: it is Casa, the Dock's
 *     first item (#41, `Dock.tsx`), so the footer holds only what is Placed.
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
 *     silently dropped -- the same "admit it, don't fake it" precedent as
 *     `footer` above and `FaultTile.tsx`'s own header comment. A Page Opener
 *     gets the same judgement (ADR-0012): it stands for a Page as an Area
 *     does. #14 leaves `glance` itself otherwise untouched: it resolves
 *     per-Page like every other Region (decision 3), with no Page-specific
 *     special case here or in `Dashboard.tsx`.
 *   - an entity -> by Domain, feeding the existing glance components
 *     (`Hero`, `Stats`, `ChipRow`) rather than being rendered as its own
 *     tile. See `GlanceView` below for the reasoning in full. Every
 *     `camera` Placed here becomes one chip in `ChipRow`, the camera chip
 *     that opens its cameras' Feeds (#29, #44). Since #32 a tap on `Hero`
 *     opens the Page its `climate` is Placed on, and a tap on the
 *     consumption's StatCard the Page of its power `sensor`.
 *   - on the wall `glance` is split across the frame (#41): its chips go to
 *     the status bar and the rest to the top of the left column, so `Panel`
 *     asks for each half by `part`. A phone asks for both too, and stacks
 *     them in the same order: the chips, then the rest (#45).
 */
import type { ReactNode } from 'react';
import {
  cameraMoving,
  groupMemberIds,
  houseReport,
  openerPage,
  placedPageFor,
  useAreas,
  useLabelOrder,
  usePower,
  useEntities,
  type Area,
  type Entity,
  type Label,
  type Placed,
  type Region,
} from '../ha';
import { slugify } from '../ha/placement';
import { AccessRow } from './AccessRow';
import { AlarmPanel } from './AlarmPanel';
import { AlarmTile } from './AlarmTile';
import { BinarySensorBlock, BinarySensorTile } from './BinarySensorTile';
import { openerIcon } from './dock';
import { Card } from './Card';
import { ClimateBlock, ClimateCard } from './ClimateCard';
import { ChipRow } from './ChipRow';
import { FaultTile } from './FaultTile';
import { Feeds } from './Feeds';
import { Hero } from './Hero';
import { Icon } from './Icon';
import { MediaBar } from './MediaBar';
import { MediaCard } from './MediaCard';
import { useNavigation } from './NavigationContext';
import { popupTitle } from './popup';
import { RoomGrid } from './RoomGrid';
import { SelectTile } from './SelectTile';
import { SensorBlock, SensorTile } from './SensorTile';
import { Stats } from './Stats';
import { OpenChevron, SwipeToOpen } from './SwipeToOpen';
import { t } from './theme';
import { Tile } from './Tile';
import { ToggleBlock } from './ToggleBlock';
import { ToggleTile } from './ToggleTile';
import { VacuumCard } from './VacuumCard';
import { WeatherCard } from './WeatherCard';

/**
 * An entity placed in `left`, `right` or the footer, dispatched by Domain --
 * the same table `screens/ScreenView.tsx`'s `entitySlot` used, carried
 * forward unchanged because the Domain-to-component mapping is not a layout
 * decision the protocol touches.
 *
 * `camera` has no case of its own here: a camera is a Feed, and a Region's
 * Feeds are one block -- one big Feed and a strip of the others (`Feeds`,
 * #29) -- so it needs every Placed camera together, not one call per
 * entity. `PlacementView` below pulls every `camera` out of a Region's
 * `Placed[]` before this function ever sees the rest, and renders them as one
 * `Feeds` in the position the first camera would otherwise have taken --
 * ordering (docs/protocol.md: Areas first, then entities, each in registry
 * order) is preserved for what is left. A camera therefore never reaches
 * `entitySlot`.
 */
function entitySlot(entity: Entity, region: Exclude<Region, 'glance'>) {
  // Where a Domain has a full and a compact form, the Region chooses: `left`
  // and `right` get the full one, `footer` the compact one (#31). The Page
  // never decides shape.
  const compact = region === 'footer';
  const opens = openerPage(entity);
  if (opens !== null) {
    return <PageOpenerBlock key={entity.id} entity={entity} page={opens} />;
  }
  if (entity.domain === 'lock') {
    // The same in every Region (docs/protocol.md): an `AccessRow` always
    // has its card, so a lone gate gets one of its own, with no title.
    return (
      <Card key={entity.id}>
        <AccessRow entity={entity} />
      </Card>
    );
  }
  if (entity.domain === 'alarm_control_panel') {
    return compact ? <AlarmTile key={entity.id} entity={entity} /> : <AlarmPanel key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'media_player') {
    // The full card only in `right`: in `left`, as in `footer`, a player
    // stays the compact strip (#35) -- Ovunque on the Media Page is a strip
    // on purpose.
    return region === 'right' ? <MediaCard key={entity.id} entity={entity} /> : <MediaBar key={entity.id} entities={[entity]} />;
  }
  if (entity.domain === 'light' || entity.domain === 'switch' || entity.domain === 'siren') {
    return compact ? <ToggleBlock key={entity.id} entity={entity} /> : <ToggleTile key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'binary_sensor') {
    return compact ? <BinarySensorBlock key={entity.id} entity={entity} /> : <BinarySensorTile key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'climate') {
    return compact ? <ClimateBlock key={entity.id} entity={entity} /> : <ClimateCard key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'sensor') {
    return compact ? <SensorBlock key={entity.id} entity={entity} /> : <SensorTile key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'vacuum' && !compact) {
    return <VacuumCard key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'select' && !compact) {
    return <SelectTile key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'weather' && !compact) {
    return <WeatherCard key={entity.id} entity={entity} />;
  }
  return <FaultTile key={entity.id} label={`Nessun componente: ${entity.domain}`} />;
}

/**
 * A Group in `left` or `right` (ADR-0014): one card, titled with the
 * helper's name, and its members as the rows. Only the members are ever
 * dispatched -- never the helper, whose controls would act on every member
 * at once -- so the card shows them whatever state the helper is in,
 * Unavailable included.
 */
function groupSlot(helper: Entity, members: Entity[], region: 'left' | 'right') {
  return (
    <Card key={helper.id} title={helper.name}>
      {members.map(member => memberSlot(member, region))}
    </Card>
  );
}

/**
 * One member of a Group, as its own Domain renders in the Region. A gate is
 * the bare `AccessRow`, the card already being there; a member that is
 * itself a Group would put that helper's controls in the card, so it is a
 * fault instead. An Unavailable member renders in its own shape, as a Fault.
 */
function memberSlot(member: Entity, region: 'left' | 'right') {
  if (groupMemberIds(member) !== null) {
    return <FaultTile key={member.id} label={`Gruppo in un gruppo: ${member.name}`} />;
  }
  if (member.domain === 'lock') return <AccessRow key={member.id} entity={member} />;
  return entitySlot(member, region);
}

/**
 * A block that opens a Page: what an Area becomes in `footer` (#14), and what
 * a Page Opener is in `left` and `right` (ADR-0012) -- and in `footer` where
 * there is no Dock. Built here rather than as its own `src/ui/`
 * component, because nothing outside this file renders one.
 *
 * Modelled on the deleted `GateSlab`'s slab shape (full tappable surface, icon over
 * name) rather than on the Row's old row shape, because the footer is a strip
 * of equal-weight blocks (docs/protocol.md: "media, and the blocks that open
 * other pages"), not a vertical list -- the same reason the deleted
 * `NavBar.tsx`'s destinations were also slabs in a row, not rows in a list.
 */
function PageBlock({ name, icon, title, onOpen }: { name: string; icon: string; title: string; onOpen: () => void }) {
  return (
    // `flex: '0 0 auto'`, not `flex: 1`: a page button is a control sized to
    // its own label, not a Region claiming a share of the floor. Measured at
    // 1280x800 -- with `flex: 1` the single Corridoio block took 591 px, half
    // the panel, purely because it was the only other flex item beside the
    // media strip. The footer's *remaining* width belongs to `MediaBar`,
    // which is a transport strip and genuinely wants it.
    //
    // `scrollSnapAlign`: when a house places more than the footer holds, the
    // footer scrolls sideways and rests on whole blocks (Panel.tsx).
    <div title={title} style={{ display: 'flex', flex: '0 0 auto', minWidth: 0, scrollSnapAlign: 'start' }}>
      {/*
        `paddingBlock` overrides `Tile`'s own `md` padding, which is sized for
        a tile with a state line under a title, not for a compact footer slab.
        The arithmetic that matters (measured, not assumed): 26 icon + 4 gap +
        16 label = 46 of content, so anything over 18 px of vertical padding
        puts the block past `layout.footerH` (64) -- and because `footerH` is
        a `minHeight`, content winning there silently steals the left column's
        pixels rather than scrolling the footer.
      */}
      <Tile disableModal style={{ minWidth: 0, paddingBlock: t.space.sm }} onClick={onOpen}>
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
            26 over `caption`, not 32 over `glanceM`: the larger pair made
            this block 91 px tall, which overrode `layout.footerH` (a
            `minHeight`, so content wins) and took back the exact 32 px the
            token comment says were measured *out* of the footer to give the
            left column -- clipping ChipRow's fault chip against the gates.
            These are the proportions the deleted `NavBar.tsx` used for the
            same slab in the same strip, and they leave the block inside 64 px.
          */}
          <Icon name={icon} size={26} />
          <span style={{ fontSize: t.font.caption, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{name}</span>
        </div>
      </Tile>
    </div>
  );
}

/**
 * The footer's Area block: opens `page:<area id>` (#14).
 *
 * The Page it opens is `area.id`, not `area.name` -- the fixture that proves
 * why: `id: salone, name: Soggiorno` (fake-house/manifest.yaml). Home
 * Assistant's own label slugifying (#12) is what makes `openPage(area.id)`
 * line up with a Label typed as `page:salone` in Home Assistant's UI --
 * `usePage`/`resolvePage` slugify *both* the stored Label and the requested
 * Page name with the same `slugify()` (`src/ha/placement.ts`) before
 * comparing, so the Area's registry id is the Page name by construction of
 * the protocol, not a separate mapping this file has to maintain.
 *
 * The icon is the Area's own registry icon when it has one (#13, the same
 * source the Room Tile reads), recognisable as "that room" rather than as a
 * generic nav glyph; the arrow-box is the fallback for an Area with none.
 */
function AreaOpenerBlock({ area }: { area: Area }) {
  const { openPage } = useNavigation();
  return (
    <PageBlock
      name={area.name}
      icon={area.icon ?? 'mdi:arrow-right-bold-box-outline'}
      title={`Apri ${area.name}`}
      onOpen={() => openPage(area.id)}
    />
  );
}

/**
 * A Page Opener (ADR-0012): an `input_button` standing for a Topic Page the
 * way an Area stands for its own, so it is the same block. Its name and icon
 * are the helper's own, set in Home Assistant; the Page it opens is its
 * object id (`openerPage`). It never presses the button: the helper holds no
 * state and pressing it would do nothing.
 */
function PageOpenerBlock({ entity, page }: { entity: Entity; page: string }) {
  const { openPage } = useNavigation();
  return <PageBlock name={entity.name} icon={openerIcon(entity)} title={`Apri ${entity.name}`} onOpen={() => openPage(page)} />;
}

/**
 * An entity in `footer` that leads to its own other Page (CONTEXT.md,
 * Derived; #32): the Page where it is also Placed in `left` or `right`. It
 * keeps its own component and its own tap, and gains the old Row's way to a
 * Page -- a trailing chevron, or a swipe right. With no such Page it is
 * rendered bare, with no chevron.
 *
 * The chevron sits after the component rather than inside its card, so every
 * Domain gets it without each component growing a slot for it.
 */
function FooterMember({ entity, labelOrder, children }: { entity: Entity; labelOrder: Label[]; children: ReactNode }) {
  const { page, openPage } = useNavigation();
  const areas = useAreas();
  const leads = placedPageFor([entity], labelOrder, page);
  // The member takes the width its own component would have: a media strip
  // keeps the footer's remaining width, anything else is sized to itself.
  // No `minWidth: 0`: the component's own floor (`mediaBarMinW`) has to reach
  // the footer, so a crowded footer scrolls instead of crushing it. Every
  // member is a snap point for that scroll (Panel.tsx).
  const box = { flex: entity.domain === 'media_player' ? 1 : '0 0 auto', scrollSnapAlign: 'start' } as const;
  if (leads === null) return <div style={{ ...box, display: 'flex' }}>{children}</div>;
  const name = popupTitle(leads, areas).name;
  return (
    <SwipeToOpen name={name} onOpen={() => openPage(leads)} style={box}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>{children}</div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <OpenChevron label={`Apri ${name}`} onOpen={() => openPage(leads)} />
      </div>
    </SwipeToOpen>
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
 *     fall back to at the house level the way a Room Tile's `roomTemperature` can)
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
 *   - every `camera` Placed in `glance` feeds `ChipRow`'s camera chip (#44,
 *     a tile under the stats before it): motion per camera, from its own
 *     device (`cameraMoving`), and a tap that opens the Page where the same
 *     cameras are Placed as Feeds (`placedPageFor`, #29).
 *   - `Stats`'s `lightsOn` count and `ChipRow`'s `report` (the Verdict,
 *     `houseReport`) are **not** sourced from what is Placed in `glance`.
 *     Both are whole-house Derived facts -- "how many lights are on
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
function GlanceView({ placed, labelOrder, part }: { placed: Placed[]; labelOrder: Label[]; part?: GlancePart }) {
  const entities = useEntities();
  const watts = usePower();
  const { page, openPage } = useNavigation();

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

  const cameras = placedEntities.filter(e => e.domain === 'camera');
  const feedsPage = placedPageFor(cameras, labelOrder, page);

  // The temperature and the consumption lead where the entities feeding them
  // are Placed (CONTEXT.md, Derived; #32), on a tap: nothing here has an
  // action of its own. The climate is the Placed one even when Unavailable --
  // its Page is where to go and look at why. The consumption leads only when
  // a Placed sensor feeds it, never from `usePower()`'s house-wide fallback.
  const placedClimate = placedEntities.find(e => e.domain === 'climate');
  const climatePage = placedClimate ? placedPageFor([placedClimate], labelOrder, page) : null;
  const powerPage = powerSensor ? placedPageFor([powerSensor], labelOrder, page) : null;

  // An Area, a Page Opener or a Group has no shape in `glance` (see the
  // header note): a visible fault, never a silent gap.
  const unplaceable = placed.flatMap(p =>
    p.kind === 'area'
      ? [{ key: `area:${p.area.id}`, name: p.area.name }]
      : p.kind === 'group' || openerPage(p.entity) !== null
        ? [{ key: p.entity.id, name: p.entity.name }]
        : []
  );

  // Whole-house Derived, deliberately not narrowed to `placedEntities` -- see
  // the header note above. The lights stat counts the lights-on Concern, so
  // it and the Verdict count by the one rule (#44).
  const report = houseReport([...entities.values()]);
  const lightsOn = report.lit?.count ?? 0;

  // Keyed on the Page: leaving it closes any Concern list open from here (#30).
  const chips = (
    <ChipRow
      key={page}
      report={report}
      cameras={cameras}
      moving={cameras.filter(c => cameraMoving(c, entities.values()))}
      onOpenCameras={feedsPage === null ? undefined : () => openPage(feedsPage)}
      alarm={alarm}
    />
  );
  if (part === 'chips') return chips;

  return (
    // The glance block holds its own height and never scrolls (ADR-0007).
    //
    // It used to do the opposite: `minHeight: 0` plus `overflowY: auto`, so
    // `Panel`'s left column could compress it and it would scroll rather than
    // clip. That was the wrong end of the trade. `glance` is the house's
    // Verdict, read on approach from 2 m without touching anything
    // (CONTEXT.md) -- a Verdict you have to drag into view is not one. Worse,
    // making this block compressible made its failure *continuous*: the
    // column quietly took a few pixels at every viewport, and at 1280x768
    // `Stats` ended up sliced in half by the gate slab below it with nothing
    // on screen to say so.
    //
    // `Panel` now pins this block (`flex: '0 0 auto'`) and gives the column's
    // spare room -- and the job of yielding -- to `left`, which
    // scrolls discretely and only when a house has actually placed more than
    // fits. `scripts/measure-panel.ts` asserts that this block always gets
    // the height it asks for at every supported viewport, so "it never
    // scrolls" is a checked property rather than a hope.
    //
    // On the wall the chips are not here at all: they are the status bar's
    // (#41), the cameras' among them (#44), and this block is the top of the
    // left column -- the Hero over the two StatCards, as Casa Panel's screen
    // has them. A phone stacks the two halves, chips first (#45); only a
    // Popup takes `glance` whole, with the chips under the stats.
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space[5],
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <Hero temperature={temperature} humidity={humidity} onOpen={climatePage === null ? undefined : () => openPage(climatePage)} />
      </div>
      {/*
        `placedWatts` falls back to the house-wide `usePower()` scan only when
        `glance` carries no `sensor.device_class:power` of its own -- a Page
        that places a power sensor gets that one; a Page that places none
        still shows the ambient house reading rather than going blank for a
        reason unrelated to whether power is being drawn.
      */}
      <div style={{ flexShrink: 0 }}>
        <Stats lightsOn={lightsOn} watts={placedWatts ?? watts} onOpenPower={powerPage === null ? undefined : () => openPage(powerPage)} />
      </div>
      {part === undefined && <div style={{ flexShrink: 0 }}>{chips}</div>}
      {unplaceable.map(({ key, name }) => (
        <div key={key} style={{ flexShrink: 0, display: 'flex' }}>
          <FaultTile label={`Non previsto in glance: ${name}`} />
        </div>
      ))}
    </div>
  );
}

/** Which half of `glance` the wall's frame is asking for (#41): see `PlacementView`. */
type GlancePart = 'chips' | 'column';

/**
 * One Region's contents, dispatched to its rendering contract.
 *
 * `usePage` already grouped and ordered everything (Areas first, then
 * entities, each in registry order -- docs/protocol.md); this only decides
 * *how* each `Placed` becomes a node, according to which Region called it.
 *
 * Cameras are pulled out ahead of the per-item dispatch and rendered as one
 * `Feeds`, in the slot the first camera occupied -- see the note on
 * `entitySlot` above. `useNavigation()` (#14) is read unconditionally
 * (hooks cannot be conditional) to know the current Page name: it skips a
 * footer's Page Opener on its own Page, and it keys `Feeds`, so which Feed is
 * big starts over each time a Page is opened.
 *
 * `part` is for `glance` on the wall, which the frame splits in two (#41):
 * `chips` for the status bar, `column` for the top of the left column. A
 * phone asks for the same two halves (#45). Without it, `glance` renders
 * whole, as a Popup's slot stacks it.
 */
export function PlacementView({ region, placed, part }: { region: Region; placed: Placed[]; part?: GlancePart }) {
  const { page } = useNavigation();
  const labelOrder = useLabelOrder();

  if (region === 'glance') {
    return <GlanceView placed={placed} labelOrder={labelOrder} part={part} />;
  }

  const cameras = placed.filter((p): p is { kind: 'entity'; entity: Entity } => p.kind === 'entity' && p.entity.domain === 'camera');
  // The index of the *first* camera in `placed`, so the grouped
  // `Feeds` can be rendered exactly once, in the position the first
  // camera held -- computed up front rather than with a mutable flag toggled
  // during the `.map` below, which oxlint flags as unsafe render-time state.
  const firstCameraIndex = placed.findIndex(p => p.kind === 'entity' && p.entity.domain === 'camera');
  // The Region's Areas, likewise: one `RoomGrid`, where the first Area was.
  const areas = placed.flatMap(p => (p.kind === 'area' ? [p.area] : []));
  const firstAreaIndex = placed.findIndex(p => p.kind === 'area');

  return (
    <>
      {placed.map((item, i) => {
        if (item.kind === 'area') {
          if (region === 'footer') {
            return <AreaOpenerBlock key={item.area.id} area={item.area} />;
          }
          // left / right: every Area renders once, together, as the
          // Region's Room Grid (#42) -- the rest are folded into it.
          if (i !== firstAreaIndex) return null;
          return <RoomGrid key='rooms' areas={areas} />;
        }
        if (item.kind === 'group') {
          // A Group's card exists only in `left` and `right` (ADR-0014).
          if (region === 'footer') return <FaultTile key={item.entity.id} label={`Non previsto in footer: ${item.entity.name}`} />;
          return groupSlot(item.entity, item.members, region);
        }
        if (item.entity.domain === 'camera') {
          // Every camera renders once, together, as one `Feeds` -- the rest
          // are skipped here, having already been folded into it.
          if (i !== firstCameraIndex) return null;
          return <Feeds key={`feeds:${page}`} cameras={cameras.map(c => c.entity)} />;
        }
        const opens = openerPage(item.entity);
        // A footer's Page Opener reaches here only where there is no Dock --
        // a phone, a Popup -- and there it is a block, which on its own Page
        // would open the Page already on screen. `resolvePage` keeps it in
        // `footer` for the Dock, so the skip is made here.
        if (region === 'footer' && opens !== null && slugify(opens) === slugify(page)) return null;
        if (region === 'footer' && opens === null) {
          return (
            <FooterMember key={item.entity.id} entity={item.entity} labelOrder={labelOrder}>
              {entitySlot(item.entity, 'footer')}
            </FooterMember>
          );
        }
        return entitySlot(item.entity, region);
      })}
    </>
  );
}

/**
 * What a Page with nothing Placed on it shows, instead of a blank panel
 * (#14, decision 6).
 *
 * This is deliberately not treated as malformed Placement. docs/protocol.md's
 * "malformed placement renders nothing" rule is about Labels the renderer
 * cannot honour -- an unrecognised Region, a Placement Label with no Region
 * half, an extra coordinate -- and its consequence (a silent gap, found by noticing
 * something missing) is accepted there specifically because those are typos
 * in an otherwise-working system. A Page that resolves cleanly to four empty
 * Regions is not a typo: every Label on it parsed and matched exactly as
 * written, and the Page is *well-formed* -- it simply has no contents yet,
 * which is a true and different fact about the house, not a mistake in this
 * renderer.
 *
 * The distinction is the same one the deleted `NavBar.tsx` drew between an
 * unbuilt destination and a broken one, and its surviving principle applies
 * again here for the same reason `AreaOpenerBlock` cites it: a
 * dead control that looks live is worse than one that admits it is not
 * there. Four silent, empty Regions would look like a rendering failure --
 * indistinguishable from the panel being broken -- while this message is the
 * renderer admitting, in Italian, that there is nothing here yet. A blank
 * panel looks broken; a message is an admission.
 *
 * `Dashboard.tsx` decides *when* to show this (all four Regions empty) and
 * is responsible for making sure the Dock still renders around it: the
 * footer's own `Placed[]` for this Page is part of "all four Regions empty"
 * too, but Casa is not Placed (`dock.ts`) and so is unaffected by the Page
 * having nothing Placed on it. Every non-main Page therefore keeps its way
 * home even when it has nothing else -- exactly the trap #14's decision 2
 * exists to prevent, and the reason this message stands in for the body's
 * absent content only, never for the floor.
 */
export function EmptyPageMessage() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space.sm,
        height: '100%',
        color: t.color.textSecondary,
        textAlign: 'center',
      }}
    >
      <Icon name='mdi:image-off-outline' size={48} color={t.color.textSecondary} />
      <span style={{ fontSize: t.font.glanceM, fontWeight: 600 }}>Non c&apos;è ancora niente su questa pagina</span>
    </div>
  );
}
