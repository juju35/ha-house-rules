"""The rule types, end to end on a test Home Assistant."""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.house_rules.const import DOMAIN

SERVICES = [
    ("switch", "turn_on"),
    ("switch", "turn_off"),
    ("homeassistant", "turn_on"),
    ("homeassistant", "turn_off"),
    ("light", "turn_on"),
    ("light", "turn_off"),
    ("lock", "lock"),
    ("vacuum", "return_to_base"),
    ("notify", "phone"),
    ("alarm_control_panel", "alarm_disarm"),
]


@pytest.fixture
def calls(hass: HomeAssistant) -> dict[str, list]:
    """Filled by setup(): the services are mocked once the integration's platforms (switch...) are loaded."""
    hass.data["test_calls"] = out = {}
    return out


async def setup(hass: HomeAssistant, yaml_text: str | None) -> Any:
    if yaml_text is not None:
        Path(hass.config.path("house_rules.yaml")).write_text(yaml_text, encoding="utf-8")
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    if (calls := hass.data.get("test_calls")) is not None:
        for domain, service in SERVICES:
            calls[f"{domain}.{service}"] = async_mock_service(hass, domain, service)
    return entry.runtime_data


def later(hass: HomeAssistant, seconds: float) -> None:
    """Move the clock on (frozen in every test) and run what was due."""
    FROZEN["freezer"].tick(timedelta(seconds=seconds))
    async_fire_time_changed(hass, dt_util.utcnow())


FROZEN: dict[str, Any] = {}


@pytest.fixture(autouse=True)
def _freeze(freezer):
    FROZEN["freezer"] = freezer
    yield
    FROZEN.clear()


async def test_storage_mode_without_file(hass: HomeAssistant):
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    manager = entry.runtime_data
    assert manager.source.mode == "storage"
    await manager.async_save_rule({"id": "box", "type": "keep_on", "entity_id": "switch.box"})
    assert "box" in manager.rules
    assert hass.states.get("sensor.box_state") is not None
    await manager.async_delete_rule("box")
    assert "box" not in manager.rules


async def test_keep_on(hass: HomeAssistant, calls):
    hass.states.async_set("switch.box", "on")
    await setup(hass, "rules:\n  - id: box\n    type: keep_on\n    entity_id: switch.box\n    delay: 5\n")
    hass.states.async_set("switch.box", "off")
    await hass.async_block_till_done()
    later(hass, 6)
    await hass.async_block_till_done()
    assert calls["switch.turn_on"][-1].data["entity_id"] == "switch.box"


async def test_keep_on_gives_up(hass: HomeAssistant, calls):
    hass.states.async_set("switch.box", "on")
    manager = await setup(
        hass, "rules:\n  - id: box\n    type: keep_on\n    entity_id: switch.box\n    delay: 1\n    max_attempts: 2\n"
    )
    for _ in range(3):
        hass.states.async_set("switch.box", "on")
        await hass.async_block_till_done()
        hass.states.async_set("switch.box", "off")
        await hass.async_block_till_done()
        later(hass, 2)
        await hass.async_block_till_done()
    assert len(calls["switch.turn_on"]) == 2
    assert manager.rules["box"].status()["state"] == "failed"


async def test_auto_off_timer(hass: HomeAssistant, calls):
    hass.states.async_set("switch.kettle", "off")
    manager = await setup(
        hass, "rules:\n  - id: kettle\n    type: auto_off\n    entity_id: switch.kettle\n    duration: 60\n"
    )
    hass.states.async_set("switch.kettle", "on")
    await hass.async_block_till_done()
    assert manager.timers()[0]["entity_id"] == "switch.kettle"
    manager.rules["kettle"].extend("switch.kettle", 1)
    later(hass, 75)
    await hass.async_block_till_done()
    assert not calls["switch.turn_off"]
    later(hass, 60)
    await hass.async_block_till_done()
    assert calls["switch.turn_off"][-1].data["entity_id"] == "switch.kettle"


async def test_vacuum_follow_keeps_lights_that_were_on(hass: HomeAssistant, calls):
    hass.states.async_set("vacuum.robot", "cleaning")
    hass.states.async_set("sensor.room", "Hall")
    hass.states.async_set("light.kitchen", "off")
    hass.states.async_set("light.living", "on")
    manager = await setup(
        hass,
        """
rooms:
  Kitchen: {light: light.kitchen}
  Dining: {light: light.kitchen}
  Living: {light: light.living}
rules:
  - id: follow
    type: vacuum_follow
    vacuum: vacuum.robot
    room_sensor: sensor.room
""",
    )
    hass.states.async_set("sensor.room", "Kitchen")
    await hass.async_block_till_done()
    assert calls["light.turn_on"][-1].data["entity_id"] == "light.kitchen"
    hass.states.async_set("light.kitchen", "on")
    hass.states.async_set("sensor.room", "Dining")  # same light: nothing changes
    await hass.async_block_till_done()
    assert not calls["light.turn_off"]
    hass.states.async_set("sensor.room", "Living")  # already on: not ours
    await hass.async_block_till_done()
    assert calls["light.turn_off"][-1].data["entity_id"] == "light.kitchen"
    hass.states.async_set("vacuum.robot", "docked")
    await hass.async_block_till_done()
    assert all(c.data["entity_id"] != "light.living" for c in calls["light.turn_off"])
    assert manager.rules["follow"].lit == []


