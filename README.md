# ha-house-rules

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HACS Validation](https://github.com/juju35/ha-house-rules/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-house-rules/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-house-rules/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-house-rules/actions/workflows/validate.yml)
[![Lint](https://github.com/juju35/ha-house-rules/actions/workflows/lint.yml/badge.svg)](https://github.com/juju35/ha-house-rules/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-house-rules)](https://github.com/juju35/ha-house-rules/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-house-rules/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/custom_components/house_rules/brand/icon.png" alt="House Rules" width="120"></p>

Home Assistant integration for the **reflexes of your home**: plugs kept on or turned off after a while, lights that flash while a sensor is triggered (with escalation), lights that follow the robot vacuum from room to room, appliances powered back on when they were cut mid-programme, chimes, end-of-cycle reminders, leak guard, presence lights and lock guard — each one a **rule**, with a sidebar panel and Lovelace cards.

The usual way is one automation per reflex: templates polling every few seconds, timers lost on a reload, a JSON store in an `input_text` limited to 255 characters, light states not restored after an alert, a light turned off by the vacuum while someone is in the room. House Rules replaces them with rules that keep their state across restarts, share global conditions (quiet hours, nobody home, alarm armed, vacation), arbitrate the lights between them and log what they do.

The configuration lives in **`/config/house_rules.yaml`, edited both ways**: in the panel or by hand, the other side follows.

[![Open your Home Assistant instance and open a repository inside the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-house-rules&category=integration)

## Features

- **11 rule types** (below), each with its own enabled switch, state sensor and test button
- **YAML both ways**: the panel rewrites only the block of the rule it saves (found by `id`), comments and layout kept, with a `.bak` copy and an atomic write; changes made in the file are reloaded within seconds and only the rules that changed restart (timers and alerts of the others keep running); a save over a file changed meanwhile is refused and both versions are shown; `!secret`, `!include` and `!include_dir_merge_list` are supported. Without the file, the configuration is stored by the integration and can be switched to YAML in one click
- **Global conditions** each rule can respect: quiet hours (no light, no sound — notifications only), nobody home, alarm armed, vacation mode
- **Light arbitration**: a light is turned off only when no rule wants it any more, and never when it was already on before (the vacuum leaving a room where someone switched the light on leaves it on)
- **Escalation** of an alert: flash, then a chime, then a critical notification, each after its own delay
- **Repairs** when a rule gives up (a plug that keeps turning off, an appliance that can't be resumed) or when `house_rules.yaml` is invalid — the last valid configuration keeps running
- **Import**: rules proposed from the `Rallumer Prise` / `Extinction automatique` labels (with the `duree_*` durations) and from recognised automations, which are turned off (never deleted)
- **Sidebar panel** with its emblem and a count badge (alerts in red, else running timers)
- **Cards**: overview (full and mini), timers, activity

## Prerequisites

- Home Assistant 2024.12 or newer
- A notify action for the notifications (the [Companion app](https://companion.home-assistant.io/) for critical alerts)

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-house-rules&category=integration)

Then click **Install** and restart Home Assistant.

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-house-rules` — Type: **Integration**
3. Open **House Rules** and click **Install**
4. Restart Home Assistant

### Manual

Copy `custom_components/house_rules/` to `/config/custom_components/house_rules/`, then restart Home Assistant.

## Configuration

[![Add integration](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=house_rules) — **Settings → Devices & services → Add integration → House Rules**, then open the **House Rules** panel in the sidebar.

The cards are added to the dashboard resources automatically (`/house_rules_static/house-rules-cards.js`); with resources in YAML, they are loaded as an extra module.

### Panel

| Tab | What it shows |
|---|---|
| Activity | Alerts in progress (acknowledge, snooze), running timers (+15 min, turn off), every rule's state, the latest runs |
| Rules | Rules by type, filter chips, enable switch, Test, the YAML editor of a rule (as written in the file, comments included), a banner when the file was reloaded |
| Rooms | The rooms table used by the vacuum and presence rules: light, opening, air conditioner, presence, illuminance |
| Journal | Every run, by day, filterable and searchable |
| YAML | The whole `house_rules.yaml`, as written, editable: saving checks the YAML and every rule first, keeps a `.bak`, refuses a file changed meanwhile and restarts only the changed rules. Without the file: the stored configuration as YAML (read only, copy) |
| Settings | Configuration source (YAML / storage, reload, switch to YAML), global conditions, notification target, import |

### house_rules.yaml

```yaml
settings:
  quiet_hours: {start: "00:00", end: "08:00"}
  notify: notify.family          # default target; a rule can set its own `notify:`
  alarm: alarm_control_panel.alarmo
  repairs: true

rooms:                           # names as the vacuum's current-room sensor reports them
  Kitchen:
    light: light.kitchen
    opening: binary_sensor.kitchen_french_window
    climate: climate.air_conditioner
  Dining room:
    light: light.kitchen         # shared light
  Hallway:
    light: light.hallway
    presence: binary_sensor.hallway_occupancy
    illuminance: sensor.hallway_illuminance

rules:
  - id: kettle
    type: auto_off
    entity_id: switch.kettle
    duration: "00:05:00"
  - id: electrical_panel
    type: sensor_flash
    trigger: {entity_id: binary_sensor.electrical_panel_door, to: "on", for: "00:02:00"}
    lights: [light.hallway_night_light, light.living_night_light]
    color: [255, 0, 0]
    respect: [quiet_hours]
    escalation:
      - {after: "00:05:00", chime: media_player.living_room_speaker, media: media-source://media_source/local/chime.mp3}
      - {after: "00:10:00", notify: critical, message: The electrical panel is still open}
```

Common options of every rule:

| Option | Default | Description |
|---|---|---|
| `id` | generated from `name`/`type` when missing (written back to the file) | Unique, lower case letters, digits and `_` |
| `type` | required | One of the types below |
| `name` | from the id | Display name |
| `enabled` | `true` | `false` pauses the rule (the rule's switch writes it) |
| `respect` | `[]` | Global conditions the rule respects: `quiet_hours`, `away`, `alarm`, `vacation` |
| `notify` | `settings.notify` | Notification target of this rule |

### Rule types

| Type | What it does | Main options |
|---|---|---|
| `keep_on` | Turns the entities back on when they go off | `entity_id` and/or `label`, `delay` (10 s), `max_attempts` (3) per `window` (1 h) |
| `auto_off` | Turns the entities off a while after they were turned on; timers survive restarts | `entity_id` and/or `label`, `duration` (else from a `duree_5min` / `duree_1h30` label), `power_entity` + `power_above` (not while drawing more) |
| `sensor_flash` | Lights flash while the trigger holds, then are put back as they were | `trigger` (`entity_id`, `to`, `from`, `for`), `lights`, `color`, `rate` (`1hz`, `2hz`, `pulse`), `restore`, `message`, `critical`, `escalation` |
| `sensor_chime` | A sound when the trigger is entered, within time windows; the volume is restored | `trigger`, `media_player`, `media` or `script`, `volume`, `duration`, `windows` |
| `appliance_resume` | Powers the appliance back on when its programme's progress went unavailable before 100 % | `switch`, `progress`, `delay`, `max_attempts`, `power_on_at` (daily power-on) |
| `cycle_done` | End of a cycle: notifies, then reminds until the door opens | `power_entity` (`start_above`, `done_below`, `done_for`) or `state_entity` + `done_states`, `door`, `reminder`, `max_reminders`, `message` |
| `vacuum_follow` | The lights of the rooms table follow the robot; off at the dock | `vacuum`, `room_sensor`, `transition`, `dark_below`, `off_at_dock` |
| `vacuum_guard` | Sends the robot back when its room's opening is open (unless the room's air conditioner runs) | `vacuum`, `room_sensor`, `message` |
| `presence_light` | Presence turns the room's lights on when it is dark, off after a delay | `room`, `dark_below`, `hysteresis`, `off_delay`, `windows`, `brightness` or `brightness_entity` |
| `lock_guard` | Locks after the door closes or the alarm is armed; optionally disarms when unlocked | `lock`, `door`, `lock_after`, `alarm`, `lock_on_arm_after`, `disarm_on_unlock` |
| `leak_guard` | A leak: cuts the appliances (and keeps them from being resumed), flashes, rings, notifies | `sensors`, `cut`, `lights`, `chime`, `media`, `message`, `critical` |

Durations take `"HH:MM:SS"` or seconds.

### Cards

All cards share the illustrated header (one object per rule family on the ground bar, coloured by status, night look with a dark theme or `illustration_theme: night`).

| Card | Options |
|---|---|
| `custom:house-rules-card` | `title`, `illustration_theme` (`auto`, `day`, `night`), `types` (YAML only: rule types to show) |
| `custom:house-rules-mini-card` | Same options (both), folded to its header; the corner button unfolds it, a click outside folds it |
| `custom:house-rules-timers-card` | `title` |
| `custom:house-rules-activity-card` | `title`, `limit` (8) |

### Entities

| Entity | Description |
|---|---|
| `switch.<rule>_enabled` | The rule on or off (written to the configuration) |
| `sensor.<rule>_state` | `disabled`, `snoozed`, `idle`, `armed`, `active`, `alert`, `waiting`, `failed`; attributes per type |
| `button.<rule>_test` | Runs the rule's action once |
| `switch.house_rules_vacation_mode` | Pauses the rules that respect `vacation` |
| `sensor.house_rules_active_alerts` | Number of rules in alert |
| `sensor.house_rules_running_timers` | Number of running auto-off timers |
| `button.house_rules_acknowledge_alerts` | Ends every alert |

### Actions

| Action | Description |
|---|---|
| `house_rules.trigger` | Test rules (`rule`: ids) |
| `house_rules.snooze` | Pause rules for `minutes` (0: resume) |
| `house_rules.cancel` | Stop what a rule is doing, or forget its failures |
| `house_rules.acknowledge` | End alerts (all when no `rule`) |
| `house_rules.extend_timer` | Add `minutes` to the timers of `entity_id` |
| `house_rules.reload` | Read `house_rules.yaml` again (the file is also watched) |
| `house_rules.export_yaml` | Return the whole configuration as YAML |

### Events

`house_rules_fired` on every run: `rule`, `type`, `name`, `action`, `detail`, `result`.

### Diagnostics

**Settings → Devices & services → House Rules → Download diagnostics**: configuration, rule states, conditions, light claims and the latest runs (notification targets redacted).

## Development

```bash
pip install -r requirements_test.txt && pytest
```

### Releasing

1. Bump the version in `custom_components/house_rules/manifest.json`, `HOUSE_RULES_PANEL_VERSION` (panel) and `HR_VERSION` (cards)
2. Add a `## <version>` section at the top of [CHANGELOG.md](https://github.com/juju35/ha-house-rules/blob/main/CHANGELOG.md)
3. Push to `main`: the **Release** workflow creates the tag and the GitHub release with the changelog section as notes

## Translations

The integration follows the language of Home Assistant. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |

Contributions for additional languages are welcome!

## License

[MIT](https://github.com/juju35/ha-house-rules/blob/main/LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
