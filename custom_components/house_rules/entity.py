"""Base entity: one device per rule, plus the House Rules device for the global entities."""

from __future__ import annotations

from homeassistant.core import callback
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity

from .const import DOMAIN, SIGNAL_UPDATE, TITLE
from .manager import HouseRules


class HouseRulesEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, manager: HouseRules, rule_id: str | None = None) -> None:
        self.manager = manager
        self.rule_id = rule_id
        if rule_id is None:
            self._attr_device_info = DeviceInfo(
                identifiers={(DOMAIN, "house_rules")}, name=TITLE, entry_type=DeviceEntryType.SERVICE
            )
        else:
            rule = manager.rules[rule_id]
            self._attr_device_info = DeviceInfo(
                identifiers={(DOMAIN, f"rule_{rule_id}")},
                name=rule.name,
                entry_type=DeviceEntryType.SERVICE,
                model=rule.type,
            )

    @property
    def rule(self):
        return self.manager.rules.get(self.rule_id) if self.rule_id else None

    @property
    def available(self) -> bool:
        return self.rule_id is None or self.rule is not None

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_UPDATE, self._refresh))

    @callback
    def _refresh(self) -> None:
        self.async_write_ha_state()


def setup_rule_entities(hass, entry, async_add_entities, factory, global_entities=()) -> None:
    """Add the entities of every rule now and of the rules added later; remove those of deleted rules."""
    from homeassistant.helpers import entity_registry as er

    from .const import SIGNAL_RULES

    manager: HouseRules = entry.runtime_data
    known: dict[str, list[HouseRulesEntity]] = {}

    @callback
    def sync() -> None:
        from homeassistant.helpers import device_registry as dr

        devices = dr.async_get(hass)
        # The entry's own devices (works on every supported version, no identifier lookup across entries).
        for device in dr.async_entries_for_config_entry(devices, entry.entry_id):
            rid = next((i[1][5:] for i in device.identifiers if i[0] == DOMAIN and i[1].startswith("rule_")), None)
            rule = manager.rules.get(rid) if rid else None
            if rule and (device.name != rule.name or device.model != rule.type):
                devices.async_update_device(device.id, name=rule.name, model=rule.type)
        new = []
        for rid in manager.rules:
            if rid not in known:
                known[rid] = list(factory(manager, rid))
                new.extend(known[rid])
        registry = er.async_get(hass)
        for rid in [r for r in known if r not in manager.rules]:
            for entity in known.pop(rid):
                if entity.entity_id and registry.async_get(entity.entity_id):
                    registry.async_remove(entity.entity_id)
        if new:
            async_add_entities(new)

    if global_entities:
        async_add_entities(list(global_entities))
    sync()
    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_RULES, sync))
