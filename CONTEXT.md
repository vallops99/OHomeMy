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
carry several -- the same Area is a Row on one Page and a footer block on
another. Absence of Placement is the ordinary way to keep something off the
panel.
_Avoid_: Assignment, mapping, binding

**Page**:
One view of the panel, named by the first half of a Placement Label.
Open-ended: a Page exists because something is labelled for it, and the renderer
knows no list of them.
`page:main` is the home screen by convention: where the panel rests, and
where it returns to after a period idle elsewhere.
_Avoid_: Screen, view, route

**Region**:
One of the panel's four areas -- `glance`, `left`, `right`, `footer` -- named by
the second half of a Placement Label. Closed: an unrecognised value places
nothing. No Region name contains an underscore, which is what lets the Region be
read back off a slugified Label.
_Avoid_: Column, pane, quadrant, section

**Rendering contract**:
What a Region promises to make of whatever is Placed in it. A Region decides
the *shape* of a component, not only its position: an Area in `right` is a full
row with a slider, while the same Area in `footer` is a block that opens that
Area's Page. This is why the panel needs no separate navigation concept, and why
one Area with two Placements can be both at once.
_Avoid_: Renderer, variant, presentation mode

**Row**:
An Area rendered in `left` or `right`: its name, how many of its lights are on,
a brightness slider, its temperature. The one component that collapses an Area
rather than standing for a single entity.
_Avoid_: Tile, card, area widget

**Popup**:
A Page presented as an overlay on top of whatever Page is current, opened and
closed by Home Assistant rather than by a tap on the panel. Its contents are
Placed like any other Page's; "popup" names how the Page is shown, not a Page.
Closes only on its close button or when Home Assistant closes it.
_Avoid_: Modal (that is @hakit's entity dialog), dialog, overlay, alert

**Feed**:
A camera rendered as its live picture, which is what a camera becomes in
`left` or `right`. In `glance`, cameras stay a motion glance, and tapping it
opens the Page where those same cameras are Placed as Feeds.
_Avoid_: Stream (the transport, not the thing on the panel), video, snapshot

**Derived**:
Resolved from a registry query at render time rather than declared. Only one
Derived rule survives the protocol: a Row consults the `main` Label to find the
light its slider drives and the entity its temperature comes from. Everything
else is Placed explicitly.
_Avoid_: Automatic, implicit, inferred

### State

**Verdict**:
The house's state as a single ranked judgement -- a fault, an open way in, a
lit zone, or nothing to report -- rather than a list of readings. What the
`glance` Region answers.
_Avoid_: Status, summary, overview

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
Marks the entity a Row collapses its Area to -- the light its slider drives,
the entity its temperature reads. Places nothing on its own; consulted only
when an Area renders as a Row.

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
