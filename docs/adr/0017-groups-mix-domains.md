---
status: accepted
supersedes: ADR-0015 in part
---

# Groups mix Domains

A Group's Members may be of any Domains a Group can show, mixed freely
([#76](https://github.com/vallops99/homeassistant-frontend/issues/76)). This
replaces ADR-0015's "a Group card holds an ordered member list of one Domain".
A house often has a single thermostat, and its humidity is a `sensor`, so a
one-Domain Group could never put the thermostat and its humidity in one card.
In the Builder, once the first Member was chosen, the picker had nothing left
to offer.

A camera is still never a Member: several cameras are a Camera Wall.

## Considered options

- **One Domain, explaining the empty picker.** This would fix the confusing
  empty picker, but you still could not build the card you wanted.
- **One device:** every Member belongs to the same Home Assistant device.
  This fits the thermostat exactly, but *Accessi* (two gates, two devices)
  would need one-Domain Groups as a second rule, and "device" would become a
  domain concept only to restrict what a Group can hold.

## Consequences

- A Group has no Default title, even when all its Members share a Domain:
  once Members can be anything, a title made from their Domain says too little
  to be worth keeping. The Builder shows a Group's title as a plain text field,
  and with nothing written the card has no title. Members leaving Home
  Assistant never change a Group's title.
- With every Group Domain on offer, the Members picker is long, so the Builder
  filters it by Domain. The filter is Builder state, not part of the Draft.
- Going back would make every saved mixed Group invalid.
