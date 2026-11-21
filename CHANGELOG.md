# Changelog

## 1.5.0 - 2026-11-21

### Features
- Panel: past 24 px of scroll the top bar folds into one sticky bar, as on the dashboards' illustrated headers (ha-dashboard-header) — the icon, title and line, the tabs as round icon pills with their counts, the status pill and the round buttons; back at the top it unfolds. The content does not move. On a narrow panel the pills get a row of their own under the bar, the status turns to a dot and only the first round button is kept.

## 1.4.2 - 2026-11-20

### Fixes
- Sidebar: the panel's icon no longer stays blank on a page's first load (until a reload). Home Assistant draws an icon whose set is not registered yet in a legacy mode it never leaves; the icon module now clears it and draws the icon again once the sidebar is there.

## 1.4.1 - 2026-11-20

### Fixes
- Rooms tab: a room's sections fold with the chevron pointing right when folded and down when open (it pointed down when folded and up when open).
- Mini card: the expand / fold button is the 24 px frosted corner button (`arrow-expand` / `arrow-collapse`) of the other mini cards, in the header's top-right corner, instead of a 36 px chevron next to the status pill.
- Diagnostics also redact the notification texts (`message`) and the rooms' presence entities (`presence`), which can carry people's names.
- Disabling or reloading the integration removes its sidebar panel (it stayed, showing "not loaded"); setup adds it back.

### Maintenance
- A test checks that the diagnostics redact the notification targets, texts and presence entities.
- Tests of the panel and card resources registration (panel.py coverage 27 % → 86 %).

## 1.4.0 - 2026-11-20

### Features
- **Rooms tab, as on Smart Comfort**: a folding card per room instead of a table of entity ids.
  - Its header: the room's area icon, its live state (someone there, a nap, an opening open, entities unavailable),
    what it holds and how many rules use it; move up / down and remove.
  - Inside: its name and Home Assistant area, the rules that use it (each opens its editor), then its sections —
    lights, windows and doors, presence and light level, devices, naps — with Home Assistant's entity pickers; the
    empty sections are offered as **+** chips. Naps: from / until and day buttons, or a nap schedule entity.
  - **Discover** fills the rooms from the Home Assistant areas (lights, openings, presence and light level sensors,
    air conditioner); a room keeps what it has and nothing is saved before **Save**. The areas without a room are
    offered at the end of the list.
- Rooms: a new optional `area` key, the room's Home Assistant area.

## 1.3.2 - 2026-11-20

