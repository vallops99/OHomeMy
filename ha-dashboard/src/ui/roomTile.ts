/**
 * What a Room Tile says and offers, read off its Area (#42, CONTEXT.md).
 *
 * Kept apart from `RoomTile.tsx` for the reason `lightState.ts` is: a tile's
 * meta line is the one place the panel words "how lit is this room", and it
 * is checked here rather than by looking at the wall.
 *
 * Contents are Derived: the tile asks the Area for its `main` light and never
 * names an entity, so a rewired house changes nothing here.
 */
import type { Area, Entity } from '../ha';
import { supportsBrightness } from './lightState';
import { roomTemperature } from './roomTemperature';
import { stateLabel } from './stateLabel';

export type RoomTileState = {
  /** The light the switch and dimmer drive, or null when the Area has none. */
  main: Entity | null;
  /**
   * Casa Panel's three tiles: a switch and a dimmer, a switch only, or
   * neither. Being dimmable is what a light is, not a state it is in, so a
   * tile never changes shape as the house changes state.
   */
  lights: 'dimmer' | 'switch' | 'none';
  /** Any of the Area's lights is on: the tile takes the lit surface. */
  lit: boolean;
  /** The `main` light is Unavailable: never hidden, always visibly faulted. */
  fault: boolean;
  /** "Spente · 4 luci", "4 luci accese", "Accesa", then the temperature. */
  meta: string;
};

/**
 * The lights the meta line counts. The `main` light is excluded when others
 * stand beside it: it is their Aggregate (CONTEXT.md), and counting it too
 * would count every light it stands for twice. With no others it is the
 * Area's only light, and counts as itself.
 */
function counted(area: Area): Entity[] {
  const lights = area.entities.filter(e => e.domain === 'light');
  const others = lights.filter(e => !e.labels.includes('main'));
  return others.length > 0 ? others : lights;
}

function lightsMeta(lights: Entity[]): string {
  const on = lights.filter(e => e.state === 'on').length;
  if (lights.length === 1) return on === 1 ? 'Accesa' : 'Spenta';
  if (on === 0) return `Spente · ${lights.length} luci`;
  return on === 1 ? '1 luce accesa' : `${on} luci accese`;
}

export function roomTile(area: Area): RoomTileState {
  // `pickMain`'s rule, restated: importing it pulls @hakit, which does not
  // load under `node --test`. The `main` light, else the Area's first light.
  const inArea = area.entities.filter(e => e.domain === 'light');
  const main = inArea.find(e => e.labels.includes('main')) ?? inArea[0] ?? null;
  const temperature = roomTemperature(area);
  const withTemperature = (text: string) => (temperature === null ? text : `${text} · ${temperature}`);

  if (main === null) return { main, lights: 'none', lit: false, fault: false, meta: withTemperature('Nessuna luce collegata') };
  const lights = supportsBrightness(main) ? 'dimmer' : 'switch';
  // A fault says what is wrong and nothing else: a lit surface or a count of
  // lights beside it would read as a room that is fine.
  if (main.unavailable) return { main, lights, lit: false, fault: true, meta: stateLabel(main) };

  const all = counted(area);
  return {
    main,
    lights,
    lit: main.state === 'on' || all.some(e => e.state === 'on'),
    fault: false,
    meta: withTemperature(lightsMeta(all)),
  };
}
