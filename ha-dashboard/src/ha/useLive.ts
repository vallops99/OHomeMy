/**
 * The connection and one entity's raw state as React state (#70), wired to
 * the websocket @hakit holds (`./connected`).
 */
import { useHass } from '@hakit/core';
import { useMemo, useSyncExternalStore } from 'react';
import { createConnected } from './connected';

/** Whether the websocket to Home Assistant is up, re-rendering as it drops and comes back. */
export function useConnected(): boolean {
  const connection = useHass(s => s.connection);
  const source = useMemo(() => createConnected(connection), [connection]);
  return useSyncExternalStore(source.subscribe, source.get, () => false);
}

/**
 * One entity's state straight from Home Assistant, or `null` when it has no
 * such entity. Unlike `useEntityState` it reads every Domain: `sun.sun` is
 * not a thing the Dashboard renders, but it says when it is night.
 */
export function useStateOf(id: string | null): string | null {
  return useHass(s => (id ? (s.entities[id]?.state ?? null) : null));
}

/**
 * Every entity Home Assistant has in `domains`, by id and friendly name, in
 * any Domain, denylisted ones included (the Builder's pick of the house's
 * entity for `follow-house`, #70).
 */
export function useEntitiesIn(domains: readonly string[]): { id: string; name: string }[] {
  const states = useHass(s => s.entities);
  return useMemo(
    () =>
      Object.values(states ?? {})
        .filter(e => domains.includes(e.entity_id.slice(0, e.entity_id.indexOf('.'))))
        .map(e => ({ id: e.entity_id, name: String(e.attributes?.friendly_name ?? e.entity_id) })),
    [states, domains]
  );
}
