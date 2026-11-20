"""The rule types, end to end on a test Home Assistant."""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest
import voluptuous as vol
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.house_rules.const import DOMAIN
from custom_components.house_rules.schema import SLOT

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
    # Running (it starts flashing once the quiet hours end) but not a single light call meanwhile.
    assert rule.flasher.running
    assert not calls["light.turn_on"]
    hass.states.async_set("binary_sensor.panel", "off")
    await hass.async_block_till_done()
    assert rule.status()["state"] == "armed"
    assert not rule.flasher.running


async def test_resume_ignores_manual_switch_off(hass: HomeAssistant, calls):
    hass.states.async_set("sensor.progress", "40")
    hass.states.async_set("switch.dishwasher", "on")
    await setup(
        hass,
        "rules:\n  - id: dw\n    type: appliance_resume\n    switch: switch.dishwasher\n    progress: sensor.progress\n"
        "    delay: 1\n",
    )
    hass.states.async_set("switch.dishwasher", "off")  # cancelled by hand, the progress stays readable
    await hass.async_block_till_done()
    later(hass, 2)
    await hass.async_block_till_done()
    assert not calls["homeassistant.turn_on"]


async def test_notifications_tagged_per_rule(hass: HomeAssistant, calls):
    hass.states.async_set("sensor.power_a", "0")
    hass.states.async_set("sensor.power_b", "0")
    manager = await setup(
        hass,
        """
settings: {notify: notify.phone}
rules:
  - {id: washer, type: cycle_done, power_entity: sensor.power_a, done_for: 5}
  - {id: dryer, type: cycle_done, power_entity: sensor.power_b, done_for: 5}
""",
    )
    await manager.rules["washer"].async_test()
    await manager.rules["dryer"].async_test()
    await hass.async_block_till_done()
    tags = [c.data["data"]["tag"] for c in calls["notify.phone"]]
    assert tags == ["house_rules_washer", "house_rules_dryer"]


async def test_cycle_done_by_power_and_after_restart(hass: HomeAssistant, calls):
    hass.states.async_set("sensor.power", "0")
    manager = await setup(
        hass,
        "settings: {notify: notify.phone}\nrules:\n  - {id: washer, type: cycle_done, power_entity: sensor.power, "
        "done_for: 60, message: Done}\n",
    )
    hass.states.async_set("sensor.power", "500")
    await hass.async_block_till_done()
    assert manager.rules["washer"].phase == "running"
    hass.states.async_set("sensor.power", "1")
    await hass.async_block_till_done()
    # Restart while the power is already low: the wait starts again.
    await manager.async_reload()
    await manager.rules["washer"].async_stop()
    await manager.rules["washer"].async_start()
    later(hass, 61)
    await hass.async_block_till_done()
    assert manager.rules["washer"].phase == "idle"
    assert calls["notify.phone"][-1].data["message"] == "Done"


async def test_auto_off_forgets_entities_that_left_the_rule(hass: HomeAssistant, calls):
    hass.states.async_set("switch.kettle", "on")
    manager = await setup(
        hass, "rules:\n  - id: kettle\n    type: auto_off\n    entity_id: switch.kettle\n    duration: 600\n"
    )
    rule = manager.rules["kettle"]
    later(hass, 16)  # the tick picks up the kettle, already on
    await hass.async_block_till_done()
    rule.data["timers"]["switch.gone"] = 0
    hass.states.async_set("switch.gone", "on")
    assert [t["entity_id"] for t in rule.timers()] == ["switch.kettle"]
    assert "switch.gone" not in rule.data["timers"]


async def test_vacuum_guard(hass: HomeAssistant, calls):
    hass.states.async_set("vacuum.robot", "cleaning")
    hass.states.async_set("sensor.room", "Hall")
    hass.states.async_set("binary_sensor.kitchen_window", "on")
    hass.states.async_set("climate.ac", "off")
    await setup(
        hass,
        """
rooms:
  Kitchen: {opening: binary_sensor.kitchen_window, climate: climate.ac}
rules:
  - {id: guard, type: vacuum_guard, vacuum: vacuum.robot, room_sensor: sensor.room}
""",
    )
    hass.states.async_set("climate.ac", "cool")
    hass.states.async_set("sensor.room", "Kitchen")
    await hass.async_block_till_done()
    assert not calls["vacuum.return_to_base"]  # the air conditioner runs
    hass.states.async_set("climate.ac", "off")
    hass.states.async_set("binary_sensor.kitchen_window", "off")
    await hass.async_block_till_done()
    hass.states.async_set("binary_sensor.kitchen_window", "on")
    await hass.async_block_till_done()
    assert calls["vacuum.return_to_base"][-1].data["entity_id"] == "vacuum.robot"


