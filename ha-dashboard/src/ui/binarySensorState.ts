/**
 * A `binary_sensor` worded by its device class (#34), read once for both its
 * row and its footer block.
 *
 * A contact -- a door, a window, an opening -- reads open or closed, and
 * "open" is exactly what the Verdict counts as an open way in (`isOpenDoor`),
 * with the Verdict's own icon for it: the tile and the chip cannot disagree
 * about the same door.
 */
import type { Entity } from '../ha';
import { isOpenDoor } from '../ha/health';
import { tr } from '../i18n';
import { LEVEL_ICON } from './levelIcon';
import { stateLabel } from './stateLabel';

export type BinarySensorView = {
  /** In the viewer's language, for the tile. */
  label: string;
  icon: string;
  /** An open way into the house: drawn as the Verdict draws one. */
  open: boolean;
};

/** Per device class: the word and the icon for on and for off. Worded when asked for. */
const CLASSES: Record<string, { on: () => string; off: () => string; iconOn: string; iconOff: string }> = {
  door: { on: () => tr('binary.open'), off: () => tr('binary.closed'), iconOn: LEVEL_ICON.open, iconOff: 'mdi:door-closed' },
  window: { on: () => tr('binary.open'), off: () => tr('binary.closed'), iconOn: 'mdi:window-open', iconOff: 'mdi:window-closed' },
  opening: { on: () => tr('binary.open'), off: () => tr('binary.closed'), iconOn: 'mdi:square-outline', iconOff: 'mdi:square' },
  // "Needs refilling", not "Problem" (#36): this house's problem sensors are
  // the Roborock's water and the like, each of them something to refill. A
  // house whose problems are not refills will want this word changed.
  problem: {
    on: () => tr('binary.problem.on'),
    off: () => tr('binary.problem.off'),
    iconOn: 'mdi:alert-circle',
    iconOff: 'mdi:check-circle',
  },
  motion: {
    on: () => tr('binary.motion.on'),
    off: () => tr('binary.motion.off'),
    iconOn: 'mdi:motion-sensor',
    iconOff: 'mdi:motion-sensor-off',
  },
  moisture: { on: () => tr('binary.moisture.on'), off: () => tr('binary.moisture.off'), iconOn: 'mdi:water', iconOff: 'mdi:water-off' },
};

export function binarySensorView(entity: Entity): BinarySensorView {
  const cls = CLASSES[entity.attributes.device_class as string];
  const on = entity.state === 'on';
  if (entity.unavailable) return { label: stateLabel(entity), icon: 'mdi:alert-circle', open: false };
  if (!cls)
    return { label: stateLabel(entity), icon: on ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline', open: false };
  return { label: on ? cls.on() : cls.off(), icon: on ? cls.iconOn : cls.iconOff, open: isOpenDoor(entity) };
}
