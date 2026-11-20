"""Setup, WebSocket API and actions."""

from __future__ import annotations

from pathlib import Path

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.house_rules.const import DOMAIN


async def _setup(hass: HomeAssistant, text: str | None = None):
    if text is not None:
        Path(hass.config.path("house_rules.yaml")).write_text(text, encoding="utf-8")
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_config_flow_single_entry(hass: HomeAssistant):
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] == "form"
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] == "create_entry"
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] == "abort"


async def test_websocket_save_rule_to_yaml(hass: HomeAssistant, hass_ws_client):
    await _setup(hass, "# keep me\nrules: []\n")
    client = await hass_ws_client(hass)
    await client.send_json(
        {"id": 1, "type": "house_rules/rule/save", "yaml": "id: a\ntype: keep_on\nentity_id: switch.a\n"}
    )
    msg = await client.receive_json()
    assert msg["success"], msg
    text = Path(hass.config.path("house_rules.yaml")).read_text(encoding="utf-8")
    assert "id: a" in text and "# keep me" in text
    await client.send_json({"id": 2, "type": "house_rules/rule/save", "yaml": "id: b\ntype: nope\n"})
    msg = await client.receive_json()
    assert not msg["success"] and msg["error"]["code"] == "invalid"


async def test_websocket_conflict(hass: HomeAssistant, hass_ws_client):
    entry = await _setup(hass, "rules:\n  - id: a\n    type: keep_on\n    entity_id: switch.a\n")
    path = Path(hass.config.path("house_rules.yaml"))
    path.write_text(path.read_text(encoding="utf-8").replace("switch.a", "switch.z"), encoding="utf-8")
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "house_rules/rule/save",
            "yaml": "id: a\ntype: keep_on\nentity_id: switch.b\n",
            "previous_id": "a",
        }
    )
    msg = await client.receive_json()
    assert not msg["success"] and msg["error"]["code"] == "conflict"
    assert entry.runtime_data.rules["a"].cfg["entity_id"] == ["switch.a"]


async def test_subscribe_hides_config_from_non_admin(hass: HomeAssistant, hass_ws_client, hass_admin_user):
    await _setup(hass, "rules:\n  - id: a\n    type: keep_on\n    entity_id: switch.a\n")
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "house_rules/subscribe"})
    assert (await client.receive_json())["success"]
    event = await client.receive_json()
    assert event["event"]["rules"][0]["id"] == "a"
    assert "raw" in event["event"]


async def test_enable_yaml_from_storage(hass: HomeAssistant, hass_ws_client):
    entry = await _setup(hass)
    await entry.runtime_data.async_save_rule({"id": "a", "type": "keep_on", "entity_id": "switch.a"})
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "house_rules/yaml/enable"})
    assert (await client.receive_json())["success"]
    assert entry.runtime_data.source.mode == "yaml"
    assert "id: a" in Path(hass.config.path("house_rules.yaml")).read_text(encoding="utf-8")


async def test_export_service(hass: HomeAssistant):
    await _setup(hass, "rules:\n  - id: a\n    type: keep_on\n    entity_id: switch.a\n")
    res = await hass.services.async_call(DOMAIN, "export_yaml", {}, blocking=True, return_response=True)
    assert "id: a" in res["yaml"]


async def test_disable_rule_from_switch(hass: HomeAssistant):
    entry = await _setup(hass, "rules:\n  - id: a\n    type: keep_on\n    entity_id: switch.a\n")
    await hass.services.async_call("switch", "turn_off", {"entity_id": "switch.a_enabled"}, blocking=True)
    await hass.async_block_till_done()
    assert "enabled: false" in Path(hass.config.path("house_rules.yaml")).read_text(encoding="utf-8")
    assert entry.runtime_data.rules["a"].status()["state"] == "disabled"


async def test_import_proposals(hass: HomeAssistant):
    from custom_components.house_rules.importer import proposals_from_automations

    autos = [
        {
            "id": "1",
            "alias": "Alerte tableau électrique ouvert",
            "triggers": [{"trigger": "state", "entity_id": "binary_sensor.panel", "to": "on", "for": "00:02:00"}],
            "actions": [
                {
                    "repeat": {
                        "sequence": [
                            {
                                "action": "light.turn_on",
                                "target": {"entity_id": ["light.hall"]},
                                "data": {"rgb_color": [255, 0, 0]},
                            }
                        ]
                    }
                }
            ],
        },
        {
            "id": "2",
            "alias": "Aspirateur - Lumière selon pièce",
            "triggers": [{"trigger": "state", "entity_id": "sensor.saros_20_set_piece_actuelle"}],
            "actions": [
                {"variables": {"map": "{% set map = {'Cuisine': 'light.cuisine'} %}"}},
                {"action": "light.turn_on", "target": {"entity_id": "{{ x }}"}},
            ],
        },
    ]
    found = proposals_from_automations(hass, autos)
    assert [p["rule"]["type"] for p in found] == ["sensor_flash", "vacuum_follow"]
    assert found[0]["rule"]["trigger"]["for"] == "00:02:00"
    assert found[1]["rooms"] == {"Cuisine": {"light": "light.cuisine"}}


