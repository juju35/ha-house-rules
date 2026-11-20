"""Proposals to start from what already exists: labels, automations and Smart Comfort's lights on presence.

Heuristics only: each proposal is shown in the panel, the user picks what to import. Imported automations are
turned off (never deleted). Smart Comfort is read from its config entry (its options, which `smart_comfort.yaml`
is synced into), never imported as code: its lights on presence stay on until removed there.
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr

if TYPE_CHECKING:
    from .manager import HouseRules

KEEP_ON_LABELS = ("rallumer prise", "keep on", "keep_on", "rallumage")
AUTO_OFF_LABELS = ("extinction automatique", "auto off", "auto_off", "timed off")
MAP_ITEM = re.compile(r"'([^']+)'\s*:\s*'((?:light|binary_sensor)\.[a-z0-9_]+)'")
NOT_ROOMS = {"action", "service", "entity_id", "domain", "type", "target", "trigger"}


def _room_map(text: str) -> list[tuple[str, str]]:
    """Room -> entity pairs of a Jinja map written in the automation (e.g. {'Kitchen': 'light.kitchen'})."""
    return [(name, entity) for name, entity in MAP_ITEM.findall(text) if name not in NOT_ROOMS]


def _slug(text: str) -> str:
    # Accents folded first: "Entrée" gives entree, not entr_e.
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:50] or "rule"


def _walk(node: Any):
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from _walk(value)
    elif isinstance(node, list):
        for value in node:
            yield from _walk(value)


def _entities(node: Any, domain: str) -> list[str]:
    out: list[str] = []
    for item in _walk(node):
        for key in ("entity_id", "target"):
            value = item.get(key)
            if isinstance(value, dict):
                value = value.get("entity_id")
            for e in [value] if isinstance(value, str) else value or []:
                if isinstance(e, str) and e.startswith(f"{domain}.") and e not in out:
                    out.append(e)
    return out


def _services(node: Any) -> list[str]:
    return [i.get("action") or i.get("service") for i in _walk(node) if i.get("action") or i.get("service")]


def _duration(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        h, m, s = value.get("hours", 0), value.get("minutes", 0), value.get("seconds", 0)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d}"
    return None


def _device_switch(hass: HomeAssistant, actions: Any) -> str | None:
    """A device action `turn_on` on a switch: its entity id (the registry id is resolved)."""
    registry = er.async_get(hass)
    for item in _walk(actions):
        if item.get("domain") == "switch" and item.get("type") == "turn_on" and item.get("entity_id"):
            entry = registry.async_get(item["entity_id"])
            if entry:
                return entry.entity_id
    return None


def proposals_from_automations(hass: HomeAssistant, automations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for auto in automations:
        if not isinstance(auto, dict):
            continue
        alias = str(auto.get("alias") or auto.get("id") or "")
        triggers = auto.get("triggers") or auto.get("trigger") or []
        actions = auto.get("actions") or auto.get("action") or []
        services = _services(actions)
        trig = triggers[0] if isinstance(triggers, list) and triggers else {}
        trig_entity = trig.get("entity_id")
        trig_entity = trig_entity[0] if isinstance(trig_entity, list) and trig_entity else trig_entity
        text = repr(auto)
        rule: dict[str, Any] | None = None
        rooms: dict[str, Any] = {}
        if "repeat" in text and "rgb_color" in text and "light.turn_on" in services and trig_entity:
            lights = _entities(actions, "light")
            rule = {
                "type": "sensor_flash",
                "trigger": {"entity_id": trig_entity, "to": str(trig.get("to", "on"))},
                "lights": lights,
                "color": [255, 0, 0],
                "respect": ["quiet_hours"],
            }
            if dur := _duration(trig.get("for")):
                rule["trigger"]["for"] = dur
        elif "vacuum.return_to_base" in services:
            vac = _entities(actions, "vacuum")
            room_sensor = next((e for e in _entities(triggers, "sensor")), None)
            if vac and room_sensor:
                rule = {"type": "vacuum_guard", "vacuum": vac[0], "room_sensor": room_sensor}
                for name, entity in _room_map(text):
                    if entity.startswith("binary_sensor."):
                        rooms.setdefault(name, {})["opening"] = entity
        elif trig_entity and "piece" in trig_entity and "light.turn_on" in services:
            room_sensor = trig_entity
            vacuum = (
                next(iter(_entities(actions, "vacuum")), None)
                or room_sensor.replace("sensor.", "vacuum.").split("_piece")[0]
            )
            rule = {"type": "vacuum_follow", "vacuum": vacuum, "room_sensor": room_sensor, "transition": 10}
            for name, entity in _room_map(text):
                if entity.startswith("light."):
                    rooms.setdefault(name, {})["light"] = entity
        elif trig.get("to") in ("unavailable", ["unavailable"]) and (switch := _device_switch(hass, actions)):
            rule = {"type": "appliance_resume", "switch": switch, "progress": trig_entity}
        elif ("lock.lock" in services and trig.get("domain") == "binary_sensor") or (
            "lock.lock" in services and trig.get("type") == "not_opened"
        ):
            lock = next(iter(_entities(actions, "lock")), None)
            door_entry = er.async_get(hass).async_get(trig.get("entity_id", "")) if trig.get("entity_id") else None
            if lock:
                rule = {"type": "lock_guard", "lock": lock, "lock_after": _duration(trig.get("for")) or "00:00:30"}
                if door_entry:
                    rule["door"] = door_entry.entity_id
        elif "media_player.volume_set" in services and trig_entity and trig_entity.startswith("binary_sensor."):
            players = _entities(actions, "media_player")
            scripts = _entities(actions, "script")
            if players:
                rule = {
                    "type": "sensor_chime",
                    "trigger": {"entity_id": trig_entity, "from": "off", "to": "on"},
                    "media_player": players[0],
                    "volume": 0.4,
                }
                if scripts:
                    rule["script"] = scripts[0]
        if rule:
            rule = {"id": _slug(alias), "name": alias, **rule}
            out.append(
                {"source": "automation", "automation": auto.get("id"), "alias": alias, "rule": rule, "rooms": rooms}
            )
    return out


SMART_COMFORT = "smart_comfort"


def _list(value: Any) -> list[Any]:
    if not value:
        return []
    return list(value) if isinstance(value, (list, tuple)) else [value]


def _hms(seconds: float) -> str:
    total = round(seconds)
    return f"{total // 3600:02d}:{total % 3600 // 60:02d}:{total % 60:02d}"


def _sc_room(raw: dict[str, Any]) -> dict[str, Any]:
    """A House Rules room from a Smart Comfort room: lights, presence sensors, light level sensor and naps."""
    room: dict[str, Any] = {}
    lights = [e if isinstance(e, str) else e.get("entity_id") for e in _list(raw.get("lights"))]
    if lights := [e for e in lights if e]:
        room["lights"] = lights
    presence = raw.get("presence") or {}
    if sensors := _list(presence.get("sensors")):
        room["presence"] = sensors
    if presence.get("lux"):
        room["illuminance"] = presence["lux"]
    if naps := _list(raw.get("naps")):
        room["naps"] = naps  # Same format: slots (start, end, days) or on/off entities.
    return room


def _sc_slot(raw: dict[str, Any]) -> dict[str, Any]:
    slot = {k: raw[k] for k in ("start", "end", "days", "lights", "brightness", "color", "during_naps") if raw.get(k)}
    # YAML 1.1 reads an unquoted `off:` key as False, which the config entry storage then saves as "false".
    if raw.get("off") or raw.get(False) or raw.get("false"):
        slot["off"] = True
    if raw.get("off_after") is not None:
        slot["off_delay"] = _hms(float(raw["off_after"]) * 60)
    return slot


def proposals_from_smart_comfort(options: dict[str, Any], taken: set[str]) -> list[dict[str, Any]]:
    """A `presence_light` rule per Smart Comfort room with lights on presence (not those already in `taken`), with
    its room; the naps of every room come along, as `not_during_naps` and `during_naps` depend on them."""
    rooms = [r for r in _list(options.get("rooms")) if isinstance(r, dict) and r.get("name")]
    napping = {r["name"]: _sc_room(r) for r in rooms if r.get("naps")}
    out: list[dict[str, Any]] = []
    for raw in rooms:
        presence = raw.get("presence") or {}
        name = str(raw["name"])
        if not presence.get("sensors") or name in taken:
            continue
        rule: dict[str, Any] = {"id": _slug(f"presence_{name}"), "name": name, "type": "presence_light", "room": name}
        if presence.get("lights"):
            rule["lights"] = _list(presence["lights"])
        if presence.get("max_lux") is not None:
            rule["dark_below"] = float(presence["max_lux"])
        if presence.get("on_after"):
            rule["on_after"] = _hms(float(presence["on_after"]))
        rule["off_delay"] = _hms(float(presence.get("off_after", 2)) * 60)  # Smart Comfort: minutes, 2 by default.
        if presence.get("transition") is not None:
            rule["transition"] = float(presence["transition"])
        if not_during := _list(presence.get("not_during_naps")):
            rule["not_during_naps"] = not_during
        if slots := [_sc_slot(s) for s in _list(presence.get("slots")) if isinstance(s, dict)]:
            rule["slots"] = slots
        out.append(
            {
                "source": SMART_COMFORT,
                "alias": f"Smart Comfort · {name}",
                "rule": rule,
                "rooms": {**napping, name: _sc_room(raw)},
            }
        )
    return out


def _read_automations(path: Path) -> list[dict[str, Any]]:
    from ruamel.yaml import YAML

    if not path.is_file():
        return []
    try:
        data = YAML(typ="safe").load(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return []
    return data if isinstance(data, list) else []


async def analyze(hass: HomeAssistant, manager: HouseRules) -> dict[str, Any]:
    proposals: list[dict[str, Any]] = []
    existing = {r.get("label") for r in manager.raw.get("rules", []) if r.get("label")}
    for label in lr.async_get(hass).async_list_labels():
        name = label.name.casefold()
        if label.name in existing:
            continue
        if name in KEEP_ON_LABELS:
            proposals.append(
                {
                    "source": "label",
                    "label": label.name,
                    "rule": {
                        "id": _slug(f"keep_on_{label.name}"),
                        "name": label.name,
                        "type": "keep_on",
                        "label": label.name,
                    },
                }
            )
        elif name in AUTO_OFF_LABELS:
            proposals.append(
                {
                    "source": "label",
                    "label": label.name,
                    "rule": {
                        "id": _slug(f"auto_off_{label.name}"),
                        "name": label.name,
                        "type": "auto_off",
                        "label": label.name,
                    },
                }
            )
    automations = await hass.async_add_executor_job(_read_automations, Path(hass.config.path("automations.yaml")))
    proposals.extend(proposals_from_automations(hass, automations))
    # A room that already has a presence_light rule is not proposed again.
    taken = {str(r.get("room")) for r in manager.raw.get("rules", []) if r.get("type") == "presence_light"}
    for entry in hass.config_entries.async_entries(SMART_COMFORT):
        proposals.extend(proposals_from_smart_comfort(dict(entry.options), taken))
    registry = er.async_get(hass)
    for item in proposals:
        if item.get("automation"):
            entity = registry.async_get_entity_id("automation", "automation", str(item["automation"]))
            item["automation_entity"] = entity
    return {"proposals": proposals}
