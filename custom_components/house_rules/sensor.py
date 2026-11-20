"""Sensors: the state of each rule, and the active alerts (read by the sidebar badge and the cards)."""

from __future__ import annotations

from typing import Any, ClassVar

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity

from .const import RULE_TYPES, STATES
from .entity import HouseRulesEntity, setup_rule_entities


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    manager = entry.runtime_data
    setup_rule_entities(
        hass,
        entry,
        async_add_entities,
        lambda m, rid: [RuleSensor(m, rid)],
        [AlertsSensor(manager), TimersSensor(manager)],
    )


class RuleSensor(HouseRulesEntity, SensorEntity):
    _attr_translation_key = "rule"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options: ClassVar[list[str]] = list(STATES)

    def __init__(self, manager, rule_id: str) -> None:
        super().__init__(manager, rule_id)
        self._attr_unique_id = f"rule_{rule_id}_state"

    @property
    def native_value(self) -> str | None:
        return self.rule.status()["state"] if self.rule else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        if not self.rule:
            return {}
        status = self.rule.status()
        return {
            "rule_id": self.rule_id,
            "rule_type": status["type"],
            "detail": status["detail"],
            "blocked_by": status["blocked"],
            "snoozed_until": status["snoozed_until"],
            "last_run": status["last_run"],
            **status["attributes"],
        }


class AlertsSensor(HouseRulesEntity, SensorEntity):
    """Number of rules in alert. `house_rules_alerts` attribute: the sidebar badge finds this sensor by it."""

    _attr_translation_key = "alerts"
    _attr_unique_id = "alerts"

    @property
    def native_value(self) -> int:
        return len(self.manager.alerts())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "house_rules_alerts": [
                {"id": a["id"], "name": a["name"], "detail": a["detail"]} for a in self.manager.alerts()
            ],
            "rule_types": list(RULE_TYPES),
        }


class TimersSensor(HouseRulesEntity, SensorEntity):
    """Number of running auto-off timers; the next one in the attributes."""

    _attr_translation_key = "timers"
    _attr_unique_id = "timers"

    @property
    def native_value(self) -> int:
        return len(self.manager.timers())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"timers": self.manager.timers()}
