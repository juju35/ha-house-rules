import { hrCount, hrT } from "./core.js";
import { HR_RING_C, HR_RING_R, hrEsc } from "./subscription.js";
import { hrDuration, hrTickRings } from "./rings.js";
import { HouseRulesBase } from "./base-card.js";

export class HouseRulesTimersCard extends HouseRulesBase {
  static getStubConfig() {
    return {};
  }

  static getConfigForm() {
    return { schema: [{ name: 'title', selector: { text: {} } }] };
  }

  connectedCallback() {
    super.connectedCallback();
    this._tick = setInterval(() => this.tickRings(), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    super.disconnectedCallback();
  }

  ring(timer) {
    const now = Date.now() / 1000;
    const left = Math.max(0, timer.ends - now);
    const pct = Math.max(0, Math.min(1, left / timer.total));
    const [fg] = this.tones().amber;
    return `<div class="ring"><div data-ring-ends="${timer.ends}" data-ring-total="${timer.total}" style="position:relative;width:72px;height:72px"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${HR_RING_R}" fill="none" stroke="var(--divider-color)" stroke-width="6"/><circle class="arc" cx="32" cy="32" r="${HR_RING_R}" fill="none" stroke="${fg}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${HR_RING_C.toFixed(1)}" stroke-dashoffset="${(HR_RING_C * (1 - pct)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg><div class="ringlabel" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${hrDuration(left)}</div></div><div class="tname">${hrEsc(timer.name)}</div><div class="row"><button class="btn" data-extend="${hrEsc(timer.entity_id)}" aria-label="${hrT(this._hass, 'extend')}">+15</button><button class="btn" data-off="${hrEsc(timer.entity_id)}" aria-label="${hrT(this._hass, 'turn_off')}"><ha-icon icon="mdi:power" style="--mdc-icon-size:16px"></ha-icon></button></div></div>`;
  }

  tickRings() {
    hrTickRings(this.shadowRoot);
  }

  _render() {
    if (!this._config || !this._hass) return;
    const title = this._config.title || hrT(this._hass, 'timers_title');
    if (!this._data) return this.frame(this.header(title, this._data === null ? hrT(this._hass, 'not_loaded') : '…', '…', 'grey'));
    const timers = this._data.timers || [];
    const body = timers.length
      ? `<div class="rings">${timers.map((t) => this.ring(t)).join('')}</div>`
      : `<div class="empty">${hrT(this._hass, 'no_timer')}</div>`;
    const n = timers.length;
    this.frame(
      this.header(title, n ? hrCount(this._hass, 'timers', n) : hrT(this._hass, 'no_timer'), String(n), n ? 'amber' : 'grey') +
        `<div class="body">${body}</div>`,
    );
    for (const b of this.shadowRoot.querySelectorAll('[data-extend]'))
      b.addEventListener('click', () => this.call({ type: 'house_rules/timer', entity_id: b.dataset.extend, action: 'extend', minutes: 15 }));
    for (const b of this.shadowRoot.querySelectorAll('[data-off]'))
      b.addEventListener('click', () => this.call({ type: 'house_rules/timer', entity_id: b.dataset.off, action: 'off' }));
  }
}
