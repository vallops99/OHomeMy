/**
 * The Home Assistant data seam.
 *
 * @hakit/core is imported only inside `src/ha/`, never above it (`./index`),
 * and this module is its registries' side: everything above it speaks the
 * plain types in `./types`. The #3 rules -- denylist, Domain ranking --
 * live here and in `./entities` so no screen or component restates them.
 */
import { useHass, useRegistryData } from '@hakit/core';
import { useMemo } from 'react';
import { deviceBattery } from './battery';
import { houseEntities, type LiveState, type RegistryEntry } from './entities';
import type { Area, AreaId, Entity, EntityId } from './types';

export { isUnavailableState } from './entities';

/**
 * Display order within an Area (#3): by Domain rank, then entity_id. Anything
 * unranked sorts after the ranked domains but stays visible -- a new Domain
 * appearing in the house must not silently vanish.
 */
const DOMAIN_RANK: Record<string, number> = {
  light: 0,
  switch: 1,
  lock: 2,
  cover: 3,
  climate: 4,
  media_player: 5,
  camera: 6,
  vacuum: 7,
  alarm_control_panel: 8,
  siren: 9,
  select: 10,
  binary_sensor: 11,
  sensor: 12,
};

const rank = (domain: string) => DOMAIN_RANK[domain] ?? 50;

/**
 * Every renderable entity, keyed by id, with registry facts and live state
 * already merged (`houseEntities`, `./entities`). Denylisted Domains and
 * `config` or `diagnostic` entities are gone, so callers never filter again.
 *
 * This reads the whole state map from one store subscription rather than
 * calling a per-entity hook. That matters: the home screen renders dozens of
 * tiles, and a hook per tile would mean a subscription per tile.
 */
export function useEntities(): Map<EntityId, Entity> {
  const registry = useRegistryData('entitiesRegistryDisplay');
  const devices = useRegistryData('devices');
  const states = useHass(s => s.entities);

  return useMemo(
    () => houseEntities(Object.values(registry ?? {}) as RegistryEntry[], states as Record<string, LiveState> | undefined, devices),
    [registry, devices, states]
  );
}

/**
 * One entity by id, or `null` when it is not in the registry at all -- a
 * different condition from Unavailable, which is an entity that exists but
 * cannot be reached, and which always renders.
 */
export function useEntityState(id: EntityId | null | undefined): Entity | null {
  const entities = useEntities();
  return id ? (entities.get(id) ?? null) : null;
}

/**
 * Every Area with its Derived contents, ordered by Domain rank then id.
 *
 * Area contents are Derived, never Composed: a new light in Giardino appears
 * here with no code change, which is the whole point of #3.
 */
export function useAreas(): Area[] {
  const areasRegistry = useRegistryData('areas');
  const entities = useEntities();

  return useMemo(() => {
    const byArea = new Map<AreaId, Entity[]>();
    entities.forEach(e => {
      if (!e.areaId) return;
      const list = byArea.get(e.areaId) ?? [];
      list.push(e);
      byArea.set(e.areaId, list);
    });

    return Object.entries(areasRegistry ?? {}).map(([id, raw]) => {
      const area = raw as { area_id?: string; name?: string; icon?: string | null };
      const list = byArea.get(area.area_id ?? id) ?? [];
      list.sort((a, b) => rank(a.domain) - rank(b.domain) || a.id.localeCompare(b.id));
      return {
        id: area.area_id ?? id,
        name: area.name ?? id,
        // The area registry arrives uncompressed (#13) -- no re-expansion
        // needed, unlike the entity display registry's compressed keys.
        icon: area.icon ?? null,
        entities: list,
      };
    });
  }, [areasRegistry, entities]);
}

/**
 * Turns a path Home Assistant hands out -- a media player's `entity_picture`,
 * `/api/media_player_proxy/...` -- into a URL this panel can load, since the
 * panel is not served by Home Assistant in development (#35).
 */
export function useHassUrl(): (path: string) => string {
  return useHass(s => s.helpers.joinHassUrl);
}

/**
 * Where an overlay portals to. Inside a Home Assistant panel this is a node
 * in the Dashboard's shadow root (#46), because `document.body` is outside it
 * and nothing styled there reaches it; standalone it is `document.body`.
 */
export function usePortalRoot(): HTMLElement {
  return useHass(s => s.portalRoot) ?? document.body;
}

/**
 * The battery level of an entity's device (#36): its `battery` sensor, even a
 * `diagnostic` one `useEntities` never returns. `null` with no device or no
 * such sensor -- and then nothing shows a battery, rather than a fake one.
 */
export function useDeviceBattery(entity: Entity): number | null {
  const registry = useRegistryData('entitiesRegistryDisplay');
  const states = useHass(s => s.entities);
  return useMemo(
    () =>
      deviceBattery(
        Object.values(registry ?? {}) as RegistryEntry[],
        (states ?? {}) as Record<string, { state: string; attributes: Record<string, unknown> }>,
        entity.deviceId
      ),
    [registry, states, entity.deviceId]
  );
}
