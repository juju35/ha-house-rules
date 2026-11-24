import { HR_FILTERS, HR_ICONS, hrT } from "./core.js";
import { hrEsc } from "./subscription.js";
import { hrTime } from "./rings.js";
import { HouseRulesBase } from "./base-card.js";

export const HR_RESULT_TONE = { ok: 'green', skipped: 'grey', active: 'red', failed: 'red' };

export class HouseRulesActivityCard extends HouseRulesBase {
  static getStubConfig() {
    return { limit: 8 };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: 'title', selector: { text: {} } },
        { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
      ],
    };
  }

  _render() {
    if (!this._config || !this._hass) return;
    const title = this._config.title || hrT(this._hass, 'activity_title');
    if (!this._data) return this.frame(this.header(title, this._data === null ? hrT(this._hass, 'not_loaded') : '…', '…', 'grey'));
    const filter = this._filter || 'all';
    const types = HR_FILTERS[filter];
    let items = [...(this._data.journal || [])].reverse();
    if (filter === 'failures') items = items.filter((e) => e.result === 'failed');
    else if (types) items = items.filter((e) => types.includes(e.type));
    items = items.slice(0, this._config.limit || 8);
    const today = new Date().toDateString();
    const count = (this._data.journal || []).filter((e) => new Date(e.ts * 1000).toDateString() === today).length;
    const chips = ['all', 'alerts', 'plugs', 'vacuum', 'failures']
      .map((f) => `<button class="chip ${f === filter ? 'on' : ''}" data-filter="${f}">${hrT(this._hass, f)}</button>`)
      .join('');
    const rows = items.length
      ? items
          .map((e) => {
            const tone = HR_RESULT_TONE[e.result] || 'grey';
            return `<li>${this.icon(HR_ICONS[e.type] || 'mdi:information-outline', tone, 32)}<div class="grow"><div class="tname" style="font-size:13px">${hrEsc(e.name || e.rule || '')}</div><div class="sub" style="font-size:12px">${hrEsc(e.detail)}</div></div><span class="sub" style="font-size:12px">${hrTime(this._hass, e.ts)}</span></li>`;
          })
          .join('')
      : `<li class="empty">${hrT(this._hass, 'no_activity')}</li>`;
    const failed = (this._data.journal || []).some((e) => e.result === 'failed');
    this.frame(
      this.header(title, `${count}`, failed ? hrT(this._hass, 'failures') : 'OK', failed ? 'red' : 'green') +
        `<div class="body" style="padding-top:12px"><div class="chips" role="group">${chips}</div><ul>${rows}</ul></div>`,
    );
    for (const b of this.shadowRoot.querySelectorAll('[data-filter]'))
      b.addEventListener('click', () => {
        this._filter = b.dataset.filter;
        this._render();
      });
  }

  getCardSize() {
    return 5;
  }
}
