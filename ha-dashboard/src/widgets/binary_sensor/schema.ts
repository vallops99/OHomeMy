/**
 * A `binary_sensor` (#34, #52), worded by device class: a contact reads open
 * or closed, and an open one is drawn as an open way in. Read only.
 *
 * - `full`: a row (`BinarySensorTile`).
 * - `compact`: a block, the state over the name (`BinarySensorBlock`).
 *
 * Its Default title is the entity's own name. Unavailable, it is the Fault
 * tile (`shared/shapes.tsx`).
 */
import { defineSchema } from '../../document/schema';
import { KIND_DOMAINS } from '../shared/domains';

export const binarySensorSchema = defineSchema({
  kind: 'binary_sensor',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    entity: { type: 'entity', domains: KIND_DOMAINS.binary_sensor },
  },
});
