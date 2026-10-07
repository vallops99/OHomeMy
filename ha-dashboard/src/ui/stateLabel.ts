/**
 * Entity states in the viewer's language (#59).
 *
 * @hakit renders a modal's state line as `startCase(lowerCase(state))` --
 * the raw Home Assistant state, title-cased, never passed through its own
 * `localize`. So a locked gate reads "Locked" whatever the viewer's
 * language, while the tile beneath it reads "Chiuso". The licence forbids
 * patching that, but the modal accepts a `stateTitle` that takes
 * precedence, so the seam supplies the label instead.
 *
 * Tiles use this too, so a state is worded once and the modal can never
 * disagree with the tile that opened it.
 */
import type { Entity } from '../ha';
import { isKey, trKey, type Key } from '../i18n';

/**
 * Per-Domain wording, where the generic label would be wrong or unnatural
 * (`state.<domain>.<state>`): a lock is closed or open, not locked in every
 * language; an alarm is armed, not on. Then the generic one (`state.<state>`).
 */
const DOMAIN_KEY: Record<string, string> = {
  lock: 'lock',
  alarm_control_panel: 'alarm',
  climate: 'climate',
  cover: 'cover',
  vacuum: 'vacuum',
};

/** The catalogue's key for this Domain's state, if it has one. */
export function stateKey(domain: string, state: string): Key | null {
  const own = DOMAIN_KEY[domain] && `state.${DOMAIN_KEY[domain]}.${state}`;
  if (own && isKey(own)) return own;
  const common = `state.${state}`;
  return isKey(common) ? common : null;
}

/**
 * The label for an entity's state. Falls back to the raw state so a Domain
 * we have not worded yet degrades to Home Assistant's own value rather than
 * to a blank.
 */
export function stateLabel(entity: Entity | null | undefined): string {
  if (!entity) return '';
  const key = stateKey(entity.domain, entity.state);
  return key ? trKey(key) : entity.state;
}
