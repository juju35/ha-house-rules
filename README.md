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
- **Import**: rules proposed from the `Rallumer Prise` / `Extinction automatique` labels (with the `duree_*` durations), from recognised automations, which are turned off (never deleted), and from Smart Comfort's lights on presence
- **Sidebar panel** with its emblem and a count badge (alerts in red, else running timers)
- **Cards**: overview (full and mini), timers, activity

## Screenshots

### Panel

| Activity tab: alerts in progress, timers, presence lights and every rule at a glance | Dark mode |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-activity.png" alt="Activity tab: alerts in progress, timers and every rule at a glance" width="700"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-activity-dark.png" alt="Activity tab: alerts in progress, timers and every rule at a glance, dark mode" width="700"> |

| Rules tab: rules by type, test, snooze, enable | Dark mode |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-rules.png" alt="Rules tab: rules by type, test, snooze, enable" width="700"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-rules-dark.png" alt="Rules tab: rules by type, test, snooze, enable, dark mode" width="700"> |

| Editing a rule as YAML from the Rules tab | Dark mode |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-rule-edit.png" alt="Editing a rule as YAML from the Rules tab" width="700"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-rule-edit-dark.png" alt="Editing a rule as YAML from the Rules tab, dark mode" width="700"> |

| Rooms tab: a folding card per room, its sections and the rules that use it | Dark mode |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-rooms.png" alt="Rooms tab: a folding card per room, its sections and the rules that use it" width="700"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-rooms-dark.png" alt="Rooms tab: a folding card per room, its sections and the rules that use it, dark mode" width="700"> |

| Journal tab: what the rules did, by day | Dark mode |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-journal.png" alt="Journal tab: what the rules did, by day" width="700"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-journal-dark.png" alt="Journal tab: what the rules did, by day, dark mode" width="700"> |

| YAML tab: the whole house_rules.yaml, editable | Dark mode |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-yaml.png" alt="YAML tab: the whole house_rules.yaml, editable" width="700"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-yaml-dark.png" alt="YAML tab: the whole house_rules.yaml, editable, dark mode" width="700"> |

| Settings tab: configuration source, global conditions and import | Dark mode |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-settings.png" alt="Settings tab: configuration source, global conditions and import" width="700"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/panel-settings-dark.png" alt="Settings tab: configuration source, global conditions and import, dark mode" width="700"> |

### Cards

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card.png" alt="house-rules-card" width="368"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card-dark.png" alt="house-rules-card, dark mode" width="368"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card-mini.png" alt="house-rules-mini-card" width="368"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card-mini-dark.png" alt="house-rules-mini-card, dark mode" width="368"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card-mini-full.png" alt="house-rules-mini-card, expanded" width="368"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card-mini-full-dark.png" alt="house-rules-mini-card, expanded, dark mode" width="368"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card-timers.png" alt="house-rules-timers-card" width="368"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card-timers-dark.png" alt="house-rules-timers-card, dark mode" width="368"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card-activity.png" alt="house-rules-activity-card" width="368"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/card-activity-dark.png" alt="house-rules-activity-card, dark mode" width="368"> |

### Illustrated header

The header shows one object per configured family of rules (plugs, lights, robot vacuum, lock, chime, appliances, leak), coloured by the worst state of its rules. Each state is animated:

| State | Light | Dark |
|---|---|---|
| Leak alert: the drop blinks. | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/header-leak.gif" alt="Header, leak" width="368"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/header-leak-dark.gif" alt="Header, leak, dark mode" width="368"> |
| Lock alert: the lock blinks. | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/header-lock.gif" alt="Header, lock" width="368"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/header-lock-dark.gif" alt="Header, lock, dark mode" width="368"> |
| A lamp lit by a rule glows. | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/header-light.gif" alt="Header, light" width="368"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/header-light-dark.gif" alt="Header, light, dark mode" width="368"> |
| The robot vacuum rolls while it is cleaning. | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/header-vacuum.gif" alt="Header, vacuum" width="368"> | <img src="https://raw.githubusercontent.com/juju35/ha-house-rules/main/screenshots/header-vacuum-dark.gif" alt="Header, vacuum, dark mode" width="368"> |

