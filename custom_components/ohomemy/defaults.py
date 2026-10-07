"""Default Dashboards: which Dashboard each Home Assistant user lands on (#57).

Home Assistant keeps a user's default panel in that user's frontend data, as
`default_panel` inside the `core` item, and a system-wide one, for everyone
without their own, in the frontend's system data. Its own pickers list only
built-in and Lovelace dashboards, and `frontend/set_user_data` only writes
the calling user's data, so an admin cannot give another user an OHomeMy
Dashboard from HA's UI (docs/research/layout-storage.md §7.3, §7.4).

The integration writes those same stores from Python, through the frontend
component's `storage.async_user_store` and `storage.async_system_store`: the
very stores `frontend/set_user_data` and `frontend/set_system_data` write.
A write notifies the frontend's own subscriptions, so the user's open
browsers switch live. Neither helper is public API; `tests/test_defaults.py`
pins both, and if they move these commands answer `unavailable` instead of
the integration failing to load.

`core` also holds the frontend's onboarding and survey keys, so every write
merges into it and touches `default_panel` alone.

| command                        | who   | does                                       |
|--------------------------------|-------|--------------------------------------------|
| `ohomemy/defaults/subscribe`   | admin | an event `{system, users}` now and after   |
|                                |       | any default or user changes                |
| `ohomemy/defaults/set_user`    | admin | `{user_id, dashboard_id \\| null}`          |
| `ohomemy/defaults/set_system`  | admin | `{dashboard_id \\| null}`                   |

`null` clears the default: a user falls back to the system default, and the
system to Home Assistant's own (`home`).

When a Publish deletes a Dashboard, every default pointing at its panel is
cleared. Left alone, HA would send those users to `home`, not to the system
default (its fallback is per panel lookup, not per level), and a later
Dashboard given the same slug would silently become their default.

Undo gives them back (#67). The Publish's history entry records, under
`cleared_defaults`, whose defaults it cleared: `{dashboard_id: {users,
system}}`. A later Publish in which that Dashboard reappears, by id (an undo,
a restore, an import), sets them again at its panel as that document names
it, but only where they are still unset: a default chosen since wins, and a
user removed since is skipped. The newest record for a Dashboard wins, and a
record lasts as long as its history entry.

Both run inside the Publish, before its history entry is saved, so the
record is on disk by the time the Publish is acknowledged.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any, Protocol

from homeassistant.auth.models import User
from homeassistant.components import websocket_api
from homeassistant.core import Event, HomeAssistant, callback

from .const import DATA_PUBLISHED
from .panels import URL_PREFIX
from .store import Published
from .websocket import async_register_under

_LOGGER = logging.getLogger(__name__)

CORE = "core"
DEFAULT_PANEL = "default_panel"
# On a Publish's history entry: whose defaults it cleared, by Dashboard id.
CLEARED = "cleared_defaults"

ERR_UNAVAILABLE = "unavailable"
ERR_UNKNOWN_DASHBOARD = "unknown_dashboard"

# Fired by `homeassistant.auth` when a user is added, changed or removed.
USER_EVENTS = ("user_added", "user_updated", "user_removed")


class FrontendStore(Protocol):
    """What this module needs of HA's `UserStore` and `SystemStore`."""

    data: dict[str, Any]

    async def async_set_item(self, key: str, value: Any) -> None: ...

    def async_subscribe(
        self, key: str, on_update_callback: Callable[[], None]
    ) -> Callable[[], None]: ...


class Unavailable(Exception):
    """Home Assistant no longer has the frontend storage this relies on."""


def _storage() -> Any:
    # Imported on use, not at load: if HA moves it, only these commands fail.
    try:
        from homeassistant.components.frontend import storage  # noqa: PLC0415
    except ImportError as err:
        raise Unavailable(str(err)) from err
    if not all(
        hasattr(storage, name) for name in ("async_user_store", "async_system_store")
    ):
        raise Unavailable("homeassistant.components.frontend.storage has changed")
    return storage


async def async_user_store(hass: HomeAssistant, user_id: str) -> FrontendStore:
    """The user's frontend data: what `frontend/set_user_data` writes."""
    return await _storage().async_user_store(hass, user_id)


