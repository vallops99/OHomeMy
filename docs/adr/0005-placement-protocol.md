---
status: superseded by ADR-0015
supersedes: ADR-0003, and ADR-0004's region model
---

# Layout moves out of the repo entirely: the house declares placement with labels

Screens are deleted. What appears on the panel, on which page, in which region,
is declared in Home Assistant with a `page:` + `region:` label pair on Areas
and entities. The frontend becomes a renderer for that protocol
([docs/protocol.md](../protocol.md)) and holds no layout of its own.

## Why reverse ADR-0003

[ADR-0003](0003-screen-definition-format.md) chose a typed `Screen = Slot[]`
because the Map Notes asked for "easily customizable" in a specific sense —
*Valerio editing TypeScript*, and **explicitly not a runtime drag-and-drop
editor**. It delivered that: five classes of mistake fail `tsc`, and the two
test edits are each one line.

The requirement changed underneath it. The panel should be arrangeable by
whoever lives in the house, from a phone, without a rebuild — and a house's
layout is a fact about that house, not about this code. Home Assistant already
has a labelling UI, already stores labels per entity and per Area, and already
syncs them to every client. It is the editor ADR-0003 ruled out, and it turns
out to be the right one.

So the reversal is not "ADR-0003 was wrong". It answered the question it was
asked. The question is different now.

## The decision

**Placement is a pair of labels, both required.** `page:<name>` names a page,
open-ended and unvalidated. `region:<name>` names one of four regions and is
closed. A thing carrying both is placed; a thing carrying one or neither
renders nowhere. Both may sit on an Area or on an entity, independently.

**The region determines the component, not merely the position.** An Area in
`region:entities-right` is a full row with a slider; the same Area in
`region:footer` is a tappable block that opens that Area's page. This is what
lets navigation disappear as a separate concept — the footer *is* the nav — and
it is what makes Esterno need no special case: it carries no placement labels,
so it has no row, while its gates and cameras are placed into the left column
on their own.

**The panel is a 2x2**: `glance` top-left, `entities-left` bottom-left,
`entities-right` as the full-height right column, `footer` along the floor.
`glance` is gated by a Home Assistant helper toggle; with it off, that quadrant
is not rendered and `entities-right` takes the panel's width.

**Two labels survive with narrowed meaning.** `main` is the only Derived rule
left: an Area row consults it to find the light its slider drives and the
entity its temperature comes from. `ignored` stops being a denylist and becomes
a **mute** — it overrides a valid placement, so something can be taken off the
panel for a while and put back by removing one label, with its configuration
still intact underneath.

**Ordering is Areas first, then entities, each in registry sort order.**

## What is given up, deliberately

**The compiler, with nothing replacing it.** ADR-0003's central achievement was
that `area: 'salonee'` fails the build. Before it, that was "a silent no-op
rendering nothing — a typo found by noticing a gap on the wall panel", and the
ADR named that as the failure the typed format existed to end. This ADR chooses
silent skip for malformed labels, which brings that failure mode back:
`region:top-left` is not a region, and a thing labelled with it never appears,
discovered by noticing a hole.

The alternative was a visible fault tile, consistent with the map's rule that a
real fault must be visible to whoever is standing at the panel, and with
`Unavailable`'s treatment in the glossary. It was considered and rejected: a
panel that shouts at every half-finished label would be worse to live with
while labelling a house, and labelling is now an ordinary, ongoing activity
rather than a one-off.

**`Derived` as the system's founding claim.** The glossary opened with the
dashboard deriving what it renders from the registries, and "adding a light in
Home Assistant changes the panel with no code change" was the property ADR-0003
protected. Under this ADR, adding a light changes nothing until it carries two
labels. Code changes have not been eliminated so much as relocated into
Home Assistant — which is the point, since labels are editable from a phone and
code is not, but it is a relocation and not a removal.

**Roughly 120 label assignments** to bring Casa Carina's sixty-odd entities to
what the panel shows today, and two labels per new device thereafter. There is
no "show me everything in this room" default, on Area pages or anywhere else.

## What is kept

Everything ADR-0004's amendment listed as surviving variant D survives this
too, because none of it is layout: `houseReport`'s ranking
(`fault > open > lit > ok`) and its rule that a fault must not silence an open
gate; temperature coming from a `climate` entity's `current_temperature` rather
than a scan for a `temperature` sensor; the rule that a fault is reportable only
if the dashboard renders the thing at all; cameras as a motion glance and media
as contextual.

[ADR-0001](0001-design-system.md) (computed tokens) and
[ADR-0002](0002-component-layer.md) (the @hakit seam) are untouched. Components
still take their pixels from the tokens and every Home Assistant concern still
enters through `src/ha/`. What changes is only who decides which components
appear and where.

## Consequences

- `src/screens/` is deleted, and `KnownAreaId` / `KnownLabel` with it. The
  manifest stops generating frontend types; `fake-house/manifest.yaml` reverts
  to being a fixture for an unwired house and nothing more.
- [ADR-0004](0004-home-screen-layout.md)'s region model — variant D's two
  intrinsically-sized columns — is superseded by the 2x2. Its amendment's
  lesson stands: fit is a thing to measure, not a thing to add up, and the 2x2
  inherits that obligation.
- The protocol is a published contract, not an implementation detail. It lives
  in [docs/protocol.md](../protocol.md) as the normative reference, because
  someone labelling a house needs it and `CONTEXT.md` is a glossary.
- The renderer must tolerate a house labelled by hand, mid-edit, with
  contradictions in it. Silently skipping what it cannot honour is the whole of
  its error handling.
