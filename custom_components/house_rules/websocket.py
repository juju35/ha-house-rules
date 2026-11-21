"""WebSocket API of the panel and the cards."""

from __future__ import annotations

import io
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import Unauthorized
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from ruamel.yaml import YAML

from .const import DOMAIN, SIGNAL_UPDATE
from .importer import analyze
from .manager import HouseRules
from .yamlsource import ConflictError, YamlError


def _manager(hass: HomeAssistant) -> HouseRules | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED:
            return entry.runtime_data
    return None


def _public(snapshot: dict[str, Any], admin: bool) -> dict[str, Any]:
    """What a non-administrator sees: the state, not the configuration."""
    if admin:
        return snapshot
    return {k: v for k, v in snapshot.items() if k not in ("raw", "rooms", "settings", "source", "errors")}


@callback
def async_register(hass: HomeAssistant) -> None:
    for handler in (
        ws_subscribe,
        ws_action,
        ws_timer,
        ws_rule_save,
        ws_rule_delete,
        ws_rule_yaml,
        ws_section_save,
        ws_yaml_enable,
        ws_reload,
        ws_import_analyze,
        ws_import_apply,
        ws_vacation,
        ws_yaml_get,
        ws_yaml_save,
    ):
        websocket_api.async_register_command(hass, handler)


def _error(connection: websocket_api.ActiveConnection, msg_id: int, code: str, message: str, data: Any = None) -> None:
    """An error result that carries `data` (the frontend gets it as err.data): conflicts, YAML line numbers."""
    error: dict[str, Any] = {"code": code, "message": message}
    if data is not None:
        error["data"] = data
    connection.send_message({"id": msg_id, "type": "result", "success": False, "error": error})


def _not_loaded(connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    connection.send_error(msg["id"], "not_loaded", "House Rules is not loaded")


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """The snapshot now and at every change (any user; the configuration for administrators only)."""
    admin = connection.user.is_admin

    @callback
    def send() -> None:
        manager = _manager(hass)
        connection.send_message(
            websocket_api.event_message(msg["id"], _public(manager.snapshot(), admin) if manager else None)
        )

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_UPDATE, send)
    connection.send_result(msg["id"])
    send()


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/action",
        vol.Required("rule"): str,
        vol.Required("action"): vol.In(("test", "cancel", "acknowledge", "snooze")),
        vol.Optional("minutes"): vol.All(vol.Coerce(int), vol.Range(min=0, max=7 * 24 * 60)),
    }
)
@websocket_api.async_response
async def ws_action(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    if msg["action"] != "acknowledge" and not connection.user.is_admin:
        raise Unauthorized
    rule = manager.rules.get(msg["rule"])
    if rule is None:
        connection.send_error(msg["id"], "unknown_rule", msg["rule"])
        return
    if msg["action"] == "snooze":
        rule.snooze((msg.get("minutes") or 0) * 60 or None)
    elif msg["action"] == "test":
        hass.async_create_task(rule.async_test())
    elif msg["action"] == "acknowledge":
        await rule.async_acknowledge()
    else:
        await rule.async_cancel()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/timer",
        vol.Required("entity_id"): str,
        vol.Required("action"): vol.In(("extend", "off")),
        vol.Optional("minutes", default=15): vol.All(vol.Coerce(int), vol.Range(min=-1440, max=1440)),
    }
)
@websocket_api.async_response
async def ws_timer(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    for rule in manager.rules.values():
        if any(t["entity_id"] == msg["entity_id"] for t in rule.timers()):
            if msg["action"] == "extend":
                rule.extend(msg["entity_id"], msg["minutes"])  # type: ignore[attr-defined]
            else:
                await rule.async_turn_off(msg["entity_id"])  # type: ignore[attr-defined]
    connection.send_result(msg["id"])


def _parse(text: str) -> Any:
    try:
        return YAML(typ="safe").load(io.StringIO(text))
    except Exception as err:  # noqa: BLE001
        raise vol.Invalid(f"YAML: {str(err).splitlines()[0]}") from err


async def _guard(
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    job: Any,
    manager: HouseRules,
    conflict: Any = None,
) -> None:
    """Run a write; turn validation, file and conflict errors into WebSocket errors.

    `conflict`: coroutine function giving the conflict's data (default: the rule as it is now in its file).
    """
    try:
        await job()
    except ConflictError as err:
        if conflict is not None:
            data = await conflict()
        else:
            current = None
            if isinstance(msg.get("rule"), dict) and msg["rule"].get("id"):
                current = await manager.source.async_rule_text(msg.get("previous_id") or msg["rule"]["id"])
            data = {"current": current}
        _error(connection, msg["id"], "conflict", str(err), {**data, "file": err.file})
        return
    except YamlError as err:
        _error(connection, msg["id"], "yaml_error", str(err), {"file": err.file, "line": err.line})
        return
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"])


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/rule/save",
        vol.Exclusive("rule", "content"): dict,
        vol.Exclusive("yaml", "content"): str,
        vol.Optional("previous_id"): vol.Any(None, str),
    }
)
@websocket_api.async_response
async def ws_rule_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    if manager.source.mode == "yaml" and not manager.source.editable():
        connection.send_error(msg["id"], "yaml_error", "house_rules.yaml is invalid: fix it first")
        return

    async def job() -> None:
        rule = msg.get("rule")
        if rule is None:
            # ruamel looks for its plug-ins on disk when a YAML() is made: off the event loop.
            rule = await connection.hass.async_add_executor_job(_parse, msg.get("yaml") or "")
            if not isinstance(rule, dict):
                raise vol.Invalid("a rule is a mapping")
            msg["rule"] = rule
        await manager.async_save_rule(rule, msg.get("previous_id"))

    await _guard(connection, msg, job, manager)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/rule/delete", vol.Required("rule_id"): str})
