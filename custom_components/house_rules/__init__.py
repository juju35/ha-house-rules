"""House Rules: reflexes for the home — plugs kept on or timed off, light alerts, lights that follow the vacuum,
appliances resumed, chimes, leak guard, presence lights, lock guard."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from . import websocket
from .const import (
    DOMAIN,
    SERVICE_ACKNOWLEDGE,
    SERVICE_CANCEL,
    SERVICE_EXPORT,
    SERVICE_EXTEND,
    SERVICE_RELOAD,
    SERVICE_SNOOZE,
    SERVICE_TRIGGER,
    STORAGE_KEY,
    STORAGE_VERSION,
)
from .manager import HouseRules
from .panel import async_register_panel, async_remove_card, async_remove_panel
from .yamlsource import dump

PLATFORMS = [Platform.BUTTON, Platform.SENSOR, Platform.SWITCH]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type HouseRulesConfigEntry = ConfigEntry[HouseRules]

RULES = vol.All(cv.ensure_list, [cv.string])


def _manager(hass: HomeAssistant) -> HouseRules:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED:
            return entry.runtime_data
    raise ServiceValidationError(translation_domain=DOMAIN, translation_key="not_loaded")


def _rules(manager: HouseRules, ids: list[str]) -> list[Any]:
    out = []
    for rid in ids:
        if rid not in manager.rules:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="unknown_rule", translation_placeholders={"rule": rid}
            )
        out.append(manager.rules[rid])
    return out


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the actions and the WebSocket API."""
    websocket.async_register(hass)

    async def trigger(call: ServiceCall) -> None:
        for rule in _rules(_manager(hass), call.data["rule"]):
            await rule.async_test()

    async def snooze(call: ServiceCall) -> None:
        minutes = call.data.get("minutes")
        for rule in _rules(_manager(hass), call.data["rule"]):
            rule.snooze(minutes * 60 if minutes else None)

    async def cancel(call: ServiceCall) -> None:
        for rule in _rules(_manager(hass), call.data["rule"]):
            await rule.async_cancel()

    async def acknowledge(call: ServiceCall) -> None:
        manager = _manager(hass)
        ids = call.data.get("rule") or [a["id"] for a in manager.alerts()]
        for rule in _rules(manager, ids):
            await rule.async_acknowledge()

    async def extend(call: ServiceCall) -> None:
        manager = _manager(hass)
        for rule in manager.rules.values():
            if hasattr(rule, "extend"):
                for entity in call.data["entity_id"]:
                    rule.extend(entity, call.data["minutes"])

    async def reload(call: ServiceCall) -> dict[str, Any]:
        changed = await _manager(hass).async_reload()
        return {"reloaded": changed}

    async def export(call: ServiceCall) -> dict[str, Any]:
        manager = _manager(hass)
        return {"yaml": dump(manager.raw), "source": manager.source.info()["mode"]}

    rules_only = vol.Schema({vol.Required("rule"): RULES})
    hass.services.async_register(DOMAIN, SERVICE_TRIGGER, trigger, rules_only)
    hass.services.async_register(DOMAIN, SERVICE_CANCEL, cancel, rules_only)
    hass.services.async_register(DOMAIN, SERVICE_ACKNOWLEDGE, acknowledge, vol.Schema({vol.Optional("rule"): RULES}))
    hass.services.async_register(
        DOMAIN,
        SERVICE_SNOOZE,
        snooze,
        vol.Schema(
            {
                vol.Required("rule"): RULES,
                vol.Optional("minutes"): vol.All(vol.Coerce(int), vol.Range(min=0, max=7 * 24 * 60)),
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_EXTEND,
        extend,
        vol.Schema(
            {
                vol.Required("entity_id"): cv.entity_ids,
                vol.Optional("minutes", default=15): vol.All(vol.Coerce(int), vol.Range(min=-1440, max=1440)),
            }
        ),
    )
    hass.services.async_register(
        DOMAIN, SERVICE_RELOAD, reload, vol.Schema({}), supports_response=SupportsResponse.OPTIONAL
    )
    hass.services.async_register(
        DOMAIN, SERVICE_EXPORT, export, vol.Schema({}), supports_response=SupportsResponse.ONLY
    )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: HouseRulesConfigEntry) -> bool:
    manager = HouseRules(hass)
    await manager.async_start()
    entry.runtime_data = manager
    entry.async_on_unload(manager.async_stop)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await async_register_panel(hass)
    manager.update()
    return True


async def async_unload_entry(hass: HomeAssistant, entry: HouseRulesConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: HouseRulesConfigEntry) -> None:
    """The panel and the cards go; the runtime state is forgotten. house_rules.yaml stays (it is the user's)."""
    from homeassistant.helpers.storage import Store

    async_remove_panel(hass)
    await async_remove_card(hass)
    await Store(hass, STORAGE_VERSION, STORAGE_KEY).async_remove()
