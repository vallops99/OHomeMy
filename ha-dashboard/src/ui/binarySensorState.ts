/**
 * A `binary_sensor` worded by its device class (#34), read once for both its
 * row and its footer block.
 *
 * A contact -- a door, a window, an opening -- reads `Aperta`/`Chiusa`, and
 * "open" is exactly what the Verdict counts as an open way in (`isOpenDoor`),
 * with the Verdict's own icon for it: the tile and the chip cannot disagree
 * about the same door.
 */
import type { Entity } from '../ha';
import { isOpenDoor } from '../ha/health';
import { LEVEL_ICON } from './levelIcon';
import { stateLabel } from './stateLabel';

export type BinarySensorView = {
  /** Italian, for the tile. */
  label: string;
  icon: string;
  /** An open way into the house: drawn as the Verdict draws one. */
  open: boolean;
};

/** Per device class: the word and the icon for on and for off. */
const CLASSES: Record<string, { on: string; off: string; iconOn: string; iconOff: string }> = {
  door: { on: 'Aperta', off: 'Chiusa', iconOn: LEVEL_ICON.open, iconOff: 'mdi:door-closed' },
  window: { on: 'Aperta', off: 'Chiusa', iconOn: 'mdi:window-open', iconOff: 'mdi:window-closed' },
  opening: { on: 'Aperta', off: 'Chiusa', iconOn: 'mdi:square-outline', iconOff: 'mdi:square' },
  problem: { on: 'Problema', off: 'OK', iconOn: 'mdi:alert-circle', iconOff: 'mdi:check-circle' },
  motion: { on: 'Movimento', off: 'Nessun movimento', iconOn: 'mdi:motion-sensor', iconOff: 'mdi:motion-sensor-off' },
  moisture: { on: 'Bagnato', off: 'Asciutto', iconOn: 'mdi:water', iconOff: 'mdi:water-off' },
};

export function binarySensorView(entity: Entity): BinarySensorView {
  const cls = CLASSES[entity.attributes.device_class as string];
  const on = entity.state === 'on';
  if (entity.unavailable) return { label: stateLabel(entity), icon: 'mdi:alert-circle', open: false };
  if (!cls)
    return { label: stateLabel(entity), icon: on ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline', open: false };
  return { label: on ? cls.on : cls.off, icon: on ? cls.iconOn : cls.iconOff, open: isOpenDoor(entity) };
}