@websocket_api.async_response
async def ws_rule_delete(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    await _guard(connection, msg, lambda: manager.async_delete_rule(msg["rule_id"]), manager)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/rule/yaml", vol.Required("rule_id"): str})
@websocket_api.async_response
async def ws_rule_yaml(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """The YAML of a rule: as written in house_rules.yaml (comments kept), else generated."""
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    from .yamlsource import dump

    text = None
    try:
        text = await manager.source.async_rule_text(msg["rule_id"])
    except YamlError:
        text = None
    if text is None:
        raw = next((r for r in manager.raw.get("rules", []) if r.get("id") == msg["rule_id"]), None)
        text = dump(raw) if raw is not None else ""
    connection.send_result(msg["id"], {"yaml": text})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/section/save",
        vol.Required("section"): vol.In(("settings", "rooms")),
        vol.Required("value"): dict,
    }
)
@websocket_api.async_response
async def ws_section_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    await _guard(connection, msg, lambda: manager.async_save_section(msg["section"], msg["value"]), manager)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/yaml/enable"})
@websocket_api.async_response
async def ws_yaml_enable(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Switch to YAML: write house_rules.yaml from the stored configuration."""
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)

    async def job() -> None:
        await manager.source.async_switch_to_yaml()
        await manager.async_reload()

    await _guard(connection, msg, job, manager)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/reload"})
@websocket_api.async_response
async def ws_reload(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    changed = await manager.async_reload()
    connection.send_result(msg["id"], {"reloaded": changed})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/import/analyze"})
@websocket_api.async_response
async def ws_import_analyze(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Rules proposed from the labels (Rallumer Prise, Extinction automatique) and recognised automations."""
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    connection.send_result(msg["id"], await analyze(hass, manager))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/vacation", vol.Required("value"): bool})
@websocket_api.async_response
async def ws_vacation(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    await manager.async_set_vacation(msg["value"])
    connection.send_result(msg["id"])


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/import/apply",
        vol.Optional("rules", default=list): [dict],
        vol.Optional("rooms", default=dict): dict,
        vol.Optional("automations", default=list): [str],
    }
)
@websocket_api.async_response
async def ws_import_apply(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Add the chosen rules (and their rooms), then turn the replaced automations off (never deleted)."""
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)

    async def job() -> None:
        if msg["rooms"]:
            rooms = {k: dict(v) for k, v in (manager.raw.get("rooms") or {}).items()}
            for name, room in msg["rooms"].items():
                rooms[name] = {**room, **rooms.get(name, {})}
            await manager.async_save_section("rooms", rooms)
        taken = {r.get("id") for r in manager.raw.get("rules", [])}
        for item in msg["rules"]:
            rule = dict(item)
            base, n = rule["id"], 2
            while rule["id"] in taken:
                rule["id"], n = f"{base}_{n}", n + 1
            taken.add(rule["id"])
            await manager.async_save_rule(rule)
        if msg["automations"]:
            await manager.call("automation", "turn_off", {"entity_id": msg["automations"]})

    await _guard(connection, msg, job, manager)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/yaml/get"})
@websocket_api.async_response
async def ws_yaml_get(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """The whole configuration as YAML: house_rules.yaml as written (editable), else generated from storage."""
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    from .yamlsource import dump

    if manager.source.mode == "yaml":
        try:
            text, digest = await hass.async_add_executor_job(manager.source.yaml.read_text)
        except OSError as err:
            connection.send_error(msg["id"], "yaml_error", str(err))
            return
        connection.send_result(
            msg["id"],
            {
                "mode": "yaml",
                "path": manager.source.path,
                "text": text,
                "hash": digest,
                "includes": len(manager.source.info()["files"]) > 1,
            },
        )
        return
    connection.send_result(msg["id"], {"mode": "storage", "path": None, "text": dump(manager.raw), "hash": None})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/yaml/save", vol.Required("text"): str, vol.Optional("hash"): vol.Any(None, str)}
)
@websocket_api.async_response
async def ws_yaml_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Replace house_rules.yaml with the edited text: checked first (YAML and every rule), refused on conflict."""
    if (manager := _manager(hass)) is None:
        return _not_loaded(connection, msg)
    if manager.source.mode != "yaml":
        connection.send_error(msg["id"], "storage", "switch to YAML first")
        return
    from .schema import validate_config

    async def job() -> None:
        data = await hass.async_add_executor_job(manager.source.yaml.check_text, msg["text"])
        validate_config(data)
        await hass.async_add_executor_job(manager.source.yaml.write_text, msg["text"], msg.get("hash"))
        await manager.async_reload()

    async def current() -> dict[str, Any]:
        text, digest = await hass.async_add_executor_job(manager.source.yaml.read_text)
        return {"current": text, "hash": digest}

    await _guard(connection, msg, job, manager, current)
