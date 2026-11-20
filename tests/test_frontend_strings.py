"""Every panel language has exactly the English keys and the same placeholders."""

import json
import re
from pathlib import Path

import pytest

PANEL = Path(__file__).parents[1] / "custom_components/house_rules/frontend/house-rules-panel.js"
TABLE = json.loads(re.search(r"const HRP_STRINGS = (\{.*?\n\});", PANEL.read_text(), re.S).group(1))


def _flat(table, prefix=""):
    out = {}
    for key, value in table.items():
        if isinstance(value, dict):
            out.update(_flat(value, f"{prefix}{key}."))
        else:
            out[prefix + key] = value
    return out


EN = _flat(TABLE["en"])


@pytest.mark.parametrize("language", sorted(set(TABLE) - {"en"}))
def test_panel_language(language):
    table = _flat(TABLE[language])
    assert set(table) == set(EN)
    for key, text in EN.items():
        assert set(re.findall(r"\{\w+\}", table[key])) == set(re.findall(r"\{\w+\}", text)), key
