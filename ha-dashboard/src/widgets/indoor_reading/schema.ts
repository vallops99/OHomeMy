/**
 * The Indoor Reading (CONTEXT.md, #65): one temperature, big enough to read
 * on approach from 2 m, with the humidity under it. It is the label-driven
 * panel's Hero as a Widget: the temperature and the humidity are settings,
 * where the Hero read whichever `climate` and `humidity` sensor were Placed.
 *
 * Both take a thermostat's own reading or a sensor's state. The temperature
 * is required, since without it there is nothing to read; with no humidity
 * chosen the line is not there.
 *
 * - `full`: the title over the number over the humidity, as the Hero.
 * - `compact`: the number beside the title and the humidity, for a strip.
 *
 * Its Default title is "Indoor": the arrival question at the entrance is
 * whether the house is comfortable, not the weather outside. Nothing
 * happens on a tap.
 */
import { defineSchema } from '../../document/schema';

export const indoorReadingSchema = defineSchema({
  kind: 'indoor_reading',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    temperature: { type: 'entity', domains: ['climate', 'sensor'] },
    humidity: { type: 'entity', domains: ['climate', 'sensor'], optional: true },
  },
});
