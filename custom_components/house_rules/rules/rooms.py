"""Rules that use the rooms table: vacuum_follow, vacuum_guard and presence_light."""

from __future__ import annotations

import asyncio
from datetime import datetime
from functools import partial
from typing import Any

from homeassistant.core import CALLBACK_TYPE, Event, callback
from homeassistant.util import dt as dt_util

from ..const import PRESENCE_LIGHT, ST_ACTIVE, ST_ARMED, ST_IDLE, VACUUM_FOLLOW, VACUUM_GUARD, WEEKDAYS
from .base import UNAVAILABLE, Rule, changed

CLEANING = ("cleaning", "returning")


def room_lights(room: dict[str, Any] | None) -> list[str]:
    if not room:
        return []
    lights = list(room.get("lights") or [])
    if room.get("light"):
        lights.insert(0, room["light"])
    return list(dict.fromkeys(lights))


def room_openings(room: dict[str, Any] | None) -> list[str]:
    if not room:
        return []
    opening = room.get("opening") or []
    return [opening] if isinstance(opening, str) else list(opening)


def find_room(rooms: dict[str, Any], name: str | None) -> tuple[str, dict[str, Any]] | None:
    """A room by name, case and accents as written, else case-insensitive."""
    if not name:
        return None
    if name in rooms:
        return name, rooms[name]
    for key, value in rooms.items():
        if key.casefold() == name.casefold():
            return key, value
    return None


class VacuumFollow(Rule):
    """Lights follow the robot from room to room; a light that was on before stays on."""

    type = VACUUM_FOLLOW
    depends_on_rooms = True

    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        self.room: str | None = None
        self.lit: list[str] = []
        # Room changes in quick succession: one move at a time.
        self._lock = asyncio.Lock()

    async def async_start(self) -> None:
        self.track([self.cfg["room_sensor"], self.cfg["vacuum"]], self._on_change)

    async def async_stop(self) -> None:
        for light in list(self.lit):
            await self.manager.arbiter.release(self.id, light)
        self.lit.clear()
        await super().async_stop()

    def dark(self, room: dict[str, Any]) -> bool:
        threshold = self.cfg.get("dark_below")
        if threshold is None or not room.get("illuminance"):
            return True
        lux = self.number(room["illuminance"])
        return lux is None or lux < threshold

    @callback
    def _on_change(self, event: Event) -> None:
        _, new = changed(event)
        if new is None:
            return
        if new.entity_id == self.cfg["vacuum"]:
            if new.state == "docked" and self.cfg["off_at_dock"]:
                self.hass.async_create_task(self._move(None))
            return
        if self.value(self.cfg["vacuum"]) in CLEANING and new.state not in UNAVAILABLE:
            self.hass.async_create_task(self._move(new.state))

    async def _move(self, room_name: str | None) -> None:
        async with self._lock:
            await self._move_locked(room_name)

    async def _move_locked(self, room_name: str | None) -> None:
        transition = self.cfg["transition"]
        found = find_room(self.manager.rooms, room_name)
        wanted: list[str] = []
        if found and self.active() and self.dark(found[1]):
            wanted = room_lights(found[1])
        for light in [x for x in self.lit if x not in wanted]:
            if await self.manager.arbiter.release(self.id, light, transition=transition):
                self.log("light_off", f"{self.friendly(light)} · {self.room or '?'}", "ok")
            elif not self.manager.arbiter.wanted(light):
                self.log("light_kept", f"{self.friendly(light)} · was on before", "skipped")
            self.lit.remove(light)
        for light in wanted:
            if light in self.lit:
                continue
            self.lit.append(light)
            if await self.manager.arbiter.claim(self.id, light, transition=transition):
                self.log("light_on", f"{self.friendly(light)} · {found[0] if found else ''}", "ok")
        self.room = found[0] if found else room_name
        self.detail = self.room or ""
        self.manager.update()

    async def async_test(self) -> None:
        await self._move(self.value(self.cfg["room_sensor"]))
        self.log("test", self.room or "-", "ok")

    def current_state(self) -> str:
        return ST_ACTIVE if self.value(self.cfg["vacuum"]) in CLEANING else ST_IDLE

    def attributes(self) -> dict[str, Any]:
        return {"vacuum": self.cfg["vacuum"], "room": self.value(self.cfg["room_sensor"]), "lights_on": self.lit}