async def test_presence_and_vacuum_share_a_light(hass: HomeAssistant, calls):
    hass.states.async_set("binary_sensor.hall_presence", "off")
    hass.states.async_set("vacuum.robot", "cleaning")
    hass.states.async_set("sensor.room", "Kitchen")
    hass.states.async_set("light.hall", "off")
    await setup(
        hass,
        """
rooms:
  Hall: {light: light.hall, presence: binary_sensor.hall_presence}
rules:
  - id: hall
    type: presence_light
    room: Hall
    off_delay: 10
  - id: follow
    type: vacuum_follow
    vacuum: vacuum.robot
    room_sensor: sensor.room
""",
    )
    hass.states.async_set("binary_sensor.hall_presence", "on")
    await hass.async_block_till_done()
    assert calls["light.turn_on"][-1].data["entity_id"] == "light.hall"
    hass.states.async_set("light.hall", "on")
    hass.states.async_set("sensor.room", "Hall")
    await hass.async_block_till_done()
    hass.states.async_set("binary_sensor.hall_presence", "off")
    await hass.async_block_till_done()
    later(hass, 11)
    await hass.async_block_till_done()
    # The robot still wants the light: presence alone can't turn it off.
    assert not calls["light.turn_off"]
    hass.states.async_set("vacuum.robot", "docked")
    await hass.async_block_till_done()
    assert calls["light.turn_off"][-1].data["entity_id"] == "light.hall"


async def test_lock_guard(hass: HomeAssistant, calls):
    hass.states.async_set("lock.door", "unlocked")
    hass.states.async_set("binary_sensor.door", "on")
    await setup(
        hass,
        "rules:\n  - id: lock\n    type: lock_guard\n    lock: lock.door\n    door: binary_sensor.door\n"
        "    lock_after: 30\n",
    )
    hass.states.async_set("binary_sensor.door", "off")
    await hass.async_block_till_done()
    later(hass, 31)
    await hass.async_block_till_done()
    assert calls["lock.lock"][-1].data["entity_id"] == "lock.door"


async def test_leak_blocks_resume(hass: HomeAssistant, calls):
    hass.states.async_set("binary_sensor.leak", "off")
    hass.states.async_set("sensor.progress", "50")
    hass.states.async_set("switch.dishwasher", "on")
    manager = await setup(
        hass,
        """
settings: {notify: notify.phone}
rules:
  - id: leak
    type: leak_guard
    sensors: binary_sensor.leak
    cut: switch.dishwasher
  - id: dishwasher
    type: appliance_resume
    switch: switch.dishwasher
    progress: sensor.progress
    delay: 1
""",
    )
    hass.states.async_set("binary_sensor.leak", "on")
    await hass.async_block_till_done()
    assert calls["homeassistant.turn_off"][-1].data["entity_id"] == "switch.dishwasher"
    assert manager.rules["leak"].status()["state"] == "alert"
    assert hass.states.get("sensor.house_rules_active_alerts").state == "1"
    hass.states.async_set("sensor.progress", "unavailable")
    await hass.async_block_till_done()
    later(hass, 2)
    await hass.async_block_till_done()
    assert not calls["homeassistant.turn_on"]
    await manager.rules["leak"].async_stop()


async def test_resume_after_power_cut(hass: HomeAssistant, calls):
    hass.states.async_set("sensor.progress", "40")
    hass.states.async_set("switch.dishwasher", "on")
    await setup(
        hass,
        "rules:\n  - id: dw\n    type: appliance_resume\n    switch: switch.dishwasher\n    progress: sensor.progress\n"
        "    delay: 1\n",
    )
    hass.states.async_set("sensor.progress", "62")
    await hass.async_block_till_done()
    hass.states.async_set("sensor.progress", "unavailable")
    await hass.async_block_till_done()
    later(hass, 2)
    await hass.async_block_till_done()
    assert calls["homeassistant.turn_on"][-1].data["entity_id"] == "switch.dishwasher"


async def test_yaml_change_reloads_only_changed_rules(hass: HomeAssistant, calls):
    manager = await setup(
        hass,
        "rules:\n  - id: a\n    type: keep_on\n    entity_id: switch.a\n"
        "  - id: b\n    type: keep_on\n    entity_id: switch.b\n",
    )
    rule_a = manager.rules["a"]
    path = Path(hass.config.path("house_rules.yaml"))
    path.write_text(path.read_text(encoding="utf-8").replace("switch.b", "switch.c"), encoding="utf-8")
    changed = await manager.async_reload()
    assert changed == ["b"]
    assert manager.rules["a"] is rule_a


async def test_invalid_yaml_keeps_last_config(hass: HomeAssistant):
    manager = await setup(hass, "rules:\n  - id: a\n    type: keep_on\n    entity_id: switch.a\n")
    Path(hass.config.path("house_rules.yaml")).write_text("rules:\n  - id: a\n   bad\n", encoding="utf-8")
    await manager.async_reload()
    assert "a" in manager.rules
    assert manager.source.error is not None
    assert not manager.source.editable()


async def test_quiet_hours_mute_the_flash(hass: HomeAssistant, calls):
    hass.states.async_set("binary_sensor.panel", "off")
    manager = await setup(
        hass,
        """
settings:
  quiet_hours: {start: "00:00", end: "23:59:59"}
rules:
  - id: panel
    type: sensor_flash
    trigger: {entity_id: binary_sensor.panel, to: "on"}
    lights: light.hall
    respect: [quiet_hours]
""",
    )
    hass.states.async_set("binary_sensor.panel", "on")
    await hass.async_block_till_done()
    later(hass, 1)
    await hass.async_block_till_done()
    rule = manager.rules["panel"]
    assert rule.status()["state"] == "alert"
    assert not rule.flasher.running
    hass.states.async_set("binary_sensor.panel", "off")
    await hass.async_block_till_done()
    assert rule.status()["state"] == "armed"
