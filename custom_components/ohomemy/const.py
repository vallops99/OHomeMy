"""Constants for OHomeMy."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.util.hass_dict import HassKey

if TYPE_CHECKING:
    from .store import Published

DOMAIN = "ohomemy"

# The published document, loaded once for the life of Home Assistant.
DATA_PUBLISHED: HassKey[Published] = HassKey(f"{DOMAIN}_published")

# Stands in for the Dashboards until they come from the store (#49), which
# registers one panel per Dashboard at /ohomemy-<slug>.
PLACEHOLDER_PANEL = "ohomemy-placeholder"
PLACEHOLDER_DASHBOARD_ID = "placeholder"
