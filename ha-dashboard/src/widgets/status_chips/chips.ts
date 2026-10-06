/**
 * The status chips, decided (#53, from `ui/statusChips.ts`): in this order a
 * Fault, an open way in, the cameras, the alarm, each only when there is one
 * to show. Never capped: a Concern hidden to keep the row short would be a
 * lie (CONTEXT.md, Concern).
 *
 * The Concerns are the Dashboard's, counted over every Page of it
 * (`ha/verdict.ts`), so a camera on the cameras' Page going Unavailable
 * raises the Fault chip on the Home Page. A Fault does not silence an open
 * gate: each Concern gets its chip. Lit zones are not a chip; the `stats`
 * Widget says them.
 *
 * The camera chip opens nothing: the Page of the cameras' Feeds used to be
 * Derived, and a Widget's own `on_tap` is how a Page is opened now.
 *
 * No React and no @hakit (types only), so `chips.test.ts` runs it under
 * plain Node. English until the strings module (#59).
 */
import type { Entity } from '../../ha';
import type { Concern, ConcernLevel } from '../../ha/verdict';
import { alarmIcon } from '../../ui/alarmState';
import { stateLabel } from '../../ui/stateLabel';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Every word this kind says, in one place. */
export const STRINGS = {
  concern: {
    fault: (n: number) => plural(n, 'fault', 'faults'),
    open: (n: number) => (n === 1 ? '1 way in open' : `${n} ways in open`),
    lit: (n: number) => plural(n, 'zone lit', 'zones lit'),
  } satisfies Record<ConcernLevel, (n: number) => string>,
  cameras: (n: number) => plural(n, 'camera', 'cameras'),
  camerasDown: (n: number) => `${n} unavailable`,
  motion: 'motion detected',
  noMotion: 'no motion',
  noArea: 'No Area',
  close: 'Close',
};

/** What a Concern's chip, and its Concern list's heading, say. */
export const concernHeadline = (concern: Concern) => STRINGS.concern[concern.level](concern.entities.length);

export const CONCERN_ICON: Record<ConcernLevel, string> = {
  fault: 'mdi:alert-circle',
  open: 'mdi:door-open',
  lit: 'mdi:lightbulb-on',
};

/** What a chip does when tapped: open its Concern list, the alarm's dialog, or nothing. */
export type ChipOpens = { kind: 'concern'; level: ConcernLevel } | { kind: 'alarm' } | null;

export type StatusChip = {
  key: 'fault' | 'open' | 'cameras' | 'alarm';
  /** `alert` only for a Fault (Casa Panel's StatusChip); everything else is calm. */
  tone: 'alert' | 'neutral';
  /** An MDI name, as `Icon` takes it. */
  icon: string;
  text: string;
  opens: ChipOpens;
};

export type StatusChipsInput = {
  /** The Dashboard's Concerns, worst first. */
  concerns: readonly Concern[];
  /** The Widget's cameras: none, and there is no camera chip. */
  cameras: readonly Entity[];
  /** Those of them whose device reports motion right now. */
  moving: readonly Entity[];
  /** The Widget's alarm panel, or `null`. */
  alarm: Entity | null;
};

/**
 * "3 cameras · no motion". An Unavailable camera is said ahead of motion,
 * in the neutral tone: it is a Fault, and the Fault chip carries the alert.
 */
function cameraText(cameras: readonly Entity[], moving: readonly Entity[]): string {
  const down = cameras.filter(c => c.unavailable).length;
  const detail = down > 0 ? STRINGS.camerasDown(down) : moving.length > 0 ? STRINGS.motion : STRINGS.noMotion;
  return `${STRINGS.cameras(cameras.length)} · ${detail}`;
}

export function statusChips({ concerns, cameras, moving, alarm }: StatusChipsInput): StatusChip[] {
  const chips: StatusChip[] = [];
  for (const concern of concerns) {
    if (concern.level === 'lit') continue;
    chips.push({
      key: concern.level,
      tone: concern.level === 'fault' ? 'alert' : 'neutral',
      icon: CONCERN_ICON[concern.level],
      text: concernHeadline(concern),
      opens: { kind: 'concern', level: concern.level },
    });
  }
  if (cameras.length > 0) {
    const down = cameras.some(c => c.unavailable);
    chips.push({
      key: 'cameras',
      tone: 'neutral',
      icon: down ? 'mdi:cctv-off' : moving.length > 0 ? 'mdi:motion-sensor' : 'mdi:cctv',
      text: cameraText(cameras, moving),
      opens: null,
    });
  }
  if (alarm !== null) {
    chips.push({ key: 'alarm', tone: 'neutral', icon: alarmIcon(alarm), text: stateLabel(alarm), opens: { kind: 'alarm' } });
  }
  return chips;
}