The screenshots are generated with mock data by `scripts/screenshots.py`; the Screenshots workflow refreshes them on each pull request.

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
| Activity | Alerts in progress (acknowledge, snooze), running timers (+15 min, turn off), rooms lit by presence (someone there, or the countdown before their lights go off: +15 min, turn off), every rule's state, the latest runs |
| Rules | Rules by type, filter chips, enable switch, Test, the YAML editor of a rule (as written in the file, comments included), a banner when the file was reloaded |
| Rooms | As on Smart Comfort: a folding card per room — its live state (someone there, nap, an opening open, an entity unavailable) and the rules that use it in its header; inside, its name and Home Assistant area, then its sections (lights, windows and doors, presence and light level, devices, naps) with Home Assistant's entity pickers, the empty ones offered as **+** chips. **Discover** finds the rooms of the Home Assistant areas with their lights, openings, presence and light level sensors (a room keeps what it has; nothing is saved before **Save**); the areas without a room are offered at the end |
| Journal | Every run, by day, filterable and searchable |
| YAML | The whole `house_rules.yaml`, as written, editable: saving checks the YAML and every rule first, keeps a `.bak`, refuses a file changed meanwhile and restarts only the changed rules. Without the file: the stored configuration as YAML (read only, copy) |
| Settings | Configuration source (YAML / storage, reload, switch to YAML), global conditions, notification target, import |

### house_rules.yaml

Three sections: `settings`, `rooms` and `rules`. Each can be moved to its own file with `!include file.yaml`, and `rules` can be spread over a folder with `!include_dir_merge_list folder` (one list per file). `!secret` works anywhere.

```yaml
settings:
  quiet_hours: {start: "00:00", end: "08:00"}
  notify: notify.family
  alarm: alarm_control_panel.alarmo

rooms:
  Kitchen:
    light: light.kitchen
    opening: binary_sensor.kitchen_french_window
    climate: climate.air_conditioner
  Dining room:
    light: light.kitchen
  Hallway:
    light: light.hallway
    presence: binary_sensor.hallway_occupancy
    illuminance: sensor.hallway_illuminance

rules: !include_dir_merge_list house_rules/
```

#### Settings

| Option | Default | Description |
|---|---|---|
| `quiet_hours` | `{start: "00:00", end: "08:00"}` | Window (may cross midnight) in which the rules that respect `quiet_hours` neither light nor ring: they only notify. `null`: no quiet hours |
| `notify` | none | Default notification target (`notify.family` or `family`); a rule can set its own `notify:` |
| `quiet_notify` | none | Target during the quiet hours, for the rules without their own `notify` / `quiet_notify` |
| `alarm` | none | `alarm_control_panel` used by the `alarm` condition |
| `repairs` | `true` | Create a repair when a rule gives up |

#### Rooms

Room names are the ones the vacuum's current-room sensor reports (for `vacuum_follow` / `vacuum_guard`) and the ones `presence_light` refers to. The panel's **Rooms** tab edits them, a folding card per room.

| Option | Description |
|---|---|
| `light` / `lights` | The room's light(s); two rooms may share a light |
| `opening` | Door/window `binary_sensor`(s) of the room (`vacuum_guard`) |
| `climate` | Air conditioner of the room: while it runs, `vacuum_guard` lets the robot clean with the opening open |
| `presence` | Presence/occupancy `binary_sensor`(s) (`presence_light`): someone is there while one of them is on |
| `illuminance` | Light level sensor (`dark_below` of `vacuum_follow` / `presence_light`) |
| `naps` | Naps of the room: slots (`start`, `end` and optionally `days`, `mon` … `sun`, every day when none) and/or on/off entities (a nap while one is on: a `schedule` helper, an `input_boolean`…). While a room of the house has its nap, the rules that respect `nap` are paused and `presence_light` keeps its `not_during_naps` lights off. In the Rooms tab: room → Naps, **+ Nap** (from, until, days) or **+ Nap schedule** (an entity) |
| `area` | The room's Home Assistant area: the Rooms tab's **Discover** fills the room from it |
| `aliases` | Other names of the room, e.g. the one the vacuum's current-room sensor reports when it differs (case-insensitive). YAML only |

