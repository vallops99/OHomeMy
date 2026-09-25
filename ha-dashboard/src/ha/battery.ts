/**
 * A device's battery level (#36), Derived like a camera's motion (CONTEXT.md):
 * the `battery` sensor on the thing's own **device**. A vacuum no longer
 * carries its battery as an attribute; Roborock's is a sensor of its own, on
 * the vacuum's device, and `diagnostic` -- so it never reaches `useEntities`,
 * which drops every entity category. This reads the registry itself.
 *
 * The pure half, tested under plain Node; `useDeviceBattery` (`./registry`)
 * feeds it the live registry and states.
 */

type Entry = { entity_id?: string; device_id?: string | null; entity_category?: string | null };
type State = { state: string; attributes: Record<string, unknown> };

/** The first battery sensor's level on `deviceId`, 0-100, or `null`. */
export function deviceBattery(entries: Entry[], states: Record<string, State | undefined>, deviceId: string | null): number | null {
  if (deviceId === null) return null;
  for (const entry of entries) {
    if (entry.device_id !== deviceId || !entry.entity_id?.startsWith('sensor.')) continue;
    const live = states[entry.entity_id];
    if (live?.attributes.device_class !== 'battery') continue;
    const level = Number(live.state);
    if (live.state !== '' && !Number.isNaN(level)) return level;
  }
  return null;
}
