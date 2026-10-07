/**
 * A `sensor`'s current value, worded for its tile (#33). Current value only:
 * history graphs are out of scope (#31), so this is a reading, not a trend.
 */
import type { Entity } from '../ha';
import { fmt } from '../i18n';
import { stateLabel } from './stateLabel';

/**
 * The value and its unit. A number gets at most one decimal, in the
 * viewer's number format; text stays as Home Assistant reports it. An Unavailable sensor says
 * so, with no unit: "Unavailable °C" would be nonsense.
 */
export function sensorReading(entity: Entity): { value: string; unit: string | null } {
  if (entity.unavailable) return { value: stateLabel(entity), unit: null };
  const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : null;
  const n = Number(entity.state);
  if (entity.state === '' || Number.isNaN(n)) return { value: stateLabel(entity), unit: null };
  return { value: fmt.reading(n), unit };
}

/** Home Assistant's own default icons for the common sensor device classes. */
const CLASS_ICON: Record<string, string> = {
  temperature: 'mdi:thermometer',
  humidity: 'mdi:water-percent',
  power: 'mdi:flash',
  energy: 'mdi:lightning-bolt',
  battery: 'mdi:battery',
  illuminance: 'mdi:brightness-5',
  pressure: 'mdi:gauge',
  carbon_dioxide: 'mdi:molecule-co2',
  voltage: 'mdi:sine-wave',
  current: 'mdi:current-ac',
};

/** A custom icon set in Home Assistant, else the device class's, else a gauge. */
export function sensorIcon(entity: Entity): string {
  const custom = entity.attributes.icon;
  if (typeof custom === 'string' && custom) return custom;
  return CLASS_ICON[entity.attributes.device_class as string] ?? 'mdi:gauge';
}
