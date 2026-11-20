"""Render the House Rules panel and cards with mock data and save the README screenshots, light and dark.

Usage: python scripts/screenshots.py  (needs `pip install playwright pillow`, `playwright install chromium` and ffmpeg)
CHROMIUM_PATH=/path/to/chrome to use another browser. The clock is frozen and the time zone is UTC, so the times stay
the same. The panel and the cards run in a page that mimics Home Assistant: the theme variables, and stand-ins for
<ha-icon> (Material Design Icons and the integration's own icon set) and <ha-card>. The frontend modules are served
from the repository as Home Assistant serves them (/house_rules_static/...), so the panel loads the cards module next
to it. The WebSocket commands (subscribe, rule/yaml, yaml/get, import/analyze) answer with the neutral mock data below.
A screenshot is only written when its pixels changed (not its bytes: PNG encoding may differ), so a render that looks
the same leaves the file, and the pull request, untouched. Each animation of the illustrated header (leak and lock
alerts blinking, a lit lamp glowing, the robot vacuum rolling) is recorded as its own GIF: the animations are paused and
stepped frame by frame, so they loop cleanly.
"""

import io
import json
import os
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "custom_components/house_rules/frontend"
STATIC = "http://homeassistant.local/house_rules_static"
URL = "http://homeassistant.local/house-rules"
NOW = "2026-11-20T14:30:00Z"
NOW_TS = datetime.fromisoformat(NOW).timestamp()
# The panel alone, edge to edge as in the other ha-* repos: the page less Home Assistant's sidebar (256 px)
PANEL_WIDTH = 1280 - 256

THEMES = {
    "light": {
        "--primary-background-color": "#fafafa",
        "--secondary-background-color": "#e5e5e5",
        "--card-background-color": "#ffffff",
        "--primary-text-color": "#212121",
        "--secondary-text-color": "#727272",
        "--disabled-text-color": "#bdbdbd",
        "--divider-color": "rgba(0,0,0,.12)",
        "--rgb-primary-text-color": "33,33,33",
    },
    "dark": {
        "--primary-background-color": "#111111",
        "--secondary-background-color": "#282828",
        "--card-background-color": "#1c1c1c",
        "--primary-text-color": "#e1e1e1",
        "--secondary-text-color": "#9b9b9b",
        "--disabled-text-color": "#6f6f6f",
        "--divider-color": "rgba(225,225,225,.12)",
        "--rgb-primary-text-color": "225,225,225",
    },
}
COMMON = {
    "--primary-color": "#03a9f4",
    "--rgb-primary-color": "3,169,244",
    "--text-primary-color": "#ffffff",
    "--error-color": "#db4437",
}

