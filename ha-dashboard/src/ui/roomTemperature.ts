/**
 * A Room Tile's temperature: what the room is, not what a device in it is
 * (CONTEXT.md, `main`).
 *
 * A `climate` entity's own `current_temperature` comes first, for the reason
 * #8 found at house level: the house is full of devices that report their own
 * chip temperature, and an Amazon Echo in Camera Chri wins a naive scan --
 * putting a speaker's self-heating on the wall as the room's reading. Device
 * class is not intent.
 *
 * A room with no thermostat uses the temperature `sensor` carrying `main`,
 * the Label that says "this is the room's". It used to take any temperature
 * sensor without an `entity_category`, and the Echo's could only be kept off
 * the Room Tile by muting it everywhere with `ignored` -- which also kept it off the
 * Clima Page that Places it on purpose (#33).
 */
import type { Area } from '../ha';

const degrees = (value: number) => value.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function roomTemperature(area: Area): string | null {
  const thermostat = area.entities.find(e => e.domain === 'climate' && !e.unavailable);
  const fromClimate = Number(thermostat?.attributes.current_temperature);
  if (thermostat && thermostat.attributes.current_temperature != null && !Number.isNaN(fromClimate)) return `${degrees(fromClimate)}°`;

  const sensor = area.entities.find(
    e => e.domain === 'sensor' && e.attributes.device_class === 'temperature' && e.labels.includes('main') && !e.unavailable
  );
  if (!sensor) return null;
  const value = Number(sensor.state);
  if (Number.isNaN(value)) return null;
  // Degrees, never the unit letter: Casa Panel writes a room's reading as
  // "20,5°", the same whether a thermostat or a sensor reports it (#42).
  return `${degrees(value)}°`;
}
