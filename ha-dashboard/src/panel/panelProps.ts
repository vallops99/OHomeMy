/**
 * What Home Assistant tells the panel element, handed to the React tree.
 *
 * Home Assistant sets `panel`, `route` and `narrow` as properties on the
 * element (developers.home-assistant.io, "Creating custom panels"), and
 * recreates the element whenever it likes: on navigating away and back, on
 * any change to the panel's info, after five minutes hidden. The React tree
 * outlives every element (see `main.tsx`), so the element cannot pass these
 * down as props; it writes them here and the tree subscribes.
 *
 * `hass` itself is deliberately not carried. Home Assistant sets it on every
 * state change in the house, and @hakit already holds all of it, from the
 * same connection; re-rendering the Dashboard on each one would buy nothing.
 * Only two parts of it are kept, which change only when the viewer changes
 * them (#59): `hass.locale`, the frontend's own resolution of the user's
 * language and formats, and the server's time zone. Home Assistant keeps
 * the same `locale` object until it changes, so the store hears of nothing
 * else.
 */
import { useSyncExternalStore } from 'react';

/** The parts of Home Assistant's `PanelInfo` a Dashboard reads. */
export type PanelInfo = {
  url_path: string;
  /** Holds only the Dashboard's id (ADR-0015); the layout arrives over `subscribe`. */
  config: Record<string, unknown> | null;
};

export type PanelRoute = { prefix: string; path: string };

export type PanelProps = {
  panel: PanelInfo | null;
  route: PanelRoute | null;
  narrow: boolean;
  /** `hass.locale`, or `null` outside Home Assistant (the dev server). */
  locale: Record<string, unknown> | null;
  /** `hass.config.time_zone`. */
  timeZone: string | null;
};

/** The parts of `hass` the store keeps (see above). */
export function hassPatch(hass: unknown): Pick<PanelProps, 'locale' | 'timeZone'> {
  const h = (hass ?? {}) as { locale?: Record<string, unknown>; config?: { time_zone?: string } };
  return { locale: h.locale ?? null, timeZone: h.config?.time_zone ?? null };
}

export type PanelStore = {
  get(): PanelProps;
  /** Merges `patch`; listeners hear only of a change to some value. */
  set(patch: Partial<PanelProps>): void;
  subscribe(listener: () => void): () => void;
};

export function createPanelStore(): PanelStore {
  let state: PanelProps = { panel: null, route: null, narrow: false, locale: null, timeZone: null };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const keys = Object.keys(patch) as (keyof PanelProps)[];
      if (keys.every(k => Object.is(state[k], patch[k]))) return;
      state = { ...state, ...patch };
      listeners.forEach(l => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The one store per page, shared by every element instance. */
export const panelStore = createPanelStore();

export function usePanelProps(): PanelProps {
  return useSyncExternalStore(panelStore.subscribe, panelStore.get);
}