# Material Design Icons paths used by the panel and the cards (from @mdi/js 7.4.47).
ICONS = {
    "alarm-light-outline": "M7,15V13A5,5 0 0,1 12,8A5,5 0 0,1 17,13V15H18A2,2 0 0,1 20,17V20H4V17A2,2 0 0,1 6,15H7M9,15H15V13A3,3 0 0,0 12,10A3,3 0 0,0 9,13V15M11,1H13V4H11V1M17.12,2.46L18.54,3.88L16.41,6L15,4.59L17.12,2.46M4.12,3.88L5.54,2.46L7.66,4.59L6.25,6L4.12,3.88M6,17V18H18V17H6Z",
    "bell-ring-outline": "M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M17,11A5,5 0 0,0 12,6A5,5 0 0,0 7,11V18H17V11M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z",
    "check-circle-outline": "M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z",
    "chevron-down": "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",
    "chevron-up": "M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z",
    "close": "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
    "close-circle-outline": "M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M14.59,8L12,10.59L9.41,8L8,9.41L10.59,12L8,14.59L9.41,16L12,13.41L14.59,16L16,14.59L13.41,12L16,9.41L14.59,8Z",
    "delete-outline": "M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z",
    "dishwasher": "M5 2H19A2 2 0 0 1 21 4V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20V4A2 2 0 0 1 5 2M5 4V8H19V4H5M5 20H19V10H5V20M6 5H8V7H6V5M9 5H17V7H9V5M18 11V13C18 14.39 17.05 15.56 15.77 15.9L15.5 18H13.5L13.23 15.9C11.95 15.56 11 14.39 11 13V11H18M16 12H13V13A1.5 1.5 0 0 0 14.5 14.5A1.5 1.5 0 0 0 16 13V12Z",
    "file-alert-outline": "M14 2H6C4.89 2 4 2.9 4 4V20C4 21.11 4.89 22 6 22H18C19.11 22 20 21.11 20 20V8L14 2M18 20H6V4H13V9H18V20M11 18H13V16H11V18M11 14H13V10H11V14Z",
    "file-code-outline": "M14 2H6C4.89 2 4 2.9 4 4V20C4 21.11 4.89 22 6 22H18C19.11 22 20 21.11 20 20V8L14 2M18 20H6V4H13V9H18V20M9.54 15.65L11.63 17.74L10.35 19L7 15.65L10.35 12.3L11.63 13.56L9.54 15.65M17 15.65L13.65 19L12.38 17.74L14.47 15.65L12.38 13.56L13.65 12.3L17 15.65Z",
    "filter-outline": "M15,19.88C15.04,20.18 14.94,20.5 14.71,20.71C14.32,21.1 13.69,21.1 13.3,20.71L9.29,16.7C9.06,16.47 8.96,16.16 9,15.87V10.75L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L15,10.75V19.88M7.04,5L11,10.06V15.58L13,17.58V10.05L16.96,5H7.04Z",
    "import": "M14,12L10,8V11H2V13H10V16M20,18V6C20,4.89 19.1,4 18,4H6A2,2 0 0,0 4,6V9H6V6H18V18H6V15H4V18A2,2 0 0,0 6,20H18A2,2 0 0,0 20,18Z",
    "information-outline": "M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z",
    "lock-outline": "M12,17C10.89,17 10,16.1 10,15C10,13.89 10.89,13 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17M18,20V10H6V20H18M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10C4,8.89 4.89,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z",
    "menu": "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",
    "motion-sensor": "M10,0.2C9,0.2 8.2,1 8.2,2C8.2,3 9,3.8 10,3.8C11,3.8 11.8,3 11.8,2C11.8,1 11,0.2 10,0.2M15.67,1A7.33,7.33 0 0,0 23,8.33V7A6,6 0 0,1 17,1H15.67M18.33,1C18.33,3.58 20.42,5.67 23,5.67V4.33C21.16,4.33 19.67,2.84 19.67,1H18.33M21,1A2,2 0 0,0 23,3V1H21M7.92,4.03C7.75,4.03 7.58,4.06 7.42,4.11L2,5.8V11H3.8V7.33L5.91,6.67L2,22H3.8L6.67,13.89L9,17V22H10.8V15.59L8.31,11.05L9.04,8.18L10.12,10H15V8.2H11.38L9.38,4.87C9.08,4.37 8.54,4.03 7.92,4.03Z",
    "play": "M8,5.14V19.14L19,12.14L8,5.14Z",
    "plus": "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
    "power": "M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13",
    "power-plug-outline": "M8 3C7.45 3 7 3.45 7 4V8H5.97C5.42 8 4.97 8.45 4.97 9V15C4.97 15.55 5.42 16 5.97 16H8V18H5V20H11V18H8V16H10V18H14V16H16V18H13V20H19V18H16V16H18.03C18.58 16 19.03 15.55 19.03 15V9C19.03 8.45 18.58 8 18.03 8H17V4C17 3.45 16.55 3 16 3S15 3.45 15 4V8H9V4C9 3.45 8.55 3 8 3M7 10H17V14H7V10Z",
    "refresh": "M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",
    "robot-vacuum": "M12,2C14.65,2 17.19,3.06 19.07,4.93C20.94,6.81 22,9.35 22,12C22,14.65 20.94,17.19 19.07,19.07C17.19,20.94 14.65,22 12,22C9.35,22 6.81,20.94 4.93,19.07C3.06,17.19 2,14.65 2,12C2,9.35 3.06,6.81 4.93,4.93C6.81,3.06 9.35,2 12,2M12,4C9.88,4 7.84,4.84 6.34,6.34C4.84,7.84 4,9.88 4,12C4,14.12 4.84,16.16 6.34,17.66C7.84,19.16 9.88,20 12,20C14.12,20 16.16,19.16 17.66,17.66C19.16,16.16 20,14.12 20,12C20,9.88 19.16,7.84 17.66,6.34C16.16,4.84 14.12,4 12,4M12,6C13.59,6 15.12,6.63 16.24,7.76C17.37,8.88 18,10.41 18,12H6C6,10.41 6.63,8.88 7.76,7.76C8.88,6.63 10.41,6 12,6Z",
    "shield-home-outline": "M12 1L3 5V11C3 16.5 6.8 21.7 12 23C17.2 21.7 21 16.5 21 11V5L12 1M19 11C19 15.5 16 19.7 12 20.9C8 19.7 5 15.6 5 11V6.3L12 3.2L19 6.3V11M12 6.5L7 11H8.5V15H15.5V11H17L12 6.5Z",
    "timer-outline": "M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M19.03,7.39L20.45,5.97C20,5.46 19.55,5 19.04,4.56L17.62,6C16.07,4.74 14.12,4 12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22C17,22 21,17.97 21,13C21,10.88 20.26,8.93 19.03,7.39M11,14H13V8H11M15,1H9V3H15V1Z",
    "water-alert-outline": "M12 3.25C12 3.25 6 10 6 14C6 17.32 8.69 20 12 20C15.31 20 18 17.32 18 14C18 10 12 3.25 12 3.25M12 18C9.79 18 8 16.21 8 14C8 11.96 10.04 8.96 12 6.43C13.96 8.96 16 11.96 16 14C16 16.21 14.21 18 12 18M20 7H22V13H20V7M20 15H22V17H20V15Z",
}

