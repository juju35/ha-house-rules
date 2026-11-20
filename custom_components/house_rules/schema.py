"""Validation of the configuration: the same shape in house_rules.yaml, in storage and in the panel."""

from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

import voluptuous as vol
from homeassistant.helpers import config_validation as cv

from .const import (
    APPLIANCE_RESUME,
    AUTO_OFF,
    CONDITIONS,
    CYCLE_DONE,
    KEEP_ON,
    LEAK_GUARD,
    LOCK_GUARD,
    PRESENCE_LIGHT,
    RULE_TYPES,
    SENSOR_CHIME,
    SENSOR_FLASH,
    VACUUM_FOLLOW,
    VACUUM_GUARD,
    WEEKDAYS,
)

ID_RE = re.compile(r"^[a-z0-9][a-z0-9_]{0,63}$")
ENTITIES = vol.All(cv.ensure_list, [cv.entity_id])
DURATION = vol.All(cv.time_period, cv.positive_timedelta)
TIME = cv.time
RGB = vol.All(vol.ExactSequence((cv.byte, cv.byte, cv.byte)), vol.Coerce(list))
RESPECT = vol.All(cv.ensure_list, [vol.In(CONDITIONS)])
WINDOW = vol.Schema({vol.Required("start"): TIME, vol.Required("end"): TIME})
PERCENT = vol.All(vol.Coerce(int), vol.Range(min=1, max=100))
DELAY = vol.All(cv.time_period, vol.Range(min=timedelta(0)))
# A nap of a room: start, end and optionally the days (every day when none).
NAP = vol.Schema(
    {
        vol.Required("start"): TIME,
        vol.Required("end"): TIME,
        vol.Optional("days"): vol.All(cv.ensure_list, [vol.In(WEEKDAYS)]),
    }
)
# A time slot of presence lights: some lights (all when none) kept off, or turned on at a brightness / colour, with
# their own delay before off. The first slot that applies to a light decides.
SLOT = vol.Schema(
    {
        vol.Required("start"): TIME,
        vol.Required("end"): TIME,
        vol.Optional("days"): vol.All(cv.ensure_list, [vol.In(WEEKDAYS)]),
        vol.Optional("lights"): ENTITIES,
        vol.Optional("off", default=False): cv.boolean,
        vol.Optional("brightness"): PERCENT,
        vol.Optional("color"): RGB,
        vol.Optional("off_delay"): DURATION,
    }
)


def rule_id(value: Any) -> str:
    value = cv.string(value)
    if not ID_RE.match(value):
        raise vol.Invalid("id: lower case letters, digits and _ only (max 64)")
    return value


def _targets(data: dict[str, Any]) -> dict[str, Any]:
    """A rule acting on entities takes entity_id and/or label."""
    if not data.get("entity_id") and not data.get("label"):
        raise vol.Invalid("entity_id or label is required")
    return data


TRIGGER = vol.Schema(
    {
        vol.Required("entity_id"): cv.entity_id,
        vol.Optional("to", default="on"): cv.string,
        vol.Optional("from"): cv.string,
        vol.Optional("for"): DURATION,
    }
)

ESCALATION_STEP = vol.Schema(
    {
        vol.Required("after"): DURATION,
        vol.Optional("chime"): cv.entity_id,
        vol.Optional("media"): cv.string,
        vol.Optional("notify"): vol.In(("normal", "critical")),
        vol.Optional("message"): cv.string,
    }
)

COMMON = {
    vol.Required("id"): rule_id,
    vol.Required("type"): vol.In(RULE_TYPES),
    vol.Optional("name"): cv.string,
    vol.Optional("enabled", default=True): cv.boolean,
    vol.Optional("respect", default=list): RESPECT,
    vol.Optional("notify"): cv.string,
}

