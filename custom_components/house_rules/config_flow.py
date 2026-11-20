"""A single entry, no options: rules, rooms and settings are edited in the panel or in house_rules.yaml."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN, TITLE


class HouseRulesConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title=TITLE, data={})
        return self.async_show_form(step_id="user")
