"""Config flow for OHomeMy: one entry, no options, nothing to ask (ADR-0015)."""

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN


class OHomeMyConfigFlow(ConfigFlow, domain=DOMAIN):
    """Adds the one OHomeMy entry. Everything else is set in the Builder."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Confirm, then create the entry."""
        # A second entry is refused by Home Assistant itself, with
        # `single_instance_allowed`, from `single_config_entry` in the manifest.
        if user_input is None:
            return self.async_show_form(step_id="user")
        return self.async_create_entry(title="OHomeMy", data={})
