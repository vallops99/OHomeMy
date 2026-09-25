/**
 * Italian labels for entity states.
 *
 * @hakit renders a modal's state line as `startCase(lowerCase(state))` --
 * the raw Home Assistant state, title-cased, never passed through its own
 * `localize`. So a locked gate reads "Locked" even with the locale set to
 * Italian and the tile beneath it correctly reading "Chiuso". The licence
 * forbids patching that, but the modal accepts a `stateTitle` that takes
 * precedence, so the seam supplies the label instead.
 *
 * Tiles use this too, so a state is worded once and the modal can never
 * disagree with the tile that opened it.
 */
import type { Entity } from '../ha';

/** Generic states, applied when a Domain has nothing more specific. */
const COMMON: Record<string, string> = {
  unavailable: 'Non disponibile',
  unknown: 'Sconosciuto',
  on: 'Acceso',
  off: 'Spento',
  open: 'Aperto',
  closed: 'Chiuso',
  opening: 'In apertura',
  closing: 'In chiusura',
  idle: 'Inattivo',
  standby: 'In attesa',
  playing: 'In riproduzione',
  paused: 'In pausa',
  home: 'In casa',
  not_home: 'Fuori casa',
  cleaning: 'In pulizia',
  returning: 'In rientro',
  docked: 'Alla base',
};

/**
 * Per-Domain wording, where the generic label would be wrong or unnatural.
 * A lock is "Chiuso"/"Aperto", not "Bloccato"; an alarm is armed, not on.
 */
const BY_DOMAIN: Record<string, Record<string, string>> = {
  lock: { locked: 'Chiuso', unlocked: 'Aperto', locking: 'In chiusura', unlocking: 'In apertura', jammed: 'Bloccato' },
  alarm_control_panel: {
    disarmed: 'Disinserito',
    armed_home: 'Inserito in casa',
    armed_away: 'Inserito fuori casa',
    armed_night: 'Inserito notte',
    arming: 'Inserimento',
    pending: 'In attesa',
    triggered: 'Allarme',
  },
  climate: { heat: 'Riscaldamento', cool: 'Raffrescamento', auto: 'Automatico', dry: 'Deumidificazione', fan_only: 'Ventilazione' },
  cover: { open: 'Aperta', closed: 'Chiusa' },
  vacuum: { error: 'Errore', idle: 'Fermo' },
};

/**
 * The Italian label for an entity's state. Falls back to the raw state so a
 * Domain we have not worded yet degrades to Home Assistant's own value rather
 * than to a blank.
 */
export function stateLabel(entity: Entity | null | undefined): string {
  if (!entity) return '';
  return BY_DOMAIN[entity.domain]?.[entity.state] ?? COMMON[entity.state] ?? entity.state;
}
