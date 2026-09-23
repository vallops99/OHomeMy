/**
 * Region-determines-shape: the dispatcher docs/protocol.md calls "the rule
 * that makes the protocol more than addressing" (#13).
 *
 * `usePage` (`src/ha/placement.ts`) already resolves a Page into its four
 * Regions' ordered `Placed[]` -- it says *what* is in each Region, in what
 * order, and nothing about how it looks. This file is the other half: given
 * a `Placed` and the Region it came from, decide the component. The same
 * Area renders as a `RoomRow` in `left`/`right` and as a
 * tappable Page-opener in `footer` -- CONTEXT.md's "Rendering contract" --
 * because the Region, not the kind of thing, decides the shape.
 *
 * This lives in `src/ui/`, not `src/ha/`, because it imports components
 * (`RoomRow`, `GateSlab`, ...) and makes component-selection judgement calls;
 * `placement.ts` stays free of JSX and of every one of these decisions.
 *
 * ## Per-Region rendering contracts
 *
 * `left` / `right`:
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
 *     id>`, per docs/protocol.md's worked example), wired for real as of
 *     #14: `AreaOpenerBlock`'s `onClick` calls `openPage(area.id)` from
 *     `NavigationContext`. Before #14 this block rendered enabled-looking but
 *     inert, admitting as much through its `title`; that admission is gone
 *     because it is no longer true, but the principle behind it survives
 *     unchanged and now governs two other decisions in this file: see
 *     `HomeBlock` and `EmptyPageMessage` below for where it resurfaces. That
 *     principle, inherited from the deleted `NavBar.tsx`
 *     (#8) and worth restating here since nothing points at that file any
 *     more: **a dead control that looks live is worse than one that admits
 *     it is not there.** The deleted `NavBar.tsx` chose a bottom bar over an edge gesture
 *     or drill-in tiles for the same reason a footer block does now -- the
 *     panel is used standing, often one-handed, often by someone who is not
 *     the house's owner, so the control has to be discoverable and
 *     unambiguous without a hidden gesture, and it must not overload a tile
 *     whose press already toggles a light.
 *   - an entity -> the same `entitySlot` dispatch as `left` and `right`
 *     (`media_player` -> `MediaBar`, docs/protocol.md's worked example places
 *     `media_player.ovunque` in the footer directly). An entity is never an
 *     Area and has no Area Page of its own, so #14 invents no navigation for
 *     it here -- a `media_player` in the footer stays exactly the transport
 *     strip it already was, Placement and Rendering contract both unchanged.
 *   - additionally, on every Page that is not `page:main`: a `HomeBlock`,
 *     prepended before anything Placed. See its own comment below for why it
 *     exists and why it sits outside the Areas-then-entities order.
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
 *     `footer` above and `FaultTile.tsx`'s own header comment. If a future
 *     protocol revision defines Area-in-glance, this is the one line to
 *     change. #14 leaves `glance` itself otherwise untouched: it resolves
 *     per-Page like every other Region (decision 3), with no Page-specific
 *     special case here or in `Dashboard.tsx`.
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
import { useNavigation } from './NavigationContext';
import { RoomRow } from './RoomRow';
import { Stats } from './Stats';
import { t } from './theme';
import { Tile } from './Tile';

/**
 * An entity placed in `left`, `right` or the footer, dispatched by Domain --
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
 * layout (three cameras placed together in `left`, per the ticket)
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
 * The footer's Area block: a tappable surface that opens `page:<area id>`
 * (#14). Built and styled here rather than as a fifth exported `src/ui/`
 * component, because it has exactly one caller and no state of its own --
 * `RoomRow`, `GateSlab` and the rest earned their own files by being reused
 * across Regions; this is not.
 *
 * Modelled on `GateSlab`'s slab shape (full tappable surface, icon over
 * name) rather than on `RoomRow`'s row shape, because the footer is a strip
 * of equal-weight blocks (docs/protocol.md: "media, and the blocks that open
 * other pages"), not a vertical list -- the same reason the deleted
 * `NavBar.tsx`'s destinations were also slabs in a row, not rows in a list.
 *
 * The Page it opens is `area.id`, not `area.name` -- the fixture that proves
 * why: `id: salone, name: Soggiorno` (fake-house/manifest.yaml). Home
 * Assistant's own label slugifying (#12) is what makes `openPage(area.id)`
 * line up with a Label typed as `page:salone` in Home Assistant's UI --
 * `usePage`/`resolvePage` slugify *both* the stored Label and the requested
 * Page name with the same `slugify()` (`src/ha/placement.ts`) before
 * comparing, so passing the id here is what docs/protocol.md's worked
 * example means by "tap -> page:corridoio": the Area's registry id is the
 * Page name, by construction of the protocol, not a separate mapping this
 * file has to maintain.
 */
