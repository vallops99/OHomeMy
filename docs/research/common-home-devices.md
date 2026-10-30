# Which device types are most common in a Home Assistant home

Research for deciding which device kinds deserve a dedicated custom card in
OHomeMy (a Widget kind, in [CONTEXT.md](../../CONTEXT.md) terms). Researched
2026-10-23.

**Sources pinned:**

- [Analytics] [analytics.home-assistant.io/data.json](https://analytics.home-assistant.io/data.json),
  `current.last_updated` = 1792674478190 ms = **2026-10-22 13:07:58 UTC**,
  `current.active_installations` = **708,049**. Payload semantics from
  `homeassistant/components/analytics/analytics.py` at core
  [`3bec44d`](https://github.com/home-assistant/core/blob/3bec44d0470b044bb41febd5c7f4046f02bd2fb1/homeassistant/components/analytics/analytics.py)
  (2026-10-23).
- [HA-core] Home Assistant core at the same commit
  [`3bec44d`](https://github.com/home-assistant/core/tree/3bec44d0470b044bb41febd5c7f4046f02bd2fb1/homeassistant/components),
  `homeassistant/components/<integration>/` directory listings (which entity
  platform files each integration ships).
- [Dev-docs] Entity docs, `docs/core/entity/<domain>.md` in
  [home-assistant/developers.home-assistant@`50b5188`](https://github.com/home-assistant/developers.home-assistant/tree/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity)
  (2026-10-16, branch `master`). Rendered at
  [developers.home-assistant.io/docs/core/entity/](https://developers.home-assistant.io/docs/core/entity/).
- [Frontend] [home-assistant/frontend@`fd8bacb`](https://github.com/home-assistant/frontend/tree/fd8bacb0b8b3a0370d54a4bf548717926977f400)
  (2026-10-23), `src/panels/lovelace/card-features/`,
  `src/panels/lovelace/cards/`, `src/dialogs/more-info/controls/`.
- [Features-docs] [home-assistant.io/dashboards/features](https://www.home-assistant.io/dashboards/features/)
  (`source/dashboards/features.markdown` in home-assistant.io
  [`0f6550b`](https://github.com/home-assistant/home-assistant.io/tree/0f6550b065d1d89fdb544f901c866423c6f890a6/source/dashboards),
  2026-10-23).
- [hakit] `@hakit/components` **6.0.2**, the version OHomeMy depends on
  (`ha-dashboard/package.json`). Read from the installed package,
  `ha-dashboard/node_modules/@hakit/components/dist/types/index.d.ts`.
  Upstream: [shannonhochkins/ha-component-kit](https://github.com/shannonhochkins/ha-component-kit).
  I did not pin an upstream commit for 6.0.2 (not verified).
- [OHomeMy] This repo at `f306a2b`, `ha-dashboard/src/widgets/`.

## Answer in brief

| Question | Answer |
|---|---|
| Does HA publish entity counts per domain? | **No.** `data.json` has install counts per *integration*, plus a single average of **403 states** per install (`current.avg_states`). No per-domain entity histogram. A per-entity "snapshot" exists in core behind a Labs flag (`analytics.py`, `_snapshots_enabled`), but I found no public dataset from it (not verified). |
| So how is "most common" ranked here? | By two proxies from [Analytics] and [HA-core]: how many of the 260 most-installed integrations ship each entity platform, and which single integration of each domain is most installed. Neither is a headcount of devices. Read the ranking as "domains most integrations feed", not "domains most homes own". |
| Top domains | `sensor`, `binary_sensor`, `switch`, `light`, `climate`, `media_player`, `fan`, `camera`, `cover`, then `lock`, `alarm_control_panel`, `vacuum`. |
| Are the `light` / `sensor` rows of `data.json` entity counts? | **No.** They are not. See the trap below. |
| What does OHomeMy not cover among the top ten? | **`cover`** has no Widget and no code beyond an icon. `fan` is only an on/off toggle. `camera` exists only as a multi-camera wall. |
| Build first | A **Cover** card, then a single **Camera** card, then fan speed/oscillation. See the recommendation. |

## Evidence for the ranking

### Trap: the domain-named rows in `data.json` are not entity counts

`current.integrations` contains rows such as `sensor: 119,484`, `light:
20,730`, `climate: 24,951`, `lock: 1,750`. These look like per-domain device
counts and are not. `_async_should_report_integration` in `analytics.py`
(core `3bec44d`, L503-L530) reports a domain only if it is **defined in YAML**
or **appears as a platform in the entity registry**, or has a config flow with
an active config entry. An entity-platform domain like `light` has no config
flow, so it appears only for installs that configure it in YAML (L723-L731,
`_domains_from_yaml_config`). They count YAML users, a small and biased
subset (in this data, `light: 20,730` against `hue: 89,136`). Do not rank by
these rows.

### Proxy 1: how many popular integrations feed each domain

I took the 260 most-installed integrations in `current.integrations`, listed
each one's directory in [HA-core] and recorded which of these platform files
exist (`light.py`, `cover.py`, ...). The count is the number of those
integrations shipping the platform. **Includes** system and helper
integrations (`template`, `group`, `mqtt`), which is why `sensor` is huge.
Shipping a platform does not mean every install of that integration creates
one (a Hue install has `light`; a Shelly install may have `cover` only with a
roller relay).

| Rank | Domain | Of top-260 integrations | Example big feeders (installs) |
|---|---|---|---|
| 1 | `sensor` | 135 | `mqtt` 272,232; `matter` 231,563 |
| 2 | `binary_sensor` | 90 | `mobile_app` 483,782; `matter` |
| 3 | `switch` | 76 | `sonos` 91,206; `hue` 89,136; `tplink` 77,224 |
| 4 | `light` | 46 | `hue` 89,136; `tplink` 77,224; `reolink` 63,024 |
| 5 | `media_player` | 32 | `cast` 286,336; `dlna_dmr` 156,070; `sonos` |
| 5 | `climate` | 32 | `tplink` 77,224; `fritzbox` 36,663; `home_connect` 29,448 |
| 7 | `fan` | 30 | `tplink`; `home_connect`; `lg_thinq` 27,492 |
| 8 | `camera` | 25 | `reolink` 63,024; `synology_dsm` 51,879; `ring` 35,324; `onvif` 29,127 |
| 9 | `cover` | 24 | `fritzbox` 36,663; `switchbot` 24,512; `netatmo` 23,811 |
| 10 | `lock` | 15 | `switchbot` 24,512; `overkiz` 17,279 |
| 10 | `alarm_control_panel` | 15 | `unifiprotect` 25,451; `overkiz`; `blink` 9,894 |
| 12 | `vacuum` | 14 | `roborock` 55,287; `lg_thinq`; `xiaomi_miio` 11,637 |
| 13 | `siren` | 13 | `tplink`; `reolink`; `ring` |
| 14 | `weather` | 10 | `met` 468,733; `openweathermap` 25,177 |
| 14 | `humidifier` | 10 | `lg_thinq`; `switchbot`; `vesync` 13,021 |
| 14 | `water_heater` | 10 | `lg_thinq`; `overkiz`; `tado` 12,012 |
| 14 | `valve` | 10 | `homematicip_cloud` 7,594 |

The rank column is by count, with ties sharing a rank. Also note the
non-user-facing leaders: `button` (57), `select` (47), `number` (40), `event`
(29) and `update` (27) are common but are housekeeping entities, not device
kinds a user wants a card for.

### Proxy 2: the biggest dedicated device integration per domain

Excluding the all-purpose bridges (`mqtt` 272,232, `matter` 231,563, `tuya`
165,406, `esphome` 153,334, `zha` 143,415, `zwave_js` 46,321, `shelly`
142,134, `homekit_controller` 83,061), which can supply any domain: the
largest single-purpose integration for each: `media_player` `cast` 286,336;
`light` `hue` 89,136; `camera` `reolink` 63,024; `vacuum` `roborock` 55,287;
`cover` `fritzbox` 36,663 (a mixed router/home hub); `lock` `switchbot`
24,512; `alarm_control_panel` `unifiprotect` 25,451. Media players and lights
have by far the largest dedicated-vendor installs; `lock` and `cover` have no
dedicated vendor above ~37k.

### What the numbers cannot say

- Cover and lock devices commonly arrive through the all-purpose bridges
  (`zha`, `zwave_js`, `matter`, `mqtt`, `esphome`), whose per-domain split is
  unpublished. Both domains are likely under-ranked here (inference, not
  verified).
- The same device can be counted by several integrations (e.g. `hue` plus
  `homekit_controller`), so the install counts are not summable.
- First-party standards-body data (CSA Matter device-type list) was not
  consulted. Not verified.

## What a card must handle, per domain

Citations are to [Dev-docs] `docs/core/entity/<domain>.md` at `50b5188`; the
line ranges are in that file.

### `sensor` and `binary_sensor`

- `sensor` ([sensor.md L14-L23](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/sensor.md#L14-L23)):
  state is `native_value`; `device_class`, `native_unit_of_measurement`,
  `state_class` (`measurement`, `total`, `total_increasing`, L98-L109),
  `suggested_display_precision`, `options` for enum sensors. No services, a
  read-only domain.
- `binary_sensor` ([binary-sensor.md L16-L51](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/binary-sensor.md#L16-L51)):
  state `on`/`off`, meaning depends on `device_class` (`door` on = open,
  `lock` on = **unlocked**, `battery` on = low, `motion`, `smoke`, ...). The
  card must read the class to word and color the state. No services.

### `switch` ([switch.md L18-L74](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/switch.md#L18-L74))

State `on`/`off`. Services `turn_on`, `turn_off`, `toggle`. Device class
`outlet` or `switch` only. Nothing to design beyond a toggle.

### `light` ([light.md](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/light.md))

- Attributes (L13-L26): `brightness` 1..255, `color_mode`,
  `supported_color_modes`, `color_temp_kelvin` with `min/max_color_temp_kelvin`,
  `hs_color`, `rgb_color`, `rgbw_color`, `rgbww_color`, `xy_color`, `effect`,
  `effect_list`.
- Color modes (L36-L47): `onoff`, `brightness`, `color_temp`, `hs`, `rgb`,
  `rgbw`, `rgbww`, `white`, `xy`. `onoff` and `brightness` must be the only
  mode when present (L39-L40). A card must pick its control from
  `supported_color_modes`, not assume a dimmer.
- Features (L78-L82): `EFFECT`, `FLASH`, `TRANSITION`.
- Services (L86 onward, "Turn on light device"): `turn_on` with brightness,
  color or color temp, effect, transition; `turn_off`; `toggle`. Color
  parameters the light lacks are translated or dropped (L100-L107).

### `climate` ([climate.md](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/climate.md))

- State is `hvac_mode` (L20): `off`, `heat`, `cool`, `heat_cool`, `auto`,
  `dry`, `fan_only` (L59-L65). `hvac_modes` lists the allowed ones (L21).
- Separate from state, `hvac_action` (L19, L87-L94): `heating`, `cooling`,
  `idle`, `off`, `preheating`, `drying`, `fan`, `defrosting`.
- Temperature: current, target, `target_temp_high/low` (L26-L29), `min_temp`,
  `max_temp`, `target_temperature_step` (L23-L25, L40), `precision`,
  temperature unit (L30).
- Humidity, fan, preset and swing (L16-L38), each gated by a feature:
  `TARGET_TEMPERATURE`, `TARGET_TEMPERATURE_RANGE`, `TARGET_HUMIDITY`,
  `FAN_MODE`, `PRESET_MODE`, `SWING_MODE`, `SWING_HORIZONTAL_MODE`,
  `TURN_ON`, `TURN_OFF` (L187-L195).
- Services (L199-L327): `set_hvac_mode`, `turn_on/off`, `toggle`,
  `set_preset_mode`, `set_fan_mode`, `set_humidity`, `set_swing_mode`,
  `set_swing_horizontal_mode`, `set_temperature`.

### `media_player` ([media-player.md](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/media-player.md))

- States (L86-L93): `off`, `on`, `idle`, `playing`, `paused`, `buffering`.
- Attributes (L19-L50): `media_title`, `media_artist`, `media_album_name`,
  `media_image_url`, `media_duration`, `media_position` plus
  `media_position_updated_at`, `volume_level` 0..1, `is_volume_muted`,
  `source` / `source_list`, `sound_mode`, `shuffle`, `repeat`,
  `group_members`, `app_name`, device class (`tv`, `speaker`, `receiver`,
  `projector`, L294-L297).
- Features (L59-L80): `PLAY`, `PAUSE`, `STOP`, `NEXT_TRACK`,
  `PREVIOUS_TRACK`, `SEEK`, `VOLUME_SET`, `VOLUME_STEP`, `VOLUME_MUTE`,
  `SELECT_SOURCE`, `SELECT_SOUND_MODE`, `SHUFFLE_SET`, `REPEAT_SET`,
  `PLAY_MEDIA`, `BROWSE_MEDIA`, `SEARCH_MEDIA`, `GROUPING`, `TURN_ON/OFF`,
  and others. Wide variation between players: a card has to gate every control.

### `cover` ([cover.md](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/cover.md))

- States (L32-L37): `open`, `closed`, `opening`, `closing`.
- Attributes (L21-L26): `current_position` 0 closed to 100 open,
  `current_tilt_position`, same range.
- Device classes (L43-L52): `awning`, `blind`, `curtain`, `damper`, `door`,
  `garage`, `gate`, `shade`, `shutter`, `window`. The class decides the icon
  and the safety (a `garage` or `gate` should not open on a stray tap, as
  OHomeMy already treats `lock` gates).
- Features (L61-L69): `OPEN`, `CLOSE`, `STOP`, `SET_POSITION`, `OPEN_TILT`,
  `CLOSE_TILT`, `STOP_TILT`, `SET_TILT_POSITION`, `SPEED`.
- Services (L77-L182): `open_cover`, `close_cover`, `set_cover_position`,
  `stop_cover`, and the tilt equivalents.

### `camera` ([camera.md](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/camera.md))

- States (L31-L33): `recording`, `streaming`, `idle`.
- Properties (L16-L23): `is_streaming`, `is_recording`, `is_on`,
  `motion_detection_enabled`, `brand`, `model`.
- Features (L43-L44): `ON_OFF`, `STREAM`.
- Media: a still via the camera image (L48), a stream source (L77) and
  WebRTC (L93). Services (L133-L172): `turn_on`, `turn_off`,
  `enable_motion_detection`, `disable_motion_detection`. Live view behaviour
  per vendor is in [camera-streaming.md](camera-streaming.md) and
  [ring-integration.md](ring-integration.md).

### `fan` ([fan.md](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/fan.md))

- Attributes (L16-L22): `percentage` 0..100, `speed_count`, `oscillating`,
  `current_direction`, `preset_mode`, `preset_modes`.
- Features (L39-L44): `SET_SPEED`, `OSCILLATE`, `DIRECTION`, `PRESET_MODE`,
  `TURN_ON`, `TURN_OFF`.
- Services (L48-L199): `set_percentage`, `set_preset_mode`, `oscillate`,
  `set_direction`, `turn_on`, `turn_off`, `toggle`.

### `lock` ([lock.md](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/lock.md))

- States (L31-L37): `locked`, `locking`, `unlocked`, `unlocking`, `open`,
  `opening`, `jammed`. A card must render the transitional and `jammed`
  states.
- `code_format` (L17): a regex when a code is needed, so a card may have to
  ask for one. `changed_by` (L16).
- Feature (L63): `OPEN` (release the latch). Services (L67-L91): `lock`,
  `unlock`, `open`.

### `vacuum` ([vacuum.md](https://github.com/home-assistant/developers.home-assistant/blob/50b518898989b67bb76b69827f227aa6f0acd32a/docs/core/entity/vacuum.md))

- Activity states (L27-L32): `cleaning`, `docked`, `idle`, `paused`,
  `returning`, `error`. Attributes: `fan_speed`, `fan_speed_list` (L16-L17).
- Features (L43-L53): `START`, `PAUSE`, `STOP`, `RETURN_HOME`, `LOCATE`,
  `CLEAN_SPOT`, `CLEAN_AREA`, `FAN_SPEED`, `SEND_COMMAND`, `MAP`, `STATE`.
- Services (L109-L141): `start`, `pause`, `stop`, `return_to_base`,
  `locate`, `clean_spot`, `set_fan_speed`, `send_command`; area cleaning via
  `clean_segments` (L80).

### The rest (lower rank), pointers only

`alarm_control_panel`, `weather`, `humidifier`, `water_heater`, `valve`,
`siren`: same folder, one page each (`alarm-control-panel.md`,
`weather.md`, `humidifier.md`, `water-heater.md`, `valve.md`, `siren.md`).
I did not extract their tables; OHomeMy already covers the first two.

## What HA's frontend and @hakit already provide, and what OHomeMy has

"HA frontend" is [Frontend] `card-features/` (tile-card features, documented
in [Features-docs]), `cards/` and `dialogs/more-info/controls/`. "hakit" is
the 6.0.2 export list. "OHomeMy" is `ha-dashboard/src/widgets/` and
`widgets/shared/domains.ts` (`KIND_DOMAINS`).

| Domain | HA frontend | hakit 6.0.2 | OHomeMy `f306a2b` |
|---|---|---|---|
| `sensor` | `hui-sensor-card`, `hui-gauge-card`, `hui-statistic-card`; tile features `trend-graph`, `bar-gauge` | `SensorCard` | `sensor` Widget (Tile and Reading); `indoor_reading`; `stats` |
| `binary_sensor` | tile card; more-info default | none specific (`ModalByEntityDomain` has no binary_sensor) | `binary_sensor` Widget; `chip_row` for concerns |
| `switch` | `toggle` tile feature; `more-info-switch` | `SwitchControls`, `ButtonCard` | `toggle` Widget |
| `light` | `hui-light-card`; tile features `light-brightness`, `light-color`, `light-color-temp`, `light-color-favorites`, `light-effect` | `LightControls` | `toggle` Widget with a dimmer (see [dimmable-lights-in-area.md](dimmable-lights-in-area.md)). Color and color-temp controls: not verified |
| `climate` | `hui-thermostat-card`; tile features HVAC, fan, preset, swing, swing-horizontal modes and `target-temperature` | `ClimateCard`, `ClimateControls` | `climate` Widget, own `ui/ClimateCard.tsx` |
| `media_player` | `hui-media-control-card`; tile features playback, source, sound mode, volume slider and buttons | `MediaPlayerCard`, `MediaPlayerControls` | `media` Widget, own `ui/MediaCard.tsx`, `MediaBar.tsx` |
| `fan` | tile features `fan-speed`, `fan-oscillate`, `fan-direction`, `fan-preset-modes`; `more-info-fan` | none (no `FanCard` export in 6.0.2) | `fan` is in the `toggle` Widget's domains: on/off only. No fan-specific code found in `ui/` or `widgets/toggle/` |
| `camera` | `hui-picture-entity-card`, `hui-picture-glance-card`; `more-info-camera`; no camera tile feature | `CameraCard`, `CameraStream`, WebRTC and HLS players | `camera_wall` Widget (several cameras only). No single-camera Widget |
| `cover` | tile features `cover-open-close`, `cover-position`, `cover-tilt`, `cover-tilt-position`, favorites; `more-info-cover` | `CoverControls`, `ModalByEntityDomain/Cover` | **None.** `cover` appears only as an icon/label mapping (`ui/stateLabel.ts`, `ui/Icon.tsx`) |
| `lock` | tile features `lock-commands`, `lock-open-door`; `more-info-lock` | none (no `LockCard` export) | `lock` Widget (`AccessRow`, hold to open a gate) |
| `alarm_control_panel` | `hui-alarm-panel-card`; tile feature `alarm-modes` | `AlarmCard`, `AlarmControls` | `alarm` Widget, `AlarmPanel`, `AlarmModal` |
| `vacuum` | tile features `vacuum-commands`, `vacuum-fan-speed`; `more-info-vacuum` | `VacuumCard` | `vacuum` Widget, own `ui/VacuumCard.tsx` |
| `weather` | `hui-weather-forecast-card`; forecast tile features | `WeatherCard` | `weather` Widget |
| `humidifier`, `water_heater`, `valve`, `lawn_mower` | `hui-humidifier-card` and tile features for each | none | none |

Notes on this table:

- The HA lists come from file names in [Frontend] at `fd8bacb`
  (`src/panels/lovelace/card-features/hui-<name>-card-feature.ts`,
  `cards/hui-<name>-card.ts`, `dialogs/more-info/controls/more-info-<domain>.ts`).
  I confirmed the files exist, not each card's internals.
- hakit's `ModalByEntityDomain` ships modals for AlarmControlPanel, Camera,
  Climate, Cover, Light, MediaPlayer, Person, Switch, Vacuum and Weather
  (`dist/types/Shared/Modal/ModalByEntityDomain/`). OHomeMy imports
  `ModalByEntityDomain` and `CardBase` from `@hakit/components` but builds
  its own cards on top (`ui/`), per [hakit-in-a-panel.md](hakit-in-a-panel.md).
- OHomeMy's `toggle` kind covers `light`, `switch`, `fan`, `input_boolean`,
  `siren` (`KIND_DOMAINS` in `widgets/shared/domains.ts`).

## Recommendation: what to build first

1. **Cover card.** It is the one top-ten domain with no Widget at all, and it
   is fed by 24 of the top-260 integrations. HA's own model is rich enough
   to repay a custom card: position 0 to 100, tilt, `opening`/`closing`
   transitional states, stop, and ten device classes (blinds and shutters
   versus garage doors and gates). The `garage`/`gate` classes also want the
   hold-to-open safety OHomeMy's `lock` Widget already has (`ui/accessHold.ts`).
   The pieces to reuse exist: `Slider`, `AccessRow`, hakit `CoverControls`
   (as a reference).
2. **Single Camera card.** Cameras are the 8th most-fed domain and the
   largest dedicated vendors (`reolink` 63k, `synology_dsm` 52k, `ring` 35k)
   are big. OHomeMy only has the wall. A single-entity Widget reusing the
   Camera Wall's Feed (and hakit `CameraStream`) is a small step
   ([camera-streaming.md](camera-streaming.md)).
3. **Fan speed and oscillation.** Fans are fed by 30 integrations and
   already sit in `toggle` as on/off. Adding `percentage`, `oscillating` and
   `preset_mode` behind the `SET_SPEED`, `OSCILLATE`, `PRESET_MODE`
   features is an extension of the existing Widget, not a new kind.
4. **Defer**: `humidifier`, `water_heater`, `valve`, `lawn_mower`. Each is
   fed by about 10 or fewer popular integrations, and HA's tile features and
   more-info already cover them. Revisit if the house gets one.
5. **Leave alone**: `sensor`, `binary_sensor`, `switch`, `light`, `climate`,
   `media_player`, `lock`, `alarm_control_panel`, `vacuum`, `weather`. The
   top of the ranking is already built.

## Not verified

- Any per-domain *entity* count. None is published; the ranking is a proxy.
- That `cover` and `lock` are under-ranked because of bridge integrations
  (inference).
- CSA/Matter device-type counts; not consulted.
- The upstream @hakit commit for 6.0.2.
- The internals of HA's cards beyond their existence; whether OHomeMy's
  `toggle` offers color or color-temperature controls for lights.
- `alarm-control-panel`, `weather`, `humidifier`, `water-heater`, `valve`,
  `siren` entity tables (not extracted).
