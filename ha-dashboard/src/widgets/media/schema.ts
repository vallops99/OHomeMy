/**
 * A `media_player` (#35, #52), with each control only when the player says
 * it can do it.
 *
 * - `full`: artwork, what is playing, volume, transport and power
 *   (`MediaCard`), folding in two in a narrow box.
 * - `compact`: a strip with what is playing and the transport, or a quiet
 *   line while nothing is (`MediaBar`).
 *
 * Its Default title is the entity's own name. Unavailable, it is the Fault
 * tile (`shared/shapes.tsx`).
 */
import { defineSchema } from '../../document/schema';
import { KIND_DOMAINS } from '../shared/domains';

export const mediaSchema = defineSchema({
  kind: 'media',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    entity: { type: 'entity', domains: KIND_DOMAINS.media },
  },
});