function AreaOpenerBlock({ area }: { area: Area }) {
  const { openPage } = useNavigation();
  return (
    // `flex: '0 0 auto'`, not `flex: 1`: a page button is a control sized to
    // its own label, not a Region claiming a share of the floor. Measured at
    // 1280x800 -- with `flex: 1` the single Corridoio block took 591 px, half
    // the panel, purely because it was the only other flex item beside the
    // media strip. The footer's *remaining* width belongs to `MediaBar`,
    // which is a transport strip and genuinely wants it.
    <div title={`Apri ${area.name}`} style={{ display: 'flex', flex: '0 0 auto', minWidth: 0 }}>
      {/*
        `paddingBlock` overrides `Tile`'s own `md` padding, which is sized for
        a tile with a state line under a title, not for a compact footer slab.
        The arithmetic that matters (measured, not assumed): 26 icon + 4 gap +
        16 label = 46 of content, so anything over 18 px of vertical padding
        puts the block past `layout.footerH` (64) -- and because `footerH` is
        a `minHeight`, content winning there silently steals the left column's
        pixels rather than scrolling the footer.
      */}
      <Tile disableModal style={{ minWidth: 0, paddingBlock: t.space.sm }} onClick={() => openPage(area.id)}>
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
            reading the deleted `NavBar.tsx`'s icons gave its own
            destinations.

            26 over `caption`, not 32 over `glanceM`: the larger pair made
            this block 91 px tall, which overrode `layout.footerH` (a
            `minHeight`, so content wins) and took back the exact 32 px the
            token comment says were measured *out* of the footer to give the
            left column -- clipping ChipRow's fault chip against the gates.
            These are the proportions the deleted `NavBar.tsx` used for the
            same slab in the same strip, and they leave the block inside 64 px.
          */}
          <Icon name={area.icon ?? 'mdi:arrow-right-bold-box-outline'} size={26} />
          <span style={{ fontSize: t.font.caption, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{area.name}</span>
        </div>
      </Tile>
    </div>
  );
}

/**
 * The renderer-supplied home block (#14, decision 2): not Placed by any
 * Label, prepended to the footer of every Page except `page:main` itself.
 *
 * Why this is the one exception to "the frontend holds no layout"
 * (CONTEXT.md, ADR-0005): every other Page exists because an Area or entity
 * was labelled `page:<name>`, but nothing symmetric labels a way *back*.
 * Without this block, each new Page is a dead end the moment someone taps
 * into it unless whoever is labelling the house remembers to also place a
 * `page:main` block pointing at it -- and forgetting one traps whoever is
 * standing at the panel next, on a wall-mounted pane with no back gesture
 * (#8 ruled that out for the same discoverability reason the deleted `NavBar.tsx`
 * originally chose a bar) and no address bar to type their way out of.
 * Decision 5 (flat navigation, no history stack) makes "go home" the only
 * universal escape, so the renderer supplies it itself rather than trust it
 * to be labelled correctly on every Page, forever.
 *
 * It does not violate docs/protocol.md's ordering rule ("Areas first, then
 * entities, each in registry order"): that rule governs *Placed* things, and
 * this block is not Placed -- it carries no Placement Label, is
 * not read from any registry, and does not appear in the `Placed[]`
 * `usePage` hands to `PlacementView`. It is prepended in
 * `PlacementView`'s render below, outside and before the ordered list, which
 * is why it can sit before every Area block without bending the order those
 * blocks are in.
 *
 * Styled as the same kind of thing as `AreaOpenerBlock` (a tappable slab in
 * the footer strip) but visually distinguishable as *home* rather than as
 * another Area: `mdi:home` where an Area block shows the Area's own registry
 * icon or the generic arrow-box, and the Italian "Casa" rather than an Area
 * name, since the house is Italian and its UI copy is Italian throughout
 * (map Notes).
 */
function HomeBlock() {
  const { openPage } = useNavigation();
  return (
    <div title='Torna alla pagina principale' style={{ display: 'flex', flex: '0 0 auto', minWidth: 0 }}>
      {/* Same padding treatment as `AreaOpenerBlock` -- see its note. */}
      <Tile disableModal style={{ minWidth: 0, paddingBlock: t.space.sm }} onClick={() => openPage('main')}>
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
          <Icon name='mdi:home' size={26} />
          <span style={{ fontSize: t.font.caption, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>Casa</span>
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
    // Hero, ChipRow and Stats are therefore all plain `flexShrink: 0` boxes,
    // and the scroll-snapping that used to live here is gone along with the
    // scroller it existed to tame. `ChipRow` keeps its own *horizontal*
    // snapping, which is a different mechanism for a different overflow --
    // more concerns than fit on one line (see ChipRow.tsx).
    //
    // The order stays Hero -> ChipRow -> Stats, which was variant D's
    // hero/stats/chips reversed when this block became a scroller ("whatever
    // is lowest is what starts out of view, and the verdict outranks the
    // stats"). That justification is gone with the scroll -- nothing is out
    // of view now -- so the order is a free choice, and it is kept because
    // ADR-0004's ranking still describes what matters most: the chip that
    // says something is wrong with the house belongs directly under the
    // number you read on approach, not below the watts.
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.sm,
      }}
    >
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
      <div style={{ flexShrink: 0, paddingTop: 10 }}>
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
 * (`src/ha/registry.ts`), not a second one. `useNavigation()` (#14) is read
 * the same way, unconditionally, to know the current Page name -- needed
 * only to decide whether the `footer` Region also gets a `HomeBlock`.
 */
export function PlacementView({ region, placed }: { region: Region; placed: Placed[] }) {
  const areas = useAreas();
  const { page } = useNavigation();

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
      {/*
        The home block, prepended before anything Placed -- see `HomeBlock`'s
        own comment for why it exists and why sitting outside the ordered
        `placed.map` below does not violate docs/protocol.md's ordering rule.
        `page !== 'main'` is decision 2's stated exception: `page:main` is
        already home, so a block that opens it there would be a control
        pointing at the screen already on screen.
      */}
      {region === 'footer' && page !== 'main' && <HomeBlock key='home' />}
      {placed.map((item, i) => {
        if (item.kind === 'area') {
          if (region === 'footer') {
            return <AreaOpenerBlock key={item.area.id} area={item.area} />;
          }
          // left / right: the Row, unchanged from variant D.
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
 * again here for the same reason `AreaOpenerBlock` and `HomeBlock` cite it: a
 * dead control that looks live is worse than one that admits it is not
 * there. Four silent, empty Regions would look like a rendering failure --
 * indistinguishable from the panel being broken -- while this message is the
 * renderer admitting, in Italian, that there is nothing here yet. A blank
 * panel looks broken; a message is an admission.
 *
 * `Dashboard.tsx` decides *when* to show this (all four Regions empty) and
 * is responsible for making sure the footer -- home block included -- still
 * renders around it: the footer's own `Placed[]` for this Page is part of
 * "all four Regions empty" too, but the `HomeBlock` is not Placed (see its
 * own comment) and so is unaffected by the Page having nothing Placed on it.
 * Every non-main Page therefore keeps its way home even when it has nothing
 * else -- exactly the trap decision 2 exists to prevent, and the reason this
 * message does not substitute for the footer, only for the four Regions'
 * absent content above it.
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
