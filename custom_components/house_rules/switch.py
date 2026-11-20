"""Switches: one per rule (enabled), plus vacation mode."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.helpers.restore_state import RestoreEntity

from .entity import HouseRulesEntity, setup_rule_entities


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    manager = entry.runtime_data
    setup_rule_entities(
        hass,
        entry,
        async_add_entities,
        lambda m, rid: [RuleSwitch(m, rid)],
        [VacationSwitch(manager)],
    )


class RuleSwitch(HouseRulesEntity, SwitchEntity):
    """The rule on or off (written to house_rules.yaml / storage as `enabled: false`)."""

    _attr_translation_key = "rule_enabled"

    def __init__(self, manager, rule_id: str) -> None:
        super().__init__(manager, rule_id)
        self._attr_unique_id = f"rule_{rule_id}_enabled"

    @property
    def is_on(self) -> bool:
        return bool(self.rule and self.rule.enabled)

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.manager.async_set_rule_enabled(self.rule_id, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.manager.async_set_rule_enabled(self.rule_id, False)


class VacationSwitch(HouseRulesEntity, SwitchEntity, RestoreEntity):
    """Vacation mode: the rules that respect it pause."""

    _attr_translation_key = "vacation"
    _attr_unique_id = "vacation"

    @property
    def is_on(self) -> bool:
        return self.manager.vacation

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.manager.async_set_vacation(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.manager.async_set_vacation(False)
