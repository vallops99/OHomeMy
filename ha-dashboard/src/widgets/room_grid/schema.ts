/**
 * The Room Grid (CONTEXT.md): a chosen set of Areas as Room Tiles under one
 * title, with a control that turns off every light in all of them.
 *
 * The Areas are a setting, in the order the tiles take; no Label Places them
 * any more (ADR-0015). Each tile's light and temperature are chosen here
 * too, as one list each across the grid: a tile takes the first of the list
 * that is in its Area, and an Area with none in the list has no light, or no
 * temperature, exactly as a Room Tile with none chosen.
 *
 * - `full`: Casa Panel's room tiles, with their dimmers.
 * - `compact`: the tiles as rows, with no dimmers, so more Areas fit.
 *
 * Its Default title is "Rooms".
 */
import { defineSchema } from '../../document/schema';

export const roomGridSchema = defineSchema({
  kind: 'room_grid',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    // Their lights are counted on each tile's meta line, so they are shown.
    areas: { type: 'areas', shows: ['light'] },
    lights: { type: 'entities', domains: ['light'], min: 0 },
    temperatures: { type: 'entities', domains: ['climate', 'sensor'], min: 0 },
  },
});
