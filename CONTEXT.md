# Casa Carina Dashboard

A Home Assistant panel renderer, built for and running on a wall panel at the
entrance of a private Italian house. The frontend holds **no layout**: what
appears, on which page, in which region, is declared in Home Assistant with
labels, and the frontend renders whatever it is told. See
[the placement protocol](docs/protocol.md) for the grammar and
[ADR-0005](docs/adr/0005-placement-protocol.md) for why.

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

**Prefixed Label**:
A Label whose value is structured as `prefix:value` -- `page:main`,
`region:footer`. Home Assistant's labels are flat strings with no values of
their own, so the protocol reads structure out of the name.
_Avoid_: Namespaced label, key-value label

### Placement

**Placement**:
The pair of Prefixed Labels that puts something on the panel: a `page:` and a
`region:`, both required. An Area or entity carrying both is **Placed**;
carrying one or neither, it renders nowhere. Absence of Placement is the
ordinary way to keep something off the panel.
_Avoid_: Assignment, mapping, binding

**Page**:
One view of the panel, named by a `page:` Label. Open-ended: a Page exists
because something is labelled for it, and the renderer knows no list of them.
`page:main` is the home screen by convention: where the panel rests, and
where it returns to after a period idle elsewhere.
_Avoid_: Screen, view, route

**Region**:
One of the panel's four areas -- `glance`, `entities-left`, `entities-right`,
`footer` -- named by a `region:` Label. Closed: an unrecognised value places
nothing.
_Avoid_: Column, pane, quadrant, section

**Rendering contract**:
What a Region promises to make of whatever is Placed in it. A Region decides
the *shape* of a component, not only its position: an Area in
`region:entities-right` is a full row with a slider, while the same Area in
`region:footer` is a block that opens that Area's Page. This is why the panel
needs no separate navigation concept.
_Avoid_: Renderer, variant, presentation mode

**Row**:
An Area rendered in an entity Region: its name, how many of its lights are on,
a brightness slider, its temperature. The one component that collapses an Area
rather than standing for a single entity.
_Avoid_: Tile, card, area widget

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

**page:NAME**:
Half of a Placement: which Page the thing appears on. Any value; the renderer
validates nothing.

**region:NAME**:
The other half: which Region, and therefore which Rendering contract. One of
`glance`, `entities-left`, `entities-right`, `footer`.

**main**:
Marks the entity a Row collapses its Area to -- the light its slider drives,
the entity its temperature reads. Places nothing on its own; consulted only
when an Area renders as a Row.

**ignored**:
A **mute**. Overrides a valid Placement, so something can be taken off the
panel for a while and put back by removing one Label, with its Placement intact
underneath. Not a denylist: under the protocol an unlabelled thing is already
invisible.

**gate**, **vision**, **security**, **multiroom**:
Descriptive Labels naming what a thing *is* -- an outdoor gate as opposed to a
door lock, a camera, the alarm panel and sirens, a house-wide media player.
They carry no Placement; a thing is on the panel because it is Placed, not
because it is one of these.
