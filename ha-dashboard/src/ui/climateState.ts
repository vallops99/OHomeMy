/**
 * What a `climate` entity's attributes mean, read once for both of its forms
 * (#33): the full card in `left`/`right` and the compact block in `footer`.
 * A state is interpreted once, so the two cannot disagree -- the same reason
 * `alarmState.ts` and `stateLabel.ts` exist.
 */
import type { Entity } from '../ha';

const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

/** The room's temperature and the setpoint, or `null` for what is not reported. */
export function climateReading(entity: Entity): { current: number | null; target: number | null } {
  return { current: numberOrNull(entity.attributes.current_temperature), target: numberOrNull(entity.attributes.temperature) };
}

/**
 * The setpoint one step up (`+1`) or down (`-1`) from `from`, inside the
 * entity's own range.
 *
 * The step is the entity's `target_temp_step`, or half a degree when it
 * reports none -- Home Assistant's own frontend does the same for Celsius, so
 * the panel and the app step alike. Rounded to the step's own decimals: 21 +
 * 0.1 is 21.1, not 21.100000000000001 sent to the thermostat.
 */
export function stepSetpoint(entity: Entity, from: number, direction: 1 | -1): number {
  const step = numberOrNull(entity.attributes.target_temp_step) ?? 0.5;
  const min = numberOrNull(entity.attributes.min_temp) ?? Number.NEGATIVE_INFINITY;
  const max = numberOrNull(entity.attributes.max_temp) ?? Number.POSITIVE_INFINITY;
  const decimals = (String(step).split('.')[1] ?? '').length;
  const next = Number((from + direction * step).toFixed(decimals));
  return Math.min(max, Math.max(min, next));
}

/** An HVAC mode, worded for a button. */
export type HvacMode = { mode: string; label: string; icon: string };

const MODES: Record<string, { label: string; icon: string }> = {
  off: { label: 'Spento', icon: 'mdi:power' },
  heat: { label: 'Caldo', icon: 'mdi:fire' },
  cool: { label: 'Freddo', icon: 'mdi:snowflake' },
  heat_cool: { label: 'Caldo/freddo', icon: 'mdi:sun-snowflake-variant' },
  auto: { label: 'Auto', icon: 'mdi:thermostat-auto' },
  dry: { label: 'Deumidifica', icon: 'mdi:water-percent' },
  fan_only: { label: 'Ventola', icon: 'mdi:fan' },
};

/**
 * The modes this entity says it has, in its own order. A mode the panel has
 * no word for keeps Home Assistant's own name rather than vanishing: a mode
 * the thermostat offers must be reachable.
 */
export function hvacModes(entity: Entity): HvacMode[] {
  const modes = Array.isArray(entity.attributes.hvac_modes) ? (entity.attributes.hvac_modes as string[]) : [];
  return modes.map(mode => ({ mode, ...(MODES[mode] ?? { label: mode, icon: 'mdi:thermostat' }) }));
}

const ACTIONS: Record<string, string> = {
  off: 'Spento',
  idle: 'Inattivo',
  heating: 'Riscalda',
  cooling: 'Raffresca',
  drying: 'Deumidifica',
  fan: 'Ventila',
  preheating: 'Preriscalda',
  defrosting: 'Sbrina',
};

/** Italian names for the modes as states, when there is no action to report. */
const MODE_STATES: Record<string, string> = {
  off: 'Spento',
  heat: 'Riscaldamento',
  cool: 'Raffrescamento',
  heat_cool: 'Caldo/freddo',
  auto: 'Automatico',
  dry: 'Deumidificazione',
  fan_only: 'Ventilazione',
};

/**
 * What the climate is doing right now: `hvac_action` when the entity reports
 * one ("Riscalda", "Inattivo"), else its mode. The action is the more useful
 * of the two -- a thermostat in `heat` that has reached its setpoint is idle.
 */
export function hvacActionLabel(entity: Entity): string {
  const action = entity.attributes.hvac_action;
  if (typeof action === 'string' && action) return ACTIONS[action] ?? action;
  return MODE_STATES[entity.state] ?? entity.state;
}

/** Degrees for display: one decimal, Italian comma. `--` when unknown. */
export function degrees(value: number | null): string {
  return value === null ? '--' : `${value.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°`;
}
