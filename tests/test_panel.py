"""Sidebar panel and card resources: registered once, versioned, removed with the entry."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from homeassistant.components import frontend
from homeassistant.core import HomeAssistant

from custom_components.house_rules import panel
from custom_components.house_rules.const import PANEL_URL


class FakeResources:
    """The dashboard resources collection (storage mode)."""

    def __init__(self, items=None):
        self.items = list(items or [])
        self.next = 100

    async def async_get_info(self):
        return {}

    def async_items(self):
        return list(self.items)

    async def async_create_item(self, data):
        self.next += 1
        self.items.append({"id": str(self.next), **data})

    async def async_update_item(self, item_id, data):
        for item in self.items:
            if item["id"] == item_id:
                item.update(data)

    async def async_delete_item(self, item_id):
        self.items = [i for i in self.items if i["id"] != item_id]


def _lovelace(resources, mode="storage"):
    return SimpleNamespace(resource_mode=mode, resources=resources)


async def test_storage_resources_across_versions(hass: HomeAssistant):
    res = FakeResources()
    hass.data["lovelace"] = {"mode": "storage", "resources": res}
    assert panel._storage_resources(hass) is res
    hass.data["lovelace"] = SimpleNamespace(mode="storage", resources=res)
    assert panel._storage_resources(hass) is res
    hass.data["lovelace"] = _lovelace(res, "yaml")
    assert panel._storage_resources(hass) is None


async def test_resource_added_updated_and_deduplicated(hass: HomeAssistant):
    url = panel.CARD_URLS[0]
    res = FakeResources(
        [
            {"id": "1", "url": f"{url}?v=0.1", "res_type": "module"},
            {"id": "2", "url": f"{url}?v=0.0", "res_type": "module"},
            {"id": "3", "url": "/local/other.js", "res_type": "module"},
        ]
    )
    hass.data["lovelace"] = _lovelace(res)
    assert await panel._async_register_resource(hass, f"{url}?v=9")
    mine = [i for i in res.items if i["url"].startswith(url)]
    assert [i["url"] for i in mine] == [f"{url}?v=9"]
    await panel.async_remove_card(hass)
    assert [i["url"] for i in res.items] == ["/local/other.js"]
    assert await panel._async_register_resource(hass, f"{url}?v=9")
    assert [i["url"] for i in res.items] == ["/local/other.js", f"{url}?v=9"]


async def test_resource_error_falls_back(hass: HomeAssistant):
    res = FakeResources()
    res.async_get_info = AsyncMock(side_effect=RuntimeError("boom"))
    hass.data["lovelace"] = _lovelace(res)
    assert not await panel._async_register_resource(hass, panel.CARD_URLS[0])
    hass.data["lovelace"] = _lovelace(res, "yaml")
    assert not await panel._async_register_resource(hass, panel.CARD_URLS[0])
    await panel.async_remove_card(hass)  # YAML resources: nothing to remove


async def test_panel_registered_once_and_removed(hass: HomeAssistant):
    hass.config.components.add("frontend")
    static = AsyncMock()
    hass.http = SimpleNamespace(async_register_static_paths=static)
    hass.data["lovelace"] = _lovelace(FakeResources())
    panels: dict = {}

    def register(hass_, **kwargs):
        panels[kwargs["frontend_url_path"]] = kwargs

    def remove(hass_, url):
        panels.pop(url, None)

    with (
        patch.object(frontend, "add_extra_js_url") as extra,
        patch.object(frontend, "async_register_built_in_panel", side_effect=register) as built_in,
        patch.object(frontend, "async_remove_panel", side_effect=remove),
        patch.dict(hass.data, {frontend.DATA_PANELS: panels}),
    ):
        await panel.async_register_panel(hass)
        await panel.async_register_panel(hass)
        assert static.await_count == 1
        assert extra.call_count == 2  # icon set and sidebar badge, once per run
        assert built_in.call_count == 1
        cfg = panels[PANEL_URL]
        assert cfg["require_admin"] is True
        assert "?v=" in cfg["config"]["_panel_custom"]["module_url"]
        panel.async_remove_panel(hass)
        assert PANEL_URL not in panels
        panel.async_remove_panel(hass)  # already gone: no error


async def test_no_frontend_no_panel(hass: HomeAssistant):
    assert "frontend" not in hass.config.components
    with patch.object(frontend, "async_register_built_in_panel") as built_in:
        await panel.async_register_panel(hass)
        panel.async_remove_panel(hass)
    built_in.assert_not_called()


async def test_unload_removes_panel(hass: HomeAssistant):
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.house_rules.const import DOMAIN

    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    with patch("custom_components.house_rules.async_remove_panel") as removed:
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        assert await hass.config_entries.async_unload(entry.entry_id)
    removed.assert_called_once_with(hass)