# Stand-ins for Home Assistant's <ha-icon> (MDI paths above, the "house-rules" icon set through window.customIcons
# as Home Assistant resolves it) and <ha-card>.
HA_ELEMENTS = (
    "const ICONS = "
    + json.dumps(ICONS)
    + ";"
    + r"""
customElements.define("ha-icon", class extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  set icon(value) { this._icon = value; this._draw(); }
  get icon() { return this._icon; }
  connectedCallback() { this._icon ??= this.getAttribute("icon"); this._draw(); }
  attributeChangedCallback(_, __, value) { this._icon = value; this._draw(); }
  async _draw() {
    const name = this._icon || "";
    const [set, icon] = name.includes(":") ? name.split(":") : ["mdi", name];
    let path = ICONS[icon] || "";
    if (set !== "mdi" && window.customIcons?.[set]) path = (await window.customIcons[set].getIcon(icon)).path;
    // As Home Assistant draws it: <ha-icon> left inline, its icon an inline-flex box on the line's middle
    this.innerHTML = '<span style="display:inline-flex;vertical-align:middle;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)"><svg viewBox="0 0 24 24" style="width:100%;height:100%;display:block;fill:currentColor"><path d="' + path + '"/></svg></span>';
  }
});
customElements.define("ha-card", class extends HTMLElement {
  connectedCallback() {
    Object.assign(this.style, {
      display: "block", borderRadius: "12px", boxSizing: "border-box", color: "var(--primary-text-color)",
      background: "var(--ha-card-background, var(--card-background-color))",
      border: "1px solid var(--divider-color)",
    });
  }
});
"""
)


def ago(minutes: float) -> float:
    return NOW_TS - minutes * 60


# ---------- mock house: neutral names only ----------
ENTITIES = {
    "light.kitchen": ("Kitchen ceiling", "on"),
    "light.living_room": ("Living room lamp", "off"),
    "light.bedroom": ("Bedroom light", "off"),
    "light.office": ("Office desk lamp", "off"),
    "light.hallway": ("Hallway light", "off"),
    "binary_sensor.kitchen_window": ("Kitchen window", "off"),
    "binary_sensor.living_room_window": ("Living room window", "off"),
    "binary_sensor.bedroom_window": ("Bedroom window", "on"),
    "binary_sensor.hallway_motion": ("Hallway motion", "off"),
    "binary_sensor.office_motion": ("Office motion", "off"),
    "climate.living_room": ("Living room AC", "off"),
    "climate.bedroom": ("Bedroom AC", "off"),
    "sensor.hallway_illuminance": ("Hallway illuminance", "12"),
    "sensor.office_illuminance": ("Office illuminance", "240"),
}
UNITS = {"sensor.hallway_illuminance": "lx", "sensor.office_illuminance": "lx"}

