"""Setting up and removing the entry: the bundles served, the panel registered."""

from pathlib import Path

from homeassistant.components.frontend import DATA_PANELS
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ohomemy.const import DOMAIN, PLACEHOLDER_PANEL

ENTRY_URL = "/ohomemy_static/ohomemy-dashboard/ohomemy-dashboard.js"


async def add_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, title="OHomeMy")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_setup_registers_the_placeholder_panel(
    hass: HomeAssistant, built: Path
) -> None:
    entry = await add_entry(hass)
    assert entry.state is ConfigEntryState.LOADED

    panel = hass.data[DATA_PANELS][PLACEHOLDER_PANEL]
    assert panel.component_name == "custom"
    assert panel.require_admin is False
    assert panel.config["dashboard_id"] == "placeholder"
    custom = panel.config["_panel_custom"]
    assert custom["name"] == "ohomemy-dashboard"
    assert custom["embed_iframe"] is False
    assert custom["module_url"].startswith(f"{ENTRY_URL}?v=")


async def test_the_module_url_changes_with_the_build(
    hass: HomeAssistant, built: Path
) -> None:
    entry = await add_entry(hass)
    before = hass.data[DATA_PANELS][PLACEHOLDER_PANEL].config["_panel_custom"]

    (built / "ohomemy-dashboard" / "ohomemy-dashboard.js").write_text(
        "import './chunk-def.js';\n"
    )
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    after = hass.data[DATA_PANELS][PLACEHOLDER_PANEL].config["_panel_custom"]
    assert after["module_url"] != before["module_url"]


async def test_the_bundle_and_its_chunks_are_served(
    hass: HomeAssistant, hass_client, built: Path
) -> None:
    await add_entry(hass)
    client = await hass_client()
    module_url = hass.data[DATA_PANELS][PLACEHOLDER_PANEL].config["_panel_custom"][
        "module_url"
    ]

    response = await client.get(module_url)
    assert response.status == 200
    assert await response.text() == "import './chunk-abc.js';\n"

    # The entry imports its chunks relative to itself, with no hash on the URL.
    response = await client.get("/ohomemy_static/ohomemy-dashboard/chunk-abc.js")
    assert response.status == 200


async def test_removing_the_entry_removes_the_panel(
    hass: HomeAssistant, built: Path
) -> None:
    entry = await add_entry(hass)

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()

    assert PLACEHOLDER_PANEL not in hass.data[DATA_PANELS]


async def test_unloaded_then_reloaded_registers_the_panel_again(
    hass: HomeAssistant, built: Path
) -> None:
    entry = await add_entry(hass)

    await hass.config_entries.async_unload(entry.entry_id)
    assert PLACEHOLDER_PANEL not in hass.data[DATA_PANELS]

    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert PLACEHOLDER_PANEL in hass.data[DATA_PANELS]


async def test_an_unbuilt_dashboard_fails_setup(
    hass: HomeAssistant, frontend_dir: Path
) -> None:
    entry = await add_entry(hass)

    assert entry.state is ConfigEntryState.SETUP_ERROR
    assert PLACEHOLDER_PANEL not in hass.data.get(DATA_PANELS, {})
