"""The House Rules runtime: configuration, rules, shared conditions, light arbitration, journal and state."""

from __future__ import annotations

import asyncio
import copy
import logging
from collections import deque
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.const import STATE_ON
from homeassistant.core import Context, CoreState, HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    COND_ALARM,
    COND_AWAY,
    COND_NAP,
    COND_QUIET,
    COND_VACATION,
    DEFAULT_SETTINGS,
    DOMAIN,
    EVENT_FIRED,
    JOURNAL_DAYS,
    JOURNAL_SIZE,
    SIGNAL_RULES,
    SIGNAL_UPDATE,
    STORAGE_KEY,
    STORAGE_VERSION,
    WATCH_INTERVAL,
    WEEKDAYS,
)
from .schema import validate_config, validate_rule
from .source import ConfigSource

if TYPE_CHECKING:
    from .rules.base import Rule

_LOGGER = logging.getLogger(__name__)

NOTIFY_WAIT = 120  # Seconds a notification waits, during startup, for its notify service to appear.


def in_window(now: datetime, start: Any, end: Any) -> bool:
    """`now` (local) between two times of day; a window may cross midnight."""
    t = now.time().replace(tzinfo=None)
    if start <= end:
        return start <= t < end
    return t >= start or t < end


class LightArbiter:
    """Who wants which light on. A light is turned off only when no rule wants it any more, and only if a rule turned
    it on (a light that was already on before stays on)."""

    def __init__(self, manager: HouseRules) -> None:
        self.manager = manager
        self.claims: dict[str, set[str]] = {}
        self.was_on: dict[str, bool] = {}

    def wanted(self, light: str) -> bool:
        return bool(self.claims.get(light))

    async def claim(self, owner: str, light: str, **params: Any) -> bool:
        """`owner` wants `light` on. True when this call turned it on."""
        hass = self.manager.hass
        holders = self.claims.setdefault(light, set())
        first = not holders
        holders.add(owner)
        state = hass.states.get(light)
        if first:
            self.was_on[light] = bool(state and state.state == "on")
        if state and state.state == "on":
            return False
        await self.manager.call("light", "turn_on", {"entity_id": light, **params})
        return True

    async def release(self, owner: str, light: str, **params: Any) -> bool:
        """`owner` no longer wants `light`. True when the light was turned off."""
        holders = self.claims.get(light)
        if not holders or owner not in holders:
            return False
        holders.discard(owner)
        if holders:
            return False
        self.claims.pop(light, None)
        if self.was_on.pop(light, False):
            return False
        state = self.manager.hass.states.get(light)
        if state and state.state == "on":
            await self.manager.call("light", "turn_off", {"entity_id": light, **params})
            return True
        return False

    def holders(self, light: str) -> set[str]:
        return set(self.claims.get(light, ()))