async def test_chime_window_and_volume(hass: HomeAssistant, calls):
    play = async_mock_service(hass, "media_player", "play_media")
    volume = async_mock_service(hass, "media_player", "volume_set")
    hass.states.async_set("binary_sensor.door", "off")
    hass.states.async_set("media_player.speaker", "idle", {"volume_level": 0.2})
    await setup(
        hass,
        """
rules:
  - id: chime
    type: sensor_chime
    trigger: {entity_id: binary_sensor.door}
    media_player: media_player.speaker
    media: media-source://chime.mp3
    volume: 0.4
    duration: 5
""",
    )
    hass.states.async_set("binary_sensor.door", "unavailable")
    hass.states.async_set("binary_sensor.door", "on")  # back online: not from off, no ring
    await hass.async_block_till_done()
    assert not play
    hass.states.async_set("binary_sensor.door", "off")
    hass.states.async_set("binary_sensor.door", "on")
    await hass.async_block_till_done()
    assert play[-1].data["media_content_id"] == "media-source://chime.mp3"
    later(hass, 6)
    await hass.async_block_till_done()
    assert [c.data["volume_level"] for c in volume] == [0.4, 0.2]


async def test_flash_colour_only_on_colour_lights(hass: HomeAssistant, calls):
    from custom_components.house_rules.rules.alerts import Flasher

    hass.states.async_set("light.rgb", "off", {"supported_color_modes": ["hs"]})
    hass.states.async_set("light.white", "off", {"supported_color_modes": ["brightness"]})
    manager = await setup(hass, "rules: []\n")
    rule = type("R", (), {"state": lambda self, e: hass.states.get(e), "manager": manager})()
    assert Flasher(rule, ["light.rgb", "light.white"], [255, 0, 0], "1hz", True).split() == (
        ["light.rgb"],
        ["light.white"],
    )


async def test_presence_light_when_it_gets_dark(hass: HomeAssistant, calls):
    hass.states.async_set("binary_sensor.presence", "on")
    hass.states.async_set("sensor.lux", "200")
    hass.states.async_set("light.hall", "off")
    await setup(
        hass,
        """
rooms:
  Hall: {light: light.hall, presence: binary_sensor.presence, illuminance: sensor.lux}
rules:
  - {id: hall, type: presence_light, room: Hall, dark_below: 30}
""",
    )
    hass.states.async_set("sensor.lux", "10")
    await hass.async_block_till_done()
    assert calls["light.turn_on"][-1].data["entity_id"] == "light.hall"


async def test_vacuum_moves_one_at_a_time(hass: HomeAssistant, calls):
    hass.states.async_set("vacuum.robot", "cleaning")
    hass.states.async_set("sensor.room", "Hall")
    for light in ("light.a", "light.b", "light.c"):
        hass.states.async_set(light, "off")
    manager = await setup(
        hass,
        """
rooms:
  A: {light: light.a}
  B: {light: light.b}
  C: {light: light.c}
rules:
  - {id: follow, type: vacuum_follow, vacuum: vacuum.robot, room_sensor: sensor.room}
""",
    )
    for room in ("A", "B", "C"):
        hass.states.async_set("sensor.room", room)
    await hass.async_block_till_done()
    assert manager.rules["follow"].lit == ["light.c"]
    assert manager.arbiter.holders("light.a") == set()


def _window(minutes_before: int, minutes_after: int) -> tuple[str, str]:
    now = dt_util.now()
    return (
        (now - timedelta(minutes=minutes_before)).strftime("%H:%M"),
        (now + timedelta(minutes=minutes_after)).strftime("%H:%M"),
    )


async def test_presence_light_sensors_and_on_after(hass: HomeAssistant, calls):
    for sensor in ("binary_sensor.motion", "binary_sensor.occupancy"):
        hass.states.async_set(sensor, "off")
    hass.states.async_set("light.hall", "off")
    await setup(
        hass,
        """
rooms:
  Hall: {light: light.hall}
rules:
  - id: hall
    type: presence_light
    room: Hall
    sensors: [binary_sensor.motion, binary_sensor.occupancy]
    on_after: 5
    transition: 2
""",
    )
    # Someone passing by: gone before 5 s, nothing turns on.
    hass.states.async_set("binary_sensor.motion", "on")
    await hass.async_block_till_done()
    later(hass, 2)
    hass.states.async_set("binary_sensor.motion", "off")
    await hass.async_block_till_done()
    later(hass, 10)
    await hass.async_block_till_done()
    assert not calls["light.turn_on"]
    # The second sensor sees someone who stays.
    hass.states.async_set("binary_sensor.occupancy", "on")
    await hass.async_block_till_done()
    later(hass, 6)
    await hass.async_block_till_done()
    assert calls["light.turn_on"][-1].data == {"entity_id": "light.hall", "transition": 2.0}