async def test_yaml_tab_get_and_save(hass: HomeAssistant, hass_ws_client):
    entry = await _setup(hass, "# whole file\nrules:\n  - id: a\n    type: keep_on\n    entity_id: switch.a\n")
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "house_rules/yaml/get"})
    res = (await client.receive_json())["result"]
    assert res["mode"] == "yaml" and "# whole file" in res["text"]
    new = res["text"].replace("switch.a", "switch.b")
    await client.send_json({"id": 2, "type": "house_rules/yaml/save", "text": new, "hash": res["hash"]})
    assert (await client.receive_json())["success"]
    assert entry.runtime_data.rules["a"].cfg["entity_id"] == ["switch.b"]
    # stale hash: refused, current text returned
    await client.send_json({"id": 3, "type": "house_rules/yaml/save", "text": res["text"], "hash": res["hash"]})
    msg = await client.receive_json()
    assert msg["error"]["code"] == "conflict" and "switch.b" in msg["error"]["data"]["current"]
    # invalid rule: refused, file untouched
    await client.send_json({"id": 4, "type": "house_rules/yaml/get"})
    res = (await client.receive_json())["result"]
    await client.send_json(
        {"id": 5, "type": "house_rules/yaml/save", "text": "rules:\n  - id: x\n    type: nope\n", "hash": res["hash"]}
    )
    assert (await client.receive_json())["error"]["code"] == "invalid"
    assert "switch.b" in Path(hass.config.path("house_rules.yaml")).read_text(encoding="utf-8")


async def test_import_apply(hass: HomeAssistant, hass_ws_client):
    entry = await _setup(hass, "rooms:\n  Kitchen: {light: light.kitchen_main}\nrules: []\n")
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "house_rules/import/apply",
            "rules": [{"id": "follow", "type": "vacuum_follow", "vacuum": "vacuum.r", "room_sensor": "sensor.r"}],
            "rooms": {"Kitchen": {"light": "light.kitchen"}, "Hall": {"light": "light.hall"}},
            "automations": [],
        }
    )
    assert (await client.receive_json())["success"]
    manager = entry.runtime_data
    assert "follow" in manager.rules
    assert manager.raw["rooms"]["Kitchen"]["light"] == "light.kitchen_main"  # existing room kept
    assert manager.raw["rooms"]["Hall"]["light"] == "light.hall"


async def test_actions_need_admin_except_acknowledge(hass: HomeAssistant, hass_ws_client, hass_read_only_access_token):
    await _setup(hass, "rules:\n  - id: a\n    type: keep_on\n    entity_id: switch.a\n")
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json({"id": 1, "type": "house_rules/action", "rule": "a", "action": "snooze", "minutes": 5})
    assert (await client.receive_json())["error"]["code"] == "unauthorized"
    await client.send_json({"id": 2, "type": "house_rules/action", "rule": "a", "action": "acknowledge"})
    assert (await client.receive_json())["success"]


async def test_rule_device_follows_rename(hass: HomeAssistant):
    from homeassistant.helpers import device_registry as dr

    entry = await _setup(hass, "rules:\n  - id: a\n    type: keep_on\n    entity_id: switch.a\n")
    await entry.runtime_data.async_save_rule({"id": "a", "name": "Box", "type": "keep_on", "entity_id": "switch.a"})
    await hass.async_block_till_done()
    devices = dr.async_entries_for_config_entry(dr.async_get(hass), entry.entry_id)
    assert "Box" in [d.name for d in devices]


async def test_quiet_hours_can_be_cleared(hass: HomeAssistant):
    entry = await _setup(hass, 'settings:\n  quiet_hours: {start: "00:00", end: "23:59"}\nrules: []\n')
    manager = entry.runtime_data
    await manager.async_save_section("settings", {"quiet_hours": None})
    assert manager.settings["quiet_hours"] is None
    assert not manager.quiet()