async def async_system_store(hass: HomeAssistant) -> FrontendStore:
    """The frontend's system data: what `frontend/set_system_data` writes."""
    return await _storage().async_system_store(hass)


def default_of(store: FrontendStore) -> str | None:
    """The panel URL path a store holds as its default, if any."""
    core = store.data.get(CORE)
    value = core.get(DEFAULT_PANEL) if isinstance(core, dict) else None
    return value if isinstance(value, str) and value else None


async def async_set_default(store: FrontendStore, url_path: str | None) -> None:
    """Set or (`None`) clear `default_panel`, keeping the rest of `core`."""
    core = store.data.get(CORE)
    core = dict(core) if isinstance(core, dict) else {}
    if url_path is None:
        if DEFAULT_PANEL not in core:
            return
        del core[DEFAULT_PANEL]
    else:
        core[DEFAULT_PANEL] = url_path
    await store.async_set_item(CORE, core)


async def async_people(hass: HomeAssistant) -> list[User]:
    """The users a person logs in as. HA's own system users are not."""
    users = await hass.auth.async_get_users()
    return sorted(
        (u for u in users if not u.system_generated),
        key=lambda u: ((u.name or "").casefold(), u.id),
    )


async def async_state(hass: HomeAssistant) -> dict[str, Any]:
    """`{system, users}`: every default, as the panel URL path it names."""
    system = await async_system_store(hass)
    users = []
    for user in await async_people(hass):
        store = await async_user_store(hass, user.id)
        users.append(
            {
                "id": user.id,
                "name": user.name,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
                "default_panel": default_of(store),
            }
        )
    return {"system": default_of(system), "users": users}


def url_paths(document: dict[str, Any]) -> dict[str, str]:
    """Each Dashboard's panel URL path, by Dashboard id."""
    return {d["id"]: f"{URL_PREFIX}{d['slug']}" for d in document["dashboards"]}


async def async_clear(
    hass: HomeAssistant, gone: dict[str, str]
) -> dict[str, dict[str, Any]]:
    """Clear every default, user or system, naming a panel in `gone` (panel
    URL path by Dashboard id). Return whose, as `{dashboard_id: {users,
    system}}`, leaving out a Dashboard that was nobody's."""
    ids = {path: id for id, path in gone.items()}
    cleared: dict[str, dict[str, Any]] = {}

    def named(store: FrontendStore) -> dict[str, Any] | None:
        id = ids.get(default_of(store) or "")
        if id is None:
            return None
        return cleared.setdefault(id, {"users": [], "system": False})

    system = await async_system_store(hass)
    if (record := named(system)) is not None:
        await async_set_default(system, None)
        record["system"] = True
    for user in await async_people(hass):
        store = await async_user_store(hass, user.id)
        if (record := named(store)) is not None:
            await async_set_default(store, None)
            record["users"].append(user.id)
    _LOGGER.debug("Cleared the defaults naming %s", ", ".join(sorted(ids)))
    return cleared


async def async_restore(
    hass: HomeAssistant, history: list[dict[str, Any]], back: dict[str, str]
) -> None:
    """Give back the defaults recorded for each Dashboard in `back` (its panel
    URL path now, by Dashboard id), where they are still unset."""
    for id, url_path in back.items():
        # History is newest first, so the first record is the newest.
        record = next(
            (e[CLEARED][id] for e in history if id in e.get(CLEARED, {})), None
        )
        if record is None:
            continue
        stores = [await async_system_store(hass)] if record["system"] else []
        for user_id in record["users"]:
            user = await hass.auth.async_get_user(user_id)
            if user is not None and not user.system_generated:
                stores.append(await async_user_store(hass, user.id))
        for store in stores:
            if default_of(store) is None:
                await async_set_default(store, url_path)
        _LOGGER.debug("Restored the defaults naming %s", url_path)


