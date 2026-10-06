"""The built frontends OHomeMy serves to Home Assistant's browser.

Each bundle is one ES module defining one custom element, built from
`ha-dashboard/` and copied into `frontend/<element>/` (by the dev loop, or by
the release workflow). They are never committed. All of `frontend/` is served
under one static path, so a new bundle is one more `Bundle` here:

    frontend/ohomemy-dashboard/ohomemy-dashboard.js   (+ its chunks)
    frontend/ohomemy-builder/ohomemy-builder.js       (+ its chunks)

The entry's URL carries a hash of its contents. Vite names every chunk by its
own contents and the entry imports them by name, so a changed build always
changes the entry, and a browser holding the old one fetches the new one.
"""

import hashlib
from dataclasses import dataclass
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

FRONTEND_DIR = Path(__file__).parent / "frontend"
STATIC_URL = "/ohomemy_static"


@dataclass(frozen=True, slots=True)
class Bundle:
    """A built frontend, named after the custom element its module defines."""

    element: str

    @property
    def entry(self) -> str:
        """The entry module, relative to `FRONTEND_DIR`."""
        return f"{self.element}/{self.element}.js"


# The renderer: `npm run build:panel`, defining `<ohomemy-dashboard>`.
DASHBOARD = Bundle("ohomemy-dashboard")

# The Builder: `npm run build:builder`, defining `<ohomemy-builder>`.
BUILDER = Bundle("ohomemy-builder")


class BundleMissing(Exception):
    """A bundle's entry was not built into `frontend/`."""


async def async_register_static_path(hass: HomeAssistant) -> None:
    """Serve `frontend/`, once for the life of Home Assistant.

    A static path cannot be unregistered, so it is registered by the
    component, not by the entry, which can be reloaded.
    """
    # Cached for good by the browser: the entry's URL changes with its
    # contents, and every chunk's name does.
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=True)]
    )


async def async_module_url(hass: HomeAssistant, bundle: Bundle) -> str:
    """The URL a panel loads `bundle` from, cache-busted by its contents."""
    path = FRONTEND_DIR / bundle.entry
    try:
        digest = await hass.async_add_executor_job(_digest, path)
    except FileNotFoundError as err:
        raise BundleMissing(path) from err
    return f"{STATIC_URL}/{bundle.entry}?v={digest}"


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]
