// House Rules cards, loaded on every dashboard:
//   custom:house-rules-card        overview, full (illustrated header, alert banner, one tile per rule type)
//   custom:house-rules-mini-card   the same, folded to its header; the corner button unfolds it (click outside folds)
//   custom:house-rules-timers-card running auto-off timers: rings, +15 min, turn off
//   custom:house-rules-activity-card the journal, filterable
// One WebSocket subscription (house_rules/subscribe) is shared by every card of the page.

const HR_VERSION = '1.0.1';

const HR_STRINGS = {
  en: {
    title: 'House Rules',
    timers_title: 'Timers',
    activity_title: 'Activity',
    alerts_one: '1 alert',
    alerts_other: '{n} alerts',
    timers_one: '1 timer',
    timers_other: '{n} timers',
    all_good: 'All good',
    rules_one: '1 rule',
    rules_other: '{n} rules',
    acknowledge: 'Acknowledge',
    extend: '+15 min',
    turn_off: 'Turn off',
    no_timer: 'No timer running',
    no_activity: 'Nothing yet',
    not_loaded: 'House Rules is not loaded',
    expand: 'Show details',
    collapse: 'Fold',
    open_panel: 'Open the panel',
    all: 'All',
    alerts: 'Alerts',
    plugs: 'Plugs',
    lights: 'Lights',
    vacuum: 'Vacuum',
    appliances: 'Appliances',
    failures: 'Failures',
    left: '{t} left',
    'state.disabled': 'Disabled',
    'state.snoozed': 'Snoozed',
    'state.idle': 'Idle',
    'state.armed': 'Armed',
    'state.active': 'Active',
    'state.alert': 'Alert',
    'state.waiting': 'Waiting',
    'state.failed': 'Failed',
    'type.keep_on': 'Keep on',
    'type.auto_off': 'Timed off',
    'type.sensor_flash': 'Light alert',
    'type.sensor_chime': 'Chime',
    'type.appliance_resume': 'Appliance resume',
    'type.cycle_done': 'End of cycle',
    'type.vacuum_follow': 'Vacuum lights',
    'type.vacuum_guard': 'Vacuum guard',
    'type.presence_light': 'Presence light',
    'type.lock_guard': 'Lock guard',
    'type.leak_guard': 'Leak guard',
    'result.ok': 'OK',
    'result.skipped': 'Skipped',
    'result.active': 'Active',
    'result.failed': 'Failed',
  },
  fr: {
    title: 'House Rules',
    timers_title: 'Minuteurs',
    activity_title: 'Journal',
    alerts_one: '1 alerte',
    alerts_other: '{n} alertes',
    timers_one: '1 minuteur',
    timers_other: '{n} minuteurs',
    all_good: 'Tout va bien',
    rules_one: '1 règle',
    rules_other: '{n} règles',
    acknowledge: 'Acquitter',
    extend: '+15 min',
    turn_off: 'Éteindre',
    no_timer: 'Aucun minuteur en cours',
    no_activity: 'Rien pour le moment',
    not_loaded: "House Rules n'est pas chargé",
    expand: 'Afficher le détail',
    collapse: 'Replier',
    open_panel: 'Ouvrir le panneau',
    all: 'Tout',
    alerts: 'Alertes',
    plugs: 'Prises',
    lights: 'Lumières',
    vacuum: 'Aspirateur',
    appliances: 'Électroménager',
    failures: 'Échecs',
    left: 'encore {t}',
    'state.disabled': 'Désactivée',
    'state.snoozed': 'En pause',
    'state.idle': 'Au repos',
    'state.armed': 'Armée',
    'state.active': 'Active',
    'state.alert': 'Alerte',
    'state.waiting': 'En attente',
    'state.failed': 'Échec',
    'type.keep_on': 'Rallumage',
    'type.auto_off': 'Extinction temporisée',
    'type.sensor_flash': 'Signal lumineux',
    'type.sensor_chime': 'Sonnerie',
    'type.appliance_resume': 'Relance électroménager',
    'type.cycle_done': 'Fin de cycle',
    'type.vacuum_follow': 'Lumières aspirateur',
    'type.vacuum_guard': 'Retour base',
    'type.presence_light': 'Lumière sur présence',
    'type.lock_guard': 'Serrure',
    'type.leak_guard': "Fuite d'eau",
    'result.ok': 'OK',
    'result.skipped': 'Ignoré',
    'result.active': 'En cours',
    'result.failed': 'Échec',
  },
};