ROOMS = {
    "Kitchen": {"light": "light.kitchen", "opening": "binary_sensor.kitchen_window"},
    "Living room": {
        "light": "light.living_room",
        "opening": "binary_sensor.living_room_window",
        "climate": "climate.living_room",
    },
    "Bedroom": {
        "light": "light.bedroom",
        "opening": "binary_sensor.bedroom_window",
        "climate": "climate.bedroom",
        "naps": [{"start": "13:30", "end": "15:00"}],
    },
    "Office": {
        "light": "light.office",
        "presence": "binary_sensor.office_motion",
        "illuminance": "sensor.office_illuminance",
    },
    "Hallway": {
        "light": "light.hallway",
        "presence": "binary_sensor.hallway_motion",
        "illuminance": "sensor.hallway_illuminance",
    },
}


def rule(rid, rtype, name, state, detail="", last_run=None, **attributes):
    return {
        "id": rid,
        "type": rtype,
        "name": name,
        "state": state,
        "detail": detail,
        "blocked": None,
        "snoozed_until": None,
        "last_run": last_run,
        "attributes": attributes,
    }


def timer(entity_id, name, total_minutes, left_minutes):
    total = total_minutes * 60
    ends = NOW_TS + left_minutes * 60
    return {
        "rule": "timed_plugs",
        "entity_id": entity_id,
        "name": name,
        "started": ends - total,
        "ends": ends,
        "total": total,
    }


TIMERS = [
    timer("switch.coffee_machine", "Coffee machine", 30, 12.7),
    timer("switch.iron", "Iron", 60, 41),
    timer("switch.towel_rail", "Towel rail", 120, 95),
]

LEAK = rule(
    "kitchen_leak",
    "leak_guard",
    "Kitchen leak",
    "alert",
    "Under the sink · dishwasher cut off",
    ago(4),
    sensors=["binary_sensor.sink_leak"],
    wet=["binary_sensor.sink_leak"],
    cut=["switch.dishwasher"],
)
RULES = [
    rule("fridge_plugs", "keep_on", "Fridge & freezer", "armed", "2/2 on", ago(180), on=2),
    rule("timed_plugs", "auto_off", "Timed plugs", "active", "", ago(18), timers=TIMERS),
    rule("doorbell_flash", "sensor_flash", "Doorbell flash", "armed", "", ago(95)),
    rule("garage_chime", "sensor_chime", "Garage door chime", "armed", "", ago(240)),
    rule("dishwasher_resume", "appliance_resume", "Dishwasher resume", "waiting", "Programme at 62 %", ago(4)),
    rule("washer_done", "cycle_done", "Washing machine", "active", "Cycle running · 38 min", ago(52)),
    rule("vacuum_lights", "vacuum_follow", "Vacuum lights", "active", "Kitchen", ago(6)),
    rule("vacuum_guard", "vacuum_guard", "Vacuum guard", "armed", "", ago(300)),
    rule("hallway_presence", "presence_light", "Hallway presence", "idle", "12 lx", ago(35)),
    rule("office_presence", "presence_light", "Office presence", "disabled"),
    rule("front_lock", "lock_guard", "Front door lock", "armed", "Locked", ago(70)),
    LEAK,
]