class HouseRules:
    """Everything one config entry runs."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.source = ConfigSource(hass)
        self.store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.raw: dict[str, Any] = {"settings": {}, "rooms": {}, "rules": []}
        self.config: dict[str, Any] = {"settings": dict(DEFAULT_SETTINGS), "rooms": {}, "rules": []}
        self.rules: dict[str, Rule] = {}
        self.errors: dict[str, str] = {}
        self.arbiter = LightArbiter(self)
        self.journal: deque[dict[str, Any]] = deque(maxlen=JOURNAL_SIZE)
        self.state: dict[str, Any] = {}
        self.vacation = False
        self.blocked: dict[str, set[str]] = {}  # entity -> rule ids blocking it (leak guard)
        self.context_ids: deque[str] = deque(maxlen=200)
        self.last_reload: dict[str, Any] | None = None
        self._unsubs: list[Any] = []
        self._started = False

    # ---------- lifecycle ----------
    async def async_start(self) -> None:
        stored = await self.store.async_load() or {}
        self.state = stored.get("state", {})
        self.vacation = bool(stored.get("vacation", False))
        cutoff = dt_util.utcnow().timestamp() - JOURNAL_DAYS * 86400
        self.journal.extend(e for e in stored.get("journal", []) if e.get("ts", 0) >= cutoff)
        await self.source.async_load()
        await self._apply(self.source.raw, initial=True)
        self._unsubs.append(async_track_time_interval(self.hass, self._async_watch, timedelta(seconds=WATCH_INTERVAL)))
        self._started = True

    async def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        for rule in list(self.rules.values()):
            await rule.async_stop()
        await self.async_save_now()
        self._started = False

    def _data(self) -> dict[str, Any]:
        return {"state": self.state, "vacation": self.vacation, "journal": list(self.journal)}

    @callback
    def save(self) -> None:
        self.store.async_delay_save(self._data, 5)

    async def async_save_now(self) -> None:
        await self.store.async_save(self._data())

    # ---------- configuration ----------
    async def _apply(self, raw: dict[str, Any], initial: bool = False) -> list[str]:
        """Validate and run a raw configuration; restart only the rules whose definition changed."""
        from .rules import build_rule

        self.raw = copy.deepcopy(raw)
        errors: dict[str, str] = {}
        try:
            base = validate_config({**raw, "rules": []})
        except vol.Invalid as err:
            errors["settings"] = str(err)
            base = {"settings": dict(DEFAULT_SETTINGS), "rooms": {}, "rules": []}
        rules: list[dict[str, Any]] = []
        seen: set[str] = set()
        for item in raw.get("rules") or []:
            rid = str(item.get("id", "?")) if isinstance(item, dict) else "?"
            try:
                rule = validate_rule(item)
            except vol.Invalid as err:
                errors[rid] = str(err)
                continue
            if rule["id"] in seen:
                errors[rid] = "duplicate id"
                continue
            seen.add(rule["id"])
            rules.append(rule)
        self.config = {"settings": {**DEFAULT_SETTINGS, **base["settings"]}, "rooms": base["rooms"], "rules": rules}
        self.errors = errors
        raw_by_id = {str(r.get("id")): r for r in raw.get("rules") or [] if isinstance(r, dict)}
        changed: list[str] = []
        new_ids = {r["id"] for r in rules}
        for rid in [r for r in self.rules if r not in new_ids]:
            await self.rules.pop(rid).async_stop()
            changed.append(rid)
        for cfg in rules:
            rid = cfg["id"]
            current = self.rules.get(rid)
            unchanged = current is not None and current.raw == raw_by_id.get(rid)
            if unchanged and (not current.depends_on_rooms or current.rooms_snapshot == self.rooms):
                continue
            if current is not None:
                await current.async_stop()
            rule = build_rule(self, cfg, raw_by_id.get(rid, cfg))
            self.rules[rid] = rule
            await rule.async_setup_conditions()
            await rule.async_start()
            changed.append(rid)
        # Keep the panel's order.
        self.rules = {r["id"]: self.rules[r["id"]] for r in rules if r["id"] in self.rules}
        self._sync_issues()
        if not initial:
            async_dispatcher_send(self.hass, SIGNAL_RULES)
        self.update()
        return changed

    @property
    def rooms(self) -> dict[str, Any]:
        return self.config["rooms"]

    @property
    def settings(self) -> dict[str, Any]:
        return self.config["settings"]

    async def async_reload(self) -> list[str]:
        await self.source.async_load()
        changed = await self._apply(self.source.raw)
        self.last_reload = {"ts": dt_util.utcnow().timestamp(), "rules": changed, "error": self.source.info()["error"]}
        return changed

    async def _async_watch(self, _now: datetime) -> None:
        if await self.source.async_changed():
            _LOGGER.debug("house_rules.yaml changed: reloading")
            await self.async_reload()

    def _sync_issues(self) -> None:
        if self.source.error is not None:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                "yaml_error",
                is_fixable=False,
                severity=ir.IssueSeverity.ERROR,
                translation_key="yaml_error",
                translation_placeholders={
                    "file": str(self.source.error.file or self.source.path),
                    "line": str(self.source.error.line or "?"),
                    "error": str(self.source.error),
                },
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "yaml_error")
        if self.errors:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                "invalid_rules",
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="invalid_rules",
                translation_placeholders={"rules": ", ".join(f"{k}: {v}" for k, v in self.errors.items())},
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, "invalid_rules")

    async def async_save_rule(self, raw: dict[str, Any], previous_id: str | None = None) -> None:
        """Validate then write one rule (to the YAML file or storage) and apply it."""
        validate_rule(raw)
        others = [r for r in self.raw.get("rules", []) if r.get("id") not in {raw["id"], previous_id}]
        if previous_id != raw["id"] and any(r.get("id") == raw["id"] for r in others):
            raise vol.Invalid(f"duplicate rule id: {raw['id']}")
        await self.source.async_save_rule(raw, previous_id)
        await self.async_reload()

    async def async_delete_rule(self, rid: str) -> None:
        await self.source.async_delete_rule(rid)
        await self.async_reload()

    async def async_save_section(self, section: str, value: dict[str, Any]) -> None:
        validate_config({**self.raw, section: value, "rules": []})
        await self.source.async_save_section(section, value)
        await self.async_reload()

    async def async_set_rule_enabled(self, rid: str, enabled: bool) -> None:
        raw = next((dict(r) for r in self.raw.get("rules", []) if r.get("id") == rid), None)
        if raw is None:
            return
        if enabled:
            raw.pop("enabled", None)
        else:
            raw["enabled"] = False
        await self.async_save_rule(raw)

    # ---------- shared conditions ----------
    def quiet(self, now: datetime | None = None) -> bool:
        window = self.settings.get("quiet_hours")
        if not window:
            return False
        start, end = _as_time(window["start"]), _as_time(window["end"])
        return in_window(now or dt_util.now(), start, end)

    def away(self) -> bool:
        people = self.hass.states.async_all("person")
        return bool(people) and all(p.state != "home" for p in people)

    def alarm_armed(self) -> bool:
        entity = self.settings.get("alarm")
        state = self.hass.states.get(entity) if entity else None
        return bool(state and state.state.startswith("armed"))

    def blocked_by(self, respect: list[str]) -> str | None:
        """The first respected condition that stops the rule now (quiet hours only mute lights and sounds)."""
        if COND_VACATION in respect and self.vacation:
            return COND_VACATION
        if COND_AWAY in respect and self.away():
            return COND_AWAY
        if COND_ALARM in respect and self.alarm_armed():
            return COND_ALARM
        if COND_NAP in respect and self.napping():
            return COND_NAP
        return None

    def napping(self) -> list[str]:
        """The rooms having their nap now: a slot of now, or a nap entity that is on."""
        now = dt_util.now()
        day = WEEKDAYS[now.weekday()]
        return [
            name
            for name, room in self.rooms.items()
            if any(self._nap_now(nap, now, day) for nap in room.get("naps") or [])
        ]

    def _nap_now(self, nap: str | dict[str, Any], now: datetime, day: str) -> bool:
        if isinstance(nap, str):
            state = self.hass.states.get(nap)
            return state is not None and state.state == STATE_ON
        return (not nap.get("days") or day in nap["days"]) and in_window(now, nap["start"], nap["end"])

    def muted(self, respect: list[str]) -> bool:
        return COND_QUIET in respect and self.quiet()

    def conditions(self) -> dict[str, Any]:
        return {
            "quiet": self.quiet(),
            "away": self.away(),
            "alarm": self.alarm_armed(),
            "vacation": self.vacation,
            "napping": self.napping(),
            "people_home": sum(1 for p in self.hass.states.async_all("person") if p.state == "home"),
        }

    async def async_set_vacation(self, value: bool) -> None:
        self.vacation = value
        self.save()
        self.update()

    # ---------- actions ----------
    def context(self) -> Context:
        ctx = Context()
        self.context_ids.append(ctx.id)
        return ctx

    def ours(self, ctx: Context | None) -> bool:
        return bool(ctx and (ctx.id in self.context_ids or (ctx.parent_id and ctx.parent_id in self.context_ids)))

    async def call(self, domain: str, service: str, data: dict[str, Any], blocking: bool = True) -> bool:
        """A service call with our own context; False (logged) when it fails."""
        try:
            await self.hass.services.async_call(domain, service, data, blocking=blocking, context=self.context())
        except Exception as err:  # noqa: BLE001 - a failed action must not break the rule
            _LOGGER.warning("%s.%s failed: %s", domain, service, err)
            return False
        return True

    async def notify(
        self,
        target: str | None,
        title: str,
        message: str,
        critical: bool = False,
        tag: str | None = None,
        options: dict[str, Any] | None = None,
    ) -> bool:
        """Send a notification. `options`: a rule's image / icon / url / data."""
        options = options or {}
        if not target and self.quiet():
            target = self.settings.get("quiet_notify")
        target = target or self.settings.get("notify")
        if not target:
            return False
        service = target.removeprefix("notify.")
        data: dict[str, Any] = {"title": title, "message": message}
        # One tag per rule: a rule's next notification replaces its previous one, never another rule's.
        extra: dict[str, Any] = {
            "url": options.get("url") or f"/{DOMAIN.replace('_', '-')}/activity",
            "tag": tag or DOMAIN,
        }
        if critical:
            extra["push"] = {"interruption-level": "critical", "sound": {"name": "default", "critical": 1, "volume": 1}}
        if image := options.get("image"):
            # iOS shows the attachment, Android the image.
            extra["image"] = image
            extra["attachment"] = {"url": image}
        if icon := options.get("icon"):
            extra["notification_icon"] = icon
        data["data"] = deep_merge(extra, options.get("data") or {})
        # While Home Assistant starts, the target (another integration's notify service) may not be there yet:
        # wait for it a little rather than lose the notification.
        for _ in range(NOTIFY_WAIT):
            if self.hass.state is CoreState.running or self.hass.services.has_service("notify", service):
                break
            await asyncio.sleep(1)
        return await self.call("notify", service, data)

    # ---------- journal ----------
    def log(self, rule: Rule | None, action: str, detail: str = "", result: str = "ok") -> None:
        entry = {
            "ts": dt_util.utcnow().timestamp(),
            "rule": rule.id if rule else None,
            "type": rule.type if rule else None,
            "name": rule.name if rule else None,
            "action": action,
            "detail": detail,
            "result": result,
        }
        self.journal.append(entry)
        self.hass.bus.async_fire(EVENT_FIRED, entry)
        self.save()
        self.update()

    # ---------- leak guard blocking ----------
    def block(self, entity: str, rid: str) -> None:
        self.blocked.setdefault(entity, set()).add(rid)

    def unblock(self, entity: str, rid: str) -> None:
        if entity in self.blocked:
            self.blocked[entity].discard(rid)
            if not self.blocked[entity]:
                del self.blocked[entity]

    def is_blocked(self, entity: str) -> bool:
        return bool(self.blocked.get(entity))

    # ---------- status ----------
    @callback
    def update(self) -> None:
        async_dispatcher_send(self.hass, SIGNAL_UPDATE)

    def alerts(self) -> list[dict[str, Any]]:
        return [r.status() for r in self.rules.values() if r.status()["state"] == "alert"]

    def timers(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for rule in self.rules.values():
            out.extend(rule.timers())
        return sorted(out, key=lambda t: t["ends"])

    def snapshot(self) -> dict[str, Any]:
        """Everything the panel and the cards show."""
        return {
            "rules": [r.status() for r in self.rules.values()],
            "errors": self.errors,
            "raw": self.raw,
            "rooms": self.raw.get("rooms", {}),
            "settings": {**DEFAULT_SETTINGS, **(self.raw.get("settings") or {})},
            "timers": self.timers(),
            "alerts": self.alerts(),
            "journal": list(self.journal)[-100:],
            "conditions": self.conditions(),
            "source": {**self.source.info(), "last_reload": self.last_reload},
            "claims": {k: sorted(v) for k, v in self.arbiter.claims.items() if v},
        }


def _as_time(value: Any) -> Any:
    if isinstance(value, str):
        return dt_util.parse_time(value)
    return value


def deep_merge(base: dict[str, Any], extra: dict[str, Any]) -> dict[str, Any]:
    """`base` with `extra` merged in, nested dicts merged key by key (extra wins)."""
    out = dict(base)
    for key, value in extra.items():
        out[key] = deep_merge(out[key], value) if isinstance(value, dict) and isinstance(out.get(key), dict) else value
    return out
