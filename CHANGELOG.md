# Changelog

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
