/**
 * The Chip Row (#53): Casa Panel's StatusChip pills in one row, saying
 * the Dashboard's Concerns and, when chosen, its cameras and its alarm.
 *
 * - A Fault chip and an open-way-in chip, whenever the Dashboard has one,
 *   counted over everything it shows on any Page. Each opens its Concern
 *   list.
 * - The camera chip, for the cameras chosen here: how many, and whether any
 *   is Unavailable or sees motion. None chosen, no chip.
 * - The alarm chip, for the alarm chosen here: its state. It opens the
 *   alarm's dialog, where arming and disarming happen.
 *
 * With nothing to say the row is empty.
 */
import { defineSchema } from '../../document/schema';

export const chipRowSchema = defineSchema({
  kind: 'chip_row',
  variants: ['full'],
  titled: false,
  settings: {
    cameras: { type: 'entities', domains: ['camera'], min: 0 },
    alarm: { type: 'entity', domains: ['alarm_control_panel'], optional: true },
  },
});
