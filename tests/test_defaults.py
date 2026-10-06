"""Default Dashboards (#57): an admin sets another user's default, and the
system's, through Home Assistant's own frontend storage.

The first test pins that storage. It is internal to the `frontend`
component, so an upgrade of Home Assistant that moves or reshapes it must
fail here, loudly, before it fails on a wall tablet. The others check the
effect through HA's own `frontend/*` commands, as the frontend reads it.
"""

import inspect
from pathlib import Path
from typing import Any

import pytest
from homeassistant.auth.models import User
from homeassistant.components.frontend import storage
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.typing import (
    MockHAClientWebSocket as WsClient,
)
from pytest_homeassistant_custom_component.typing import (
    WebSocketGenerator as ClientFactory,
)

from custom_components.ohomemy.const import DATA_PUBLISHED

from .documents import dashboard


async def test_home_assistants_frontend_storage_still_has_the_shape_we_use(
    hass: HomeAssistant, hass_read_only_user: User
) -> None:
    """If this fails, HA moved the internal API `defaults.py` writes through."""
    assert inspect.iscoroutinefunction(storage.async_user_store)
    assert list(inspect.signature(storage.async_user_store).parameters) == [
        "hass",
        "user_id",
    ]
    assert inspect.iscoroutinefunction(storage.async_system_store)
    assert list(inspect.signature(storage.async_system_store).parameters) == ["hass"]

    for store in (
        await storage.async_user_store(hass, hass_read_only_user.id),
        await storage.async_system_store(hass),
    ):
        assert isinstance(store.data, dict)
        assert inspect.iscoroutinefunction(store.async_set_item)
        assert list(inspect.signature(store.async_set_item).parameters) == [
            "key",
            "value",
        ]
        assert callable(store.async_subscribe)

    # The same store object the websocket's `frontend/*_user_data` use.
    assert await storage.async_user_store(
        hass, hass_read_only_user.id
    ) is await storage.async_user_store(hass, hass_read_only_user.id)


