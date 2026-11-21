"""appliance_resume (power an appliance back on when it was cut mid-programme) and cycle_done (end of a cycle)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.core import Event, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from ..const import APPLIANCE_RESUME, CYCLE_DONE, DOMAIN, ST_ACTIVE, ST_ARMED, ST_FAILED, ST_IDLE, ST_WAITING
from .base import UNAVAILABLE, Rule, changed


class ApplianceResume(Rule):
    """The programme's progress went unavailable (power cut) before 100 %: power the appliance back on."""

    type = APPLIANCE_RESUME

    async def async_start(self) -> None:
        self.track([self.cfg.get("progress")], self._on_change)
        if at := self.cfg.get("power_on_at"):
            self._unsubs.append(
                async_track_time_change(self.hass, self._scheduled, hour=at.hour, minute=at.minute, second=at.second)
            )

    def progress(self) -> float | None:
        return self.number(self.cfg.get("progress"))

    @callback
    def _on_change(self, event: Event) -> None:
        old, new = changed(event)
        if new is None:
            return
        # Only a power cut (the progress goes unavailable): a switch turned off by hand cancels the programme.
        value = self.number(new.entity_id)
        if value is not None:
            self.data["last_progress"] = value
            if value >= 100 or value <= 0:
                self.data["attempts"] = 0
        cut = new.state in UNAVAILABLE and old is not None and old.state not in UNAVAILABLE
        last = self.data.get("last_progress")
        if cut and last is not None and 0 < last < 100:
            self.later(self.cfg["delay"].total_seconds(), self._resume)
        self.manager.update()

    async def _resume(self, _now: datetime | None = None) -> None:
        switch = self.cfg["switch"]
        last = self.data.get("last_progress")
        if not self.active():
            self.log("skipped", f"{self.friendly(switch)} · {last:.0f} %", "skipped")
            return
        if self.manager.is_blocked(switch):
            self.log("blocked", f"{self.friendly(switch)} · leak", "skipped")
            return
        attempts = self.data.get("attempts", 0)
        if attempts >= self.cfg["max_attempts"]:
            self.data["failed"] = True
            self.log("gave_up", f"{self.friendly(switch)} · {attempts} attempts", "failed")
            if self.manager.settings.get("repairs", True):
                ir.async_create_issue(
                    self.hass,
                    DOMAIN,
                    f"resume_failed_{self.id}",
                    is_fixable=False,
                    severity=ir.IssueSeverity.WARNING,
                    translation_key="resume_failed",
                    translation_placeholders={"rule": self.name, "entity": self.friendly(switch)},
                )
            return
        self.data["attempts"] = attempts + 1
        ok = await self.manager.call("homeassistant", "turn_on", {"entity_id": switch})
        detail = f"{self.friendly(switch)} · {last:.0f} % · {attempts + 1}/{self.cfg['max_attempts']}"
        await self.notify(
            None,
            self.cfg.get("message") or detail,
            critical=True,
            entity=self.friendly(switch),
            progress=round(last),
            attempt=attempts + 1,
        )
        self.log("resumed", detail, "ok" if ok else "failed")

    async def _scheduled(self, _now: datetime) -> None:
        switch = self.cfg["switch"]
        if not self.active() or self.manager.is_blocked(switch):
            self.log("skipped", f"{self.friendly(switch)} · scheduled", "skipped")
            return
        ok = await self.manager.call("homeassistant", "turn_on", {"entity_id": switch})
        self.log("powered_on", f"{self.friendly(switch)} · scheduled", "ok" if ok else "failed")

    async def async_test(self) -> None:
        ok = await self.manager.call("homeassistant", "turn_on", {"entity_id": self.cfg["switch"]})
        self.log("test", self.friendly(self.cfg["switch"]), "ok" if ok else "failed")

    async def async_cancel(self) -> None:
        self.data.pop("failed", None)
        self.data["attempts"] = 0
        ir.async_delete_issue(self.hass, DOMAIN, f"resume_failed_{self.id}")
        self.manager.update()

    def current_state(self) -> str:
        if self.data.get("failed"):
            return ST_FAILED
        value = self.progress()
        return ST_ACTIVE if value is not None and 0 < value < 100 else ST_ARMED

    def attributes(self) -> dict[str, Any]:
        at = self.cfg.get("power_on_at")
        return {
            "switch": self.cfg["switch"],
            "progress": self.progress(),
            "attempts": self.data.get("attempts", 0),
            "power_on_at": at.strftime("%H:%M") if at else None,
        }


