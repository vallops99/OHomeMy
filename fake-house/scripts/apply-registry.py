#!/usr/bin/env python3
"""Apply Areas and Labels from the manifest to Home Assistant's registries.

Generated template entities land with no Area and no Labels -- those live in
Home Assistant's registries, not in YAML. This script reconciles the registries
with fake-house/manifest.yaml over the websocket API:

  * creates any missing Area and Label,
  * deletes any Label the manifest does not declare, so a retired one (the
    old `region:*` Labels, ADR-0008) cannot linger in the phone picker
    looking assignable and placing nothing,
  * assigns each Area its own Labels, and each entity its Area and Labels,
  * renames entities whose generated id differs from the manifest id
    (siren.* fakes are built as template switches; see generate.py), and
    gives each siren its manifest name, not its wrapped switch's,
  * creates the `input_boolean.panel_glance` helper that gates the `glance`
    region (docs/protocol.md, #13 item 4),
  * creates the two Popup helpers, `input_text.panel_popup` and
    `input_button.panel_popup_activity` (docs/protocol.md "Popups", #28),
  * builds each `device_of` binary_sensor as a template helper linked to
    that entity's device (#29): a camera's motion sensor has to sit on the
    camera's device, and YAML templates cannot join one.

These are editable-storage helpers, not config-flow integrations: they have no
`config_entries` row for bootstrap-helpers.py to write, and each lives behind
its own `<domain>/create` websocket command instead. They are created here,
against the live instance, rather than there.

Idempotent: running it twice changes nothing the second time.

Usage:
    python fake-house/scripts/apply-registry.py --token "$VITE_HA_TOKEN"
    python fake-house/scripts/apply-registry.py --token-from ha-dashboard/.env.development
"""

from __future__ import annotations

import argparse
import asyncio
import itertools
import pathlib
import re
import sys

import aiohttp
import yaml

HERE = pathlib.Path(__file__).resolve().parent
MANIFEST = HERE.parent / "manifest.yaml"

# The helper that gates the `glance` region (docs/protocol.md, #13 item 4).
# Not part of the manifest: it is a fact about the panel, not about the house.
GLANCE_TOGGLE = "input_boolean.panel_glance"
GLANCE_TOGGLE_NAME = "Riquadro Colpo d'Occhio"
GLANCE_TOGGLE_ICON = "mdi:eye-outline"

# The Popup's helpers (docs/protocol.md "Popups", ADR-0009). Facts about the
# panel too, found by fixed id like the glance toggle. Each entry: the
# English name `<domain>/create` slugifies into the wanted id, the Italian
# name and icon it is renamed to, and any settings of its own.
POPUP_HELPERS = [
    ("input_text.panel_popup", "Panel Popup", "Popup del pannello",
     "mdi:dock-window", {"min": 0, "max": 255, "mode": "text"}),
    ("input_button.panel_popup_activity", "Panel Popup Activity",
     "Tocco sul popup", "mdi:gesture-tap", {}),
]


def read_token_from_env_file(path: pathlib.Path) -> str:
    """Read VITE_HA_TOKEN from a .env file without ever printing it."""
    for line in path.read_text().splitlines():
        line = line.strip()
        if line.startswith("VITE_HA_TOKEN="):
            return line.split("=", 1)[1].strip().strip("'\"")
    raise SystemExit(f"VITE_HA_TOKEN not found in {path}")


def slug(entity_id: str) -> str:
    """Must match generate.py: single underscore (HA rejects `__` in slugs)."""
    return entity_id.replace(".", "_")


def label_slug(name: str) -> str:
    """Home Assistant's own rule for turning a Label's name into its id.

    The manifest writes Placement Labels by name -- `page:main:right` --
    but the registry keys everything on the id HA
    derived from that name when the Label was created: lowercase, with every
    run of non-alphanumeric characters (both `:` and `-`) collapsed to a
    single `_`. Comparing or writing a manifest label anywhere other than
    through this function is how #12's trap gets sprung again: HA accepts
    unknown ids silently (`success: true`, `labels: []`) instead of rejecting
    them, so a spelling mismatch fails invisibly rather than loudly.
    """
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def template_key(e: dict) -> tuple[str, str]:
    """How a `device_of` sensor's template helper is found again: by title."""
    return ("template", e["name"])


