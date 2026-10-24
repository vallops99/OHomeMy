/**
 * The Dishwasher (CONTEXT.md, #81, ADR-0019): the first Widget that stands
 * for a device rather than one entity. Home Assistant has no `dishwasher`
 * Domain; a machine is a state sensor, a finish time, a door, warnings and
 * buttons, so each role is a setting of its own, as the Indoor Reading's.
 * Only the State is required. The Widget is built around Home Connect but
 * never names it.
 *
 * - `full`: state, countdown, progress bar, warnings and controls.
 * - `compact`: one line of state and countdown, with no progress bar.
 *
 * Ends at and Progress are Unavailable on purpose whenever nothing runs, so
 * they are never a Fault; the Door is a door of the machine, never an open
 * way in of the house.
 */
import { defineSchema } from '../../document/schema';

export const dishwasherSchema = defineSchema({
  kind: 'dishwasher',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    state: { type: 'entity', domains: ['sensor'], malfunction: ['error'] },
    ends_at: { type: 'entity', domains: ['sensor'], optional: true, neverFault: true },
    progress: { type: 'entity', domains: ['sensor'], optional: true, neverFault: true },
    door: { type: 'entity', domains: ['sensor', 'binary_sensor'], optional: true, notWayIn: true },
    salt: { type: 'entity', domains: ['sensor', 'binary_sensor'], optional: true },
    rinse_aid: { type: 'entity', domains: ['sensor', 'binary_sensor'], optional: true },
    start: { type: 'entity', domains: ['button', 'script'], optional: true },
    stop: { type: 'entity', domains: ['button'], optional: true },
    resume: { type: 'entity', domains: ['button'], optional: true },
    pause: { type: 'entity', domains: ['button'], optional: true },
    remote_start: { type: 'entity', domains: ['binary_sensor'], optional: true },
  },
});
