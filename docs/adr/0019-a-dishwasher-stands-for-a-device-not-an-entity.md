---
status: accepted
---

# A Dishwasher stands for a device, not an entity

The Dishwasher Widget
([#81](https://github.com/vallops99/OHomeMy/issues/81)) is the first Widget
that stands for a device rather than one entity. Home Assistant has no
`dishwasher` Domain: a dishwasher is a device owning a state sensor, a finish
time, a door, warnings and buttons. So the Widget takes one choice per role,
as the Indoor Reading does, and only the State is required. It is built around
Home Connect but never names it.

## Why

Home Connect splits one appliance across many entities, and several of them
are Unavailable on purpose: the finish time and the progress only exist while
a program is delayed, running, paused or finished. Counting those as Faults
would cry wolf every time the dishwasher is idle, so a setting can be marked
as never a Fault. The State is not one of them: an Unavailable State is a
real Fault.

Home Connect has no start button: a program starts through the active-program
select or the `home_connect.start_selected_program` action. So Start takes a
`button` or a `script`, and the house writes the script that calls the action.

A dishwasher's door is a door of an appliance, not of the house. Whatever is
chosen as Door is never an open way in, even a `binary_sensor` with
`device_class: door`. It is left out by the role, not by its device class.

## Consequences

- A setting can be marked as never a Fault, and as never an open way in. Both
  are flags on the setting in the schema, respected by the shown-entities
  logic, so any later device Widget can use them.
- While Ends at or Progress is Unavailable, its line is not shown, instead of
  a Fault.
- The Dashboard cannot tell a Home Connect script from any other: Start is
  whatever script the admin chooses.
- Salt and rinse aid show on the tile only, and never reach the Verdict.
