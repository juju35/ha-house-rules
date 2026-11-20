"""sensor_flash (lights flash while a sensor is triggered, with escalation), sensor_chime and leak_guard."""

from __future__ import annotations

import asyncio
import contextlib
from datetime import datetime
from functools import partial
from typing import Any

from homeassistant.core import CALLBACK_TYPE, Event, State, callback
from homeassistant.util import dt as dt_util

from ..const import LEAK_GUARD, SENSOR_CHIME, SENSOR_FLASH, ST_ALERT, ST_ARMED, ST_IDLE, ST_WAITING
from .base import Rule, changed

RATES = {"1hz": 0.5, "2hz": 0.25, "pulse": 1.0}
COLOR_MODES = {"hs", "xy", "rgb", "rgbw", "rgbww"}
SNAPSHOT_ATTRS = ("brightness", "rgb_color", "color_temp_kelvin", "hs_color", "xy_color", "effect")


class Flasher:
    """Flashes lights in a colour until stopped, then puts them back as they were (or off)."""

    def __init__(self, rule: Rule, lights: list[str], color: list[int], rate: str, restore: bool) -> None:
        self.rule = rule
        self.lights = lights
        self.color = color
        self.rate = rate
        self.restore = restore
        self.snapshot: dict[str, State | None] = {}
        self.task: asyncio.Task | None = None

    @property
    def running(self) -> bool:
        return self.task is not None and not self.task.done()

    def start(self) -> None:
        if self.running or not self.lights:
            return
        self.snapshot = {light: self.rule.state(light) for light in self.lights}
        self.task = self.rule.hass.async_create_background_task(self._loop(), f"house_rules flash {self.rule.id}")

    async def _loop(self) -> None:
        call = self.rule.manager.call
        half = RATES.get(self.rate, 0.5)
        while True:
            if self.rule.muted():
                await asyncio.sleep(30)
                continue
            extra: dict[str, Any] = {"brightness": 255}
            if self.rate == "pulse":
                extra["transition"] = half
            colour, plain = self.split()
            if colour:
                await call("light", "turn_on", {"entity_id": colour, "rgb_color": self.color, **extra})
            if plain:
                await call("light", "turn_on", {"entity_id": plain, **extra})
            await asyncio.sleep(half)
            off: dict[str, Any] = {"entity_id": self.lights}
            if self.rate == "pulse":
                off["transition"] = half
            await call("light", "turn_off", off)
            await asyncio.sleep(half)

    def split(self) -> tuple[list[str], list[str]]:
        """Lights that take a colour, and the others (brightness only: no failing call at every flash)."""
        colour, plain = [], []
        for light in self.lights:
            st = self.rule.state(light)
            modes = set(st.attributes.get("supported_color_modes") or []) if st else set()
            (colour if modes & COLOR_MODES or not st else plain).append(light)
        return colour, plain

    async def stop(self) -> None:
        if self.task is None:
            return
        self.task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self.task
        self.task = None
        call = self.rule.manager.call
        for light, before in self.snapshot.items():
            if self.restore and before is not None and before.state == "on":
                params = {k: before.attributes[k] for k in SNAPSHOT_ATTRS if before.attributes.get(k) is not None}
                if "color_temp_kelvin" in params:
                    params.pop("rgb_color", None)
                    params.pop("hs_color", None)
                    params.pop("xy_color", None)
                elif "rgb_color" in params:
                    params.pop("hs_color", None)
                    params.pop("xy_color", None)
                await call("light", "turn_on", {"entity_id": light, **params})
            else:
                await call("light", "turn_off", {"entity_id": light})


class Trigger:
    """A `trigger:` block: entity in a state (optionally from another, for a while)."""

    def __init__(self, cfg: dict[str, Any]) -> None:
        self.entity: str = cfg["entity_id"]
        self.to: str = cfg.get("to", "on")
        self.from_: str | None = cfg.get("from")
        self.for_: float = cfg["for"].total_seconds() if cfg.get("for") else 0.0

    def entered(self, old: State | None, new: State | None) -> bool:
        if not new or new.state != self.to:
            return False
        if old is not None and old.state == self.to:
            return False
        return self.from_ is None or (old is not None and old.state == self.from_)

    def left(self, new: State | None) -> bool:
        return not new or new.state != self.to


