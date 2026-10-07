/**
 * What an Indoor Reading says (#65, CONTEXT.md), read off the temperature
 * and humidity entities its Widget names: `ui/Hero.tsx`'s two lines, with
 * nothing picked behind the admin's back.
 *
 * A thermostat gives its own `current_temperature` and `current_humidity`, a
 * sensor its state. The temperature is in whole degrees, as the wall has
 * always shown the number read from 2 m; the humidity in whole percent.
 *
 * Unavailable is said, never hidden (CONTEXT.md): `ui/Hero.tsx` drops its
 * humidity line when nothing reports one, which hides a broken sensor. Here
 * the line goes only when no humidity is chosen.
 *
 * No React, no @hakit: it runs under plain Node.
 */
import type { Entity } from '../../ha';
import { fmt, tr } from '../../i18n';

export type IndoorReadingState = {
  /** `21°`, or `--°` when there is no number to show. */
  temperature: string;
  /** The temperature's entity is Unavailable. */
  fault: boolean;
  /** `54% humidity`, or null when no humidity is chosen. */
  humidity: { text: string; fault: boolean } | null;
};

/** A thermostat's attribute, or a sensor's state, as a number; null when it is none. */
function valueOf(entity: Entity | null, attribute: string): number | null {
  if (!entity || entity.unavailable) return null;
  const raw = entity.domain === 'climate' ? entity.attributes[attribute] : entity.state;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function indoorReading(temperature: Entity | null, humidity: Entity | null): IndoorReadingState {
  const degrees = valueOf(temperature, 'current_temperature');
  return {
    temperature: degrees === null ? '--°' : fmt.wholeDegrees(degrees),
    fault: temperature?.unavailable ?? false,
    humidity: humidity === null ? null : humidityLine(humidity),
  };
}

function humidityLine(entity: Entity): { text: string; fault: boolean } {
  if (entity.unavailable) return { text: tr('state.unavailable'), fault: true };
  const value = valueOf(entity, 'current_humidity');
  const percent = value === null ? '--%' : fmt.percent(Math.round(value));
  return { text: tr('indoorReading.humidity', { percent }), fault: false };
}
