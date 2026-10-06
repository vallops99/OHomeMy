"""OHomeMy: house dashboards laid out in a Builder, served as panels (ADR-0015)."""

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from . import defaults
from .bundles import (
    BUILDER,
    DASHBOARD,
    BundleMissing,
    async_module_url,
    async_register_static_path,
)
from .const import DATA_PUBLISHED, DOMAIN
from .panels import Panels, async_register_builder, async_remove_builder
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
    defaults.async_register_commands(hass)
    defaults.async_follow_publishes(hass, published)
    return True


type OHomeMyConfigEntry = ConfigEntry[Panels]


async def async_setup_entry(hass: HomeAssistant, entry: OHomeMyConfigEntry) -> bool:
    """Register the Builder and a panel for each Dashboard, and keep the
    Dashboards' panels in step with the document until the entry is unloaded."""
    try:
        module_url = await async_module_url(hass, DASHBOARD)
        builder_url = await async_module_url(hass, BUILDER)
    except BundleMissing as err:
        raise ConfigEntryError(f"A frontend is not built: {err} is missing") from err

    async_register_builder(hass, builder_url)
    entry.async_on_unload(lambda: async_remove_builder(hass))

    published = hass.data[DATA_PUBLISHED]
    panels = entry.runtime_data = Panels(hass, module_url)
    panels.async_show(published.document)
    entry.async_on_unload(
        published.async_listen(
            lambda _revision, document: panels.async_show(document)
        )
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: OHomeMyConfigEntry) -> bool:
    """Remove the panels. Panels live only in memory, so nothing else is left."""
    entry.runtime_data.async_remove_all()
    return True
