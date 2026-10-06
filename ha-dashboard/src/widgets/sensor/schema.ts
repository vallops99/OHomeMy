/**
 * A `sensor`'s current value (#33, #52): its name, value and unit, with an
 * icon by device class. Read only: a tap does nothing.
 *
 * - `full`: a row (`SensorTile`).
 * - `compact`: a block, the value over the name (`SensorBlock`).
 *
 * Its Default title is the entity's own name. Unavailable, it is the Fault
 * tile (`shared/shapes.tsx`).
 */
import { defineSchema } from '../../document/schema';
import { KIND_DOMAINS } from '../shared/domains';

export const sensorSchema = defineSchema({
  kind: 'sensor',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    entity: { type: 'entity', domains: KIND_DOMAINS.sensor },
  },
});
