#!/usr/bin/env python3
"""Apply Areas and Labels from the manifest to Home Assistant's registries.

Generated template entities land with no Area and no Labels -- those live in
Home Assistant's registries, not in YAML. This script reconciles the registries
with fake-house/manifest.yaml over the websocket API:

  * creates any missing Area and Label,
  * assigns each Area its own Labels, and each entity its Area and Labels,
  * renames entities whose generated id differs from the manifest id
    (siren.* fakes are built as template switches; see generate.py),
  * creates the `input_boolean.panel_glance` helper that gates the `glance`
    region (docs/protocol.md, #13 item 4).

`input_boolean` is an editable-storage helper, not a config-flow integration:
it has no `config_entries` row for bootstrap-helpers.py to write, and it lives
behind its own `input_boolean/create` websocket command instead. It is created
here, against the live instance, rather than there.

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

    The manifest writes Prefixed Labels by name -- `page:main`,
    `region:entities-right` -- but the registry keys everything on the id HA
    derived from that name when the Label was created: lowercase, with every
    run of non-alphanumeric characters (both `:` and `-`) collapsed to a
    single `_`. Comparing or writing a manifest label anywhere other than
    through this function is how #12's trap gets sprung again: HA accepts
    unknown ids silently (`success: true`, `labels: []`) instead of rejecting
    them, so a spelling mismatch fails invisibly rather than loudly.
    """
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


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
            # creation time (`page:main` -> `page_main`), not on the manifest's
            # own `id:` spelling -- the two only coincide for the plain labels
            # (`main`, `gate`, ...). Comparing against `l["id"]` unslugged made
            # every Prefixed Label look permanently missing and recreated it on
            # every run; see the trap recorded at the top of this file.
            res = await c.cmd(type="config/label_registry/list")
            have = {l["label_id"] for l in res["result"]}
            for l in manifest["labels"]:
                want_id = label_slug(l["id"])
                if want_id in have:
                    continue
                print(f"+ label {l['id']}")
                changes += 1
                if not dry_run:
                    await c.cmd(type="config/label_registry/create",
                                name=l["name"], icon=l.get("icon"))

            # ---- area labels ----
            # Half of every Area's Placement (docs/protocol.md) lives here, not
            # on any entity -- `area salone: [page:main, region:entities-right]`
            # is only real once the Area itself carries those Labels. #12 spent
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
            res = await c.cmd(type="config_entries/get")
            entry_by_title = {
                (ce.get("domain"), ce.get("title")): ce["entry_id"]
                for ce in res.get("result", [])
                if ce.get("domain") in ("generic", "switch_as_x")
            }

            res = await c.cmd(type="config/entity_registry/list")
            by_id = {e["entity_id"]: e for e in res["result"]}
            by_unique = {(e.get("platform"), e.get("unique_id")): e
                         for e in res["result"]}
            by_config_entry = {e.get("config_entry_id"): e
                               for e in res["result"]}

            missing = []
            for e in manifest["entities"]:
                want_id = e["id"]
                entry = by_id.get(want_id)

                # The entity may exist under a Home-Assistant-derived id.
                # Template entities carry our own unique_id; config-entry
                # helpers (generic camera, switch_as_x siren) get a random
                # unique_id instead, so those are matched via the config entry
                # bootstrap-helpers.py created, whose unique_id we do control.
                if entry is None:
                    for platform in ("template", "universal", "generic",
                                     "generic_thermostat"):
                        entry = by_unique.get((platform, slug(want_id)))
                        if entry:
                            break
                if entry is None:
                    helper_domain = {"camera": "generic",
                                     "siren": "switch_as_x"}.get(e["kind"])
                    cid = entry_by_title.get((helper_domain, e["name"]))
                    if cid:
                        entry = by_config_entry.get(cid)
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

                if has_area == want_area and has_labels == want_labels:
                    continue

                bits = []
                if has_area != want_area:
                    bits.append(f"area {has_area!r} -> {want_area!r}")
                if has_labels != want_labels:
                    bits.append(f"labels {has_labels} -> {want_labels}")
                print(f"~ {want_id}: {'; '.join(bits)}")
                changes += 1
                if not dry_run:
                    r = await c.cmd(type="config/entity_registry/update",
                                    entity_id=want_id,
                                    area_id=want_area,
                                    labels=want_labels)
                    if not r.get("success"):
                        print(f"  ! {r.get('error')}", file=sys.stderr)

            # ---- glance toggle ----
            # docs/protocol.md: `glance` is the one region whose presence is
            # not purely a matter of Labels -- it is gated by an HA helper
            # toggle, changeable from a phone, and with it off `entities-right`
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
