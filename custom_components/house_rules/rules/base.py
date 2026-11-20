"""What every rule has: lifecycle, listeners, snooze, state for the sensor and the panel, journal."""

from __future__ import annotations

import copy
import logging
from collections.abc import Callable, Iterable
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, State, callback
from homeassistant.helpers import label_registry as lr
from homeassistant.helpers.entity_registry import async_entries_for_label
from homeassistant.helpers.entity_registry import async_get as async_get_er
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.util import dt as dt_util

from ..const import ST_ARMED, ST_DISABLED, ST_SNOOZED

if TYPE_CHECKING:
    from ..manager import HouseRules

_LOGGER = logging.getLogger(__name__)

UNAVAILABLE = ("unavailable", "unknown")


class Rule:
    """Base class of the rule types."""

    type: str = ""
    depends_on_rooms = False

    def __init__(self, manager: HouseRules, cfg: dict[str, Any], raw: dict[str, Any]) -> None:
        self.manager = manager
        self.hass: HomeAssistant = manager.hass
        self.cfg = cfg
        self.raw = copy.deepcopy(raw)
        self.id: str = cfg["id"]
        self.name: str = cfg.get("name") or cfg["id"].replace("_", " ").capitalize()
        self.respect: list[str] = list(cfg.get("respect") or [])
        self.rooms_snapshot = copy.deepcopy(manager.rooms)
        self._unsubs: list[CALLBACK_TYPE] = []
        self.last_run: float | None = None
        self.detail = ""

    # ---------- persistent per-rule state ----------
    @property
    def data(self) -> dict[str, Any]:
        return self.manager.state.setdefault(self.id, {})

    @property
    def enabled(self) -> bool:
        return bool(self.cfg.get("enabled", True))

    @property
    def snoozed_until(self) -> float | None:
        until = self.data.get("snoozed_until")
        if until and until > dt_util.utcnow().timestamp():
            return until
        return None

    def snooze(self, seconds: float | None) -> None:
        if seconds:
            self.data["snoozed_until"] = dt_util.utcnow().timestamp() + seconds
        else:
            self.data.pop("snoozed_until", None)
        self.manager.save()
        self.manager.update()

    # ---------- lifecycle ----------
    async def async_start(self) -> None:
        """Subscribe to what the rule watches (subclasses call super last)."""

    async def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()

    # ---------- gates ----------
    def active(self) -> bool:
        """The rule may act now: enabled, not snoozed, no respected condition stopping it."""
        if not self.enabled or self.snoozed_until:
            return False
        return self.manager.blocked_by(self.respect) is None

    def in_windows(self) -> bool:
        """Now within the rule's `windows` (none: always)."""
        from ..manager import in_window

        windows = self.cfg.get("windows") or []
        now = dt_util.now()
        return not windows or any(in_window(now, w["start"], w["end"]) for w in windows)

    def muted(self) -> bool:
        """Quiet hours (when respected): no light, no sound — notifications only."""
        return self.manager.muted(self.respect)

    # ---------- helpers ----------
    def track(self, entities: Iterable[str], action: Callable[[Event], Any]) -> None:
        entities = [e for e in entities if e]
        if entities:
            self._unsubs.append(async_track_state_change_event(self.hass, entities, action))

    def every(self, seconds: float, action: Callable[[datetime], Any]) -> None:
        self._unsubs.append(async_track_time_interval(self.hass, action, timedelta(seconds=seconds)))

    def later(self, seconds: float, action: Callable[[datetime], Any]) -> CALLBACK_TYPE:
        unsub = async_call_later(self.hass, seconds, action)
        self._unsubs.append(unsub)
        return unsub

    def cancel_later(self, unsub: CALLBACK_TYPE | None) -> None:
        if unsub is None:
            return
        unsub()
        if unsub in self._unsubs:
            self._unsubs.remove(unsub)

    def state(self, entity: str | None) -> State | None:
        return self.hass.states.get(entity) if entity else None

    def value(self, entity: str | None) -> str | None:
        st = self.state(entity)
        return st.state if st else None

    def number(self, entity: str | None) -> float | None:
        try:
            return float(self.value(entity))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return None

    def targets(self) -> list[str]:
        """entity_id plus the entities carrying `label` (by id or name)."""
        out = list(self.cfg.get("entity_id") or [])
        label = self.cfg.get("label")
        if label:
            registry = lr.async_get(self.hass)
            found = registry.async_get_label(label) or next(
                (lb for lb in registry.async_list_labels() if lb.name.casefold() == label.casefold()), None
            )
            if found:
                out.extend(e.entity_id for e in async_entries_for_label(async_get_er(self.hass), found.label_id))
        return list(dict.fromkeys(out))

    def log(self, action: str, detail: str = "", result: str = "ok") -> None:
        self.last_run = dt_util.utcnow().timestamp()
        self.manager.log(self, action, detail, result)

    def friendly(self, entity: str | None) -> str:
        st = self.state(entity)
        return (st.attributes.get("friendly_name") if st else None) or (entity or "")

    async def notify(self, title: str | None, message: str, critical: bool = False) -> bool:
        return await self.manager.notify(self.cfg.get("notify"), title or self.name, message, critical)

    # ---------- what the rule shows ----------
    def current_state(self) -> str:
        """The rule's state when it is enabled and not snoozed (subclasses refine)."""
        return ST_ARMED

    def attributes(self) -> dict[str, Any]:
        return {}

    def timers(self) -> list[dict[str, Any]]:
        return []

    def status(self) -> dict[str, Any]:
        if not self.enabled:
            state = ST_DISABLED
        elif self.snoozed_until:
            state = ST_SNOOZED
        else:
            state = self.current_state()
        return {
            "id": self.id,
            "type": self.type,
            "name": self.name,
            "state": state,
            "detail": self.detail,
            "blocked": self.manager.blocked_by(self.respect),
            "snoozed_until": self.snoozed_until,
            "last_run": self.last_run or self.data.get("last_run"),
            "attributes": self.attributes(),
        }

    # ---------- user actions ----------
    async def async_test(self) -> None:
        """The panel's / button's Test: run the rule's action once."""
        self.log("test", "no test action for this rule type", "skipped")

    async def async_cancel(self) -> None:
        """Stop what the rule is doing (alert, timer...)."""

    async def async_acknowledge(self) -> None:
        await self.async_cancel()


@callback
def changed(event: Event) -> tuple[State | None, State | None]:
    return event.data.get("old_state"), event.data.get("new_state")


def is_on(st: State | None, to: str = "on") -> bool:
    return bool(st and st.state == to)
