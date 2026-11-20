"""house_rules.yaml as the source of truth, edited from both sides.

Round-trip with ruamel.yaml: comments, key order and layout survive a write; only the block of the rule (found by
its `id`) or the section that changed is rewritten. `!secret` is resolved for the engine and kept as is in the file.
`rules`, `rooms` and `settings` may be split with `!include file.yaml`, and `rules` with `!include_dir_merge_list
dir`: each rule is written back to the file it came from. Every write is atomic (temporary file then rename) and
keeps a `.bak` of the previous version. A write is refused when a file changed since it was read (`ConflictError`).

Pure file code, no Home Assistant: the integration runs it in the executor.
"""

from __future__ import annotations

import hashlib
import io
import os
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ruamel.yaml import YAML
from ruamel.yaml.comments import CommentedMap, CommentedSeq, TaggedScalar

SECTIONS = ("settings", "rooms", "rules")


class YamlError(Exception):
    """The file can't be read: invalid YAML or an include that can't be resolved."""

    def __init__(self, message: str, file: str | None = None, line: int | None = None) -> None:
        super().__init__(message)
        self.file = file
        self.line = line


class ConflictError(Exception):
    """A file changed since it was read: the write was refused."""

    def __init__(self, file: str, current: Any) -> None:
        super().__init__(f"{file} changed since it was read")
        self.file = file
        self.current = current


def _yaml() -> YAML:
    y = YAML()  # round-trip
    y.preserve_quotes = True
    y.width = 4096
    y.indent(mapping=2, sequence=4, offset=2)
    return y


def file_hash(path: Path) -> str:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except FileNotFoundError:
        return ""


@dataclass
class Loaded:
    """What a read gives: the plain configuration and where each part lives."""

    data: dict[str, Any]
    hashes: dict[str, str] = field(default_factory=dict)
    rule_files: dict[str, str] = field(default_factory=dict)
    section_files: dict[str, str] = field(default_factory=dict)
    generated_ids: list[str] = field(default_factory=list)


