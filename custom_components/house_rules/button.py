"""Buttons: test each rule, acknowledge the alerts."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity

from .entity import HouseRulesEntity, setup_rule_entities


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    manager = entry.runtime_data
    setup_rule_entities(
        hass, entry, async_add_entities, lambda m, rid: [TestButton(m, rid)], [AcknowledgeButton(manager)]
    )


class TestButton(HouseRulesEntity, ButtonEntity):
    _attr_translation_key = "test"

    def __init__(self, manager, rule_id: str) -> None:
        super().__init__(manager, rule_id)
        self._attr_unique_id = f"rule_{rule_id}_test"

    async def async_press(self) -> None:
        if self.rule:
            self.hass.async_create_task(self.rule.async_test())


class AcknowledgeButton(HouseRulesEntity, ButtonEntity):
    _attr_translation_key = "acknowledge"
    _attr_unique_id = "acknowledge"

    async def async_press(self) -> None:
        for alert in self.manager.alerts():
            if rule := self.manager.rules.get(alert["id"]):
                await rule.async_acknowledge()