JOURNAL_LINES = [
    (310, "vacuum_guard", "Vacuum guard", "vacuum_guard", "return to base", "Bedroom window open", "ok"),
    (240, "garage_chime", "Garage door chime", "sensor_chime", "chime", "Garage door opened", "ok"),
    (180, "fridge_plugs", "Fridge & freezer", "keep_on", "turn on", "Freezer plug back on (attempt 1)", "ok"),
    (150, "hallway_presence", "Hallway presence", "presence_light", "turn on", "Presence · 8 lx", "ok"),
    (146, "hallway_presence", "Hallway presence", "presence_light", "turn off", "No presence for 30 s", "ok"),
    (95, "doorbell_flash", "Doorbell flash", "sensor_flash", "flash", "Living room lamp · 6 s", "ok"),
    (70, "front_lock", "Front door lock", "lock_guard", "lock", "Door closed for 30 s", "ok"),
    (66, "front_lock", "Front door lock", "lock_guard", "lock", "Lock jammed", "failed"),
    (52, "washer_done", "Washing machine", "cycle_done", "cycle start", "Power above 10 W", "ok"),
    (35, "hallway_presence", "Hallway presence", "presence_light", "skip", "Bright enough (240 lx)", "skipped"),
    (18, "timed_plugs", "Timed plugs", "auto_off", "timer", "Coffee machine · 30 min", "ok"),
    (9, "vacuum_lights", "Vacuum lights", "vacuum_follow", "turn on", "Living room", "ok"),
    (6, "vacuum_lights", "Vacuum lights", "vacuum_follow", "turn on", "Kitchen (living room off)", "ok"),
    (4, "kitchen_leak", "Kitchen leak", "leak_guard", "alert", "Under the sink · dishwasher cut off", "active"),
    (4, "dishwasher_resume", "Dishwasher resume", "appliance_resume", "blocked", "Kept off by Kitchen leak", "skipped"),
]
JOURNAL = [
    {"ts": ago(m), "rule": rid, "name": name, "type": rtype, "action": action, "detail": detail, "result": result}
    for m, rid, name, rtype, action, detail, result in JOURNAL_LINES
]
# Yesterday too, so the journal shows two days.
JOURNAL[:0] = [
    {
        "ts": ago(60 * 20),
        "rule": "washer_done",
        "name": "Washing machine",
        "type": "cycle_done",
        "action": "notify",
        "detail": "Cycle done · 1 h 12",
        "result": "ok",
    },
    {
        "ts": ago(60 * 19),
        "rule": "timed_plugs",
        "name": "Timed plugs",
        "type": "auto_off",
        "action": "turn off",
        "detail": "Towel rail after 2 h",
        "result": "ok",
    },
]

SETTINGS = {
    "quiet_hours": {"start": "22:30", "end": "07:00"},
    "notify": "notify.mobile_app_phone",
    "alarm": "alarm_control_panel.home",
    "repairs": True,
}
SOURCE = {
    "mode": "yaml",
    "path": "/config/house_rules.yaml",
    "files": ["/config/house_rules.yaml"],
    "modified": ago(2),
    "error": None,
    "last_reload": {"ts": ago(2), "rules": ["kitchen_leak", "dishwasher_resume"]},
}

RULE_YAML = {
    "kitchen_leak": """id: kitchen_leak
name: Kitchen leak
type: leak_guard
sensors:
  - binary_sensor.sink_leak
cut:
  - switch.dishwasher
lights:
  - light.kitchen
  - light.hallway
chime: media_player.living_room
notify: critical
""",
}
YAML_FILE = """# House Rules — edited here, in the panel, or both.
settings:
  quiet_hours: {start: "22:30", end: "07:00"}
  notify: notify.mobile_app_phone
  alarm: alarm_control_panel.home

rooms:
  Kitchen: {light: light.kitchen, opening: binary_sensor.kitchen_window}
  Living room:
    light: light.living_room
    opening: binary_sensor.living_room_window
    climate: climate.living_room
  Hallway:
    light: light.hallway
    presence: binary_sensor.hallway_motion
    illuminance: sensor.hallway_illuminance

rules:
  - id: fridge_plugs
    name: Fridge & freezer
    type: keep_on
    entity_id: [switch.fridge_plug, switch.freezer_plug]
    delay: "00:00:10"

  - id: timed_plugs
    name: Timed plugs
    type: auto_off
    label: auto_off        # duree_30min, duree_1h... on each plug

  - id: vacuum_lights
    name: Vacuum lights
    type: vacuum_follow
    vacuum: vacuum.robot
    room_sensor: sensor.robot_current_room

  - id: hallway_presence
    name: Hallway presence
    type: presence_light
    room: Hallway
    dark_below: 30
    off_delay: "00:00:30"

  - id: kitchen_leak
    name: Kitchen leak
    type: leak_guard
    sensors: [binary_sensor.sink_leak]
    cut: [switch.dishwasher]
    lights: [light.kitchen, light.hallway]
    notify: critical
"""
PROPOSALS = [
    {
        "source": "label",
        "label": "keep_on",
        "rule": {"id": "aquarium_plugs", "type": "keep_on", "name": "Aquarium plugs"},
    },
    {
        "source": "automation",
        "automation_entity": "automation.garage_light_alert",
        "alias": "Garage light alert",
        "rule": {"id": "garage_light_alert", "type": "sensor_flash", "name": "Garage light alert"},
    },
    {
        "source": "automation",
        "automation_entity": "automation.dryer_finished",
        "alias": "Dryer finished",
        "rule": {"id": "dryer_done", "type": "cycle_done", "name": "Dryer finished"},
    },
]