function hrLang(hass) {
  const lang = hass?.locale?.language || hass?.language || 'en';
  if (HR_STRINGS[lang]) return lang;
  const base = lang.split('-')[0];
  return HR_STRINGS[base] ? base : 'en';
}

function hrT(hass, key, vars = {}) {
  const table = HR_STRINGS[hrLang(hass)];
  let text = table[key] ?? HR_STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  return text;
}

function hrCount(hass, key, n) {
  return hrT(hass, n === 1 ? `${key}_one` : `${key}_other`, { n });
}

const HR_ICONS = {
  keep_on: 'mdi:power-plug-outline',
  auto_off: 'mdi:timer-outline',
  sensor_flash: 'mdi:alarm-light-outline',
  sensor_chime: 'mdi:bell-ring-outline',
  appliance_resume: 'mdi:dishwasher',
  cycle_done: 'mdi:check-circle-outline',
  vacuum_follow: 'mdi:robot-vacuum',
  vacuum_guard: 'mdi:shield-home-outline',
  presence_light: 'mdi:motion-sensor',
  lock_guard: 'mdi:lock-outline',
  leak_guard: 'mdi:water-alert-outline',
};
const HR_TYPE_ORDER = Object.keys(HR_ICONS);

// Rule state -> tone of the charter (red alert, amber active, blue waiting, green armed, grey rest).
const HR_TONE = {
  alert: 'red',
  failed: 'red',
  active: 'amber',
  waiting: 'blue',
  armed: 'green',
  idle: 'grey',
  disabled: 'grey',
  snoozed: 'grey',
};
const HR_TONE_RANK = { red: 4, amber: 3, blue: 2, green: 1, grey: 0 };

const HR_FILTERS = {
  all: null,
  alerts: ['sensor_flash', 'leak_guard', 'vacuum_guard'],
  plugs: ['keep_on', 'auto_off'],
  lights: ['presence_light', 'vacuum_follow', 'sensor_flash'],
  vacuum: ['vacuum_follow', 'vacuum_guard'],
  appliances: ['appliance_resume', 'cycle_done'],
};

// ---------- shared subscription ----------
const hrHub = (window.__houseRulesHub ??= { listeners: new Set(), data: undefined, unsub: null, connection: null });

function hrSubscribe(hass, listener) {
  hrHub.listeners.add(listener);
  if (hrHub.data !== undefined) listener(hrHub.data);
  if (!hrHub.unsub || hrHub.connection !== hass.connection) {
    if (hrHub.unsub) hrHub.unsub.then((u) => u()).catch(() => {});
    hrHub.connection = hass.connection;
    hrHub.unsub = hass.connection
      .subscribeMessage(
        (data) => {
          hrHub.data = data;
          for (const l of hrHub.listeners) l(data);
        },
        { type: 'house_rules/subscribe' },
      )
      .catch(() => {
        hrHub.data = null;
        for (const l of hrHub.listeners) l(null);
        return () => {};
      });
  }
  return () => hrHub.listeners.delete(listener);
}

