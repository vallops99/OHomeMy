/**
 * The Home Assistant data seam.
 *
 * @hakit/core is imported only inside `src/ha/`, never above it (`./index`),
 * and this module is its registries' side: everything above it speaks the
 * plain types in `./types`. The #3 rules -- denylist, Domain ranking --
 * live here and in `./entities` so no screen or component restates them.
 *
 * `usePage` lives here too, as the hook over the pure `resolvePage`
 * (`./placement`): keeping every React and @hakit import in this file is what
 * lets the placement resolver run under plain Node in its tests.
 */
import { useHass, useRegistryData } from '@hakit/core';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { deviceBattery } from './battery';
import { houseEntities, type LiveState, type RegistryEntry } from './entities';
import { resolvePage, type PageLayout } from './placement';
import type { Area, AreaId, Entity, EntityId, Label } from './types';

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
 * Whether the `ignored` Label still takes entities off screen. Only the
 * label-driven `Dashboard` turns it on (`App.tsx`), and it goes with the
 * label code at the cutover (#61). A Dashboard of the document, its Builder
 * and its Concerns read no Label (ADR-0015, #64): a Widget names its
 * entities, and nothing else decides whether they are shown.
 */
const MutesIgnored = createContext(false);
export const IgnoredLabelMute = MutesIgnored.Provider;

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
  const muteIgnored = useContext(MutesIgnored);

  return useMemo(
    () =>
      houseEntities(Object.values(registry ?? {}) as RegistryEntry[], states as Record<string, LiveState> | undefined, devices, {
        muteIgnored,
      }),
    [registry, devices, states, muteIgnored]
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
 *
 * Unlike the entity display registry, the area registry arrives uncompressed
 * and @hakit stores `config/area_registry/list` verbatim -- so `labels` needs
 * no re-expansion and is carried straight through (#12). It holds label ids,
 * which are Home Assistant's slugified spelling of the label name.
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
      const area = raw as { area_id?: string; name?: string; labels?: string[]; icon?: string | null };
      const list = byArea.get(area.area_id ?? id) ?? [];
      list.sort((a, b) => rank(a.domain) - rank(b.domain) || a.id.localeCompare(b.id));
      return {
        id: area.area_id ?? id,
        name: area.name ?? id,
        labels: (area.labels ?? []) as Label[],
        // Uncompressed, arrives alongside `labels` in the same registry
        // payload (#13) -- no re-expansion needed, unlike the entity display
        // registry's compressed keys noted above.
        icon: area.icon ?? null,
        entities: list,
      };
    });
  }, [areasRegistry, entities]);
}

/**
 * The entity carrying `main` for a Domain within an Area -- the Aggregate that
 * stands for every entity of that Domain there (CONTEXT.md). Falls back to the
 * first entity of the Domain so an Area with no Aggregate still renders.
 */
export function pickMain(area: Area, domain: string): Entity | null {
  const inDomain = area.entities.filter(e => e.domain === domain);
  return inDomain.find(e => e.labels.includes('main')) ?? inDomain[0] ?? null;
}

/** Every entity of a Domain, wherever it lives. For screens that place a whole Domain. */
export function useByDomain(domain: string): Entity[] {
  const entities = useEntities();
  return useMemo(
    () => [...entities.values()].filter(e => e.domain === domain).sort((a, b) => a.id.localeCompare(b.id)),
    [entities, domain]
  );
}

/**
 * What the house is drawing right now, in watts.
 *
 * Derived like everything else: it asks for the `power` device_class rather
 * than naming the electrical panel's sensor, so the reading follows the house
 * if the meter is replaced. Returns null when nothing reports one -- the
 * panel then shows no consumption stat at all rather than a fake zero, which
 * on a wall panel would read as "the house is drawing nothing".
 *
 * Deliberately instantaneous, not the cumulative kWh counter beside it: a
 * month-to-date total is not something anyone can act on while standing at
 * the door.
 */
export function usePower(): number | null {
  const entities = useEntities();
  return useMemo(() => {
    for (const e of entities.values()) {
      if (e.domain !== 'sensor' || e.unavailable) continue;
      if (e.attributes.device_class !== 'power') continue;
      const value = Number(e.state);
      if (!Number.isNaN(value)) return value;
    }
    return null;
  }, [entities]);
}

/**
 * Every Label id, in Home Assistant's label-registry order, kept current as
 * Labels are added and removed.
 *
 * What picks between several Pages something could lead to (`placedPageFor`):
 * the camera chip's Feeds (#29), a footer member's chevron and the glance's
 * temperature and consumption (#32). @hakit keeps no label registry of its
 * own, so this asks for it over the websocket and asks again whenever Home
 * Assistant announces a change. Empty until the first answer: a glance then
 * picks by Page name, and corrects itself a moment later.
 */
export function useLabelOrder(): Label[] {
  const connection = useHass(s => s.connection);
  const [order, setOrder] = useState<Label[]>([]);

  useEffect(() => {
    if (!connection) return;
    let live = true;
    const load = () =>
      connection
        .sendMessagePromise<{ label_id: string }[]>({ type: 'config/label_registry/list' })
        .then(labels => {
          if (live) setOrder(labels.map(l => l.label_id));
        })
        .catch(() => {});
    load();
    const unsubscribe = connection.subscribeEvents(load, 'label_registry_updated');
    return () => {
      live = false;
      unsubscribe.then(unsub => unsub()).catch(() => {});
    };
  }, [connection]);

  return order;
}

/** Every entity carrying a Label, wherever it lives. Singletons are found this way. */
export function useByLabel(label: Label): Entity[] {
  const entities = useEntities();
  return useMemo(
    () => [...entities.values()].filter(e => e.labels.includes(label)).sort((a, b) => a.id.localeCompare(b.id)),
    [entities, label]
  );
}

/**
 * One Page's layout from the live Areas and entities, memoized against the
 * registries and the Page name. The resolving itself is `resolvePage`
 * (`./placement`), which stays free of React and @hakit so it can be tested
 * under plain Node; this hook is the thin wrapper that feeds it.
 */
export function usePage(page: string): PageLayout {
  const areas = useAreas();
  const entities = useEntities();
  return useMemo(() => resolvePage(areas, entities, page), [areas, entities, page]);
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
