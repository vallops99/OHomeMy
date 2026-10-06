/**
 * What a Room Tile says and offers (#51, CONTEXT.md), read off its Area and
 * the light and temperature its Widget names. `ui/roomTile.ts` did this from
 * the `main` Label; here nothing is Derived, so a tile shows exactly what the
 * admin chose and says so when that is nothing.
 *
 * Kept apart from the component, as `ui/lightState.ts` is, so the one place
 * a Dashboard words "how lit is this room" is checked rather than looked at.
 * No React, no @hakit: it runs under plain Node.
 */
import type { Area, Entity } from '../../ha';
import { supportsBrightness } from '../../ui/lightState';
import { stateLabel } from '../../ui/stateLabel';

/** Every word a Room Tile shows, in one place for the strings module (#59). */
export const STRINGS = {
  noLight: 'No light chosen',
  on: 'On',
  off: 'Off',
  allOff: (lights: number) => `Off · ${lights} lights`,
  lightsOn: (on: number) => (on === 1 ? '1 light on' : `${on} lights on`),
  switchLabel: (area: string) => `${area} light`,
  dimmerLabel: (area: string) => `${area} brightness`,
};

export type RoomTileState = {
  /** The light the switch and dimmer drive, or null when none is chosen. */
  light: Entity | null;
  /**
   * Casa Panel's three tiles: a switch and a dimmer, a switch only, or
   * neither. Being dimmable is what a light is, not a state it is in, so a
   * tile never changes shape as the house changes state.
   */
  lights: 'dimmer' | 'switch' | 'none';
  /** Any of the Area's lights is on: the tile takes the lit surface. */
  lit: boolean;
  /** The chosen light is Unavailable: never hidden, always visibly faulted. */
  fault: boolean;
  /** "Off · 4 lights", "2 lights on", "On", then the temperature. */
  meta: string;
};

/**
 * A light group (`entity_id` lists its members) stands for other lights; one
 * standing beside them in the Area would count each of them twice. With
 * nothing but groups, the groups are the Area's lights and count as
 * themselves.
 */
const isGroup = (light: Entity) => Array.isArray(light.attributes.entity_id);

/**
 * The lights the meta line counts: the Area's, and the chosen one even when
 * the admin picked it from another Area, since it is the one the switch
 * drives.
 */
function counted(area: Area, chosen: Entity | null): Entity[] {
  const lights = area.entities.filter(e => e.domain === 'light');
  if (chosen && !lights.some(e => e.id === chosen.id)) lights.push(chosen);
  const single = lights.filter(e => !isGroup(e));
  return single.length > 0 ? single : lights;
}

function lightsMeta(lights: Entity[]): string {
  const on = lights.filter(e => e.state === 'on').length;
  if (lights.length === 1) return on === 1 ? STRINGS.on : STRINGS.off;
  return on === 0 ? STRINGS.allOff(lights.length) : STRINGS.lightsOn(on);
}

export function roomTile(area: Area, light: Entity | null, temperature: Entity | null): RoomTileState {
  const reading = temperatureReading(temperature);
  const withTemperature = (text: string) => (reading === null ? text : `${text} · ${reading}`);
  const all = counted(area, light);
  const lit = all.some(e => e.state === 'on');

  // No controls, but still lit while a light is on: the surface says what
  // the room is, whether or not this tile can change it.
  if (light === null) return { light, lights: 'none', lit, fault: false, meta: withTemperature(STRINGS.noLight) };
  const lights = supportsBrightness(light) ? 'dimmer' : 'switch';
  // A fault says what is wrong and nothing else: a lit surface or a count of
  // lights beside it would read as a room that is fine.
  if (light.unavailable) return { light, lights, lit: false, fault: true, meta: stateLabel(light) };
  return { light, lights, lit, fault: false, meta: withTemperature(lightsMeta(all)) };
}

/**
 * A temperature entity's reading as a Room Tile writes it, "20.5°", or null
 * when there is none to show. A thermostat gives its own
 * `current_temperature`, a sensor its state. Degrees, never the unit letter,
 * as Casa Panel writes a room's reading. One decimal, in English, until #59
 * follows the viewer's number format.
 */
export function temperatureReading(entity: Entity | null): string | null {
  if (!entity || entity.unavailable) return null;
  const raw = entity.domain === 'climate' ? entity.attributes.current_temperature : entity.state;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? `${value.toFixed(1)}°` : null;
}
