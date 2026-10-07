/**
 * Whether this device is dark, followed as it changes (#66).
 *
 * The renderer follows the device with a `@media (prefers-color-scheme)`
 * rule (`themeCss`), which the browser re-applies by itself. The Builder's
 * preview cannot: it sets its Theme as custom properties on the preview's
 * screen only, so it reads the device here and redraws when the device
 * switches. The switch is instant; there is no one at the screen to fade
 * for.
 */
import { useSyncExternalStore } from 'react';
import type { ThemeMode } from './themes';

export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The part of a `MediaQueryList` this reads. */
export type DarkQuery = Pick<MediaQueryList, 'matches'> & {
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
};

export type DeviceScheme = {
  /** Whether the device is dark now. */
  get(): boolean;
  subscribe(listener: () => void): () => void;
};

/** `query` is `null` where there are no media queries; the device is then light. */
export function createDeviceScheme(query: DarkQuery | null): DeviceScheme {
  return {
    get: () => query?.matches ?? false,
    subscribe(listener) {
      query?.addEventListener('change', listener);
      return () => query?.removeEventListener('change', listener);
    },
  };
}

/** Whether a Dashboard in `mode` shows its Theme dark, on a device that is or is not. */
export function isDark(mode: ThemeMode, deviceDark: boolean): boolean {
  return mode === 'auto' ? deviceDark : mode === 'dark';
}

const device = createDeviceScheme(typeof window !== 'undefined' ? (window.matchMedia?.(DARK_QUERY) ?? null) : null);

/** Whether this device is dark, re-rendering when it switches. */
export function useDeviceDark(): boolean {
  return useSyncExternalStore(device.subscribe, device.get, () => false);
}
