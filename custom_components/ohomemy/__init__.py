"""OHomeMy: house dashboards laid out in a Builder, served as panels (ADR-0015)."""

from homeassistant.components import frontend, panel_custom
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .bundles import (
    DASHBOARD,
    BundleMissing,
    async_module_url,
    async_register_static_path,
)
from .const import DATA_PUBLISHED, DOMAIN, PLACEHOLDER_DASHBOARD_ID, PLACEHOLDER_PANEL
from .store import Published
from .websocket import async_register_commands

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the built frontends and the document, whether or not the entry
    is loaded: neither a static path nor a websocket command can be
    unregistered, and a subscriber must outlive a reload of the entry."""
    await async_register_static_path(hass)
    published = Published(hass)
    await published.async_load()
    hass.data[DATA_PUBLISHED] = published
    async_register_commands(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Register the placeholder Dashboard's panel."""
    try:
        module_url = await async_module_url(hass, DASHBOARD)
    except BundleMissing as err:
        raise ConfigEntryError(
            f"The Dashboard's frontend is not built: {err} is missing"
        ) from err

    # `embed_iframe=False` and one id in `config`, as every Dashboard's panel
    # will be (docs/research/hakit-in-a-panel.md).
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PLACEHOLDER_PANEL,
        webcomponent_name=DASHBOARD.element,
        module_url=module_url,
        sidebar_title="OHomeMy",
        sidebar_icon="mdi:home-variant-outline",
        require_admin=False,
        embed_iframe=False,
        config={"dashboard_id": PLACEHOLDER_DASHBOARD_ID},
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Remove the panel. Panels live only in memory, so nothing else is left."""
    frontend.async_remove_panel(hass, PLACEHOLDER_PANEL, warn_if_unknown=False)
    return True
