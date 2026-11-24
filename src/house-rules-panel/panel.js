import { HRP_ROOM_FILTERS, HRP_ROOM_LABELS, HRP_ROOM_LISTS, HRP_ROOM_SECTIONS, HRP_WEEKDAYS } from "./constants.js";
import { HRP_RESULT_TONE, HRP_TEMPLATES, HRP_TYPES, hrpEsc, hrs } from "./helpers.js";
import { houseRulesPanelFold } from "./fold.js";
import { HRP_CSS } from "./styles.js";
import { HRP_STRINGS } from "./i18n/strings.js";

export class HouseRulesPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = undefined;
    this._ui = { tab: 'activity', filter: null, editing: null, search: '', jfilter: 'all', rooms: null, settings: null, open: new Set(), secs: new Set() };
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._subscribe();
  }

  set route(route) {
    const tab = (route?.path || '').replace(/^\//, '').split('/')[0];
    if (tab && this.t('tabs')[tab] && tab !== this._ui.tab) {
      this._ui.tab = tab;
      this._render();
    }
  }

  // Home Assistant's narrow layout (sidebar hidden): the menu button opens it.
  set narrow(value) {
    if (Boolean(value) === this._narrow) return;
    this._narrow = Boolean(value);
    this.shadowRoot?.querySelector('.page')?.classList.toggle('narrow', this._narrow);
  }
  set panel(_v) {}

  connectedCallback() {
    if (this._hass && !this._unsub) this._subscribe();
    this._tick ||= setInterval(() => this.tickRings(), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    this._tick = null;
    this._unsub?.then((u) => u()).catch(() => {});
    this._unsub = null;
    this._fold?.detach();
    this._fold = null;
  }

  /** The top bar folds on scroll into one bar with the tabs as icon pills (see houseRulesPanelFold). */
  _attachFold(folded = false) {
    this._fold?.detach();
    this._fold = houseRulesPanelFold(this, {
      top: '.hdr',
      tabs: '.tabs',
      tab: '.tab',
      key: (b) => b.dataset.tab,
      icons: {
        activity: 'mdi:pulse',
        rules: 'mdi:format-list-checks',
        rooms: 'mdi:floor-plan',
        journal: 'mdi:history',
        yaml: 'mdi:code-tags',
        settings: 'mdi:cog',
      },
      badge: '.cnt',
      name: '.hdr .ttl',
      sub: '.hdr .sub',
      icon: '.hdr .ico',
      status: '.hdr .pill',
      acts: '.hdr .row .rbtn',
      accent: '#4f46e5',
      folded,
      menu: () => ({ hass: this._hass, narrow: this._narrow, show: Boolean(this._narrow) }),
    });
  }

  _subscribe() {
    if (!window.__houseRulesShared) {
      const url = new URL(`./house-rules-cards.js${new URL(import.meta.url).search}`, import.meta.url).href;
      import(url).then(() => this._render());
    }
    this._unsub = this._hass.connection.subscribeMessage(
      (data) => {
        const before = this._data?.source?.modified;
        this._data = data;
        const y = this._ui.yaml;
        if (y && data?.source?.modified !== before && y.text === y.original) this._ui.yaml = null;
        // Not under an entity picker being used (a redraw would close it): drawn once it is left.
        if (this.shadowRoot.activeElement?.closest?.('.picker')) {
          this._ui.later = true;
          return;
        }
        this._render();
      },
      { type: 'house_rules/subscribe' },
    );
    this._unsub.catch(() => {
      this._data = null;
      this._render();
    });
  }

  // ---------- helpers ----------
  t(key, vars = {}) {
    const lang = this._hass?.locale?.language || 'en';
    const table = HRP_STRINGS[lang] || HRP_STRINGS[lang.split('-')[0]] || HRP_STRINGS.en;
    let text = table[key] ?? HRP_STRINGS.en[key];
    if (text === undefined) text = hrs() ? hrs().t(this._hass, key) : key;
    if (typeof text === 'string') for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
    return text;
  }

  count(key, n, none) {
    if (!n && none) return this.t(none);
    return this.t(n === 1 ? `${key}_one` : `${key}_other`, { n });
  }

  get dark() {
    return Boolean(this._hass?.themes?.darkMode);
  }

  tone(name) {
    const set = hrs().tones[this.dark ? 'dark' : 'light'];
    return set[name] || set.grey;
  }

  icon(icon, tone, size = 40) {
    const [fg, bg] = this.tone(tone);
    return `<div class="ico" style="width:${size}px;height:${size}px;background:${bg};color:${fg}"><ha-icon icon="${icon}"></ha-icon></div>`;
  }

  // Unsaved changes: a bar of its own under the tab, sticky at the bottom so it stays in reach (as on System Hub).
  saveBar(reset, save, resetLabel = this.t('cancel')) {
    return `<div class="savebar" role="region" aria-label="${hrpEsc(this.t('unsaved'))}"><span class="grow">${hrpEsc(this.t('unsaved'))}</span><button class="btn" data-action="${reset}">${hrpEsc(resetLabel)}</button><button class="btn primary" data-action="${save}">${hrpEsc(this.t('save'))}</button></div>`;
  }

  pill(text, tone) {
    const [fg, bg] = this.tone(tone);
    return `<span class="pill" style="background:${bg};color:${fg}"><span class="dot"></span>${hrpEsc(text)}</span>`;
  }

  time(ts) {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleTimeString(this._hass?.locale?.language || undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  dur(seconds) {
    return hrs().duration(seconds);
  }

  ws(msg) {
    return this._hass.connection.sendMessagePromise(msg);
  }

  toast(message) {
    this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true }));
  }

  go(tab) {
    this._ui.tab = tab;
    this._ui.editing = null;
    this._ui.search = '';
    history.replaceState(null, '', `/house-rules/${tab}`);
    this._render();
  }

  // ---------- render ----------
  _render() {
    if (!this._hass || !hrs()) return;
    const focus = this.shadowRoot.activeElement;
    const keep = focus?.id ? { id: focus.id, start: focus.selectionStart, end: focus.selectionEnd } : null;
    const d = this._data;
    let content;
    if (d === undefined) content = '<div class="empty">…</div>';
    else if (d === null) content = '<div class="empty">House Rules is not loaded.</div>';
    else content = this[`tab_${this._ui.tab}`]();
    const folded = this.hasAttribute('pf-folded');
    this.shadowRoot.innerHTML = `<style>${HRP_CSS}${hrs().animCss}</style><div class="page${this._narrow ? ' narrow' : ''}" style="${this.vars()}">${this.top()}<main>${content}</main>${this.dialog()}</div>`;
    this.bind();
    this._attachFold(folded);
    if (this._ui.tab === 'rooms' && d) this.mountPickers();
    if (keep) {
      const el = this.shadowRoot.getElementById(keep.id);
      if (el) {
        el.focus();
        if (el.setSelectionRange && keep.start != null) el.setSelectionRange(keep.start, keep.end);
      }
    }
  }

  vars() {
    const n = this.dark;
    return `--hr-sky:${n ? '#1E2533' : '#EEF2F8'};--hr-ground:${n ? '#4B5563' : '#C9CED6'};--hr-tile:${n ? 'rgba(255,255,255,.05)' : '#F7F8FA'};--hr-red:${this.tone('red')[0]};--hr-red-bg:${this.tone('red')[1]};`;
  }

  top() {
    const d = this._data || {};
    const alerts = d.alerts?.length || 0;
    const timers = d.timers?.length || 0;
    const sub = this.t('subtitle', {
      rules: d.rules?.length || 0,
      alerts: this.count('alerts', alerts, 'no_alert'),
      timers: this.count('timers', timers, 'no_timer'),
    });
    const status = alerts ? this.pill(this.count('alerts', alerts), 'red') : this.pill(this.t('all_good'), 'green');
    const tabs = Object.entries(this.t('tabs'))
      .map(
        ([k, label]) =>
          `<button class="tab ${k === this._ui.tab ? 'on' : ''}" data-tab="${k}" role="tab" aria-selected="${k === this._ui.tab}">${hrpEsc(label)}</button>`,
      )
      .join('');
    const scene = hrs().scene(d.rules || [], this.dark);
    return `<header class="hdr">${scene}<div class="ground"></div><div class="hdrc"><button class="rbtn menu" data-action="menu" aria-label="Menu"><ha-icon icon="mdi:menu"></ha-icon></button>${this.icon('house-rules:emblem', alerts ? 'red' : 'indigo')}<div class="grow"><div class="ttl" style="font-size:20px;line-height:24px">House Rules</div><div class="sub">${hrpEsc(sub)}</div></div><div class="row">${status}<button class="rbtn" data-action="reload" aria-label="${this.t('reload')}" title="${this.t('reload')}"><ha-icon icon="mdi:refresh"></ha-icon></button><button class="rbtn" data-action="new" aria-label="${this.t('new_rule')}" title="${this.t('new_rule')}"><ha-icon icon="mdi:plus"></ha-icon></button></div></div></header><nav class="tabs" role="tablist">${tabs}</nav>`;
  }

  tile(icon, tone, name, state, extra = '') {
    const [fg] = this.tone(tone);
    return `<div class="tile"><span class="badge" style="background:${fg}"></span>${this.icon(icon, tone)}<div class="grow"><div class="tname">${hrpEsc(name)}</div><div class="tstate" style="color:${fg}">${hrpEsc(state)}</div>${extra}</div></div>`;
  }

  ruleLine(r) {
    let text = this.t(`state.${r.state}`);
    if (r.blocked) text = this.t(`blocked.${r.blocked}`);
    if (r.detail) text += ` · ${r.detail}`;
    return text;
  }

  ring(timer, size = 64) {
    const left = Math.max(0, timer.ends - Date.now() / 1000);
    const pct = Math.max(0, Math.min(1, left / timer.total));
    const { r, c } = hrs().ring;
    return `<div data-ring-ends="${timer.ends}" data-ring-total="${timer.total}" style="position:relative;width:${size}px;height:${size}px;flex:none"><svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--divider-color)" stroke-width="6"/><circle class="arc" cx="32" cy="32" r="${r}" fill="none" stroke="${this.tone('amber')[0]}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg><div class="ringlabel">${this.dur(left)}</div></div>`;
  }

  tickRings() {
    hrs()?.tickRings?.(this.shadowRoot);
  }

  journalRow(e, wide = false) {
    const tone = HRP_RESULT_TONE[e.result] || 'grey';
    const icon = hrs().icons[e.type] || 'mdi:information-outline';
    if (!wide)
      return `<li><span class="when">${this.time(e.ts)}</span>${this.icon(icon, tone, 32)}<div class="grow"><div class="lname">${hrpEsc(e.name || e.rule || '')}</div><div class="sub small">${hrpEsc(e.detail)}</div></div></li>`;
    return `<tr><td class="when">${this.time(e.ts)}</td><td><div class="row">${this.icon(icon, tone, 32)}<div><div class="lname">${hrpEsc(e.name || e.rule || '')}</div><div class="sub small">${hrpEsc(this.t(`type.${e.type}`))} · ${hrpEsc(e.action)}</div></div></div></td><td class="sub small">${hrpEsc(e.detail)}</td><td>${this.pill(this.t(`result.${e.result}`), tone)}</td></tr>`;
  }

  // ---------- tab: activity ----------
  tab_activity() {
    const d = this._data;
    const alerts = (d.alerts || [])
      .map(
        (a) =>
          `<div class="banner">${this.icon(hrs().icons[a.type] || 'mdi:alarm-light-outline', 'red')}<div class="grow"><div class="tname wrap">${hrpEsc(a.name)}</div><div class="sub">${hrpEsc(a.detail || '')}${a.attributes?.levels ? ` · ${a.attributes.level}/${a.attributes.levels}` : ''}</div></div><div class="row"><button class="btn" data-snooze="${hrpEsc(a.id)}">${this.t('snooze15')}</button><button class="btn red" data-ack="${hrpEsc(a.id)}">${this.t('acknowledge')}</button></div></div>`,
      )
      .join('');
    const timers = (d.timers || [])
      .map(
        (t) =>
          `<div class="tile" style="gap:14px">${this.ring(t)}<div class="grow"><div class="tname">${hrpEsc(t.name)}</div><div class="sub small">${hrpEsc(t.entity_id)}</div><div class="row" style="margin-top:8px"><button class="btn sm" data-extend="${hrpEsc(t.entity_id)}">${this.t('extend')}</button><button class="btn sm" data-off="${hrpEsc(t.entity_id)}">${this.t('turn_off')}</button></div></div></div>`,
      )
      .join('');
    const lit = (d.presence || [])
      .map((p) => {
        const lead = p.ends ? this.ring(p) : this.icon('mdi:motion-sensor', 'blue', 64);
        const state = p.ends ? '' : `<div style="margin-top:4px">${this.pill(this.t('rm_someone'), 'blue')}</div>`;
        const extend = p.ends ? `<button class="btn sm" data-presence-extend="${hrpEsc(p.rule)}">${this.t('extend')}</button>` : '';
        return `<div class="tile" style="gap:14px">${lead}<div class="grow"><div class="tname">${hrpEsc(p.room)}</div><div class="sub small">${hrpEsc((p.names || []).join(', '))}</div>${state}<div class="row" style="margin-top:8px">${extend}<button class="btn sm" data-presence-off="${hrpEsc(p.rule)}">${this.t('turn_off')}</button></div></div></div>`;
      })
      .join('');
    const watch = (d.rules || [])
      .filter((r) => r.state !== 'alert')
      .map((r) => this.tile(hrs().icons[r.type], hrs().tone[r.state] || 'grey', r.name, this.ruleLine(r)))
      .join('');
    const latest = [...(d.journal || [])]
      .reverse()
      .slice(0, 8)
      .map((e) => this.journalRow(e))
      .join('');
    return `<div class="cols"><div class="main">${alerts ? `<section><h2>${this.t('in_progress')}</h2>${alerts}</section>` : ''}${timers ? `<section><h2>${this.t('timers')} · ${(d.timers || []).length}</h2><div class="tiles">${timers}</div></section>` : ''}${lit ? `<section><h2>${this.t('presence_lights')} · ${(d.presence || []).length}</h2><div class="tiles">${lit}</div></section>` : ''}<section><h2>${this.t('watch')}</h2><div class="tiles">${watch}</div></section></div><aside class="card side"><h2>${this.t('latest')}</h2><ul>${latest}</ul><button class="link" data-tab="journal">${this.t('see_journal')}</button></aside></div>`;
  }

  // ---------- tab: rules ----------
  tab_rules() {
    const d = this._data;
    const src = d.source || {};
    let banner = '';
    if (src.error) {
      const where = `${(src.error.file || '').split('/').pop()}${src.error.line ? `:${src.error.line}` : ''}`;
      banner = `<div class="note red">${hrpEsc(this.t('yaml_invalid', { where, error: src.error.message }))}</div>`;
    } else if (src.last_reload && Date.now() / 1000 - src.last_reload.ts < 300 && src.last_reload.rules?.length) {
      banner = `<div class="note"><ha-icon icon="mdi:refresh"></ha-icon><b>${hrpEsc(this.t('reloaded', { file: 'house_rules.yaml', time: this.time(src.last_reload.ts), n: src.last_reload.rules.length }))}</b> · ${hrpEsc(src.last_reload.rules.join(', '))}</div>`;
    }
    const used = HRP_TYPES.filter((t) => (d.rules || []).some((r) => r.type === t));
    const chips = [
      `<button class="chip ${!this._ui.filter ? 'on' : ''}" data-filter="">${this.t('all')} · ${(d.rules || []).length}</button>`,
      ...used.map(
        (t) =>
          `<button class="chip ${this._ui.filter === t ? 'on' : ''}" data-filter="${t}">${hrpEsc(this.t(`type.${t}`))} · ${(d.rules || []).filter((r) => r.type === t).length}</button>`,
      ),
    ].join('');
    const groups = used
      .filter((t) => !this._ui.filter || this._ui.filter === t)
      .map((t) => {
        const rows = (d.rules || [])
          .filter((r) => r.type === t)
          .map((r) => {
            const tone = hrs().tone[r.state] || 'grey';
            const sel = this._ui.editing?.previous_id === r.id;
            return `<div class="rrow ${sel ? 'sel' : ''}">${this.icon(hrs().icons[r.type], tone)}<div class="grow"><div class="tname">${hrpEsc(r.name)}</div><div class="tstate" style="color:${this.tone(tone)[0]}">${hrpEsc(this.ruleLine(r))}</div><div class="sub small">${hrpEsc(r.id)}</div></div><div class="acts"><button class="btn sm" data-test="${hrpEsc(r.id)}"><ha-icon icon="mdi:play" style="--mdc-icon-size:14px"></ha-icon>${this.t('test')}</button>${r.state === 'snoozed' ? `<button class="btn sm" data-unsnooze="${hrpEsc(r.id)}">${this.t('resume')}</button>` : ''}<label class="sw"><input type="checkbox" data-enable="${hrpEsc(r.id)}" ${r.state !== 'disabled' ? 'checked' : ''} aria-label="${hrpEsc(r.name)}"><span></span></label><button class="btn sm" data-edit="${hrpEsc(r.id)}">${this.t('edit')}</button></div></div>`;
          })
          .join('');
        return `<section><h2>${hrpEsc(this.t(`type.${t}`))}</h2>${rows}</section>`;
      })
      .join('');
    const errors = Object.entries(d.errors || {})
      .map(([k, v]) => `<div class="note red"><b>${hrpEsc(k)}</b> · ${hrpEsc(v)}</div>`)
      .join('');
    return `<div class="stack">${banner}${errors}<div class="chips">${chips}</div><div class="cols"><div class="main">${groups || `<div class="empty">${this.t('new_rule')} +</div>`}</div>${this.editor()}</div></div>`;
  }

  editor() {
    const e = this._ui.editing;
    if (!e) return '';
    const types = HRP_TYPES.map((t) => `<option value="${t}">${hrpEsc(this.t(`type.${t}`))}</option>`).join('');
    const locked = this._data?.source?.error;
    return `<aside class="card side editor"><div class="row"><div class="grow"><div class="ttl">${hrpEsc(e.previous_id || this.t('new_rule'))}</div><div class="sub">${this.t('rule_yaml')}</div></div><button class="rbtn" data-action="close" aria-label="${this.t('close')}"><ha-icon icon="mdi:close"></ha-icon></button></div>${!e.previous_id ? `<label class="field"><span>Type</span><select id="hrp-type">${types}</select></label>` : ''}<label class="field"><span>YAML</span><textarea id="hrp-yaml" spellcheck="false" ${locked ? 'disabled' : ''}>${hrpEsc(e.text)}</textarea></label>${e.error ? `<div class="note red">${hrpEsc(e.error)}</div>` : ''}<div class="row end">${e.previous_id ? `<button class="btn red" data-action="delete">${this.t('delete')}</button>` : ''}<button class="btn" data-action="close">${this.t('cancel')}</button><button class="btn primary" data-action="save" ${locked ? 'disabled' : ''}>${this.t('save')}</button></div></aside>`;
  }

  // ---------- tab: rooms ----------
  // As on Smart Comfort's Rooms tab: a folding card per room, its sections (filled ones shown, empty ones offered as
  // "+" chips), Home Assistant entity pickers, the room's live state in its header and the rules that use it.
  tab_rooms() {
    const rooms = this.draftRooms();
    const entries = Object.entries(rooms);
    this._ui.open ||= new Set();
    this._ui.secs ||= new Set();
    const unavailable = entries.reduce((n, [, room]) => n + this.roomUnavailable(room).length, 0);
    const head = `<section class="card pad stack"><div class="row wrap">${this.icon('mdi:floor-plan', 'amber')}<div class="grow" style="flex-basis:220px"><div class="row wrap"><div class="ttl">${this.t('tabs').rooms}</div>${unavailable ? this.pill(this.count('rm_unavailable', unavailable), 'amber') : ''}</div><div class="sub small">${this.t('rooms_help')}</div></div>${this._ui.open.size ? `<button class="btn" data-action="rooms-collapse">${this.t('rm_collapse')}</button>` : ''}<button class="btn primary" data-action="rooms-discover">${this.t('rm_discover')}</button></div><p class="sub small" style="margin:0">${this.t('rm_discover_help')}</p></section>`;
    const cards = entries.map(([name, room], i) => this.roomCard(name, room, i, entries.length)).join('');
    const free = this.freeAreas(rooms);
    const foot = `<section class="card pad row wrap freeareas"><span class="grow sub">${free.length ? this.t('rm_areas_unused') : ''}</span>${free.map((a) => `<button class="chip" data-add-area="${hrpEsc(a.area_id)}">+ ${hrpEsc(a.name)}</button>`).join('')}<button class="chip dashed" data-action="add-room">+ ${this.t('rm_other_room')}</button></section>`;
    const dirty = JSON.stringify(this.cleanRooms()) !== JSON.stringify(this._data.rooms || {});
    return `<div class="stack">${head}${cards}${foot}${dirty ? this.saveBar('reset-rooms', 'save-rooms') : ''}</div>`;
  }

  draftRooms() {
    this._ui.rooms ||= JSON.parse(JSON.stringify(this._data.rooms || {}));
    return this._ui.rooms;
  }

  // The values of a field of a room as a list ("lights" merges `light` and `lights`).
  roomValues(room, f) {
    if (f === 'lights') return [room.light, ...[].concat(room.lights || [])].filter((v) => v != null);
    return [].concat(room[f] ?? []);
  }

  setRoomValues(room, f, values) {
    if (f === 'lights') delete room.light;
    const list = HRP_ROOM_LISTS.includes(f);
    if (!values.length) delete room[f];
    else room[f] = list ? values : values[0];
  }

  roomEntities(room) {
    const ids = [...this.roomValues(room, 'lights'), ...this.roomValues(room, 'opening'), ...this.roomValues(room, 'presence')];
    for (const f of ['illuminance', 'climate']) if (room[f]) ids.push(room[f]);
    for (const nap of room.naps || []) if (typeof nap === 'string') ids.push(nap);
    return ids.filter(Boolean);
  }

  roomUnavailable(room) {
    return this.roomEntities(room).filter((e) => ['unavailable', 'unknown', undefined].includes(this._hass.states[e]?.state));
  }

  // The rules that use a room: its presence_light rules, the vacuum rules when it has what they read.
  roomUsers(name, room) {
    const rules = this._data.raw?.rules || [];
    const lights = this.roomValues(room, 'lights').length;
    const openings = this.roomValues(room, 'opening').length;
    const users = rules.filter(
      (r) => (r.type === 'presence_light' && r.room === name) || (r.type === 'vacuum_follow' && lights) || (r.type === 'vacuum_guard' && openings),
    );
    const pausing = (room.naps || []).length ? rules.filter((r) => [].concat(r.respect || []).includes('nap')).length : 0;
    return { users, pausing };
  }

  roomBadges(name, room) {
    const st = (e) => this._hass.states[e];
    const out = [];
    if (this.roomValues(room, 'presence').some((e) => st(e)?.state === 'on')) out.push(this.pill(this.t('rm_someone'), 'blue'));
    if ((this._data.conditions?.napping || []).includes(name)) out.push(this.pill(this.t('rm_napping'), 'amber'));
    const open = this.roomValues(room, 'opening').find((e) => st(e)?.state === 'on');
    if (open) out.push(this.pill(this.t('rm_open', { name: this.friendly(open) }), 'red'));
    const missing = this.roomUnavailable(room).length;
    if (missing) out.push(this.pill(this.count('rm_unavailable', missing), 'amber'));
    return out.join('');
  }

  friendly(entity) {
    return this._hass.states[entity]?.attributes?.friendly_name || entity;
  }

  roomCard(name, room, i, total) {
    const open = this._ui.open.has(name);
    const area = this._hass.areas?.[room.area] || Object.values(this._hass.areas || {}).find((a) => a.name.toLowerCase() === name.toLowerCase());
    const { users, pausing } = this.roomUsers(name, room);
    const icons = HRP_ROOM_SECTIONS.filter((s) => this.sectionFilled(room, s))
      .map((s) => {
        const n = s.fields ? s.fields.reduce((k, f) => k + this.roomValues(room, f.f).filter(Boolean).length, 0) : (room.naps || []).length;
        return `<span class="ricon" title="${hrpEsc(this.t(`rm_${s.key}`))}"><ha-icon icon="${s.icon}"></ha-icon>${n > 1 ? n : ''}</span>`;
      })
      .join('');
    const count = users.length ? this.count('rm_rules', users.length) : '';
    const pause = pausing ? this.count('rm_pausing', pausing) : '';
    const meta = [count, pause].filter(Boolean).join(' · ');
    const header = `<div class="rhead"><button class="rbtn plain" data-toggle-room="${i}" aria-expanded="${open}" aria-label="${hrpEsc(this.t('rm_toggle', { name }))}"><ha-icon icon="mdi:chevron-${open ? 'down' : 'right'}"></ha-icon></button><ha-icon class="rarea" icon="${hrpEsc(area?.icon || 'mdi:floor-plan')}"></ha-icon><span class="rname">${hrpEsc(name)}</span><span class="rmeta">${this.roomBadges(name, room)}${open ? '' : `<span class="ricons">${icons}</span>`}<span class="sub small">${hrpEsc(meta)}</span></span><span class="racts"><button class="rbtn plain" data-move-room="${i}|-1" ${i ? '' : 'disabled'} aria-label="${this.t('rm_up')}"><ha-icon icon="mdi:arrow-up"></ha-icon></button><button class="rbtn plain" data-move-room="${i}|1" ${i < total - 1 ? '' : 'disabled'} aria-label="${this.t('rm_down')}"><ha-icon icon="mdi:arrow-down"></ha-icon></button><button class="rbtn plain" data-remove-room="${i}" aria-label="${this.t('remove')}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></span></div>`;
    if (!open) return `<section class="card room">${header}</section>`;
    const areas = Object.values(this._hass.areas || {}).sort((a, b) => a.name.localeCompare(b.name));
    const used = users.length
      ? this.t('rm_used_by', { rules: users.map((r) => `<button class="link" data-edit="${hrpEsc(r.id)}">${hrpEsc(r.name || r.id)}</button>`).join(', ') })
      : this.t('rm_unused');
    const fields = `<div class="row wrap rfields"><label class="ffield grow"><span>${this.t('rm_name')}</span><input id="room-${i}-name" data-room-name="${i}" value="${hrpEsc(name)}"></label><label class="ffield grow"><span>${this.t('rm_area')}</span><select id="room-${i}-area" data-room-area="${i}"><option value="">${this.t('rm_area_none')}</option>${areas.map((a) => `<option value="${hrpEsc(a.area_id)}" ${a.area_id === (room.area || area?.area_id) ? 'selected' : ''}>${hrpEsc(a.name)}</option>`).join('')}</select></label></div><p class="sub small rhelp">${this.t('rm_name_help')} ${used}${pausing ? ` · ${hrpEsc(pause)}` : ''}</p>`;
    const shown = HRP_ROOM_SECTIONS.filter((s) => this.sectionFilled(room, s) || this._ui.secs.has(`${name}|${s.key}`));
    const empty = HRP_ROOM_SECTIONS.filter((s) => !shown.includes(s));
    const sections = shown.map((s) => this.roomSection(name, room, i, s)).join('');
    const chips = empty.length ? `<div class="row wrap chips">${empty.map((s) => `<button class="chip dashed" data-open-sec="${i}|${s.key}">+ ${this.t(`rm_${s.key}`)}</button>`).join('')}</div>` : '';
    return `<section class="card room open">${header}${fields}${sections}${chips}</section>`;
  }

  sectionFilled(room, s) {
    if (s.naps) return Boolean((room.naps || []).length);
    return s.fields.some((f) => this.roomValues(room, f.f).some(Boolean));
  }

  roomSection(name, room, i, s) {
    const key = `${name}|${s.key}`;
    const folded = this._ui.secs.has(`${key}|folded`);
    const summary = s.naps
      ? (room.naps || []).map((n) => (typeof n === 'string' ? this.friendly(n) : `${String(n.start).slice(0, 5)}–${String(n.end).slice(0, 5)}`)).join(', ')
      : s.fields.flatMap((f) => this.roomValues(room, f.f).filter(Boolean).map((e) => this.friendly(e))).join(', ');
    const head = `<button class="sechead" data-fold-sec="${i}|${s.key}" aria-expanded="${!folded}"><ha-icon icon="${s.icon}"></ha-icon><span class="grow">${this.t(`rm_${s.key}`)}</span><span class="sub small secsum">${hrpEsc(summary)}</span><ha-icon icon="mdi:chevron-${folded ? 'right' : 'down'}"></ha-icon></button>`;
    if (folded) return `<div class="sec">${head}</div>`;
    let body;
    if (s.naps) {
      const naps = (room.naps || [])
        .map((n, k) =>
          typeof n === 'string'
            ? `<div class="pickrow"><div class="picker" data-pick="${i}|naps|${k}"></div><button class="rbtn plain" data-del-nap="${i}|${k}" aria-label="${this.t('remove')}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`
            : `<div class="pickrow nap"><label class="ffield"><span>${this.t('rm_nap_from')}</span><input type="time" data-nap="${i}|${k}|start" value="${hrpEsc(String(n.start).slice(0, 5))}"></label><label class="ffield"><span>${this.t('rm_nap_to')}</span><input type="time" data-nap="${i}|${k}|end" value="${hrpEsc(String(n.end).slice(0, 5))}"></label><span class="days">${HRP_WEEKDAYS.map((d, j) => `<button class="day ${(n.days || []).includes(d) ? 'on' : ''}" data-nap-day="${i}|${k}|${d}" aria-pressed="${(n.days || []).includes(d)}">${hrpEsc(this.weekday(j))}</button>`).join('')}</span><button class="rbtn plain" data-del-nap="${i}|${k}" aria-label="${this.t('remove')}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`,
        )
        .join('');
      body = `${naps}<p class="sub small">${this.t('rm_nap_days_help')}</p><div class="row wrap chips"><button class="chip dashed" data-add-nap="${i}|slot">+ ${this.t('rm_nap')}</button><button class="chip dashed" data-add-nap="${i}|entity">+ ${this.t('rm_nap_schedule')}</button></div>`;
    } else {
      body = s.fields
        .map((f) => {
          const values = this.roomValues(room, f.f);
          const list = values.length ? values : [''];
          const pickers = list.map((_, k) => `<div class="pickrow"><div class="picker" data-pick="${i}|${f.f}|${k}"></div></div>`).join('');
          const add = f.list && values.some(Boolean) ? `<button class="chip dashed" data-add-value="${i}|${f.f}">+ ${this.t(f.label)}</button>` : '';
          return `<div class="flabel">${this.t(f.label)}</div>${pickers}${add}`;
        })
        .join('');
    }
    return `<div class="sec">${head}<div class="secbody">${body}</div></div>`;
  }

  weekday(j) {
    // 2024-01-01 is a Monday.
    return new Intl.DateTimeFormat(this._hass?.locale?.language || 'en', { weekday: 'short' }).format(new Date(2024, 0, 1 + j));
  }

  // After each draw of the Rooms tab: Home Assistant's entity pickers (a text field where there are none).
  mountPickers() {
    for (const box of this.shadowRoot.querySelectorAll('.picker[data-pick]')) {
      const [i, f, k] = box.dataset.pick.split('|');
      const [name, room] = Object.entries(this._ui.rooms)[Number(i)];
      const value = f === 'naps' ? room.naps[Number(k)] : this.roomValues(room, f)[Number(k)] || '';
      const filter = HRP_ROOM_FILTERS[f];
      const set = (v) => this.roomPick(Number(i), f, Number(k), v);
      let el;
      if (customElements.get('ha-selector')) {
        el = document.createElement('ha-selector');
        el.hass = this._hass;
        el.selector = { entity: { filter } };
        el.value = value;
        el.addEventListener('value-changed', (ev) => set(ev.detail.value || ''));
      } else {
        el = document.createElement('input');
        el.className = 'cell';
        el.value = value;
        el.placeholder = filter.map((x) => x.domain).join(' / ');
        el.setAttribute('aria-label', `${name} ${this.t(HRP_ROOM_LABELS[f])}`);
        el.addEventListener('change', () => set(el.value.trim()));
      }
      box.append(el);
    }
  }

  roomPick(i, f, k, value) {
    const room = Object.values(this._ui.rooms)[i];
    if (f === 'naps') {
      if (value) room.naps[k] = value;
      else room.naps.splice(k, 1);
    } else {
      const values = this.roomValues(room, f);
      values[k] = value;
      this.setRoomValues(room, f, values.filter(Boolean));
    }
    this._render();
  }

  // Rooms from the Home Assistant areas: what each area holds, by domain and device class (a room keeps what it has).
  areaRoom(areaId) {
    const ents = this._hass.entities || {};
    const devices = this._hass.devices || {};
    const room = { area: areaId };
    const add = (f, e) => {
      const values = this.roomValues(room, f);
      if (!values.includes(e)) this.setRoomValues(room, f, [...values, e]);
    };
    for (const [e, ent] of Object.entries(ents)) {
      if (ent.entity_category || ent.hidden) continue;
      if ((ent.area_id || devices[ent.device_id]?.area_id) !== areaId) continue;
      const domain = e.split('.')[0];
      const cls = this._hass.states[e]?.attributes?.device_class;
      for (const [f, filter] of Object.entries(HRP_ROOM_FILTERS)) {
        if (f === 'naps') continue;
        if (!filter.some((x) => x.domain === domain && (!x.device_class || x.device_class.includes(cls)))) continue;
        if (HRP_ROOM_LISTS.includes(f)) add(f, e);
        else room[f] ||= e;
      }
    }
    return room;
  }

  roomOfArea(rooms, area) {
    return Object.keys(rooms).find((n) => rooms[n].area === area.area_id || n.toLowerCase() === area.name.toLowerCase());
  }

  freeAreas(rooms) {
    return Object.values(this._hass.areas || {})
      .filter((a) => !this.roomOfArea(rooms, a))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Fills a room from its area: new values join, what is set stays.
  mergeArea(area) {
    const rooms = this.draftRooms();
    const found = this.areaRoom(area.area_id);
    const name = this.roomOfArea(rooms, area) || area.name;
    const room = (rooms[name] ||= {});
    room.area ||= area.area_id;
    for (const f of Object.keys(HRP_ROOM_FILTERS)) {
      if (f === 'naps') continue;
      const before = this.roomValues(room, f);
      const merged = [...new Set([...before, ...this.roomValues(found, f)])];
      if (merged.length > before.length) this.setRoomValues(room, f, merged);
    }
    return name;
  }

  // ---------- tab: journal ----------
  tab_journal() {
    const d = this._data;
    const today = new Date().toDateString();
    const journal = [...(d.journal || [])].reverse();
    const stat = (icon, tone, value, label) =>
      `<div class="tile" style="flex:1 1 180px">${this.icon(icon, tone)}<div><div class="ttl" style="font-size:22px;line-height:26px">${value}</div><div class="sub">${hrpEsc(label)}</div></div></div>`;
    const stats = [
      stat('mdi:play', 'indigo', journal.filter((e) => new Date(e.ts * 1000).toDateString() === today).length, this.t('today')),
      stat('mdi:alarm-light-outline', 'red', (d.alerts || []).length, this.count('alerts', (d.alerts || []).length)),
      stat('mdi:close-circle-outline', 'red', journal.filter((e) => e.result === 'failed').length, this.t('failures')),
    ].join('');
    const filters = {
      all: null,
      alerts: ['sensor_flash', 'leak_guard', 'vacuum_guard'],
      plugs: ['keep_on', 'auto_off'],
      lights: ['presence_light', 'vacuum_follow'],
      appliances: ['appliance_resume', 'cycle_done'],
      failures: 'failed',
    };
    const labels = {
      all: this.t('all'),
      alerts: this.count('alerts', 2).replace(/^\d+\s*/, ''),
      plugs: this.t('type.keep_on'),
      lights: this.t('light'),
      appliances: this.t('type.appliance_resume'),
      failures: this.t('failures'),
    };
    const chips = Object.keys(filters)
      .map((k) => `<button class="chip ${this._ui.jfilter === k ? 'on' : ''}" data-jfilter="${k}">${hrpEsc(labels[k])}</button>`)
      .join('');
    const f = filters[this._ui.jfilter];
    const q = this._ui.search.toLowerCase();
    const items = journal.filter((e) => {
      if (f === 'failed' && e.result !== 'failed') return false;
      if (Array.isArray(f) && !f.includes(e.type)) return false;
      return !q || `${e.name} ${e.rule} ${e.detail}`.toLowerCase().includes(q);
    });
    const days = {};
    for (const e of items) (days[new Date(e.ts * 1000).toLocaleDateString(this._hass.locale?.language)] ||= []).push(e);
    const tables = Object.entries(days)
      .map(([day, list]) => `<h2>${hrpEsc(day)}</h2><div class="card scroll"><table>${list.map((e) => this.journalRow(e, true)).join('')}</table></div>`)
      .join('');
    return `<div class="stack"><div class="row wrap">${stats}</div><div class="row wrap"><div class="chips">${chips}</div><span class="grow"></span><input id="hrp-search" class="cell" style="width:280px" placeholder="${this.t('search')}" value="${hrpEsc(this._ui.search)}" aria-label="${this.t('search')}"></div>${tables || `<div class="empty">—</div>`}</div>`;
  }

  // ---------- tab: yaml ----------
  tab_yaml() {
    const y = this._ui.yaml;
    if (!y) {
      this.loadYaml();
      return '<div class="empty">…</div>';
    }
    const file = y.mode === 'yaml';
    const dirty = file && y.text !== y.original;
    const help = file ? this.t('yaml_file_help', { path: y.path || 'house_rules.yaml' }) : this.t('yaml_storage_help');
    const err = y.error ? `<div class="note red">${hrpEsc(y.error)}</div>` : '';
    const inc = file && y.includes ? `<div class="note">${this.t('yaml_includes')}</div>` : '';
    return `<div class="stack"><div class="row wrap">${this.pill(file ? this.t('source_yaml') : this.t('source_storage'), file ? 'indigo' : 'grey')}<div class="grow sub">${hrpEsc(help)}</div><button class="btn" data-action="copy">${this.t('copy')}</button>${file ? '' : `<button class="btn primary" data-action="switch-yaml">${this.t('switch_yaml')}</button>`}</div>${inc}${err}<textarea id="hrp-file" class="file" spellcheck="false" ${file ? '' : 'readonly'} aria-label="YAML">${hrpEsc(y.text)}</textarea>${dirty ? this.saveBar('yaml-revert', 'yaml-save', this.t('revert')) : ''}</div>`;
  }

  async loadYaml() {
    if (this._loadingYaml) return;
    this._loadingYaml = true;
    try {
      const res = await this.ws({ type: 'house_rules/yaml/get' });
      this._ui.yaml = { ...res, original: res.text, error: null };
    } catch (err) {
      this._ui.yaml = { mode: 'storage', text: '', original: '', error: err?.message || String(err) };
    }
    this._loadingYaml = false;
    this._render();
  }

  async saveYaml() {
    const y = this._ui.yaml;
    try {
      await this.ws({ type: 'house_rules/yaml/save', text: y.text, hash: y.hash });
      this._ui.yaml = null;
      this.toast(this.t('saved'));
      await this.loadYaml();
    } catch (err) {
      if (err?.code === 'conflict') {
        this._ui.conflict = { current: err.data?.current || '', mine: y.text, file: err.data?.file, whole: true, hash: err.data?.hash };
      } else {
        const line = err?.data?.line ? ` (${err.data.line})` : '';
        y.error = `${err?.message || String(err)}${line}`;
      }
      this._render();
    }
  }

  // ---------- tab: settings ----------
  tab_settings() {
    const d = this._data;
    const src = d.source || {};
    const s = this._ui.settings || JSON.parse(JSON.stringify(d.settings || {}));
    this._ui.settings = s;
    const row = (title, help, ctrl) =>
      `<div class="srow"><div class="grow" style="flex:1 1 300px"><div class="lname">${hrpEsc(title)}</div><div class="sub small">${hrpEsc(help)}</div></div>${ctrl}</div>`;
    const sourceBlock =
      src.mode === 'yaml'
        ? `<div class="srcbar">${this.pill(this.t('source_yaml'), 'indigo')}<code class="grow">${hrpEsc(src.path)}</code><span class="sub small">${src.modified ? hrpEsc(this.t('modified', { time: this.time(src.modified) })) : ''}${src.files?.length > 1 ? ` · ${src.files.length} files` : ''}</span><button class="btn sm" data-action="reload"><ha-icon icon="mdi:refresh" style="--mdc-icon-size:14px"></ha-icon>${this.t('reload')}</button></div>${src.error ? `<div class="note red">${hrpEsc(src.error.message)}</div>` : ''}<p class="sub small">${this.t('yaml_help')}</p>`
        : `<div class="srcbar">${this.pill(this.t('source_storage'), 'grey')}<span class="grow sub small">${this.t('switch_yaml_help')}</span><button class="btn primary" data-action="switch-yaml">${this.t('switch_yaml')}</button></div>`;
    const qh = s.quiet_hours || {};
    const dirty = JSON.stringify(s) !== JSON.stringify(d.settings || {});
    const proposals = this._ui.proposals;
    let importBody = `<button class="btn" data-action="analyze">${this.t('analyze')}</button>`;
    if (proposals) {
      importBody = proposals.length
        ? `${proposals
            .map(
              (p, i) =>
                `<label class="prow"><input type="checkbox" data-prop="${i}" ${p.checked ? 'checked' : ''}>${this.icon(hrs().icons[p.rule.type], 'indigo', 32)}<div class="grow"><div class="lname">${hrpEsc(p.rule.name || p.rule.id)}</div><div class="sub small">${hrpEsc(this.t(`type.${p.rule.type}`))} · ${hrpEsc(p.source === 'label' ? `label « ${p.label} »` : p.automation_entity || p.alias)}</div></div></label>`,
            )
            .join('')}<div class="row end"><button class="btn primary" data-action="import">${this.t('import_selected', { n: proposals.filter((p) => p.checked).length })}</button></div>`
        : `<div class="sub">${this.t('nothing_found')}</div>`;
    }
    const people = d.conditions?.people_home;
    return `<div class="grid2">
      <section class="card pad"><div class="row">${this.icon('mdi:file-code-outline', 'indigo')}<div class="ttl">${this.t('source')}</div></div>${sourceBlock}
      </section>
      <section class="card pad"><div class="row">${this.icon('mdi:filter-outline', 'indigo')}<div class="ttl">${this.t('conditions')}</div></div>
        ${row(this.t('quiet_hours'), this.t('quiet_help'), `<div class="row"><input type="time" class="cell" id="qh-start" value="${hrpEsc((qh.start || '').slice(0, 5))}" aria-label="start"><span>→</span><input type="time" class="cell" id="qh-end" value="${hrpEsc((qh.end || '').slice(0, 5))}" aria-label="end"></div>`)}
        ${row(this.t('vacation'), people ? this.t('people_home', { n: people }) : this.t('nobody_home'), `<label class="sw"><input type="checkbox" data-action="vacation" ${d.conditions?.vacation ? 'checked' : ''} aria-label="${this.t('vacation')}"><span></span></label>`)}
        ${row(this.t('alarm'), '', `<input class="cell" id="set-alarm" value="${hrpEsc(s.alarm || '')}" placeholder="alarm_control_panel.…" aria-label="${this.t('alarm')}">`)}
        ${row(this.t('notify'), '', `<input class="cell" id="set-notify" value="${hrpEsc(s.notify || '')}" placeholder="notify.…" aria-label="${this.t('notify')}">`)}
        ${row(this.t('repairs'), '', `<label class="sw"><input type="checkbox" id="set-repairs" ${s.repairs !== false ? 'checked' : ''} aria-label="${this.t('repairs')}"><span></span></label>`)}
      </section>
      <section class="card pad"><div class="row">${this.icon('mdi:import', 'indigo')}<div class="ttl">${this.t('import')}</div></div><p class="sub small">${this.t('import_help')}</p>${importBody}</section>
    </div>${dirty ? this.saveBar('reset-settings', 'save-settings') : ''}`;
  }

  dialog() {
    const c = this._ui.conflict;
    if (!c) return '';
    return `<div class="scrim"><div class="card dlg" role="dialog" aria-modal="true" aria-label="${this.t('conflict_title')}"><div class="row">${this.icon('mdi:file-alert-outline', 'amber')}<div class="ttl grow">${this.t('conflict_title')}</div></div><div class="sub small">${hrpEsc(c.file || '')}</div><div class="grid2 tight"><div class="diff a"><b>${this.t('conflict_file')}</b><pre>${hrpEsc(c.current || '')}</pre></div><div class="diff b"><b>${this.t('conflict_panel')}</b><pre>${hrpEsc(c.mine || '')}</pre></div></div><div class="row end"><button class="btn" data-action="keep-file">${this.t('keep_file')}</button><button class="btn primary" data-action="keep-panel">${this.t('keep_panel')}</button></div></div></div>`;
  }

  // ---------- events ----------
  bind() {
    const root = this.shadowRoot;
    const on = (sel, ev, fn) => {
      for (const el of root.querySelectorAll(sel)) el.addEventListener(ev, (e) => fn(el, e));
    };
    on('[data-tab]', 'click', (el) => this.go(el.dataset.tab));
    on('[data-filter]', 'click', (el) => {
      this._ui.filter = el.dataset.filter || null;
      this._render();
    });
    on('[data-jfilter]', 'click', (el) => {
      this._ui.jfilter = el.dataset.jfilter;
      this._render();
    });
    on('#hrp-search', 'input', (el) => {
      this._ui.search = el.value;
      this._render();
    });
    on('[data-ack]', 'click', (el) => this.ws({ type: 'house_rules/action', rule: el.dataset.ack, action: 'acknowledge' }));
    on('[data-snooze]', 'click', (el) => this.ws({ type: 'house_rules/action', rule: el.dataset.snooze, action: 'snooze', minutes: 15 }));
    on('[data-unsnooze]', 'click', (el) => this.ws({ type: 'house_rules/action', rule: el.dataset.unsnooze, action: 'snooze', minutes: 0 }));
    on('[data-test]', 'click', (el) => this.ws({ type: 'house_rules/action', rule: el.dataset.test, action: 'test' }));
    on('[data-extend]', 'click', (el) => this.ws({ type: 'house_rules/timer', entity_id: el.dataset.extend, action: 'extend', minutes: 15 }));
    on('[data-off]', 'click', (el) => this.ws({ type: 'house_rules/timer', entity_id: el.dataset.off, action: 'off' }));
    on('[data-presence-extend]', 'click', (el) => this.ws({ type: 'house_rules/presence', rule: el.dataset.presenceExtend, action: 'extend', minutes: 15 }));
    on('[data-presence-off]', 'click', (el) => this.ws({ type: 'house_rules/presence', rule: el.dataset.presenceOff, action: 'off' }));
    on('[data-enable]', 'change', (el) => this.toggleRule(el.dataset.enable, el.checked));
    on('[data-edit]', 'click', (el) => this.edit(el.dataset.edit));
    on('#hrp-file', 'input', (el) => {
      const y = this._ui.yaml;
      const was = y.text !== y.original;
      y.text = el.value;
      if (was !== (y.text !== y.original)) this._render();
    });
    on('#hrp-yaml', 'input', (el) => {
      this._ui.editing.text = el.value;
    });
    on('#hrp-type', 'change', (el) => {
      this._ui.editing.text = HRP_TEMPLATES[el.value];
      this._render();
    });
    this.bindRooms(on);
    on('[data-prop]', 'change', (el) => {
      this._ui.proposals[Number(el.dataset.prop)].checked = el.checked;
      this._render();
    });
    on('#qh-start, #qh-end, #set-alarm, #set-notify', 'input', () => this.settingsInput(false));
    on('#qh-start, #qh-end, #set-alarm, #set-notify, #set-repairs', 'change', () => this.settingsInput(true));
    on('[data-action]', 'click', (el, ev) => {
      if (el.tagName === 'INPUT') return;
      ev.preventDefault();
      this.action(el.dataset.action);
    });
    on('input[data-action="vacation"]', 'change', (el) => this.ws({ type: 'house_rules/vacation', value: el.checked }));
  }

  async action(name) {
    try {
      switch (name) {
        case 'menu':
          this.dispatchEvent(new Event('hass-toggle-menu', { bubbles: true, composed: true }));
          break;
        case 'reload': {
          await this.ws({ type: 'house_rules/reload' });
          break;
        }
        case 'new':
          this._ui.tab = 'rules';
          this._ui.editing = { previous_id: null, text: HRP_TEMPLATES.keep_on, error: null };
          this._render();
          break;
        case 'close':
          this._ui.editing = null;
          this._render();
          break;
        case 'save':
          await this.saveRule();
          break;
        case 'delete': {
          const id = this._ui.editing.previous_id;
          if (!confirm(this.t('confirm_delete', { name: id }))) return;
          await this.ws({ type: 'house_rules/rule/delete', rule_id: id });
          this._ui.editing = null;
          this._render();
          break;
        }
        case 'keep-file': {
          const c = this._ui.conflict;
          this._ui.conflict = null;
          if (c.whole) {
            this._ui.yaml = null;
            await this.loadYaml();
            break;
          }
          await this.ws({ type: 'house_rules/reload' });
          if (this._ui.editing) this._ui.editing.text = c.current || this._ui.editing.text;
          this._render();
          break;
        }
        case 'keep-panel':
          if (this._ui.conflict?.whole) {
            this._ui.yaml.hash = this._ui.conflict.hash;
            this._ui.conflict = null;
            await this.saveYaml();
            break;
          }
          this._ui.conflict = null;
          await this.ws({ type: 'house_rules/reload' });
          await this.saveRule();
          break;
        case 'add-room': {
          const rooms = this.draftRooms();
          let n = 1;
          while (rooms[`${this.t('room')} ${n}`]) n++;
          rooms[`${this.t('room')} ${n}`] = {};
          this._ui.open.add(`${this.t('room')} ${n}`);
          this._render();
          break;
        }
        case 'rooms-collapse':
          this._ui.open.clear();
          this._render();
          break;
        case 'rooms-discover': {
          const areas = Object.values(this._hass.areas || {});
          const before = JSON.stringify(this.draftRooms());
          for (const area of areas) this.mergeArea(area);
          this.toast(before === JSON.stringify(this._ui.rooms) ? this.t('rm_nothing_found') : this.t('rm_discovered'));
          this._render();
          break;
        }
        case 'reset-rooms':
          this._ui.rooms = null;
          this._render();
          break;
        case 'save-rooms':
          await this.ws({ type: 'house_rules/section/save', section: 'rooms', value: this.cleanRooms() });
          this._ui.rooms = null;
          this.toast(this.t('saved'));
          break;
        case 'reset-settings':
          this._ui.settings = null;
          this._render();
          break;
        case 'save-settings':
          await this.ws({ type: 'house_rules/section/save', section: 'settings', value: this.cleanSettings() });
          this._ui.settings = null;
          this.toast(this.t('saved'));
          break;
        case 'switch-yaml':
          await this.ws({ type: 'house_rules/yaml/enable' });
          break;
        case 'copy':
          await navigator.clipboard?.writeText(this._ui.yaml?.text || '');
          this.toast(this.t('copied'));
          break;
        case 'yaml-revert':
          this._ui.yaml = null;
          await this.loadYaml();
          break;
        case 'yaml-save':
          await this.saveYaml();
          break;
        case 'analyze': {
          const res = await this.ws({ type: 'house_rules/import/analyze' });
          this._ui.proposals = (res.proposals || []).map((p) => ({ ...p, checked: true }));
          this._render();
          break;
        }
        case 'import': {
          const chosen = this._ui.proposals.filter((p) => p.checked);
          const rooms = {};
          for (const p of chosen) Object.assign(rooms, p.rooms || {});
          await this.ws({
            type: 'house_rules/import/apply',
            rules: chosen.map((p) => p.rule),
            rooms,
            automations: chosen.map((p) => p.automation_entity).filter(Boolean),
          });
          this._ui.proposals = null;
          this.toast(this.t('saved'));
          this.go('rules');
          break;
        }
      }
    } catch (err) {
      this.toast(err?.message || String(err));
    }
  }

  async toggleRule(id, enabled) {
    try {
      const res = await this.ws({ type: 'house_rules/rule/yaml', rule_id: id });
      let text = res.yaml || '';
      text = text.replace(/^enabled:.*\n?/m, '');
      if (!enabled) text = `${text.trimEnd()}\nenabled: false\n`;
      await this.ws({ type: 'house_rules/rule/save', yaml: text, previous_id: id });
    } catch (err) {
      this.toast(err?.message || String(err));
      this._render();
    }
  }

  async edit(id) {
    const res = await this.ws({ type: 'house_rules/rule/yaml', rule_id: id });
    this._ui.editing = { previous_id: id, text: res.yaml || '', error: null };
    this._render();
  }

  async saveRule() {
    const e = this._ui.editing;
    if (!e) return;
    try {
      await this.ws({ type: 'house_rules/rule/save', yaml: e.text, previous_id: e.previous_id || undefined });
      this._ui.editing = null;
      this.toast(this.t('saved'));
      this._render();
    } catch (err) {
      if (err?.code === 'conflict') {
        this._ui.conflict = { current: err.data?.current || '', mine: e.text, file: err.data?.file };
      } else {
        e.error = err?.message || String(err);
      }
      this._render();
    }
  }

  bindRooms(on) {
    const rooms = () => this.draftRooms();
    const at = (i) => Object.entries(rooms())[Number(i)];
    const redraw = () => this._render();
    on('[data-toggle-room]', 'click', (el) => {
      const [name] = at(el.dataset.toggleRoom);
      if (!this._ui.open.delete(name)) this._ui.open.add(name);
      redraw();
    });
    on('[data-remove-room]', 'click', (el) => {
      const entries = Object.entries(rooms());
      const [[name]] = entries.splice(Number(el.dataset.removeRoom), 1);
      this._ui.open.delete(name);
      this._ui.rooms = Object.fromEntries(entries);
      redraw();
    });
    on('[data-move-room]', 'click', (el) => {
      const [i, step] = el.dataset.moveRoom.split('|').map(Number);
      const entries = Object.entries(rooms());
      const [item] = entries.splice(i, 1);
      entries.splice(i + step, 0, item);
      this._ui.rooms = Object.fromEntries(entries);
      redraw();
    });
    on('[data-room-name]', 'change', (el) => {
      const i = Number(el.dataset.roomName);
      const entries = Object.entries(rooms());
      const [old, room] = entries[i];
      const name = el.value.trim();
      if (!name || name === old || rooms()[name]) return redraw();
      entries[i] = [name, room];
      this._ui.rooms = Object.fromEntries(entries);
      if (this._ui.open.delete(old)) this._ui.open.add(name);
      redraw();
    });
    on('[data-room-area]', 'change', (el) => {
      const [, room] = at(el.dataset.roomArea);
      if (el.value) room.area = el.value;
      else delete room.area;
      redraw();
    });
    on('[data-open-sec]', 'click', (el) => {
      const [i, key] = el.dataset.openSec.split('|');
      const [name, room] = at(i);
      this._ui.secs.add(`${name}|${key}`);
      if (key === 'naps' && !(room.naps || []).length) room.naps = [{ start: '13:30', end: '15:00' }];
      redraw();
    });
    on('[data-fold-sec]', 'click', (el) => {
      const [i, key] = el.dataset.foldSec.split('|');
      const id = `${at(i)[0]}|${key}|folded`;
      if (!this._ui.secs.delete(id)) this._ui.secs.add(id);
      redraw();
    });
    on('[data-add-value]', 'click', (el) => {
      const [i, f] = el.dataset.addValue.split('|');
      const [, room] = at(i);
      this.setRoomValues(room, f, [...this.roomValues(room, f), '']);
      redraw();
    });
    on('[data-add-nap]', 'click', (el) => {
      const [i, kind] = el.dataset.addNap.split('|');
      const [, room] = at(i);
      room.naps = [...(room.naps || []), kind === 'slot' ? { start: '13:30', end: '15:00' } : ''];
      redraw();
    });
    on('[data-del-nap]', 'click', (el) => {
      const [i, k] = el.dataset.delNap.split('|');
      const [name, room] = at(i);
      room.naps.splice(Number(k), 1);
      if (!room.naps.length) {
        delete room.naps;
        this._ui.secs.delete(`${name}|naps`);
      }
      redraw();
    });
    on('[data-nap]', 'change', (el) => {
      const [i, k, part] = el.dataset.nap.split('|');
      at(i)[1].naps[Number(k)][part] = el.value;
      redraw();
    });
    on('[data-nap-day]', 'click', (el) => {
      const [i, k, day] = el.dataset.napDay.split('|');
      const nap = at(i)[1].naps[Number(k)];
      const days = new Set(nap.days || []);
      if (!days.delete(day)) days.add(day);
      if (days.size) nap.days = HRP_WEEKDAYS.filter((d) => days.has(d));
      else delete nap.days;
      redraw();
    });
    on('[data-add-area]', 'click', (el) => {
      const area = this._hass.areas?.[el.dataset.addArea];
      if (!area) return;
      this._ui.open.add(this.mergeArea(area));
      redraw();
    });
    on('.picker', 'focusout', () => {
      if (this._ui.later) {
        this._ui.later = false;
        setTimeout(redraw, 0);
      }
    });
  }

  cleanRooms() {
    const out = {};
    for (const [name, room] of Object.entries(this._ui.rooms || {})) {
      if (!name.trim()) continue;
      const clean = {};
      for (const [k, v] of Object.entries(room)) {
        const value = Array.isArray(v) ? v.filter((x) => x !== '' && x != null) : v;
        if (value === '' || value == null || (Array.isArray(value) && !value.length)) continue;
        clean[k] = value;
      }
      out[name.trim()] = clean;
    }
    return out;
  }

  settingsInput(render) {
    const r = this.shadowRoot;
    const s = this._ui.settings;
    const start = r.getElementById('qh-start').value;
    const end = r.getElementById('qh-end').value;
    s.quiet_hours = start && end ? { start, end } : null;
    s.alarm = r.getElementById('set-alarm').value.trim() || null;
    s.notify = r.getElementById('set-notify').value.trim() || null;
    s.repairs = r.getElementById('set-repairs').checked;
    // Typing only updates the draft (a redraw would drop the caret); the buttons appear once it differs.
    const shown = Boolean(r.querySelector('[data-action="save-settings"]'));
    const dirty = JSON.stringify(s) !== JSON.stringify(this._data.settings || {});
    if (render || shown !== dirty) this._render();
  }

  cleanSettings() {
    // quiet_hours: null is kept (no quiet hours); other empty values go (their default applies).
    return Object.fromEntries(
      Object.entries(this._ui.settings || {}).filter(([k, v]) => k === 'quiet_hours' || (v !== null && v !== '')),
    );
  }
}
