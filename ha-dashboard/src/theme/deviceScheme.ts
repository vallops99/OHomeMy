/**
 * What this device prefers, light or dark, followed as it changes (#66, #70).
 *
 * `none` is a device that cannot say: no media queries at all, or a browser
 * that does not know `prefers-color-scheme` (it parses the query as
 * `not all`). A Dashboard following the device shows dark there
 * (`schemeShown.ts`). A browser that knows the query but has no preference
 * answers light, as the media query itself does.
 */
import { useSyncExternalStore } from 'react';
import type { DeviceScheme } from './schemeShown';

export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The part of a `MediaQueryList` this reads. */
export type DarkQuery = Pick<MediaQueryList, 'matches' | 'media'> & {
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
};

export type DeviceSchemeSource = {
  /** What the device prefers now. */
  get(): DeviceScheme;
  subscribe(listener: () => void): () => void;
};

/** `query` is `null` where there are no media queries. */
export function createDeviceScheme(query: DarkQuery | null): DeviceSchemeSource {
  const known = query !== null && query.media !== 'not all';
  return {
    get: () => (!known ? 'none' : query.matches ? 'dark' : 'light'),
    subscribe(listener) {
      if (!known) return () => {};
      query.addEventListener('change', listener);
      return () => query.removeEventListener('change', listener);
    },
  };
}

const device = createDeviceScheme(typeof window !== 'undefined' ? (window.matchMedia?.(DARK_QUERY) ?? null) : null);

/** What this device prefers, re-rendering when it changes. */
export function useDeviceScheme(): DeviceScheme {
  return useSyncExternalStore(device.subscribe, device.get, () => 'none');
}
