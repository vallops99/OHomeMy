# OHomeMy

A Home Assistant integration for building house dashboards graphically. An
admin lays out any number of Dashboards in the Builder, and each one is a page
inside Home Assistant that any user can open or have as their default. It was
first built for, and still runs on, a wall panel at the entrance of a private
Italian house. See [ADR-0015](docs/adr/0015-ohomemy-a-builder-owns-the-layout.md).

The house it was built for is an example throughout, never a definition.
OHomeMy knows nothing about which Areas exist or what they are called.

## Language

### The house

**Area**:
A room or zone of a house, as registered in Home Assistant's area registry.
OHomeMy never invents Areas and holds no list of them. An entity is in the Area
it is assigned to; failing that, its device's Area; failing that, its device's
parent device's Area. This is Home Assistant's own rule.
_In this house, at the time of writing_: Ingresso, Corridoio, Salone, Camera
Chri, Esterno, Cucina, Camera, Ufficio.
_Avoid_: Room, zone, space

**Domain**:
The Home Assistant entity class an entity belongs to, taken from the part of
its entity id before the dot: `light`, `lock`, `camera`, `climate`.
_Avoid_: Type, category, kind

### Building

**Builder**:
OHomeMy Builder, the admin-only place where Dashboards are made, edited and
assigned to users, by dragging Widgets on a live preview of the Dashboard
itself.
_Avoid_: Editor, designer, config panel

**Draft**:
The Builder's working copy of the Dashboards, invisible to everyone else
until it is Published.
_Avoid_: Unsaved changes, pending layout

**Publish**:
Making a Draft the version every open Dashboard shows. It is refused if
someone else Published since the Draft began, and an earlier Publish can be
Restored from history.
_Avoid_: Save, deploy, apply

**Undo**:
Taking back the last edit to the Draft, which Redo puts back. Undo lasts
until the Draft is Published or discarded; after that, only a Restore goes
back.
_Avoid_: Revert, rollback

**Restore**:
Publishing an earlier Publish's document again, over everything since. It is
a Publish of its own, so history only grows.
_Avoid_: Undo, rollback

**Default Dashboard**:
The Dashboard a Home Assistant user lands on when they open Home Assistant.
Only an admin sets it, and only in the Builder. A wall panel logs in as a user
of its own so that it can have one. Publishing a Dashboard's deletion
clears every Default Dashboard that named it; Publishing it back restores
those nobody has changed since.
_Avoid_: Home dashboard, start page

### Structure

**Dashboard**:
One complete, self-contained panel design: its own Pages, its own Home Page,
its own Navbar and the range of screens it fits. Dashboards are unrelated to
one another, so a wall tablet and a phone each get one designed for them. Any
user can open any Dashboard.
_Avoid_: Layout, view, board, screen, panel (for the design; the wall panel
is a device)

**Supported range**:
The screen sizes a Dashboard is designed to fit, so that tablets of similar
sizes share one Dashboard rather than each needing its own. Outside the range
the Dashboard still renders, but nothing promises it fits.
_Avoid_: Breakpoint, resolution, target device

**Page**:
One screen of a Dashboard, laid out as a grid of Widgets. A Dashboard
either fits each Page to the screen, with nothing below the fold, or lets it
scroll.
_Avoid_: Screen, view, route

**Home Page**:
The Page a Dashboard opens on, and the Page it returns to after an idle
spell if the Dashboard is set to.
_Avoid_: Main page, index, start

