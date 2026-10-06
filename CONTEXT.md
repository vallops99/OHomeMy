# Casa Carina Dashboard

A Home Assistant panel renderer, built for and running on a wall panel at the
entrance of a private Italian house. The frontend holds **no layout**: what
appears, on which page, in which region, is declared in Home Assistant with
labels, and the frontend renders whatever it is told. See
[the placement protocol](docs/protocol.md) for the grammar,
[ADR-0005](docs/adr/0005-placement-protocol.md) for why, and
[ADR-0008](docs/adr/0008-fused-placement-labels.md) for why one label carries a
whole Placement.

The house it was built for is an example throughout, never a definition. The
renderer knows nothing about which Areas exist or what they are called.

## Language

### Structure

**Area**:
A room or zone of a house, as registered in Home Assistant's area registry. The
dashboard never invents Areas and holds no list of them; the registry is the
source of truth. _In this house, at the time of writing_: Ingresso, Corridoio,
Salone, Camera Chri, Esterno, Cucina, Camera, Ufficio.
An entity is in the Area it is assigned to; failing that, its device's Area;
failing that, its device's parent device's Area. This is Home Assistant's own
rule, applied to every Domain alike, so an entity is in the same Area here as
in Home Assistant. An entity that shows up in the wrong Area is fixed in Home
Assistant, by giving it an Area of its own or the `ignored` Label.
_Avoid_: Room, zone, space

**Domain**:
The Home Assistant entity class an entity belongs to, taken from the part of
its entity id before the dot -- `light`, `lock`, `camera`, `climate`.
_Avoid_: Type, category, kind

**Label**:
A tag applied to an **entity** or an **Area** in Home Assistant, used to
express what Area and Domain alone cannot. Labels carry every placement
decision, so rearranging the panel never requires a code change or a rebuild.
_Avoid_: Tag, marker, flag

**Placement Label**:
The Label that spells one Placement, structured as `page:<page>:<region>` --
`page:main:footer`. Home Assistant's labels are flat strings with no values of
their own, so the protocol reads both coordinates out of the one name; two
separate labels could not stay bound to each other.
_Avoid_: Prefixed label, namespaced label, coordinate, key-value label

### Placement

**Placement**:
One appearance of something on the panel: a Page and a Region together, spelled
by one Placement Label. An Area or entity carrying one is **Placed**, and it may
carry several -- the same Area is a Room Tile on one Page and a footer block on
another. Absence of Placement is the ordinary way to keep something off the
panel.
_Avoid_: Assignment, mapping, binding

**Page**:
One view of the panel, named by the first half of a Placement Label.
Open-ended: a Page exists because something is labelled for it, and the renderer
knows no list of them.
`page:main` is the home screen by convention: where the panel rests, and
where it returns to after a period idle elsewhere. Any other Page is either an
**Area Page**, named by an Area's id and opened by that Area's block or Room Tile,
or a **Topic Page**, named after a subject rather than a place --
`page:clima`, `page:sicurezza`, `page:media`.
_Avoid_: Screen, view, route

**Topic Page**:
A Page about a subject the house's Areas do not divide up -- the climate, the
house's security, its media, its services. No Area stands for it and none is
invented to reach it: its front door is a Page Opener, and its members lead to
it too (see Derived).
_Avoid_: View, section, category page

**Page Opener**:
A Home Assistant `input_button` that stands for a Topic Page, the way an Area
stands for its own: Placed like anything else, shown with its name and icon,
and opening `page:<its object id>` when tapped -- `input_button.sicurezza`
opens `page:sicurezza`. In `footer` it is an item of the Dock; in `left` or
`right` it is a block, skipped on its own Page as an Area's is. It cannot
render in `glance`. It holds no state and controls nothing; pressing it in
Home Assistant does nothing.
_Avoid_: Shortcut, link, nav button, fake Area

