"""Constants for OHomeMy."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.util.hass_dict import HassKey

if TYPE_CHECKING:
    from .store import Published

DOMAIN = "ohomemy"

# The published document, loaded once for the life of Home Assistant.
DATA_PUBLISHED: HassKey[Published] = HassKey(f"{DOMAIN}_published")