class SensorFlash(Rule):
    """While the trigger holds: lights flash; escalation steps (chime, notification) follow after their delay."""

    type = SENSOR_FLASH

    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        self.trigger = Trigger(self.cfg["trigger"])
        self.flasher = Flasher(self, self.cfg["lights"], self.cfg["color"], self.cfg["rate"], self.cfg["restore"])
        self.since: float | None = None
        self.alerting = False
        self.level = 0
        self._pending: list[CALLBACK_TYPE] = []

    async def async_start(self) -> None:
        self.track([self.trigger.entity], self._on_change)
        st = self.state(self.trigger.entity)
        if st and st.state == self.trigger.to and self.trigger.from_ is None:
            elapsed = dt_util.utcnow().timestamp() - st.last_changed.timestamp()
            self._arm(st.last_changed.timestamp(), max(0.0, self.trigger.for_ - elapsed))

    async def async_stop(self) -> None:
        await self.flasher.stop()
        await super().async_stop()

    @callback
    def _on_change(self, event: Event) -> None:
        old, new = changed(event)
        if self.trigger.entered(old, new):
            self._arm(dt_util.utcnow().timestamp(), self.trigger.for_)
        elif self.trigger.left(new) and (self.since is not None):
            self.hass.async_create_task(self._end("cleared"))

    def _arm(self, since: float, wait: float) -> None:
        self.since = since
        self._pending.append(self.later(wait, self._start))
        for index, step in enumerate(self.cfg["escalation"]):
            delay = max(0.0, since + step["after"].total_seconds() - dt_util.utcnow().timestamp())
            self._pending.append(self.later(delay, partial(self._escalate, index)))
        self.manager.update()

    async def _start(self, _now: datetime) -> None:
        if not self.active():
            self.log("skipped", self.friendly(self.trigger.entity), "skipped")
            return
        self.alerting, self.level = True, 1
        self.detail = self.friendly(self.trigger.entity)
        self.flasher.start()  # waits out the quiet hours by itself
        if self.cfg.get("message"):
            await self.notify(None, self.cfg["message"], self.cfg.get("critical", False))
        self.log("alert", f"{self.detail} · {', '.join(self.friendly(x) for x in self.cfg['lights'])}", "active")

    async def _escalate(self, index: int, _now: datetime) -> None:
        if not self.alerting:
            return
        step = self.cfg["escalation"][index]
        self.level = index + 2
        muted = self.muted()
        if step.get("chime") and not muted:
            await play(self, step["chime"], step.get("media"), None)
        if step.get("notify"):
            await self.notify(
                None, step.get("message") or self.cfg.get("message") or self.detail, step["notify"] == "critical"
            )
        self.log("escalation", f"{self.detail} · level {self.level}", "active")
        self.manager.update()

    async def _end(self, why: str) -> None:
        for unsub in self._pending:
            self.cancel_later(unsub)
        self._pending.clear()
        was = self.alerting
        self.alerting, self.level, self.since = False, 0, None
        await self.flasher.stop()
        if was:
            self.log("cleared" if why == "cleared" else "acknowledged", self.detail, "ok")
        self.detail = ""
        self.manager.update()

    async def async_cancel(self) -> None:
        await self._end("acknowledged")

    async def async_test(self) -> None:
        """Flash for 6 s (returns at once; the flash stops by itself unless a real alert started meanwhile)."""
        self.flasher.start()
        self.log("test", "flash 6 s", "ok")

        async def stop(_now: datetime) -> None:
            if not self.alerting:
                await self.flasher.stop()

        self.later(6, stop)

    def current_state(self) -> str:
        if self.alerting:
            return ST_ALERT
        return ST_WAITING if self.since is not None else ST_ARMED

    def attributes(self) -> dict[str, Any]:
        return {
            "trigger": self.trigger.entity,
            "lights": self.cfg["lights"],
            "since": self.since,
            "level": self.level,
            "levels": 1 + len(self.cfg["escalation"]),
            "escalation": [
                {"after": s["after"].total_seconds(), "chime": s.get("chime"), "notify": s.get("notify")}
                for s in self.cfg["escalation"]
            ],
        }


