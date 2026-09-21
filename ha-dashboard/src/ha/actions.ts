/**
 * The command seam: how components act on the house.
 *
 * Together with `./registry` this is the whole @hakit/core surface we depend
 * on. Components call these verbs; they never name a Home Assistant service.
 */
import { useHass } from '@hakit/core';
import { useCallback, useMemo } from 'react';
import type { Entity, EntityId } from './types';

/** Domains whose "on" is reached with `turn_on` rather than a domain verb. */
const TOGGLEABLE = new Set(['light', 'switch', 'fan', 'siren', 'media_player', 'input_boolean']);

export type Actions = {
  toggle: (entity: Entity) => void;
  /** 0-100. Lights only; below 1 the light is turned off instead. */
  setBrightness: (entity: Entity, percent: number) => void;
  lock: (entity: Entity) => void;
  unlock: (entity: Entity) => void;
  /** Escape hatch for Domains with no verb of their own yet. */
  call: (domain: string, service: string, entityId: EntityId, data?: Record<string, unknown>) => void;
};

export function useActions(): Actions {
  const connection = useHass(s => s.connection);

  const call = useCallback<Actions['call']>(
    (domain, service, entityId, data) => {
      if (!connection) return;
      void connection.sendMessagePromise({
        type: 'call_service',
        domain,
        service,
        service_data: data ?? {},
        target: { entity_id: entityId },
      });
    },
    [connection]
  );

  return useMemo<Actions>(
    () => ({
      call,
      toggle: entity => {
        // An Unavailable entity is rendered but never commanded: the call
        // would fail anyway, and a dead control that appears to respond is
        // worse than one that visibly does not.
        if (entity.unavailable) return;
        const domain = TOGGLEABLE.has(entity.domain) ? entity.domain : 'homeassistant';
        call(domain, 'toggle', entity.id);
      },
      setBrightness: (entity, percent) => {
        if (entity.unavailable) return;
        const clamped = Math.max(0, Math.min(100, Math.round(percent)));
        // Dragging to zero means "off", not "on at 0%" -- Home Assistant
        // would otherwise keep the light on at its minimum.
        if (clamped < 1) call('light', 'turn_off', entity.id);
        else call('light', 'turn_on', entity.id, { brightness_pct: clamped });
      },
      lock: entity => {
        if (entity.unavailable) return;
        call('lock', 'lock', entity.id);
      },
      unlock: entity => {
        if (entity.unavailable) return;
        call('lock', 'unlock', entity.id);
      },
    }),
    [call]
  );
}
