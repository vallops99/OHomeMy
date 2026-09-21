/**
 * Renders a Composed screen (#9, extended for the home screen in #8).
 *
 * This is the only place that knows how a `kind` becomes a component, which
 * is what keeps a screen definition declarative: `home.ts` names what goes
 * where, this decides what that means.
 */
import {
  houseHumidity,
  houseReport,
  houseTemperature,
  useAreas,
  useByDomain,
  useByLabel,
  useEntities,
  type Area,
  type Entity,
} from '../ha';
import { AlarmTile, CameraGlance, FaultTile, GateSlab, Grid, MediaBar, NavBar, RoomTile, StatusPanel } from '../ui';
import { spanFor, type Device, type Screen, type Slot } from './slots';

/**
 * Pick the component for an entity placed by Label.
 *
 * Labels are the vocabulary for what Area and Domain alone cannot express
 * (CONTEXT.md), so they are the right key here. Anything without a dedicated
 * component falls through to a fault tile rather than rendering nothing --
 * a screen asking for something unrenderable is a bug the panel should show.
 */
function entitySlot(entity: Entity, col: number, row: number) {
  if (entity.domain === 'lock') {
    return <GateSlab key={entity.id} entity={entity} colSpan={col} rowSpan={row} />;
  }
  if (entity.domain === 'alarm_control_panel') {
    return <AlarmTile key={entity.id} entity={entity} colSpan={col} rowSpan={row} />;
  }
  return <FaultTile key={entity.id} label={`Nessun componente: ${entity.domain}`} colSpan={col} rowSpan={row} />;
}

export function ScreenView({ screen, device = 'tablet' }: { screen: Screen; device?: Device }) {
  const areas = useAreas();

  return (
    <Grid>
      {screen.map((slot, i) => (
        <SlotView key={i} slot={slot} areas={areas} device={device} />
      ))}
    </Grid>
  );
}

/**
 * One slot. A component rather than a helper because several kinds need
 * hooks, and hooks cannot be called from inside a `.map` callback.
 */
function SlotView({ slot, areas, device }: { slot: Slot; areas: Area[]; device: Device }) {
  const { col, row } = spanFor(slot.span, device);

  // All called unconditionally: hooks cannot be conditional. Each is a filter
  // over the one whole-house subscription (#7), so this is cheap. `'ignored'`
  // is the no-op Label -- those entities are already gone from the registry,
  // so it can never match.
  const byLabel = useByLabel(
    slot.kind === 'group' || slot.kind === 'single' || slot.kind === 'gates' || slot.kind === 'alarm' || slot.kind === 'cameras'
      ? slot.label
      : 'ignored'
  );
  // `''` is not a Domain any entity has, so this is the no-op case.
  const players = useByDomain(slot.kind === 'media' ? 'media_player' : '');
  const entities = useEntities();

  switch (slot.kind) {
    case 'status': {
      // Derived from every entity, not just the Areas': the alarm and other
      // Singletons belong to no Area and would be invisible to an Area walk.
      const report = houseReport([...entities.values()]);
      return (
        <StatusPanel report={report} temperature={houseTemperature(areas)} humidity={houseHumidity(areas)} colSpan={col} rowSpan={row} />
      );
    }

    case 'room': {
      const area = areas.find(a => a.id === slot.area);
      // The compiler rejects an unknown Area id, so this means the Area is
      // declared in the manifest but absent from Home Assistant's registry --
      // a real fault, shown rather than silently skipped (map Notes).
      if (!area) return <FaultTile label={`Area assente: ${slot.area}`} colSpan={col} rowSpan={row} />;
      return <RoomTile area={area} icon={slot.icon} colSpan={col} rowSpan={row} />;
    }

    case 'group':
      if (byLabel.length === 0) return <FaultTile label={`Nessuna entità: ${slot.label}`} colSpan={col} rowSpan={row} />;
      return <>{byLabel.map(entity => entitySlot(entity, col, row))}</>;

    case 'single': {
      const entity = byLabel[slot.index ?? 0];
      if (!entity) return <FaultTile label={`Entità assente: ${slot.label}`} colSpan={col} rowSpan={row} />;
      return entitySlot(entity, col, row);
    }

    case 'gates': {
      if (byLabel.length === 0) return <FaultTile label={`Nessun cancello: ${slot.label}`} colSpan={col} rowSpan={row} />;
      // Every gate gets the slot's span -- both stay full-size touch targets.
      // The primary one is told apart by weight, not by size (see GateSlab).
      // Ranking rather than naming: the house still decides how many exist.
      const primary = slot.primary ?? 0;
      return (
        <>
          {byLabel.map((entity, i) => (
            <GateSlab key={entity.id} entity={entity} primary={i === primary} colSpan={col} rowSpan={row} />
          ))}
        </>
      );
    }

    case 'alarm': {
      const alarm = byLabel.find(e => e.domain === 'alarm_control_panel');
      if (!alarm) return <FaultTile label={`Allarme assente: ${slot.label}`} colSpan={col} rowSpan={row} />;
      return <AlarmTile entity={alarm} colSpan={col} rowSpan={row} />;
    }

    case 'cameras': {
      const cameras = byLabel.filter(e => e.domain === 'camera');
      if (cameras.length === 0) return <FaultTile label={`Nessuna camera: ${slot.label}`} colSpan={col} rowSpan={row} />;
      return <CameraGlance cameras={cameras} areas={areas} colSpan={col} rowSpan={row} />;
    }

    case 'media':
      return <MediaBar entities={players} colSpan={col} rowSpan={row} />;

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
          colSpan={col}
          rowSpan={row}
        />
      );
  }
}
