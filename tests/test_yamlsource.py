"""house_rules.yaml read and written both ways: comments kept, ids generated, conflicts refused, includes."""

from __future__ import annotations

from pathlib import Path

import pytest

from custom_components.house_rules.yamlsource import ConflictError, YamlError, YamlSource, dump

MAIN = """\
# My rules
settings:
  quiet_hours: {start: "00:00", end: "08:00"}
rooms:
  Kitchen:
    light: light.kitchen   # shared with dining
rules:
  # the kettle
  - id: kettle
    type: auto_off
    entity_id: switch.kettle
    duration: "00:05:00"   # five minutes
  - type: keep_on
    name: Internet box
    entity_id: switch.box
"""


@pytest.fixture
def src(tmp_path: Path) -> YamlSource:
    (tmp_path / "house_rules.yaml").write_text(MAIN, encoding="utf-8")
    return YamlSource(tmp_path / "house_rules.yaml")


def test_load_generates_missing_ids(src: YamlSource):
    loaded = src.load()
    ids = [r["id"] for r in loaded.data["rules"]]
    assert ids == ["kettle", "internet_box"]
    assert loaded.generated_ids == ["internet_box"]
    text = src.path.read_text(encoding="utf-8")
    assert "id: internet_box" in text
    assert "# five minutes" in text and "# My rules" in text


def test_save_rule_keeps_comments(src: YamlSource):
    loaded = src.load()
    src.save_rule(
        {"id": "kettle", "type": "auto_off", "entity_id": "switch.kettle", "duration": "00:07:00"}, loaded.rule_files
    )
    text = src.path.read_text(encoding="utf-8")
    assert "00:07:00" in text
    assert "# the kettle" in text
    assert "# shared with dining" in text
    assert (src.path.parent / "house_rules.yaml.bak").exists()


def test_add_and_delete_rule(src: YamlSource):
    loaded = src.load()
    src.save_rule({"id": "new", "type": "keep_on", "entity_id": ["switch.a"]}, loaded.rule_files)
    loaded = src.load()
    assert [r["id"] for r in loaded.data["rules"]][-1] == "new"
    src.delete_rule("new", loaded.rule_files)
    assert "id: new" not in src.path.read_text(encoding="utf-8")


def test_conflict_when_file_changed(src: YamlSource):
    loaded = src.load()
    src.path.write_text(src.path.read_text(encoding="utf-8") + "\n# edited by hand\n", encoding="utf-8")
    assert src.changed()
    with pytest.raises(ConflictError):
        src.save_rule({"id": "kettle", "type": "auto_off", "entity_id": "switch.kettle"}, loaded.rule_files)


def test_secret_resolved_and_kept(tmp_path: Path):
    (tmp_path / "secrets.yaml").write_text("phone: notify.mobile_app_x\n", encoding="utf-8")
    (tmp_path / "house_rules.yaml").write_text("settings:\n  notify: !secret phone\nrules: []\n", encoding="utf-8")
    src = YamlSource(tmp_path / "house_rules.yaml")
    loaded = src.load()
    assert loaded.data["settings"]["notify"] == "notify.mobile_app_x"
    src.save_section("settings", {"notify": "notify.mobile_app_x", "repairs": False}, loaded.section_files)
    text = (tmp_path / "house_rules.yaml").read_text(encoding="utf-8")
    assert "!secret phone" in text and "repairs: false" in text


def test_include_dir_merge_list(tmp_path: Path):
    folder = tmp_path / "house_rules"
    folder.mkdir()
    (folder / "plugs.yaml").write_text("- id: a\n  type: keep_on\n  entity_id: switch.a\n", encoding="utf-8")
    (tmp_path / "house_rules.yaml").write_text("rules: !include_dir_merge_list house_rules\n", encoding="utf-8")
    src = YamlSource(tmp_path / "house_rules.yaml")
    loaded = src.load()
    assert loaded.rule_files["a"].endswith("plugs.yaml")
    src.save_rule({"id": "a", "type": "keep_on", "entity_id": "switch.b"}, loaded.rule_files)
    assert "switch.b" in (folder / "plugs.yaml").read_text(encoding="utf-8")
    assert "switch.b" not in (tmp_path / "house_rules.yaml").read_text(encoding="utf-8")


def test_invalid_yaml_reports_line(tmp_path: Path):
    (tmp_path / "house_rules.yaml").write_text("rules:\n  - id: a\n   type: x\n", encoding="utf-8")
    with pytest.raises(YamlError) as err:
        YamlSource(tmp_path / "house_rules.yaml").load()
    assert err.value.line is not None


def test_create_and_dump(tmp_path: Path):
    src = YamlSource(tmp_path / "house_rules.yaml")
    src.create(
        {
            "settings": {},
            "rooms": {"Hall": {"light": "light.hall"}},
            "rules": [{"id": "a", "type": "keep_on", "entity_id": ["switch.a"]}],
        }
    )
    loaded = src.load()
    assert loaded.data["rooms"]["Hall"]["light"] == "light.hall"
    assert "id: a" in dump(loaded.data)


def test_new_file_in_included_folder_is_seen(tmp_path: Path):
    folder = tmp_path / "house_rules"
    folder.mkdir()
    (folder / "a.yaml").write_text("- id: a\n  type: keep_on\n  entity_id: switch.a\n", encoding="utf-8")
    (tmp_path / "house_rules.yaml").write_text("rules: !include_dir_merge_list house_rules\n", encoding="utf-8")
    src = YamlSource(tmp_path / "house_rules.yaml")
    src.load()
    assert not src.changed()
    (folder / "b.yaml").write_text("- id: b\n  type: keep_on\n  entity_id: switch.b\n", encoding="utf-8")
    assert src.changed()
