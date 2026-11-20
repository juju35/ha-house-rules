"""Every translation has exactly the keys and placeholders of the English one."""

from __future__ import annotations

import json
import string
from pathlib import Path

import pytest

TRANSLATIONS = Path(__file__).parent.parent / "custom_components" / "house_rules" / "translations"
LANGUAGES = sorted(p.stem for p in TRANSLATIONS.glob("*.json") if p.stem != "en")


def _flatten(data: dict, prefix: str = "") -> dict[str, str]:
    flat: dict[str, str] = {}
    for key, value in data.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            flat.update(_flatten(value, path))
        else:
            flat[path] = value
    return flat


def _load(language: str) -> dict[str, str]:
    return _flatten(json.loads((TRANSLATIONS / f"{language}.json").read_text(encoding="utf-8")))


def _placeholders(text: str) -> set[str]:
    return {name for _, name, _, _ in string.Formatter().parse(text) if name is not None}


@pytest.mark.parametrize("language", LANGUAGES)
def test_translation_parity(language: str):
    english, other = _load("en"), _load(language)
    assert sorted(other) == sorted(english)
    for key, text in english.items():
        assert other[key].strip(), key
        assert _placeholders(other[key]) == _placeholders(text), key


def test_states_translated():
    from custom_components.house_rules.const import STATES

    english = json.loads((TRANSLATIONS / "en.json").read_text(encoding="utf-8"))
    assert sorted(english["entity"]["sensor"]["rule"]["state"]) == sorted(STATES)


def test_services_documented():
    import yaml

    services = yaml.safe_load((TRANSLATIONS.parent / "services.yaml").read_text(encoding="utf-8"))
    english = json.loads((TRANSLATIONS / "en.json").read_text(encoding="utf-8"))["services"]
    assert sorted(services) == sorted(english)


def test_versions_match():
    """manifest.json, the panel and the cards carry the same version."""
    import re

    root = TRANSLATIONS.parent
    version = json.loads((root / "manifest.json").read_text(encoding="utf-8"))["version"]
    panel = (root / "frontend" / "house-rules-panel.js").read_text(encoding="utf-8")
    cards = (root / "frontend" / "house-rules-cards.js").read_text(encoding="utf-8")
    assert re.search(r"HOUSE_RULES_PANEL_VERSION = '([^']+)'", panel).group(1) == version
    assert re.search(r"HR_VERSION = '([^']+)'", cards).group(1) == version
    changelog = (root.parent.parent / "CHANGELOG.md").read_text(encoding="utf-8")
    assert f"## {version} " in changelog
