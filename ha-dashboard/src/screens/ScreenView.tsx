/**
 * Renders a Composed screen (#9, reshaped for variant D's two regions).
 *
 * This is the only place that knows how a `kind` becomes a component, which
 * is what keeps a screen definition declarative: `home.ts` names what goes
 * where, this decides what that means.
 *
 * Slots are a flat list carrying a `region` tag, so this splits them into the
 * panel's two columns in the order the screen declares them.
 */
import {
  houseHumidity,
  houseReport,
  houseTemperature,
  usePower,
  useAreas,
  useByDomain,
  useByLabel,
  useEntities,
  type Area,
  type Entity,
} from '../ha';
import { AlarmTile, CameraGlance, ChipRow, FaultTile, GateSlab, Hero, MediaBar, NavBar, Panel, RoomRow, Stats, Strip, t } from '../ui';
import { spanFor, type Device, type Screen, type Slot } from './slots';

/**
 * Pick the component for an entity placed by Label.
 *
 * Labels are the vocabulary for what Area and Domain alone cannot express
 * (CONTEXT.md), so they are the right key here. Anything without a dedicated
 * component falls through to a fault tile rather than rendering nothing --
 * a screen asking for something unrenderable is a bug the panel should show.
 */
function entitySlot(entity: Entity) {
  if (entity.domain === 'lock') {
    return <GateSlab key={entity.id} entity={entity} />;
  }
  if (entity.domain === 'alarm_control_panel') {
    return <AlarmTile key={entity.id} entity={entity} />;
  }
  return <FaultTile key={entity.id} label={`Nessun componente: ${entity.domain}`} />;
}

export function ScreenView({ screen, device = 'tablet' }: { screen: Screen; device?: Device }) {
  const areas = useAreas();

  const indexed = screen.map((slot, i) => ({ slot, i }));
  const view = ({ slot, i }: { slot: Slot; i: number }) => <SlotView key={i} slot={slot} areas={areas} />;

  // The strip is the only part of the panel that tiles, so the slots that
  // carry a `span` are gathered out of the flow and laid out together along
  // the floor. Everything else in `main` is a row in a vertical flow.
  const isStrip = (slot: Slot) => slot.kind === 'media' || slot.kind === 'nav';
  const main = indexed.filter(({ slot }) => slot.region === 'main');

  return (
    <Panel
      sidebar={indexed.filter(({ slot }) => slot.region === 'sidebar').map(view)}
      main={
        <>
          {main.filter(({ slot }) => !isStrip(slot)).map(view)}
          <Strip
            items={main
              .filter(({ slot }) => isStrip(slot))
              .map(entry => ({
                node: view(entry),
                span: spanFor('span' in entry.slot ? entry.slot.span : undefined, device),
              }))}
          />
        </>
      }
    />
  );
}

/**
 * One slot. A component rather than a helper because several kinds need
 * hooks, and hooks cannot be called from inside a `.map` callback.
 */
function SlotView({ slot, areas }: { slot: Slot; areas: Area[] }) {
  // All called unconditionally: hooks cannot be conditional. Each is a filter
  // over the one whole-house subscription (#7), so this is cheap. `'ignored'`
  // is the no-op Label -- those entities are already gone from the registry,
  // so it can never match.
  const byLabel = useByLabel(
    slot.kind === 'group' || slot.kind === 'single' || slot.kind === 'gates' || slot.kind === 'chips' || slot.kind === 'cameras'
      ? slot.label
      : 'ignored'
  );
  // `''` is not a Domain any entity has, so this is the no-op case.
  const players = useByDomain(slot.kind === 'media' ? 'media_player' : '');
  const entities = useEntities();
  const watts = usePower();

  switch (slot.kind) {
    case 'hero':
      return <Hero temperature={houseTemperature(areas)} humidity={houseHumidity(areas)} />;

    case 'stats': {
      // Derived: a zone is lit when the Area's Aggregate -- the entity
      // carrying `main` -- is on. Counting every individual light would make
      // one room with five bulbs outshout five rooms with one.
      const lightsOn = [...entities.values()].filter(e => e.domain === 'light' && e.labels.includes('main') && e.state === 'on').length;
      return <Stats lightsOn={lightsOn} watts={watts} />;
    }

    case 'chips': {
      // Derived from every entity, not just the Areas': the alarm and other
      // Singletons belong to no Area and would be invisible to an Area walk.
      const report = houseReport([...entities.values()]);
      const alarm = byLabel.find(e => e.domain === 'alarm_control_panel') ?? null;
      return <ChipRow report={report} alarm={alarm} />;
    }

    case 'room': {
      const area = areas.find(a => a.id === slot.area);
      // The compiler rejects an unknown Area id, so this means the Area is
      // declared in the manifest but absent from Home Assistant's registry --
      // a real fault, shown rather than silently skipped (map Notes).
      if (!area) return <FaultTile label={`Area assente: ${slot.area}`} />;
      return <RoomRow area={area} icon={slot.icon} />;
    }

    case 'group':
      if (byLabel.length === 0) return <FaultTile label={`Nessuna entità: ${slot.label}`} />;
      return <>{byLabel.map(entity => entitySlot(entity))}</>;

    case 'single': {
      const entity = byLabel[slot.index ?? 0];
      if (!entity) return <FaultTile label={`Entità assente: ${slot.label}`} />;
      return entitySlot(entity);
    }

    case 'gates': {
      if (byLabel.length === 0) return <FaultTile label={`Nessun cancello: ${slot.label}`} />;
      // The primary gate is told apart by weight, not by size -- both stay
      // full-size touch targets (see GateSlab). Ranking rather than naming:
      // the house still decides how many exist.
      const primary = slot.primary ?? 0;
      return (
        // The gates take the sidebar's remaining height and share it between
        // themselves; `CameraGlance` above them keeps its intrinsic size, so
        // the primary affordance is what grows when the column has room.
        // The gates sit at the foot of the sidebar at a fixed height each.
        // `marginTop: auto` is what anchors them: the spare room collects
        // above the group as one flexible gap, so a chip appearing in the
        // row above takes space from the gap rather than from the controls.
        <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.md, marginTop: 'auto', flexShrink: 0 }}>
          {byLabel.map((entity, i) => (
            <GateSlab key={entity.id} entity={entity} primary={i === primary} />
          ))}
        </div>
      );
    }

    case 'cameras': {
      const cameras = byLabel.filter(e => e.domain === 'camera');
      if (cameras.length === 0) return <FaultTile label={`Nessuna camera: ${slot.label}`} />;
      return <CameraGlance cameras={cameras} areas={areas} />;
    }

    case 'media':
      return <MediaBar entities={players} />;

    case 'nav':
      return (
        <NavBar
          // A destination with no screen built yet renders disabled -- see
          // the note in ui/NavBar.tsx. There is no router, so `screen` being
          // present is all "built" can mean today.
          destinations={slot.destinations.map(d => ({
            label: d.label,
            icon: d.icon,
            onOpen: d.screen ? () => undefined : undefined,
          }))}
        />
      );
  }
}
