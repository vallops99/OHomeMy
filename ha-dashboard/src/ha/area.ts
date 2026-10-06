/**
 * Which Area an entity is in (#38), by Home Assistant's own rule (CONTEXT.md):
 * the Area it is assigned to; failing that, its device's; failing that, its
 * device's parent device's. One parent level, as Home Assistant's frontend
 * (`getEntityAreaId`) does, and for every Domain alike.
 *
 * The pure half, tested under plain Node; `useEntities` (`./registry`) feeds
 * it the live device registry.
 */

/**
 * One device registry entry, as far as Area membership needs it. Home
 * Assistant sends `parent_device_id`, but @hakit's `DeviceRegistryEntry` does
 * not declare it, so it is spelled out here.
 */
export type DeviceEntry = { area_id?: string | null; parent_device_id?: string | null };

/** The entity's effective Area id, or `null` when nothing assigns it one. */
export function effectiveAreaId(
  areaId: string | null | undefined,
  deviceId: string | null | undefined,
  devices: Record<string, DeviceEntry | undefined> | null | undefined
): string | null {
  if (areaId) return areaId;
  const device = deviceId ? devices?.[deviceId] : undefined;
  if (!device) return null;
  if (device.area_id) return device.area_id;
  const parent = device.parent_device_id ? devices?.[device.parent_device_id] : undefined;
  return parent?.area_id ?? null;
}
