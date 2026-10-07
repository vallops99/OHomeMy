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
import { entityKindSchema } from '../shared/domains';

export const weatherSchema = entityKindSchema('weather', ['full', 'compact']);
