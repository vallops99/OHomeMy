/**
 * The Concern list's pure half (#30, CONTEXT.md "Concern list"): which
 * Concern a tapped chip still stands for, and the rows that list shows.
 *
 * The entities come from `Health.entities`, never from a second pass over
 * the house: the list shows exactly what the chip counts, by the one rule in
 * `src/ha/health.ts`.
 *
 * No React and no @hakit (types only), so `concernList.test.ts` runs it
 * under plain Node. `ConcernList.tsx` renders what this decides.
 */
import type { Area, Entity, Health, HealthLevel, HouseReport } from '../ha';

/** What a row says for an entity in no Area. */
export const NO_AREA = 'Senza stanza';

/** One row of a Concern list: the entity, and its Area's name (or `NO_AREA`). */
export type ConcernRow = { entity: Entity; areaName: string };

/**
 * The Concern of this level in the report, or `null` once it has cleared --
 * which is what closes an open list. `ok` is a verdict but never a Concern.
 */
export function liveConcern(report: HouseReport, level: HealthLevel): Health | null {
  if (level === 'ok') return null;
  return [report.verdict, ...report.also].find(h => h.level === level) ?? null;
}

const byName = (a: string, b: string) => a.localeCompare(b, 'it', { sensitivity: 'base' });

/**
 * A Concern's entities as rows: by Area name, then entity name, with the
 * rows in no Area last whatever their name sorts as. The same order for
 * every Concern. `noArea` names the rows in no Area.
 */
export function concernRows(concern: Pick<Health, 'entities'>, areas: Area[], noArea: string = NO_AREA): ConcernRow[] {
  const names = new Map(areas.map(a => [a.id, a.name]));
  const rows = concern.entities.map(entity => ({
    entity,
    inArea: entity.areaId !== null && names.has(entity.areaId),
    areaName: names.get(entity.areaId ?? ''),
  }));
  rows.sort((a, b) => {
    if (a.inArea !== b.inArea) return a.inArea ? -1 : 1;
    return byName(a.areaName ?? '', b.areaName ?? '') || byName(a.entity.name, b.entity.name);
  });
  return rows.map(r => ({ entity: r.entity, areaName: r.areaName ?? noArea }));
}
