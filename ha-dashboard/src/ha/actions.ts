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
  /** Turn every one of these off, in one call. Unavailable ones are skipped. */
  turnOff: (entities: Entity[]) => void;
  lock: (entity: Entity) => void;
  unlock: (entity: Entity) => void;
  /** Set an `input_text` helper's value; `''` clears it. */
  setText: (entityId: EntityId, value: string) => void;
  /** Press a `button` or `input_button`. */
  press: (entityId: EntityId) => void;
  /** Escape hatch for Domains with no verb of their own yet. */
  call: (domain: string, service: string, entityId: EntityId | EntityId[], data?: Record<string, unknown>) => void;
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
      turnOff: entities => {
        // One call per Domain with every target in it, so *Spegni tutto*
        // (#42) is one command to Home Assistant rather than one per light.
        const byDomain = new Map<string, EntityId[]>();
        for (const e of entities) {
          if (e.unavailable) continue;
          byDomain.set(e.domain, [...(byDomain.get(e.domain) ?? []), e.id]);
        }
        for (const [domain, ids] of byDomain) call(TOGGLEABLE.has(domain) ? domain : 'homeassistant', 'turn_off', ids);
      },
      lock: entity => {
        if (entity.unavailable) return;
        call('lock', 'lock', entity.id);
      },
      unlock: entity => {
        if (entity.unavailable) return;
        call('lock', 'unlock', entity.id);
      },
      // By id, not by `Entity`, and with no Unavailable guard: these drive
      // the panel's own helpers (Dashboard.tsx), which are named rather than
      // rendered. A call to a helper that is not there fails in Home
      // Assistant and changes nothing, which is the right outcome anyway.
      setText: (entityId, value) => call('input_text', 'set_value', entityId, { value }),
      press: entityId => call(entityId.split('.')[0], 'press', entityId),
    }),
    [call]
  );
}
