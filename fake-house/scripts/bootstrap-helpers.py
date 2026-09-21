#!/usr/bin/env python3
"""Create config entries for the two fake domains that have no YAML form.

Home Assistant 2026.9 offers no YAML schema for:

  * `generic` camera   -- the three EZVIZ camera fakes
  * `switch_as_x`      -- turns a template switch into a real `siren.*` entity,
                          because the entity registry refuses to rename an
                          entity across domains

Both are config-flow-only helpers, but a config entry is just JSON in
`.storage/core.config_entries`, and unlike registry entries it is
self-contained. This script writes those entries directly.

Home Assistant must be STOPPED while this runs; it rewrites `.storage`.

Usage:
    docker stop ha-local
    python fake-house/scripts/bootstrap-helpers.py --config-dir /path/to/config
    docker start ha-local
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import random
import string
import sys

import yaml

HERE = pathlib.Path(__file__).resolve().parent
MANIFEST = HERE.parent / "manifest.yaml"

# Marks entries this script owns, so re-running replaces rather than duplicates.
MARKER = "fake-house"

CAMERA_IMAGE = "http://127.0.0.1:8123/local/fake-camera.jpg"


def ulid() -> str:
    """A ULID-shaped id; HA only requires uniqueness."""
    alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
    return "".join(random.choice(alphabet) for _ in range(26))


def slug(entity_id: str) -> str:
    return entity_id.replace(".", "_")


def now() -> str:
    return dt.datetime.now(dt.UTC).isoformat()


def entry(domain: str, title: str, data: dict, options: dict,
          unique_id: str | None) -> dict:
    return {
        "created_at": now(),
        "data": data,
        "disabled_by": None,
        "discovery_keys": {},
        "domain": domain,
        "entry_id": ulid(),
        "minor_version": 1,
        "modified_at": now(),
        "options": options,
        "pref_disable_new_entities": False,
        "pref_disable_polling": False,
        "source": "user",
        "subentries": [],
        "title": title,
        "unique_id": unique_id,
        "version": 1,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config-dir", required=True, type=pathlib.Path)
    ap.add_argument("--remove", action="store_true",
                    help="remove entries this script created and exit")
    args = ap.parse_args()

    store = args.config_dir / ".storage" / "core.config_entries"
    if not store.is_file():
        raise SystemExit(f"not found: {store}")

    if (args.config_dir / ".HA_VERSION").exists() and \
            (args.config_dir / "home-assistant_v2.db-wal").exists():
        print("note: Home Assistant may still be running -- stop it first.",
              file=sys.stderr)

    blob = json.loads(store.read_text())
    entries = blob["data"]["entries"]

    # Drop anything we previously created, so this is idempotent.
    before = len(entries)
    entries = [e for e in entries
               if not (e.get("unique_id") or "").startswith(MARKER)]
    removed = before - len(entries)

    if args.remove:
        blob["data"]["entries"] = entries
        store.write_text(json.dumps(blob, indent=2))
        print(f"removed {removed} fake-house config entry(ies)")
        return 0

    manifest = yaml.safe_load(MANIFEST.read_text())
    added = 0

    for e in manifest["entities"]:
        if e["kind"] == "camera":
            entries.append(entry(
                "generic",
                e["name"],
                {},
                {
                    "still_image_url": CAMERA_IMAGE,
                    "content_type": "image/jpeg",
                    "framerate": 2,
                    "verify_ssl": False,
                    "limit_refetch_to_url_change": False,
                },
                f"{MARKER}:{slug(e['id'])}",
            ))
            added += 1
        elif e["kind"] == "siren":
            # The generated template switch keeps the manifest name; wrap it.
            entries.append(entry(
                "switch_as_x",
                e["name"],
                {},
                {
                    "entity_id": f"switch.{slug(e['id'])}_src",
                    "invert": False,
                    "target_domain": "siren",
                },
                f"{MARKER}:{slug(e['id'])}",
            ))
            added += 1

    blob["data"]["entries"] = entries
    store.write_text(json.dumps(blob, indent=2))
    print(f"replaced {removed} and wrote {added} config entry(ies) into {store}")
    print("Start Home Assistant, then run apply-registry.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