class VacuumGuard(Rule):
    """The robot is in a room whose opening is open (and no air conditioner runs there): back to the base."""

    type = VACUUM_GUARD
    depends_on_rooms = True

    async def async_start(self) -> None:
        openings = [o for room in self.manager.rooms.values() for o in room_openings(room)]
        self.track([self.cfg["room_sensor"], *openings], self._on_change)

    @callback
    def _on_change(self, _event: Event) -> None:
        if self.value(self.cfg["vacuum"]) != "cleaning":
            return
        found = find_room(self.manager.rooms, self.value(self.cfg["room_sensor"]))
        if not found:
            return
        name, room = found
        open_ = [o for o in room_openings(room) if self.value(o) == "on"]
        climate = room.get("climate")
        if not open_ or (climate and self.value(climate) not in ("off", *UNAVAILABLE, None)):
            return
        self.hass.async_create_task(self._return(name, open_))

    async def _return(self, room: str, open_: list[str]) -> None:
        if not self.active():
            self.log("skipped", room, "skipped")
            return
        ok = await self.manager.call("vacuum", "return_to_base", {"entity_id": self.cfg["vacuum"]})
        detail = f"{room} · {', '.join(self.friendly(o) for o in open_)}"
        await self.notify(None, self.cfg.get("message") or detail, critical=True)
        self.log("returned", detail, "ok" if ok else "failed")

    async def async_test(self) -> None:
        self.log("test", "no action (would send the robot back)", "skipped")

    def current_state(self) -> str:
        return ST_ACTIVE if self.value(self.cfg["vacuum"]) == "cleaning" else ST_ARMED

    def attributes(self) -> dict[str, Any]:
        return {"vacuum": self.cfg["vacuum"], "room": self.value(self.cfg["room_sensor"])}