##### Naps shared with other integrations

Define the naps once in a core `schedule` helper and point every integration at it (Smart Comfort reads the same
entity), so a change applies everywhere:

```yaml
# configuration.yaml
schedule:
  nap_bedroom:
    name: Bedroom nap
    monday: [{from: "13:30:00", to: "15:00:00"}]
    saturday: [{from: "14:00:00", to: "16:00:00"}]
```

```yaml
# house_rules.yaml
rooms:
  Bedroom:
    naps: [schedule.nap_bedroom, input_boolean.unplanned_nap]   # a nap while one of them is on
```

#### Common options of every rule

| Option | Default | Description |
|---|---|---|
| `id` | generated from `name` or `type` (written back to the file) | Unique; lower case letters, digits and `_`, 64 characters at most |
| `type` | required | One of the types below |
| `name` | from the id | Display name (rule device, panel, cards, journal) |
| `enabled` | `true` | `false` pauses the rule; the rule's switch writes it |
| `respect` | `[]` | Global conditions the rule respects: `quiet_hours`, `away`, `alarm`, `vacation`, `nap` (a room of the house has its nap) |
| `notify` | `settings.notify` | Notification target of this rule |
| `quiet_notify` | `settings.quiet_notify` | Target of this rule during the quiet hours (e.g. only one phone at night) |
| `image` | none | Picture of the notifications (`/local/…`): `image` (Android) and `attachment` (iOS) |
| `icon` | none | Icon of the notifications (`mdi:…`, Android) |
| `url` | the House Rules panel | Opened when the notification is tapped (`/lovelace/…`) |
| `data` | none | Any other notification data, merged as is (nested keys merged one by one, e.g. `push: {sound: {volume: 0}}`) |
| `conditions` | none | Home Assistant conditions (as in an automation): the rule acts only while they all hold |
| `message` | per type | Where a type has one, it may be a template: `{{ rule }}`, `{{ detail }}`, plus the variables of the type (below) |

Message variables: `sensor_flash` → `entity` (and `level` in escalations); `leak_guard` → `sensors`; `vacuum_guard` → `room`, `openings`; `appliance_resume` → `entity`, `progress`, `attempt`.

```yaml
- id: lock_open
  type: sensor_flash
  trigger: {entity_id: lock.front_door, to: unlocked, for: "00:02:00"}
  lights: [light.hall_nightlight]
  message: "{{ entity }} has been unlocked for 2 minutes"
  critical: true
  quiet_notify: notify.mobile_app_my_phone
  image: /local/images/lock.png
  url: /lovelace/security
```

Durations take `"HH:MM:SS"` or a number of seconds; times of day take `"HH:MM"`.

### Rule types

#### `keep_on` — keep entities on

Turns the entities back on when they go off, after `delay`. After `max_attempts` within `window` for the same entity, the rule gives up on it (state `failed`, repair); **Cancel** on the rule makes it try again. An entity cut by a `leak_guard` is left off.

| Option | Default | Description |
|---|---|---|
| `entity_id` | — | Entities (`switch`, `light`, `fan` or any entity `homeassistant.turn_on` handles) |
| `label` | — | A label (id or name): every entity carrying it, now and later. `entity_id` and/or `label` is required |
| `delay` | `00:00:10` | How long an entity stays off before it is turned back on |
| `max_attempts` | `3` | Attempts per entity within `window` |
| `window` | `01:00:00` | The period `max_attempts` counts over |

```yaml
- id: always_on
  type: keep_on
  label: Rallumer Prise
```

#### `auto_off` — turn off after a while

Turns the entities off `duration` after they were turned on. The start times are stored: a restart or a reload doesn't reset them. Turned back on, a timer starts again; **+15 min** (panel, card, `extend_timer`) moves its end.

