/**
 * What a `climate` entity's attributes mean, read once for both of its forms
 * (#33): the full card in `left`/`right` and the compact block in `footer`.
 * A state is interpreted once, so the two cannot disagree -- the same reason
 * `alarmState.ts` and `stateLabel.ts` exist.
 */
import type { Entity } from '../ha';
import { fmt, isKey, trKey } from '../i18n';
import { stateLabel } from './stateLabel';

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

const MODE_ICONS: Record<string, string> = {
  off: 'mdi:power',
  heat: 'mdi:fire',
  cool: 'mdi:snowflake',
  heat_cool: 'mdi:sun-snowflake-variant',
  auto: 'mdi:thermostat-auto',
  dry: 'mdi:water-percent',
  fan_only: 'mdi:fan',
};

/** The catalogue's word for `value` under `prefix`, or Home Assistant's own value when it has none. */
const worded = (prefix: string, value: string) => {
  const key = `${prefix}.${value}`;
  return isKey(key) ? trKey(key) : value;
};

/**
 * The modes this entity says it has, in its own order. A mode the panel has
 * no word for keeps Home Assistant's own name rather than vanishing: a mode
 * the thermostat offers must be reachable.
 */
export function hvacModes(entity: Entity): HvacMode[] {
  const modes = Array.isArray(entity.attributes.hvac_modes) ? (entity.attributes.hvac_modes as string[]) : [];
  return modes.map(mode => ({ mode, label: worded('climate.mode', mode), icon: MODE_ICONS[mode] ?? 'mdi:thermostat' }));
}

/**
 * What the climate is doing right now: `hvac_action` when the entity reports
 * one ("Heating", "Idle"), else its mode as a state. The action is the more
 * useful of the two -- a thermostat in `heat` that has reached its setpoint
 * is idle.
 */
export function hvacActionLabel(entity: Entity): string {
  const action = entity.attributes.hvac_action;
  if (typeof action === 'string' && action) return worded('climate.action', action);
  return stateLabel(entity);
}

/** Degrees for display: one decimal, in the viewer's number format. `--` when unknown. */
export function degrees(value: number | null): string {
  return value === null ? '--' : fmt.degrees(value);
}
