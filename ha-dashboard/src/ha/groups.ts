/**
 * Home Assistant Groups (ADR-0014). Pure, no React or @hakit, so it runs
 * under plain Node in its tests.
 */
import type { Entity } from './types';

/**
 * A Group's members (ADR-0014): the `entity_id` attribute a Home Assistant
 * Group helper carries, in its order, or `null` for anything that is not one.
 * Every entity with that attribute is a Group, whatever its Domain.
 *
 * An Unavailable helper loses `entity_id` and keeps only `group_entities`
 * (seen on Home Assistant 2026.9, all of a Lock group's members down), and
 * a Group must still show its members then, so that is read as well.
 */
export function groupMemberIds(entity: Entity): string[] | null {
  const ids = entity.attributes.entity_id ?? entity.attributes.group_entities;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : null;
}