| Option | Default | Description |
|---|---|---|
| `entity_id` / `label` | — | As for `keep_on` |
| `duration` | — | Time before turning off. Without it, each entity's duration comes from a label named `duree_5min`, `duree_1h`, `duree_1h30` (or `duration_…`); entities with neither are listed in the rule's `no_duration` attribute |
| `power_entity` | none | A power sensor: not turned off while it reads more than `power_above` |
| `power_above` | none | Watts |

```yaml
- id: timed_plugs
  type: auto_off
  label: Extinction automatique   # durations from the duree_* labels
- id: kettle
  type: auto_off
  entity_id: switch.kettle
  duration: "00:05:00"
```

#### `sensor_flash` — light alert with escalation

While the trigger holds (after `for`), the lights flash in `color`; when it ends (or is acknowledged), the lights go back to their state before the alert (`restore`) or off. During quiet hours (when respected) nothing flashes: only the notifications go out. Escalation steps run at `after`, counted from the moment the trigger was entered.

| Option | Default | Description |
|---|---|---|
| `trigger` | required | `entity_id`, `to` (`on`), optional `from`, optional `for` |
| `lights` | required | Lights to flash |
| `color` | `[255, 0, 0]` | RGB |
| `rate` | `1hz` | `1hz`, `2hz` or `pulse` |
| `restore` | `true` | Put the lights back as they were (else off) |
| `message` | none | Notification sent when the alert starts |
| `critical` | `false` | That notification as critical |
| `escalation` | `[]` | Steps: `after` (required), `chime` (a media player) + `media`, `notify` (`normal` or `critical`), `message` |

```yaml
- id: electrical_panel
  type: sensor_flash
  trigger: {entity_id: binary_sensor.electrical_panel_door, to: "on", for: "00:02:00"}
  lights: [light.hallway_night_light, light.living_night_light]
  respect: [quiet_hours]
  message: The electrical panel is open
  escalation:
    - {after: "00:05:00", chime: media_player.living_room_speaker, media: media-source://media_source/local/chime.mp3}
    - {after: "00:10:00", notify: critical}
```

#### `sensor_chime` — a sound on a sensor

