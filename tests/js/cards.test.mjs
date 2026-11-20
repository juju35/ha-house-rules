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
