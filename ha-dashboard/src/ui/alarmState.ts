/**
 * What an alarm panel's state means, worded once.
 *
 * Home Assistant has five distinct armed states plus `arming`, `pending` and
 * `triggered`. Two components read them -- the tile and the sidebar chip --
 * and a naive `state !== 'disarmed'` test would show a reassuring shield for
 * a panel that is mid-countdown or actually going off. Sharing the test is
 * the same reason `stateLabel` exists: a state is interpreted once, and the
 * chip cannot disagree with the tile beside it.
 */
import type { Entity } from '../ha';

const ARMED = new Set(['armed_home', 'armed_away', 'armed_night', 'armed_vacation', 'armed_custom_bypass']);

/** Fully armed: the house is being watched. */
export const isArmed = (entity: Entity) => ARMED.has(entity.state);

/** Going off right now. Outranks every other alarm state. */
export const isTriggered = (entity: Entity) => entity.state === 'triggered';

/** The MDI icon for an alarm in this state. */
export function alarmIcon(entity: Entity): string {
  if (entity.unavailable) return 'mdi:alert-circle';
  if (isTriggered(entity)) return 'mdi:bell-ring';
  if (isArmed(entity)) return 'mdi:shield-lock';
  // `arming` and `pending` land here: not yet armed, so not yet reassuring.
  return 'mdi:shield-off-outline';
}
