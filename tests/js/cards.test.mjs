// The cards module in Node: shared helpers, scene, strings, and redraws only when needed.
import assert from 'node:assert/strict';
import { test } from 'node:test';

class FakeShadow {
  constructor() {
    this.innerHTML = '';
    this.renders = 0;
  }
  querySelectorAll() {
    return [];
  }
  getElementById() {
    return null;
  }
}
globalThis.window = globalThis;
globalThis.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = new FakeShadow();
    return this.shadowRoot;
  }
};
const defined = {};
globalThis.customElements = { get: (t) => defined[t], define: (t, c) => (defined[t] = c) };
globalThis.document = { addEventListener() {}, removeEventListener() {} };
console.info = () => {};

await import('../../custom_components/house_rules/frontend/house-rules-cards.js');
const S = window.__houseRulesShared;

test('the four cards are defined and listed', () => {
  for (const tag of ['house-rules-card', 'house-rules-mini-card', 'house-rules-timers-card', 'house-rules-activity-card']) {
    assert.ok(defined[tag], tag);
    assert.ok(window.customCards.some((c) => c.type === tag), tag);
  }
});

test('duration and escaping', () => {
  assert.equal(S.duration(134), '2:14');
  assert.equal(S.duration(47 * 60), '47 min');
  assert.equal(S.duration(5400), '1 h 30');
  assert.equal(S.esc('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
});

test('every language has the English keys', () => {
  const en = Object.keys(S.strings.en).sort();
  for (const [lang, table] of Object.entries(S.strings)) assert.deepEqual(Object.keys(table).sort(), en, lang);
});

test('the scene draws one object per configured family, coloured by the worst state', () => {
  const svg = S.scene(
    [
      { type: 'keep_on', state: 'armed' },
      { type: 'auto_off', state: 'active' },
      { type: 'leak_guard', state: 'alert' },
    ],
    false,
  );
  assert.equal((svg.match(/<g transform/g) || []).length, 2); // plug + drop
  assert.ok(svg.includes('#F59E0B')); // plug: amber (a timer runs)
  assert.ok(svg.includes('hr-blink')); // drop: alert blinks
});

test('the scene shows at most four families, the most urgent first, in their usual order', () => {
  const svg = S.scene(
    [
      { type: 'keep_on', state: 'armed' },
      { type: 'presence_light', state: 'idle' },
      { type: 'vacuum_follow', state: 'active' },
      { type: 'lock_guard', state: 'armed' },
      { type: 'sensor_chime', state: 'armed' },
      { type: 'cycle_done', state: 'waiting' },
      { type: 'leak_guard', state: 'alert' },
    ],
    false,
  );
  assert.equal((svg.match(/<g transform/g) || []).length, 4);
  // drop (red), robot (amber), appliance (blue), then the first green family in the usual order: the plug
  assert.ok(svg.includes('hr-blink'));
  assert.ok(svg.includes('hr-roll'));
  assert.ok(svg.indexOf('<rect x="0" y="50" width="26"') < svg.indexOf('hr-roll')); // plug drawn before the robot
  assert.ok(!svg.includes('M5,58 v-6')); // no lock
  assert.ok(!svg.includes('M2,72 a10,10')); // no bell
  assert.ok(!svg.includes('M2,48 h24')); // no lamp
});

test('a card redraws on its data, theme or language — not at every hass update', () => {
  const card = new defined['house-rules-card']();
  card.setConfig({});
  const conn = { subscribeMessage: () => Promise.resolve(() => {}) };
  let renders = 0;
  const original = card._render.bind(card);
  card._render = () => {
    renders += 1;
    original();
  };
  const hass = { connection: conn, locale: { language: 'en' }, themes: { darkMode: false }, states: {} };
  card.hass = hass;
  const after = renders;
  card.hass = { ...hass, states: { 'light.x': {} } };
  card.hass = { ...hass, states: { 'light.y': {} } };
  assert.equal(renders, after);
  card.hass = { ...hass, themes: { darkMode: true } };
  assert.equal(renders, after + 1);
});

test('a translation falls back to English, then to its key', () => {
  assert.equal(S.t({ locale: { language: 'fr-FR' } }, 'acknowledge'), 'Acquitter');
  assert.equal(S.t({ locale: { language: 'xx' } }, 'acknowledge'), 'Acknowledge');
  assert.equal(S.t({}, 'missing.key'), 'missing.key');
});

test('the mini card expand button is the 24 px corner button, out of the pill row', () => {
  const card = new defined['house-rules-mini-card']();
  card.setConfig({});
  card._hass = { locale: { language: 'en' }, themes: { darkMode: false }, states: {} };
  card._data = { rules: [], alerts: [], timers: [] };
  card._render();
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<div class="hdr has-zoom">/);
  assert.match(html, /<button class="zoom" id="toggle"[^>]*aria-expanded="false"><ha-icon icon="mdi:arrow-expand">/);
  assert.ok(!html.split('<div class="hdrc">')[1].includes('id="toggle"'));
  card._expanded = true;
  card._hass = { ...card._hass, themes: { darkMode: true } };
  card._render();
  assert.match(card.shadowRoot.innerHTML, /<button class="zoom on-night" id="toggle"[^>]*aria-expanded="true"><ha-icon icon="mdi:arrow-collapse">/);
  const full = new defined['house-rules-card']();
  full.setConfig({});
  full._hass = card._hass;
  full._data = card._data;
  full._render();
  assert.ok(!full.shadowRoot.innerHTML.includes('id="toggle"'));
  assert.ok(full.shadowRoot.innerHTML.includes('<div class="hdr">'));
});
