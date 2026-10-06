"""The Popup's entities: `select.ohomemy_popup` and its activity button.

The select's options come from the document and follow every Publish, and an
open Popup survives a restart (ADR-0009) unless no Dashboard defines it any
more.
"""

from pathlib import Path
from typing import Any

import pytest
from homeassistant.core import HomeAssistant, State
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    mock_restore_cache,
)

from custom_components.ohomemy.const import DATA_PUBLISHED, DOMAIN

from .documents import dashboard, page

SELECT = "select.ohomemy_popup"
BUTTON = "button.ohomemy_popup_activity"


def popups(*names: str, id: str = "wall") -> dict[str, Any]:
    """A Dashboard laying out a Page for each Popup name."""
    return dashboard(
        id,
        pages=[page(), *(page(f"p-{name}", popup=name) for name in names)],
    )


def store(hass_storage: dict[str, Any], *dashboards: dict[str, Any]) -> None:
    hass_storage["ohomemy.document"] = {
        "version": 1,
        "minor_version": 1,
        "key": "ohomemy.document",
        "data": {"revision": 1, "document": {"dashboards": list(dashboards)}},
    }


async def add_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, title="OHomeMy")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def select(hass: HomeAssistant, option: str) -> None:
    await hass.services.async_call(
        "select",
        "select_option",
        {"entity_id": SELECT, "option": option},
        blocking=True,
    )


async def test_options_are_every_popup_name_once_sorted_after_none(
    hass: HomeAssistant, built: Path, hass_storage: dict[str, Any]
) -> None:
    store(
        hass_storage,
        popups("doorbell", "alarm"),
        popups("doorbell", "gate", id="phone"),
    )
    await add_entry(hass)

    state = hass.states.get(SELECT)
    assert state.state == "none"
    assert state.attributes["options"] == ["none", "alarm", "doorbell", "gate"]


async def test_no_popups_leaves_only_none(
    hass: HomeAssistant, built: Path, hass_storage: dict[str, Any]
) -> None:
    await add_entry(hass)
    assert hass.states.get(SELECT).attributes["options"] == ["none"]


async def test_selecting_opens_and_none_closes(
    hass: HomeAssistant, built: Path, hass_storage: dict[str, Any]
) -> None:
    store(hass_storage, popups("doorbell"))
    await add_entry(hass)

    await select(hass, "doorbell")
    assert hass.states.get(SELECT).state == "doorbell"
    await select(hass, "none")
    assert hass.states.get(SELECT).state == "none"


async def test_options_follow_a_publish(
    hass: HomeAssistant, built: Path, hass_storage: dict[str, Any]
) -> None:
    store(hass_storage, popups("doorbell"))
    await add_entry(hass)
    published = hass.data[DATA_PUBLISHED]

    await published.async_publish(
        {"dashboards": [popups("doorbell", "gate")]}, 1, None
    )
    await hass.async_block_till_done()
    assert hass.states.get(SELECT).attributes["options"] == [
        "none",
        "doorbell",
        "gate",
    ]


async def test_a_publish_removing_the_open_popup_closes_it(
    hass: HomeAssistant, built: Path, hass_storage: dict[str, Any]
) -> None:
    store(hass_storage, popups("doorbell", "gate"))
    await add_entry(hass)
    published = hass.data[DATA_PUBLISHED]

    await select(hass, "gate")
    await published.async_publish({"dashboards": [popups("gate", "alarm")]}, 1, None)
    await hass.async_block_till_done()
    assert hass.states.get(SELECT).state == "gate"

    await published.async_publish({"dashboards": [popups("alarm")]}, 2, None)
    await hass.async_block_till_done()
    assert hass.states.get(SELECT).state == "none"


async def test_an_open_popup_survives_a_restart(
    hass: HomeAssistant, built: Path, hass_storage: dict[str, Any]
) -> None:
    store(hass_storage, popups("doorbell"))
    mock_restore_cache(hass, [State(SELECT, "doorbell")])
    await add_entry(hass)
    assert hass.states.get(SELECT).state == "doorbell"


async def test_a_restored_popup_no_dashboard_defines_is_closed(
    hass: HomeAssistant, built: Path, hass_storage: dict[str, Any]
) -> None:
    store(hass_storage, popups("gate"))
    mock_restore_cache(hass, [State(SELECT, "doorbell")])
    await add_entry(hass)
    assert hass.states.get(SELECT).state == "none"


async def test_unloading_removes_the_entities(
    hass: HomeAssistant, built: Path, hass_storage: dict[str, Any]
) -> None:
    entry = await add_entry(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(SELECT).state == "unavailable"
    assert hass.states.get(BUTTON).state == "unavailable"


@pytest.mark.freeze_time("2026-10-06 12:00:00+00:00")
async def test_pressing_the_activity_button_stamps_its_state(
    hass: HomeAssistant, built: Path, hass_storage: dict[str, Any]
) -> None:
    await add_entry(hass)
    assert hass.states.get(BUTTON).state == "unknown"

    await hass.services.async_call(
        "button", "press", {"entity_id": BUTTON}, blocking=True
    )
    assert hass.states.get(BUTTON).state == "2026-10-06T12:00:00+00:00"
