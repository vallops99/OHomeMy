/**
 * What a Dashboard shows (#53, ADR-0015): every entity its Widgets put on
 * screen, on any of its Pages. Faults and Concerns are counted over this and
 * nothing else (CONTEXT.md, Fault): an Unavailable entity no Widget of this
 * Dashboard shows is not this Dashboard's to report, even if another
 * Dashboard shows it.
 *
 * Read off each kind's schema, never per kind, so a kind added later counts
 * with no change here:
 *
 * - an `entity`, `entities` or `members` setting names its entities, which
 *   are shown;
 * - an `entity` setting that is `inArea` (a Room Tile's light or
 *   temperature), and a Room Grid Area's chosen light and temperature, are
 *   shown while in that Area (`inAreas`, ADR-0018);
 * - an `area` or `areas` setting shows, from each Area, the entities of the
 *   Domains its field lists in `shows`, as a Room Tile counts its lights;
 * - a shown Light group shows its members too (#77, CONTEXT.md "Light
 *   group"), though no Widget names them: `isShown` is given the house's
 *   Light groups for that.
 *
 * A Widget the renderer would skip (unknown kind, refused by its schema)
 * shows nothing, since nothing of it is on screen; `validateWidget` decides
 * that, with the same Page grid the renderer gives it.
 *
 * Every Page counts, a Popup's too: what a Dashboard shows is not only what
 * is on screen this moment, or a camera on the cameras' Page could go dark
 * unreported while the Home Page is up.
 *
 * No React, no @hakit: `shows.test.ts` runs this under plain Node.
 */
import { groupMemberIds } from '../ha/groups';
import type { Entity } from '../ha/types';
import { validateWidget, type AreaMember, type House, type Member, type WidgetSchema } from './schema';
import type { Dashboard } from './types';

export type DashboardShows = {
  /** Entities a Widget's setting names. */
  entities: ReadonlySet<string>;
  /** Areas a Widget's setting names, each with the Domains shown from it. */
  areas: ReadonlyMap<string, ReadonlySet<string>>;
  /**
   * Entities a Room Tile chose as its light or temperature (ADR-0018), each
   * with the Areas it was chosen for. Shown only in one of them: in another
   * the tile reads it as unset. The Area is known only to the entity
   * (`isShown`), so the rule is applied there and `House` is unchanged.
   */
  inAreas: ReadonlyMap<string, ReadonlySet<string>>;
};

/**
 * `schemaOf` is the registry's lookup (`widgetKind(kind)?.schema`), passed in
 * so this stays free of the kinds' components. With `house`, entities and
 * Areas Home Assistant no longer has are dropped as the renderer drops them.
 */
export function dashboardShows(dashboard: Dashboard, schemaOf: (kind: string) => WidgetSchema | undefined, house?: House): DashboardShows {
  const entities = new Set<string>();
  const areas = new Map<string, Set<string>>();
  const inAreas = new Map<string, Set<string>>();
  const addChosen = (id: string | null, area: string) => {
    if (id !== null) inAreas.set(id, (inAreas.get(id) ?? new Set<string>()).add(area));
  };
  const addArea = (id: string, domains: readonly string[] = []) => {
    const shown = areas.get(id) ?? new Set<string>();
    domains.forEach(d => shown.add(d));
    areas.set(id, shown);
  };

  for (const page of dashboard.pages) {
    const grid = { ...page.grid, overflow: dashboard.settings.overflow };
    for (const widget of page.widgets) {
      const schema = schemaOf(widget.kind);
      const valid = validateWidget(widget, schema, { grid, house });
      if (!valid.ok || !schema) continue;
      for (const [key, spec] of Object.entries(schema.settings)) {
        const value = (valid.settings as Record<string, unknown>)[key];
        switch (spec.type) {
          case 'entity':
            if (typeof value !== 'string') break;
            // A Room Tile's light or temperature: its Area's own.
            if (spec.inArea) addChosen(value, String((valid.settings as Record<string, unknown>)[spec.inArea]));
            else entities.add(value);
            break;
          case 'entities':
            (value as string[]).forEach(id => entities.add(id));
            break;
          case 'members':
            (value as Member[]).forEach(m => entities.add(m.entity));
            break;
          case 'area':
            if (typeof value === 'string') addArea(value, spec.shows);
            break;
          case 'areas':
            (value as AreaMember[]).forEach(m => {
              addArea(m.area, spec.shows);
              addChosen(m.light, m.area);
              addChosen(m.temperature, m.area);
            });
            break;
        }
      }
    }
  }
  return { entities, areas, inAreas };
}

/**
 * Whether a setting names this entity itself, as a Room Tile names its
 * light: a Group's Member, or a Room Tile's choice while in that tile's Area.
 */
export function isNamed(shows: DashboardShows, entity: { id: string; areaId: string | null }): boolean {
  if (shows.entities.has(entity.id)) return true;
  return entity.areaId !== null && (shows.inAreas.get(entity.id)?.has(entity.areaId) ?? false);
}

type Shown = { id: string; domain: string; areaId: string | null };

const isShownDirectly = (shows: DashboardShows, entity: Shown): boolean =>
  isNamed(shows, entity) || (entity.areaId !== null && (shows.areas.get(entity.areaId)?.has(entity.domain) ?? false));

/**
 * Whether the Dashboard shows this entity: named, shown from its Area, or a
 * member of a Light group shown either way (#77). `lightGroups` are the
 * house's Light groups (`isLightGroup`); without them only what a Widget
 * names or shows from an Area is shown.
 */
export function isShown(shows: DashboardShows, entity: Shown, lightGroups: Iterable<Entity> = []): boolean {
  if (isShownDirectly(shows, entity)) return true;
  for (const group of lightGroups) {
    if (groupMemberIds(group)?.includes(entity.id) && isShownDirectly(shows, group)) return true;
  }
  return false;
}