async def test_presence_light_slots(hass: HomeAssistant, calls):
    hass.states.async_set("binary_sensor.presence", "off")
    for light in ("light.lamp", "light.ceiling"):
        hass.states.async_set(light, "off")
    start, end = _window(60, 60)
    manager = await setup(
        hass,
        f"""
rooms:
  Hall: {{lights: [light.lamp, light.ceiling], presence: binary_sensor.presence}}
rules:
  - id: hall
    type: presence_light
    room: Hall
    off_delay: 30
    slots:
      - {{start: "{start}", end: "{end}", lights: [light.ceiling], off: true}}
      - {{start: "{start}", end: "{end}", lights: [light.lamp], brightness: 20, color: [0, 0, 255], off_delay: 300}}
""",
    )
    hass.states.async_set("binary_sensor.presence", "on")
    await hass.async_block_till_done()
    assert [c.data for c in calls["light.turn_on"]] == [
        {"entity_id": "light.lamp", "brightness_pct": 20, "rgb_color": [0, 0, 255]}
    ]
    hass.states.async_set("light.lamp", "on")
    hass.states.async_set("binary_sensor.presence", "off")
    await hass.async_block_till_done()
    later(hass, 60)
    await hass.async_block_till_done()
    assert not calls["light.turn_off"], "the slot's delay (5 min), not the rule's (30 s)"
    later(hass, 300)
    await hass.async_block_till_done()
    assert calls["light.turn_off"][-1].data["entity_id"] == "light.lamp"
    assert not manager.rules["hall"].lit


async def test_presence_light_slot_days(hass: HomeAssistant, calls):
    hass.states.async_set("binary_sensor.presence", "off")
    hass.states.async_set("light.hall", "off")
    start, end = _window(60, 60)
    other_days = [
        d for i, d in enumerate(("mon", "tue", "wed", "thu", "fri", "sat", "sun")) if i != dt_util.now().weekday()
    ]
    await setup(
        hass,
        f"""
rooms:
  Hall: {{light: light.hall, presence: binary_sensor.presence}}
rules:
  - id: hall
    type: presence_light
    room: Hall
    slots:
      - {{start: "{start}", end: "{end}", days: {other_days}, off: true}}
""",
    )
    hass.states.async_set("binary_sensor.presence", "on")
    await hass.async_block_till_done()
    assert calls["light.turn_on"][-1].data["entity_id"] == "light.hall", "the slot is for the other days"


async def test_presence_light_off_by_hand_stays_off(hass: HomeAssistant, calls):
    hass.states.async_set("binary_sensor.presence", "off")
    hass.states.async_set("sensor.lux", "5")
    hass.states.async_set("light.hall", "off")
    manager = await setup(
        hass,
        """
rooms:
  Hall: {light: light.hall, presence: binary_sensor.presence, illuminance: sensor.lux}
rules:
  - {id: hall, type: presence_light, room: Hall, dark_below: 30, off_delay: 10}
""",
    )
    hass.states.async_set("binary_sensor.presence", "on")
    await hass.async_block_till_done()
    assert len(calls["light.turn_on"]) == 1
    hass.states.async_set("light.hall", "on")
    await hass.async_block_till_done()
    # Turned off by hand (a context that isn't ours): not turned back on while someone is there.
    hass.states.async_set("light.hall", "off")
    await hass.async_block_till_done()
    rule = manager.rules["hall"]
    assert rule.by_hand == {"light.hall"} and not rule.lit
    hass.states.async_set("sensor.lux", "4")
    await hass.async_block_till_done()
    assert len(calls["light.turn_on"]) == 1
    # Once the room is empty, the next presence turns it on again.
    hass.states.async_set("binary_sensor.presence", "off")
    await hass.async_block_till_done()
    hass.states.async_set("binary_sensor.presence", "on")
    await hass.async_block_till_done()
    assert len(calls["light.turn_on"]) == 2


async def test_presence_light_leaves_a_room_lit_by_hand(hass: HomeAssistant, calls):
    hass.states.async_set("binary_sensor.presence", "off")
    hass.states.async_set("light.lamp", "on")
    hass.states.async_set("light.ceiling", "off")
    await setup(
        hass,
        """
rooms:
  Hall: {lights: [light.lamp, light.ceiling], presence: [binary_sensor.presence]}
rules:
  - {id: hall, type: presence_light, room: Hall}
""",
    )
    hass.states.async_set("binary_sensor.presence", "on")
    await hass.async_block_till_done()
    assert not calls["light.turn_on"], "the lamp is on by hand: the ceiling light stays off"


