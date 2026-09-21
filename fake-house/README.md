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

`manifest.yaml` declares all 57 entities once: entity id, Area, Labels, and the
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

Each fake is backed by helper entities that hold its state, so anything can be
driven from outside:

```
input_boolean.fake_online_<slug>   availability -- off means `unavailable`
input_boolean.fake_state_<slug>    on/off
input_number.fake_level_<slug>     brightness / volume
input_select.fake_mode_<slug>      alarm mode, vacuum state, select options
input_number.fake_value_<slug>     numeric sensor value
```

**Every** fake entity has an `fake_online_*` switch, so a visible fault can be
produced on demand -- the design renders `unavailable` rather than hiding it.

## Rebuilding `ha-local` from scratch

`ha-local` is expendable. From a bare config directory:

```bash
# 1. generate the packages
python fake-house/scripts/generate.py --config-dir ~/projects/home-assistant/config

# 2. config-entry helpers (cameras, sirens) -- Home Assistant must be stopped
docker stop ha-local
python fake-house/scripts/bootstrap-helpers.py --config-dir ~/projects/home-assistant/config
docker start ha-local

# 3. Areas, Labels, and the entity ids the non-template platforms don't control
python fake-house/scripts/apply-registry.py --token-from ha-dashboard/.env.development
```

`configuration.yaml` needs the packages include once:

```yaml
homeassistant:
  packages: !include_dir_named packages
```

Steps 1 and 3 are idempotent; re-run them freely. Step 3 is also the one to
re-run after editing Areas or Labels in the manifest.

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
  config-flow only, and live streaming is its own open question (see map #1).
  The entity is real and sits in the right Area, which is what the dashboard
  needs to lay out; what it *shows* is a placeholder.
- **The entity registry refuses to rename across domains.** This is why sirens
  are a template switch wrapped by `switch_as_x` rather than a renamed switch.
- **`default_entity_id` only exists on the `template` platform.** The other
  platforms name entities from their title, so `apply-registry.py` renames them
  afterwards. That rename is same-domain, which the registry does allow.
- **Helper entities are visible in Home Assistant.** 129 `input_*` helpers back
  the fakes. They carry no Area, so the dashboard's Area queries never see them.
