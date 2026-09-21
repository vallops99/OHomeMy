/**
 * Renders a Composed screen (#9).
 *
 * This is the only place that knows how a `kind` becomes a component, which
 * is what keeps a screen definition declarative: `home.ts` names what goes
 * where, this decides what that means.
 */
import { pickMain, useAreas, useByLabel, type Area, type Entity } from '../ha';
import { FaultTile, GateSlab, Grid, RoomTile, StatusPanel } from '../ui';
import { spanFor, type Device, type Screen, type Slot } from './slots';

/** The house-wide status column. Derived, like everything else. */
function StatusSlot({ areas, col, row }: { areas: Area[]; col: number; row: number }) {
  let reading: string | null = null;
  for (const area of areas) {
    const sensor = area.entities.find(e => e.domain === 'sensor' && e.attributes.device_class === 'temperature' && !e.unavailable);
    if (sensor && !Number.isNaN(Number(sensor.state))) {
      reading = `${Number(sensor.state).toFixed(1)}°`;
      break;
    }
  }
  const lightsOn = areas.reduce((n, a) => n + (pickMain(a, 'light')?.state === 'on' ? 1 : 0), 0);

  return (
    <StatusPanel
      value={reading ?? '--'}
      label='Casa Carina'
      detail={lightsOn > 0 ? `${lightsOn} ${lightsOn === 1 ? 'zona accesa' : 'zone accese'}` : 'Tutto spento'}
      colSpan={col}
      rowSpan={row}
    />
  );
}

/**
 * Pick the component for an entity placed by Label.
 *
 * Labels are the vocabulary for what Area and Domain cannot express
 * (CONTEXT.md), so they are the right key here. Anything without a dedicated
 * component falls through to a fault tile rather than rendering nothing --
 * a screen asking for something unrenderable is a bug the panel should show.
 */
function entitySlot(entity: Entity, col: number, row: number) {
  if (entity.domain === 'lock') {
    return <GateSlab key={entity.id} entity={entity} colSpan={col} rowSpan={row} />;
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
 * One slot. A component rather than a helper because `group` and `single`
 * need a hook, and hooks cannot be called from inside a `.map` callback.
 */
function SlotView({ slot, areas, device }: { slot: Slot; areas: Area[]; device: Device }) {
  const { col, row } = spanFor(slot.span, device);
  // Called unconditionally: hooks cannot be conditional. `useByLabel` is a
  // filter over the one whole-house subscription (#7), so this is cheap.
  const labelled = useByLabel(slot.kind === 'group' || slot.kind === 'single' ? slot.label : 'ignored');

  switch (slot.kind) {
    case 'status':
      return <StatusSlot areas={areas} col={col} row={row} />;

    case 'room': {
      const area = areas.find(a => a.id === slot.area);
      // The compiler rejects an unknown Area id, so this means the Area is
      // declared in the manifest but absent from Home Assistant's registry --
      // a real fault, shown rather than silently skipped (map Notes).
      if (!area) return <FaultTile label={`Area assente: ${slot.area}`} colSpan={col} rowSpan={row} />;
      return <RoomTile area={area} icon={slot.icon} colSpan={col} rowSpan={row} />;
    }

    case 'group':
      if (labelled.length === 0) return <FaultTile label={`Nessuna entità: ${slot.label}`} colSpan={col} rowSpan={row} />;
      return <>{labelled.map(entity => entitySlot(entity, col, row))}</>;

    case 'single': {
      const entity = labelled[slot.index ?? 0];
      if (!entity) return <FaultTile label={`Entità assente: ${slot.label}`} colSpan={col} rowSpan={row} />;
      return entitySlot(entity, col, row);
    }
  }
}
