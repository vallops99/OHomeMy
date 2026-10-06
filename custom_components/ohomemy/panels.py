"""Each Dashboard is its own Home Assistant panel, at `/ohomemy-<slug>`.

Panels live only in memory, so they are registered from the document on
every setup, kept in step with every Publish, and all removed on unload.
Registering or removing one fires `panels_updated`, which every open browser
hears (non-admins too), so the sidebar follows a Publish without a reload.

A panel is registered with `frontend.async_register_built_in_panel`, not
`panel_custom.async_register_panel`: only the former can replace a panel in
place (`update=True`) and hide it from the sidebar while keeping it routable
(docs/research/layout-storage.md §7.5). Replacing the panel a browser is
showing recreates its element there, so a panel is touched only when what it
was registered with changes: its title or its place in the sidebar, never a
Widget moved on one of its Pages. The layout reaches the element over
`ohomemy/document/subscribe`; the panel's `config` holds only the id.

The Builder is one more panel, admin-only, at `/ohomemy_builder`. The
underscore keeps it out of the Dashboards' namespace: no slug holds one, so
no Dashboard can be given the Builder's URL.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from homeassistant.components import frontend
from homeassistant.core import HomeAssistant, callback

from .bundles import BUILDER, DASHBOARD

_LOGGER = logging.getLogger(__name__)

URL_PREFIX = "ohomemy-"

# The document has no icon for a Dashboard; every one shows this.
ICON = "mdi:home-variant-outline"

BUILDER_URL_PATH = "ohomemy_builder"
BUILDER_TITLE = "OHomeMy Builder"
BUILDER_ICON = "mdi:view-dashboard-edit-outline"


@callback
def async_register_builder(hass: HomeAssistant, module_url: str) -> None:
    """Register the Builder's panel.

    `require_admin` only keeps it out of a non-admin's sidebar and panel
    list. What makes the Builder admin-only is that every command writing the
    document is (`websocket.py`).
    """
    frontend.async_register_built_in_panel(
        hass,
        "custom",
        sidebar_title=BUILDER_TITLE,
        sidebar_icon=BUILDER_ICON,
        frontend_url_path=BUILDER_URL_PATH,
        config={
            "_panel_custom": {
                "name": BUILDER.element,
                "module_url": module_url,
                "embed_iframe": False,
                "trust_external": False,
            },
        },
        require_admin=True,
    )


@callback
def async_remove_builder(hass: HomeAssistant) -> None:
    """Remove the Builder's panel."""
    frontend.async_remove_panel(hass, BUILDER_URL_PATH, warn_if_unknown=False)


@dataclass(frozen=True, slots=True)
class DashboardPanel:
    """What a Dashboard's panel is registered with. Equal means unchanged."""

    url_path: str
    dashboard_id: str
    title: str
    show_in_sidebar: bool


def dashboard_panels(document: dict[str, Any]) -> dict[str, DashboardPanel]:
    """The panel each Dashboard in `document` should have, by URL path."""
    panels = (
        DashboardPanel(
            url_path=f"{URL_PREFIX}{dashboard['slug']}",
            dashboard_id=dashboard["id"],
            title=dashboard["name"],
            show_in_sidebar=dashboard["show_in_sidebar"],
        )
        for dashboard in document["dashboards"]
    )
    return {panel.url_path: panel for panel in panels}


class Panels:
    """The panels this entry registered, and what each was registered with."""

    def __init__(self, hass: HomeAssistant, module_url: str) -> None:
        self._hass = hass
        self._module_url = module_url
        self._registered: dict[str, DashboardPanel] = {}

    @callback
    def async_show(self, document: dict[str, Any]) -> None:
        """Make the registered panels match `document`'s Dashboards."""
        wanted = dashboard_panels(document)
        for url_path in self._registered.keys() - wanted.keys():
            frontend.async_remove_panel(self._hass, url_path, warn_if_unknown=False)
            del self._registered[url_path]
        for url_path, panel in wanted.items():
            if self._registered.get(url_path) != panel:
                self._register(panel)

    @callback
    def async_remove_all(self) -> None:
        """Remove every panel this entry registered."""
        for url_path in self._registered:
            frontend.async_remove_panel(self._hass, url_path, warn_if_unknown=False)
        self._registered.clear()

    def _register(self, panel: DashboardPanel) -> None:
        # Replacing is only for a panel this entry registered. One registered
        # by anything else is left alone: HA raises rather than overwrite it.
        try:
            frontend.async_register_built_in_panel(
                self._hass,
                "custom",
                sidebar_title=panel.title,
                sidebar_icon=ICON,
                frontend_url_path=panel.url_path,
                config={
                    "dashboard_id": panel.dashboard_id,
                    "_panel_custom": {
                        "name": DASHBOARD.element,
                        "module_url": self._module_url,
                        "embed_iframe": False,
                        "trust_external": False,
                    },
                },
                require_admin=False,
                update=panel.url_path in self._registered,
                show_in_sidebar=panel.show_in_sidebar,
            )
        except ValueError:
            _LOGGER.error(
                "Dashboard %s has no panel: /%s is already another panel's",
                panel.dashboard_id,
                panel.url_path,
            )
            return
        self._registered[panel.url_path] = panel
