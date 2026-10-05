/**
 * "Is the house okay?" -- the one question the entrance panel exists to
 * answer in about five seconds, standing, without navigating (#8).
 *
 * This is Derived, like everything else: it asks the registries what kind of
 * thing each entity is (Domain, device_class, Label) and never names an
 * entity id. A new door sensor added in Home Assistant joins the check with
 * no code change.
 *
 * The rule is deliberately narrow. Only conditions the owner could act on
 * while standing at the door count, ranked by what would stop them leaving:
 * a fault the house cannot see past, then an open way in, then a light left
 * on. Everything else is not an answer to this question and belongs in a
 * secondary view.
 *
 * The ranking is the Verdict's, and it still counts lit zones. What changed
 * (#44) is where they are said: not as a chip, but by the lights StatCard,
 * which is why the report carries them as `lit` of their own.
 */
import { groupMemberIds } from './placement';
import type { Area, Entity } from './types';

/** Worst first: the panel shows the highest-ranked concern it finds. */
export type HealthLevel = 'fault' | 'open' | 'on' | 'ok';

export type Health = {
  level: HealthLevel;
  /** Italian, already worded for the panel. */
  headline: string;
  /** The supporting line, or null when there is nothing to add. */
  detail: string | null;
  /** How many entities drove the verdict, for the caller that wants a count. */
  count: number;
  /**
   * Every entity behind this Concern -- exactly the ones `count` counts, in
   * the order found. What a Concern list shows (#30), so the list and the
   * chip can never disagree about the rule. Empty for `ok`.
   */
  entities: Entity[];
};

/**
 * What the panel says, which is not always one thing.
 *
 * A fault outranks an open gate for *colour* -- the panel cannot vouch for a
 * house it cannot fully see. But it must not therefore go quiet about the
 * gate: someone reading "un guasto" and walking away would leave it open.
 * So the verdict leads and anything else still worth saying follows it.
 */
export type HouseReport = {
  /** The headline verdict, and the colour the panel takes. */
  verdict: Health;
  /** Lower-ranked concerns, still shown as chips. Empty when there are none. Never lit zones. */
  also: Health[];
  /**
   * The lit-zones Concern, whatever outranks it, or null when no zone is lit.
   * Not a chip (#44): the lights StatCard states it, and reads its count
   * here so the card and the Verdict count by the one rule. The same object
   * as `verdict` when it leads.
   */
  lit: Health | null;
};

/**
 * Domains that never count as a fault, however unreachable they are.
 *
 * `unknown` is Home Assistant's "never had a value", which for these is the
 * normal resting state rather than a problem: a backup sensor with no backup
 * yet, a `person` nobody has located, a `tts` engine idle until spoken to.
 * Counting them put "10 guasti - Backup Next scheduled automatic backup" on
 * the wall of a house where nothing was wrong. An `input_button` is a Page
 * Opener, which nobody ever presses (ADR-0012), so it rests at `unknown`
 * for good.
 */
const NEVER_FAULT = new Set(['event', 'person', 'tts', 'button', 'input_button', 'update', 'stt', 'conversation']);

/** Whether the house has put this somewhere the dashboard could render it: an Area, or a Label. */
const isPlaced = (e: Entity) => e.areaId !== null || e.labels.length > 0;

/**
 * Whether a fault in this entity is one the panel should report.
 *
 * The test is whether the dashboard renders the thing at all: an entity in
 * no Area and carrying no Label appears on no screen, so a fault in it is
 * not actionable from here and belongs to Home Assistant's own repairs page.
 * This is the same backend-driven rule as everywhere else -- the house says
 * what it contains by putting things in Areas and giving them Labels.
 *
 * A Group's members need neither (ADR-0014): the Group's card shows them,
 * so a member of a Group the house has placed is rendered, and `grouped`
 * holds their ids.
 */
const isReportableFault = (e: Entity, grouped: Set<string>) =>
  e.unavailable && !NEVER_FAULT.has(e.domain) && (isPlaced(e) || grouped.has(e.id));

/** A door, window or gate standing open is a way into the house. */
const OPENING_CLASSES = new Set(['door', 'window', 'garage', 'opening']);

/** Exported so a contact's own tile can never disagree with the Verdict (#34). */
export const isOpenDoor = (e: Entity) =>
  e.domain === 'binary_sensor' && OPENING_CLASSES.has(e.attributes.device_class as string) && e.state === 'on';

