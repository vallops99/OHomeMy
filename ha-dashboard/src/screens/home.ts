/**
 * The home screen, Composed.
 *
 * The 4x2 grid of the wall tablet (ADR-0001). Moving a tile is moving a line;
 * swapping one is changing its `kind`. Nothing here names an entity id -- an
 * Area's contents are Derived at render (#3).
 *
 * `phone` spans are omitted throughout: the phone layout is not designed yet,
 * so every slot inherits its tablet span rather than carrying an invented
 * number. Filling one in is a per-slot edit.
 */
import type { Screen } from './slots';

export const home: Screen = [
  { kind: 'status', span: { tablet: { col: 1, row: 2 } } },
  { kind: 'group', label: 'gate', span: { tablet: { col: 1, row: 1 } } },
  { kind: 'room', area: 'salone', icon: 'mdi:sofa' },
  { kind: 'room', area: 'corridoio', icon: 'mdi:door-sliding' },
  { kind: 'room', area: 'camera_chri', icon: 'mdi:bed' },
  { kind: 'room', area: 'ingresso', icon: 'mdi:door-open' },
  { kind: 'room', area: 'giardino', icon: 'mdi:flower' },
];
