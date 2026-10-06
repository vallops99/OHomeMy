"""The document's websocket commands: who may call them, and what they send."""

from pathlib import Path
from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.typing import (
    MockHAClientWebSocket as WsClient,
)
from pytest_homeassistant_custom_component.typing import (
    WebSocketGenerator as ClientFactory,
)

from .documents import dashboard, house


@pytest.fixture
async def ohomemy(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    assert await async_setup_component(hass, "ohomemy", {})


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
    await client.send_json_auto_id({"type": f"ohomemy/document/{type}", **fields})
    return await client.receive_json()


async def subscribe(client: WsClient) -> dict[str, Any]:
    """Subscribe, and return the first event: the document as it is now."""
    result = await call(client, "subscribe")
    assert result["success"], result
    event = await client.receive_json()
    assert event["type"] == "event"
    assert event["id"] == result["id"]
    return event


async def test_any_user_can_get_the_document(wall_tablet: WsClient) -> None:
    result = await call(wall_tablet, "get")
    assert result["success"]
    assert result["result"] == {"revision": 0, "document": {"dashboards": []}}


async def test_an_admin_saves_and_gets_the_new_revision(admin: WsClient) -> None:
    result = await call(admin, "save", base_revision=0, document=house())
    assert result["success"], result
    assert result["result"] == {"revision": 1}

    result = await call(admin, "get")
    assert result["result"] == {"revision": 1, "document": house()}


@pytest.mark.parametrize("command", ["save", "import", "history", "export"])
async def test_a_non_admin_may_not_write_or_read_history(
    wall_tablet: WsClient, command: str
) -> None:
    result = await call(
        wall_tablet,
        command,
        base_revision=0,
        document=house(),
        data={"version": 1, "minor_version": 1, "revision": 0, "document": house()},
    )
    assert not result["success"]
    assert result["error"]["code"] == "unauthorized"

    result = await call(wall_tablet, "get")
    assert result["result"]["revision"] == 0


async def test_a_stale_save_is_refused_with_conflict(admin: WsClient) -> None:
    await call(admin, "save", base_revision=0, document=house())

    result = await call(admin, "save", base_revision=0, document={"dashboards": []})
    assert not result["success"]
    assert result["error"]["code"] == "conflict"

    result = await call(admin, "get")
    assert result["result"]["document"] == house()


async def test_an_invalid_document_is_refused_naming_where(admin: WsClient) -> None:
    doc = house()
    doc["dashboards"][0]["home_page"] = "nowhere"
    result = await call(admin, "save", base_revision=0, document=doc)
    assert not result["success"]
    assert result["error"]["code"] == "invalid_document"
    assert result["error"]["message"].startswith("dashboards[0].home_page:")


@pytest.mark.parametrize(
    "fields", [{}, {"base_revision": "0"}, {"base_revision": True}]
)
async def test_a_save_without_an_integer_base_revision_is_refused(
    admin: WsClient, fields: dict[str, Any]
) -> None:
    result = await call(admin, "save", document=house(), **fields)
    assert not result["success"]
    assert result["error"]["code"] == "invalid_format"


async def test_subscribers_see_each_others_saves(
    admin: WsClient, wall_tablet: WsClient, hass_ws_client: ClientFactory
) -> None:
    builder = await hass_ws_client()
    for client in (admin, wall_tablet, builder):
        event = await subscribe(client)
        assert event["event"] == {"revision": 0, "document": {"dashboards": []}}

    await builder.send_json_auto_id(
        {"type": "ohomemy/document/save", "base_revision": 0, "document": house()}
    )
    # The saving Builder hears its own Publish too, before or after its result.
    replies = [await builder.receive_json(), await builder.receive_json()]
    assert {r["type"] for r in replies} == {"result", "event"}

    for client in (admin, wall_tablet):
        event = await client.receive_json()
        assert event["type"] == "event"
        assert event["event"] == {"revision": 1, "document": house()}


async def test_an_unsubscribed_client_hears_nothing_more(
    admin: WsClient, wall_tablet: WsClient
) -> None:
    subscription = (await subscribe(wall_tablet))["id"]
    await wall_tablet.send_json_auto_id(
        {"type": "unsubscribe_events", "subscription": subscription}
    )
    assert (await wall_tablet.receive_json())["success"]

    await call(admin, "save", base_revision=0, document=house())

    # The next message is the answer to `get`, not an event.
    result = await call(wall_tablet, "get")
    assert result["type"] == "result"
    assert result["result"]["revision"] == 1


async def test_history_lists_publishes_newest_first(admin: WsClient) -> None:
    await call(admin, "save", base_revision=0, document=house())
    await call(admin, "save", base_revision=1, document={"dashboards": [dashboard()]})

    result = await call(admin, "history")
    history = result["result"]["history"]
    assert [h["revision"] for h in history] == [2, 1]
    assert history[1]["document"] == house()
    assert history[0]["user_id"]


async def test_export_then_import_restores_a_document(admin: WsClient) -> None:
    await call(admin, "save", base_revision=0, document=house())
    exported = (await call(admin, "export"))["result"]
    await call(admin, "save", base_revision=1, document={"dashboards": []})

    result = await call(admin, "import", base_revision=2, data=exported)
    assert result["result"] == {"revision": 3}
    assert (await call(admin, "get"))["result"]["document"] == house()


async def test_an_import_from_a_newer_ohomemy_is_refused(admin: WsClient) -> None:
    result = await call(
        admin,
        "import",
        base_revision=0,
        data={"version": 99, "minor_version": 1, "revision": 1, "document": {}},
    )
    assert result["error"]["code"] == "unsupported_version"
