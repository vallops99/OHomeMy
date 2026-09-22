# The placement protocol

The frontend holds no layout. What appears on the panel, on which page, in
which region, is declared in Home Assistant with labels on Areas and entities.
This document is the normative grammar: it is what you need to know to label a
house, and what the renderer is obliged to honour.

## The pair

Placement is **two labels, both required**:

```
page:<name>
region:<name>
```

A thing carrying both is **placed**. A thing carrying one, or neither, renders
nowhere. There is no default page and no default region — placement is always
explicit, and absence of placement is the ordinary way to keep something off
the panel.

Both labels may be carried by an **Area** or by an **entity**. The two are
independent: placing an Area does not place the entities inside it, and placing
an entity does not require its Area to be placed anywhere.

## `page:`

Open-ended. Any value names a page, and a page exists because something is
labelled for it. The renderer knows no list of pages and cannot validate the
name.

```
page:main        the home screen
page:salone      an Area's own page
page:clima       whatever you decide it is
```

`page:main` is the panel's home screen by convention: it is what the renderer
shows at rest. Every other page is reached by placing something in the footer
that opens it (see `region:footer`).

## `region:`

Closed. Four values, and an unrecognised one places nothing.

The panel is a 2x2: two stacked regions on the left, one tall region on the
right, and a strip along the floor.

```
+---------------------+--------------------------------+
|  glance             |                                |
|                     |  entities-right                |
+---------------------+                                |
|                     |                                |
|  entities-left      |                                |
|                     |                                |
+---------------------+--------------------------------+
|  footer                                              |
+------------------------------------------------------+
```

| region | what it is |
| --- | --- |
| `glance` | the top-left quadrant: temperature, humidity, lights on, consumption, and the house's concerns as chips. Read on approach from 2 m. |
| `entities-left` | the bottom-left quadrant. |
| `entities-right` | the right column. On `page:main` this is mostly Areas; on other pages it is whatever the page is about. |
| `footer` | the strip along the floor: media, and the blocks that open other pages. |

### The region decides the shape

This is the rule that makes the protocol more than addressing. **A region is a
rendering contract, not just a position.** The same Area labelled into two
different regions produces two different components:

| an Area in… | renders as |
| --- | --- |
| `region:entities-right` | a full row — the Area's name, how many of its lights are on, a brightness slider, its temperature |
| `region:footer` | a single tappable block that opens that Area's page |

So the footer is the navigation. There is no separate nav concept: a page
button is an Area (or an entity) placed in `region:footer`, and tapping it
opens `page:<that area>`.

### The glance region collapses

`glance` is the one region whose presence is not purely a matter of labels. It
is gated by a Home Assistant helper entity — a toggle, changeable from a phone
without rebuilding the frontend. With the toggle off, the glance quadrant is
not rendered and `entities-right` takes the width of the panel.

## Ordering

Within a region: **Areas first, then entities.** Each group in its own Home
Assistant registry sort order.

This is a total order and it has a consequence worth stating plainly: an entity
can never be placed between two Areas in the same region. A media player in the
footer always follows every Area block there. If you need a different order,
reorder the registries.

## `main`

The one Derived rule left. An Area rendered as a row in `region:entities-right`
has to know which light its slider drives and which entity reports its
temperature. It takes them from the entities in that Area carrying the `main`
label.

`main` places nothing on its own. It is only consulted when an Area row
collapses its Area.

## `ignored`

A **mute**. An entity or Area carrying `ignored` is not rendered, even when it
carries a valid `page:` and `region:` pair. `ignored` overrides placement.

Its purpose is temporary removal without losing configuration: take something
off the panel for a while and put it back by removing one label, with its
placement still intact underneath.

## Malformed placement renders nothing

The renderer silently skips what it cannot honour:

- a `region:` value it does not recognise
- a thing carrying two different `region:` labels, or two `page:` labels
- a `page:` with no `region:`, or a `region:` with no `page:`

Nothing is drawn and no fault is reported. **A typo is found by noticing that
something is missing from the panel.** This is a deliberate choice and it has a
cost: `region:top-left` is not a region, and a thing labelled with it will
simply never appear.

## Worked example

Casa Carina's home screen, as the protocol expresses it:

```yaml
# The Salone row: name, lights-on count, slider, temperature.
area salone:            [page:main, region:entities-right]
light.luci_salone:      [main]              # drives the row's slider
climate.salone_termo:   [main]              # reports the row's temperature

# One specific light, standing alone next to that row.
light.led_cucina:       [page:main, region:entities-right]

# The gates, in the bottom-left quadrant.
lock.esterno_cancello:     [page:main, region:entities-left]
lock.esterno_cancelletto:  [page:main, region:entities-left]

# Esterno itself is not labelled at all, so it has no row. It is on the
# panel as its gates and its cameras, which is what that Area is.

# The footer: media, and a block that opens the climate page.
media_player.ovunque:   [page:main, region:footer]
area corridoio:         [page:main, region:footer]   # tap -> page:corridoio

# An Area's own page shows what is explicitly placed on it.
light.luce_corridoio:   [page:corridoio, region:entities-right]
```

## What this costs

Every entity needs two labels before it appears anywhere, including on its own
Area's page. There is no "show me everything in this room" default. A house of
sixty entities is roughly a hundred and twenty label assignments to reach
parity with a hand-composed dashboard, and every new device needs two labels
before it is visible.

That is the price of the panel being editable from a phone rather than from a
text editor.