Plays a sound when the trigger is entered (from `off` by default, so a sensor coming back online doesn't ring), within `windows`. With `volume`, the player's volume is set, then restored after `duration`. Failures of the player (timeouts, a speaker that doesn't confirm) never stop the rule.

| Option | Default | Description |
|---|---|---|
| `trigger` | required | `entity_id`, `to` (`on`), `from` (`off`) |
| `media_player` | required | The player |
| `media` | — | `media_content_id` to play (`media-source://…`, a URL) |
| `script` | — | A script to run instead (started without waiting) |
| `volume` | none | 0 to 1, restored afterwards |
| `duration` | `00:00:20` | When the volume is restored |
| `windows` | always | Time windows: `[{start: "09:00", end: "13:30"}, …]` |

```yaml
- id: front_door_chime
  type: sensor_chime
  trigger: {entity_id: binary_sensor.front_door}
  media_player: media_player.living_room_speaker
  script: script.doorbell_chime
  volume: 0.4
  windows:
    - {start: "09:00", end: "13:30"}
    - {start: "17:00", end: "21:00"}
```

#### `appliance_resume` — power an appliance back on

When the programme's progress becomes unavailable (the appliance lost power) — or the switch turns off — while the last progress was between 0 and 100 %, the switch is turned back on after `delay` and a critical notification says at which percentage. At most `max_attempts` per programme (reset when the progress reaches 0 or 100 %). Not while a `leak_guard` cut it. `power_on_at` turns the switch on every day at that time.

| Option | Default | Description |
|---|---|---|
| `switch` | required | The appliance's plug or power switch |
| `progress` | — | Programme progress sensor (%) |
| `delay` | `00:00:05` | Wait before powering back on |
| `max_attempts` | `2` | Per programme |
| `power_on_at` | none | Daily power-on time |
| `message` | switch · % · attempt | Notification text (template: `entity`, `progress`, `attempt`) |

```yaml
- id: dishwasher
  type: appliance_resume
  switch: switch.dishwasher_plug
  progress: sensor.dishwasher_programme_progress
  power_on_at: "19:30"
```

#### `cycle_done` — end of a cycle

By power: running above `start_above`, done once below `done_below` for `done_for`. By state: done when `state_entity` enters one of `done_states`. Then a notification, and with `door` + `reminder`, reminders until the door opens (at most `max_reminders`).

| Option | Default | Description |
|---|---|---|
| `power_entity` | — | Power sensor (W) |
| `start_above` | `10` | W: the cycle has started |
| `done_below` | `3` | W: the cycle is over… |
| `done_for` | `00:03:00` | …for this long |
| `state_entity` / `done_states` | — | Or a state that means "done" (`charging`, `finished`…) |
| `door` | none | Door `binary_sensor`: opened = emptied |
| `reminder` | none | Interval of the reminders |
| `max_reminders` | `3` | |
| `message` | rule name | Notification text |
| `critical` | `false` | Critical notification (sound even when muted) |

```yaml
- id: washing_machine
  type: cycle_done
  power_entity: sensor.washing_machine_power
  door: binary_sensor.washing_machine_door
  reminder: "00:30:00"
  message: The washing machine is done
- id: mop_cleaning
  type: cycle_done
  state_entity: sensor.mop_robot_status
  done_states: [charging]
  message: Clean the mop robot
```

#### `vacuum_follow` — lights follow the vacuum

While the robot cleans, the light(s) of the room it is in (from the rooms table) turn on, those of the room it left turn off — unless they were on before it came, or another rule (presence) still wants them. Two rooms sharing a light: nothing changes between them. At the dock, every light the rule turned on goes off.

| Option | Default | Description |
|---|---|---|
| `vacuum` | required | The robot |
| `room_sensor` | required | Its current-room sensor (state = room name) |
| `transition` | `10` | Seconds |
| `dark_below` | none | Lux: only when the room's `illuminance` is below |
| `off_at_dock` | `true` | Turn its lights off when docked |
| `on_dock` | none | Actions (as in a script) run when the robot is back at its base after a run — not after a restart — e.g. the settings of its next run. YAML only |

```yaml
- id: vacuum_lights
  type: vacuum_follow
  vacuum: vacuum.robot
  room_sensor: sensor.robot_current_room
  on_dock:
    - action: vacuum.set_fan_speed
      target: {entity_id: vacuum.robot}
      data: {fan_speed: turbo}
```

#### `vacuum_guard` — back to base when the room is open

While the robot cleans, as soon as it is in a room whose `opening` is open — or an opening of its room opens — it is sent back to its base, with a critical notification. Not when the room's `climate` is running.

| Option | Default | Description |
|---|---|---|
| `vacuum` | required | The robot |
| `room_sensor` | required | Its current-room sensor |
| `message` | room · openings | Notification text |

#### `presence_light` — lights on presence

Presence in the room turns its lights on when it is dark (below `dark_below`, with `hysteresis` once on, since the light raises the level) and within `windows`; no presence for `off_delay` turns them off — unless another rule (the vacuum) still wants them, or they were on before.

- **Sensors**: someone is there while one of the sensors is on (the room's `presence`, or `sensors`). With `on_after`, the presence must last that long first: someone passing by doesn't count.
- **Slots**: the first slot that applies to a light decides — kept off (`off: true`), or turned on at a `brightness` and `color`, with its own `off_delay` (longer in the evening for a bathroom). A slot without `lights` applies to all of them; `days` limits it to some days. Slots may cross midnight.
- **By hand**: a light turned off by hand while someone is there stays off until the room is empty. A light of the room itself (in `rooms:`) on by hand and wanted by no rule is taken over as it is when someone comes in or leaves: nothing else is turned on, and it goes off after the delay once the room is empty. A light shared with another room is left to that room's rule; a light kept off during a nap and turned on by hand stays on.
- **Shared lights**: a light of two rooms (the hallway's, from the entrance) stays on while a rule still wants it.

| Option | Default | Description |
|---|---|---|
| `room` | required | A room of the rooms table (its `presence`, lights and `illuminance`) |
| `sensors` | the room's `presence` | Presence/occupancy/motion `binary_sensor`s |
| `lights` | the room's | The lights turned on and off; any light can be added (the hallway's from the entrance) |
| `dark_below` | none | Lux, read from the room's `illuminance` |
| `hysteresis` | `5` | Lux added once on |
| `on_after` | `0` | How long a presence must last before the lights turn on |
| `off_delay` | `00:00:30` | How long the room stays empty before the lights turn off |
| `transition` | none | Seconds of the fade when the lights turn on and off |
| `windows` | always | Time windows when the rule turns lights on |
| `brightness` | light's own | 1–100 % |
| `brightness_entity` | none | A sensor or number giving the brightness in % (wins over `brightness`) |
| `slots` | none | `start` and `end` — or `during_naps: true`: while a room of the house has its nap, the hours following the naps — optional `days` (`mon` … `sun`) and `lights`, then `off: true`, or `brightness` / `color` (RGB), and optionally `off_delay` |
| `not_during_naps` | none | Lights not turned on while a room of the house has its nap (`rooms[].naps`), and turned off when a nap starts while they are on; `true` for all of the rule's lights |

```yaml
- id: hallway_presence
  type: presence_light
  room: Hallway
  sensors: [binary_sensor.hallway_motion, binary_sensor.hallway_occupancy]
  dark_below: 50
  on_after: 5                    # someone passing by doesn't count
  off_delay: "00:00:30"
  transition: 1
  not_during_naps: [light.hallway]   # the bedroom's nap: only the night light
  slots:
    - {start: "06:30", end: "08:00", days: [mon, tue, wed, thu, fri], off: true}
    - {start: "20:00", end: "09:00", lights: [light.hallway_night_light], brightness: 30, color: [0, 0, 255]}
    - {start: "20:00", end: "09:00", lights: [light.hallway], off: true}
    - {start: "18:00", end: "23:00", lights: [light.bathroom], off_delay: "00:10:00"}
    - {during_naps: true, lights: [light.hallway_night_light], brightness: 10}   # follows the naps
```

#### `lock_guard` — lock and alarm

Locks `lock_after` once the door has closed, and `lock_on_arm_after` once the alarm is armed (door closed). With `disarm_on_unlock`, unlocking disarms the alarm — any unlock, including from the app: only enable it if that is what you want.

| Option | Default | Description |
|---|---|---|
| `lock` | required | The lock |
| `door` | none | Door `binary_sensor` |
| `lock_after` | `00:00:30` | After the door closed |
| `alarm` | none | `alarm_control_panel` |
| `lock_on_arm_after` | `00:01:00` | After the alarm was armed |
| `disarm_on_unlock` | `false` | Disarm when unlocked |

#### `leak_guard` — water leak

A leak sensor turns on: the `cut` entities are turned off and kept from being turned back on by `keep_on` / `appliance_resume` until every sensor is dry; the lights flash red, the chime rings, a (critical) notification goes out. Dry again, the lights are restored; the cut appliances stay off.

| Option | Default | Description |
|---|---|---|
| `sensors` | required | Leak `binary_sensor`s |
| `cut` | `[]` | Entities to turn off |
| `lights` | `[]` | Lights to flash |
| `chime` / `media` | none | Player and sound |
| `message` | wet sensors | Notification text |
| `critical` | `true` | |

```yaml
- id: kitchen_leak
  type: leak_guard
  sensors: [binary_sensor.sink_leak, binary_sensor.dishwasher_leak]
  cut: [switch.dishwasher_plug]
  lights: [light.hallway_night_light]
```

### YAML both ways

- **From the panel to the file**: a save rewrites only the block of the rule (found by its `id`), in the file it comes from; untouched keys keep their comments, `!secret` values stay as they are unless changed. The previous file is kept as `house_rules.yaml.bak`, and the new one is written to a temporary file then renamed (never half written).
- **From the file to the panel**: the files are checked every 5 seconds (and by `house_rules.reload`); only the rules whose definition changed restart, so the timers and alerts of the others keep running. The panel shows "house_rules.yaml changed at … · n rules reloaded".
- **Conflicts**: a save is refused when the file changed since it was read; the panel shows the file's version and yours side by side, to keep one or the other.
- **Invalid file**: the last valid configuration keeps running, a repair gives the file and line, editing in the panel is paused until the file is fixed. An invalid rule alone is skipped (repair listing it), the others run.
- **The YAML tab** edits the whole main file: checked first (YAML and every rule), same conflict rule.
- Without `house_rules.yaml` the configuration is stored by the integration; **Settings → Switch to YAML** writes the file from it. Runtime state (timers, attempts, snoozes, journal) is never written to the YAML.

### Global conditions

| Condition | Paused when | Effect |
|---|---|---|
| `quiet_hours` | inside `settings.quiet_hours` | No light, no sound: notifications only |
| `away` | every `person` is away | The rule does nothing |
| `alarm` | `settings.alarm` is armed | The rule does nothing |
| `vacation` | `switch.house_rules_vacation_mode` is on | The rule does nothing |

The rule's state shows why it is paused.

### Import

**Settings → Import → Analyze** proposes rules from:
- the labels `Rallumer Prise` / `keep on` (→ `keep_on`) and `Extinction automatique` / `auto off` (→ `auto_off`, durations from the `duree_*` labels);
- the automations of `automations.yaml` that look like a light alert (repeat + `rgb_color`), lights following the vacuum (room map), a vacuum guard (`return_to_base` + openings map), an appliance resume (progress → unavailable + switch on), a lock after the door closed, or a chime (volume + player) — with the rooms found in their maps;
- the lights on presence of [Smart Comfort](https://github.com/juju35/ha-smart-comfort) (read from its config entry): a `presence_light` rule per room with presence, and its room — lights, presence sensors, light level sensor — plus the naps of every room, as they are (slots or a shared `schedule` helper).

| Smart Comfort (`rooms[].presence`) | House Rules |
|---|---|
| `sensors`, `lux` | room `presence`, `illuminance` |
| `lights` | rule `lights` (default: the room's) |
| `max_lux` | `dark_below` |
| `on_after` (seconds), `off_after` (minutes) | `on_after`, `off_delay` |
| `transition`, `not_during_naps` | the same |
| `slots` (`off_after` in minutes, `during_naps`) | `slots` (`off_delay`, `during_naps`) |
| `rooms[].naps` | `rooms.<room>.naps` |

Smart Comfort turns the lights on at the brightness of the moment (adaptive lighting): House Rules uses the slot or rule `brightness`, else the light's own. Once imported, remove the room's `presence:` from Smart Comfort so that only one of them acts.

Pick what to import: the rules are added, the rooms merged (existing rooms kept), and the imported automations **turned off, never deleted**.

### Cards

All cards share the illustrated header: one object per rule family on the ground bar (plug, lamp, robot, lock, bell, appliance, drop), coloured by the worst state of the family and animated (alert blinking, robot moving, lamp glowing). At most four objects are drawn: the most urgent families first (an alert always shows), in their usual order; the night look follows a dark theme, or `illustration_theme`.

#### Overview (`custom:house-rules-card`)

An alert banner per rule in alert (with **Acknowledge**), then one tile per rule type: the most important state of its rules.

| Option | Default | Editor | Description |
|---|---|---|---|
| `title` | House Rules | yes | |
| `illustration_theme` | `auto` | yes | `auto`, `day`, `night` |
| `types` | all | YAML only | Rule types to show |

#### Mini card (`custom:house-rules-mini-card`)

The overview folded to its header (status pill: alerts, timers or all good); the corner button unfolds it, a click outside folds it. Same options (both).

#### Timers (`custom:house-rules-timers-card`)

One ring per running auto-off timer, with **+15** and **turn off**.

| Option | Default | Description |
|---|---|---|
| `title` | Timers | |

#### Activity (`custom:house-rules-activity-card`)

The latest runs, with filters (all, alerts, plugs, vacuum, failures).

| Option | Default | Description |
|---|---|---|
| `title` | Activity | |
| `limit` | `8` | Lines shown |

```yaml
type: custom:house-rules-mini-card
---
type: custom:house-rules-timers-card
---
type: custom:house-rules-activity-card
limit: 6
```

### Entities

One device per rule, plus the House Rules device:

| Entity | Description |
|---|---|
| `switch.<rule>_enabled` | The rule on or off (writes `enabled: false` to the configuration) |
| `sensor.<rule>_state` | `disabled`, `snoozed`, `idle`, `armed`, `active`, `alert`, `waiting`, `failed`; attributes: `rule_id`, `rule_type`, `detail`, `blocked_by`, `snoozed_until`, `last_run` and the type's own (timers, attempts, progress, room, lights on…) |
| `button.<rule>_test` | Runs the rule's action once |
| `switch.house_rules_vacation_mode` | Pauses the rules that respect `vacation` |
| `sensor.house_rules_active_alerts` | Number of rules in alert (`house_rules_alerts` attribute: which) |
| `sensor.house_rules_running_timers` | Number of running auto-off timers (`timers` attribute: entity, start, end) |
| `button.house_rules_acknowledge_alerts` | Ends every alert |

### Actions

| Action | Fields | Description |
|---|---|---|
| `house_rules.trigger` | `rule` (ids) | Run the rules' action once (Test) |
| `house_rules.snooze` | `rule`, `minutes` | Pause rules (0 or empty: resume now) |
| `house_rules.cancel` | `rule` | Stop what a rule is doing (alert, timers) or forget its failures |
| `house_rules.acknowledge` | `rule` (optional) | End alerts (all when no rule) |
| `house_rules.extend_timer` | `entity_id`, `minutes` (15) | Move the end of auto-off timers (negative: sooner) |
| `house_rules.reload` | — | Read `house_rules.yaml` again; returns the reloaded rules |
| `house_rules.export_yaml` | — | Returns the whole configuration as YAML |

### Events

`house_rules_fired` on every run: `rule`, `type`, `name`, `action` (`turned_on`, `turned_off`, `alert`, `escalation`, `cleared`, `chime`, `resumed`, `done`, `light_on`, `light_off`, `returned`, `locked`, `leak`…), `detail`, `result` (`ok`, `skipped`, `active`, `failed`).

### Diagnostics

**Settings → Devices & services → House Rules → Download diagnostics**: configuration, rule states, conditions, light claims and the latest runs (notification targets redacted).

## How it works

- Each rule listens to the state changes of its entities (no polling, except a 15-second tick for the timers and the missed changes).
- Every action is a service call with the integration's own context, logged in the journal (kept 14 days, 300 entries) and sent as a `house_rules_fired` event.
- Lights turned on by a rule are *claimed*: a light goes off only when no rule claims it any more, and never when it was on before the first claim. The flashing alerts take a snapshot of the lights and restore it.
- Time windows may cross midnight. All times follow Home Assistant's time zone.

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
| Deutsch | `de` |
| Español | `es` |
| Italiano | `it` |
| Nederlands | `nl` |
| Português | `pt`, `pt-BR` |
| Polski | `pl` |
| Српски | `sr` |
| Srpski (latinica) | `sr-Latn` |
| Română | `ro` |
| Dansk | `da` |
| Svenska | `sv` |
| Български | `bg` |
| Русский | `ru` |
| Українська | `uk` |
| Magyar | `hu` |
| Slovenčina | `sk` |
| Čeština | `cs` |
| Slovenščina | `sl` |
| Latviešu | `lv` |
| Ελληνικά | `el` |

The integration (config flow, entities, actions, repairs), the panel and the cards are translated in every language above. Corrections and new languages are welcome!

## License

[MIT](https://github.com/juju35/ha-house-rules/blob/main/LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
