/**
 * One thing that is on or off, toggled by a tap: a light, a switch, a fan, a
 * siren or an `input_boolean`. A light that can be dimmed also gets its dimmer.
 *
 * - `full`: a row, icon, title and state, with the dimmer beside them or,
 *   in a narrow box, under them.
 * - `compact`: a block, icon over title and state; the brightness is read,
 *   not set.
 *
 * Its Default title is the entity's own name.
 */
import { entityKindSchema } from '../shared/domains';

export const toggleSchema = entityKindSchema('toggle', ['full', 'compact']);