async def test_presence_light_not_during_naps(hass: HomeAssistant, calls):
    hass.states.async_set("binary_sensor.presence", "off")
    for light in ("light.hallway", "light.night"):
        hass.states.async_set(light, "off")
    start, end = _window(30, 30)
    manager = await setup(
        hass,
        f"""
rooms:
  Bedroom:
    naps: [{{start: "{start}", end: "{end}"}}]
  Hallway: {{lights: [light.hallway, light.night], presence: binary_sensor.presence}}
rules:
  - {{id: hallway, type: presence_light, room: Hallway, not_during_naps: [light.hallway]}}
""",
    )
    assert manager.napping() == ["Bedroom"]
    assert manager.conditions()["napping"] == ["Bedroom"]
    # A rule respecting the naps is paused during them.
    assert manager.blocked_by(["nap"]) == "nap"
    hass.states.async_set("binary_sensor.presence", "on")
    await hass.async_block_till_done()
    assert [c.data["entity_id"] for c in calls["light.turn_on"]] == ["light.night"]


async def test_naps_days(hass: HomeAssistant, calls):
    start, end = _window(30, 30)
    days = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
    other = days[(dt_util.now().weekday() + 1) % 7]
    manager = await setup(
        hass,
        f"""
rooms:
  Bedroom:
    naps: [{{start: "{start}", end: "{end}", days: [{other}]}}]
""",
    )
    assert manager.napping() == []


async def test_naps_entity(hass: HomeAssistant, calls):
    # A `schedule` helper (shared with other integrations) or an input_boolean: a nap while it is on.
    hass.states.async_set("schedule.nap_bedroom", "off")
    hass.states.async_set("input_boolean.nap", "off")
    manager = await setup(
        hass,
        """
rooms:
  Bedroom: {naps: [schedule.nap_bedroom, input_boolean.nap]}
""",
    )
    assert manager.napping() == []
    hass.states.async_set("schedule.nap_bedroom", "on")
    assert manager.napping() == ["Bedroom"]
    hass.states.async_set("schedule.nap_bedroom", "off")
    hass.states.async_set("input_boolean.nap", "on")
    assert manager.blocked_by(["nap"]) == "nap"


async def test_presence_light_slot_during_naps(hass: HomeAssistant, calls):
    # A slot that follows the naps of the house (here a `schedule` helper): the entrance at 40 % while it is on.
    hass.states.async_set("binary_sensor.presence", "off")
    hass.states.async_set("light.entrance", "off")
    hass.states.async_set("schedule.nap_bedroom", "on")
    await setup(
        hass,
        """
rooms:
  Bedroom: {naps: [schedule.nap_bedroom]}
  Entrance: {lights: [light.entrance], presence: binary_sensor.presence}
rules:
  - id: entrance
    type: presence_light
    room: Entrance
    slots:
      - {during_naps: true, brightness: 40}
""",
    )
    hass.states.async_set("binary_sensor.presence", "on")
    await hass.async_block_till_done()
    assert calls["light.turn_on"][-1].data == {"entity_id": "light.entrance", "brightness_pct": 40}


def test_slot_needs_hours_or_naps():
    assert SLOT({"during_naps": True, "brightness": 40})["during_naps"] is True
    with pytest.raises(vol.Invalid):
        SLOT({"brightness": 40})


async def test_presence_light_nap_starts(hass: HomeAssistant, calls):
    # Lit before the nap: a nap that starts turns the lights kept off during the naps off, not the others.
    hass.states.async_set("binary_sensor.presence", "off")
    hass.states.async_set("schedule.nap_bedroom", "off")
    for light in ("light.hallway", "light.night"):
        hass.states.async_set(light, "off")
    await setup(
        hass,
        """
rooms:
  Bedroom: {naps: [schedule.nap_bedroom]}
  Hallway: {lights: [light.hallway, light.night], presence: binary_sensor.presence}
rules:
  - {id: hallway, type: presence_light, room: Hallway, not_during_naps: [light.hallway]}
""",
    )
    hass.states.async_set("binary_sensor.presence", "on")
    await hass.async_block_till_done()
    assert sorted(c.data["entity_id"] for c in calls["light.turn_on"]) == ["light.hallway", "light.night"]
    for light in ("light.hallway", "light.night"):
        hass.states.async_set(light, "on")
    hass.states.async_set("schedule.nap_bedroom", "on")
    await hass.async_block_till_done()
    assert [c.data["entity_id"] for c in calls["light.turn_off"]] == ["light.hallway"]