TYPE_SCHEMAS: dict[str, vol.Schema] = {
    KEEP_ON: vol.All(
        vol.Schema(
            {
                **COMMON,
                vol.Optional("entity_id", default=list): ENTITIES,
                vol.Optional("label"): cv.string,
                vol.Optional("delay", default="00:00:10"): DURATION,
                vol.Optional("max_attempts", default=3): vol.All(vol.Coerce(int), vol.Range(min=1, max=20)),
                vol.Optional("window", default="01:00:00"): DURATION,
            }
        ),
        _targets,
    ),
    AUTO_OFF: vol.All(
        vol.Schema(
            {
                **COMMON,
                vol.Optional("entity_id", default=list): ENTITIES,
                vol.Optional("label"): cv.string,
                vol.Optional("duration"): DURATION,
                vol.Optional("power_entity"): cv.entity_id,
                vol.Optional("power_above"): vol.Coerce(float),
            }
        ),
        _targets,
    ),
    SENSOR_FLASH: vol.Schema(
        {
            **COMMON,
            vol.Required("trigger"): TRIGGER,
            vol.Required("lights"): ENTITIES,
            vol.Optional("color", default=[255, 0, 0]): RGB,
            vol.Optional("rate", default="1hz"): vol.In(("1hz", "2hz", "pulse")),
            vol.Optional("restore", default=True): cv.boolean,
            vol.Optional("message"): cv.string,
            vol.Optional("critical", default=False): cv.boolean,
            vol.Optional("escalation", default=list): [ESCALATION_STEP],
        }
    ),
    SENSOR_CHIME: vol.Schema(
        {
            **COMMON,
            vol.Required("trigger"): TRIGGER,
            vol.Required("media_player"): cv.entity_id,
            vol.Optional("media"): cv.string,
            vol.Optional("script"): cv.entity_id,
            vol.Optional("volume"): vol.All(vol.Coerce(float), vol.Range(min=0, max=1)),
            vol.Optional("duration", default="00:00:20"): DURATION,
            vol.Optional("windows", default=list): [WINDOW],
        }
    ),
    APPLIANCE_RESUME: vol.Schema(
        {
            **COMMON,
            vol.Required("switch"): cv.entity_id,
            vol.Optional("progress"): cv.entity_id,
            vol.Optional("delay", default="00:00:05"): DURATION,
            vol.Optional("max_attempts", default=2): vol.All(vol.Coerce(int), vol.Range(min=1, max=10)),
            vol.Optional("power_on_at"): TIME,
        }
    ),
    CYCLE_DONE: vol.Schema(
        {
            **COMMON,
            vol.Optional("power_entity"): cv.entity_id,
            vol.Optional("start_above", default=10.0): vol.Coerce(float),
            vol.Optional("done_below", default=3.0): vol.Coerce(float),
            vol.Optional("done_for", default="00:03:00"): DURATION,
            vol.Optional("state_entity"): cv.entity_id,
            vol.Optional("done_states", default=list): vol.All(cv.ensure_list, [cv.string]),
            vol.Optional("door"): cv.entity_id,
            vol.Optional("reminder"): DURATION,
            vol.Optional("max_reminders", default=3): vol.All(vol.Coerce(int), vol.Range(min=0, max=20)),
            vol.Optional("message"): cv.string,
        }
    ),
    VACUUM_FOLLOW: vol.Schema(
        {
            **COMMON,
            vol.Required("vacuum"): cv.entity_id,
            vol.Required("room_sensor"): cv.entity_id,
            vol.Optional("transition", default=10): vol.All(vol.Coerce(float), vol.Range(min=0, max=300)),
            vol.Optional("dark_below"): vol.Coerce(float),
            vol.Optional("off_at_dock", default=True): cv.boolean,
        }
    ),
    VACUUM_GUARD: vol.Schema(
        {
            **COMMON,
            vol.Required("vacuum"): cv.entity_id,
            vol.Required("room_sensor"): cv.entity_id,
            vol.Optional("message"): cv.string,
        }
    ),
    PRESENCE_LIGHT: vol.Schema(
        {
            **COMMON,
            vol.Required("room"): cv.string,
            vol.Optional("sensors"): ENTITIES,
            vol.Optional("lights"): ENTITIES,
            vol.Optional("dark_below"): vol.Coerce(float),
            vol.Optional("hysteresis", default=5.0): vol.Coerce(float),
            vol.Optional("on_after", default=0): DELAY,
            vol.Optional("off_delay", default="00:00:30"): DURATION,
            vol.Optional("transition"): vol.All(vol.Coerce(float), vol.Range(min=0)),
            vol.Optional("windows", default=list): [WINDOW],
            vol.Optional("brightness"): PERCENT,
            vol.Optional("brightness_entity"): cv.entity_id,
            vol.Optional("slots", default=list): [SLOT],
            vol.Optional("not_during_naps"): vol.Any(cv.boolean, ENTITIES),
        }
    ),
    LOCK_GUARD: vol.Schema(
        {
            **COMMON,
            vol.Required("lock"): cv.entity_id,
            vol.Optional("door"): cv.entity_id,
            vol.Optional("lock_after", default="00:00:30"): DURATION,
            vol.Optional("alarm"): cv.entity_id,
            vol.Optional("lock_on_arm_after", default="00:01:00"): DURATION,
            vol.Optional("disarm_on_unlock", default=False): cv.boolean,
        }
    ),
    LEAK_GUARD: vol.Schema(
        {
            **COMMON,
            vol.Required("sensors"): ENTITIES,
            vol.Optional("cut", default=list): ENTITIES,
            vol.Optional("lights", default=list): ENTITIES,
            vol.Optional("chime"): cv.entity_id,
            vol.Optional("media"): cv.string,
            vol.Optional("message"): cv.string,
            vol.Optional("critical", default=True): cv.boolean,
        }
    ),
}


