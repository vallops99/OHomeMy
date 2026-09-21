/**
 * The home screen, Composed (#8).
 *
 * The entrance panel: read on approach, touched while arriving or leaving.
 * Moving a tile is moving a line; swapping one is changing its `kind`.
 * Nothing here names an entity id -- an Area's contents are Derived (#3),
 * and even the gates are placed by Label, so the house decides how many
 * exist and adding a third needs no edit here.
 *
 * The four rows are not equal (see `grid` in theme/tokens.ts):
 *
 *   row 1  180 px  the glance layer -- "is the house okay?" -- and the alarm
 *   row 2  227 px  the arriving row: both gates, then the two rooms you
 *                  walk into
 *   row 3  227 px  the rest of the house, and what the cameras can see
 *   row 4   96 px  media and navigation
 *
 * Esterno is deliberately absent as a `room`: it has no light, so a RoomTile
 * there would render an empty control. It is on the panel as its gates and
 * its cameras, which is what that Area actually is.
 *
 * `phone` spans are omitted throughout: the phone layout is not designed yet,
 * so every slot inherits its tablet span rather than carrying an invented
 * number. Filling one in is a per-slot edit.
 */
import type { Screen } from './slots';

export const home: Screen = [
  // Row 1 -- the verdict, wide enough to spell it out, beside the readings.
  { kind: 'status', span: { tablet: { col: 3, row: 1 } } },
  { kind: 'alarm', label: 'security' },

  // Row 2 -- the arriving row. Both gates are full-size touch targets; the
  // primary one (Cancello, the driveway) is told apart by weight rather than
  // by size, so reaching for "the gate" does not mean reading two labels.
  { kind: 'gates', label: 'gate', primary: 1 },
  { kind: 'room', area: 'salone', icon: 'mdi:sofa' },
  { kind: 'room', area: 'ingresso', icon: 'mdi:door-open' },

  // Row 3 -- the rest of the house, and the outside.
  { kind: 'room', area: 'corridoio', icon: 'mdi:door-sliding' },
  { kind: 'room', area: 'camera_chri', icon: 'mdi:bed' },
  { kind: 'room', area: 'giardino', icon: 'mdi:flower' },
  { kind: 'cameras', label: 'vision' },

  // Row 4 -- secondary. Media only speaks when something is playing.
  { kind: 'media', span: { tablet: { col: 2, row: 1 } } },
  {
    kind: 'nav',
    span: { tablet: { col: 2, row: 1 } },
    // `screen` is absent on all four: none of these views is built yet (#1,
    // "Not yet specified"), so the bar shows them disabled rather than
    // pretending. Adding one later is adding `screen` to its line.
    destinations: [
      { label: 'Clima', icon: 'mdi:thermostat' },
      { label: 'Sicurezza', icon: 'mdi:shield-home' },
      { label: 'Media', icon: 'mdi:play-circle' },
      { label: 'Servizi', icon: 'mdi:robot-vacuum' },
    ],
  },
];
