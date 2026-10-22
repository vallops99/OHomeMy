---
status: superseded by ADR-0015
---

# On a phone, the panel's Regions are tabs

> **Amended (2026-10-05).** Restyled with Casa Panel
> ([ADR-0013](0013-casa-panel-replaces-the-computed-palette.md), #45), the
> decisions unchanged: the tab bar is drawn as the wall's Dock, the Clock tops
> the Casa tab, and `glance` puts its chips first and wraps them. Decision 7's
> "touch sizes do not change" no longer holds in one direction: the phone's
> touch floor is Casa Panel's `target-min`, 52 px, over the wall's older 44,
> because the restyle was done when every target on a phone reached 52.

Below a width breakpoint the panel stops being the wall's 2x2. `page:main`'s
four Regions become three tabs along the bottom: **Casa** (`glance` and
`left`), **Stanze** (`right`) and **Altro** (`footer`). A Page opened from a
tab is pushed inside that tab, under a header with a back arrow, and the phone's
back gesture goes up one level. The type scale is retuned for arm's length.
Everything else is the same: the same URL, the same Labels, the same components.
The wall panel is unchanged.

Decided on [#15](https://github.com/vallops99/OHomeMy/issues/15)
from a prototype, kept on the branch
[`prototype/phone-layout`](https://github.com/vallops99/OHomeMy/tree/prototype/phone-layout).

## Context

[#10](https://github.com/vallops99/OHomeMy/issues/10) removed the
only phone mechanism the panel had (ADR-0003's per-slot `phone` span), and the
placement protocol has four fixed Regions, a 2x2 by definition. A phone is one
narrow column. The wall `Panel` on a 390 px phone pushes `right`, the rooms,
entirely off-screen.

## Considered

Five layouts were built on the real Dashboard and tried at 390x844:

- **The wall Panel unchanged.** Broken, as above.
- **One column**, Regions in protocol order. Works, but the rooms are a long
  scroll below the gates.
- **Ordered by thumb reach**, gates and footer pinned at the bottom. The pinned
  block took ~370 px and left one room visible.
- **Tabs.** Picked.
- **Glance and gates only**, honest about being wall-first. Rejected: the phone
  is useful *away* from the entrance, and rooms are what you reach for there.

A phone as its own labelled Page (`page:phone`) was rejected before building:
it doubles the labelling #10 already priced at ~120 assignments, and it is not
a layout, so any of the above would still be needed to render it.

## The decisions

### 1. The tabs are `page:main`'s Regions

Casa = `glance` + `left`, Stanze = `right`, Altro = `footer`. They always belong
to `page:main`, whatever is open. The first prototype showed the *current*
Page's Regions under the tabs instead. Opening an Area then turned every tab
into that Area's, and "Casa" named a Region, not home, so tapping it did
nothing. A tab with nothing Placed in it on `page:main` is not shown: a tab that
opens onto nothing is a dead control (ADR-0006, decision 6).

### 2. One stack per tab

A Page opens inside the tab it was opened from, over that tab's root. Switching
tabs keeps each tab where it was, and a dot marks a tab with a Page open in it.
Tapping the tab you are on takes it back to its root. This is how a phone's own
apps behave, and it means checking a camera from Casa does not lose the room you
had open in Stanze. The alternative, one stack over every tab that any tab
closes, was built too and is simpler to explain. It lost on that last point.

An opened Page shows all its Regions in one column, in protocol order. It has
no "Casa" block: the header's back arrow and the tab bar are the way home.

### 3. The back gesture pops one level, on the phone only

This amends [ADR-0006](0006-navigation-is-state-not-a-router.md), decision 1
("no `history` API") and decision 5 ("no back stack"), for the phone. Both were
reasoned from a kiosk with no back button. A phone has one: without an entry for
it to consume, a back gesture on an Area's Page leaves the app. While a Page is
open, one history entry sits on top of the app's own, and a back pops one level.
The Page is still not a URL, and there are still no deep links. The wall keeps
ADR-0006 as written.

### 4. No idle return on the phone

ADR-0006's 240 s return exists so the next person at the entrance finds the
Verdict, not someone else's Page. A phone has no next person.

### 5. "Phone" is a breakpoint, decided once at load

`(max-width: 699px), (max-height: 499px)`: narrow in portrait or short in
landscape, so turning a phone sideways does not hand it the 2x2. It is decided
at load because the tokens are module constants (ADR-0001) and the scale hangs
off it. Neither real device crosses it in use; only a desktop window dragged
across it needs a reload.

### 6. Popups open on the phone too

The Popup helper is house state (ADR-0009), and every screen showing the house
shows it. A Page opened from inside a Popup lands in the current tab.

### 7. A type scale for arm's length

`buildTokens` takes a `Scale`, `wall` or `arm`. Arm shrinks the display sizes by
about a third (hero 112 → 72, glanceXL 56 → 40, glanceL 34 → 26, glanceM
22 → 19) and barely moves body text (17 → 16, caption 14 → 13). The wall's
body size was already the phone platforms' own. Touch sizes do not change: a
thumb is no smaller than a finger at a wall. Picked on the prototype by eye, not
measured on hardware.

## Consequences

- Components that fixed their widths for 1280 px learned a phone shape, each
  behind the same `isPhone`. A Row and a dimmable `ToggleTile` fold in two, the
  slider going full width under the name (their fixed columns sum to ~520 px
  on their own). `GateSlab`'s icon inset became a token, `layout.gateInset`,
  which the phone narrows: at the wall's 34 px, "Cancelletto" was cut off.
  `Feeds` puts its strip under the big Feed, two a line, and the big Feed is
  16:9 rather than filling a height a scrolling column does not have. A
  Popup's slots stack instead of sitting side by side, and its title wraps its
  status underneath.
- `NavigationContext` has two owners: `Dashboard` on the wall, `PhoneShell` on
  a phone. Consumers cannot tell which; they only call `openPage`.
- The phone's navigation rules are plain data in `src/ui/phoneNav.ts`, tested
  without a browser.
