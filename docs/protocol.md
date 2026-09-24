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
Every other page is an Area's page, reached from anywhere that Area is placed:
its block in a footer, or its row in `left` or `right` (see "The region").

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

An entity's shape comes from its domain as well as its region. A camera is the
one that changes most:

| a camera in… | renders as |
| --- | --- |
| `left`, `right` | a **Feed**: its live picture, over WebRTC. The region's cameras render together, where the first one would be: one big Feed, and beside it a strip of the others as 16:9 thumbnails, each captioned with its name and status. The big one is the camera last tapped, or else the first with motion, or else the first. Tapping a thumbnail makes it big. |
| `glance` | the **motion glance**: one tile for all the region's cameras, saying how many there are and whether any of them sees motion. Tapping it opens the page where every one of those cameras is also placed in `left` or `right`, other than the current page. If several pages qualify, the one whose placement label comes first in Home Assistant's label registry wins. If none does, the tile is not a control and does not look like one. |

A camera's motion is a `motion` binary_sensor on the camera's own device, not
merely in its Area; a camera with no such sensor never shows motion. Nothing
labels the glance's page: placing the cameras' Feeds somewhere is what makes
that page the one it opens.

So the Areas are the navigation. There is no separate nav concept: a page
button is an **Area** placed in a footer, and tapping it opens
`page:<that area's id>` — the id from Home Assistant's area registry, not the
display name, so `area salone` (named "Soggiorno") opens `page:salone`. A row
leads to the same page: swipe it right, or tap the chevron at its end. Tapping
the row itself still toggles its light. Neither route checks that the page has
anything on it; an empty page says so (see "An empty page renders a message").

Only an Area navigates, with one exception: the camera glance, which opens the
page its cameras' Feeds are on (above). An entity in the footer renders as its
own component and opens nothing: an entity is not an Area, so there is no
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
nowhere to go back to. A page shown as a Popup doesn't get one either: its close
button is the way out (see "Popups", below).

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

## Popups

A **Popup** is a page shown over the panel instead of opened on it: full
screen, on top of whatever page is current, and opened and closed by Home
Assistant rather than by a tap. Its contents are placed like any other page's.
"Popup" names how a page is shown, not a kind of page. The doorbell is the case
it exists for: someone rings, and the panel shows the gate camera with the
gates in front of it.

Home Assistant signals the panel through a **helper's state**, not an event.
[ADR-0009](adr/0009-popups-are-helper-state-not-events.md) records why, from
[the signalling research](research/panel-signalling.md): an event needs an
admin token and is lost while the tablet's screen is off, and a helper's state
is sent again on every reconnect.

### The two helpers

| helper | what it does |
| --- | --- |
| `input_text.panel_popup` | holds the **bare name** of the page to show (`citofono`, not `page:citofono`); empty when no Popup is open |
| `input_button.panel_popup_activity` | pressed by the panel when someone touches an open Popup |

Both are found by **fixed entity id**, like `input_boolean.panel_glance`, and
not by a label: they are facts about the panel, not about the house. Create
them in Home Assistant's helpers UI with exactly these ids.

### Opening, replacing, closing

- **Open**: set `input_text.panel_popup` to a page name. The value is trimmed.
- **Replace**: set it to another name. There is at most one Popup and no stack.
- **Close**: set it to `""`. The Popup's close button does exactly this, and
  it is the only thing the panel ever writes there.
- An empty value, `unknown`, `unavailable`, or no helper at all means **no
  Popup**. When the helper comes back its state is sent again, and the Popup
  reappears if it is still set.

The helper is the only source of truth. The panel never closes a Popup on its
own and never hides one ahead of the helper: pressing close asks Home
Assistant to clear it, and the Popup goes away when the cleared value comes
back. Because every panel reads the same helper, **a Popup is house-wide**:
every panel shows it, and closing it on one closes it on all. It also survives
a restart of the panel or of Home Assistant until something clears it.

Nothing is special-cased. A helper naming a page with nothing placed on it
still opens: the Popup shows the empty-page message and the close button, so
a typo in an automation is visible rather than silent. A helper naming `main`,
or the page already underneath, opens that page as a Popup like any other.

### How a page looks as a Popup

A Popup does not use the 2x2. The regions are read like this:

| region | in a Popup |
| --- | --- |
| `right` | its **first camera** fills the screen, edge to edge, behind everything. With no camera there the background is plain. Anything else in `right`, other cameras included, floats in the bottom row. |
| `left`, `footer` | float as **one centred row along the bottom**: `left` first, then the rest of `right`, then `footer`. |
| `glance` | not shown. A Popup has no glance quadrant, as if the helper toggle were off. |

Everything in the bottom row keeps its own region's rendering contract: a lock
is a gate, an Area in `left` or `right` is a row, and an Area in `footer` is
the block that opens its page.

Across the top: the title on the left and a round close button on the right.
The title is the Area's name when the page is an Area's page (`salone` reads
"Soggiorno"), and otherwise the page name itself, capitalised: `citofono` reads
"Citofono". There is **no "Casa" block**: the close button is the way out, and
tapping the background does nothing.

At 1280x800 the bottom row holds three gates at full width. A fourth fits by
shrinking every slot, so gate names ellipsise. Past that the row scrolls
sideways.

