#!/usr/bin/env python3
"""Apply Areas from the manifest to Home Assistant's registries.

Generated template entities land with no Area -- that lives in Home
Assistant's registries, not in YAML. This script reconciles the registries
with fake-house/manifest.yaml over the websocket API:

  * creates any missing Area,
  * assigns each entity its Area,
  * renames entities whose generated id differs from the manifest id
    (siren.* fakes are built as template switches; see generate.py), and
    gives each siren its manifest name, not its wrapped switch's,
  * builds each `device_of` binary_sensor as a template helper linked to
    that entity's device (#29): a camera's motion sensor has to sit on the
    camera's device, and YAML templates cannot join one.

No Label is read or written: OHomeMy reads none (ADR-0015).

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
import sys

import aiohttp
import yaml

HERE = pathlib.Path(__file__).resolve().parent
MANIFEST = HERE.parent / "manifest.yaml"

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
                has_area = entry.get("area_id")
                # A siren is a `switch_as_x` wrapper, which takes its name from
                # the template switch it wraps -- "Sirena Cancello Src" on the
                # panel (#34). Its registry name is set to the manifest's.
                want_name = e["name"] if e["kind"] == "siren" else entry.get("name")
                has_name = entry.get("name")

                if has_area == want_area and has_name == want_name:
                    continue

                bits = []
                if has_area != want_area:
                    bits.append(f"area {has_area!r} -> {want_area!r}")
                if has_name != want_name:
                    bits.append(f"name {has_name!r} -> {want_name!r}")
                print(f"~ {want_id}: {'; '.join(bits)}")
                changes += 1
                if not dry_run:
                    r = await c.cmd(type="config/entity_registry/update",
                                    entity_id=want_id,
                                    area_id=want_area,
                                    name=want_name)
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
