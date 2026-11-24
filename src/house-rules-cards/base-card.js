import { hrLang } from "./core.js";
import { hrEsc, hrSubscribe } from "./subscription.js";
import { hrScene } from "./illustrated-header.js";
import { HR_ANIM_CSS, HR_CSS, HR_TONES_DARK, HR_TONES_LIGHT } from "./styles.js";

export class HouseRulesBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = undefined;
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    // Home Assistant sets hass at every state change anywhere: redraw only when what the card shows depends on it.
    const key = `${hrLang(hass)}|${Boolean(hass?.themes?.darkMode)}`;
    if (first || !this._unsub) this._unsub = hrSubscribe(hass, (data) => this._update(data));
    else if (key !== this._hassKey) this._render();
    this._hassKey = key;
  }

  connectedCallback() {
    if (this._hass && !this._unsub) this._unsub = hrSubscribe(this._hass, (data) => this._update(data));
  }

  disconnectedCallback() {
    this._unsub?.();
    this._unsub = null;
    this._expanded = false;
  }

  _update(data) {
    this._data = data;
    this._render();
  }

  get night() {
    const theme = this._config?.illustration_theme;
    if (theme === 'night') return true;
    if (theme === 'day') return false;
    return Boolean(this._hass?.themes?.darkMode);
  }

  tones() {
    return this.night ? HR_TONES_DARK : HR_TONES_LIGHT;
  }

  vars() {
    const n = this.night;
    const t = this.tones();
    return `--hr-sky:${n ? '#1E2533' : '#EEF2F8'};--hr-ground:${n ? '#4B5563' : '#C9CED6'};--hr-tile:${n ? 'rgba(255,255,255,.05)' : '#F7F8FA'};--hr-red:${t.red[0]};--hr-red-bg:${t.red[1]};`;
  }

  icon(icon, tone, size = 40) {
    const [fg, bg] = this.tones()[tone] || this.tones().grey;
    return `<div class="ico" style="width:${size}px;height:${size}px;background:${bg};color:${fg}"><ha-icon icon="${icon}"></ha-icon></div>`;
  }

  pill(text, tone) {
    const [fg, bg] = this.tones()[tone] || this.tones().grey;
    return `<span class="pill" style="background:${bg};color:${fg}"><span class="dot"></span>${hrEsc(text)}</span>`;
  }

  header(title, sub, status, tone, button) {
    const rules = this._data?.rules || [];
    const iconTone = tone === 'red' ? 'red' : tone === 'amber' ? 'amber' : 'indigo';
    // The mini card's expand button sits in the header's top-right corner (24 px, as on the flight board card).
    return `<div class="hdr${button ? ' has-zoom' : ''}">${hrScene(rules, this.night)}<div class="ground"></div>${button || ''}<div class="hdrc">${this.icon('house-rules:emblem', iconTone)}<div class="grow"><div class="ttl">${hrEsc(title)}</div><div class="sub">${hrEsc(sub)}</div></div><div class="row" style="align-items:center">${this.pill(status, tone)}</div></div></div>`;
  }

  frame(inner) {
    this.shadowRoot.innerHTML = `<style>${HR_CSS}${HR_ANIM_CSS}</style><ha-card style="${this.vars()}">${inner}</ha-card>`;
  }

  call(msg) {
    return this._hass.connection.sendMessagePromise(msg).catch(() => {});
  }

  getCardSize() {
    return 4;
  }
}
