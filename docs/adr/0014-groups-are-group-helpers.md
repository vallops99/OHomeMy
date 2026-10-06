---
status: superseded by ADR-0015
---

# Groups are Home Assistant Group helpers; Areas get the Room Grid

The new design puts entities in titled cards -- "Accessi", the two gates --
so the protocol needed a way to say which entities belong together. A
**Group** is a Home Assistant **Group helper**: the helper is what gets
Placed, its name is the card's title, and its members (its `entity_id`
attribute) are what the card shows, each in its own shape. The members need
no labels of their own. Areas cannot be a helper's members, so the Areas
Placed in a Region form a **Room Grid** instead, titled *Stanze* by the
renderer.

## Considered options

- **A `group:<Title>` Label on each member.** One mechanism for entities and
  Areas alike and no Domain limit, but it is yet another label vocabulary to
  maintain in the registry, where the helper is something Home Assistant
  already has a UI for.
- **A fourth coordinate in the Placement Label** (`page:main:left:accessi`).
  Rejected: the Region would no longer be what follows the last underscore
  of the slugified id, and Page names already contain underscores
  ([ADR-0008](0008-fused-placement-labels.md)).
- **Groups Derived by Domain**, locks becoming "Accessi" in code. Nothing to
  label, but the titles and the groupings would be fixed in the renderer.

## Consequences

- **One Domain per Group.** Home Assistant's UI helper allows no more, so a
  gate `lock` and a garage `cover` cannot share a card.
- **The helper is a real entity, and its controls are never shown.** A lock
  Group unlocked from the panel would open every gate at once. The renderer
  treats a Placed entity with an `entity_id` attribute as a Group and shows
  only its members; an Unavailable helper still shows them.
- **Groups render in `left` and `right` only**; elsewhere they are a fault
  tile. A member also Placed on its own in the same Region of the same Page
  appears once, inside the card.
- **The Room Grid's title never varies**, because every Room Grid is a grid
  of rooms. Its one action, *Spegni tutto*, turns off every light in its
  Areas.