function hrEsc(text) {
  return String(text ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function hrDuration(seconds) {
  seconds = Math.max(0, Math.round(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')}`;
  if (m >= 10) return `${m} min`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function hrTime(hass, ts) {
  try {
    return new Date(ts * 1000).toLocaleTimeString(hass?.locale?.language || undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_err) {
    return '';
  }
}

// ---------- illustrated header: objects on the ground bar, one per configured family, coloured by status ----------
const HR_FAMILY = {
  plug: ['keep_on', 'auto_off'],
  lamp: ['presence_light', 'sensor_flash'],
  robot: ['vacuum_follow', 'vacuum_guard'],
  lock: ['lock_guard'],
  bell: ['sensor_chime'],
  appliance: ['appliance_resume', 'cycle_done'],
  drop: ['leak_guard'],
};
const HR_COLOR = { red: '#EF4444', amber: '#F59E0B', blue: '#3B82F6', green: '#16A34A', grey: '#9AA3B1' };

function hrFamilyTone(rules, family) {
  let best = null;
  for (const r of rules) {
    if (!HR_FAMILY[family].includes(r.type)) continue;
    const tone = HR_TONE[r.state] || 'grey';
    if (best === null || HR_TONE_RANK[tone] > HR_TONE_RANK[best]) best = tone;
  }
  return best;
}

function hrScene(rules, night) {
  const fill = night ? '#2A3242' : '#FFFFFF';
  const line = night ? '#9CA3AF' : '#9AA3B1';
  const draw = {
    plug: (c) =>
      `<rect x="0" y="50" width="26" height="35" rx="5" fill="${fill}" stroke="${line}" stroke-width="1.5"/><circle cx="9" cy="64" r="2" fill="${line}"/><circle cx="17" cy="64" r="2" fill="${line}"/><circle cx="13" cy="76" r="3" fill="${c}"/>`,
    lamp: (c, t) =>
      `${t === 'grey' ? '' : `<circle cx="14" cy="44" r="20" class="hr-glow" fill="${c}" opacity=".3"/>`}<line x1="14" y1="56" x2="14" y2="85" stroke="${line}" stroke-width="2"/><path d="M2,48 h24 l-4,-14 h-16 z" fill="${t === 'grey' ? fill : c}" stroke="${line}" stroke-width="1"/><rect x="6" y="82" width="16" height="3" fill="${line}"/>`,
    robot: (c, t) =>
      `<g class="${t === 'amber' ? 'hr-roll' : ''}"><ellipse cx="18" cy="80" rx="17" ry="6" fill="${c}"/><rect x="12" y="73" width="12" height="3" rx="1.5" fill="#BFDBFE"/></g>`,
    lock: (c, t) =>
      `<g class="${t === 'red' ? 'hr-blink' : ''}"><rect x="0" y="58" width="22" height="27" rx="3" fill="${fill}" stroke="${line}" stroke-width="1.5"/><path d="M5,58 v-6 a6,6 0 0 1 12,0 v6" fill="none" stroke="${c}" stroke-width="2"/><circle cx="11" cy="71" r="2.5" fill="${c}"/></g>`,
    bell: (c) =>
      `<path d="M2,72 a10,10 0 0 1 20,0 c0,8 3,10 3,10 h-26 s3,-2 3,-10" fill="${fill}" stroke="${c}" stroke-width="1.5"/><circle cx="12" cy="85" r="2.5" fill="${c}"/>`,
    appliance: (c) =>
      `<rect x="0" y="46" width="30" height="39" rx="3" fill="${fill}" stroke="${c}" stroke-width="1.5"/><line x1="0" y1="54" x2="30" y2="54" stroke="${c}" stroke-width="1.5"/><circle cx="15" cy="70" r="8" fill="none" stroke="${c}" stroke-width="1.5"/>`,
    drop: (c, t) =>
      `<g class="${t === 'red' ? 'hr-blink' : ''}"><path d="M12,52 s10,11 10,19 a10,10 0 0 1 -20,0 c0,-8 10,-19 10,-19z" fill="${fill}" stroke="${c}" stroke-width="1.5"/></g>`,
  };
  const width = { plug: 26, lamp: 28, robot: 36, lock: 22, bell: 26, appliance: 30, drop: 24 };
  let x = 0;
  let svg = '';
  for (const family of Object.keys(HR_FAMILY)) {
    const tone = hrFamilyTone(rules, family);
    if (tone === null) continue;
    svg += `<g transform="translate(${x},0)">${draw[family](HR_COLOR[tone], tone)}</g>`;
    x += width[family] + 22;
  }
  if (!svg) svg = draw.plug(HR_COLOR.grey, 'grey');
  return `<svg class="hr-scene" aria-hidden="true" width="${Math.max(x, 60)}" height="90" viewBox="0 0 ${Math.max(x, 60)} 90">${svg}</svg>`;
}

// Animations of the illustrated header, shared with the panel.
const HR_ANIM_CSS = `
  .hr-blink { animation: hr-blink 1s steps(1) infinite; }
  @keyframes hr-blink { 50% { opacity: .15; } }
  .hr-glow { animation: hr-glow 3s ease-in-out infinite; }
  @keyframes hr-glow { 50% { opacity: .6; } }
  .hr-roll { animation: hr-roll 6s ease-in-out infinite alternate; }
  @keyframes hr-roll { to { transform: translateX(-18px); } }
  @media (prefers-reduced-motion: reduce) { .hr-blink, .hr-glow, .hr-roll { animation: none; } }
`;

const HR_CSS = `
  :host { display: block; }
  ha-card { overflow: hidden; }
  .hdr { position: relative; height: 90px; overflow: hidden; background: var(--hr-sky); }
  .hdr .hr-scene { position: absolute; right: 16px; bottom: 5px; }
  .hdr .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: var(--hr-ground); }
  .hdrc { position: absolute; left: 16px; top: 16px; right: 16px; display: flex; align-items: flex-start; gap: 12px; }
  .ico { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; }
  .ico ha-icon { --mdc-icon-size: 22px; }
  .ttl { font-weight: 700; font-size: 16px; line-height: 20px; color: var(--primary-text-color); }
  .sub { font-size: 13px; line-height: 18px; color: var(--secondary-text-color); }
  .grow { flex: 1; min-width: 0; }
  .pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .rbtn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--divider-color); background: color-mix(in srgb, var(--card-background-color) 70%, transparent); color: var(--primary-text-color); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .rbtn ha-icon { --mdc-icon-size: 18px; }
  .body { padding: 16px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .tile { position: relative; display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: var(--hr-tile); min-width: 0; }
  .tname { font-weight: 700; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--primary-text-color); }
  .tstate { font-size: 12px; line-height: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { position: absolute; top: 8px; right: 8px; width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 2px var(--hr-tile); }
  .banner { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: var(--hr-red-bg); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hr-red) 35%, transparent); }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--divider-color); background: transparent; color: var(--primary-text-color); font-family: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
  .btn.red { border-color: var(--hr-red); color: var(--hr-red); }
  .rings { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .ring { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 8px; border-radius: 12px; background: var(--hr-tile); text-align: center; }
  .ring .tname { white-space: normal; font-size: 13px; }
  .row { display: flex; gap: 6px; }
  .empty { padding: 8px 0; color: var(--secondary-text-color); font-size: 13px; }
  ul { list-style: none; margin: 6px 0 0; padding: 0; }
  li { display: flex; gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--divider-color); }
  li:last-child { border-bottom: 0; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { height: 28px; border: 0; border-radius: 14px; padding: 0 12px; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 12px; background: var(--hr-tile); color: var(--primary-text-color); }
  .chip.on { background: var(--primary-color); color: var(--text-primary-color, #fff); }
`;

const HR_TONES_LIGHT = {
  red: ['#B91C1C', '#FEE2E2'],
  amber: ['#B45309', '#FEF3C7'],
  blue: ['#1D4ED8', '#DBEAFE'],
  green: ['#15803D', '#DCFCE7'],
  grey: ['#4B5563', '#E5E7EB'],
  indigo: ['#4338CA', '#E0E7FF'],
};
const HR_TONES_DARK = {
  red: ['#FCA5A5', '#7F1D1D'],
  amber: ['#FBBF24', '#5B3A0A'],
  blue: ['#93C5FD', '#1E3A8A'],
  green: ['#4ADE80', '#14532D'],
  grey: ['#D1D5DB', '#374151'],
  indigo: ['#A5B4FC', '#312E81'],
};

class HouseRulesBase extends HTMLElement {
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
    return `<div class="hdr">${hrScene(rules, this.night)}<div class="ground"></div><div class="hdrc">${this.icon('house-rules:emblem', iconTone)}<div class="grow"><div class="ttl">${hrEsc(title)}</div><div class="sub">${hrEsc(sub)}</div></div><div class="row" style="align-items:center">${this.pill(status, tone)}${button || ''}</div></div></div>`;
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

class HouseRulesCard extends HouseRulesBase {
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
      button = `<button class="rbtn" id="toggle" aria-label="${label}" title="${label}"><ha-icon icon="${this._expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon></button>`;
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

class HouseRulesMiniCard extends HouseRulesCard {
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

class HouseRulesTimersCard extends HouseRulesBase {
  static getStubConfig() {
    return {};
  }

  static getConfigForm() {
    return { schema: [{ name: 'title', selector: { text: {} } }] };
  }

  connectedCallback() {
    super.connectedCallback();
    this._tick = setInterval(() => this._render(), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    super.disconnectedCallback();
  }

  ring(timer) {
    const now = Date.now() / 1000;
    const left = Math.max(0, timer.ends - now);
    const pct = Math.max(0, Math.min(1, left / timer.total));
    const r = 26;
    const c = 2 * Math.PI * r;
    const [fg] = this.tones().amber;
    return `<div class="ring"><div style="position:relative;width:72px;height:72px"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--divider-color)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${fg}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${hrDuration(left)}</div></div><div class="tname">${hrEsc(timer.name)}</div><div class="row"><button class="btn" data-extend="${hrEsc(timer.entity_id)}" aria-label="${hrT(this._hass, 'extend')}">+15</button><button class="btn" data-off="${hrEsc(timer.entity_id)}" aria-label="${hrT(this._hass, 'turn_off')}"><ha-icon icon="mdi:power" style="--mdc-icon-size:16px"></ha-icon></button></div></div>`;
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

const HR_RESULT_TONE = { ok: 'green', skipped: 'grey', active: 'red', failed: 'red' };

class HouseRulesActivityCard extends HouseRulesBase {
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

// What the panel reuses (it loads this module first): no copy of the scene, icons, tones and labels.
window.__houseRulesShared = {
  scene: hrScene,
  icons: HR_ICONS,
  tone: HR_TONE,
  tones: { light: HR_TONES_LIGHT, dark: HR_TONES_DARK },
  esc: hrEsc,
  duration: hrDuration,
  t: hrT,
  strings: HR_STRINGS,
  animCss: HR_ANIM_CSS,
};

const HR_CARDS = [
  ['house-rules-card', HouseRulesCard, 'House Rules', 'Overview of your house rules: alerts and one tile per rule type.'],
  ['house-rules-mini-card', HouseRulesMiniCard, 'House Rules (mini)', 'House Rules folded to its illustrated header.'],
  ['house-rules-timers-card', HouseRulesTimersCard, 'House Rules timers', 'Running auto-off timers: +15 min, turn off.'],
  ['house-rules-activity-card', HouseRulesActivityCard, 'House Rules activity', 'What the house rules did, filterable.'],
];
window.customCards = window.customCards || [];
for (const [tag, cls, name, description] of HR_CARDS) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  if (!window.customCards.some((c) => c.type === tag)) window.customCards.push({ type: tag, name, description, preview: true });
}
console.info(`%c HOUSE-RULES-CARDS %c ${HR_VERSION} `, 'color:#fff;background:#4f46e5;font-weight:700', '');
