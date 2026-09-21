/**
 * Screens are Composed from a typed array of Slots (CONTEXT.md).
 *
 * Map Notes require that swapping and moving components be an easy TypeScript
 * edit. That is what this shape buys: reordering tiles is moving a line,
 * swapping a component is changing one `kind`, and the union type means an
 * invalid screen does not compile. Area *contents* stay Derived -- a Slot says
 * "the Salone tile goes here", never which lights are in it.
 *
 * #9 owns this format properly; this is the minimum that proves the
 * components compose.
 */
import { pickMain, useAreas, useByLabel, type Area } from '../ha';
import { GateSlab, Grid, RoomTile, StatusPanel } from '../ui';

export type Slot =
  | { kind: 'room'; area: string; icon?: string; colSpan?: number; rowSpan?: number }
  | { kind: 'gates'; colSpan?: number; rowSpan?: number }
  | { kind: 'status'; colSpan?: number; rowSpan?: number };

function StatusSlot({ areas, slot }: { areas: Area[]; slot: Extract<Slot, { kind: 'status' }> }) {
  // Derived, like everything else: the first Area reporting a temperature.
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
      colSpan={slot.colSpan}
      rowSpan={slot.rowSpan}
    />
  );
}

/** Renders a Composed screen. */
export function Screen({ slots }: { slots: Slot[] }) {
  const areas = useAreas();
  const gates = useByLabel('gate');

  return (
    <Grid>
      {slots.map((slot, i) => {
        switch (slot.kind) {
          case 'status':
            return <StatusSlot key={i} areas={areas} slot={slot} />;
          case 'gates':
            return gates.map(gate => <GateSlab key={gate.id} entity={gate} colSpan={slot.colSpan} rowSpan={slot.rowSpan} />);
          case 'room': {
            const area = areas.find(a => a.id === slot.area);
            if (!area) return null;
            return <RoomTile key={area.id} area={area} icon={slot.icon} colSpan={slot.colSpan} rowSpan={slot.rowSpan} />;
          }
        }
      })}
    </Grid>
  );
}
