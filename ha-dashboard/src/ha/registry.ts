/**
 * The Home Assistant data seam.
 *
 * This is the ONLY module that imports @hakit/core. Everything above it speaks
 * the plain types in `./types`. The #3 rules -- denylist, `ignored` label,
 * Domain ranking -- live here so no screen or component restates them.
 *
 * `usePage` lives here too, as the hook over the pure `resolvePage`
 * (`./placement`): keeping every React and @hakit import in this file is what
 * lets the placement resolver run under plain Node in its tests.
 */
import { useHass, useRegistryData } from '@hakit/core';
import { useMemo } from 'react';
import { resolvePage, type PageLayout } from './placement';
import type { Area, AreaId, Entity, EntityId, Label } from './types';

/**
 * Domains the dashboard never renders (#3). Infrastructure and plumbing that
 * would otherwise flood the panel. The per-entity escape hatch is the
 * `ignored` Label, applied in Home Assistant rather than in code.
 */
const DENYLIST = new Set(['update', 'automation', 'event', 'tts', 'device_tracker', 'sun', 'zone']);

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
 * every entity and cannot be honoured. The `ignored` Label is the working
 * equivalent, and it is the one CONTEXT.md documents.
 */
type RegistryEntry = {
  entity_id?: string;
  area_id?: string | null;
  labels?: string[];
  /**
   * Home Assistant's own marker for plumbing: `config` or `diagnostic`. It
   * sits on firmware-update buttons, device restart switches and the sun
   * integration's diagnostic timestamps -- things that belong on a device
   * page, never on a wall panel.
   */
  entity_category?: 'config' | 'diagnostic' | null;
};

/**
 * Every renderable entity, keyed by id, with registry facts and live state
 * already merged. Denylisted Domains and `ignored` entities are gone, so
 * callers never filter again.
 *
 * This reads the whole state map from one store subscription rather than
 * calling a per-entity hook. That matters: the home screen renders dozens of
 * tiles, and a hook per tile would mean a subscription per tile.
 */
export function useEntities(): Map<EntityId, Entity> {
  const registry = useRegistryData('entitiesRegistryDisplay');
  const states = useHass(s => s.entities);

  return useMemo(() => {
    const out = new Map<EntityId, Entity>();
    Object.values(registry ?? {}).forEach(raw => {
      const entry = raw as RegistryEntry;
      const id = entry.entity_id;
      if (!id) return;

      const domain = id.split('.')[0];
      if (DENYLIST.has(domain)) return;

      // `config` and `diagnostic` are Home Assistant's own marker for
      // plumbing that belongs on a device page rather than a dashboard:
      // firmware buttons, restart switches, the sun integration's six
      // diagnostic timestamps. Honouring the marker is the backend-driven
      // rule again -- Home Assistant has already classified these, so the
      // denylist does not have to grow a rule per integration.
      if (entry.entity_category) return;

      const labels = (entry.labels ?? []) as Label[];
      if (labels.includes('ignored')) return;

      const live = states?.[id];
      // No live state at all means Home Assistant has the entity registered
      // but is not reporting it -- a fault, and rendered as one.
      const state = live?.state ?? 'unavailable';
      const attributes = (live?.attributes ?? {}) as Record<string, unknown>;

      out.set(id, {
        id,
        domain,
        name: (attributes.friendly_name as string) ?? id,
        areaId: entry.area_id ?? null,
        labels,
        state,
        attributes,
        unavailable: isUnavailableState(state),
      });
    });
    return out;
  }, [registry, states]);
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

/** Every entity carrying a Label, wherever it lives. Singletons are found this way. */
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
