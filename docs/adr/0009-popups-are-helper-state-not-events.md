---
status: accepted, in part superseded by ADR-0015
---

# Popups are opened by helper state, not by events

Home Assistant opens a Popup by setting a helper, `input_text.panel_popup`, to
the name of a Page. It closes the Popup by clearing that helper, and the
Popup's close button clears it too. The panel never keeps a Popup open or closed
on its own: the helper is the only source of truth. The obvious design, an HA
automation firing a custom event the panel listens for, was rejected for the
two reasons below, found in
[Signalling the panel from Home Assistant](https://github.com/vallops99/OHomeMy/issues/22).
The rest of the protocol was settled in
[Popup protocol](https://github.com/vallops99/OHomeMy/issues/23).

## Considered Options

- **A custom event** (`casa_carina_popup`). HA refuses `subscribe_events` for
  non-allowlisted event types unless the user is an admin, so the panel's
  token would have to be an admin token. Worse, an event is fire-and-forget,
  and the Popup's main use is exactly when a miss is most likely. A ring arrives
  while the screen is off, the Android WebView has paused scripting, and
  @hakit has suspended the websocket. HA has no replay, so the ring is lost.
- **Helper state** (chosen). Entity state is sent again as a full snapshot on
  every reconnect, so a panel that wakes late still sees the Popup. Reading it
  needs no admin rights.

## Consequences

- **A Popup is house-wide.** Every panel reads the same helper, so every panel
  shows the same Popup, and closing it on one closes it on all. This includes
  navigating out of it (the panel clears the helper).
- **A Popup survives restarts** of the panel or of HA until something clears
  it.
- **At most one Popup at a time.** A new value replaces the current one, and
  there is no stack.
- **Auto-close belongs to the automation**, as a guarded delay. HA can't see
  touches, so the panel reports them through a second helper,
  `input_button.panel_popup_activity`, that the automation uses to restart
  its wait. The panel sends the reports, and HA decides when to close.
- **Waking the screen is the automation's job too** (Fully Kiosk's `Screen`
  switch and `Bring to foreground` button). The frontend doesn't do it.
- Both helpers are found by **fixed entity id**, like `input_boolean.panel_glance`,
  not by a Label. They're facts about the panel, not about the house.
