---
status: accepted
---

# Rows drop the long-press modal and gain a chevron

A Row opens its Area's Page when it is swiped right
([#27](https://github.com/vallops99/homeassistant-frontend/issues/27)). Two
things change with that swipe: holding a Row no longer opens @hakit's light
modal, and every Row gets a trailing chevron that opens the same Page with one
tap. The gesture mechanism and its sources are in
[`docs/research/row-swipe-gesture.md`](../research/row-swipe-gesture.md).

## The long-press modal goes

This amends [ADR-0002](0002-component-layer.md) for Rows only: inheriting
@hakit's long-press-to-modal was one of the reasons given there for building
on `CardBase`, and Rows no longer take it.

A Row now owns three things on one surface: tap to toggle the light, drag the
slider for brightness, and swipe to open the Page. The modal was a fourth, and
the one nobody at the panel was reaching for. It also had a cost: a slow slider
drag outlived the long-press threshold and opened the modal over the control
being used, which `Slider`'s `onInteracting` plumbing existed to prevent.

Rows always pass `disableModal`. The `use-long-press` binding inside `CardBase`
stays, inert. It never calls `preventDefault` or `stopPropagation`, so it
doesn't interfere with the swipe, and @hakit's licence rules out removing it.
`ToggleTile` keeps its modal; this decision is about Rows.

## The chevron, for WCAG 2.5.1

A swipe is a path-based gesture. WCAG 2.5.1 (Pointer Gestures, level A) asks
that anything done with one can also be done with a single pointer and no path.
The Row's own tap is already taken by the toggle, so the alternative is a
separate target: a chevron at the end of the Row, at least `touch.floor`
(44 px) square, whose tap opens the Page and never toggles the light. It also
tells whoever is looking at the Row that it leads somewhere.

The other candidate was the footer block the same Area might carry. It was
rejected because nothing guarantees it: an Area can be a Row with no footer
Placement, and the one-tap route would then silently not exist.

This is a private home panel, so conformance is a choice rather than an
obligation. It is taken because the cost is one 44 px target in a Row measured
to have room for it (at 1280x800, the name keeps 218 px).

## Consequences

- Every Row, including one for an Area with no `main` light, leads to its
  Area's Page, empty or not.
- A Row's hold does nothing. Details of a light are on the Area's Page, or in
  Home Assistant.
- The Fully Kiosk settings that claim horizontal swipes have to be off on the
  tablet (`ha-dashboard/README.md`).
