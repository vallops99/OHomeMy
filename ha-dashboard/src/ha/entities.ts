/**
 * The house's entities, from Home Assistant's registries and live states
 * (#3, #64). The pure half, tested under plain Node; `useEntities`
 * (`./registry`) feeds it the live registries.
 *
 * What is left out is what Home Assistant itself marks as never for a
 * dashboard: a denylisted Domain, or a `config` or `diagnostic` entity. No
 * Label is read: a Widget names its entities, and nothing else decides
 * whether they are shown (ADR-0015). The one exception is the label-driven
 * renderer, which still honours `ignored` until the cutover (#61) removes it.
 */
import type { House } from '../document/schema';
import { effectiveAreaId, type DeviceEntry } from './area';
import type { AreaId, Entity, EntityId, Label } from './types';

/**
 * Domains the dashboard never renders (#3). Infrastructure and plumbing that
 * would otherwise flood the panel.
 */
const DENYLIST = new Set(['update', 'automation', 'event', 'tts', 'device_tracker', 'sun', 'zone']);

/** Home Assistant's two ways of saying "I cannot reach this". */
export const isUnavailableState = (state: string | undefined) => state === 'unavailable' || state === 'unknown';

/**
 * One entry of Home Assistant's `entitiesRegistryDisplay`, as @hakit hands it
 * over.
 *
 * Home Assistant sends this registry compressed (`ei`, `ai`, `lb`, `hn`) and
 * @hakit expands the keys before we see them, so these are the long
 * spellings. Verified against the running instance rather than assumed: the
 * compressed names match nothing here.
 *
 * One expansion gap is worth knowing about. Home Assistant's `hn` -- "hidden
 * in the UI" -- is NOT re-expanded, so `hidden` would arrive undefined for
 * every entity and cannot be honoured.
 */
export type RegistryEntry = {
  entity_id?: string;
  area_id?: string | null;
  device_id?: string | null;
  labels?: string[];
  /**
   * Home Assistant's own marker for plumbing: `config` or `diagnostic`. It
   * sits on firmware-update buttons, device restart switches and the sun
   * integration's diagnostic timestamps -- things that belong on a device
   * page, never on a wall panel.
   */
  entity_category?: 'config' | 'diagnostic' | null;
};

/** One entity's live state, as Home Assistant reports it. */
export type LiveState = { state: string; attributes: Record<string, unknown> };

/**
 * Every renderable entity, keyed by id, with registry facts and live state
 * already merged. Denylisted Domains and `config` or `diagnostic` entities
 * are gone, so callers never filter again.
 *
 * `muteIgnored` is for the label-driven renderer alone, where the `ignored`
 * Label takes an entity off every screen (docs/protocol.md).
 */
export function houseEntities(
  registry: Iterable<RegistryEntry>,
  states: Record<string, LiveState | undefined> | null | undefined,
  devices: Record<string, DeviceEntry | undefined> | null | undefined,
  options: { muteIgnored?: boolean } = {}
): Map<EntityId, Entity> {
  const out = new Map<EntityId, Entity>();
  for (const entry of registry) {
    const id = entry.entity_id;
    if (!id) continue;

    const domain = id.split('.')[0];
    if (DENYLIST.has(domain)) continue;

    // `config` and `diagnostic` are Home Assistant's own marker for
    // plumbing that belongs on a device page rather than a dashboard:
    // firmware buttons, restart switches, the sun integration's six
    // diagnostic timestamps. Honouring the marker is the backend-driven
    // rule again -- Home Assistant has already classified these, so the
    // denylist does not have to grow a rule per integration.
    if (entry.entity_category) continue;

    const labels = (entry.labels ?? []) as Label[];
    if (options.muteIgnored && labels.includes('ignored')) continue;

    const live = states?.[id];
    // No live state at all means Home Assistant has the entity registered
    // but is not reporting it -- a fault, and rendered as one.
    const state = live?.state ?? 'unavailable';
    const attributes = live?.attributes ?? {};

    out.set(id, {
      id,
      domain,
      name: (attributes.friendly_name as string) ?? id,
      // The effective Area: the entity's own, else its device's (#38).
      areaId: effectiveAreaId(entry.area_id, entry.device_id, devices),
      deviceId: entry.device_id ?? null,
      labels,
      state,
      attributes,
      unavailable: isUnavailableState(state),
    });
  }
  return out;
}

/**
 * What the house has, for the schema module's checks (#50): an entity is in
 * the house when the Dashboard could render it at all, so a denylisted
 * Domain counts as gone. An Unavailable one is still there: it renders, as a
 * Fault.
 */
export function houseOf(entities: ReadonlyMap<EntityId, unknown>, areaIds: Iterable<AreaId>): House {
  const areas = new Set(areaIds);
  return { hasEntity: id => entities.has(id), hasArea: id => areas.has(id) };
}
