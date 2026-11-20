# Changelog

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
