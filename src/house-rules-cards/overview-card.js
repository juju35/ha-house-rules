import { HR_ICONS, HR_TONE, HR_TONE_RANK, HR_TYPE_ORDER, hrCount, hrT } from "./core.js";
import { hrEsc } from "./subscription.js";
import { HouseRulesBase } from "./base-card.js";

export class HouseRulesCard extends HouseRulesBase {
  static FULL = true;

  static getStubConfig() {
    return {};
  }

  static getConfigForm() {
    return {
      schema: [
        { name: 'title', selector: { text: {} } },
        {
          name: 'illustration_theme',
          selector: { select: { mode: 'dropdown', options: ['auto', 'day', 'night'] } },
        },
      ],
    };
  }

  get full() {
    return this.constructor.FULL || this._expanded;
  }

  summary() {
    const d = this._data;
    const alerts = d.alerts?.length || 0;
    const timers = d.timers?.length || 0;
    const parts = [];
    if (alerts) parts.push(hrCount(this._hass, 'alerts', alerts));
    if (timers) parts.push(hrCount(this._hass, 'timers', timers));
    if (!parts.length) parts.push(hrCount(this._hass, 'rules', d.rules?.length || 0));
    return {
      sub: parts.join(' · '),
      status: alerts ? hrT(this._hass, 'alerts') : hrT(this._hass, 'all_good'),
      tone: alerts ? 'red' : timers ? 'amber' : 'green',
    };
  }

  tileFor(type, rules) {
    let best = rules[0];
    for (const r of rules) {
      if (HR_TONE_RANK[HR_TONE[r.state] || 'grey'] > HR_TONE_RANK[HR_TONE[best.state] || 'grey']) best = r;
    }
    const tone = HR_TONE[best.state] || 'grey';
    const [fg] = this.tones()[tone];
    let line = hrT(this._hass, `state.${best.state}`);
    if (best.detail) line += ` · ${best.detail}`;
    else if (type === 'auto_off') {
      const timers = (this._data.timers || []).length;
      if (timers) line = hrCount(this._hass, 'timers', timers);
    } else if (rules.length > 1) line += ` · ${hrCount(this._hass, 'rules', rules.length)}`;
    return `<div class="tile"><span class="badge" style="background:${fg}"></span>${this.icon(HR_ICONS[type], tone)}<div class="grow"><div class="tname">${hrEsc(hrT(this._hass, `type.${type}`))}</div><div class="tstate" style="color:${fg}">${hrEsc(line)}</div></div></div>`;
  }

  _render() {
    if (!this._config || !this._hass) return;
    const title = this._config.title || hrT(this._hass, 'title');
    if (this._data === undefined) return this.frame(this.header(title, '…', '…', 'grey'));
    if (this._data === null)
      return this.frame(this.header(title, hrT(this._hass, 'not_loaded'), '!', 'grey'));
    const s = this.summary();
    let button = '';
    if (!this.constructor.FULL) {
      const label = hrT(this._hass, this._expanded ? 'collapse' : 'expand');
      button = `<button class="zoom${this.night ? ' on-night' : ''}" id="toggle" aria-label="${label}" title="${label}" aria-expanded="${Boolean(this._expanded)}"><ha-icon icon="${this._expanded ? 'mdi:arrow-collapse' : 'mdi:arrow-expand'}"></ha-icon></button>`;
    }
    let body = '';
    if (this.full) {
      const byType = {};
      const allowed = this._config.types;
      for (const r of this._data.rules || []) {
        if (allowed && !allowed.includes(r.type)) continue;
        (byType[r.type] ||= []).push(r);
      }
      const banners = (this._data.alerts || [])
        .map(
          (a) =>
            `<div class="banner">${this.icon(HR_ICONS[a.type] || 'mdi:alarm-light-outline', 'red')}<div class="grow"><div class="tname">${hrEsc(a.name)}</div><div class="tstate" style="color:var(--hr-red)">${hrEsc(a.detail || hrT(this._hass, 'state.alert'))}</div></div><button class="btn red" data-ack="${hrEsc(a.id)}">${hrT(this._hass, 'acknowledge')}</button></div>`,
        )
        .join('');
      const tiles = HR_TYPE_ORDER.filter((t) => byType[t])
        .map((t) => this.tileFor(t, byType[t]))
        .join('');
      body = `<div class="body"><div class="grid">${banners}${tiles}</div></div>`;
    }
    this.frame(this.header(title, s.sub, s.status, s.tone, button) + body);
    this.shadowRoot.getElementById('toggle')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this._expanded = !this._expanded;
      this._render();
    });
    for (const b of this.shadowRoot.querySelectorAll('[data-ack]')) {
      b.addEventListener('click', () => this.call({ type: 'house_rules/action', rule: b.dataset.ack, action: 'acknowledge' }));
    }
  }

  getCardSize() {
    return this.full ? 5 : 2;
  }
}

export class HouseRulesMiniCard extends HouseRulesCard {
  static FULL = false;

  connectedCallback() {
    super.connectedCallback();
    this._outside = (ev) => {
      if (this._expanded && !ev.composedPath().includes(this)) {
        this._expanded = false;
        this._render();
      }
    };
    document.addEventListener('click', this._outside, true);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._outside, true);
    super.disconnectedCallback();
  }
}
