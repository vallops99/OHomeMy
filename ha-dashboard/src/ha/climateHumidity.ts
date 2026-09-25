/**
 * A thermostat's humidity, Derived (CONTEXT.md): its own `current_humidity`
 * when the climate entity reports one, else the `humidity` sensor on its own
 * **device**.
 *
 * Not the Area, for the reason `motion.ts` gives: an Area can hold several
 * humidity readings (an Echo, a weather module), and the device is the one
 * registry fact that says "this sensor is built into this thermostat". A
 * Netatmo Smarther is the case that asked for it: its climate entity carries
 * no humidity, and the reading sits on the same device as its own sensor.
 *
 * `null` when neither says anything readable. No React, no @hakit:
 * `climateHumidity.test.ts` runs it under plain Node.
 */
import type { Entity } from './types';

const reading = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

export function climateHumidity(climate: Entity, entities: Iterable<Entity>): number | null {
  const own = reading(climate.attributes.current_humidity);
  if (own !== null) return own;
  if (climate.deviceId === null) return null;
  for (const e of entities) {
    if (e.deviceId !== climate.deviceId || e.domain !== 'sensor' || e.unavailable) continue;
    if (e.attributes.device_class !== 'humidity') continue;
    const value = reading(e.state);
    if (value !== null) return value;
  }
  return null;
}