def snapshot(rules=None):
    rules = RULES if rules is None else rules
    alerts = [r for r in rules if r["state"] == "alert"]
    timers = [t for r in rules if r["type"] == "auto_off" and r["state"] == "active" for t in TIMERS]
    return {
        "rules": rules,
        "errors": {},
        "rooms": ROOMS,
        "settings": SETTINGS,
        "timers": timers,
        "alerts": alerts,
        "journal": JOURNAL,
        "conditions": {"quiet": False, "away": False, "alarm": False, "vacation": False, "people_home": 2},
        "source": SOURCE,
        "claims": {},
    }


def hass_data(snap):
    states = {
        entity_id: {
            "entity_id": entity_id,
            "state": state,
            "attributes": {
                "friendly_name": name,
                **({"unit_of_measurement": UNITS[entity_id]} if entity_id in UNITS else {}),
            },
        }
        for entity_id, (name, state) in ENTITIES.items()
    }
    return {
        "states": states,
        "snapshot": snap,
        "rule_yaml": RULE_YAML,
        "yaml": {
            "mode": "yaml",
            "path": "/config/house_rules.yaml",
            "text": YAML_FILE,
            "hash": "mock",
            "includes": False,
        },
        "proposals": PROPOSALS,
    }


# A hass object as Home Assistant gives it: states, locale, dark mode, and a connection whose commands answer with the
# mock data (the panel and the cards share one subscription).
HASS = """(data, dark) => ({
    states: data.states, language: "en", locale: { language: "en" }, themes: { darkMode: dark },
    callService: async () => {},
    connection: {
        subscribeMessage: (callback) => {
            setTimeout(() => callback(structuredClone(data.snapshot)), 0);
            return Promise.resolve(() => {});
        },
        sendMessagePromise: async (msg) => {
            if (msg.type === "house_rules/rule/yaml") return { yaml: data.rule_yaml[msg.rule_id] || "" };
            if (msg.type === "house_rules/yaml/get") return structuredClone(data.yaml);
            if (msg.type === "house_rules/import/analyze") return { proposals: structuredClone(data.proposals) };
            return {};
        },
    },
})"""

PANEL_MOUNT = (
    """async ([data, tab, dark]) => {
    await customElements.whenDefined("house-rules-panel");
    const el = document.createElement("house-rules-panel");
    el.panel = { url_path: "house-rules" };
    el.narrow = false;
    el.route = { path: `/${tab}` };
    el.hass = ("""
    + HASS
    + """)(data, dark);
    document.getElementById("root").appendChild(el);
    for (let i = 0; i < 100; i++) {
        await new Promise((r) => setTimeout(r, 20));
        const main = el.shadowRoot.querySelector("main");
        if (main && main.textContent.trim() !== "…") break;
    }
    await new Promise((r) => setTimeout(r, 100));
}"""
)

# Clicks an element of the panel (and waits for what it starts to render).
CLICK = """async (selector) => {
    const target = document.querySelector("house-rules-panel").shadowRoot.querySelector(selector);
    if (!target) throw new Error(`no ${selector}`);
    target.click();
    await new Promise((r) => setTimeout(r, 200));
}"""

# Each panel state of the README: the tab and the clicks after loading.
SHOTS = [
    {"file": "panel-activity", "tab": "activity"},
    {"file": "panel-rules", "tab": "rules"},
    {"file": "panel-rule-edit", "tab": "rules", "clicks": ['[data-edit="kitchen_leak"]']},
    {"file": "panel-rooms", "tab": "rooms"},
    {"file": "panel-journal", "tab": "journal"},
    {"file": "panel-yaml", "tab": "yaml"},
    {"file": "panel-settings", "tab": "settings", "clicks": ['[data-action="analyze"]']},
]

