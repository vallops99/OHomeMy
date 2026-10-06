/**
 * A `select` (#36, #52): its name and current option in a row; a tap opens a
 * picker of every option, in our own tokens rather than the browser's.
 * One form.
 *
 * Its Default title is the entity's own name. Unavailable, it is the Fault
 * tile (`shared/shapes.tsx`).
 */
import { defineSchema } from '../../document/schema';
import { KIND_DOMAINS } from '../shared/domains';

export const selectSchema = defineSchema({
  kind: 'select',
  variants: ['full'],
  titled: true,
  settings: {
    entity: { type: 'entity', domains: KIND_DOMAINS.select },
  },
});
