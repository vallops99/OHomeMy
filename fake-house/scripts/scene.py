#!/usr/bin/env python3
"""Drive the fake house into a named state, to exercise the dashboard.

The fakes exist so every screen can be built and reviewed before the house is
wired. A scene sets many entities at once, so a UI state that is otherwise
awkward to reach -- a fault, a triggered alarm, an empty night house -- is one
command away.

Scenes:
    sera        evening: most lights on, TV playing, alarm disarmed
    notte       night: everything off, alarm armed, gates locked
    assente     away: alarm armed_away, all lights off
    guasto      three entities unavailable, so the fault state renders
    allarme     alarm triggered and sirens on
    reset       everything back to a calm baseline, all entities available

Usage:
    python fake-house/scripts/scene.py sera --token-from ha-dashboard/.env.development
"""

from __future__ import annotations

import argparse
import asyncio
import pathlib
import sys

import aiohttp
import yaml

HERE = pathlib.Path(__file__).resolve().parent
MANIFEST = HERE.parent / "manifest.yaml"


def read_token_from_env_file(path: pathlib.Path) -> str:
    for line in path.read_text().splitlines():
        line = line.strip()
        if line.startswith("VITE_HA_TOKEN="):
            return line.split("=", 1)[1].strip().strip("'\"")
    raise SystemExit(f"VITE_HA_TOKEN not found in {path}")


def slug(entity_id: str) -> str:
    return entity_id.replace(".", "_")


# Entities driven unavailable by the `guasto` scene. Chosen to span three
# different fake mechanisms (template, universal, switch_as_x) and three Areas.
FAULTY = [
    "light.luce_corridoio",
    "media_player.echo_di_christian",
    "lock.esterno_cancelletto",
]


class House:
    def __init__(self, session, url: str, token: str) -> None:
        self.s = session
        self.url = url
        self.h = {"Authorization": f"Bearer {token}",
                  "Content-Type": "application/json"}
        self.calls = 0

    async def call(self, domain: str, service: str, **data) -> None:
        async with self.s.post(f"{self.url}/api/services/{domain}/{service}",
                               headers=self.h, json=data) as r:
            if r.status >= 400:
                print(f"  ! {domain}.{service} {data}: HTTP {r.status}",
                      file=sys.stderr)
            else:
                self.calls += 1

    async def online(self, entity_id: str, up: bool) -> None:
        await self.call("input_boolean", "turn_on" if up else "turn_off",
                        entity_id=f"input_boolean.fake_online_{slug(entity_id)}")

    async def all_online(self, entities: list[dict]) -> None:
        for e in entities:
            await self.online(e["id"], True)


async def run(url: str, token: str, scene: str) -> int:
    manifest = yaml.safe_load(MANIFEST.read_text())
    entities = manifest["entities"]
    lights = [e["id"] for e in entities if e["kind"] == "light"]
    locks = [e["id"] for e in entities if e["kind"] == "lock"]
    sirens = [e["id"] for e in entities if e["kind"] == "siren"]
    media = [e["id"] for e in entities if e["kind"] == "media_player"]
    alarm = next(e["id"] for e in entities if e["kind"] == "alarm")

    async with aiohttp.ClientSession() as session:
        h = House(session, url, token)

        if scene in ("reset", "sera", "notte", "assente", "allarme"):
            await h.all_online(entities)

        if scene == "sera":
            for lid in lights:
                await h.call("light", "turn_on", entity_id=lid, brightness=180)
            await h.call("media_player", "turn_on",
                         entity_id="media_player.christian_s_lg_webos_2021_tv")
            await h.call("alarm_control_panel", "alarm_disarm", entity_id=alarm)
            for lk in locks:
                await h.call("lock", "lock", entity_id=lk)

        elif scene == "notte":
            for lid in lights:
                await h.call("light", "turn_off", entity_id=lid)
            for m in media:
                await h.call("media_player", "turn_off", entity_id=m)
            await h.call("alarm_control_panel", "alarm_arm_night", entity_id=alarm)
            for lk in locks:
                await h.call("lock", "lock", entity_id=lk)

        elif scene == "assente":
            for lid in lights:
                await h.call("light", "turn_off", entity_id=lid)
            for m in media:
                await h.call("media_player", "turn_off", entity_id=m)
            await h.call("alarm_control_panel", "alarm_arm_away", entity_id=alarm)
            for lk in locks:
                await h.call("lock", "lock", entity_id=lk)

        elif scene == "allarme":
            await h.call("alarm_control_panel", "alarm_trigger", entity_id=alarm)
            for s in sirens:
                await h.call("siren", "turn_on", entity_id=s)
            for lid in lights:
                await h.call("light", "turn_on", entity_id=lid, brightness=255)

        elif scene == "guasto":
            for e in FAULTY:
                await h.online(e, False)

        elif scene == "reset":
            for lid in lights:
                await h.call("light", "turn_off", entity_id=lid)
            for m in media:
                await h.call("media_player", "turn_off", entity_id=m)
            for s in sirens:
                await h.call("siren", "turn_off", entity_id=s)
            for lk in locks:
                await h.call("lock", "lock", entity_id=lk)
            await h.call("alarm_control_panel", "alarm_disarm", entity_id=alarm)

        print(f"scene '{scene}': {h.calls} service call(s)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("scene", choices=["sera", "notte", "assente", "guasto",
                                      "allarme", "reset"])
    ap.add_argument("--url", default="http://localhost:8123")
    ap.add_argument("--token")
    ap.add_argument("--token-from", type=pathlib.Path)
    args = ap.parse_args()

    token = args.token
    if not token and args.token_from:
        token = read_token_from_env_file(args.token_from)
    if not token:
        raise SystemExit("need --token or --token-from")

    return asyncio.run(run(args.url.rstrip("/"), token, args.scene))


if __name__ == "__main__":
    sys.exit(main())