def validate_rule(data: dict[str, Any]) -> dict[str, Any]:
    """One rule, checked against the schema of its type."""
    if not isinstance(data, dict):
        raise vol.Invalid("a rule is a mapping")
    kind = data.get("type")
    if kind not in TYPE_SCHEMAS:
        raise vol.Invalid(f"unknown type: {kind}")
    return TYPE_SCHEMAS[kind](dict(data))


ROOM = vol.Schema(
    {
        vol.Optional("light"): cv.entity_id,
        vol.Optional("lights", default=list): ENTITIES,
        vol.Optional("opening"): ENTITIES,
        vol.Optional("climate"): cv.entity_id,
        vol.Optional("presence"): vol.Any(cv.entity_id, ENTITIES),
        vol.Optional("illuminance"): cv.entity_id,
        vol.Optional("naps", default=list): vol.All(cv.ensure_list, [NAP]),
    },
    extra=vol.ALLOW_EXTRA,
)

SETTINGS = vol.Schema(
    {
        vol.Optional("quiet_hours"): vol.Any(None, WINDOW),
        vol.Optional("notify"): vol.Any(None, cv.string),
        vol.Optional("alarm"): vol.Any(None, cv.entity_id),
        vol.Optional("repairs", default=True): cv.boolean,
    },
    extra=vol.ALLOW_EXTRA,
)


def validate_config(data: dict[str, Any] | None) -> dict[str, Any]:
    """The whole configuration: settings, rooms and rules; rule ids unique."""
    data = dict(data or {})
    out: dict[str, Any] = {
        "settings": SETTINGS(dict(data.get("settings") or {})),
        "rooms": {cv.string(k): ROOM(dict(v or {})) for k, v in (data.get("rooms") or {}).items()},
        "rules": [],
    }
    seen: set[str] = set()
    for raw in data.get("rules") or []:
        rule = validate_rule(raw)
        if rule["id"] in seen:
            raise vol.Invalid(f"duplicate rule id: {rule['id']}")
        seen.add(rule["id"])
        out["rules"].append(rule)
    return out
