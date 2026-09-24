# What the Ring integration exposes in Home Assistant

Research for [#21](https://github.com/vallops99/homeassistant-frontend/issues/21),
under the map [#19](https://github.com/vallops99/homeassistant-frontend/issues/19)
(Hold, camera Page and Popups). Researched 2026-09-23.

**Sources pinned:**

- [HA-core] Home Assistant core, `homeassistant/components/ring/` at commit
  [`a7b90b5`](https://github.com/home-assistant/core/tree/a7b90b5cd40eb4c3f4eb5f49e9fd964813fefc02/homeassistant/components/ring)
  (2026-09-19, the latest commit touching the integration).
- [HA-docs] [home-assistant.io/integrations/ring](https://www.home-assistant.io/integrations/ring)
  (`source/_integrations/ring.markdown`, `current` branch).
- [HA-event] [home-assistant.io/integrations/event](https://www.home-assistant.io/integrations/event/).
- [lib] `ring-doorbell` **0.9.14**, the version HA pins in `manifest.json` and
  the latest on PyPI:
  [python-ring-doorbell/python-ring-doorbell@0.9.14](https://github.com/python-ring-doorbell/python-ring-doorbell/tree/0.9.14/ring_doorbell).
- [Ring] Ring's own support pages for the Intercom (linked inline).

## Answer in brief

| Question | Answer |
|---|---|
| What signals a ring? | An **`event` entity**, `event.<device>_ding`, device class `doorbell`, event type **`ring`**. Exists for doorbells *and* for the Intercom. The old `binary_sensor.<device>_ding` is deprecated and not created on new installs. |
| How does an automation trigger on it? | `trigger: event.received` on that entity with `event_type: [ring]` (or a `state` trigger on the entity, whose state is the timestamp of the last event). |
| Is the Ring camera a live stream? | Yes, for **doorbells and stick-up cams**: `camera.<device>_live_view` streams over **WebRTC** (proxied through Ring's cloud signalling). No subscription needed for live view. |
| Snapshots / thumbnails? | Only with a **Ring Protect subscription**: the still image comes from the last *recording*, so without a plan `camera_image` errors (`no_subscription`). |
| Does the Intercom have a camera entity? | **No.** Not even Ring Intercom *Video*: the integration never creates a `camera` for an Intercom. |
| Does the Intercom expose an unlock? | Yes, as a **`button`** (`button.<intercom>_open_door`), **not a `lock`**. It has no locked/unlocked state. |
| Cloud or local? | Cloud only (`iot_class: cloud_polling`). |
| Polling or push? | Both: device state polled every 60 s; rings/motion/unlocks arrive by **push** (Firebase Cloud Messaging, outbound TCP 5228). |
| Ring-to-event latency | Not documented anywhere primary. It is a cloud push, not local, so expect around a second or more; measure it on the real device. |

## Entities per device

The integration loads these platforms: `binary_sensor`, `button`, `camera`,
`event`, `light`, `number`, `sensor`, `siren`, `switch` (`const.py` `PLATFORMS`
[HA-core]). No `lock` platform exists (there is no `lock.py`).

### Doorbell / stick-up cam (a "video device")

`ring-doorbell` groups doorbots, authorized (shared) doorbots and stick-up cams
as `video_devices` (`ring.py`, `RingDevices.video_devices` [lib]). HA creates
for each:

| Entity | Notes | Source |
|---|---|---|
| `camera.<name>_live_view` | Enabled. `CameraEntityFeature.STREAM`, WebRTC. | `camera.py` `CAMERA_DESCRIPTIONS` [HA-core] |
| `camera.<name>_last_recording` | **Disabled by default**, and only created when the account has a subscription (`has_subscription`). Exposes `video_url` / `last_video_id` attributes. | same |
| `event.<name>_ding` | Doorbells only (capability `DING`). Device class `doorbell`, event type `ring`. | `event.py` [HA-core] |
| `event.<name>_motion` | Cameras with motion detection. Event type `motion`. | same |
| `switch` motion detection, in-home chime; `siren`; `light` (floodlights); `number` volume; `sensor` battery / Wi-Fi / last activity | Housekeeping, not needed for the Popup. | [HA-docs] |

### Intercom

`ring-doorbell` recognises an Intercom by device kind
`intercom_handset_audio` or `intercom_handset_video` (`const.py`
`INTERCOM_KINDS` [lib]) and puts it in `RingDevices.other`, **not** in
`video_devices` (`ring.py` [lib]). Its only capabilities are `OPEN`, `HISTORY`
and `DING` (`other.py` `RingOther.has_capability` [lib]). So HA creates:

| Entity | Notes | Source |
|---|---|---|
| `event.<intercom>_ding` | Someone buzzed the Intercom. Device class `doorbell`, event type `ring`. The library maps Ring's push `com.ring.pn.live-event.intercom` onto the same `ding` kind as a doorbell press. | `event.py` [HA-core]; `const.py` `PUSH_NOTIFICATION_KIND_MAP` [lib] |
| `event.<intercom>_intercom_unlock` | Device class `button`, event type `intercom_unlock`: fires when the door is opened *from the Ring app*. | `event.py` [HA-core]; `const.py` [lib] |
| `button.<intercom>_open_door` | Name "Open door". Pressing it calls `async_open_door()`, a `unlock_door` JSON-RPC to Ring's cloud (`PUT /commands/v1/devices/{id}/device_rpc`). Fire-and-forget: it returns success or failure but reports no state. | `button.py` [HA-core]; `other.py` `async_open_door` [lib] |
| `number` voice volume, mic volume; `sensor` battery, Wi-Fi | Housekeeping. | [HA-docs], `strings.json` [HA-core] |

**No `camera` entity for the Intercom.** `camera.py` only iterates
`ring_data.devices.video_devices` [HA-core], and the Intercom is never among
them. Neither `other.py` nor library `master` has any WebRTC or live-view code
for `RingOther` [lib]. This holds even for **Ring Intercom Video**. Ring says
that product gets its picture from the building's own entry-panel camera
("Ring Intercom relies on your building's lobby system to transfer video to the
app", [Ring: Video quality for Ring Intercom Video](https://ring.com/support/articles/yvgp5/Video-quality-for-ring-intercom-video)),
but the open-source library does not expose that video. In Home Assistant, the
Intercom is audio-less and picture-less: a ring event, an unlock event and an
open-door button.

## Signalling a ring, and triggering on it

- An event entity's state is **the timestamp of the last event**, not on/off;
  the attribute `event_type` holds the type most recently emitted (`ring`), and
  `event_types` lists the possible ones [HA-event].
- HA's recommended trigger [HA-event]:

  ```yaml
  triggers:
    - trigger: event.received
      target:
        entity_id: event.citofono_ding   # or the doorbell's event.<name>_ding
      options:
        event_type:
          - ring
  ```

  The Ring docs page still shows the older form, a `state` trigger on
  `event.<name>_ding` with `from: null` [HA-docs]. Either works for the Popup
  automation.
- The integration only fires for **new** alerts: `_handle_coordinator_update`
  skips alerts where `alert.is_update` is set (`event.py` [HA-core]). But
  [HA-docs] ("Multiple alerts") says **some models send two alerts for one
  ring**. The Popup protocol already handles a double open, because a new Popup
  replaces the current one.
- Event entities are **Unavailable** while the push listener isn't running
  (`available` returns `event_listener.started`, `event.py` [HA-core]). By this
  repo's rules that counts as a Fault only if the entity is rendered, and the
  Popup doesn't render the event entity, so nothing changes.
- `binary_sensor.<name>_ding` (occupancy, briefly `on`) is **deprecated**
  (`breaks_in_ha_version="2025.4.0"`). `async_check_create_deprecated` creates
  it only if it already exists in the entity registry and is enabled
  (`binary_sensor.py`, `entity.py` [HA-core]). Don't build on it.

## Camera streaming

- `live_view` sets `CameraEntityFeature.STREAM` and implements
  `async_handle_async_webrtc_offer` / `async_on_webrtc_candidate` /
  `close_webrtc_session` (`camera.py` [HA-core]). That is HA's native WebRTC
  camera path: the browser sends an SDP offer through HA's websocket, HA relays
  it to Ring's signalling server
  (`wss://api.prod.signalling.ring.devices.a2z.com`, `const.py`
  `RTC_STREAMING_WEB_SOCKET_ENDPOINT` [lib]), and media flows between the
  browser and Ring's cloud. There is **no HLS/RTSP source**: the entity has no
  `stream_source`, so HA's `stream` (HLS) component has nothing to open.
  Consequence for the frontend: a Feed for a Ring camera must play it via
  **WebRTC** (what HA's own `ha-camera-stream` / `ha-web-rtc-player` do for
  `frontend_stream_types: web_rtc`). A client that only knows HLS or MJPEG will
  get nothing live.
- HA passes `keep_alive_timeout=None` when it opens a stream, so the library
  does not time the session out itself (`camera.py` [HA-core]; `doorbot.py`
  `generate_async_webrtc_stream` [lib], whose default is 5 minutes). Whether
  Ring's cloud caps a live-view session isn't documented in any primary source.
  Verify on the device if the Popup may stay open for a long time.
- **Subscription.** `live_view` is created for every video device
  (`exists_fn=lambda _: True`), and nothing in the WebRTC path checks
  `has_subscription` [HA-core, lib]. Live view works without Ring Protect.
  Recordings need it ([HA-docs]: "Downloading and playing Ring video from the
  `last_recording` camera will require a Ring Protect plan").
- **Still images need a subscription**, even on `live_view`:
  `async_camera_image` takes the still from the last recording's `video_url`
  via ffmpeg, and raises `no_subscription` when the account has none
  (`camera.py` [HA-core]). Without Ring Protect there is no poster frame or
  entity picture, so a Feed tile can't fall back to a snapshot and must go
  straight to the live stream. (The map says snapshots don't count as Feeds, so
  this only affects the placeholder shown while WebRTC connects.)
- Two-way audio is not supported in live view ([HA-docs], "Known limitations").

## Unlock and the `gate` Labels

The Intercom's unlock is **`button.<intercom>_open_door`**, not a `lock`. The
map's Notes say "if the Ring has its own gate entity, it's given the same
Labels", and it can carry `gate` + `page:citofono:<region>` like the two
existing locks. But **the domain is different**. The house's gates are
`lock.esterno_cancello` / `lock.esterno_cancelletto` (`docs/protocol.md`), and
whatever component renders a `gate` lock won't render a `button` as-is. A
`button` has no locked/unlocked state (its state is the timestamp of the last
press), so it can only be drawn as a press-to-open action, with no open/closed
feedback. Whoever specifies the Ring Popup's Regions must decide how a `button`
renders there. It's a Domain question, not a Ring special case.

## Known limits

- **Cloud only.** "The Ring integration does not connect locally to devices,
  all communication goes via the cloud" [HA-docs]; `iot_class: cloud_polling`
  (`manifest.json` [HA-core]). A ring, the unlock, and the video all need
  internet and Ring's cloud to be up.
- **Polling vs push.** Device data (health, history, settings) is polled every
  **60 s** (`SCAN_INTERVAL = timedelta(minutes=1)`, `const.py`;
  `RingDataCoordinator` [HA-core]). Rings, motion and unlocks don't wait for the
  poll: `RingListenCoordinator` runs `ring_doorbell.listen.RingEventListener`,
  a **Firebase Cloud Messaging** push client (`coordinator.py` [HA-core];
  `listen/eventlistener.py` [lib]). It needs **outbound TCP 5228**
  ([HA-docs], "Realtime event stability").
- **Latency.** No primary source states a figure. The path is device → Ring
  cloud → Google FCM → HA → automation → custom event → frontend. That's push,
  so seconds rather than the 60 s poll, but it varies. Measure it on the real
  Intercom before promising the Popup will appear "as it rings".
- **Push can silently break.** [HA-docs] troubleshooting names too many
  "Authorized Client Devices" on the Ring account as a cause of alerts stopping.
  The event entities then go Unavailable (see above). The Popup automation would
  simply never fire, and nothing on the panel would show why.
- **Double alerts** from some models (above).
- **Recordings, snapshots, Intercom video recording** need a Ring subscription
  ([HA-docs]; [Ring: Intercom subscription FAQs](https://ring.com/support/articles/tdui6/Ring-intercom-subscription-faqs)
  lists recording, visitor snapshots and video preview alerts as paid).

## Consequences for the map

1. **The Ring Popup's Feed can't be the Intercom.** If the only Ring device is
   an Intercom, HA has no camera for it, and `page:citofono` has no Ring Feed.
   The Feed must come from a Ring doorbell or cam (WebRTC `live_view`) or from
   another camera watching the entrance. Confirm which Ring hardware the house
   actually has.
2. **Trigger the Popup** from `event.<intercom>_ding` (or a doorbell's
   `event.<name>_ding`) with `event.received`, `event_type: ring`.
3. **The Intercom's unlock is a `button`.** It can carry the `gate` Labels, but
   its rendering in a Region is new: stateless, press-to-open.
4. **Feeds must speak WebRTC** for Ring cameras. Don't count on a
   snapshot/poster without a Ring Protect plan.
