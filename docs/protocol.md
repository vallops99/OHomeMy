# The placement protocol

The frontend holds no layout. What appears on the panel, on which page, in
which region, is declared in Home Assistant with labels on Areas and entities.
This document is the normative grammar: it is what you need to know to label a
house, and what the renderer is obliged to honour.

## The placement label

A **placement label** carries a whole placement in one string:

```
page:<page>:<region>
```

Both coordinates are in the one label, because Home Assistant's labels are a
flat unordered set: two separate labels could not stay bound to each other
(see [ADR-0008](adr/0008-fused-placement-labels.md)). A thing carrying a
well-formed placement label is **placed**. A thing carrying none renders
nowhere — there is no default page and no default region, and absence of
placement is the ordinary way to keep something off the panel.

A placement label may be carried by an **Area** or by an **entity**. The two
are independent: placing an Area does not place the entities inside it, and
placing an entity does not require its Area to be placed anywhere.

## Several placements

A thing may carry **as many placement labels as it has placements**, and each
is resolved on its own:

```
area salone:            [page:main:right, page:cucina:footer]
media_player.ovunque:   [page:main:footer, page:salone:footer]
```

Salone is a full row on the home screen and a tappable block in the cucina
page's footer. The region decides the shape of each appearance independently,
so the same Area is a row in one place and a nav block in another.

**Exact duplicates render once.** Two placement labels naming the same page
*and* the same region are deduplicated. Two naming the same page and different
regions are not a mistake — the thing renders in both regions of that page.

## `page:`

The page half is open-ended. Any value names a page, and a page exists because
something is labelled for it. The renderer knows no list of pages and cannot
validate the name.

```
page:main:right        the home screen
page:salone:right      an Area's own page
page:clima:footer      whatever you decide it is
```

A page name is open-ended in this protocol, but Home Assistant's label registry
is not: the label has to **exist** there before you can put it on anything.
Creating `page:clima:right` in Home Assistant's label UI is the first step of
making that page.

This is the protocol's arithmetic working against you: each page×region
combination is its own registry entry. A new page needs one label created per
region you actually use on it — up to four — where the old paired grammar
needed only one new `page:` label. They are created as you need them; the
registry is deliberately not pre-filled with combinations that place nothing,
because those clutter the very picker you are labelling from.

`page:main` is the panel's home screen by convention: it is what the renderer
shows at rest, and what it returns to — the panel comes back to `page:main` on
its own after 240 seconds idle on any other page (see "Getting back", below).
Every other page is reached by placing an Area in some footer (see `footer`).

## The region

Closed. Four values, and an unrecognised one places nothing.

The panel is a 2x2: two stacked regions on the left, one tall region on the
right, and a strip along the floor.

```
+---------------------+--------------------------------+
|  glance             |                                |
|                     |  right                         |
+---------------------+                                |
|                     |                                |
|  left               |                                |
|                     |                                |
+---------------------+--------------------------------+
|  footer                                              |
+------------------------------------------------------+
```

| region | what it is |
| --- | --- |
| `glance` | the top-left quadrant: temperature, humidity, lights on, consumption, and the house's concerns as chips. Read on approach from 2 m. |
| `left` | the bottom-left quadrant. |
| `right` | the right column. On `page:main` this is mostly Areas; on other pages it is whatever the page is about. |
| `footer` | the strip along the floor: media, the blocks that open other pages, and — on every page but `page:main` — a renderer-supplied block back home. |

None of the four names contains an underscore, and that is load-bearing rather
than cosmetic. Home Assistant slugifies a label's name into its id, collapsing
`:` and `-` alike into `_`, so `page:main:right` arrives as `page_main_right`
and the region is unambiguously whatever follows the last underscore. Two of
these regions used to be called `entities-left` and `entities-right`; the
collapsed `page_main_entities_right` could not be split without a longest-match
table and a rule forbidding page names that end in a region slug.
[ADR-0008](adr/0008-fused-placement-labels.md) records the trade.

### The region decides the shape

This is the rule that makes the protocol more than addressing. **A region is a
rendering contract, not just a position.** The same Area labelled into two
different regions produces two different components:

| an Area in… | renders as |
| --- | --- |
| `right` | a full row — the Area's name, how many of its lights are on, a brightness slider, its temperature |
| `footer` | a single tappable block that opens that Area's page |

So the footer is the navigation. There is no separate nav concept: a page
button is an **Area** placed in a footer, and tapping it opens
`page:<that area's id>` — the id from Home Assistant's area registry, not the
display name, so `area salone` (named "Soggiorno") opens `page:salone`.

Only an Area navigates. An entity in the footer renders as its own component
and opens nothing: an entity is not an Area, so there is no
`page:<that entity>` for it to open. `media_player.ovunque` in the footer is
the transport strip, not a page button.

Navigation is flat: any page's footer opens any page, directly, with no
hierarchy and no back stack. Going from one Area page to another is always
"go to page X" — there is no notion of a path you retrace.

**An Area does not appear in its own page's footer.** `area corridoio` carrying
`page:corridoio:footer` would be a block, on the corridoio page, that opens the
corridoio page. The renderer skips it. This matters more than it used to:
placing every Area in every page's footer is now one label each, and the
self-referential one falls out of that move by accident every time.

### Getting back

You do not label a way home. On every page except `page:main`, the renderer
prepends a "Casa" block to the footer, in front of whatever you placed there.
Tapping it returns to `page:main`. `page:main` itself never gets one — it has
nowhere to go back to.

