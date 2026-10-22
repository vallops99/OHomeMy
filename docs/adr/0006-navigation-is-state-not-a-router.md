---
status: accepted, in part superseded by ADR-0015
---

# Navigation is state, not a router, and the renderer supplies the way home

> **Amended for phones by [ADR-0011](0011-the-panel-on-a-phone.md).** On a
> phone, a Page opens inside a tab with a back arrow, the back gesture pops one
> level through a single history entry, and there is no idle return. The wall
> panel is unchanged.

Pages are a piece of React state, not a URL. There is no router library, no
`history` API, no hash routing. A footer block changes which Page is current;
nothing else about the panel's shape changes. On top of that: every Page but
`page:main` gets a renderer-supplied block back to it, `glance` resolves
per-Page with no special case, the panel returns to `page:main` after 240s
idle, navigation is flat with no back stack, and a Page with nothing Placed on
it renders an explicit message rather than four empty Regions.

## Context

[ADR-0003](0003-screen-definition-format.md) deliberately left this question
open. As [#14](https://github.com/vallops99/OHomeMy/issues/14)
puts it: *"there is no router yet, and inventing one before a second screen
exists would be guessing."* At the time there was exactly one screen. Under
[ADR-0005](0005-placement-protocol.md), a Page exists the moment something
carries a `page:` Label — any value creates one — so a second Page now exists
in principle the instant a house is labelled for it. The guess ADR-0003
deferred is forced, and [#14](https://github.com/vallops99/OHomeMy/issues/14)
is that guess, made and recorded.

#14 is a `wayfinder:grilling` ticket, not a task: it posed five open questions
rather than a spec. This ADR is the record of having settled them, per
[#11](https://github.com/vallops99/OHomeMy/issues/11)'s
instruction that #14 "needs grilling before code." A sixth, consequent
decision — what an empty Page does — followed from the other five during that
grilling and is recorded alongside them.

## The decisions

### 1. Pages are state, not URLs

The panel is a Fully Kiosk pane mounted at the entrance: no address bar,
nobody types, and nothing outside the panel consumes a link into it. A URL
would buy back/forward navigation and deep-linking from a Home Assistant
dashboard or automation. State buys nothing to configure and no history to get
wrong. With no consumer for the thing a router provides, a router is
machinery bought for a buyer that does not exist.

**Given up, deliberately: no deep link into a Page from Home Assistant, and no
browser back/forward.** If a future requirement needs either, this reverses
into a real router — and it reverses cheaply, because navigation today is one
callback and one piece of state to replace, not a tree of route components to
unpick. That cheapness of reversal is itself part of why state was the safe
choice under the uncertainty #14 was grilled to resolve.

### 2. The home block is renderer-supplied

Every Page except `page:main` gets a "Casa" block prepended to its footer by
the renderer, not by a Label. `page:main` never gets one, because it is
already home.

This is a **deliberate, single exception to "the frontend holds no
layout."** ADR-0005's whole claim is that this repo holds none; this decision
puts one block back, and the honest thing is to say so rather than let it
pass as just another Rendering contract.

The alternative was tried first, in argument: make the way home a Placement
like anything else — label an Area `page:corridoio, region:footer` pointing
back at `page:main`, the same way any other footer block points forward. It
keeps ADR-0005's purity intact. It loses because it is opt-in per Page: every
new Page needs its own home Label or it is a dead end, and a Page you cannot
leave is a trap for whoever is standing at the panel — a worse failure than
one block of frontend-owned layout. The asymmetry that justifies the
exception: the home block is not a layout *decision*. There is nothing to
arrange and no alternative arrangement a house might sensibly want — every
Page's way home is the same block, in the same place, unconditionally. It is
the renderer keeping its own navigation reachable, not the house expressing a
preference.

### 3. `glance` is per-Page, with no special case

`glance` resolves from the *current* Page's own Labels exactly like every
other Region. A Page with nothing Placed in `glance` renders no glance
quadrant, and `entities-right` takes the panel's width — the same collapse
`Panel.tsx` already implements for the helper toggle (#13).

The tempting alternative: `glance` is the Verdict, the house's own judgement,
not the home screen's — so make it persist across every Page rather than
resolve per-Page, on the reasoning that a judgement about the house should not
disappear just because you tapped through to `page:corridoio`. It lost
because [#10](https://github.com/vallops99/OHomeMy/issues/10)
already gave `glance` a `page:` Label like every other Region, and carving out
the one Region that ignores its own `page:` would make the protocol's single
uniform rule — Region determines Rendering contract, resolved per Page —
non-uniform for the most important Region in it. Someone labelling a house
would have to learn an exception to the one rule the protocol is built on.
If the Verdict turns out to be missed on an Area Page, the fix is a Label,
not a code change: place the thermostat and the alarm into
`page:corridoio, region:glance` too. That the fix stays in Home Assistant,
and does not come back to this repo, is the point of ADR-0005 and this
decision keeps it true.

### 4. Idle return: 240 seconds

After 240 seconds with no interaction on a Page other than `page:main`, the
panel returns to `page:main` on its own.

The panel sits at the entrance; its resting state is the house's Verdict, and
whoever walks up to it next should not find whatever Area Page the previous
person left it on.
[#2](https://github.com/vallops99/OHomeMy/issues/2)
established that wake is Fully Kiosk's own camera-based motion detection, not
a Home Assistant entity — the panel **cannot** react to someone approaching,
because nothing tells it someone is approaching. It can react to time, and
that is the whole reason a timer is the mechanism at all: it is the one signal
available.

240s and not 60s: 60 seconds is well inside the time it takes to read a Page
or adjust a light, and an interface that navigates away from under your hands
mid-use is a worse failure than one that is occasionally left on the wrong
Page. 240s and not never: leaving the panel wherever it was last touched makes
the resting state whatever the last person tapped, which defeats the purpose
of `glance` being readable on approach from 2 m (CONTEXT.md) — a Verdict you
have to tap through to reach on arrival is not a Verdict read on approach.

### 5. Navigation is flat

Any Page's footer block opens any Page. There is no hierarchy and no back
stack — navigating is always "go to Page X," full stop. Combined with
decision 2, every Page is one or two taps from home: one to leave, or two to
cross from one Area Page to another via `page:main`.

The rejected alternative: restrict navigation so only `page:main`'s footer
carries page-opening blocks, capping the panel at one level of depth. It was
tempting because it bounds how lost someone can get. It lost because it would
make the footer's Rendering contract depend on *which Page it is rendered on*
— a footer on `page:main` could open Pages, a footer on `page:corridoio`
could not — and a Region whose contract shifts depending on where it sits is
exactly the kind of exception decision 3 already refused. Flat navigation
needs no history because there is nothing to go back through: every "back" is
just another "go to," and `page:main` is reachable the same way as anywhere
else.

### 6. An empty Page renders a message (consequent)

A footer block always renders — the Placement backing it is well-formed, so
it is honoured — and it always navigates. If the Page it opens has nothing
Placed on it, that Page renders an explicit Italian message rather than four
empty Regions.

This is a different case from "malformed placement renders nothing"
(docs/protocol.md): that rule is narrow and handles Labels the renderer
cannot honour — an unrecognised `region:`, a doubled Label, a half-pair. This
is a well-formed Page, correctly resolved, that simply has nothing in it.

The principle is `src/ui/NavBar.tsx`'s, credited here because that file is
deleted by this ticket: *"a dead control that
looks live is worse than one that admits it is not there."* NavBar applied it
to a destination with no view built yet; the same reasoning applies to a
Page with no Label pointed at it — a blank panel looks broken, a message
admits what happened. The home block renders on that message Page too, for
the same reason it renders everywhere but `page:main`: a Page you cannot leave
is exactly the trap decision 2 exists to prevent, empty or not.

## What is given up, deliberately

**Deep-linkability and browser history** (decision 1). Nothing today needs
either — no address bar, no external caller — but if a future requirement
does, a real router replaces one callback and one piece of state, cheaply.

**Half of ADR-0005's "no layout" claim** (decision 2). The home block is
frontend-owned, unconditional, and not expressed by any Label — the one piece
of the panel's arrangement that is not a fact about the house. It survives
because the failure mode it prevents (an unreachable Page) is worse than the
purity it costs, and because there is no arrangement of it for a house to
prefer.

## What is kept

The protocol's one uniform rule — Region determines Rendering contract,
resolved from the current Page's own Labels — holds with no exception,
including for `glance` (decision 3). The renderer still holds no *house*
layout: every Region's contents on every Page are still Placed by Labels, and
the only frontend-supplied element is the fixed, contentless home block.
Malformed-placement handling (docs/protocol.md) is unchanged and unrelated to
the empty-Page message (decision 6): one is about Labels the renderer cannot
parse, the other about a Page the renderer parsed correctly and found empty.

## Consequences

- `src/ui/NavBar.tsx` is deleted (#14). Its bottom-bar affordance reasoning
  ("a gesture has no affordance on a wall, drill-in overloads tiles whose
  press already toggles a light") is superseded by the footer block, which
  is now the only navigation surface on the panel; its dead-control principle
  is carried forward explicitly into decision 6.
- The panel needs one piece of state (current Page, initialised to
  `page:main`) and one idle timer, both local to the renderer. No route
  table, no history stack.
- **`Tile` had to learn to be pressable without an entity.** Its no-entity
  branch renders a plain `div` instead of @hakit's `CardBase` (whose modal
  subtree throws on a null entity), and that branch silently dropped
  `onClick` — its comment reasoned "there is nothing to press anyway", which
  was true while every pressable tile stood for an entity. A footer block
  stands for an *Area*, so both blocks rendered as convincing buttons that
  did nothing when tapped: the exact dead-control failure their own comments
  cite the deleted `NavBar.tsx` for. The branch now wires `onClick` and adds
  the button semantics `CardBase` gives the other path (role, keyboard
  operability). Found by clicking the block on the running panel, not by
  reading — the code looked correct at every layer.
- **A footer block is sized to its label, not to a share of the floor.**
  `flex: 1` made the single Corridoio block 591 px wide, half the panel, and
  a 32 px icon over 22 px text made it 91 px tall — overriding
  `layout.footerH` (a `minHeight`, so content wins) and taking back the exact
  32 px the token's own comment records as having been measured *out* of the
  footer to give the left column. The visible cost was `ChipRow`'s fault chip
  sliced against the gates. ADR-0004's amendment restated once more: fit is
  measured, not added up, and a `minHeight` token is not a guarantee.
- **The fixture gains a second Page, and the home screen loses a Row.**
  `fake-house/manifest.yaml` moves `area corridoio` from
  `region:entities-right` to `region:footer`, exactly as docs/protocol.md's
  worked example has always shown it, so that the panel actually has a block
  to tap. Casa Carina's home screen therefore renders four Rows where #13
  certified five — the Row did not disappear, it became the footer block that
  opens `page:corridoio`, which is the region-decides-shape rule demonstrating
  itself on the fixture.
- **A `page:` Label must exist in Home Assistant before it can be assigned.**
  `page:` is open-ended in the protocol — a Page exists because something is
  labelled for it — but Home Assistant's label registry is not open-ended, and
  `apply-registry.py` only creates the Labels the manifest declares. Labelling
  an entity `page:corridoio` without declaring that Label first assigns a
  half-pair, which the resolver silently skips (ADR-0005) and which presents
  as the footer block opening an empty Page. Found exactly that way while
  verifying this ticket.
- `docs/protocol.md` is amended to document the renderer-supplied home block,
  per-Page `glance` collapse, idle return, and the empty-Page message, since
  someone labelling a house needs to know what happens on the far side of a
  footer block without reading this ADR.