**Dock**:
Where `footer`'s Page Openers go: a fixed bar of destinations, Casa first --
the way home, supplied by the renderer and present on every Page, `page:main`
included -- then the Page Openers in registry order. The item for the current
Page stays and is marked as current; this is the one place a Page Opener is
not skipped on its own Page. Everything else in `footer` sits beside it. On
`page:main` a Dock that would hold only Casa is not shown.
_Avoid_: Nav bar, tab bar (that is the phone's Tab), menu

**Group**:
A titled set of entities rendered together as one card, declared by a Home
Assistant Group helper: the helper is what gets Placed, its name is the card's
title, and its members are what the card shows, each in its own shape. The
helper's own state and controls are never shown -- a lock Group would
otherwise open every gate at once. One Domain per Group, because Home
Assistant's helper allows no more, and a Group holds entities, never Areas.
Renders in `left` and `right` only. A member Placed on its own in the same
Region of the same Page shows inside the card only; an Unavailable member is
a Fault in its own place in the card.
_In this house_: Accessi, the two gates.
_Avoid_: Section, card, category

**Room Grid**:
The Areas Placed in a Region, rendered together as one grid of Room Tiles under
the title *Stanze*, with *Spegni tutto* beside it: every light in every one of
those Areas off, and not a control while none is on. Not a Group: Areas cannot be a Group's members, and every
Room Grid is a grid of rooms, so its title never varies.
_Avoid_: Stanze card, area list

**Clock**:
The time and date at the top left of every Page, supplied by the renderer; a
Popup has none. On a phone it tops the Casa Tab only: a Page opened in a Tab
has its name there instead. Not
an entity, not Placed, not a control.
_Avoid_: Header, status bar

**Region**:
One of the panel's four areas -- `glance`, `left`, `right`, `footer` -- named by
the second half of a Placement Label. Closed: an unrecognised value places
nothing. No Region name contains an underscore, which is what lets the Region be
read back off a slugified Label.
_Avoid_: Column, pane, quadrant, section

**Tab**:
On a phone, one of the three destinations `page:main`'s Regions become:
Casa (`glance` and `left`), Stanze (`right`), Altro (`footer`). A Page opened
from a Tab opens inside it (ADR-0011). The wall panel has none.
_Avoid_: Screen, section

**Rendering contract**:
What a Region promises to make of whatever is Placed in it. A Region decides
the *shape* of a component, not only its position: an Area in `right` is a Room
Tile, while the same Area in `footer` is a block that opens that Area's Page. This is why the panel needs no separate navigation concept, and why
one Area with two Placements can be both at once. The Page never decides
shape: the same thing in the same Region looks the same on every Page, and
where a Domain needs a full and a compact form, the Regions choose between
them -- `left` and `right` the full one, `footer` the compact one. A
`media_player` is the exception: only `right` gets its full card, and in
`left` it stays the compact strip.
_Avoid_: Renderer, variant, presentation mode

**Room Tile**:
An Area rendered in `left` or `right`: its name and a chevron, how many of
its lights are on, its temperature, a switch for its `main` light and, when
that light can be dimmed, a dimmer. An Area whose `main` light is on/off only
has the switch and no dimmer; one with no `main` light has neither, and says
it has no light. The one component that collapses an Area rather than
standing for a single entity. Tapping the tile opens the Area's Page -- the
same Page its footer block opens; the switch and dimmer control the light in
place. Holding it does nothing.
_Avoid_: Row, card, area widget

**Popup**:
A Page presented as an overlay on top of whatever Page is current, opened and
closed by Home Assistant rather than by a tap on the panel. Its contents are
Placed like any other Page's; "popup" names how the Page is shown, not a Page.
House-wide: every panel shows the same Popup, and closing it on one closes it
on all. Closes on its close button, when Home Assistant closes it, or when
something inside it navigates -- never on its own. At most one at a time: a new
Popup replaces the current one. It shows only its own Regions: no Clock, no
Dock, and nothing that leads off it but its close button.
_Avoid_: Modal (that is @hakit's entity dialog), dialog, overlay, alert

**Feed**:
A camera rendered as its live picture, over WebRTC and nothing else, which is
what a camera becomes in `left` or `right`. A Region's cameras render
together: one big Feed, and beside it a strip of the others as 16:9
thumbnails, each captioned with its name and status. The big one is the camera
last tapped; until one is, the first with motion, else the first. Tapping a
thumbnail makes it big; tapping the big one does nothing, and a Feed never
navigates. Which one is big starts over each time the Page is opened.
A Feed is loading (`Connessione…`) until its first frame, then live
(`In diretta`, or `Movimento`). One whose stream fails or drops says
`Riconnessione…` and tries again after 5 s, or at once on `Riprova`. A camera
Home Assistant offers no live stream for says so for good, with no retry
(`Nessun video in diretta`). An Unavailable camera is a Fault and never plays.
In `glance`, cameras stay a motion glance, and tapping it opens the Page where
those same cameras are Placed as Feeds.
_Avoid_: Stream (the transport, not the thing on the panel), video, snapshot

**Derived**:
Resolved from a registry query at render time rather than declared. Four
Derived rules survive the protocol, and everything else is Placed explicitly:
- A Room Tile consults the `main` Label to find the light its switch and
  dimmer drive and the entity its temperature comes from.
- A camera's motion is a `motion` binary_sensor on the camera's own
  **device**, not its Area: several cameras can share an Area, as the three
  outdoor ones share Esterno. A camera with no such sensor never shows motion.
- The camera glance opens the Page where every one of its cameras is also
  Placed in `left` or `right`, other than the current Page; of several, the
  first in label-registry order. With none, the glance is not a control.
- Any other entity in `footer` leads to the other Page where that same
  entity is Placed in `left` or `right`, chosen as the camera glance chooses.
  Tapping it still does its own action, and a trailing chevron, or a swipe
  right, opens the Page. With no such Page there is no chevron.
  In `glance` the same rule opens on a tap, because nothing there has an
  action of its own: the temperature leads where its `climate` is Placed, the
  consumption where its power `sensor` is. The chips are exempt: they open
  Concern lists.
_Avoid_: Automatic, implicit, inferred

### State

**Verdict**:
The house's state as a single ranked judgement -- a fault, an open way in, a
lit zone, or nothing to report -- rather than a list of readings. What the
`glance` Region answers.
_Avoid_: Status, summary, overview

**Concern**:
One ranked kind of thing worth reporting at the door -- Faults, open ways in,
lit zones -- and the entities behind it. The Verdict is the highest-ranked
Concern; each Concern the panel still reports is one chip in `glance`, except
lit zones, which the lights stat states instead. The chips are never capped: a
Concern hidden to keep the row short would be a lie.
_Avoid_: Issue, alert, warning, health

**Concern list**:
The entities behind one Concern, shown over the current Page when its chip is
tapped. Panel-local: only the panel that was tapped shows it, and Home
Assistant never opens or closes it -- which is what makes it not a Popup. Not
a Page either: nothing is Placed in it; its contents are Derived from the
Concern. Each entity is named with its Area, and nothing in it is a control.
It stays current while open, and closes on its close button, a tap outside
it, the panel leaving the Page it was opened on (the idle return, a Tab
change), when its Concern clears, or after the same idle spell untouched --
on `page:main` and on a phone too, where no idle return runs. A Popup covers
it without closing it.
_Avoid_: Popup, modal, drawer, error list

**Fault**:
An Unavailable entity the dashboard would actually render. Narrower than
Unavailable: Home Assistant's own housekeeping goes unreachable routinely, and
a panel that counted it would cry wolf. Only a Fault is reportable.
_Avoid_: Error, problem, issue

**Unavailable**:
The visible state of an entity Home Assistant cannot reach. Always rendered,
never hidden, so that a real fault in the house is visible to whoever is
standing at the panel.
_Avoid_: Offline, missing, error, dead

## Label vocabulary

Maintained in Home Assistant's label registry. The frontend reads these; it
does not define them. The normative grammar is in
[docs/protocol.md](docs/protocol.md).

**page:PAGE:REGION**:
A whole Placement in one Label: which Page the thing appears on, and which
Region -- and therefore which Rendering contract -- it takes there. The Page is
any value and the renderer validates nothing; the Region is one of `glance`,
`left`, `right`, `footer`. A thing carries one per Placement.

**main**:
Marks the entity a Room Tile collapses its Area to -- the light its switch
and dimmer drive,
the entity its temperature reads. Places nothing on its own; consulted only
when an Area renders as a Room Tile.

**ignored**:
A **mute** on a whole thing, every Placement at once. Overrides valid
Placements, so something can be taken off the panel for a while and put back by
removing one Label, with its Placements intact underneath. Not a denylist: under
the protocol an unlabelled thing is already invisible. To drop a single
appearance, delete that one Placement Label instead.

**gate**, **vision**, **security**, **multiroom**:
Descriptive Labels naming what a thing *is* -- an outdoor gate as opposed to a
door lock, a camera, the alarm panel and sirens, a house-wide media player.
They carry no Placement; a thing is on the panel because it is Placed, not
because it is one of these.