This is the one piece of the panel's layout that is not declared by a label:
every page needs a way out, and a page whose house-editor forgot to label a
way home would otherwise be a dead end. So the renderer supplies it,
unconditionally, on every page but the one that doesn't need it.

The panel also returns to `page:main` by itself: after 240 seconds with no
touch on a page other than `page:main`, it navigates home on its own. The
panel sits at the entrance, and its resting state is meant to be readable by
whoever walks up to it next — not whatever page the last person left it on.

### The glance region collapses — two ways

`glance` resolves per page, exactly like every other region: it is whatever
is placed into `page:<current>:glance`. A page with nothing placed in `glance`
has no glance quadrant, and `right` takes the width of the panel — the same
collapse the helper toggle below produces. If you want the house's verdict —
temperature, alarm, faults — visible on a page other than `page:main`, label
those entities into that page's glance too. A second placement label on the
same entity is exactly how: `page:main:glance` and `page:clima:glance`
side by side. Nothing carries over automatically.

`glance` is *also* gated by a Home Assistant helper entity — a toggle,
changeable from a phone without rebuilding the frontend. With the toggle off,
the glance quadrant is not rendered on any page, regardless of what is
labelled into it, and `right` takes the width of the panel.

## Ordering

Within a region: **Areas first, then entities.** Each group in its own Home
Assistant registry sort order.

Each page×region is filled independently, so a thing with several placements
takes its place in each region's order separately. Exact duplicates are
removed as the region is collected, before it is ordered: a thing occupies a
region once.

This is a total order and it has a consequence worth stating plainly: an entity
can never be placed between two Areas in the same region. A media player in the
footer always follows every Area block there. If you need a different order,
reorder the registries.

## `main`

The one Derived rule left. An Area rendered as a row in `right` has to know
which light its slider drives and which entity reports its temperature. It
takes them from the entities in that Area carrying the `main` label.

`main` places nothing on its own. It is only consulted when an Area row
collapses its Area.

## `ignored`

A **mute**. An entity or Area carrying `ignored` is not rendered, even when it
carries valid placement labels. `ignored` overrides placement, and it mutes the
**whole thing** — every one of its placements at once, not one appearance.

Its purpose is temporary removal without losing configuration: take something
off the panel for a while and put it back by removing one label, with its
placements still intact underneath. To remove a single appearance, delete that
one placement label.

## Malformed placement renders nothing

The renderer silently skips what it cannot honour:

- a region value it does not recognise — `page:main:rigth`, `page:main:top-left`
- a placement label with no region half — `page:main`
- a placement label with nothing before the region — `page:footer` is a page
  named nothing, not a bare region
- extra coordinates — `page:main:footer:extra`

Nothing is drawn and no fault is reported. **A typo is found by noticing that
something is missing from the panel.** This is a deliberate choice and it has a
cost, now slightly higher than it was: one label carries two coordinates, so
there is one more place for a typo to hide, and it is still invisible.

## An empty page renders a message

This is a different case from malformed placement, above. A page can be
perfectly well-formed — reached by a valid footer block, correctly opened —
and still have nothing placed on it, because nothing has been labelled with
that page yet. That page renders an explicit Italian message instead of four
empty regions.

A page whose every placement label is malformed renders the same message. The
two are not distinguished: the message is true either way, and what you do next
— go and look at the labels — is the same.

The footer block that opens it still renders and still works; only the page
on the other side of the tap is empty. It still gets the "Casa" block
described above, the same as any other page — a page with nothing on it is
exactly the page you least want to be stuck on.

You will hit this within minutes of creating a new page: label one Area's
footer block to open `page:clima` before anything else carries a `page:clima:*`
label, and tapping it shows the message rather than a blank panel.

## Worked example

Casa Carina's home screen, as the protocol expresses it:

```yaml
# The Salone row: name, lights-on count, slider, temperature.
area salone:            [page:main:right]
light.luci_salone:      [main]              # drives the row's slider
climate.salone_termo:   [main]              # reports the row's temperature

# One specific light, standing alone next to that row.
light.led_cucina:       [page:main:right]

# The gates, in the bottom-left quadrant.
lock.esterno_cancello:     [page:main:left]
lock.esterno_cancelletto:  [page:main:left]

# Esterno itself is not labelled at all, so it has no row. It is on the
# panel as its gates and its cameras, which is what that Area is.

# The footer: media, and a block that opens the corridoio page.
media_player.ovunque:   [page:main:footer]
area corridoio:         [page:main:footer]   # tap -> page:corridoio

# An Area's own page shows what is explicitly placed on it.
light.luce_corridoio:   [page:corridoio:right]

# The media player follows you: one more placement label puts the same
# transport strip in the corridoio page's footer. Under the old paired
# grammar this was inexpressible -- a second page label made the entity
# vanish from both pages.
media_player.ovunque:   [page:main:footer, page:corridoio:footer]

# corridoio's own footer also reaches the clima page directly. It has to be
# an *Area*, because only an Area block navigates:
area clima:             [page:corridoio:footer]   # tap -> page:clima

# What it must NOT carry is page:corridoio:footer -- a block on the corridoio
# page that opens the corridoio page. The renderer skips it.
```

## What this costs

Every entity needs a placement label before it appears anywhere, including on
its own Area's page. There is no "show me everything in this room" default. A
house of sixty entities is roughly sixty label assignments to reach parity with
a hand-composed dashboard, and every new device needs one before it is visible.

That is half what the paired grammar cost. The saving is paid back in the label
registry: every page×region combination in use is its own entry there, up to
four per page, where the pair needed one entry per page and shared four region
labels across all of them.

That is the price of the panel being editable from a phone rather than from a
text editor.
