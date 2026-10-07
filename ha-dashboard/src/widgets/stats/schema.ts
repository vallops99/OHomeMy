/**
 * The stats (#53): Casa Panel's StatCards, an icon over one big number.
 *
 * - Lights on: how many lights are on, which is the lit Concern's count,
 *   so the card and the Verdict count by one rule: a light some Widget of
 *   this Dashboard stands for, on, on any Page.
 * - The house's draw, from the `power` sensor chosen here. None chosen, no
 *   card: a made-up "0 W" would read as the house drawing nothing.
 */
import { defineSchema } from '../../document/schema';

export const statsSchema = defineSchema({
  kind: 'stats',
  variants: ['full'],
  titled: false,
  settings: {
    power: { type: 'entity', domains: ['sensor'], optional: true },
  },
});