class PresenceLight(Rule):
    """Presence in a room turns its lights on when it is dark (and in the time windows); off after `off_delay`.

    Several sensors may watch the room (someone is there while one is on), a presence may have to last `on_after`
    before the lights turn on (someone passing by doesn't count), and time `slots` keep some lights off or set their
    brightness, colour and delay before off. A light turned off by hand while someone is there stays off until the
    room is empty; nothing is turned on while a light of the room is already on by hand.
    """

    type = PRESENCE_LIGHT
    depends_on_rooms = True

    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        self.claimed: set[str] = set()
        self.by_hand: set[str] = set()
        self._off: list[CALLBACK_TYPE] = []
        self._arm: CALLBACK_TYPE | None = None

    @property
    def lit(self) -> bool:
        return bool(self.claimed)

    @property
    def room(self) -> dict[str, Any]:
        found = find_room(self.manager.rooms, self.cfg["room"])
        return found[1] if found else {}

    def sensors(self) -> list[str]:
        if self.cfg.get("sensors"):
            return list(self.cfg["sensors"])
        presence = self.room.get("presence") or []
        return [presence] if isinstance(presence, str) else list(presence)

    def lights(self) -> list[str]:
        return list(self.cfg.get("lights") or room_lights(self.room))

    def present(self) -> bool:
        return any(self.value(sensor) == "on" for sensor in self.sensors())

    async def async_start(self) -> None:
        self.track(self.sensors(), self._on_change)
        self.track([self.room.get("illuminance")], self._on_light_level)
        self.track(self.lights(), self._on_light)

    async def async_stop(self) -> None:
        self._cancel_off()
        self.cancel_later(self._arm)
        self._arm = None
        for light in list(self.claimed):
            await self.manager.arbiter.release(self.id, light)
        self.claimed.clear()
        self.by_hand.clear()
        await super().async_stop()

    def dark(self) -> bool:
        threshold = self.cfg.get("dark_below")
        lux_entity = self.room.get("illuminance")
        if threshold is None or not lux_entity:
            return True
        lux = self.number(lux_entity)
        if lux is None:
            return True
        # Once on, our own light raises the lux: allow the hysteresis band.
        return lux < threshold + (self.cfg["hysteresis"] if self.lit else 0)

    def brightness(self) -> int | None:
        if entity := self.cfg.get("brightness_entity"):
            value = self.number(entity)
            if value is not None:
                return max(1, min(100, int(value)))
        return self.cfg.get("brightness")

    def slot(self, light: str) -> dict[str, Any] | None:
        """The first slot that applies to `light` now (`during_naps`: while a room of the house has its nap)."""
        from ..manager import in_window

        now = dt_util.now()
        day = WEEKDAYS[now.weekday()]
        for slot in self.cfg.get("slots") or []:
            if slot.get("days") and day not in slot["days"]:
                continue
            if slot.get("lights") and light not in slot["lights"]:
                continue
            if bool(self.manager.napping()) if slot.get("during_naps") else in_window(now, slot["start"], slot["end"]):
                return slot
        return None

    def nap_lights(self) -> set[str]:
        """The lights kept off now: a room of the house has its nap (`not_during_naps`: true for all of them)."""
        keep = self.cfg.get("not_during_naps")
        if not keep or not self.manager.napping():
            return set()
        return set(self.lights()) if keep is True else set(keep)

    def can_light(self) -> bool:
        return self.active() and self.dark() and self.in_windows()

    @callback
    def _on_change(self, _event: Event) -> None:
        if self.present():
            self._cancel_off()
            if self.claimed or self._arm or not self.can_light():
                return
            delay = self.cfg["on_after"].total_seconds()
            if delay:
                self._arm = self.later(delay, self._armed)
            else:
                self.hass.async_create_task(self._on())
            return
        # Nobody left: no pending switch-on; the lights turned off by hand may come back next time.
        self.cancel_later(self._arm)
        self._arm = None
        self.by_hand.clear()
        if self.claimed:
            self._schedule_off()

    async def _armed(self, _now: datetime) -> None:
        self._arm = None
        if self.present() and not self.claimed and self.can_light():
            await self._on()

    @callback
    def _on_light_level(self, _event: Event) -> None:
        """It got dark while someone is in the room."""
        if not self.claimed and not self._arm and self.present() and self.can_light():
            self.hass.async_create_task(self._on())

    @callback
    def _on_light(self, event: Event) -> None:
        """A light of ours turned off by hand while someone is there stays off until the room is empty."""
        old, new = changed(event)
        light = event.data.get("entity_id")
        if light not in self.claimed or new is None or new.state != "off" or (old and old.state == "off"):
            return
        if self.manager.ours(new.context):
            return
        self.by_hand.add(light)
        self.hass.async_create_task(self._forget(light))

    async def _forget(self, light: str) -> None:
        self.claimed.discard(light)
        await self.manager.arbiter.release(self.id, light)
        self.log("light_by_hand", f"{self.cfg['room']} · {self.friendly(light)}", "skipped")
        if not self.claimed:
            self.detail = ""
        self.manager.update()

    async def _on(self) -> None:
        lights = self.lights()
        # A light of the room already on by hand (no rule wants it): the room is lit, leave it as it is.
        if any(self.value(light) == "on" and not self.manager.arbiter.wanted(light) for light in lights):
            return
        names = []
        napping = self.nap_lights()
        for light in lights:
            if light in self.by_hand or light in self.claimed or light in napping:
                continue
            slot = self.slot(light) or {}
            if slot.get("off"):
                continue
            params: dict[str, Any] = {}
            pct = slot.get("brightness") or self.brightness()
            if pct is not None:
                params["brightness_pct"] = pct
            if slot.get("color"):
                params["rgb_color"] = list(slot["color"])
            if self.cfg.get("transition") is not None:
                params["transition"] = self.cfg["transition"]
            self.claimed.add(light)
            if await self.manager.arbiter.claim(self.id, light, **params):
                names.append(self.friendly(light))
        if not self.claimed:
            return
        self.detail = self.cfg["room"]
        self.log("light_on", f"{self.cfg['room']} · {', '.join(names) or '-'}", "ok")
        self.manager.update()

    def _cancel_off(self) -> None:
        for unsub in self._off:
            self.cancel_later(unsub)
        self._off.clear()

    def _schedule_off(self) -> None:
        """Each lit light goes off after its slot's delay, else the rule's."""
        self._cancel_off()
        groups: dict[float, list[str]] = {}
        for light in self.claimed:
            delay = (self.slot(light) or {}).get("off_delay") or self.cfg["off_delay"]
            groups.setdefault(delay.total_seconds(), []).append(light)
        for seconds, lights in groups.items():
            self._off.append(self.later(seconds, partial(self._release, lights)))

    async def _release(self, lights: list[str], _now: datetime) -> None:
        params = {"transition": self.cfg["transition"]} if self.cfg.get("transition") is not None else {}
        for light in lights:
            if light not in self.claimed:
                continue
            self.claimed.discard(light)
            if await self.manager.arbiter.release(self.id, light, **params):
                self.log("light_off", f"{self.cfg['room']} · {self.friendly(light)}", "ok")
            elif self.manager.arbiter.wanted(light):
                self.log(
                    "light_kept",
                    f"{self.friendly(light)} · {', '.join(self.manager.arbiter.holders(light))}",
                    "skipped",
                )
        if not self.claimed:
            self._off.clear()
            self.detail = ""
        self.manager.update()

    async def async_test(self) -> None:
        await self._on()

    def current_state(self) -> str:
        return ST_ACTIVE if self.lit else ST_ARMED

    def attributes(self) -> dict[str, Any]:
        lux = self.room.get("illuminance")
        return {
            "room": self.cfg["room"],
            "sensors": self.sensors(),
            "presence": "on" if self.present() else "off",
            "illuminance": self.number(lux),
            "lit": self.lit,
            "lights_on": sorted(self.claimed),
            "by_hand": sorted(self.by_hand),
        }