@pytest.fixture
async def ohomemy(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    assert await async_setup_component(hass, "ohomemy", {})
    published = hass.data[DATA_PUBLISHED]
    await published.async_publish(
        {"dashboards": [dashboard("wall"), dashboard("phone")]}, 0, None
    )


@pytest.fixture
async def admin(hass_ws_client: ClientFactory, ohomemy: None) -> WsClient:
    return await hass_ws_client()


@pytest.fixture
async def wall_tablet(
    hass: HomeAssistant,
    hass_ws_client: ClientFactory,
    hass_read_only_access_token: str,
    ohomemy: None,
) -> WsClient:
    """A non-admin user, as a wall tablet logs in."""
    return await hass_ws_client(hass, hass_read_only_access_token)


async def call(client: WsClient, type: str, **fields: Any) -> dict[str, Any]:
    await client.send_json_auto_id({"type": type, **fields})
    return await client.receive_json()


async def subscribe(client: WsClient, type: str, **fields: Any) -> tuple[int, Any]:
    """Subscribe; return its id and its first event, whichever HA sends first."""
    await client.send_json_auto_id({"type": type, **fields})
    replies = {m["type"]: m for m in [await client.receive_json() for _ in "12"]}
    assert replies["result"]["success"], replies
    return replies["result"]["id"], replies["event"]["event"]


async def set_user(
    client: WsClient, user_id: str, dashboard_id: str | None
) -> dict[str, Any]:
    return await call(
        client, "ohomemy/defaults/set_user", user_id=user_id, dashboard_id=dashboard_id
    )


async def test_an_admin_sets_a_users_default_keeping_the_rest_of_core(
    admin: WsClient, wall_tablet: WsClient, hass_read_only_user: User
) -> None:
    # The tablet's own frontend wrote something else into `core` first.
    await call(
        wall_tablet, "frontend/set_user_data", key="core", value={"showAdvanced": True}
    )

    result = await set_user(admin, hass_read_only_user.id, "wall")
    assert result["success"], result
    assert result["result"] == {"default_panel": "ohomemy-wall"}

    # As the tablet's frontend reads it.
    result = await call(wall_tablet, "frontend/get_user_data", key="core")
    assert result["result"]["value"] == {
        "showAdvanced": True,
        "default_panel": "ohomemy-wall",
    }

    result = await set_user(admin, hass_read_only_user.id, None)
    assert result["success"], result
    result = await call(wall_tablet, "frontend/get_user_data", key="core")
    assert result["result"]["value"] == {"showAdvanced": True}


async def test_the_users_open_frontend_hears_the_change(
    admin: WsClient, wall_tablet: WsClient, hass_read_only_user: User
) -> None:
    """HA's frontend subscribes to `core`, which is how an open browser switches."""
    sub, first = await subscribe(wall_tablet, "frontend/subscribe_user_data", key="core")
    assert first == {"value": None}

    await set_user(admin, hass_read_only_user.id, "phone")

    event = await wall_tablet.receive_json()
    assert event["id"] == sub
    assert event["event"] == {"value": {"default_panel": "ohomemy-phone"}}


async def test_an_admin_sets_the_system_default_keeping_the_rest_of_core(
    admin: WsClient,
) -> None:
    await call(admin, "frontend/set_system_data", key="core", value={"onboarded": 1})

    result = await call(admin, "ohomemy/defaults/set_system", dashboard_id="wall")
    assert result["success"], result
    result = await call(admin, "frontend/get_system_data", key="core")
    assert result["result"]["value"] == {"onboarded": 1, "default_panel": "ohomemy-wall"}

    await call(admin, "ohomemy/defaults/set_system", dashboard_id=None)
    result = await call(admin, "frontend/get_system_data", key="core")
    assert result["result"]["value"] == {"onboarded": 1}


@pytest.mark.parametrize(
    ("type", "fields"),
    [
        ("ohomemy/defaults/subscribe", {}),
        ("ohomemy/defaults/set_user", {"user_id": "x", "dashboard_id": "wall"}),
        ("ohomemy/defaults/set_system", {"dashboard_id": "wall"}),
    ],
)
async def test_a_non_admin_may_not_read_or_set_defaults(
    wall_tablet: WsClient, type: str, fields: dict[str, Any]
) -> None:
    result = await call(wall_tablet, type, **fields)
    assert not result["success"]
    assert result["error"]["code"] == "unauthorized"


async def test_only_a_published_dashboard_can_be_a_default(
    admin: WsClient, hass_read_only_user: User
) -> None:
    result = await set_user(admin, hass_read_only_user.id, "only-in-a-draft")
    assert result["error"]["code"] == "unknown_dashboard"
    result = await call(admin, "ohomemy/defaults/set_system", dashboard_id="nope")
    assert result["error"]["code"] == "unknown_dashboard"


async def test_only_a_person_has_a_default(
    hass: HomeAssistant, admin: WsClient
) -> None:
    result = await set_user(admin, "no-such-user", "wall")
    assert result["error"]["code"] == "not_found"

    system = await hass.auth.async_create_system_user("Supervisor-ish")
    result = await set_user(admin, system.id, "wall")
    assert result["error"]["code"] == "not_found"


async def test_subscribe_lists_people_and_follows_their_defaults(
    hass: HomeAssistant,
    admin: WsClient,
    wall_tablet: WsClient,
    hass_admin_user: User,
    hass_read_only_user: User,
) -> None:
    await hass.auth.async_create_system_user("Not a person")
    sub, first = await subscribe(admin, "ohomemy/defaults/subscribe")
    users = {u["id"]: u for u in first["users"]}
    assert first["system"] is None
    assert hass_read_only_user.id in users
    assert hass_admin_user.id in users
    assert all(u["name"] != "Not a person" for u in users.values())
    assert users[hass_read_only_user.id]["default_panel"] is None
    assert users[hass_read_only_user.id]["is_admin"] is False

    # A change the user makes in their own profile shows too.
    await call(
        wall_tablet,
        "frontend/set_user_data",
        key="core",
        value={"default_panel": "lovelace"},
    )
    event = await admin.receive_json()
    assert event["id"] == sub
    users = {u["id"]: u for u in event["event"]["users"]}
    assert users[hass_read_only_user.id]["default_panel"] == "lovelace"


async def test_publishing_without_a_dashboard_clears_the_defaults_naming_it(
    hass: HomeAssistant,
    admin: WsClient,
    hass_admin_user: User,
    hass_read_only_user: User,
) -> None:
    await set_user(admin, hass_read_only_user.id, "wall")
    await set_user(admin, hass_admin_user.id, "phone")
    await call(admin, "ohomemy/defaults/set_system", dashboard_id="wall")

    # Wall is deleted, and a new Dashboard takes its slug in the same Publish:
    # it is still not the Dashboard anyone chose.
    published = hass.data[DATA_PUBLISHED]
    await published.async_publish(
        {"dashboards": [dashboard("phone"), dashboard("wall2", slug="wall")]},
        published.revision,
        None,
    )
    await hass.async_block_till_done()

    tablet = await storage.async_user_store(hass, hass_read_only_user.id)
    assert "default_panel" not in tablet.data["core"]
    me = await storage.async_user_store(hass, hass_admin_user.id)
    assert me.data["core"]["default_panel"] == "ohomemy-phone"
    system = await storage.async_system_store(hass)
    assert "default_panel" not in system.data["core"]