async def play(
    rule: Rule, player: str, media: str | None, script: str | None, volume: float | None = None, duration: float = 20.0
) -> bool:
    """Play a sound on a media player (or run a script), at a volume restored afterwards. Never raises."""
    manager = rule.manager
    st = rule.state(player)
    before = st.attributes.get("volume_level") if st else None
    if volume is not None:
        await manager.call("media_player", "volume_set", {"entity_id": player, "volume_level": volume})
    if script:
        ok = await manager.call("script", "turn_on", {"entity_id": script}, blocking=False)
    elif media:
        ok = await manager.call(
            "media_player",
            "play_media",
            {"entity_id": player, "media_content_id": media, "media_content_type": "music"},
            blocking=False,
        )
    else:
        ok = False
    if volume is not None and before is not None:

        async def restore(_now: datetime) -> None:
            await manager.call("media_player", "volume_set", {"entity_id": player, "volume_level": before})

        rule.later(duration, restore)
    return ok


class SensorChime(Rule):
    """A sound when the trigger is entered, within the time windows."""

    type = SENSOR_CHIME

    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        self.trigger = Trigger({"from": "off", **self.cfg["trigger"]})

    async def async_start(self) -> None:
        self.track([self.trigger.entity], self._on_change)

    @callback
    def _on_change(self, event: Event) -> None:
        old, new = changed(event)
        if self.trigger.entered(old, new):
            self.hass.async_create_task(self._ring())

    async def _ring(self, test: bool = False) -> None:
        if not test and (not self.active() or self.muted() or not self.in_windows()):
            self.log("skipped", self.friendly(self.trigger.entity), "skipped")
            return
        ok = await play(
            self,
            self.cfg["media_player"],
            self.cfg.get("media"),
            self.cfg.get("script"),
            self.cfg.get("volume"),
            self.cfg["duration"].total_seconds(),
        )
        self.log("chime", f"{self.friendly(self.cfg['media_player'])}", "ok" if ok else "failed")

    async def async_test(self) -> None:
        await self._ring(test=True)

    def current_state(self) -> str:
        return ST_ARMED if self.in_windows() else ST_IDLE

    def attributes(self) -> dict[str, Any]:
        return {
            "trigger": self.trigger.entity,
            "media_player": self.cfg["media_player"],
            "in_window": self.in_windows(),
        }


class LeakGuard(Rule):
    """A leak: cut the appliances (and keep them from being turned back on), flash, ring and notify."""

    type = LEAK_GUARD

    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        self.flasher = Flasher(self, self.cfg["lights"], [255, 0, 0], "2hz", True)
        self.wet: list[str] = []

    async def async_start(self) -> None:
        self.track(self.cfg["sensors"], self._on_change)
        wet = [s for s in self.cfg["sensors"] if self.value(s) == "on"]
        if wet:
            await self._leak(wet)

    async def async_stop(self) -> None:
        await self.flasher.stop()
        for entity in self.cfg["cut"]:
            self.manager.unblock(entity, self.id)
        await super().async_stop()

    @callback
    def _on_change(self, _event: Event) -> None:
        wet = [s for s in self.cfg["sensors"] if self.value(s) == "on"]
        if wet and not self.wet:
            self.hass.async_create_task(self._leak(wet))
        elif not wet and self.wet:
            self.hass.async_create_task(self._dry())
        self.wet = wet

    async def _leak(self, wet: list[str]) -> None:
        self.wet = wet
        where = ", ".join(self.friendly(s) for s in wet)
        self.detail = where
        for entity in self.cfg["cut"]:
            self.manager.block(entity, self.id)
            await self.manager.call("homeassistant", "turn_off", {"entity_id": entity})
        self.flasher.start()
        if not self.muted() and self.cfg.get("chime"):
            await play(self, self.cfg["chime"], self.cfg.get("media"), None)
        await self.notify(None, self.cfg.get("message") or where, self.cfg.get("critical", True))
        self.log("leak", f"{where} · {len(self.cfg['cut'])} cut", "active")

    async def _dry(self) -> None:
        self.wet = []
        await self.flasher.stop()
        for entity in self.cfg["cut"]:
            self.manager.unblock(entity, self.id)
        self.log("dry", self.detail, "ok")
        self.detail = ""

    async def async_cancel(self) -> None:
        await self.flasher.stop()

    async def async_test(self) -> None:
        """Flash for 6 s (returns at once; the flash stops by itself unless a real alert started meanwhile)."""
        self.flasher.start()
        self.log("test", "flash 6 s", "ok")

        async def stop(_now: datetime) -> None:
            if not self.wet:
                await self.flasher.stop()

        self.later(6, stop)

    def current_state(self) -> str:
        return ST_ALERT if self.wet else ST_ARMED

    def attributes(self) -> dict[str, Any]:
        return {"sensors": self.cfg["sensors"], "wet": self.wet, "cut": self.cfg["cut"]}
