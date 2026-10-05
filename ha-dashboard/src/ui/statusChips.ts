/**
 * The status bar's chips, decided (#44, docs/protocol.md "The chips").
 *
 * `glance`'s reports, in this order: a Fault, an open way in, the cameras,
 * the alarm -- each only when there is one to show. Lit zones are not here:
 * the lights StatCard states them (`HouseReport.lit`), and `ok` is not a
 * chip either, since the absence of an alert chip already says it. The row
 * is never capped: a Concern hidden to keep it short would be a lie.
 *
 * The Concerns keep `houseReport`'s ranking, and a fault still does not
 * silence an open gate (health.ts): the verdict and `also` are both read,
 * and only their lit zones are dropped.
 *
 * No React and no @hakit (types only), so `statusChips.test.ts` runs it
 * under plain Node. `ChipRow.tsx` renders what this decides.
 */
import type { Entity, HealthLevel, HouseReport } from '../ha';
import { alarmIcon } from './alarmState';
import { LEVEL_ICON } from './levelIcon';
import { stateLabel } from './stateLabel';

/** What a chip opens: its Concern list, the cameras' Page, or the alarm's Modal. */
export type ChipOpens = { kind: 'concern'; level: HealthLevel } | { kind: 'cameras' } | { kind: 'alarm' };

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
  report: HouseReport;
  /** The cameras Placed in `glance`. */
  cameras: Entity[];
  /** Those of them whose device reports motion right now. */
  moving: Entity[];
  /** The alarm panel Placed in `glance`, or null. */
  alarm: Entity | null;
};

/**
 * "3 telecamere · nessun movimento". An Unavailable camera is said here
 * ahead of motion, as the camera glance always did, but in the neutral
 * tone: it is a Fault, so the Fault chip already carries the alert.
 */
function cameraText(cameras: Entity[], moving: Entity[]): string {
  const faulted = cameras.filter(c => c.unavailable).length;
  const count = `${cameras.length} ${cameras.length === 1 ? 'telecamera' : 'telecamere'}`;
  const detail = faulted > 0 ? `${faulted} non disponibile` : moving.length > 0 ? 'movimento rilevato' : 'nessun movimento';
  return `${count} · ${detail}`;
}

export function statusChips({ report, cameras, moving, alarm }: StatusChipsInput): StatusChip[] {
  const chips: StatusChip[] = [];
  // Already worst first: `fault` before `open`, whichever of them leads.
  for (const concern of [report.verdict, ...report.also]) {
    if (concern.level !== 'fault' && concern.level !== 'open') continue;
    chips.push({
      key: concern.level,
      tone: concern.level === 'fault' ? 'alert' : 'neutral',
      icon: LEVEL_ICON[concern.level],
      text: concern.headline,
      opens: { kind: 'concern', level: concern.level },
    });
  }
  if (cameras.length > 0) {
    const faulted = cameras.some(c => c.unavailable);
    chips.push({
      key: 'cameras',
      tone: 'neutral',
      icon: faulted ? 'mdi:cctv-off' : moving.length > 0 ? 'mdi:motion-sensor' : 'mdi:cctv',
      text: cameraText(cameras, moving),
      opens: { kind: 'cameras' },
    });
  }
  if (alarm !== null) {
    chips.push({ key: 'alarm', tone: 'neutral', icon: alarmIcon(alarm), text: stateLabel(alarm), opens: { kind: 'alarm' } });
  }
  return chips;
}
