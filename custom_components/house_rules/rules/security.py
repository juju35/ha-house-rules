"""lock_guard: lock after the door closes or the alarm is armed; optionally disarm when unlocked."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.core import CALLBACK_TYPE, Event, callback

from ..const import LOCK_GUARD, ST_ARMED, ST_WAITING
from .base import Rule, changed


class LockGuard(Rule):
    type = LOCK_GUARD

    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        self._pending: CALLBACK_TYPE | None = None
        self.reason = ""

    async def async_start(self) -> None:
        self.track([self.cfg.get("door"), self.cfg.get("alarm"), self.cfg["lock"]], self._on_change)

    def door_closed(self) -> bool:
        door = self.cfg.get("door")
        return not door or self.value(door) == "off"

    @callback
    def _on_change(self, event: Event) -> None:
        old, new = changed(event)
        if new is None:
            return
        entity = new.entity_id
        if entity == self.cfg.get("door"):
            if new.state == "off" and (old is None or old.state == "on"):
                self._schedule(self.cfg["lock_after"].total_seconds(), "door")
            elif new.state == "on":
                self._cancel()
        elif entity == self.cfg.get("alarm"):
            if new.state.startswith("armed") and not (old and old.state.startswith("armed")):
                self._schedule(self.cfg["lock_on_arm_after"].total_seconds(), "alarm")
        elif (
            entity == self.cfg["lock"]
            and new.state == "unlocked"
            and old is not None
            and old.state == "locked"
            and self.cfg["disarm_on_unlock"]
            and self.cfg.get("alarm")
        ):
            alarm = self.value(self.cfg["alarm"]) or ""
            if alarm.startswith("armed") and self.active():
                self.hass.async_create_task(self._disarm())

    def _schedule(self, seconds: float, reason: str) -> None:
        self._cancel()
        self.reason = reason
        self._pending = self.later(seconds, self._lock)
        self.manager.update()

    def _cancel(self) -> None:
        self.cancel_later(self._pending)
        self._pending = None
        self.manager.update()

    async def _lock(self, _now: datetime | None = None) -> None:
        self._pending = None
        lock = self.cfg["lock"]
        if self.value(lock) != "unlocked" or not self.door_closed():
            return
        if not self.active():
            self.log("skipped", self.friendly(lock), "skipped")
            return
        ok = await self.manager.call("lock", "lock", {"entity_id": lock})
        self.log("locked", f"{self.friendly(lock)} · {self.reason}", "ok" if ok else "failed")

    async def _disarm(self) -> None:
        alarm = self.cfg["alarm"]
        ok = await self.manager.call("alarm_control_panel", "alarm_disarm", {"entity_id": alarm})
        self.log("disarmed", f"{self.friendly(alarm)} · {self.friendly(self.cfg['lock'])}", "ok" if ok else "failed")

    async def async_test(self) -> None:
        self.reason = "test"
        await self._lock()

    async def async_cancel(self) -> None:
        self._cancel()

    def current_state(self) -> str:
        return ST_WAITING if self._pending else ST_ARMED

    def attributes(self) -> dict[str, Any]:
        return {
            "lock": self.cfg["lock"],
            "lock_state": self.value(self.cfg["lock"]),
            "door": self.cfg.get("door"),
            "pending": bool(self._pending),
            "reason": self.reason,
        }
