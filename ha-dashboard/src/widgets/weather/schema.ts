/**
 * A `weather` entity (#33, #52).
 *
 * - `full`: the condition now, the temperature and the next five days
 *   (`WeatherCard`).
 * - `compact`: the temperature and the condition, read as a sensor is.
 *
 * Its Default title is the entity's own name. Unavailable, it is the Fault
 * tile (`shared/shapes.tsx`).
 */
import { defineSchema } from '../../document/schema';
import { KIND_DOMAINS } from '../shared/domains';

export const weatherSchema = defineSchema({
  kind: 'weather',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    entity: { type: 'entity', domains: KIND_DOMAINS.weather },
  },
});
