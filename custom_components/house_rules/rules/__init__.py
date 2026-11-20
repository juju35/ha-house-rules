"""The rule types."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .alerts import LeakGuard, SensorChime, SensorFlash
from .appliances import ApplianceResume, CycleDone
from .base import Rule
from .plugs import AutoOff, KeepOn
from .rooms import PresenceLight, VacuumFollow, VacuumGuard
from .security import LockGuard

if TYPE_CHECKING:
    from ..manager import HouseRules

CLASSES: dict[str, type[Rule]] = {
    cls.type: cls
    for cls in (
        KeepOn,
        AutoOff,
        SensorFlash,
        SensorChime,
        ApplianceResume,
        CycleDone,
        VacuumFollow,
        VacuumGuard,
        PresenceLight,
        LockGuard,
        LeakGuard,
    )
}


def build_rule(manager: HouseRules, cfg: dict[str, Any], raw: dict[str, Any]) -> Rule:
    return CLASSES[cfg["type"]](manager, cfg, raw)
