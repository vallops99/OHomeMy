/**
 * The Room Grid's two decisions, kept out of its component so they are
 * checked rather than looked at (#42): how many columns and rows a number of Areas takes, and which lights
 * *Spegni tutto* turns off.
 */
import type { Area, Entity } from '../ha';

/**
 * The protocol's sizing table. One to three Areas sit in one row; four to
 * eight in two rows of half as many columns, rounded up, so 6 is 3x2 and 5 is
 * 3 + 2; nine or more in four columns, as many rows as that takes -- and the
 * Region scrolls, because a ninth tile at a tile's floor no longer fits.
 *
 * An incomplete last row is not stretched: a grid of fixed columns keeps the
 * others' tile width and leaves the gap at the right.
 */
export function roomGridShape(areas: number): { columns: number; rows: number } {
  if (areas <= 3) return { columns: areas, rows: 1 };
  if (areas <= 8) return { columns: Math.ceil(areas / 2), rows: 2 };
  return { columns: 4, rows: Math.ceil(areas / 4) };
}

/**
 * What *Spegni tutto* turns off: every light that is on, in every Area of the
 * grid -- each one by name, not only the `main` lights, so a lamp that is not
 * part of its room's Aggregate goes off too. Empty while none is on, which is
 * when the button is not a control. An Unavailable light is not on, and is
 * never commanded.
 */
export function lightsOn(areas: Area[]): Entity[] {
  return areas.flatMap(area => area.entities.filter(e => e.domain === 'light' && e.state === 'on'));
}
