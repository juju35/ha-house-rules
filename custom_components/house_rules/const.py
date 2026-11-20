"""Constants of House Rules."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "house_rules"
TITLE: Final = "House Rules"
PANEL_URL: Final = "house-rules"
PANEL_ICON: Final = "house-rules:emblem"

YAML_FILE: Final = "house_rules.yaml"
STORAGE_KEY: Final = DOMAIN
STORAGE_VERSION: Final = 1

SIGNAL_UPDATE: Final = f"{DOMAIN}_update"
SIGNAL_RULES: Final = f"{DOMAIN}_rules"
EVENT_FIRED: Final = f"{DOMAIN}_fired"

# Rule types, in the order the panel lists them.
KEEP_ON: Final = "keep_on"
AUTO_OFF: Final = "auto_off"
SENSOR_FLASH: Final = "sensor_flash"
SENSOR_CHIME: Final = "sensor_chime"
APPLIANCE_RESUME: Final = "appliance_resume"
CYCLE_DONE: Final = "cycle_done"
VACUUM_FOLLOW: Final = "vacuum_follow"
VACUUM_GUARD: Final = "vacuum_guard"
PRESENCE_LIGHT: Final = "presence_light"
LOCK_GUARD: Final = "lock_guard"
LEAK_GUARD: Final = "leak_guard"

RULE_TYPES: Final = (
    KEEP_ON,
    AUTO_OFF,
    SENSOR_FLASH,
    SENSOR_CHIME,
    APPLIANCE_RESUME,
    CYCLE_DONE,
    VACUUM_FOLLOW,
    VACUUM_GUARD,
    PRESENCE_LIGHT,
    LOCK_GUARD,
    LEAK_GUARD,
)

# Global conditions a rule may respect.
COND_QUIET: Final = "quiet_hours"
COND_AWAY: Final = "away"
COND_ALARM: Final = "alarm"
COND_VACATION: Final = "vacation"
WEEKDAYS: Final = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
# A nap in a room of the house (rooms[].naps).
COND_NAP: Final = "nap"
CONDITIONS: Final = (COND_QUIET, COND_AWAY, COND_ALARM, COND_VACATION, COND_NAP)

# Rule states, shown by the rule sensor and the panel.
ST_DISABLED: Final = "disabled"
ST_SNOOZED: Final = "snoozed"
ST_IDLE: Final = "idle"
ST_ARMED: Final = "armed"
ST_ACTIVE: Final = "active"
ST_ALERT: Final = "alert"
ST_WAITING: Final = "waiting"
ST_FAILED: Final = "failed"
STATES: Final = (ST_DISABLED, ST_SNOOZED, ST_IDLE, ST_ARMED, ST_ACTIVE, ST_ALERT, ST_WAITING, ST_FAILED)


JOURNAL_SIZE: Final = 300
JOURNAL_DAYS: Final = 14

# How often the YAML file is checked for changes (seconds).
WATCH_INTERVAL: Final = 5
# Timers and periodic checks (seconds).
TICK: Final = 15

SERVICE_TRIGGER: Final = "trigger"
SERVICE_SNOOZE: Final = "snooze"
SERVICE_CANCEL: Final = "cancel"
SERVICE_EXTEND: Final = "extend_timer"
SERVICE_RELOAD: Final = "reload"
SERVICE_EXPORT: Final = "export_yaml"
SERVICE_ACKNOWLEDGE: Final = "acknowledge"

DEFAULT_SETTINGS: Final = {
    "quiet_hours": {"start": "00:00", "end": "08:00"},
    "notify": None,
    "alarm": None,
    "repairs": True,
}
