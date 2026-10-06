/**
 * Default Dashboards as React state (#57): `./defaults` wired to the
 * websocket the document already uses. Admin only.
 */
import { useEffect, useMemo, useState } from 'react';
import { setSystemDefault, setUserDefault, subscribeDefaults, type Defaults } from './defaults';
import { useDocumentChannel } from './useDocument';

export type DefaultsAdmin = {
  setUser: (userId: string, dashboardId: string | null) => Promise<void>;
  setSystem: (dashboardId: string | null) => Promise<void>;
};

export type DefaultsState = {
  /** Every user's default and the system's, kept current; `null` until the first answer. */
  defaults: Defaults | null;
  /**
   * Why they cannot be read, if they cannot: the integration answers
   * `unavailable` if Home Assistant moved the storage it writes through.
   */
  error: unknown;
  admin: DefaultsAdmin | null;
};

export function useDefaults(): DefaultsState {
  const channel = useDocumentChannel();
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!channel) return;
    let live = true;
    const unsubscribe = subscribeDefaults(channel, d => {
      if (live) setDefaults(d);
    });
    unsubscribe.catch(err => live && setError(err));
    return () => {
      live = false;
      unsubscribe.then(unsub => unsub()).catch(() => {});
    };
  }, [channel]);

  const admin = useMemo<DefaultsAdmin | null>(
    () =>
      channel && {
        setUser: (userId, dashboardId) => setUserDefault(channel, userId, dashboardId),
        setSystem: dashboardId => setSystemDefault(channel, dashboardId),
      },
    [channel]
  );

  return { defaults, error, admin };
}
