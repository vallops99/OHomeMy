/**
 * Which of a Theme's two sets of values a Dashboard shows right now (#70,
 * ADR-0015 "Language and themes", CONTEXT.md "Mode", "Follow the house").
 *
 * `light` and `dark` are fixed. `follow-device` shows what the device
 * prefers. `follow-house` reads one entity: `above_horizon` or `on` is light,
 * `below_horizon` or `off` dark. Where the entity cannot say (`unavailable`,
 * `unknown`, gone) while connected, the device decides; where the device
 * cannot say either (no `prefers-color-scheme`), it is dark. A lost
 * connection changes nothing: the last state heard is not news, so the
 * Dashboard keeps what it shows until it is back.
 *
 * No React, no @hakit: the renderer and the Builder's preview both call this,
 * and its tests run under plain Node. When the switch is drawn, and whether
 * it fades, is the caller's (`renderer/useSchemeShown.ts`).
 */
import type { MODES } from '../document/types';
import type { ColorScheme } from './tokens';

export type ThemeMode = (typeof MODES)[number];

/** What the device answers to `prefers-color-scheme`: `none` where it cannot. */
export type DeviceScheme = ColorScheme | 'none';

export type SchemeInputs = {
  mode: ThemeMode;
  /** The `follow-house` entity's state; `null` when the house has no such entity. */
  houseState: string | null;
  /** Whether the connection to Home Assistant is up. */
  connected: boolean;
  device: DeviceScheme;
  /** What the Dashboard shows now; `null` before its first render. */
  previous: ColorScheme | null;
};

const HOUSE_STATES: Readonly<Record<string, ColorScheme>> = {
  above_horizon: 'light',
  on: 'light',
  below_horizon: 'dark',
  off: 'dark',
};

/** What the house's entity says, or `null` when it cannot say. */
export function houseScheme(state: string | null): ColorScheme | null {
  return (state !== null && HOUSE_STATES[state]) || null;
}

/** The device's preference, dark where it has none. */
const deviceOr = (device: DeviceScheme): ColorScheme => (device === 'none' ? 'dark' : device);

export function schemeShown({ mode, houseState, connected, device, previous }: SchemeInputs): ColorScheme {
  switch (mode) {
    case 'light':
    case 'dark':
      return mode;
    case 'follow-device':
      return deviceOr(device);
    case 'follow-house':
      if (!connected && previous !== null) return previous;
      return houseScheme(houseState) ?? deviceOr(device);
  }
}
