/**
 * The Room Grid's own decisions (#51), beside `ui/roomGrid.ts`'s sizing table
 * and *All off* list, which it reuses: which of the grid's chosen lights and
 * temperatures belongs to which tile. No React, so it runs under plain Node.
 */
import type { Area, Entity } from '../../ha';

/** Every word a Room Grid shows itself, for the strings module (#59). */
export const STRINGS = {
  defaultTitle: 'Rooms',
  allOff: 'All off',
};

/**
 * The entity of `ids` a tile shows for its Area: the first of the list that
 * is in that Area, in the list's order, so an admin who chose two lights in
 * one room gets the first. Null when none is, which is a tile with nothing
 * chosen, never one with a light picked for it.
 */
export function chosenIn(area: Area, ids: readonly string[]): Entity | null {
  for (const id of ids) {
    const entity = area.entities.find(e => e.id === id);
    if (entity) return entity;
  }
  return null;
}
