// The panel's Rooms tab in Node: rooms from the Home Assistant areas, the draft cleaned for saving, who uses a room.
import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.window = globalThis;
globalThis.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = { innerHTML: '', querySelectorAll: () => [], getElementById: () => null };
    return this.shadowRoot;
  }
};
const defined = {};
globalThis.customElements = { get: (t) => defined[t], define: (t, c) => (defined[t] = c) };
globalThis.document = { addEventListener() {}, removeEventListener() {} };

await import('../../custom_components/house_rules/frontend/house-rules-panel.js');

const state = (s, device_class) => ({ state: s, attributes: { friendly_name: s, device_class } });

function panel(rooms = {}) {
  const el = new defined['house-rules-panel']();
  el._hass = {
    locale: { language: 'en' },
    areas: {
      hall: { area_id: 'hall', name: 'Hall' },
      bath: { area_id: 'bath', name: 'Bathroom' },
    },
    devices: { d1: { area_id: 'hall' } },
    entities: {
      'light.hall': { area_id: 'hall' },
      'light.hall_lamp': { device_id: 'd1' },
      'binary_sensor.hall_door': { area_id: 'hall' },
      'binary_sensor.hall_motion': { area_id: 'hall' },
      'binary_sensor.hall_smoke': { area_id: 'hall' },
      'sensor.hall_lux': { area_id: 'hall' },
      'sensor.hall_temperature': { area_id: 'hall' },
      'light.hall_indicator': { area_id: 'hall', entity_category: 'config' },
    },
    states: {
      'light.hall': state('on'),
      'light.hall_lamp': state('off'),
      'binary_sensor.hall_door': state('on', 'door'),
      'binary_sensor.hall_motion': state('off', 'motion'),
      'binary_sensor.hall_smoke': state('off', 'smoke'),
      'sensor.hall_lux': state('12', 'illuminance'),
      'sensor.hall_temperature': state('20', 'temperature'),
      'light.hall_indicator': state('on'),
    },
  };
  el._data = {
    rooms,
    raw: {
      rules: [
        { id: 'p', type: 'presence_light', name: 'Hall presence', room: 'Hall' },
        { id: 'v', type: 'vacuum_guard', name: 'Vacuum guard' },
        { id: 'c', type: 'sensor_chime', name: 'Chime', respect: ['nap'] },
      ],
    },
    conditions: { napping: [] },
  };
  return el;
}

test('a room from its area: lights (device area too), openings, presence, light level; not the rest', () => {
  const room = panel().areaRoom('hall');
  assert.deepEqual(room, {
    area: 'hall',
    lights: ['light.hall', 'light.hall_lamp'],
    opening: ['binary_sensor.hall_door'],
    presence: ['binary_sensor.hall_motion'],
    illuminance: 'sensor.hall_lux',
  });
});

test('discover fills a room of the same name, keeps what it has, and lists the areas without a room', () => {
  const el = panel({ hall: { light: 'light.hall', illuminance: 'sensor.other' } });
  assert.deepEqual(
    el.freeAreas(el.draftRooms()).map((a) => a.name),
    ['Bathroom'],
  );
  assert.equal(el.mergeArea(el._hass.areas.hall), 'hall');
  assert.deepEqual(el._ui.rooms.hall, {
    lights: ['light.hall', 'light.hall_lamp'],
    illuminance: 'sensor.other',
    area: 'hall',
    opening: ['binary_sensor.hall_door'],
    presence: ['binary_sensor.hall_motion'],
  });
});

test('the draft is cleaned for saving: empty pickers, empty lists and empty values go', () => {
  const el = panel();
  el._ui.rooms = { ' Hall ': { lights: ['light.hall', ''], opening: [''], naps: ['', { start: '13:30', end: '15:00' }], area: '' }, '': {} };
  assert.deepEqual(el.cleanRooms(), { Hall: { lights: ['light.hall'], naps: [{ start: '13:30', end: '15:00' }] } });
});

test('a room is used by its presence rule, the vacuum rules when it has what they read, paused by its naps', () => {
  const el = panel();
  const used = el.roomUsers('Hall', { light: 'light.hall', opening: 'binary_sensor.hall_door', naps: ['schedule.nap'] });
  assert.deepEqual(
    used.users.map((r) => r.id),
    ['p', 'v'],
  );
  assert.equal(used.pausing, 1);
  assert.deepEqual(el.roomUsers('Office', {}), { users: [], pausing: 0 });
});

test('lights merge light and lights; editing them writes lights only', () => {
  const el = panel();
  const room = { light: 'light.a', lights: ['light.b'] };
  assert.deepEqual(el.roomValues(room, 'lights'), ['light.a', 'light.b']);
  el.setRoomValues(room, 'lights', ['light.b']);
  assert.deepEqual(room, { lights: ['light.b'] });
  el.setRoomValues(room, 'climate', ['climate.a']);
  assert.equal(room.climate, 'climate.a');
});

test('a folded room section shows the charter chevron: right when folded (down when open)', () => {
  const el = panel({ Hall: { lights: ['light.hall'] } });
  // The cards module shares its helpers with the panel (it is loaded first in Home Assistant).
  window.__houseRulesShared ||= { esc: (t) => String(t ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`) };
  el._ui.secs = new Set(['Hall|lights|folded']);
  const folded = el.roomSection('Hall', { lights: ['light.hall'] }, 0, { key: 'lights', icon: 'mdi:lightbulb', fields: [{ f: 'lights' }] });
  assert.match(folded, /aria-expanded="false"/);
  assert.match(folded, /mdi:chevron-right/);
  assert.doesNotMatch(folded, /mdi:chevron-(up|down)/);
});
