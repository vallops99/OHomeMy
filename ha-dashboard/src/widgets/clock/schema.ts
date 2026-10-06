/**
 * The Clock (CONTEXT.md): the time and the date in the viewer's own formats.
 * Not an entity and not a control, so it has no settings and no title.
 *
 * - `full`: the time, with the date beside it or, in a narrow box, below it.
 * - `compact`: the time alone.
 */
import { defineSchema } from '../../document/schema';

export const clockSchema = defineSchema({
  kind: 'clock',
  variants: ['full', 'compact'],
  titled: false,
  settings: {},
});
