# House Rules — Agent Context

## Purpose
Home Assistant custom integration replacing reflex automations (plugs kept on / timed off, light alerts, lights
following the vacuum, appliance resume, chimes, end of cycle, leak guard, presence lights, lock guard) with rules
that keep their state, share global conditions, arbitrate the lights and log what they do.

## Architecture

```
custom_components/house_rules/
├── __init__.py      # actions (trigger, snooze, cancel, acknowledge, extend_timer, reload, export_yaml), entry setup
├── const.py         # domain, rule types, states, conditions, defaults
├── schema.py        # voluptuous: one schema per rule type (TYPE_SCHEMAS), ROOM, SETTINGS, validate_config
├── yamlsource.py    # pure file code: house_rules.yaml round-trip with ruamel (comments kept), ids generated,
│                    #   !secret / !include / !include_dir_merge_list, atomic write + .bak, ConflictError on hash change
├── source.py        # ConfigSource: YAML file when it exists (a broken file keeps the last good config), else Store
├── manager.py       # HouseRules: applies a raw config (validate, restart only changed rules), watches the file
│                    #   (WATCH_INTERVAL), conditions (quiet/away/alarm/vacation), LightArbiter, journal, notify, Store
├── rules/           # one class per type (base.Rule: gates, listeners, snooze, status, test/cancel)
│   ├── plugs.py     #   keep_on, auto_off (label durations duree_*)
│   ├── alerts.py    #   sensor_flash (Flasher, escalation), sensor_chime (play), leak_guard (blocks appliances)
│   ├── appliances.py#   appliance_resume (progress -> unavailable < 100 %), cycle_done
│   ├── rooms.py     #   vacuum_follow, vacuum_guard, presence_light (rooms table)
│   └── security.py  #   lock_guard
├── importer.py      # proposals from labels and automations.yaml (heuristics)
├── websocket.py     # house_rules/subscribe (any user; config for admins), action, timer, rule/save|delete|yaml,
│                    #   section/save, yaml/enable, reload, import/analyze|apply, vacation
├── panel.py         # static path, panel "house-rules" (admin), icon set + badge modules, cards as resources
├── entity.py / switch.py / sensor.py / button.py  # per-rule entities added/removed with the rules (SIGNAL_RULES)
├── frontend/house-rules-cards.js   # 4 cards + shared helpers (window.__houseRulesShared) the panel reuses
├── frontend/house-rules-panel.js   # panel: loads the cards module first, then draws its own content
├── frontend/house-rules-icons.js   # icon set house-rules:emblem
└── frontend/house-rules-badge.js   # sidebar badge: alerts (red) else timers (accent)
```

## Rules
- The raw configuration (as written) is what is saved; validation gives `cfg` (timedeltas, defaults). A rule restarts
  only when its raw dict changed (or the rooms table changed, for `depends_on_rooms` rules).
- Times use `dt_util.utcnow().timestamp()` (frozen in tests), never `time.time()`.
- Delayed actions: `Rule.later(seconds, async_fn)` with a coroutine function or `functools.partial` of one (a lambda
  would run as an executor job).
- Lights: rules that turn lights on go through `manager.arbiter.claim/release`; the flasher snapshots and restores.
- Runtime state (timers, attempts, snoozes, phases, journal, vacation) lives in Store `house_rules`, never in the YAML.
