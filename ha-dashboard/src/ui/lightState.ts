/**
 * What a single light can be asked to do, read off its state.
 *
 * Kept apart from `ToggleTile` for the reason `alarmState.ts` is: a state is
 * interpreted once, and the Area's `RoomRow` slider and a lone Placed light's
 * slider cannot disagree about what "50%" means.
 */
import type { Entity } from '../ha';

/**
 * The colour modes Home Assistant's own frontend treats as carrying a
 * brightness (`lightSupportsBrightness`). Everything but `onoff`, and
 * `unknown`, which is not a promise of anything.
 */
const DIMMABLE_MODES = new Set(['brightness', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww', 'white']);

/**
 * Whether a slider on this entity would do anything. Only a `light` can be
 * dimmed, and only one declaring a dimmable colour mode -- a light that
 * declares none is not assumed dimmable, because a slider that moves and
 * changes nothing is a dead control that looks live.
 */
export function supportsBrightness(entity: Entity): boolean {
  if (entity.domain !== 'light') return false;
  const modes = entity.attributes.supported_color_modes;
  return Array.isArray(modes) && modes.some(m => DIMMABLE_MODES.has(m as string));
}

/** Brightness 0-255 as Home Assistant reports it, as a 0-100 percentage. */
export function brightnessPercent(entity: Entity | null): number {
  const raw = entity?.attributes.brightness;
  if (typeof raw !== 'number') return 0;
  return Math.round((raw / 255) * 100);
}
