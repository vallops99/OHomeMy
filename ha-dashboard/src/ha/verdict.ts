/**
 * The Verdict and its Concerns, per Dashboard (#53, ADR-0015; CONTEXT.md
 * "Verdict", "Concern", "Fault").
 *
 * The ranking is the one `./health` has always had, ranked by what would
 * stop someone leaving the house: a Fault the Dashboard cannot see past,
 * then an open way in, then a lit zone. What changed is what is counted.
 * The old rule asked the registries (an Area, a Label, a Group helper)
 * whether an entity was rendered anywhere; now the Dashboard's document says
 * exactly what it shows, on any of its Pages (`../document/shows`), and only
 * that counts. Nothing here reads a Label.
 *
 * - **Fault**: an Unavailable entity the Dashboard shows.
 * - **Open**: a door, window or gate the Dashboard shows, standing open.
 * - **Lit**: a light a Widget names itself, on. A named light is the one a
 *   Widget stands for (a Room Tile's chosen light, a toggle's), which is
 *   what a zone's `main` light used to be; the other lights a Room Tile
 *   counts in its Area are not each a zone.
 *
 * No React, no @hakit: `verdict.test.ts` runs this under plain Node. The
 * words are the Widgets', not this module's.
 */
import { isNamed, isShown, type DashboardShows } from '../document/shows';
import { isOpenDoor } from './health';
import type { Entity } from './types';

/** Worst first. */
export const CONCERN_LEVELS = ['fault', 'open', 'lit'] as const;
export type ConcernLevel = (typeof CONCERN_LEVELS)[number];

export type Concern = {
  level: ConcernLevel;
  /** Every entity behind it, never capped, in the order found: what its Concern list shows. */
  entities: Entity[];
};

/**
 * Domains whose `unknown` is their resting state, not a fault: an `event`
 * or a `button` never had a value until it fires, a `person` nobody has
 * located is `unknown`. Shown on a Dashboard, they are Faults only when Home
 * Assistant says `unavailable`, which for them too means it cannot reach
 * them.
 */
const UNKNOWN_AT_REST = new Set(['event', 'person', 'tts', 'button', 'input_button', 'update', 'stt', 'conversation', 'scene']);

const isFault = (e: Entity) => e.unavailable && !(e.state === 'unknown' && UNKNOWN_AT_REST.has(e.domain));

/** A gate is a `lock`, and `unlocked` is the state worth shouting about. */
const isOpenGate = (e: Entity) => e.domain === 'lock' && e.state === 'unlocked';

/** Every Concern the Dashboard has, worst first; empty when there is nothing to report. */
export function dashboardConcerns(entities: Iterable<Entity>, shows: DashboardShows): Concern[] {
  const faults: Entity[] = [];
  const open: Entity[] = [];
  const lit: Entity[] = [];
  for (const e of entities) {
    if (!isShown(shows, e)) continue;
    // A Fault is all that can be said of an entity Home Assistant cannot
    // reach: its last state is not one the house can vouch for.
    if (isFault(e)) faults.push(e);
    else if (isOpenDoor(e) || isOpenGate(e)) open.push(e);
    else if (e.domain === 'light' && e.state === 'on' && isNamed(shows, e.id)) lit.push(e);
  }
  const found: Concern[] = [
    { level: 'fault', entities: faults },
    { level: 'open', entities: open },
    { level: 'lit', entities: lit },
  ];
  return found.filter(c => c.entities.length > 0);
}

/** The Verdict: the highest-ranked Concern, or `null` when all is well. */
export function verdictOf(concerns: readonly Concern[]): Concern | null {
  return concerns[0] ?? null;
}

/** The Concern of that level as it stands now, or `null` once it has cleared. */
export function concernAt(concerns: readonly Concern[], level: ConcernLevel): Concern | null {
  return concerns.find(c => c.level === level) ?? null;
}