class CycleDone(Rule):
    """End of a cycle (power below a threshold for a while, or a state): notify, then remind until the door opens."""

    type = CYCLE_DONE

    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        self._below: Any = None

    async def async_start(self) -> None:
        self.track([self.cfg.get("power_entity"), self.cfg.get("state_entity"), self.cfg.get("door")], self._on_change)
        # Restarted during a cycle: the power may already be low and never change again.
        watts = self.number(self.cfg.get("power_entity"))
        if self.phase == "running" and watts is not None and watts < self.cfg["done_below"]:
            self._below = self.later(self.cfg["done_for"].total_seconds(), self._power_done)

    @property
    def phase(self) -> str:
        return self.data.get("phase", "idle")

    def _set_phase(self, phase: str) -> None:
        self.data["phase"] = phase
        self.manager.save()
        self.manager.update()

    @callback
    def _on_change(self, event: Event) -> None:
        old, new = changed(event)
        if new is None:
            return
        entity = new.entity_id
        if entity == self.cfg.get("door") and new.state == "on" and self.phase == "done":
            self._set_phase("idle")
            self.log("emptied", self.friendly(entity), "ok")
            return
        if entity == self.cfg.get("state_entity"):
            if new.state in self.cfg["done_states"] and (old is None or old.state not in self.cfg["done_states"]):
                self.hass.async_create_task(self._done())
            return
        if entity == self.cfg.get("power_entity"):
            watts = self.number(entity)
            if watts is None:
                return
            if self.phase == "idle" and watts > self.cfg["start_above"]:
                self._set_phase("running")
            elif self.phase == "running":
                if watts < self.cfg["done_below"]:
                    if self._below is None:
                        self._below = self.later(self.cfg["done_for"].total_seconds(), self._power_done)
                elif self._below is not None:
                    self.cancel_later(self._below)
                    self._below = None

    async def _power_done(self, _now: datetime) -> None:
        self._below = None
        await self._done()

    async def _done(self) -> None:
        self.data["reminders"] = 0
        self.data["done_at"] = dt_util.utcnow().timestamp()
        self._set_phase("done" if self.cfg.get("door") else "idle")
        if self.active():
            await self.notify(None, self.cfg.get("message") or self.name, self.cfg["critical"])
        self.log("done", self.name, "ok")
        if self.cfg.get("reminder") and self.cfg.get("door"):
            self.later(self.cfg["reminder"].total_seconds(), self._remind)

    async def _remind(self, _now: datetime) -> None:
        if self.phase != "done":
            return
        count = self.data.get("reminders", 0)
        if count >= self.cfg["max_reminders"]:
            return
        self.data["reminders"] = count + 1
        if self.active():
            await self.notify(None, self.cfg.get("message") or self.name, self.cfg["critical"])
        self.log("reminder", f"{count + 1}/{self.cfg['max_reminders']}", "ok")
        self.later(self.cfg["reminder"].total_seconds(), self._remind)

    async def async_test(self) -> None:
        await self.notify(None, self.cfg.get("message") or self.name, self.cfg["critical"])
        self.log("test", "notification", "ok")

    async def async_cancel(self) -> None:
        self._set_phase("idle")

    def current_state(self) -> str:
        return {"running": ST_ACTIVE, "done": ST_WAITING}.get(self.phase, ST_IDLE)

    def attributes(self) -> dict[str, Any]:
        return {
            "phase": self.phase,
            "power": self.number(self.cfg.get("power_entity")),
            "done_at": self.data.get("done_at"),
            "reminders": self.data.get("reminders", 0),
        }
