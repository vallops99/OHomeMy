"""`select.ohomemy_popup`: which Popup is open, house-wide (ADR-0015, ADR-0009).

Home Assistant opens a Popup by selecting its name and closes it by selecting
`none`; every Dashboard that lays out a Page for that name shows it, and the
Popup's close button selects `none` again. The panel never keeps a Popup open
or closed on its own: this entity's state is the only source of truth, and it
is state rather than an event so that a panel waking late still sees it.

The options are the Popup names across all Dashboards, sorted, after `none`.
They follow every Publish. A Popup open across a restart stays open, as
ADR-0009 promised of the old helper, so the state is restored; one whose name
no Dashboard defines any more is closed instead, since nothing could show it.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.select import SelectEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from . import OHomeMyConfigEntry
from .const import DATA_PUBLISHED, DOMAIN
from .document import NO_POPUP


def popup_options(document: dict[str, Any]) -> list[str]:
    """`none`, then every Popup name in `document` once, sorted."""
    names = {
        page["popup"]
        for dashboard in document["dashboards"]
        for page in dashboard["pages"]
        if page["popup"] is not None
    }
    return [NO_POPUP, *sorted(names)]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: OHomeMyConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([PopupSelect(hass)])


class PopupSelect(SelectEntity, RestoreEntity):
    """The open Popup's name, or `none`."""

    _attr_has_entity_name = False
    _attr_name = "OHomeMy Popup"
    _attr_icon = "mdi:dock-window"
    _attr_unique_id = f"{DOMAIN}_popup"
    _attr_should_poll = False

    def __init__(self, hass: HomeAssistant) -> None:
        # A fixed id, like the old helper's: the panel finds it by name.
        self.entity_id = f"select.{DOMAIN}_popup"
        self._published = hass.data[DATA_PUBLISHED]
        self._attr_options = popup_options(self._published.document)
        self._attr_current_option = NO_POPUP

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (last := await self.async_get_last_state()) is not None:
            self._attr_current_option = self._still_open(last.state)
        self.async_on_remove(self._published.async_listen(self._async_published))

    async def async_select_option(self, option: str) -> None:
        self._attr_current_option = option
        self.async_write_ha_state()

    @callback
    def _async_published(self, _revision: int, document: dict[str, Any]) -> None:
        self._attr_options = popup_options(document)
        self._attr_current_option = self._still_open(self._attr_current_option)
        self.async_write_ha_state()

    def _still_open(self, option: str | None) -> str:
        """`option` if some Dashboard still defines it, else `none`."""
        return option if option in self._attr_options else NO_POPUP
