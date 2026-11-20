"""keep_on (turn a plug back on) and auto_off (turn it off a while after it was turned on)."""

from __future__ import annotations

import re
from datetime import datetime
from functools import partial
from typing import Any

from homeassistant.core import Event, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers import label_registry as lr
from homeassistant.helpers.entity_registry import async_get as async_get_er
from homeassistant.util import dt as dt_util

from ..const import AUTO_OFF, DOMAIN, KEEP_ON, ST_ACTIVE, ST_ARMED, ST_FAILED, ST_IDLE, TICK
from .base import UNAVAILABLE, Rule, changed


class KeepOn(Rule):
    """Turns the target entities back on when they go off (after `delay`), at most `max_attempts` per `window`."""

    type = KEEP_ON

    async def async_start(self) -> None:
        self.track(self.targets(), self._on_change)
        self.every(TICK, self._tick)

    @callback
    def _on_change(self, event: Event) -> None:
        _, new = changed(event)
        if new and new.state == "off":
            self.later(self.cfg["delay"].total_seconds(), partial(self._delayed, new.entity_id))

    async def _tick(self, _now: datetime) -> None:
        delay = self.cfg["delay"].total_seconds()
        for entity in self.targets():
            st = self.state(entity)
            if st and st.state == "off" and dt_util.utcnow().timestamp() - st.last_changed.timestamp() >= delay:
                await self._turn_on(entity)

    async def _delayed(self, entity: str, _now: datetime) -> None:
        await self._check(entity)

    async def _check(self, entity: str) -> None:
        st = self.state(entity)
        if st and st.state == "off":
            await self._turn_on(entity)

    def _attempts(self, entity: str) -> list[float]:
        window = self.cfg["window"].total_seconds()
        attempts = [
            t for t in self.data.setdefault("attempts", {}).get(entity, []) if dt_util.utcnow().timestamp() - t < window
        ]
        self.data["attempts"][entity] = attempts
        return attempts

    def _failed(self) -> list[str]:
        return list(self.data.get("failed", []))

    async def _turn_on(self, entity: str) -> None:
        if not self.active() or self.manager.is_blocked(entity) or entity in self._failed():
            return
        attempts = self._attempts(entity)
        if len(attempts) >= self.cfg["max_attempts"]:
            self.data.setdefault("failed", []).append(entity)
            self.log("gave_up", f"{self.friendly(entity)}: {len(attempts)} attempts", "failed")
            if self.manager.settings.get("repairs", True):
                ir.async_create_issue(
                    self.hass,
                    DOMAIN,
                    f"keep_on_failed_{self.id}",
                    is_fixable=False,
                    severity=ir.IssueSeverity.WARNING,
                    translation_key="keep_on_failed",
                    translation_placeholders={"rule": self.name, "entity": self.friendly(entity)},
                )
            return
        attempts.append(dt_util.utcnow().timestamp())
        domain = entity.split(".", 1)[0]
        ok = await self.manager.call(
            domain if domain in ("switch", "light", "fan") else "homeassistant", "turn_on", {"entity_id": entity}
        )
        self.log(
            "turned_on",
            f"{self.friendly(entity)} · {len(attempts)}/{self.cfg['max_attempts']}",
            "ok" if ok else "failed",
        )

    async def async_test(self) -> None:
        for entity in self.targets():
            await self._check(entity)
        self.log("test", f"{len(self.targets())} entities checked", "ok")

    async def async_cancel(self) -> None:
        """Forget the failures: the rule tries again."""
        self.data.pop("failed", None)
        self.data.pop("attempts", None)
        ir.async_delete_issue(self.hass, DOMAIN, f"keep_on_failed_{self.id}")
        self.manager.save()
        self.manager.update()

    def current_state(self) -> str:
        return ST_FAILED if self._failed() else ST_ARMED

    def attributes(self) -> dict[str, Any]:
        targets = self.targets()
        return {
            "entities": targets,
            "on": sum(1 for e in targets if self.value(e) == "on"),
            "attempts": {e: len(self._attempts(e)) for e in targets},
            "failed": self._failed(),
        }


