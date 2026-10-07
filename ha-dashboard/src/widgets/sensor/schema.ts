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
import { entityKindSchema } from '../shared/domains';

export const sensorSchema = entityKindSchema('sensor', ['full', 'compact']);
