/**
 * The screen-definition format (#9, revised when variant D was restored).
 *
 * Screens are Composed from a typed array of Slots (CONTEXT.md). Map Notes
 * require that swapping and moving components be an easy TypeScript edit, and
 * that is what this shape buys:
 *
 *   - moving a tile is moving a line
 *   - swapping a component is changing one `kind`
 *   - moving something between regions is changing one word
 *   - an invalid screen does not compile
 *
 * Area *contents* stay Derived: a Slot says "the Salone row goes here",
 * never which lights are in it. Adding a light in Home Assistant changes the
 * panel with no code change.
 */
import type { KnownAreaId, KnownLabel } from '../ha';

/**
 * Which region of the panel a slot belongs to (variant D, #6).
 *
 * The panel is two columns with different jobs, not one grid: `sidebar` is
 * the glance layer read on approach from 2 m, `main` is the touched layer.
 * A flat list with a tag was chosen over nested `{ sidebar: [], main: [] }`
 * so that ADR-0003's edits survive -- moving a slot between regions stays a
 * one-word change, and the screen stays a list you can reorder by moving a
 * line.
 */
export type Region = 'sidebar' | 'main';

/**
 * How many cells a slot occupies, for the regions that actually tile.
 *
 * Only the bottom strip lays its contents out in columns; the sidebar and
 * the room list are vertical flows that size themselves. So `span` is
 * present only on the slot kinds that sit in the strip -- a slot that does
 * not tile has no `span` to set wrongly.
 *
 * `phone` is optional and falls back to `tablet`. The wall tablet is the
 * designed target (#2); the phone layout has had no design work, so a slot
 * that omits `phone` inherits rather than forcing an invented number.
 */
export type Span = {
  tablet: { col: number };
  phone?: { col: number };
};

/** Which device's spans to resolve. */
export type Device = 'tablet' | 'phone';

/** Resolve a slot's span for a device, falling back to the tablet layout. */
export function spanFor(span: Span | undefined, device: Device): number {
  if (!span) return 1;
  if (device === 'phone') return (span.phone ?? span.tablet).col;
  return span.tablet.col;
}

/** Fields every slot shares. */
type Base = {
  /** Which column of the panel this belongs to. */
  region: Region;
};

/** Fields for the slots that sit in the bottom strip, which tiles. */
type Tiled = Base & {
  /** Columns occupied within the strip. Omitted means 1. */
  span?: Span;
};

/**
 * One placement on a screen.
 *
 * `room` collapses an Area to a row; `group` places every entity carrying a
 * Label (so a gate added in Home Assistant appears with no code change);
 * `single` places one specific entity from a Label.
 */
export type Slot =
  /** One Area as a row: name, how many of its lights are on, a slider, its temperature. */
  | (Base & { kind: 'room'; area: KnownAreaId; icon?: string })
  | (Base & { kind: 'group'; label: KnownLabel })
  | (Base & { kind: 'single'; label: KnownLabel; index?: number })
  /**
   * The hero: the one number read on approach. The indoor temperature from a
   * `climate` entity's own reading -- not a scan for the first `temperature`
   * sensor, which found an Amazon Echo's self-heating chip (#8).
   */
  | (Base & { kind: 'hero' })
  /**
   * The house's stats, beneath the hero: how many zones are lit, and what the
   * house is drawing right now.
   */
  | (Base & { kind: 'stats' })
  /**
   * The house's concerns as chips, plus the alarm.
   *
   * This is `houseReport`'s verdict rendered small (#6): a fault is an outline
   * chip, proportionate to one unreachable light, rather than a flood that
   * turns the whole glance layer red. It stays unmissable at 2 m by being the
   * only warm-red thing on the panel. Lower-ranked concerns render as further
   * chips, so a fault still cannot silence an open gate (#8).
   */
  | (Base & { kind: 'chips'; label: KnownLabel })
  /**
   * The gates, ranked. `primary` names the one the panel is mostly about, by
   * its position among the entities carrying the Label -- not by entity id,
   * so the house still decides how many gates there are (#8).
   */
  | (Base & { kind: 'gates'; label: KnownLabel; primary?: number })
  /** Every camera carrying the Label, collapsed to a motion glance. */
  | (Base & { kind: 'cameras'; label: KnownLabel })
  /**
   * The media strip. Contextual: it shows whatever is playing across every
   * media player in the house, and says so quietly when nothing is.
   */
  | (Tiled & { kind: 'media' })
  /** The bottom navigation bar. Destinations are declared on the screen. */
  | (Tiled & { kind: 'nav'; destinations: NavSlotDestination[] });

/**
 * One navigation destination, as a screen declares it.
 *
 * `screen` is absent while that view has not been built -- the bar renders it
 * visibly disabled rather than as a button that silently does nothing (#8).
 * It is a plain name rather than a route: there is no router yet, and
 * inventing one before a second screen exists would be guessing.
 */
export type NavSlotDestination = {
  label: string;
  icon: string;
  screen?: string;
};

/** A screen: an ordered list of placements. */
export type Screen = Slot[];
