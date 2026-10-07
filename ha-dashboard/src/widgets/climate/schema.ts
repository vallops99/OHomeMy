/**
 * A thermostat, a `climate` entity (#33, #52).
 *
 * - `full`: the room's temperature and humidity, the setpoint with − and +,
 *   its HVAC modes and what it is doing (`ClimateCard`).
 * - `compact`: the temperature and the setpoint, read and not set
 *   (`ClimateBlock`).
 *
 * Its Default title is the entity's own name. Unavailable, it is the Fault
 * tile (`shared/shapes.tsx`).
 */
import { entityKindSchema } from '../shared/domains';

export const climateSchema = entityKindSchema('climate', ['full', 'compact']);
