# Casa Carina Dashboard

A custom Home Assistant dashboard for a private Italian house, rendered on a wall panel at the entrance. The frontend is **backend-driven**: what exists in the house is declared in Home Assistant's own registries, and the dashboard derives what it renders from them rather than from hardcoded entity ids.

## Language

### Structure

**Area**:
A room or zone of the house, as registered in Home Assistant's area registry. The six areas are Ingresso, Corridoio, Salone, Camera Chri, Esterno, Giardino. The dashboard never invents areas; the registry is the source of truth.
_Avoid_: Room, zone, space

**Domain**:
The Home Assistant entity class an entity belongs to, taken from the part of its entity id before the dot — `light`, `lock`, `camera`, `climate`. Used with Area as the two coordinates that address anything renderable.
_Avoid_: Type, category, kind

**Label**:
A tag applied to an **entity** in Home Assistant, used to express what Area and Domain alone cannot. Home Assistant also permits labels on devices and areas; this project uses entity-level labels only, because a device carries many entities across many Domains and cannot disambiguate between them. Labels are maintained in Home Assistant, not in the frontend, so adding one never requires a code change.
_Avoid_: Tag, marker, flag

**Manifest**:
The set of Areas, Domains and Labels the dashboard expects to find. It describes shape, never instances: it says an Area may contain lights, never that Giardino contains three of them.
_Avoid_: Config, schema, entity list

### Rendering

**Derived**:
Rendered from a registry query, with entity identity never named in code. An Area's contents are always derived.

**Composed**:
Assembled from explicit declaration — which Areas appear on a screen, in what order, alongside which singleton zones. Screen structure is composed; Area contents are not.
_Avoid_: Hardcoded, manual, static

**Aggregate**:
A Home Assistant group entity standing for every entity of one Domain within one Area — `light.tutte_luci_cucina` for all of the kitchen's lights. It is an ordinary entity carrying the `main` Label, so the frontend renders and controls it exactly like any other; all aggregation semantics (combined state, brightness, what a press does) belong to Home Assistant, never to the frontend.
_Avoid_: Summary, rollup, composite

**Individual**:
One entity's own control, reached by drilling into an Area rather than shown on the home screen.
_Avoid_: Single, atomic, leaf

**Singleton**:
Something house-wide with no meaningful Area, addressed by Label instead — the alarm panel, the multiroom speaker. Composed onto screens explicitly.
_Avoid_: Global, house-level, standalone

**Slot**:
One placement on a Screen: what goes there, not what fills it. A Slot names an Area or a Label and leaves the entities to be Derived.
_Avoid_: Widget, card, item

**Screen**:
An ordered list of Slots making up one view of the panel. Screens are Composed.
_Avoid_: Page, layout, dashboard

**Region**:
One of the panel's two columns, each with its own job: the glance layer read on approach, and the touched layer. Every Slot belongs to exactly one.
_Avoid_: Column, pane, section

**Verdict**:
The house's state as a single ranked judgement — a fault, an open way in, a lit zone, or nothing to report — rather than a list of readings. What the glance layer answers.
_Avoid_: Status, summary, overview

**Fault**:
An Unavailable entity the dashboard would actually render. Narrower than Unavailable: Home Assistant's own housekeeping goes unreachable routinely, and a panel that counted it would cry wolf. Only a Fault is reportable.
_Avoid_: Error, problem, issue

**Unavailable**:
The visible state of an entity Home Assistant cannot reach. Always rendered, never hidden, so that a real fault in the house is visible to whoever is standing at the panel.
_Avoid_: Offline, missing, error, dead

## Label vocabulary

Maintained in Home Assistant's label registry. The frontend reads these; it does not define them.

**main**:
Marks the one entity that represents its Domain within its Area when collapsed to a home-screen tile — usually an Aggregate group entity. Applied to entities, never to devices, since its whole job is picking a single one.

**vision**:
A camera. Distinguishes the three EZVIZ cameras from other Esterno and Giardino entities.

**gate**:
An outdoor gate (`lock.esterno_cancello`, `lock.esterno_cancelletto`), as opposed to a door lock. Gates are the most-touched control while arriving or leaving.

**security**:
The alarm panel and the two sirens, which are house-wide rather than belonging to an Area.

**multiroom**:
A media player addressing the whole house (`media_player.ovunque`) rather than one Area's speaker.

**ignored**:
Marks an entity the dashboard must not render, whatever its Area and Domain. The escape hatch that keeps rendering permissive: every Domain outside the denylist renders by default, and anything unwanted is silenced from Home Assistant rather than by a code change.
