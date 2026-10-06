/**
 * An `alarm_control_panel` (#34, #52), with no PIN (decision on #8).
 *
 * - `full`: its state, and as buttons every arm mode it supports or, when it
 *   is not disarmed, the disarm (`AlarmPanel`).
 * - `compact`: one tile; a tap arms away or disarms, the arriving and
 *   leaving gesture (`AlarmTile`).
 *
 * Its Default title is the entity's own name. Unavailable, it is the Fault
 * tile (`shared/shapes.tsx`).
 */
import { defineSchema } from '../../document/schema';
import { KIND_DOMAINS } from '../shared/domains';

export const alarmSchema = defineSchema({
  kind: 'alarm',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    entity: { type: 'entity', domains: KIND_DOMAINS.alarm },
  },
});