/** A gate is a `lock`, and `unlocked` is the state worth shouting about. */
const isOpenGate = (e: Entity) => e.domain === 'lock' && e.state === 'unlocked';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * The verdict, from every entity the dashboard can see.
 *
 * Takes the flat entity list rather than Areas so that Singletons -- the alarm
 * above all -- are included: they belong to no Area and would be invisible to
 * an Area-shaped walk.
 */
/**
 * Every concern the house has, worst first. Empty means all is well.
 *
 * Split out from `houseReport` so that the panel can lead with the worst and
 * still mention the rest -- see `HouseReport`.
 */
function concerns(entities: Entity[]): Health[] {
  const out: Health[] = [];

  // A Group helper is never shown, only its members (ADR-0014), and they
  // report for it: an Unavailable helper is not a Fault of its own, and an
  // unlocked one would count its open gate twice. It stays in for the lit
  // Concern, where a `main` light that is a light group is what a Room Tile
  // drives.
  const helpers = entities.filter(e => groupMemberIds(e) !== null);
  const grouped = new Set(helpers.filter(isPlaced).flatMap(e => groupMemberIds(e) ?? []));
  const shown = entities.filter(e => groupMemberIds(e) === null);

  // Unavailable first: an entity Home Assistant cannot reach means the panel
  // does not actually know whether the house is okay, which outranks
  // everything it does know (map Notes).
  const faults = shown.filter(e => isReportableFault(e, grouped));
  if (faults.length > 0) {
    out.push({
      level: 'fault',
      headline: plural(faults.length, 'Un guasto', `${faults.length} guasti`),
      detail: faults
        .map(f => f.name)
        .slice(0, 3)
        .join(', '),
      count: faults.length,
      entities: faults,
    });
  }

  const open = shown.filter(e => isOpenDoor(e) || isOpenGate(e));
  if (open.length > 0) {
    out.push({
      level: 'open',
      headline: plural(open.length, 'Un accesso aperto', `${open.length} accessi aperti`),
      detail: open
        .map(e => e.name)
        .slice(0, 3)
        .join(', '),
      count: open.length,
      entities: open,
    });
  }

  const lit = entities.filter(e => e.domain === 'light' && e.labels.includes('main') && e.state === 'on');
  if (lit.length > 0) {
    out.push({
      level: 'on',
      headline: plural(lit.length, 'Una zona accesa', `${lit.length} zone accese`),
      detail: lit
        .map(e => e.name)
        .slice(0, 3)
        .join(', '),
      count: lit.length,
      entities: lit,
    });
  }

  return out;
}

/** The full report: the verdict, plus whatever else the panel should still say. */
export function houseReport(entities: Entity[]): HouseReport {
  const found = concerns(entities);
  const lit = found.find(h => h.level === 'on') ?? null;
  if (found.length === 0) {
    return { verdict: { level: 'ok', headline: 'Tutto in ordine', detail: null, count: 0, entities: [] }, also: [], lit };
  }
  // "Lights are on" is not a concern worth a second line once something
  // louder is already being reported -- it is normal in an occupied house.
  // It is not lost, only not a chip: `lit` carries it to the lights stat.
  const also = found.slice(1).filter(h => h.level !== 'on');
  return { verdict: found[0], also, lit };
}

/**
 * The house temperature.
 *
 * Read from the thermostat's own `current_temperature`, NOT by scanning for
 * the first `temperature` sensor: the house is full of devices that report
 * their own chip temperature, and an Amazon Echo in a bedroom was winning
 * that scan and putting its self-heating on the wall as the house reading.
 * A `climate` entity is the one thing that means "the temperature here".
 */
export function houseTemperature(areas: Area[]): number | null {
  for (const area of areas) {
    for (const e of area.entities) {
      if (e.domain !== 'climate' || e.unavailable) continue;
      const value = Number(e.attributes.current_temperature);
      if (!Number.isNaN(value)) return value;
    }
  }
  return null;
}

/** The house humidity, from any Area reporting one. */
export function houseHumidity(areas: Area[]): number | null {
  for (const area of areas) {
    for (const e of area.entities) {
      if (e.domain !== 'sensor' || e.unavailable) continue;
      if (e.attributes.device_class !== 'humidity') continue;
      const value = Number(e.state);
      if (!Number.isNaN(value)) return value;
    }
  }
  return null;
}
