/**
 * What a Dishwasher says and offers (#81, CONTEXT.md), read off the entities
 * its Widget names: the state table, the countdown to Ends at, and which
 * controls the state allows. Built around Home Connect's enum states, and
 * saying any other as raw text.
 *
 * The countdown is built from message keys, not `Intl.DurationFormat`: the
 * wall panel's browser might not have it.
 *
 * No React, no @hakit: it runs under plain Node.
 */
import type { Entity } from '../../ha';
import { fmt, tr } from '../../i18n';

export type Tone = 'muted' | 'accent' | 'warning' | 'success';

export type Line = { text: string; tone: Tone };

/** The state in words, and the tone it is said in. `at` is Ends at, which a delayed start reads as its start. */
export function stateLine(state: string, at: Date | null): Line {
  switch (state) {
    case 'inactive':
      return { text: tr('dishwasher.state.inactive'), tone: 'muted' };
    case 'ready':
      return { text: tr('dishwasher.state.ready'), tone: 'muted' };
    case 'delayedstart':
      return {
        text: at ? tr('dishwasher.state.delayedstart', { time: fmt.time(at) }) : tr('dishwasher.state.delayed'),
        tone: 'accent',
      };
    case 'run':
      return { text: tr('dishwasher.state.run'), tone: 'accent' };
    case 'pause':
      return { text: tr('dishwasher.state.pause'), tone: 'accent' };
    case 'actionrequired':
      return { text: tr('dishwasher.state.actionrequired'), tone: 'warning' };
    case 'finished':
      return { text: tr('dishwasher.state.finished'), tone: 'success' };
    case 'error':
      return { text: tr('dishwasher.state.error'), tone: 'warning' };
    case 'aborting':
      return { text: tr('dishwasher.state.aborting'), tone: 'accent' };
    default:
      return { text: state, tone: 'muted' };
  }
}

/**
 * Time left until `end`: under a minute, or an end time already past, is
 * "Almost done"; minutes are rounded up, so it never says "0 min".
 */
export function countdown(end: Date, now: Date): string {
  const ms = end.getTime() - now.getTime();
  if (ms < 60_000) return tr('dishwasher.almostDone');
  const total = Math.ceil(ms / 60_000);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return tr('dishwasher.minutes', { minutes });
  if (minutes === 0) return tr('dishwasher.hours', { hours });
  return tr('dishwasher.hoursMinutes', { hours, minutes });
}

export type DishwasherInput = {
  state: Entity | null;
  endsAt: Entity | null;
  progress: Entity | null;
  door: Entity | null;
  salt: Entity | null;
  rinseAid: Entity | null;
  remoteStart: Entity | null;
  /** Which controls have an entity chosen. */
  chosen: { start: boolean; stop: boolean; resume: boolean; pause: boolean };
};

export type Control = {
  /** Shown but not pressable. */
  disabled: boolean;
  /** Said under it, when disabled. */
  hint: string | null;
  /** Acts only after the hold of a gate's Apri (`ui/accessHold.ts`). */
  held: boolean;
};

export type Controls = Record<'start' | 'stop' | 'resume' | 'pause', Control | null>;

const NONE: Controls = { start: null, stop: null, resume: null, pause: null };

/** Each control is shown only when its entity is chosen and the state allows it. */
export function controlsFor(input: DishwasherInput): Controls {
  const state = input.state;
  if (!state || state.unavailable) return NONE;
  const { chosen } = input;
  const idle = state.state === 'ready' || state.state === 'inactive';
  const blocked = input.remoteStart?.state === 'off';
  return {
    start: chosen.start && idle ? { disabled: blocked, hint: blocked ? tr('dishwasher.remoteStartHint') : null, held: false } : null,
    stop:
      chosen.stop && (state.state === 'run' || state.state === 'pause' || state.state === 'delayedstart')
        ? { disabled: false, hint: null, held: true }
        : null,
    resume: chosen.resume && state.state === 'pause' ? { disabled: false, hint: null, held: false } : null,
    pause: chosen.pause && state.state === 'run' ? { disabled: false, hint: null, held: false } : null,
  };
}

export type DishwasherView = {
  /** The State is Unavailable: the Widget becomes the Fault tile. */
  fault: boolean;
  line: Line;
  /** "35 min", while running or paused with an Ends at; null otherwise. */
  countdown: string | null;
  /** Whole percent, or null when there is none to show. */
  progress: number | null;
  /** "Door open" or "Door closed", or null when no Door is chosen or it is in another state. */
  door: string | null;
  warnings: string[];
  controls: Controls;
};

/** A timestamp sensor's state as a date, or null when it is none (Unavailable by design included). */
function dateOf(entity: Entity | null): Date | null {
  if (!entity || entity.unavailable) return null;
  const date = new Date(entity.state);
  return Number.isNaN(date.getTime()) ? null : date;
}

function doorText(door: Entity | null): string | null {
  if (!door || door.unavailable) return null;
  if (door.state === 'open' || door.state === 'on') return tr('dishwasher.doorOpen');
  if (door.state === 'closed' || door.state === 'locked' || door.state === 'off') return tr('dishwasher.doorClosed');
  return null;
}

/** A salt or rinse-aid warning: while the sensor is neither off, nor unreadable. */
const isWarning = (e: Entity | null) => !!e && !e.unavailable && e.state !== 'off';

export function dishwasher(input: DishwasherInput, now: Date): DishwasherView {
  const state = input.state;
  const ends = dateOf(input.endsAt);
  const value = state?.state ?? '';
  const percent = input.progress && !input.progress.unavailable ? Number(input.progress.state) : NaN;
  return {
    fault: state?.unavailable ?? true,
    line: stateLine(value, ends),
    countdown: ends && (value === 'run' || value === 'pause') ? countdown(ends, now) : null,
    progress: Number.isFinite(percent) ? Math.round(percent) : null,
    door: doorText(input.door),
    warnings: [
      ...(isWarning(input.salt) ? [tr('dishwasher.saltLow')] : []),
      ...(isWarning(input.rinseAid) ? [tr('dishwasher.rinseAidLow')] : []),
    ],
    controls: controlsFor(input),
  };
}
