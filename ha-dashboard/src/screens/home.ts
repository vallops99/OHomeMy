/**
 * The home screen, Composed (#6's variant D, restored).
 *
 * The entrance panel: read on approach, touched while arriving or leaving.
 * Moving a row is moving a line; moving something between the two columns is
 * changing one word. Nothing here names an entity id -- an Area's contents
 * are Derived (#3), and even the gates are placed by Label, so the house
 * decides how many exist and adding a third needs no edit here.
 *
 * The panel is two regions (see ui/Panel.tsx):
 *
 *   sidebar  the glance layer: the hero temperature, the house's concerns as
 *            chips, what the cameras see, and the gates -- the most-touched
 *            control while arriving or leaving
 *   main     the touched layer: one row per Area, then a strip of secondary
 *            controls along the floor of the panel
 *
 * Esterno is deliberately absent as a `room`: it has no light, so a RoomRow
 * there would render an empty control. It is on the panel as its gates and
 * its cameras, which is what that Area actually is.
 */
import type { Screen } from './slots';

export const home: Screen = [
  // --- The sidebar: the arrival column, top to bottom. ---

  // The one number read on approach: the indoor temperature, from the
  // thermostat's own reading rather than a scan for the first temperature
  // sensor -- that scan found an Amazon Echo's self-heating chip (#8).
  { kind: 'hero', region: 'sidebar' },
  { kind: 'stats', region: 'sidebar' },

  // The verdict, rendered small. A fault is an outline chip proportionate to
  // one unreachable light, not a flood that turns the glance layer red (#6).
  { kind: 'chips', region: 'sidebar', label: 'security' },

  // What the cameras can see, filling what #6 left as dead space between the
  // chips and the gates. Cameras and gates are both the "outside" story.
  { kind: 'cameras', region: 'sidebar', label: 'vision' },

  // The primary affordance. Both gates are full-size touch targets; the
  // primary one (Cancello, the driveway) is told apart by weight rather than
  // by size, so reaching for "the gate" does not mean reading two labels.
  { kind: 'gates', region: 'sidebar', label: 'gate', primary: 1 },

  // --- The main column: one row per Area, then the bottom strip. ---

  { kind: 'room', region: 'main', area: 'salone', icon: 'mdi:sofa' },
  { kind: 'room', region: 'main', area: 'ingresso', icon: 'mdi:door-open' },
  { kind: 'room', region: 'main', area: 'corridoio', icon: 'mdi:door-sliding' },
  { kind: 'room', region: 'main', area: 'camera_chri', icon: 'mdi:bed' },
  { kind: 'room', region: 'main', area: 'giardino', icon: 'mdi:flower' },

  // The strip, along the floor. Media only speaks when something is playing.
  { kind: 'media', region: 'main', span: { tablet: { col: 2 } } },
  {
    kind: 'nav',
    region: 'main',
    span: { tablet: { col: 2 } },
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