DURATION_LABEL = re.compile(r"^duree?_(?:(\d+)h)?(?:(\d+)(?:min|m)?)?$", re.IGNORECASE)


def label_duration(name: str) -> int | None:
    """duree_5min, duree_1h, duree_1h30 (or duration_...) -> seconds."""
    name = name.lower().replace("duration_", "duree_")
    m = DURATION_LABEL.match(name)
    if not m or not (m.group(1) or m.group(2)):
        return None
    return int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60


class AutoOff(Rule):
    """Turns the target entities off `duration` after they were turned on (timers survive restarts)."""

    type = AUTO_OFF

    async def async_start(self) -> None:
        self.track(self.targets(), self._on_change)
        self.every(TICK, self._tick)

    def _timers(self) -> dict[str, float]:
        return self.data.setdefault("timers", {})

    def duration(self, entity: str) -> int | None:
        if self.cfg.get("duration"):
            return int(self.cfg["duration"].total_seconds())
        entry = async_get_er(self.hass).async_get(entity)
        if entry is None:
            return None
        registry = lr.async_get(self.hass)
        for label_id in entry.labels:
            label = registry.async_get_label(label_id)
            for name in (label_id, label.name if label else ""):
                if seconds := label_duration(name):
                    return seconds
        return None

    @callback
    def _on_change(self, event: Event) -> None:
        old, new = changed(event)
        if new is None:
            return
        timers = self._timers()
        if new.state == "on" and (old is None or old.state != "on"):
            timers[new.entity_id] = dt_util.utcnow().timestamp()
        elif new.state != "on" and new.state not in UNAVAILABLE:
            timers.pop(new.entity_id, None)
        self.manager.save()
        self.manager.update()

    async def _tick(self, _now: datetime) -> None:
        timers = self._timers()
        for entity in self.targets():
            st = self.state(entity)
            if not st or st.state != "on":
                if st and st.state not in UNAVAILABLE:
                    timers.pop(entity, None)
                continue
            since = timers.setdefault(entity, st.last_changed.timestamp())
            seconds = self.duration(entity)
            if seconds is None or dt_util.utcnow().timestamp() - since < seconds or not self.active():
                continue
            power = self.cfg.get("power_entity")
            if power and self.cfg.get("power_above") is not None:
                watts = self.number(power)
                if watts is not None and watts > self.cfg["power_above"]:
                    continue
            await self.async_turn_off(entity, "timer")

    async def async_turn_off(self, entity: str, why: str = "manual") -> None:
        domain = entity.split(".", 1)[0]
        ok = await self.manager.call(
            domain if domain in ("switch", "light", "fan") else "homeassistant", "turn_off", {"entity_id": entity}
        )
        self._timers().pop(entity, None)
        self.log("turned_off", f"{self.friendly(entity)} · {why}", "ok" if ok else "failed")

    def extend(self, entity: str, minutes: float) -> None:
        timers = self._timers()
        if entity in timers:
            timers[entity] += minutes * 60
            self.manager.save()
            self.manager.update()

    def timers(self) -> list[dict[str, Any]]:
        out = []
        for entity, since in self._timers().items():
            seconds = self.duration(entity)
            if seconds is None or self.value(entity) != "on":
                continue
            out.append(
                {
                    "rule": self.id,
                    "entity_id": entity,
                    "name": self.friendly(entity),
                    "started": since,
                    "ends": since + seconds,
                    "total": seconds,
                }
            )
        return out

    async def async_test(self) -> None:
        self.log("test", f"{len(self.timers())} timers running", "ok")

    async def async_cancel(self) -> None:
        for timer in self.timers():
            await self.async_turn_off(timer["entity_id"])

    def current_state(self) -> str:
        return ST_ACTIVE if self.timers() else ST_IDLE

    def attributes(self) -> dict[str, Any]:
        missing = [e for e in self.targets() if self.duration(e) is None]
        return {"entities": self.targets(), "timers": self.timers(), "no_duration": missing}