CARD_MOUNT = (
    """async ([data, tag, config, toggle, dark]) => {
    await customElements.whenDefined(tag);
    const card = document.createElement(tag);
    card.setConfig(config);
    card.hass = ("""
    + HASS
    + """)(data, dark);
    document.getElementById("root").appendChild(card);
    await new Promise((r) => setTimeout(r, 100));
    if (toggle) card.shadowRoot.getElementById("toggle").click();
    await new Promise((r) => setTimeout(r, 200));
}"""
)

# The cards at the other ha-* cards' size (a 460 px card, a 380 px mini card), at twice the pixel density.
CARD_SHOTS = [
    {"file": "card", "tag": "house-rules-card", "width": 492, "config": {}},
    {"file": "card-mini", "tag": "house-rules-mini-card", "width": 412, "config": {}},
    {"file": "card-mini-full", "tag": "house-rules-mini-card", "width": 492, "config": {}, "toggle": True},
    {"file": "card-timers", "tag": "house-rules-timers-card", "width": 492, "config": {}},
    {"file": "card-activity", "tag": "house-rules-activity-card", "width": 492, "config": {"limit": 8}},
]

# The animated header states: the rules that draw them, and the length of one loop of their animation (seconds).
CALM = [r for r in RULES if r["type"] == "keep_on"]
GIFS = [
    ("leak", [*CALM, LEAK], 1),
    ("lock", [*CALM, rule("front_lock", "lock_guard", "Front door lock", "alert", "Door unlocked for 10 min")], 1),
    ("light", [*CALM, rule("hallway_presence", "presence_light", "Hallway presence", "active", "Presence")], 3),
    ("vacuum", [*CALM, rule("vacuum_lights", "vacuum_follow", "Vacuum lights", "active", "Kitchen")], 12),
]
GIF_FPS = 12
SEEK = """(t) => new Promise((done) => {
    const roots = [document];
    for (let i = 0; i < roots.length; i++) for (const el of roots[i].querySelectorAll("*")) if (el.shadowRoot) roots.push(el.shadowRoot);
    const all = roots.flatMap((r) => r.getAnimations());
    for (const a of all) { a.pause(); a.currentTime = t; }
    requestAnimationFrame(() => requestAnimationFrame(() => done(all.length)));
})"""
HEADER = """() => {
    const r = document.querySelector("#root > *").shadowRoot.querySelector(".hdr").getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
}"""


def page_html(theme, padding):
    variables = "".join(f"{k}:{v};" for k, v in {**THEMES[theme], **COMMON}.items())
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
:root {{ {variables} color-scheme: {theme}; }}
html, body {{ margin: 0; background: var(--primary-background-color); color: var(--primary-text-color);
             font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; }}
