/**
 * What an alarm panel's state means, worded once.
 *
 * Home Assistant has five distinct armed states plus `arming`, `pending` and
 * `triggered`. Three things read them -- the tile, the sidebar chip and its Modal --
 * and a naive `state !== 'disarmed'` test would show a reassuring shield for
 * a panel that is mid-countdown or actually going off. Sharing the test is
 * the same reason `stateLabel` exists: a state is interpreted once, and the
 * chip cannot disagree with the tile beside it.
 */
import type { Entity } from '../ha';
import { tr } from '../i18n';

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

/**
 * One thing the alarm offers: a service to call, worded for the button.
 * `short` is for the full alarm card (#34), where the alarm is already named
 * above the buttons and three of them share a 420 px column: "Inserisci fuori
 * casa" (Italian's arm away) wrapped there, and doubled the buttons' height.
 */
export type AlarmCommand = { service: string; label: string; short: string; icon: string };

/**
 * The arm modes Home Assistant's `supported_features` bits name, in the order
 * the Modal offers them. `trigger` (8) and custom bypass (16) are not modes
 * anyone arms on the way out. Worded when asked for, in the viewer's
 * language.
 */
const ARM_MODES: { bit: number; service: string; icon: string; words: () => { label: string; short: string } }[] = [
  {
    bit: 1,
    service: 'alarm_arm_home',
    icon: 'mdi:shield-home',
    words: () => ({ label: tr('alarm.arm_home'), short: tr('alarm.arm_home.short') }),
  },
  {
    bit: 2,
    service: 'alarm_arm_away',
    icon: 'mdi:shield-lock',
    words: () => ({ label: tr('alarm.arm_away'), short: tr('alarm.arm_away.short') }),
  },
  {
    bit: 4,
    service: 'alarm_arm_night',
    icon: 'mdi:shield-moon',
    words: () => ({ label: tr('alarm.arm_night'), short: tr('alarm.arm_night.short') }),
  },
  {
    bit: 32,
    service: 'alarm_arm_vacation',
    icon: 'mdi:shield-airplane',
    words: () => ({ label: tr('alarm.arm_vacation'), short: tr('alarm.arm_vacation.short') }),
  },
];

/**
 * What the alarm Modal offers (#30): the supported arm modes while disarmed,
 * and a disarm in every other state -- armed, mid-countdown or going off.
 * An Unavailable alarm is never commanded. No command carries a code
 * (decision on #8), exactly as `AlarmTile`'s press does not.
 */
export function alarmCommands(entity: Entity): AlarmCommand[] {
  if (entity.unavailable) return [];
  if (entity.state !== 'disarmed')
    return [{ service: 'alarm_disarm', label: tr('alarm.disarm'), short: tr('alarm.disarm'), icon: 'mdi:shield-off-outline' }];
  const features = Number(entity.attributes.supported_features) || 0;
  return ARM_MODES.filter(m => features & m.bit).map(({ service, icon, words }) => ({ service, icon, ...words() }));
}
