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
import { defineSchema } from '../../document/schema';
import { KIND_DOMAINS } from '../shared/domains';

export const climateSchema = defineSchema({
  kind: 'climate',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    entity: { type: 'entity', domains: KIND_DOMAINS.climate },
  },
});
