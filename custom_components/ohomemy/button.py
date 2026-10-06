"""`button.ohomemy_popup_activity`: someone is using the open Popup (ADR-0015).

Home Assistant cannot see touches, and a Popup never closes on its own: an
automation that wants one to close after a quiet spell needs to hear that
someone is still using it. The panel presses this button, at most every few
seconds, while a Popup is open and touched; the automation restarts its wait
on the button's state changing. The integration provides it, as it provides
the select that opens Popups, so the house needs no helper of its own.

Pressing does nothing else. The button's state is the time of the last press,
which `ButtonEntity` keeps and restores.
"""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import OHomeMyConfigEntry
from .const import DOMAIN


async def async_setup_entry(
    hass: HomeAssistant,
    entry: OHomeMyConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([PopupActivityButton()])


class PopupActivityButton(ButtonEntity):
    """Pressed by the panel on a touch inside an open Popup."""

    _attr_has_entity_name = False
    _attr_name = "OHomeMy Popup activity"
    _attr_icon = "mdi:gesture-tap"
    _attr_unique_id = f"{DOMAIN}_popup_activity"
    _attr_should_poll = False

    def __init__(self) -> None:
        # A fixed id: the panel presses it by name.
        self.entity_id = f"button.{DOMAIN}_popup_activity"

    async def async_press(self) -> None:
        """Nothing to do: the press itself, as a state change, is the report."""
