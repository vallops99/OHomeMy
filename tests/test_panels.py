"""One panel per Dashboard: registered on setup, kept in step with every
Publish, removed on unload."""

from pathlib import Path
from typing import Any

from homeassistant.components import frontend
from homeassistant.components.frontend import DATA_PANELS, EVENT_PANELS_UPDATED
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_capture_events,
)

from custom_components.ohomemy.const import DATA_PUBLISHED, DOMAIN

from .documents import dashboard

ENTRY_URL = "/ohomemy_static/ohomemy-dashboard/ohomemy-dashboard.js"


async def add_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, title="OHomeMy")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def publish(hass: HomeAssistant, *dashboards: dict[str, Any]) -> None:
    published = hass.data[DATA_PUBLISHED]
    await published.async_publish(
        {"dashboards": list(dashboards)}, published.revision, None
    )
    await hass.async_block_till_done()


def ours(hass: HomeAssistant) -> dict[str, Any]:
    return {
        url: panel
        for url, panel in hass.data.get(DATA_PANELS, {}).items()
        if url.startswith("ohomemy-")
    }


async def test_setup_registers_a_panel_per_stored_dashboard(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    hass_storage["ohomemy.document"] = {
        "version": 1,
        "minor_version": 1,
        "key": "ohomemy.document",
        "data": {
            "revision": 3,
            "document": {
                "dashboards": [
                    dashboard("wall", name="Wall tablet"),
                    dashboard("phone", slug="my-phone", show_in_sidebar=False),
                ]
            },
        },
    }
    await add_entry(hass)

    assert ours(hass).keys() == {"ohomemy-wall", "ohomemy-my-phone"}
    wall = ours(hass)["ohomemy-wall"]
    assert wall.component_name == "custom"
    assert wall.sidebar_title == "Wall tablet"
    assert wall.sidebar_icon == "mdi:home-variant-outline"
    assert wall.require_admin is False
    assert wall.show_in_sidebar is True
    # Only the id: anything else in `config` would recreate the element
    # whenever it changed.
    assert wall.config.keys() == {"dashboard_id", "_panel_custom"}
    assert wall.config["dashboard_id"] == "wall"
    custom = wall.config["_panel_custom"]
    assert custom["name"] == "ohomemy-dashboard"
    assert custom["embed_iframe"] is False
    assert custom["module_url"].startswith(f"{ENTRY_URL}?v=")

    phone = ours(hass)["ohomemy-my-phone"]
    assert phone.config["dashboard_id"] == "phone"
    assert phone.show_in_sidebar is False


async def test_nothing_stored_registers_no_panel(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    await add_entry(hass)
    assert ours(hass) == {}


async def test_a_published_dashboard_gets_its_panel(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    await add_entry(hass)

    await publish(hass, dashboard("wall"))

    assert ours(hass).keys() == {"ohomemy-wall"}


async def test_a_rename_keeps_the_url_and_changes_the_title(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    await add_entry(hass)
    await publish(hass, dashboard("wall", name="Wall"))

    await publish(hass, dashboard("wall", name="Kitchen wall"))

    assert ours(hass).keys() == {"ohomemy-wall"}
    assert ours(hass)["ohomemy-wall"].sidebar_title == "Kitchen wall"


async def test_hiding_from_the_sidebar_keeps_the_panel(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    await add_entry(hass)
    await publish(hass, dashboard("wall"))

    await publish(hass, dashboard("wall", show_in_sidebar=False))

    assert ours(hass)["ohomemy-wall"].show_in_sidebar is False


async def test_a_deleted_dashboard_loses_its_panel(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    await add_entry(hass)
    await publish(hass, dashboard("wall"), dashboard("phone"))

    await publish(hass, dashboard("phone"))

    assert ours(hass).keys() == {"ohomemy-phone"}


async def test_a_new_dashboard_may_take_a_deleted_ones_slug(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    await add_entry(hass)
    await publish(hass, dashboard("wall"))

    await publish(hass, dashboard("wall2", slug="wall"))

    assert ours(hass)["ohomemy-wall"].config["dashboard_id"] == "wall2"


async def test_an_unchanged_panel_is_left_alone(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    """Changing a panel's info recreates its element in every open browser,
    so a Publish that only moves Widgets must not touch the panel."""
    await add_entry(hass)
    await publish(hass, dashboard("wall"), dashboard("phone"))
    before = ours(hass)
    events = async_capture_events(hass, EVENT_PANELS_UPDATED)

    calmer = dashboard()["settings"] | {"idle_return": 30}
    await publish(hass, dashboard("wall", settings=calmer), dashboard("phone"))
    assert events == []
    assert ours(hass)["ohomemy-wall"] is before["ohomemy-wall"]

    await publish(hass, dashboard("wall", name="Renamed"), dashboard("phone"))
    assert len(events) == 1
    assert ours(hass)["ohomemy-phone"] is before["ohomemy-phone"]


async def test_unloading_removes_every_panel_and_stops_listening(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    entry = await add_entry(hass)
    await publish(hass, dashboard("wall"), dashboard("phone"))

    await hass.config_entries.async_unload(entry.entry_id)
    assert ours(hass) == {}

    # The document outlives the entry; a Publish while unloaded adds nothing.
    await publish(hass, dashboard("wall"))
    assert ours(hass) == {}

    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert ours(hass).keys() == {"ohomemy-wall"}


async def test_a_panel_owned_by_someone_else_is_not_taken(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    await add_entry(hass)
    frontend.async_register_built_in_panel(
        hass, "iframe", frontend_url_path="ohomemy-wall"
    )

    await publish(hass, dashboard("wall"), dashboard("phone"))

    assert ours(hass)["ohomemy-wall"].component_name == "iframe"
    assert "ohomemy-phone" in ours(hass)
