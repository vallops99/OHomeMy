/**
 * The home screen, Composed.
 *
 * Moving a tile is moving a line. Swapping one is changing its `kind`.
 * Nothing here names an entity id -- an Area's contents are Derived at render.
 */
import type { Slot } from './slots';

export const home: Slot[] = [
  { kind: 'status', colSpan: 1, rowSpan: 2 },
  { kind: 'gates', colSpan: 1, rowSpan: 1 },
  { kind: 'room', area: 'salone', icon: 'mdi:sofa' },
  { kind: 'room', area: 'corridoio', icon: 'mdi:door-sliding' },
  { kind: 'room', area: 'camera_chri', icon: 'mdi:bed' },
  { kind: 'room', area: 'ingresso', icon: 'mdi:door-open' },
  { kind: 'room', area: 'giardino', icon: 'mdi:flower' },
];
