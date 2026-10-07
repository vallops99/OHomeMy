/**
 * A gate or a door that locks, Casa Panel's `AccessRow` (#43, #52): hold
 * Apri to open while it is closed, tap Chiudi to close while it is open. The
 * hold is where the safety is: a gate opened by a stray tap is a gate open
 * onto the street (`ui/accessHold.ts`).
 *
 * One form, in a card of its own; in a Group, one of the Group's entries.
 *
 * Its Default title is the entity's own name. Unavailable, it is the Fault
 * tile (`shared/shapes.tsx`).
 */
import { entityKindSchema } from '../shared/domains';

export const lockSchema = entityKindSchema('lock', ['full']);
