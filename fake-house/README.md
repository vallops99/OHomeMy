# Fake house

Casa Carina's devices do not exist yet. The house will be wired eventually, but
every screen has to be buildable and reviewable now. This directory makes the
whole house exist in Home Assistant as **real entities with the real entity
ids**, so that swapping fakes for real devices is a no-op on the frontend.

Nothing here ships to the tablet. It is development scaffolding for `ha-local`.

## Why entities and not mocks

The dashboard is backend-driven (see `CONTEXT.md` and issue #3): it derives what
it renders from Home Assistant's registries and never names an entity id. A mock
layer inside the app would have to fake the registries too, and would diverge
from the code path that actually ships. Faking at the Home Assistant end means
the frontend runs its production code path against a house that behaves like the
real one -- real service calls, real state machine, real `unavailable`.

## The manifest is the source of truth

`manifest.yaml` declares every entity once: entity id, Area, and the
`kind` that decides how it is faked. Entity ids are taken verbatim from the
existing `Casa Carina` Lovelace dashboard, which is the statement of intent for
the real house.

Everything else is generated from it. To add a device to the fake house, add it
to the manifest and re-run the two scripts -- never edit the generated packages.

## How each domain is faked

Home Assistant has no single mechanism that covers every domain, so the
generator picks per domain. All three routes produce genuine entities:

| Domains | Mechanism |
|---|---|
| light, switch, lock, alarm_control_panel, vacuum, select, sensor, binary_sensor | `template` platform |
| media_player | `universal` platform |
| climate | `generic_thermostat` over a faked switch + sensor |
| camera | `generic` camera config entry (a still image) |
| siren | template switch wrapped by `switch_as_x` |
| event | trigger-based `template` event, fired by pressing an `input_button` |
| button | `template` button that does nothing when pressed |
| lock over a button (`button_lock`) | `template` lock that presses the button; the real house needs the same wrapper |
| binary_sensor with `device_of` | `template` **helper** (a config entry) linked to that entity's device, created by `apply-registry.py` |
| `group` (a Group, ADR-0014) | the `group` platform's YAML form over the manifest's `members`: the same entity a Group helper made in Home Assistant's UI is, and one the real house needs too, not a fake |
| `external` | nothing: a real entity from a real integration (the met.no weather), only given its Area |

A camera's motion is the motion sensor on the camera's own device (CONTEXT.md,
Derived), and YAML templates cannot join a device. So the three camera motion
sensors carry `device_of: camera.<id>` in the manifest: `generate.py` still
writes their backing helpers but no YAML template, and `apply-registry.py`
creates each one through Home Assistant's template config flow with the
camera's device selected. It creates each once; to relink one, delete that
helper in Home Assistant and re-run. Being on a device, it shows in Home
Assistant as "Telecamera Cancello Movimento Cancello" (the device name comes
first), which the panel never displays.

Each fake is backed by helper entities that hold its state, so anything can be
driven from outside:

```
input_boolean.fake_online_<slug>   availability -- off means `unavailable`
input_boolean.fake_state_<slug>    on/off
input_number.fake_level_<slug>     brightness / volume
input_select.fake_mode_<slug>      alarm mode, vacuum state, select options
input_number.fake_value_<slug>     numeric sensor value
input_button.fake_fire_<slug>      fires an `event` entity (a doorbell ring)
```

**Every** fake entity has an `fake_online_*` switch, so a visible fault can be
produced on demand -- the design renders `unavailable` rather than hiding it.

## Rebuilding `ha-local` from scratch

`ha-local` is expendable. From a bare config directory:

```bash
# 1. generate the packages
python fake-house/scripts/generate.py --config-dir ~/projects/home-assistant/config

# 2. config-entry helpers (cameras, sirens) -- Home Assistant must be stopped.
#    `.storage` belongs to the container's root, so run the script in a
#    throwaway container from the same image:
docker stop ha-local
docker run --rm --entrypoint python \
  -v ~/projects/home-assistant/config:/config -v "$PWD/fake-house:/fh" \
  ghcr.io/home-assistant/home-assistant:stable \
  /fh/scripts/bootstrap-helpers.py --config-dir /config
docker start ha-local

# 3. Areas, and the entity ids the non-template platforms don't control
python fake-house/scripts/apply-registry.py --token-from ha-dashboard/.env.development
```

`configuration.yaml` needs the packages include once:

```yaml
homeassistant:
  packages: !include_dir_named packages
```

All three steps are idempotent; re-run them freely. Step 2 keeps each config
entry's id, so re-running it leaves the entities where they are. Step 3 is also
the one to re-run after editing Areas in the manifest.

`generate.py --clean` removes the generated packages;
`bootstrap-helpers.py --remove` removes the config entries it created.

## Driving the house

`scene.py` puts the whole house into a named state, so UI states that are
awkward to reach by hand are one command away:

```bash
python fake-house/scripts/scene.py sera    --token-from ha-dashboard/.env.development
```

| Scene | What it produces |
|---|---|
| `sera` | evening: lights on, TV playing, alarm disarmed |
| `notte` | night: everything off, alarm armed night |
| `assente` | away: alarm armed away, house dark |
| `guasto` | three entities `unavailable`, across three Areas and three mechanisms |
| `allarme` | alarm triggered, sirens on, lights at full |
| `reset` | calm baseline, everything available again |

## Known limits

- **Cameras are a still image, not a stream.** The `generic` camera platform is
  config-flow only, and the fakes have no stream source, so Home Assistant
  offers no live stream for them: their Feeds say "Nessun video in diretta",
  which is the panel's real answer for such a camera. Their `fake_online_*`
  helpers exist but do not drive a generic camera, so a camera Fault cannot
  be produced on demand.

  To see a live Feed, give one camera a stream in Home Assistant (Settings,
  the camera's generic entry, Configure): a clip in `config/www/`, say one
  made with `ffmpeg -f lavfi -i testsrc=size=640x360:rate=15 -t 600 -c:v libx264
  -profile:v baseline -pix_fmt yuv420p fake-feed.mp4`, as the stream source
  `http://127.0.0.1:8123/local/fake-feed.mp4#input=file`. go2rtc, which ships
  with Home Assistant, then serves it over WebRTC. If the Feed fails with
  "Stream source is not supported by go2rtc" after a restart, reload the go2rtc
  integration. Remove the stream source afterwards; `bootstrap-helpers.py`
  also resets it.
- **The entity registry refuses to rename across domains.** This is why sirens
  are a template switch wrapped by `switch_as_x` rather than a renamed switch.
- **`default_entity_id` only exists on the `template` platform.** The other
  platforms name entities from their title, so `apply-registry.py` renames them
  afterwards. That rename is same-domain, which the registry does allow.
- **Helper entities are visible in Home Assistant.** 134 `input_*` helpers back
  the fakes. They carry no Area, so the dashboard's Area queries never see them.
