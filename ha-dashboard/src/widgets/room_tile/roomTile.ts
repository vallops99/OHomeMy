/**
 * What a Room Tile says and offers (#51, CONTEXT.md), read off its Area and
 * the light and temperature its Widget names. `ui/roomTile.ts` did this from
 * the `main` Label; here nothing is Derived, so a tile shows exactly what the
 * admin chose and says so when that is nothing.
 *
 * The light and temperature passed in are the Area's own (`inArea`).
 *
 * Kept apart from the component, as `ui/lightState.ts` is, so the one place
 * a Dashboard words "how lit is this room" is checked rather than looked at.
 * No React, no @hakit: it runs under plain Node.
 */
import type { Area, Entity } from '../../ha';
import { countedLights } from '../../ha/lights';
import { supportsBrightness } from '../../ui/lightState';
import { fmt, tr } from '../../i18n';
import { stateLabel } from '../../ui/stateLabel';

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
 * The entity a Room Tile shows as its light or temperature (ADR-0018):
 * `id` if it is in this Area, otherwise `null`, as for no choice. One in
 * another Area, or that Home Assistant no longer has, reads as unset: no
 * switch, dimmer or temperature. The one rule for a Room Tile Widget and a
 * Room Grid's Area alike; the document is not rewritten. The Builder reuses
 * it to mark a chosen value as not in this Area.
 */
export function inArea(area: Area, id: string | null): Entity | null {
  return id === null ? null : (area.entities.find(e => e.id === id) ?? null);
}

/**
 * The lights the meta line counts: the Area's, light by light (#77,
 * `countedLights`). The chosen light is one of them (`inArea`); a Light
 * group is its members, found anywhere in the house through `find`.
 */
function counted(area: Area, light: Entity | null, find: (id: string) => Entity | undefined): Entity[] {
  const lights = area.entities.filter(e => e.domain === 'light');
  return countedLights(light ? [...lights, light] : lights, find);
}

function lightsMeta(lights: Entity[]): string {
  const on = lights.filter(e => e.state === 'on').length;
  if (lights.length === 1) return on === 1 ? tr('roomTile.on') : tr('roomTile.off');
  return on === 0 ? tr('roomTile.allOff', { count: lights.length }) : tr('roomTile.lightsOn', { count: on });
}

/**
 * `find` looks up a Light group's members in the whole house; by default
 * only the Area's own entities are known.
 */
export function roomTile(
  area: Area,
  light: Entity | null,
  temperature: Entity | null,
  find: (id: string) => Entity | undefined = id => area.entities.find(e => e.id === id)
): RoomTileState {
  const reading = temperatureReading(temperature);
  const withTemperature = (text: string) => (reading === null ? text : `${text} · ${reading}`);
  const all = counted(area, light, find);
  const lit = all.some(e => e.state === 'on');

  // No controls, but still lit while a light is on: the surface says what
  // the room is, whether or not this tile can change it.
  if (light === null) return { light, lights: 'none', lit, fault: false, meta: withTemperature(tr('roomTile.noLight')) };
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
 * as Casa Panel writes a room's reading. One decimal, in the viewer's
 * number format (`20,5°` in Italian).
 */
export function temperatureReading(entity: Entity | null): string | null {
  if (!entity || entity.unavailable) return null;
  const raw = entity.domain === 'climate' ? entity.attributes.current_temperature : entity.state;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? fmt.degrees(value) : null;
}