SMART_COMFORT_OPTIONS = {
    "rooms": [
        {"name": "Bedroom", "lights": ["light.bedroom"], "naps": ["schedule.nap_bedroom"]},
        {
            "name": "Entrance",
            "lights": [{"entity_id": "light.entrance", "night_only": True}],
            "presence": {
                "sensors": ["binary_sensor.entrance"],
                "lights": ["light.entrance", "light.hallway"],
                "lux": "sensor.entrance_lux",
                "max_lux": 5.9,
                "on_after": 5,
                "off_after": 0.17,
                "transition": 10,
                "not_during_naps": ["light.hallway"],
                "slots": [
                    {"start": "06:30", "end": "08:00", "days": ["mon", "fri"], "off": True},
                    {"during_naps": True, "lights": ["light.entrance"], "brightness": 40},
                    {"start": "17:00", "end": "00:00", "color": [0, 0, 255], "off_after": 22},
                    {"start": "20:00", "end": "09:00", "lights": ["light.hallway"], False: True},
                    {"start": "10:00", "end": "20:00", "lights": ["light.hallway"], "false": True},
                ],
            },
        },
        {"name": "Living room", "lights": ["light.living"]},
        {"name": "Entrée", "presence": {"sensors": ["binary_sensor.door"]}},
    ]
}


async def test_import_smart_comfort(hass: HomeAssistant, hass_ws_client):
    # Smart Comfort's lights on presence, read from its config entry: a presence_light rule per room, with its room
    # and the naps of the house.
    entry = await _setup(hass, "rules: []\n")
    MockConfigEntry(domain="smart_comfort", title="Smart Comfort", options=SMART_COMFORT_OPTIONS).add_to_hass(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "house_rules/import/analyze"})
    proposals = [p for p in (await client.receive_json())["result"]["proposals"] if p["source"] == "smart_comfort"]
    assert [p["rule"]["id"] for p in proposals] == ["presence_entrance", "presence_entree"]
    found = proposals[0]
    assert found["rule"] == {
        "id": "presence_entrance",
        "name": "Entrance",
        "type": "presence_light",
        "room": "Entrance",
        "lights": ["light.entrance", "light.hallway"],
        "dark_below": 5.9,
        "on_after": "00:00:05",
        "off_delay": "00:00:10",
        "transition": 10.0,
        "not_during_naps": ["light.hallway"],
        "slots": [
            {"start": "06:30", "end": "08:00", "days": ["mon", "fri"], "off": True},
            {"lights": ["light.entrance"], "brightness": 40, "during_naps": True},
            {"start": "17:00", "end": "00:00", "color": [0, 0, 255], "off_delay": "00:22:00"},
            {"start": "20:00", "end": "09:00", "lights": ["light.hallway"], "off": True},
            {"start": "10:00", "end": "20:00", "lights": ["light.hallway"], "off": True},
        ],
    }
    assert found["rooms"] == {
        "Bedroom": {"lights": ["light.bedroom"], "naps": ["schedule.nap_bedroom"]},
        "Entrance": {
            "lights": ["light.entrance"],
            "presence": ["binary_sensor.entrance"],
            "illuminance": "sensor.entrance_lux",
        },
    }
    # Applied: a valid rule and its rooms; analysed again, the room is not proposed twice.
    await client.send_json(
        {"id": 2, "type": "house_rules/import/apply", "rules": [found["rule"]], "rooms": found["rooms"]}
    )
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    manager = entry.runtime_data
    assert manager.rules["presence_entrance"].status()["state"] != "error"
    assert manager.rooms["Bedroom"]["naps"] == ["schedule.nap_bedroom"]
    await client.send_json({"id": 3, "type": "house_rules/import/analyze"})
    left = [
        p["rule"]["room"]
        for p in (await client.receive_json())["result"]["proposals"]
        if p["source"] == "smart_comfort"
    ]
    assert left == ["Entrée"]


async def test_diagnostics_redact_notification_targets(hass: HomeAssistant):
    from custom_components.house_rules.diagnostics import async_get_config_entry_diagnostics

    entry = await _setup(
        hass,
        "settings: {notify: notify.phone}\nrules:\n"
        "  - id: a\n    type: keep_on\n    entity_id: switch.a\n    notify: notify.tablet\n",
    )
    diag = await async_get_config_entry_diagnostics(hass, entry)
    assert set(diag) == {"source", "raw", "errors", "rules", "conditions", "claims", "journal"}
    text = str(diag)
    assert "notify.phone" not in text and "notify.tablet" not in text
    assert "switch.a" in text
