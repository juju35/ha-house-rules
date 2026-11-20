"""The screenshot script: pixel comparison before rewriting, and no orphan file in screenshots/."""

from __future__ import annotations

import importlib.util
import io
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "screenshots.py"


def _script():
    spec = importlib.util.spec_from_file_location("house_rules_screenshots", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # without Playwright: it is only imported to render
    return module


def test_no_orphan_screenshot() -> None:
    # Only orphans fail: a screenshot just added to the script may not exist yet (the workflow renders it).
    folder = SCRIPT.parent.parent / "screenshots"
    present = {p.name for p in folder.iterdir()} if folder.exists() else set()
    assert present - _script().expected_files() == set()


def test_same_pixels_other_bytes_is_not_rewritten(tmp_path: Path) -> None:
    image = pytest.importorskip("PIL.Image")

    def png(color, level=6):
        out = io.BytesIO()
        image.new("RGB", (4, 3), color).save(out, "PNG", compress_level=level)
        return out.getvalue()

    save = _script().save_if_changed
    path = tmp_path / "shot.png"
    old = png((10, 20, 30), 9)
    path.write_bytes(old)
    assert save(path, png((10, 20, 30), 1)) is False
    assert path.read_bytes() == old
    assert save(path, png((10, 20, 31))) is True
    broken = tmp_path / "broken.png"
    broken.write_bytes(b"not a png")
    assert save(broken, png((1, 2, 3))) is True