body {{ padding: {padding}px; }}
</style></head><body><div id="root"></div></body></html>"""


def open_page(browser, name, theme, width, scale, padding):
    """A page that mimics Home Assistant, with the frontend modules served from the repository."""
    context = browser.new_context(
        viewport={"width": width, "height": 200},
        device_scale_factor=scale,
        timezone_id="UTC",
        locale="en-US",
        color_scheme=theme,
    )
    page = context.new_page()
    page.on("pageerror", lambda err: print(f"{name}: page error: {err}"))
    page.clock.set_fixed_time(NOW)
    html = page_html(theme, padding)

    def serve(route):
        path = route.request.url.split("?")[0]
        if path.startswith(STATIC + "/"):
            file = FRONTEND / path.rsplit("/", 1)[-1]
            route.fulfill(content_type="text/javascript", body=file.read_text())
        else:
            route.fulfill(content_type="text/html", body=html)

    page.route("http://homeassistant.local/**", serve)
    page.goto(URL)
    page.add_script_tag(content=HA_ELEMENTS)
    page.add_script_tag(url=f"{STATIC}/house-rules-icons.js?v=1")
    return context, page


def render_panel(browser, shot, theme):
    name = shot["file"] + ("-dark" if theme == "dark" else "")
    context, page = open_page(browser, name, theme, PANEL_WIDTH, 1, 0)
    page.add_script_tag(url=f"{STATIC}/house-rules-panel.js?v=1", type="module")
    page.evaluate(PANEL_MOUNT, [hass_data(snapshot()), shot["tab"], theme == "dark"])
    for selector in shot.get("clicks", []):
        page.evaluate(CLICK, selector)
    page.wait_for_timeout(200)
    save(name, page.screenshot(full_page=True, animations="disabled"))
    context.close()


def open_card(browser, name, theme, width, snap, tag, config, toggle=False, scale=2):
    context, page = open_page(browser, name, theme, width, scale, 16)
    page.add_script_tag(url=f"{STATIC}/house-rules-cards.js?v=1", type="module")
    page.evaluate(CARD_MOUNT, [hass_data(snap), tag, config, toggle, theme == "dark"])
    page.wait_for_timeout(200)
    return context, page


def render_card(browser, shot, theme):
    name = shot["file"] + ("-dark" if theme == "dark" else "")
    context, page = open_card(
        browser, name, theme, shot["width"], snapshot(), shot["tag"], shot["config"], shot.get("toggle", False)
    )
    save(name, page.locator("#root").screenshot(animations="disabled"))
    context.close()


def render_gif(browser, scene, rules, seconds, theme):
    """The mini card's header in one animated state, its animations paused and stepped frame by frame (ffmpeg)."""
    import subprocess
    import tempfile

    name = f"header-{scene}" + ("-dark" if theme == "dark" else "")
    context, page = open_card(browser, name, theme, 412, snapshot(rules), "house-rules-mini-card", {}, scale=1)
    clip = page.evaluate(HEADER)
    with tempfile.TemporaryDirectory() as tmp:
        for i in range(round(GIF_FPS * seconds)):
            if not page.evaluate(SEEK, 6000 + i * 1000 / GIF_FPS):
                raise RuntimeError(f"{name}: no animation to step")
            page.screenshot(path=f"{tmp}/f{i:03d}.png", clip=clip)
        palette = "split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4"
        out = f"{tmp}/out.gif"
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(GIF_FPS), "-i", f"{tmp}/f%03d.png"]
        subprocess.run([*cmd, "-vf", palette, "-loop", "0", out], check=True)
        gif = Path(out).read_bytes()
    path = ROOT / "screenshots" / f"{name}.gif"
    written = not path.exists() or path.read_bytes() != gif
    if written:
        path.write_bytes(gif)
    print(path.relative_to(ROOT), "" if written else "(unchanged)")
    context.close()


def save(name, png):
    path = ROOT / "screenshots" / f"{name}.png"
    written = save_if_changed(path, png)
    print(path.relative_to(ROOT), "" if written else "(unchanged)")


def save_if_changed(path: Path, png: bytes) -> bool:
    """Write `png` to `path` unless the file there already has the same pixels. True when written."""
    from PIL import Image, UnidentifiedImageError

    if path.exists():
        try:
            with Image.open(path) as old_image, Image.open(io.BytesIO(png)) as new_image:
                old, new = old_image.convert("RGBA"), new_image.convert("RGBA")
                if old.size == new.size and old.tobytes() == new.tobytes():
                    return False
        except (OSError, UnidentifiedImageError):
            pass
    path.write_bytes(png)
    return True


def expected_files() -> set[str]:
    """Every file this script writes in screenshots/ (the test flags any other file there)."""
    names = [s["file"] for s in SHOTS] + [s["file"] for s in CARD_SHOTS]
    files = {f"{n}{dark}.png" for n in names for dark in ("", "-dark")}
    files |= {f"header-{scene}{dark}.gif" for scene, _, _ in GIFS for dark in ("", "-dark")}
    return files


def main():
    from playwright.sync_api import sync_playwright

    (ROOT / "screenshots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        for shot in SHOTS:
            for theme in THEMES:
                render_panel(browser, shot, theme)
        for shot in CARD_SHOTS:
            for theme in THEMES:
                render_card(browser, shot, theme)
        for scene, rules, seconds in GIFS:
            for theme in THEMES:
                render_gif(browser, scene, rules, seconds, theme)
        browser.close()


if __name__ == "__main__":
    main()
