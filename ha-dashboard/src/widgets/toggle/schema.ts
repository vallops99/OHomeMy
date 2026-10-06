/**
 * One thing that is on or off, toggled by a tap: a light, a switch, a fan or
 * an `input_boolean`. A light that can be dimmed also gets its dimmer.
 *
 * - `full`: a row, icon, title and state, with the dimmer beside them or,
 *   in a narrow box, under them.
 * - `compact`: a block, icon over title and state; the brightness is read,
 *   not set.
 *
 * Its Default title is the entity's own name.
 */
import { defineSchema } from '../../document/schema';

export const toggleSchema = defineSchema({
  kind: 'toggle',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    entity: { type: 'entity', domains: ['light', 'switch', 'fan', 'input_boolean'] },
  },
});
