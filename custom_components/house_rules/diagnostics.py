"""Diagnostics: the configuration in use and the state of every rule (notification targets redacted)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.core import HomeAssistant

TO_REDACT = {"notify"}


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry) -> dict[str, Any]:
    manager = entry.runtime_data
    snapshot = manager.snapshot()
    return async_redact_data(
        {
            "source": snapshot["source"],
            "raw": snapshot["raw"],
            "errors": snapshot["errors"],
            "rules": snapshot["rules"],
            "conditions": snapshot["conditions"],
            "claims": snapshot["claims"],
            "journal": snapshot["journal"][-30:],
        },
        TO_REDACT,
    )