**Widget**:
One thing placed on a Page: a position and a size on its grid, a Variant,
and settings of its own. It stands for an entity, an Area, a set of them, or
something OHomeMy supplies, like the Clock. Its shape is its own choice, never
decided by where it sits.
_Avoid_: Card, component, tile (a tile is one Variant's look), block

**Variant**:
A Widget's full or compact form, chosen per Widget where its kind has both.
_Avoid_: Size, mode, style

**Smallest box**:
The least box a Widget kind's Variant is promised to fit in, with some room
to spare. A Widget can be made smaller, but then nothing promises it fits, as
outside a Dashboard's Supported range.
_Avoid_: Minimum size, floor

**Navbar**:
A Dashboard's own bar of destinations, at most one per Dashboard, along one
edge of every Page. The admin chooses each item's Page and icon, and the
current Page is marked. In Tabs mode each item keeps its own trail of opened
Pages, which the back gesture walks.
_Avoid_: Dock, tab bar, menu, nav

**Link**:
A Widget that opens a Page when tapped, and does nothing else.
_Avoid_: Page Opener, shortcut, button

**Room Tile**:
A Widget for an Area: its name, how many of its lights are on, its
temperature, and a switch for its chosen light, with a dimmer when that light
can be dimmed. The admin chooses which light and which temperature. It is the
one Widget that stands for an Area rather than a single entity. With a Page to
open, tapping it anywhere but its switch and dimmer opens that Page.
_Avoid_: Row, area widget

**Room Grid**:
A Widget holding a chosen set of Room Tiles under one title, with a control
that turns off every light in all of them. The control does nothing while no
light is on. Each of its Areas is a Member.
_Avoid_: Stanze card, area list

**Group**:
A Widget holding an ordered set of entities of one Domain under one title,
each shown in its own shape. The Group itself controls nothing as a whole: a
Group of locks would otherwise open every gate at once.
_In this house_: Accessi, the two gates.
_Avoid_: Section, card, category

**Member**:
One item in a Widget's chosen set, with settings of its own: an entity in a
Group, with its own name, Variant and tap, or an Area in a Room Grid, with its
own tap. It is not a Widget: it has no place on the grid.
_Avoid_: Item, row, child

**Clock**:
A Widget showing the time and date in the viewer's own formats. It is not an
entity and not a control.
_Avoid_: Header, status bar

**Indoor Reading**:
A Widget showing one temperature, big enough to read on approach, with a
humidity under it. The admin chooses the entity behind each, a thermostat or
a sensor; with no humidity chosen there is no humidity line.
_Avoid_: Hero, temperature card, glance

**Popup**:
A Page shown over whatever Page is current, opened and closed by Home
Assistant rather than by a tap. It is opened by name. It is house-wide: every
Dashboard that lays out a Page for that name shows it, and closing it on one
closes it on all. A Dashboard that defines no Page for the name shows nothing.
At most one is open at a time, and it never closes on its own. Tapping
something on it that opens a Page closes it, house-wide, and that Page opens
underneath on the Dashboard that was tapped.
_Avoid_: Modal (that is @hakit's entity dialog), dialog, overlay, alert

**Camera Wall**:
A Widget holding a chosen set of cameras: one big Feed, beside a strip of the
others as captioned thumbnails. The big one is the camera last tapped; until
one is, the first with motion, else the first. Tapping a thumbnail makes it
big, and the choice starts over each time the Page is opened.
_Avoid_: Feeds region, camera grid

**Feed**:
A camera shown as its live picture. A Feed is loading until its first
frame, then live. One whose stream drops retries on its own. One that Home
Assistant offers no live stream for says so for good. An Unavailable camera
is a Fault and never plays.
_Avoid_: Stream (the transport, not the thing on the screen), video, snapshot

**Motion**:
A camera's motion is a `motion` binary_sensor on the camera's own device,
not its Area: several cameras can share an Area. A camera with no such sensor
never shows motion.
_Avoid_: Activity, detection

### State

**Verdict**:
The house's state as one ranked judgement (a fault, an open way in, a light
left on, or nothing to report) rather than a list of readings.
_Avoid_: Status, summary, overview

**Concern**:
One ranked kind of thing worth reporting (Faults, open ways in, lights on)
and the entities behind it, counted over what one Dashboard shows. The Verdict
is the highest-ranked Concern. Concerns are never capped: hiding one to keep
things short would be a lie.
_Avoid_: Issue, alert, warning, health

**Chip Row**:
A Widget holding a row of chips: one for each Concern worth shouting about
(Faults, open ways in), one for the cameras and one for the alarm. Tapping a
Concern's chip opens its Concern list. Lights on get no chip.
_Avoid_: Status chips, status bar

**Concern list**:
The entities behind one Concern, shown over the current Page when the
Concern is tapped. It is local to the device that was tapped, and Home
Assistant never opens or closes it, which is what makes it not a Popup. Each
entity is named with its Area, and nothing in it is a control. It closes when
its Concern clears, when the device leaves the Page, or after an idle spell.
_Avoid_: Popup, modal, drawer, error list

**Fault**:
An Unavailable entity that a Dashboard actually shows. It is narrower than
Unavailable: Home Assistant's own housekeeping goes unreachable routinely, and
a Dashboard that counted it would cry wolf. Only a Fault is reportable.
_Avoid_: Error, problem, issue

**Unavailable**:
The visible state of an entity Home Assistant cannot reach. Always shown,
never hidden, so a real fault in the house is visible to whoever is looking.
_Avoid_: Offline, missing, error, dead

### Appearance

**Theme**:
A named look, defined for both light and dark. Casa Panel is the first.
Each Dashboard picks one, and a Mode to show it in.
_Avoid_: Skin, palette, style

**Mode**:
Whether a Dashboard shows its Theme light, dark, or switches between them by
following the device or the house. A switch fades in, and never happens while
someone is touching the screen.
_Avoid_: Theme (for light or dark), colour scheme, auto

**Follow the house**:
The Mode that switches on an entity the admin picks, the sun by default, so
Home Assistant decides when it is night. If that entity cannot say, the
Dashboard follows the device; if the device cannot either, it is dark.
_Avoid_: Follow the sun, schedule, auto

**Default title**:
The title a Widget shows until someone writes one. It is translated into each
viewer's own language, while text someone writes is always shown as written.
_Avoid_: Placeholder, label
