/**
 * The Room Grid (CONTEXT.md): a chosen set of Areas as Room Tiles under one
 * title, with a control that turns off every light in all of them.
 *
 * The Areas are a setting, in the order the tiles take; no Label Places them
 * any more (ADR-0015). Each is a Member (#75, #78) choosing its own light,
 * temperature and tap, the light and temperature only from its own Area
 * (ADR-0018); an Area with none chosen has no light, or no temperature,
 * exactly as a Room Tile with none chosen. The grid-wide `lights` and
 * `temperatures` lists of #51 are gone: a grid saved with either is not
 * shown until they are removed.
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
  },
});