The camera is its live Feed, cropped to fill the screen, with the Feed's status
beside the title (`In diretta`, `Connessione…`, and so on). Its session opens
when the Popup does and closes with it, so a Ring doorbell is not kept
streaming after the Popup goes.

### Underneath

The page underneath stays mounted and running. The idle return is not
affected by a Popup. If it fires while one is open, the panel goes back to
`page:main` underneath, and the Popup stays on top.

**Navigating from inside a Popup** closes it. Tapping an Area's footer block
in a Popup opens that page underneath *and* clears `input_text.panel_popup`,
which closes the Popup on every panel. Anything else that opens a page from
inside a Popup does the same.

### Activity, and closing on a timer

The panel never closes a Popup by itself, so an automatic close belongs to the
automation, as a delay. Home Assistant can't see touches, so the panel reports
them: **any touch inside a Popup except the close button** presses
`input_button.panel_popup_activity`, at most once every 5 seconds. The panel
does nothing else with it. An automation that triggers on it can restart its
wait, so the Popup stays up while someone is using it.

### A doorbell, a gate and an intercom

The Ring integration names a doorbell's entities `camera.<doorbell>_live_view`
and `event.<doorbell>_ding`, which fires event type `ring`
([the Ring research](research/ring-integration.md)). The Ring Intercom has no
camera, and it opens its door with a **button**, `button.<intercom>_open_door`.
The panel has no rendering for `button`, so wrap the button in a template
`lock` and label that lock as a gate:

```yaml
template:
  - lock:
      - name: Citofono
        default_entity_id: lock.citofono_porta
        # The intercom reports no state: the door is never shown open.
        state: locked
        availability: "{{ not is_state('button.<intercom>_open_door', 'unavailable') }}"
        lock: []
        unlock:
          action: button.press
          target: { entity_id: button.<intercom>_open_door }
        open:
          action: button.press
          target: { entity_id: button.<intercom>_open_door }
```

The page it all lives on:

```yaml
camera.<doorbell>_live_view:  [vision, page:citofono:right]   # the background
lock.esterno_cancello:        [gate, page:main:left, page:citofono:left]
lock.esterno_cancelletto:     [gate, page:main:left, page:citofono:left]
lock.citofono_porta:          [gate, page:citofono:left]
```

### Example automation

A ring wakes the tablet, brings Fully Kiosk to the front and opens the Popup.
After two minutes without a touch the automation closes it again:

```yaml
alias: Citofono popup
mode: restart            # a second ring, or a touch in the Popup, restarts the wait
triggers:
  - trigger: event.received
    target:
      entity_id: event.<doorbell>_ding
    options:
      event_type: [ring]
    id: ring
  - trigger: state
    entity_id: input_button.panel_popup_activity
    id: activity
conditions:
  - or:
      - condition: trigger
        id: ring
      - condition: state
        entity_id: input_text.panel_popup
        state: citofono
actions:
  # "Not activity" rather than "ring", so that Run actions, which has no
  # trigger, opens the Popup too.
  - if:
      - not:
          - condition: trigger
            id: activity
    then:
      - action: switch.turn_on
        target: { entity_id: switch.<tablet>_screen }
      - action: button.press
        target: { entity_id: button.<tablet>_bring_to_foreground }
      - action: input_text.set_value
        target: { entity_id: input_text.panel_popup }
        data: { value: citofono }
  - delay: "00:02:00"
  # Optional auto-close. Guarded so it never closes a newer Popup.
  - if:
      - condition: state
        entity_id: input_text.panel_popup
        state: citofono
    then:
      - action: input_text.set_value
        target: { entity_id: input_text.panel_popup }
        data: { value: "" }
```

This was run against Home Assistant 2026.9 with the fake house's doorbell:

- **Trigger on the ring, not on the attribute.** A `state` trigger on the
  `event_type` attribute `to: ring` never fires: a doorbell's `event_type` is
  always `ring`, so the attribute does not change from one ring to the next.
  `event.received` fires on every ring. So does a plain `state` trigger on the
  event entity, whose state is the time of the last event, with
  `not_to: [unavailable, unknown]`.
- **Run actions** opens the Popup and closes it after the delay. It returns
  only once the run has finished.
- A touch while the Popup is open restarts the wait. A touch while it is
  closed opens nothing. A newer Popup (the helper set to another page)
  survives the guard.
- `switch.<tablet>_screen` and `button.<tablet>_bring_to_foreground` are the
  Fully Kiosk integration's `Screen` switch and `Bring to foreground` button,
  named from `strings.json`. With no Fully device here, those two ids are
  unchecked. Read the real ids off the tablet's device page, since an entity
  id follows the name it was created under. Missing entities only log a
  warning, and the rest of the run continues.

### Trying it on the fake house

`fake-house/` has everything above: both helpers, a doorbell
(`camera.campanello_live_view`, `event.campanello_ding`), an intercom
(`button.citofono_open_door` wrapped as `lock.citofono_porta`), and
`page:citofono`. To open the Popup by hand, set `input_text.panel_popup` to
`citofono`. To ring, press `input_button.fake_fire_event_campanello_ding`, or
use **Run actions** on the automation.

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
