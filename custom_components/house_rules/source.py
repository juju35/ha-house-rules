"""Where the configuration lives: house_rules.yaml when it exists, else the integration's storage."""

from __future__ import annotations

import copy
import logging
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, YAML_FILE
from .yamlsource import ConflictError, Loaded, YamlError, YamlSource

_LOGGER = logging.getLogger(__name__)

EMPTY: dict[str, Any] = {"settings": {}, "rooms": {}, "rules": []}


class ConfigSource:
    """Reads and writes the raw configuration (as written by the user, before validation)."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.yaml = YamlSource(Path(hass.config.path(YAML_FILE)))
        self.store: Store[dict[str, Any]] = Store(hass, 1, f"{DOMAIN}.config")
        self.mode = "storage"
        self.raw: dict[str, Any] = copy.deepcopy(EMPTY)
        self.loaded: Loaded | None = None
        self.error: YamlError | None = None
        self.modified: float | None = None

    @property
    def path(self) -> str:
        return str(self.yaml.path)

    async def async_load(self) -> dict[str, Any]:
        """The raw configuration: from the YAML file when it exists (a broken file keeps the last good one)."""
        if await self.hass.async_add_executor_job(self.yaml.exists):
            self.mode = "yaml"
            try:
                self.loaded = await self.hass.async_add_executor_job(self.yaml.load)
            except YamlError as err:
                self.error = err
                _LOGGER.warning("house_rules.yaml: %s", err)
                return self.raw
            self.error = None
            self.raw = self.loaded.data
            self.modified = await self.hass.async_add_executor_job(_mtime, self.yaml.path)
            return self.raw
        self.mode = "storage"
        self.error = None
        self.raw = {**copy.deepcopy(EMPTY), **(await self.store.async_load() or {})}
        return self.raw

    async def async_changed(self) -> bool:
        """The YAML file changed on disk (or appeared / disappeared) since the last read."""
        exists = await self.hass.async_add_executor_job(self.yaml.exists)
        if exists != (self.mode == "yaml"):
            return True
        return exists and await self.hass.async_add_executor_job(self.yaml.changed)

    def editable(self) -> bool:
        return self.error is None

    async def async_save_rule(self, rule: dict[str, Any], previous_id: str | None = None) -> None:
        if self.mode == "yaml":
            assert self.loaded is not None
            await self.hass.async_add_executor_job(self.yaml.save_rule, rule, self.loaded.rule_files, previous_id)
            return
        rules = [r for r in self.raw["rules"] if r.get("id") != (previous_id or rule["id"])]
        index = next((i for i, r in enumerate(self.raw["rules"]) if r.get("id") == (previous_id or rule["id"])), None)
        rules.insert(index if index is not None else len(rules), rule)
        self.raw["rules"] = rules
        await self.store.async_save(self.raw)

    async def async_delete_rule(self, rid: str) -> None:
        if self.mode == "yaml":
            assert self.loaded is not None
            await self.hass.async_add_executor_job(self.yaml.delete_rule, rid, self.loaded.rule_files)
            return
        self.raw["rules"] = [r for r in self.raw["rules"] if r.get("id") != rid]
        await self.store.async_save(self.raw)

    async def async_save_section(self, section: str, value: dict[str, Any]) -> None:
        if self.mode == "yaml":
            assert self.loaded is not None
            await self.hass.async_add_executor_job(self.yaml.save_section, section, value, self.loaded.section_files)
            return
        self.raw[section] = value
        await self.store.async_save(self.raw)

    async def async_switch_to_yaml(self) -> None:
        """Write house_rules.yaml from the stored configuration; the file is the source from then on."""
        if await self.hass.async_add_executor_job(self.yaml.exists):
            return
        await self.hass.async_add_executor_job(self.yaml.create, self.raw)

    async def async_rule_text(self, rid: str) -> str | None:
        if self.mode != "yaml" or self.loaded is None:
            return None
        return await self.hass.async_add_executor_job(self.yaml.rule_text, rid, self.loaded.rule_files)

    def info(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "path": self.path if self.mode == "yaml" else None,
            "files": sorted(self.loaded.hashes) if self.mode == "yaml" and self.loaded else [],
            "modified": self.modified,
            "error": (
                {"message": str(self.error), "file": self.error.file, "line": self.error.line} if self.error else None
            ),
        }


def _mtime(path: Path) -> float | None:
    try:
        return path.stat().st_mtime
    except OSError:
        return None


__all__ = ["ConfigSource", "ConflictError", "YamlError"]