### Fixes
- Import from Smart Comfort: a slot written with an unquoted `off: true` (read by YAML as a `false` key, then stored
  as `"false"` in Smart Comfort's config entry) is imported as kept off, instead of turning the light on.
- Imported rule ids fold the accents: `presence_entree` for the Entrée, no longer `presence_entr_e` (ids already
  imported stay as they are).
- `presence_light`: a nap that starts while the lights are on turns off those kept off during the naps
  (`not_during_naps`) — at once for a nap entity, within a minute for a nap slot. They used to stay on until the room
  was empty.

## 1.3.1 - 2026-11-20

### Fixes
- Panel: the unsaved changes of the Rooms, YAML and Settings tabs (Cancel / Save) gather in one bar, sticky at the
  bottom of the page, as on System Hub — no longer buttons in the tab's header row or at the end of a card.

## 1.3.0 - 2026-11-20

### Features
- Import from Smart Comfort: **Settings → Import → Analyze** proposes a `presence_light` rule per Smart Comfort room
  with lights on presence (read from its config entry), with its room — lights, presence sensors, light level sensor —
  and the naps of every room, as they are. `max_lux` → `dark_below`, `off_after` (minutes) → `off_delay`, slots with
  their `off_after` and `during_naps`. A room that already has a `presence_light` rule is not proposed again.

### Fixes
- Panel header: laid out by the width of the panel, not of the window — with the sidebar open, the title no longer
  wraps and the header is no longer cut. The menu button only shows when Home Assistant hides the sidebar, the title
  and summary end with an ellipsis, and the tabs scroll instead of wrapping on a narrow screen.

## 1.2.0 - 2026-11-20

### Features
- `presence_light` reaches what Smart Comfort's lights on presence do, so they can move here:
  - several sensors (`sensors`, or a list in the room's `presence`): someone is there while one of them is on;
  - `on_after`: a presence must last that long before the lights turn on (someone passing by doesn't count);
  - `transition`: fade when the lights turn on and off;
  - `slots`: per time slot (and days) — or `during_naps: true`, while a room of the house has its nap — some lights
    kept off, or turned on at a brightness and colour, with their own delay before off;
  - `lights`: the lights of the rule, other rooms' included (default: the room's);
  - a light turned off by hand while someone is there stays off until the room is empty; nothing is turned on while a
    light of the room is already on by hand.
- Naps: `rooms[].naps` (`start`, `end`, optional `days`). While a room of the house has its nap, the rules that
  respect the new `nap` condition are paused (a chime, a light alert…), and `presence_light` keeps its
  `not_during_naps` lights off. A nap may also be an on/off entity: a `schedule` helper shared with Smart Comfort
  (one definition for both integrations), an `input_boolean` for an unplanned nap. The Rooms tab edits them on one
  line (`13:30-15:00; sat,sun 14:00-16:00; schedule.nap_bedroom`).
- Rooms tab: several presence sensors separated by commas.

## 1.1.1 - 2026-11-20

### Fixes
- Panel, Rules tab: each rule keeps its buttons (Test, enable, Edit) on one line at the right, with its state under its
  name; the rows no longer wrap unevenly when the editor is open.

## 1.1.0 - 2026-11-20

### Features
- 20 new languages for the integration, the panel and the cards: German, Spanish, Italian, Dutch, Portuguese
  (and Brazilian Portuguese for the integration), Polish, Serbian (Cyrillic and Latin), Romanian, Danish, Swedish,
  Bulgarian, Russian, Ukrainian, Hungarian, Slovak, Czech, Slovenian, Latvian and Greek.

### Fixes
- Illustrated header (cards and panel): at most four objects, the most urgent families first (an alert is always
  shown), so the scene no longer runs under the title, the status or the panel's buttons when many rule types are set.

## 1.0.1 - 2026-11-20

### Fixes
- Appliance resume: only a power cut (the progress going unavailable) powers the appliance back on — a switch turned
  off by hand to cancel the programme no longer turns back on.
- Notifications: one tag per rule, so a rule's notification no longer replaces another rule's (an end of cycle no
  longer hides a leak alert).
- Timed off: an entity that left the rule (label removed, `entity_id` changed) drops its timer instead of showing a
  timer that never ends.
- Vacuum lights: room changes in quick succession are handled one at a time (no light left on or turned off by a race).
- Light alerts: an alert that starts during quiet hours starts flashing when they end; lights without colour flash in
  brightness only (no failing call at every flash). Tests return at once (the 6-second flash stops by itself).
- Presence light: getting dark while someone is in the room turns the lights on.
- End of cycle: restarted during a cycle with the power already low, the end is still detected.
- YAML: a file added to an `!include_dir_merge_list` folder is picked up without a manual reload.
- Rule devices follow a renamed rule or a changed type.
- Panel: typing in the Settings fields is no longer lost when an update arrives; quiet hours can be turned off; fonts
  of tabs, chips and buttons (an invalid CSS shorthand made them fall back to the default font).
- Cards: redrawn when House Rules, the theme or the language change — no longer at every state change of Home Assistant.
- WebSocket: Test, snooze, cancel and vacation mode for administrators; acknowledging alerts and the timers' buttons
  stay open to every user (cards).

### Maintenance
- Tests for every fix, the chime, the vacuum guard, end of cycle, the import; Node tests of the cards module (CI job
  "JS tests").

## 1.0.0 - 2026-11-20

### Features
- First release. Rule types: keep on, timed off (durations from the rule or from `duree_*` labels), light alert
  with escalation (chime, notification), chime, appliance resume (with scheduled power-on), end of cycle (power or
  state, reminders until the door opens), lights that follow the vacuum, vacuum guard (back to base when the room's
  opening is open), presence light, lock guard (lock after the door closes / the alarm is armed, optional disarm on
  unlock) and leak guard (cuts appliances and keeps them from being resumed).
- `house_rules.yaml` as the source of truth, edited both ways: the panel rewrites only the block of a rule (by `id`),
  comments and layout kept, `.bak` copy, atomic write; changes made in the file are picked up within seconds and only
  the changed rules restart; a write over a file changed meanwhile is refused and both versions are shown;
  `!secret`, `!include` and `!include_dir_merge_list` supported. Without the file, the configuration lives in
  storage and can be switched to YAML in one click.
- Global conditions (quiet hours, nobody home, alarm armed, vacation mode) that each rule may respect.
- Light arbitration: a light is turned off only when no rule wants it any more, and never when it was on before.
- Sidebar panel (Activity, Rules, Rooms, Journal, YAML — the whole file, editable —, Settings) with its emblem and a count badge; import of the
  `Rallumer Prise` / `Extinction automatique` labels and of recognised automations (turned off, never deleted).
- Cards: `house-rules-card`, `house-rules-mini-card`, `house-rules-timers-card`, `house-rules-activity-card`.
- Entities per rule (enabled switch, state sensor, test button), vacation switch, alerts and timers sensors;
  actions `trigger`, `snooze`, `cancel`, `acknowledge`, `extend_timer`, `reload`, `export_yaml`; repairs when a rule
  gives up or the YAML is invalid; diagnostics.
