/**
 * The Concern list's pure half (#30, CONTEXT.md "Concern list"): the rows
 * that list shows.
 *
 * The entities come from the Concern's own, never from a second pass over
 * the house: the list shows exactly what the chip counts, by the one rule in
 * `src/ha/verdict.ts`.
 *
 * No React and no @hakit (types only), so `concernList.test.ts` runs it
 * under plain Node. `ConcernList.tsx` renders what this decides.
 */
import type { Area, Entity } from '../ha';
import { fmt, tr } from '../i18n';
import { stateLabel } from './stateLabel';

/**
 * One row of a Concern list: the entity, its Area's name (or the words for
 * none) and, for a Malfunction, the state it is in (`null` for the rest).
 */
export type ConcernRow = { entity: Entity; areaName: string; stateText: string | null };

const byName = fmt.compare;

/**
 * A Concern's entities as rows: by Area name, then entity name, with the
 * rows in no Area last whatever their name sorts as. The same order for
 * every Concern. `noArea` names the rows in no Area. A Malfunction's rows
 * also carry the state, in the viewer's language.
 */
export function concernRows(
  concern: { level?: string; entities: readonly Entity[] },
  areas: Area[],
  noArea: string = tr('chips.noArea')
): ConcernRow[] {
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
  return rows.map(r => ({
    entity: r.entity,
    areaName: r.areaName ?? noArea,
    stateText: concern.level === 'malfunction' ? stateLabel(r.entity) : null,
  }));
}