class Client:
    def __init__(self, ws) -> None:
        self.ws = ws
        self._ids = itertools.count(1)

    async def cmd(self, **payload) -> dict:
        mid = next(self._ids)
        await self.ws.send_json({"id": mid, **payload})
        while True:
            msg = await self.ws.receive_json()
            if msg.get("id") == mid and msg.get("type") == "result":
                return msg


async def run(url: str, token: str, dry_run: bool) -> int:
    manifest = yaml.safe_load(MANIFEST.read_text())
    changes = 0

    async with aiohttp.ClientSession() as session:
        rest_headers = {"Authorization": f"Bearer {token}"}

        async def flow(path: str, payload: dict) -> dict:
            """One step of a config flow. Flows are REST-only, not websocket."""
            async with session.post(f"{url}/api/config/config_entries/flow{path}",
                                    json=payload, headers=rest_headers) as r:
                return await r.json()

        async with session.ws_connect(f"{url}/api/websocket") as ws:
            await ws.receive_json()  # auth_required
            await ws.send_json({"type": "auth", "access_token": token})
            auth = await ws.receive_json()
            if auth.get("type") != "auth_ok":
                print(f"auth failed: {auth}", file=sys.stderr)
                return 2

            c = Client(ws)

            # ---- areas ----
            res = await c.cmd(type="config/area_registry/list")
            have = {a["area_id"] for a in res["result"]}
            for a in manifest["areas"]:
                if a["id"] in have:
                    continue
                print(f"+ area {a['id']}")
                changes += 1
                if not dry_run:
                    # HA derives area_id from the name; create then verify.
                    await c.cmd(type="config/area_registry/create",
                                name=a["name"], icon=a.get("icon"))

            # ---- labels ----
            # The registry keys labels on the id HA slugified from the name at
            # creation time (`page:main:right` -> `page_main_right`), not on the manifest's
            # own `id:` spelling -- the two only coincide for the plain labels
            # (`main`, `gate`, ...). Comparing against `l["id"]` unslugged made
            # every Placement Label look permanently missing and recreated it on
            # every run; see the trap recorded at the top of this file.
            res = await c.cmd(type="config/label_registry/list")
            have = {l["label_id"] for l in res["result"]}
            declared = {label_slug(l["id"]) for l in manifest["labels"]}
            for l in manifest["labels"]:
                want_id = label_slug(l["id"])
                if want_id in have:
                    continue
                print(f"+ label {l['id']}")
                changes += 1
                if not dry_run:
                    await c.cmd(type="config/label_registry/create",
                                name=l["name"], icon=l.get("icon"))

            # ---- label prune ----
            # The manifest is the whole label vocabulary, so a registry Label
            # it does not declare is one the house has retired. Left behind it
            # would still show in the phone picker, looking assignable and
            # placing nothing (ADR-0008 retired every `region:*` this way).
            # Home Assistant strips a deleted Label from every Area and entity
            # carrying it, so the assignment loops below see it gone.
            for l in res["result"]:
                if l["label_id"] in declared:
                    continue
                print(f"- label {l['name']}")
                changes += 1
                if not dry_run:
                    r = await c.cmd(type="config/label_registry/delete",
                                    label_id=l["label_id"])
                    if not r.get("success"):
                        print(f"  ! {r.get('error')}", file=sys.stderr)

            # ---- area labels ----
            # An Area's Placements (docs/protocol.md) live here, not on any
            # entity -- `area salone: [page:main:right]` is only real once the
            # Area itself carries that Label. #12 spent
            # its whole life establishing that Home Assistant does deliver Area
            # labels to the frontend; this loop is what actually puts them
            # there, and until now nothing did -- every Area in the live
            # registry carried `labels: []` regardless of the manifest.
            res = await c.cmd(type="config/area_registry/list")
            area_by_id = {a["area_id"]: a for a in res["result"]}
            for a in manifest["areas"]:
                area = area_by_id.get(a["id"])
                if area is None:
                    continue  # created above on this same run; picked up next time
                want_labels = sorted(label_slug(l) for l in a.get("labels") or [])
                has_labels = sorted(area.get("labels") or [])
                if has_labels == want_labels:
                    continue
                print(f"~ area {a['id']}: labels {has_labels} -> {want_labels}")
                changes += 1
                if not dry_run:
                    r = await c.cmd(type="config/area_registry/update",
                                    area_id=a["id"], labels=want_labels)
                    if not r.get("success"):
                        print(f"  ! {r.get('error')}", file=sys.stderr)

            # ---- entities ----
            # Config entries created by bootstrap-helpers.py. Home Assistant
            # drops `unique_id` for these helper domains but preserves the
            # title, and the title comes from the manifest -- so match on that.
            async def registries():
                res = await c.cmd(type="config_entries/get")
                entry_by_title = {
                    (ce.get("domain"), ce.get("title")): ce["entry_id"]
                    for ce in res.get("result", [])
                    if ce.get("domain") in ("generic", "switch_as_x", "template")
                }
                res = await c.cmd(type="config/entity_registry/list")
                return entry_by_title, res["result"]

            entry_by_title, registry = await registries()
            device_of = {e["id"]: e for e in manifest["entities"]
                         if e.get("device_of")}

            def find(e: dict, entry_by_title: dict, registry: list):
                """The registry entry the manifest entity `e` is, wherever it sits."""
                want_id = e["id"]
                by_config_entry = {r.get("config_entry_id"): r for r in registry}
                # A `device_of` sensor is only ever its template helper: an
                # entry at its id from anywhere else is the YAML template it
                # replaced, orphaned, and removed below.
                if want_id in device_of:
                    cid = entry_by_title.get(template_key(e))
                    return by_config_entry.get(cid) if cid else None

                entry = next((r for r in registry if r["entity_id"] == want_id), None)
                # The entity may exist under a Home-Assistant-derived id.
                # Template entities carry our own unique_id; config-entry
                # helpers (generic camera, switch_as_x siren) get a random
                # unique_id instead, so those are matched via the config entry
                # bootstrap-helpers.py created, whose unique_id we do control.
                if entry is None:
                    for platform in ("template", "universal", "generic",
                                     "generic_thermostat", "group"):
                        entry = next((r for r in registry
                                      if (r.get("platform"), r.get("unique_id"))
                                      == (platform, slug(want_id))), None)
                        if entry:
                            break
                if entry is None:
                    helper_domain = {"camera": "generic",
                                     "siren": "switch_as_x"}.get(e["kind"])
                    cid = entry_by_title.get((helper_domain, e["name"]))
                    if cid:
                        entry = by_config_entry.get(cid)
                return entry

            # ---- device-bound sensors ----
            # A camera's motion comes from the motion sensor on the camera's
            # own device (#29, CONTEXT.md), because the three cameras share an
            # Area. YAML templates cannot join a device, so these are template
            # *helpers* -- config entries, with a device selector -- created
            # through the config flow over the same backing helpers
            # generate.py writes. Created once; to relink one, delete the
            # helper in Home Assistant and re-run.
            created = False
            for e in device_of.values():
                if template_key(e) in entry_by_title:
                    continue
                target = next((m for m in manifest["entities"]
                               if m["id"] == e["device_of"]), None)
                host = find(target, entry_by_title, registry) if target else None
                device_id = (host or {}).get("device_id")
                if not device_id:
                    print(f"  ! {e['id']}: {e['device_of']} has no device yet; "
                          f"re-run once it has", file=sys.stderr)
                    continue
                print(f"+ template helper {e['id']} on the device of {e['device_of']}")
                changes += 1
                if dry_run:
                    continue
                state = f"input_boolean.fake_state_{slug(e['id'])}"
                online = f"input_boolean.fake_online_{slug(e['id'])}"
                step = await flow("", {"handler": "template"})
                step = await flow(f"/{step['flow_id']}", {"next_step_id": "binary_sensor"})
                options = {
                    "name": e["name"],
                    "state": f"{{{{ is_state('{state}','on') }}}}",
                    "device_id": device_id,
                    "additional_options": {
                        "availability": f"{{{{ is_state('{online}','on') }}}}",
                    },
                }
                if e.get("device_class"):
                    options["device_class"] = e["device_class"]
                step = await flow(f"/{step['flow_id']}", options)
                if step.get("type") != "create_entry":
                    print(f"  ! {step}", file=sys.stderr)
                    continue
                created = True
            if created:
                entry_by_title, registry = await registries()

            # The YAML template each of those replaced stays in the registry,
            # orphaned, holding the manifest id the helper is renamed to.
            for e in device_of.values():
                orphan = next((r for r in registry if r["entity_id"] == e["id"]), None)
                helper = find(e, entry_by_title, registry)
                if orphan is None or helper is None or orphan["id"] == helper["id"]:
                    continue
                print(f"- orphaned {e['id']} ({orphan.get('platform')})")
                changes += 1
                if not dry_run:
                    r = await c.cmd(type="config/entity_registry/remove",
                                    entity_id=e["id"])
                    if not r.get("success"):
                        print(f"  ! {r.get('error')}", file=sys.stderr)
            if not dry_run:
                entry_by_title, registry = await registries()

            missing = []
            for e in manifest["entities"]:
                want_id = e["id"]
                entry = find(e, entry_by_title, registry)
                if entry is None:
                    missing.append(want_id)
                    continue

                if entry["entity_id"] != want_id:
                    print(f"~ rename {entry['entity_id']} -> {want_id}")
                    changes += 1
                    if not dry_run:
                        r = await c.cmd(type="config/entity_registry/update",
                                        entity_id=entry["entity_id"],
                                        new_entity_id=want_id)
                        if not r.get("success"):
                            print(f"  ! {r.get('error')}", file=sys.stderr)
                            continue
                    entry = dict(entry, entity_id=want_id)

                want_area = e.get("area")
                want_labels = sorted(label_slug(l) for l in e.get("labels") or [])
                has_area = entry.get("area_id")
                has_labels = sorted(entry.get("labels") or [])
                # A siren is a `switch_as_x` wrapper, which takes its name from
                # the template switch it wraps -- "Sirena Cancello Src" on the
                # panel (#34). Its registry name is set to the manifest's.
                want_name = e["name"] if e["kind"] == "siren" else entry.get("name")
                has_name = entry.get("name")

                if has_area == want_area and has_labels == want_labels and has_name == want_name:
                    continue

                bits = []
                if has_area != want_area:
                    bits.append(f"area {has_area!r} -> {want_area!r}")
                if has_labels != want_labels:
                    bits.append(f"labels {has_labels} -> {want_labels}")
                if has_name != want_name:
                    bits.append(f"name {has_name!r} -> {want_name!r}")
                print(f"~ {want_id}: {'; '.join(bits)}")
                changes += 1
                if not dry_run:
                    r = await c.cmd(type="config/entity_registry/update",
                                    entity_id=want_id,
                                    area_id=want_area,
                                    labels=want_labels,
                                    name=want_name)
                    if not r.get("success"):
                        print(f"  ! {r.get('error')}", file=sys.stderr)

            # ---- glance toggle ----
            # docs/protocol.md: `glance` is the one region whose presence is
            # not purely a matter of Labels -- it is gated by an HA helper
            # toggle, changeable from a phone, and with it off `right`
            # takes the panel's width. `input_boolean` has no config-flow form
            # for bootstrap-helpers.py to write into `core.config_entries`; it
            # is an editable-storage helper created with its own websocket
            # command, so it is reconciled here instead, against the live
            # instance like everything else in this script.
            #
            # `input_boolean/create` always derives the id (and so the
            # entity_id) from whatever `name` it is given, with no way to pass
            # an id directly -- so the helper is created under an English name
            # that slugifies to `panel_glance`, and `input_boolean/update`
            # renames it to the Italian friendly name afterwards without
            # touching the id.
            res = await c.cmd(type="input_boolean/list")
            existing = {ib["id"]: ib for ib in res["result"]}
            glance_id = GLANCE_TOGGLE.split(".", 1)[1]
            ib = existing.get(glance_id)
            if ib is None:
                print(f"+ helper {GLANCE_TOGGLE}")
                changes += 1
                if not dry_run:
                    r = await c.cmd(type="input_boolean/create", name="Panel Glance")
                    if not r.get("success"):
                        print(f"  ! {r.get('error')}", file=sys.stderr)
                    else:
                        r = await c.cmd(type="input_boolean/update",
                                        input_boolean_id=r["result"]["id"],
                                        name=GLANCE_TOGGLE_NAME,
                                        icon=GLANCE_TOGGLE_ICON)
                        if not r.get("success"):
                            print(f"  ! {r.get('error')}", file=sys.stderr)
                        # A new `input_boolean` rests at `off`, which for this
                        # one means "render no glance quadrant at all". The
                        # gate is meant to be a thing the house turns off
                        # deliberately, not the state a freshly-labelled house
                        # starts in, so the helper is switched on once at
                        # creation. Never afterwards: the toggle belongs to
                        # whoever lives here from that point on, and this
                        # script reconciles the house's declarations, not its
                        # live state.
                        await c.cmd(type="call_service", domain="input_boolean",
                                    service="turn_on",
                                    target={"entity_id": GLANCE_TOGGLE})
            elif ib.get("name") != GLANCE_TOGGLE_NAME or ib.get("icon") != GLANCE_TOGGLE_ICON:
                print(f"~ helper {GLANCE_TOGGLE}: name/icon out of date")
                changes += 1
                if not dry_run:
                    r = await c.cmd(type="input_boolean/update",
                                    input_boolean_id=glance_id,
                                    name=GLANCE_TOGGLE_NAME,
                                    icon=GLANCE_TOGGLE_ICON)
                    if not r.get("success"):
                        print(f"  ! {r.get('error')}", file=sys.stderr)

            # ---- popup helpers ----
            # Same dance as the glance toggle above: create under an English
            # name that slugifies to the fixed id, then rename. Neither is
            # given a value: an empty `input_text` is a closed Popup, which
            # is the state a fresh house should start in.
            for entity_id, create_name, name, icon, extra in POPUP_HELPERS:
                domain, helper_id = entity_id.split(".", 1)
                res = await c.cmd(type=f"{domain}/list")
                existing = {h["id"]: h for h in res["result"]}
                h = existing.get(helper_id)
                if h is None:
                    print(f"+ helper {entity_id}")
                    changes += 1
                    if dry_run:
                        continue
                    r = await c.cmd(type=f"{domain}/create", name=create_name, **extra)
                    if not r.get("success"):
                        print(f"  ! {r.get('error')}", file=sys.stderr)
                        continue
                    if r["result"]["id"] != helper_id:
                        print(f"  ! created as {domain}.{r['result']['id']}, "
                              f"not {entity_id}", file=sys.stderr)
                        continue
                elif h.get("name") == name and h.get("icon") == icon:
                    continue
                else:
                    print(f"~ helper {entity_id}: name/icon out of date")
                    changes += 1
                    if dry_run:
                        continue
                r = await c.cmd(type=f"{domain}/update",
                                **{f"{domain}_id": helper_id},
                                name=name, icon=icon, **extra)
                if not r.get("success"):
                    print(f"  ! {r.get('error')}", file=sys.stderr)

            if missing:
                print(f"\n{len(missing)} manifest entities not found in Home "
                      f"Assistant -- run generate.py and restart HA:",
                      file=sys.stderr)
                for m in missing:
                    print(f"  - {m}", file=sys.stderr)

    verb = "would change" if dry_run else "changed"
    print(f"\n{verb} {changes} registry item(s)")
    return 1 if missing else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8123")
    ap.add_argument("--token")
    ap.add_argument("--token-from", type=pathlib.Path,
                    help="read VITE_HA_TOKEN from this .env file")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    token = args.token
    if not token and args.token_from:
        token = read_token_from_env_file(args.token_from)
    if not token:
        raise SystemExit("need --token or --token-from")

    return asyncio.run(run(args.url.rstrip("/"), token, args.dry_run))


if __name__ == "__main__":
    sys.exit(main())