@callback
def async_follow_publishes(hass: HomeAssistant, published: Published) -> None:
    """In each Publish, clear the defaults of the Dashboards it deletes and
    restore those of the Dashboards it brings back."""

    async def record(
        before: dict[str, Any], after: dict[str, Any]
    ) -> dict[str, Any]:
        was, now = url_paths(before), url_paths(after)
        # By id, not by path: a Dashboard deleted while a new one takes its
        # slug in the same Publish is still a different Dashboard.
        gone = {id: path for id, path in was.items() if id not in now}
        back = {id: path for id, path in now.items() if id not in was}
        if not gone and not back:
            return {}
        try:
            # Clearing first, so a default this Publish clears is unset
            # again for a Dashboard it brings back.
            cleared = await async_clear(hass, gone) if gone else {}
            if back:
                await async_restore(hass, published.history, back)
        except Unavailable as err:
            # The Publish stands; only its defaults are left as they were.
            _LOGGER.warning("Default Dashboards were not followed: %s", err)
            return {}
        return {CLEARED: cleared} if cleared else {}

    published.async_record(record)


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    """Register the commands, once for the life of Home Assistant."""
    async_register_under(
        hass,
        "ohomemy/defaults",
        {
            "subscribe": ws_subscribe,
            "set_user": ws_set_user,
            "set_system": ws_set_system,
        },
    )


@websocket_api.require_admin
@websocket_api.async_response
async def ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    msg_id = msg["id"]
    unsubs: list[Callable[[], None]] = []

    def unsubscribe_stores() -> None:
        while unsubs:
            unsubs.pop()()

    async def watch_and_send() -> None:
        # Each store is watched for `core`, which a user's own profile also
        # writes, so the Builder never shows a stale default.
        unsubscribe_stores()
        stores = [await async_system_store(hass)]
        stores += [await async_user_store(hass, u.id) for u in await async_people(hass)]
        unsubs.extend(store.async_subscribe(CORE, changed) for store in stores)
        await send()

    async def send() -> None:
        connection.send_message(
            websocket_api.event_message(msg_id, await async_state(hass))
        )

    @callback
    def changed() -> None:
        hass.async_create_task(send(), eager_start=False)

    @callback
    def users_changed(_event: Event) -> None:
        hass.async_create_task(watch_and_send(), eager_start=False)

    try:
        await watch_and_send()
    except Unavailable as err:
        unsubscribe_stores()
        connection.send_error(msg_id, ERR_UNAVAILABLE, str(err))
        return
    unsubs_bus = [hass.bus.async_listen(e, users_changed) for e in USER_EVENTS]

    @callback
    def unsubscribe() -> None:
        unsubscribe_stores()
        for unsub in unsubs_bus:
            unsub()

    connection.subscriptions[msg_id] = unsubscribe
    connection.send_result(msg_id)


@websocket_api.require_admin
@websocket_api.async_response
async def ws_set_user(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    user_id = msg.get("user_id")
    user = await hass.auth.async_get_user(user_id) if isinstance(user_id, str) else None
    if user is None or user.system_generated:
        connection.send_error(
            msg["id"], websocket_api.ERR_NOT_FOUND, f"No user {user_id!r}"
        )
        return
    await _set(hass, connection, msg, lambda: async_user_store(hass, user.id))


@websocket_api.require_admin
@websocket_api.async_response
async def ws_set_system(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    await _set(hass, connection, msg, lambda: async_system_store(hass))


async def _set(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    store: Callable[[], Any],
) -> None:
    """Point a default at `msg["dashboard_id"]`'s panel, or clear it on `null`.

    Only a published Dashboard has a panel to land on, so one that exists
    only in a Draft is refused.
    """
    dashboard_id = msg.get("dashboard_id")
    url_path = None
    if dashboard_id is not None:
        url_path = url_paths(hass.data[DATA_PUBLISHED].document).get(dashboard_id)
        if url_path is None:
            connection.send_error(
                msg["id"],
                ERR_UNKNOWN_DASHBOARD,
                f"No published Dashboard {dashboard_id!r}",
            )
            return
    try:
        await async_set_default(await store(), url_path)
    except Unavailable as err:
        connection.send_error(msg["id"], ERR_UNAVAILABLE, str(err))
        return
    connection.send_result(msg["id"], {"default_panel": url_path})

