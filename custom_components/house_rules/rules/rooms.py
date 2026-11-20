"""Rules that use the rooms table: vacuum_follow, vacuum_guard and presence_light."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.core import CALLBACK_TYPE, Event, callback

from ..const import PRESENCE_LIGHT, ST_ACTIVE, ST_ARMED, ST_IDLE, VACUUM_FOLLOW, VACUUM_GUARD
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
    """Presence in a room turns its lights on when it is dark (and in the time windows); off after `off_delay`."""

    type = PRESENCE_LIGHT
    depends_on_rooms = True

    def __init__(self, *args: Any) -> None:
        super().__init__(*args)
        self.lit = False
        self._off: CALLBACK_TYPE | None = None

    @property
    def room(self) -> dict[str, Any]:
        found = find_room(self.manager.rooms, self.cfg["room"])
        return found[1] if found else {}

    async def async_start(self) -> None:
        self.track([self.room.get("presence")], self._on_change)

    async def async_stop(self) -> None:
        if self.lit:
            for light in room_lights(self.room):
                await self.manager.arbiter.release(self.id, light)
        self.lit = False
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

    @callback
    def _on_change(self, event: Event) -> None:
        _, new = changed(event)
        if new is None:
            return
        if new.state == "on":
            self.cancel_later(self._off)
            self._off = None
            if not self.lit and self.active() and self.dark() and self.in_windows():
                self.hass.async_create_task(self._on())
        elif new.state == "off" and self.lit:
            self.cancel_later(self._off)
            self._off = self.later(self.cfg["off_delay"].total_seconds(), self._release)

    async def _on(self) -> None:
        self.lit = True
        params: dict[str, Any] = {}
        if (pct := self.brightness()) is not None:
            params["brightness_pct"] = pct
        names = [
            self.friendly(light)
            for light in room_lights(self.room)
            if await self.manager.arbiter.claim(self.id, light, **params)
        ]
        self.detail = self.cfg["room"]
        self.log("light_on", f"{self.cfg['room']} · {', '.join(names) or '-'}", "ok")

    async def _release(self, _now: datetime) -> None:
        self._off = None
        self.lit = False
        for light in room_lights(self.room):
            if await self.manager.arbiter.release(self.id, light):
                self.log("light_off", f"{self.cfg['room']} · {self.friendly(light)}", "ok")
            elif self.manager.arbiter.wanted(light):
                self.log(
                    "light_kept",
                    f"{self.friendly(light)} · {', '.join(self.manager.arbiter.holders(light))}",
                    "skipped",
                )
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
            "presence": self.value(self.room.get("presence")),
            "illuminance": self.number(lux),
            "lit": self.lit,
        }
