/**
 * The Room Tile (CONTEXT.md): one Area, its name, how many of its lights are
 * on, its temperature, and a switch for its chosen light, with a dimmer when
 * that light can be dimmed.
 *
 * The light and the temperature are settings, where the `main` Label used to
 * say which (ADR-0015): nothing is picked behind the admin's back. With no
 * light chosen the tile has no controls and says so; with no temperature
 * chosen it shows none.
 *
 * - `full`: Casa Panel's room tile, icon and switch over name and meta, the
 *   dimmer at its foot.
 * - `compact`: a row, icon, name and meta, the switch at its end; the
 *   brightness is not set here.
 *
 * Its Default title is the Area's own name.
 */
import { defineSchema, TILE_LIGHT_DOMAINS, TILE_TEMPERATURE_DOMAINS } from '../../document/schema';

export const roomTileSchema = defineSchema({
  kind: 'room_tile',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    // Its lights are counted on the meta line, so they are shown (`shows.ts`).
    area: { type: 'area', shows: ['light'] },
    // Both only while in its Area (ADR-0018, `inArea`).
    light: { type: 'entity', domains: TILE_LIGHT_DOMAINS, optional: true, inArea: 'area' },
    // A thermostat's own reading, or a temperature sensor's state.
    temperature: { type: 'entity', domains: TILE_TEMPERATURE_DOMAINS, optional: true, inArea: 'area' },
  },
});
