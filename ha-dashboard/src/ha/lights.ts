/**
 * Lights on, counted light by light (#77; CONTEXT.md "Light group",
 * "Concern"). The one rule every place that counts lights uses: the
 * Verdict's lit Concern, a Room Tile's meta line, the phone's `houseReport`.
 *
 * A Light group is never counted itself; it counts as its members. A light
 * reached both through a group and directly is counted once. A Light group
 * is found by `groupMemberIds`, the check Groups have everywhere.
 *
 * Pure, no React, no @hakit: it runs under plain Node.
 */
import { groupMemberIds } from './placement';
import type { Entity } from './types';

/** A light that stands for other lights (its `entity_id` / `group_entities` lists them). */
export const isLightGroup = (e: Entity): boolean => e.domain === 'light' && groupMemberIds(e) !== null;

/**
 * The lights these stand for, on or off: each Light group replaced by its
 * members (`find` looks a member up anywhere in the house; one it does not
 * have is left out), each light once, in the order found.
 */
export function countedLights(lights: Iterable<Entity>, find: (id: string) => Entity | undefined): Entity[] {
  const out = new Map<string, Entity>();
  const seen = new Set<string>();
  const add = (e: Entity) => {
    if (e.domain !== 'light' || seen.has(e.id)) return;
    seen.add(e.id);
    const members = groupMemberIds(e);
    if (members === null) out.set(e.id, e);
    else
      for (const id of members) {
        const member = find(id);
        if (member) add(member);
      }
  };
  for (const e of lights) add(e);
  return [...out.values()];
}