class YamlSource:
    """The YAML configuration rooted at `path` (house_rules.yaml in the config folder)."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.root = path.parent
        self._secrets: dict[str, Any] | None = None
        self.hashes: dict[str, str] = {}
        self.folders: dict[str, list[str]] = {}  # included folder -> its files at the last read

    # ---------- reading ----------
    def exists(self) -> bool:
        return self.path.is_file()

    def _read(self, path: Path) -> Any:
        try:
            with path.open(encoding="utf-8") as f:
                return _yaml().load(f)
        except FileNotFoundError as err:
            raise YamlError(f"file not found: {path.name}", str(path)) from err
        except Exception as err:  # ruamel raises many error types
            mark = getattr(err, "problem_mark", None)
            raise YamlError(str(err).splitlines()[0], str(path), mark.line + 1 if mark else None) from err

    def _secret(self, name: str) -> Any:
        if self._secrets is None:
            secrets_path = self.root / "secrets.yaml"
            self._secrets = {}
            if secrets_path.is_file():
                y = YAML(typ="safe")
                self._secrets = y.load(secrets_path.read_text(encoding="utf-8")) or {}
        if name not in self._secrets:
            raise YamlError(f"secret not found: {name}", str(self.root / "secrets.yaml"))
        return self._secrets[name]

    def plain(self, node: Any) -> Any:
        """A ruamel node as plain Python, with `!secret` resolved."""
        if isinstance(node, TaggedScalar):
            if node.tag.value == "!secret":
                return self._secret(str(node.value))
            return node.value
        if isinstance(node, dict):
            return {str(k): self.plain(v) for k, v in node.items()}
        if isinstance(node, list):
            return [self.plain(v) for v in node]
        return node

    def _include(self, node: Any) -> tuple[str, list[Path]] | None:
        """An `!include` / `!include_dir_merge_list` node: its kind and files; None for an inline value."""
        if not isinstance(node, TaggedScalar):
            return None
        tag, target = node.tag.value, str(node.value)
        path = (self.root / target).resolve()
        if not path.is_relative_to(self.root.resolve()):
            raise YamlError(f"include outside the config folder: {target}", str(self.path))
        if tag == "!include":
            return "file", [path]
        if tag == "!include_dir_merge_list":
            if not path.is_dir():
                raise YamlError(f"folder not found: {target}", str(self.path))
            files = sorted(path.glob("*.yaml"))
            self.folders[str(path)] = [str(p) for p in files]
            return "dir", files
        return None

    def load(self) -> Loaded:
        """Read every file; give `id` to the rules that have none (written back right away)."""
        self._secrets = None
        self.folders = {}
        main = self._read(self.path) or CommentedMap()
        if not isinstance(main, dict):
            raise YamlError("the file must be a mapping (settings, rooms, rules)", str(self.path))
        loaded = Loaded(data={"settings": {}, "rooms": {}, "rules": []})
        hashes = {str(self.path): file_hash(self.path)}
        for section in SECTIONS:
            node = main.get(section)
            inc = self._include(node)
            if inc is None:
                files = [(self.path, node)]
            else:
                files = [(p, self._read(p)) for p in inc[1]]
                for p, _ in files:
                    hashes[str(p)] = file_hash(p)
                if inc[0] == "file":
                    loaded.section_files[section] = str(inc[1][0])
            if section == "rules":
                for p, seq in files:
                    for item in seq or []:
                        if not isinstance(item, dict):
                            continue
                        if not item.get("id"):
                            item["id"] = self._new_id(item, loaded)
                            loaded.generated_ids.append(item["id"])
                            self._mark_dirty(p)
                        loaded.rule_files[str(item["id"])] = str(p)
                        loaded.data["rules"].append(self.plain(item))
            else:
                merged: dict[str, Any] = {}
                for _, value in files:
                    merged.update(self.plain(value or {}))
                loaded.data[section] = merged
        if loaded.generated_ids:
            self._flush_generated(main, loaded)
            hashes = {p: file_hash(Path(p)) for p in hashes}
        loaded.hashes = hashes
        self.hashes = dict(hashes)
        return loaded

    def _new_id(self, item: dict, loaded: Loaded) -> str:
        base = "".join(c if c.isalnum() else "_" for c in str(item.get("name") or item.get("type") or "rule").lower())
        base = base.strip("_")[:50] or "rule"
        taken = set(loaded.rule_files)
        candidate, n = base, 2
        while candidate in taken:
            candidate, n = f"{base}_{n}", n + 1
        return candidate

    _dirty: set[Path]

    def _mark_dirty(self, path: Path) -> None:
        self.__dict__.setdefault("_dirty", set()).add(path)

    def _flush_generated(self, main: Any, loaded: Loaded) -> None:
        """Write the generated ids: re-read each dirty file, set the ids by position, write it."""
        for path in self.__dict__.pop("_dirty", set()):
            doc = self._read(path)
            seq = doc.get("rules") if path == self.path else doc
            if isinstance(seq, list):
                ids = iter(i for i, f in loaded.rule_files.items() if f == str(path))
                for item in seq:
                    if isinstance(item, dict):
                        item_id = next(ids, None)
                        if not item.get("id") and item_id:
                            item.insert(0, "id", item_id)
            self._write(path, doc)

    # ---------- writing ----------
    def changed(self) -> bool:
        """A file changed (or appeared/disappeared) since the last read."""
        if not self.hashes:
            return self.exists()
        if any(sorted(str(p) for p in Path(d).glob("*.yaml")) != files for d, files in self.folders.items()):
            return True
        return any(file_hash(Path(p)) != h for p, h in self.hashes.items())

    def _check(self, path: Path) -> None:
        expected = self.hashes.get(str(path))
        if expected is not None and file_hash(path) != expected:
            raise ConflictError(str(path), None)

    def _write(self, path: Path, doc: Any) -> None:
        buf = io.StringIO()
        _yaml().dump(doc, buf)
        text = buf.getvalue()
        if path.exists():
            shutil.copy2(path, path.with_suffix(path.suffix + ".bak"))
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, path)
        self.hashes[str(path)] = file_hash(path)

    def _update(self, target: CommentedMap, value: dict[str, Any], original: Any = None) -> None:
        """Update a mapping in place: untouched keys keep their comments; secrets stay when unchanged."""
        for key in [k for k in target if k not in value]:
            del target[key]
        for key, new in value.items():
            old = target.get(key)
            if isinstance(old, TaggedScalar) and old.tag.value == "!secret":
                try:
                    if self._secret(str(old.value)) == new:
                        continue
                except YamlError:
                    pass
            if isinstance(old, CommentedMap) and isinstance(new, dict):
                self._update(old, new)
            elif self.plain(old) != new if key in target else True:
                target[key] = _to_node(new)

    def _rules_seq(self, path: Path, doc: Any) -> Any:
        if path == self.path:
            if doc.get("rules") is None or isinstance(doc.get("rules"), TaggedScalar):
                if isinstance(doc.get("rules"), TaggedScalar):
                    raise YamlError("rules are included from another file", str(path))
                doc["rules"] = CommentedSeq()
            return doc["rules"]
        if doc is None:
            return CommentedSeq()
        return doc

    def save_rule(self, rule: dict[str, Any], rule_files: dict[str, str], previous_id: str | None = None) -> None:
        """Create or replace one rule (by id), in the file it lives in (new rules: main list or rules file)."""
        key = previous_id or rule["id"]
        target = Path(rule_files.get(key) or self._new_rule_file())
        self._check(target)
        doc = self._read(target) if target.exists() else (CommentedSeq() if target != self.path else CommentedMap())
        if doc is None:
            doc = CommentedSeq() if target != self.path else CommentedMap()
        seq = self._rules_seq(target, doc)
        for item in seq:
            if isinstance(item, dict) and str(item.get("id")) == key:
                self._update(item, rule)
                break
        else:
            seq.append(_to_node(rule))
        if target != self.path and doc is not seq:
            doc = seq
        self._write(target, doc)

    def _new_rule_file(self) -> str:
        main = self._read(self.path) if self.path.exists() else None
        inc = self._include(main.get("rules")) if isinstance(main, dict) else None
        if inc and inc[0] == "file":
            return str(inc[1][0])
        if inc and inc[0] == "dir":
            folder = (self.root / str(main["rules"].value)).resolve()
            return str(folder / "house_rules_new.yaml")
        return str(self.path)

    def delete_rule(self, rid: str, rule_files: dict[str, str]) -> None:
        target = Path(rule_files.get(rid) or self.path)
        self._check(target)
        doc = self._read(target)
        seq = self._rules_seq(target, doc)
        for i, item in enumerate(seq):
            if isinstance(item, dict) and str(item.get("id")) == rid:
                del seq[i]
                break
        self._write(target, doc)

    def save_section(self, section: str, value: dict[str, Any], section_files: dict[str, str]) -> None:
        """Replace `settings` or `rooms` (in place, comments kept)."""
        target = Path(section_files.get(section) or self.path)
        self._check(target)
        doc = self._read(target) if target.exists() else CommentedMap()
        doc = doc if doc is not None else CommentedMap()
        node = doc if target != self.path else doc.setdefault(section, CommentedMap())
        if not isinstance(node, CommentedMap):
            node = CommentedMap()
            doc[section] = node
        self._update(node, value)
        self._write(target, doc)

    def create(self, data: dict[str, Any]) -> None:
        """Write a new house_rules.yaml from a plain configuration (switch to YAML)."""
        doc = CommentedMap()
        doc.yaml_set_start_comment("House Rules — edited by the House Rules panel and by hand, both ways.")
        for section in SECTIONS:
            if data.get(section):
                doc[section] = _to_node(data[section])
        self._write(self.path, doc)

    def read_text(self) -> tuple[str, str]:
        """The main file as written, and its hash."""
        return self.path.read_text(encoding="utf-8"), file_hash(self.path)

    def check_text(self, text: str) -> dict[str, Any]:
        """Parse a whole file's text (includes and secrets resolved) into the plain configuration."""
        try:
            doc = _yaml().load(io.StringIO(text)) or CommentedMap()
        except Exception as err:
            mark = getattr(err, "problem_mark", None)
            raise YamlError(str(err).splitlines()[0], str(self.path), mark.line + 1 if mark else None) from err
        if not isinstance(doc, dict):
            raise YamlError("the file must be a mapping (settings, rooms, rules)", str(self.path))
        data: dict[str, Any] = {}
        for section in SECTIONS:
            node = doc.get(section)
            inc = self._include(node)
            if inc is None:
                data[section] = self.plain(node) if node is not None else ([] if section == "rules" else {})
            elif section == "rules":
                data[section] = [r for p in inc[1] for r in self.plain(self._read(p) or [])]
            else:
                data[section] = {k: v for p in inc[1] for k, v in self.plain(self._read(p) or {}).items()}
        return data

    def write_text(self, text: str, expected_hash: str | None) -> None:
        """Replace the main file with `text` (refused when it changed since `expected_hash` was read)."""
        if expected_hash is not None and file_hash(self.path) != expected_hash:
            raise ConflictError(str(self.path), None)
        if self.path.exists():
            shutil.copy2(self.path, self.path.with_suffix(self.path.suffix + ".bak"))
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(text if text.endswith("\n") else f"{text}\n", encoding="utf-8")
        os.replace(tmp, self.path)
        self.hashes[str(self.path)] = file_hash(self.path)

    def rule_text(self, rid: str, rule_files: dict[str, str]) -> str | None:
        """The YAML of one rule as it is in its file (comments included), for the panel."""
        target = Path(rule_files.get(rid) or self.path)
        doc = self._read(target)
        seq = doc.get("rules") if target == self.path and isinstance(doc, dict) else doc
        for item in seq or []:
            if isinstance(item, dict) and str(item.get("id")) == rid:
                buf = io.StringIO()
                _yaml().dump(item, buf)
                return buf.getvalue()
        return None


def _to_node(value: Any) -> Any:
    """Plain Python to round-trip nodes (so they dump in block style like the rest of the file)."""
    if isinstance(value, dict):
        m = CommentedMap()
        for k, v in value.items():
            m[k] = _to_node(v)
        return m
    if isinstance(value, list | tuple):
        if all(isinstance(v, int | float) for v in value) and value:
            s = CommentedSeq(value)
            s.fa.set_flow_style()
            return s
        return CommentedSeq(_to_node(v) for v in value)
    return value


def dump(data: dict[str, Any]) -> str:
    """Plain configuration as YAML text (export)."""
    buf = io.StringIO()
    _yaml().dump(_to_node(data), buf)
    return buf.getvalue()
