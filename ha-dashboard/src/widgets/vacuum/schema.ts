/**
 * A `vacuum` (#36, #52): its state, its battery from its own device, and
 * start or pause and back to the dock, each only when it can (`VacuumCard`).
 * One form.
 *
 * Its Default title is the entity's own name. Unavailable, it is the Fault
 * tile (`shared/shapes.tsx`).
 */
import { entityKindSchema } from '../shared/domains';

export const vacuumSchema = entityKindSchema('vacuum', ['full']);
