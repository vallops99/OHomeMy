---
status: accepted
---

# A Room Tile chooses its light and temperature from its own Area

A Room Grid's tiles took their light and temperature from two lists across
the whole grid, each tile the first entry in its Area. Now each of the grid's
Areas, a Member, chooses its own
([#78](https://github.com/vallops99/OHomeMy/issues/78)), and
the lists are gone. Wherever a Room Tile appears, as a Room Tile Widget or a
grid's Member, its light and temperature are its Area's own: one that leaves
the Area reads as unset, as one Home Assistant no longer has does.

## Why

A tile stands for its room: it counts the room's lights, so its switch drives
one of them and its temperature is the room's.

The old lists are dropped rather than carried onto each Area: there is no
real production environment, so the migration is not worth its code.

## Consequences

- A Room Grid saved with the old lists is not shown, as any Widget with a
  setting its kind does not take, until the admin removes them in the
  Builder, one deliberate step. Its tiles then have no light or temperature
  until chosen again.
- A Room Tile Widget whose light or temperature is from another Area loses
  it the same way. Changing its Area clears both.
