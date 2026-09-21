/**
 * The screen-definition format (#9).
 *
 * Screens are Composed from a typed array of Slots (CONTEXT.md). Map Notes
 * require that swapping and moving components be an easy TypeScript edit, and
 * that is what this shape buys:
 *
 *   - moving a tile is moving a line
 *   - swapping a component is changing one `kind`
 *   - an invalid screen does not compile
 *
 * Area *contents* stay Derived: a Slot says "the Salone tile goes here",
 * never which lights are in it. Adding a light in Home Assistant changes the
 * panel with no code change.
 */
import type { KnownAreaId, KnownLabel } from '../ha';

/**
 * How many grid cells a slot occupies.
 *
 * `phone` is optional and falls back to `tablet`. The wall tablet is the
 * designed target (#2); the phone layout has had no design work, so a slot
 * that omits `phone` inherits rather than forcing an invented number. When
 * the phone view is designed, filling these in is a local edit per slot.
 *
 * These are CSS Grid spans, not @hakit's 12-column `AvailableQueries`: our
 * `Tile` passes `disableColumns`, so @hakit's column system is deliberately
 * inert here and the grid in `ui/Grid.tsx` owns layout (#7).
 */
export type Span = {
  tablet: { col: number; row: number };
  phone?: { col: number; row: number };
};

/** Which device's spans to resolve. */
export type Device = 'tablet' | 'phone';

/** Resolve a slot's span for a device, falling back to the tablet layout. */
export function spanFor(span: Span | undefined, device: Device): { col: number; row: number } {
  if (!span) return { col: 1, row: 1 };
  if (device === 'phone') return span.phone ?? span.tablet;
  return span.tablet;
}

/** Fields every slot shares. */
type Base = {
  /** Cells occupied. Omitted means 1x1. */
  span?: Span;
};

/**
 * One placement on a screen.
 *
 * `room` collapses an Area to a tile; `group` places every entity carrying a
 * Label (so a gate added in Home Assistant appears with no code change);
 * `single` places one specific entity from a Label, for when a cell must hold
 * a particular thing.
 */
export type Slot =
  | (Base & { kind: 'room'; area: KnownAreaId; icon?: string })
  | (Base & { kind: 'group'; label: KnownLabel })
  | (Base & { kind: 'single'; label: KnownLabel; index?: number })
  | (Base & { kind: 'status' })
  /**
   * The gates, ranked. `primary` names the one the panel is mostly about, by
   * its position among the entities carrying the Label -- not by entity id,
   * so the house still decides how many gates there are (#8).
   */
  | (Base & { kind: 'gates'; label: KnownLabel; primary?: number })
  /** The alarm, placed by Label. A Singleton (CONTEXT.md). */
  | (Base & { kind: 'alarm'; label: KnownLabel })
  /** Every camera carrying the Label, collapsed to a motion glance. */
  | (Base & { kind: 'cameras'; label: KnownLabel })
  /**
   * The media strip. Contextual: it shows whatever is playing across every
   * media player in the house, and says so quietly when nothing is.
   */
  | (Base & { kind: 'media' })
  /** The bottom navigation bar. Destinations are declared on the screen. */
  | (Base & { kind: 'nav'; destinations: NavSlotDestination[] });

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
