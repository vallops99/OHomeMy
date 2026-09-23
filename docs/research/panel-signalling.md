# Signalling the panel from Home Assistant

Research for [#22](https://github.com/vallops99/homeassistant-frontend/issues/22),
under the map [#19](https://github.com/vallops99/homeassistant-frontend/issues/19).
It answers whether the Popup protocol's two moves (an automation fires a custom
event the panel listens for, and the same automation wakes the screen) can be
done, and what happens when the event is missed.

Versions checked: Home Assistant core **2026.9.2** (the `ha-local` container,
source read in place under `/usr/src/homeassistant/homeassistant/`),
`@hakit/core` **6.0.2**, `home-assistant-js-websocket` **9.7.0** (both from
`ha-dashboard/node_modules`).

## Summary

1. **A custom event works through @hakit, but only for an admin user.** Home
   Assistant refuses `subscribe_events` for any event type outside a fixed
   allowlist unless the user is an admin, and a custom `casa_carina_popup` is
   not on that list. Today's token belongs to an admin user (`ChristianHouse`),
   so it works on `ha-local`. Tested end to end.
2. **Fully Kiosk can wake the screen and bring the browser forward.** The HA
   integration exposes a `Screen` switch (`screenOn`/`screenOff`) and a
   `Bring to foreground` button. Each is one HTTP GET to Fully's Remote Admin,
   so it should take effect in well under a second on a LAN. That is inferred
   from the code path, not measured, because there is no Fully device here.
3. **A missed event is lost, and Fully's screen-off makes a miss likely.**
   Home Assistant's event bus has no replay. More important for the Popup: Fully
   documents that *"Android Webview will pause scripting when the screen is
   off"*, and @hakit by default *suspends the websocket* after 5 minutes of
   hidden page. The event is fired at the moment the screen is off, which is
   exactly when the panel is least able to receive it. The idiomatic way around
   this is **state instead of an event**: the automation sets a helper entity
   (e.g. `input_text.casa_carina_popup` = `citofono` / empty), and the panel
   reads it like any other entity. Entity state needs no admin, and it is
   re-delivered as a full snapshot on every (re)connect, so it cannot be missed.

## 1. Subscribing to a custom event through @hakit

### The call path exists

- `useHass(s => s.connection)` returns the `home-assistant-js-websocket`
  `Connection` (the store's `connection: Connection | null`,
  `@hakit/core/dist/types/HassConnect/HassContext.d.ts`). The repo already
  reaches it this way in `ha-dashboard/src/ha/actions.ts`.
- `Connection.subscribeEvents(callback, eventType)` sends
  `{type: "subscribe_events", event_type}` and resolves to an unsubscribe
  function (`home-assistant-js-websocket/dist/connection.js`,
  `subscribeEvents` → `subscribeMessage`).
- The server command takes only `type` and an optional `event_type`, with no
  filter on event data and no "since" cursor
  (`components/websocket_api/commands.py`, `handle_subscribe_events` schema;
  [WebSocket API docs](https://developers.home-assistant.io/docs/api/websocket/),
  "Subscribe to events").

### Permissions: admin only for custom events

`components/websocket_api/commands.py`, `handle_subscribe_events`:

```python
if event_type not in SUBSCRIBE_ALLOWLIST and not connection.user.is_admin:
    _LOGGER.error("Refusing to allow %s to subscribe to event %s", ...)
    raise Unauthorized(user_id=connection.user.id)
```

`SUBSCRIBE_ALLOWLIST` (`auth/permissions/events.py`) is a fixed set of core
events: `state_changed`, the area/device/entity/floor/label/category/issue
registry updates, `component_loaded`, `core_config_updated`,
`lovelace_updated`, `panels_updated`, `service_registered`/`removed`,
`themes_updated`, `shopping_list_updated`, recorder statistics, and
`labs_updated`. There is no configuration to extend it. **A non-admin user
cannot subscribe to `casa_carina_popup`.** The public WebSocket API docs say
nothing about this, so the source is the only authority.

The adjacent options are also admin-gated. `subscribe_trigger` (which would let
the panel listen for an `event` trigger) has `@decorators.require_admin`, and
so does `fire_event`.

### Empirical check on `ha-local`

I ran this against `ha-local` with the repo's dev token
(`ha-dashboard/.env.development`):

| Step | Result |
|---|---|
| `auth/current_user` | `ChristianHouse`, `is_admin: true` |
| `subscribe_events` `casa_carina_popup` | `success: true` |
| `fire_event` `casa_carina_popup` `{page: "citofono"}` | the subscription received `{"event_type": "casa_carina_popup", "data": {"page": "citofono"}, ...}` |

The non-admin refusal was not exercised live (no non-admin user or token
exists), but the code path above leaves no ambiguity.

**Consequence:** with a custom event, the panel's long-lived token must belong
to an admin. A wall panel holding an admin token is a real cost: anyone who
takes the token from the tablet gets full admin over the websocket.

## 2. Waking the screen with the Fully Kiosk integration

From `components/fully_kiosk/switch.py`, `button.py` and `strings.json`:

| Entity (name in HA) | Does | Fully command |
|---|---|---|
| switch **Screen** (`screen_on`) | on/off | `screenOn` / `screenOff` |
| switch **Screensaver** | start/stop screensaver | `startScreensaver` / `stopScreensaver` |
| button **Bring to foreground** (`to_foreground`) | brings Fully to the front | `toForeground` |
| button **Load start URL** | reloads the start URL | `loadStartUrl` |

It also offers the actions `fully_kiosk.load_url`, `fully_kiosk.set_config` and
`fully_kiosk.start_application` (`services.yaml`), and numbers for the screen-off
timer, screensaver timer and brightness
([integration docs](https://www.home-assistant.io/integrations/fully_kiosk/)).

**Latency.** `async_turn_on` awaits `fully.screenOn()`, which is a single
`aiohttp` GET to Fully's Remote Admin (`python-fullykiosk`, `sendCommand`,
default port 2323), and then refreshes the coordinator. The screen is commanded
as soon as the GET lands, which on a LAN should be sub-second. The entity's
*state* is otherwise polled every 30 s (`const.py`, `UPDATE_INTERVAL`), or
pushed through MQTT if Fully has MQTT enabled (`entity.py`, `mqtt_subscribe`).
The automation should not wait on the switch's state. It should call
`switch.turn_on` and move on. Neither doc gives a number, and there is no Fully
device here to measure one, so treat "sub-second" as unverified.

**Waking also needs Fully's own settings.** Fully's docs say the screen-off
timer and `screenOn` need device-admin permission, and *"Android Webview will
pause scripting when the screen is off"*. They recommend the **screensaver**
over screen-off when web content should keep running
([Fully Kiosk docs](https://www.fully-kiosk.com/en/)). This shapes the answer to
question 3.

## 3. A missed event

### What the libraries already do

- **Subscriptions survive a reconnect.** On close, `Connection._handleClose`
  keeps subscription commands, and `_setSocket` re-sends each one on the new
  socket (`info.subscribe()`). A `subscribeEvents` made once keeps working after
  a drop. The reconnect backoff is `min(tries, 5) * 1000` ms.
- **Events fired during the gap are gone.** Home Assistant delivers events only
  to listeners attached at fire time (`hass.bus.async_listen`), and
  `subscribe_events` has no replay or cursor. Nothing on either side buffers
  them.
- **@hakit suspends the connection when the page is hidden.** `HassConnect`
  wires `handleSuspendResume` with `suspendWhenHidden: true` and
  `hiddenDelayMs: 300000` by default (`@hakit/core` provider bundle,
  `HassConnect/handleSuspendResume.js`). After 5 minutes hidden it calls
  `connection.suspend()`, and it reconnects only on `visibilitychange`,
  `pageshow`, `resume`, focus or a 2 s visibility poll. You can override this
  through `options.handleResumeOptions` on `HassConnect`
  (`HassProviderProps.handleResumeOptions`).

### Why this matters here

The Popup's own flow fires the event *while the screen is off*. The automation
fires `casa_carina_popup` and turns the screen on in the same run. If the
screen has been off for a while, one of these is likely true:

- Android WebView has paused JS (Fully's own warning), and the page is hidden.
- @hakit has suspended the socket (hidden for more than 5 minutes).
- Android has dropped the network (no "Prevent from sleep while screen off").

In the second and third cases the event is simply never received. The screen
comes on, the page becomes visible, @hakit reconnects, and the Popup is not
shown. This is not a rare reconnect race. It is the common path for a doorbell
at a panel that has been idle. In the first case delivery depends on the socket
surviving the pause, which is not documented anywhere and is not guaranteed.

### Options

| Option | Missed-signal risk | Admin token? | Cost |
|---|---|---|---|
| **A. Custom event, accept the loss** | High when the screen was off (see above) | Yes | none |
| **B. Custom event + keep the socket alive** (`handleResumeOptions: { suspendWhenHidden: false }`, Fully "Prevent from sleep while screen off", or the screensaver instead of screen-off) | Lower, still lost on any real drop | Yes | Fully configuration; still best effort |
| **C. State, not an event.** The automation sets a helper (`input_text`/`input_select`, e.g. `input_text.casa_carina_popup` to `citofono`) to open the Popup and clears it to close. The panel derives "open Popup" from that entity | **None**: `subscribe_entities` sends a full snapshot on every (re)subscribe, so the panel shows whatever is current when it reconnects | **No**: entity state comes over the default subscription, and the default `system-users` policy is `{entities: True}` (`auth/permissions/system_policies.py`) | One helper. The close button must also clear it (a `input_text.set_value` call, which a non-admin user may make) |

Option C is the idiomatic Home Assistant answer. State is Home Assistant's
durable signal and events are its fire-and-forget one. It fits this repo well,
because @hakit already streams every entity into `useHass(s => s.entities)`.
It also removes the admin-token requirement. It has two side effects that
whoever settles the protocol should weigh:

- **The Popup outlives the moment.** A Popup opened while the panel was off or
  away is shown when it returns, until something clears the helper. For the Ring
  that is arguably right (the map says the close button is the only way out and
  there is no auto-close), but the automation may want to clear it after a
  timeout.
- **Close has two writers.** HA's second event becomes "clear the helper", and
  the panel's close button writes the same helper. That is one source of truth
  and not a conflict.

If the map's settled "fire a custom event" wording stays, the minimum is B. Set
`suspendWhenHidden: false` (pass `handleResumeOptions` as a stable,
module-level object, because the provider's effect lists it as a dependency).
Also have the automation wake the screen *before* firing the event, so the page
is visible and connected when the event arrives. It stays best effort, and the
token must be an admin's.

## Sources

- Home Assistant core 2026.9.2, read in the `ha-local` container:
  `components/websocket_api/commands.py` (`handle_subscribe_events`,
  `handle_subscribe_trigger`, `handle_fire_event`),
  `auth/permissions/events.py` (`SUBSCRIBE_ALLOWLIST`),
  `auth/permissions/system_policies.py`,
  `components/websocket_api/http.py` (heartbeat 55 s),
  `components/fully_kiosk/{switch,button,const,coordinator,entity}.py`,
  `services.yaml`, `strings.json`, and the `fullykiosk` Python package.
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/):
  `subscribe_events` shape. It is silent on permissions.
- [Fully Kiosk Browser integration](https://www.home-assistant.io/integrations/fully_kiosk/)
- [Fully Kiosk Browser docs](https://www.fully-kiosk.com/en/): REST `screenOn`/`toForeground`,
  "Prevent from Sleep while Screen Off", WebView pausing scripts with the screen off.
- `home-assistant-js-websocket` 9.7.0, `dist/connection.js` (resubscribe on
  reconnect, backoff, suspend).
- `@hakit/core` 6.0.2, `dist/es/HassConnect/handleSuspendResume.js`, the
  provider in `dist/index-BDZyTvOW.js`, `dist/types/HassConnect/Provider.d.ts`.
- Empirical: websocket session against `ha-local` with the dev token, 2026-09-23.
