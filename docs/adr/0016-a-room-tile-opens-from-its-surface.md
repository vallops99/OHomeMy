---
status: accepted
---

# A Room Tile opens its Page from its surface

A Widget's or a Member's tap ([#54](https://github.com/vallops99/OHomeMy/issues/54),
[#73](https://github.com/vallops99/OHomeMy/issues/73)) follows
one rule: a tap never does two things, and a control is never covered. So
something that acts on a tap keeps its whole surface and gains a separate Open
button, and the surface around its controls opens nothing.

A Room Tile is the exception, wherever it appears: as a Room Tile Widget, or
as a Room Grid's Member
([#75](https://github.com/vallops99/OHomeMy/issues/75)). With a
Page to open, its whole surface opens it, except its switch and dimmer, which
keep their own taps, and a chevron says that it opens a Page. This applies
whether or not a light is chosen.

## Why

A room is a place you go into. On a house panel, the natural way into a room's
Page is to tap the room, and a separate Open button next to a large tile is a
small target beside a large one. This was the Room Tile's behaviour before
the Builder ([ADR-0010](0010-rows-drop-the-long-press-modal.md), amended), and
the port to a Widget dropped it only because the general rule had no room for
it.

## Why not every Member

Group rows keep the general rule. A row is thin and its toggle sits close to
its edges, so a finger that misses the toggle by a few pixels would open a Page
instead of switching the light. A `full` Room Tile is large, with its switch
and dimmer well inside it. A `compact` one is a row, and it takes the
exception anyway, so that a Room Tile behaves the same in both Variants.

## Consequences

- The surface is a transparent button laid under the controls, not around
  them: a button inside a button is not readable by assistive technology, and
  a drag that starts on the dimmer and ends on the surface is not a click on
  either.
- A tile decides on what the admin chose, not on what it shows right now: a
  tile whose light is Unavailable opens from its surface the same as one
  whose light is on.
- The renderer's "one rule" now has this one named exception.
