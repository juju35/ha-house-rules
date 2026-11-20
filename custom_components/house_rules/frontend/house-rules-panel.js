// House Rules sidebar panel (administrators): Activity, Rules, Rooms, Journal, Settings.
// Plain web component, no build. Data: house_rules/subscribe; writes: house_rules/* WebSocket commands.
// The panel draws its own content (it does not embed the Lovelace cards).

const HOUSE_RULES_PANEL_VERSION = '1.0.0';

const HRP_STRINGS = {
  en: {
    tabs: { activity: 'Activity', rules: 'Rules', rooms: 'Rooms', journal: 'Journal', yaml: 'YAML', settings: 'Settings' },
    subtitle: '{rules} rules · {alerts} · {timers}',
    alerts_one: '1 alert',
    alerts_other: '{n} alerts',
    no_alert: 'no alert',
    timers_one: '1 timer',
    timers_other: '{n} timers',
    no_timer: 'no timer',
    all_good: 'All good',
    in_progress: 'In progress',
    timers: 'Timed off',
    watch: 'Watching',
    latest: 'Latest',
    see_journal: 'See the journal',
    acknowledge: 'Acknowledge',
    snooze15: 'Snooze 15 min',
    resume: 'Resume',
    extend: '+15 min',
    turn_off: 'Turn off',
    test: 'Test',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    new_rule: 'New rule',
    all: 'All',
    rule_yaml: 'Rule (YAML)',
    reloaded: '{file} changed at {time} · {n} rules reloaded',
    yaml_invalid: 'house_rules.yaml is invalid ({where}): {error}. The last valid configuration keeps running; editing is paused.',
    conflict_title: 'The file changed while you were editing',
    conflict_file: 'File',
    conflict_panel: 'Panel',
    keep_file: 'Keep the file',
    keep_panel: 'Keep the panel',
    confirm_delete: 'Delete the rule {name}?',
    room: 'Room',
    light: 'Light',
    opening: 'Opening',
    climate: 'Air conditioner',
    presence: 'Presence',
    illuminance: 'Illuminance',
    add_room: 'Add a room',
    rooms_help: 'Room names as the vacuum reports them. Used by the vacuum and presence rules.',
    remove: 'Remove',
    today: "Today's runs",
    search: 'Search a rule or an entity',
    failures: 'Failures',
    source: 'Configuration source',
    source_yaml: 'YAML',
    source_storage: 'Storage',
    modified: 'Modified at {time}',
    reload: 'Reload',
    switch_yaml: 'Switch to YAML',
    switch_yaml_help: 'Writes /config/house_rules.yaml from the current configuration. The file is the source from then on, editable from both sides.',
    yaml_help: 'Panel saves rewrite only the block of the rule (by id), comments kept, with a .bak copy. Changes made in the file are reloaded within seconds.',
    conditions: 'Global conditions',
    quiet_hours: 'Quiet hours',
    quiet_help: 'Lights and sounds muted, notifications only (for the rules that respect it).',
    notify: 'Default notification target',
    alarm: 'Alarm entity',
    repairs: 'Repairs when a rule gives up',
    vacation: 'Vacation mode',
    import: 'Import',
    import_help: 'Rules proposed from your labels and automations. Imported automations are turned off, never deleted.',
    analyze: 'Analyze',
    import_selected: 'Import {n}',
    nothing_found: 'Nothing to import.',
    yaml_file_help: 'The whole {path}, as written. Saving checks the YAML and every rule first, keeps a .bak copy, and only the rules that changed restart.',
    yaml_includes: 'Parts of the configuration come from included files: they are edited in their own files or in the Rules and Rooms tabs.',
    yaml_storage_help: 'The configuration is stored by the integration: this is it as YAML, read only. Switch to YAML to edit it here and in the file.',
    copied: 'Copied',
    revert: 'Revert',
    unsaved: 'Not saved',
    copy: 'Copy',
    saved: 'Saved',
    people_home: '{n} at home',
    nobody_home: 'Nobody home',
    ok: 'OK',
    'blocked.vacation': 'paused (vacation)',
    'blocked.away': 'paused (nobody home)',
    'blocked.alarm': 'paused (alarm armed)',
  },
  fr: {
    tabs: { activity: 'Activité', rules: 'Règles', rooms: 'Pièces', journal: 'Journal', yaml: 'YAML', settings: 'Réglages' },
    subtitle: '{rules} règles · {alerts} · {timers}',
    alerts_one: '1 alerte',
    alerts_other: '{n} alertes',
    no_alert: 'aucune alerte',
    timers_one: '1 minuteur',
    timers_other: '{n} minuteurs',
    no_timer: 'aucun minuteur',
    all_good: 'Tout va bien',
    in_progress: 'En cours',
    timers: 'Extinctions temporisées',
    watch: 'Surveillance',
    latest: 'Derniers déclenchements',
    see_journal: 'Voir le journal',
    acknowledge: 'Acquitter',
    snooze15: 'Snooze 15 min',
    resume: 'Reprendre',
    extend: '+15 min',
    turn_off: 'Éteindre',
    test: 'Tester',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    new_rule: 'Nouvelle règle',
    all: 'Toutes',
    rule_yaml: 'Règle (YAML)',
    reloaded: '{file} modifié à {time} · {n} règles rechargées',
    yaml_invalid: "house_rules.yaml est invalide ({where}) : {error}. La dernière configuration valide continue de tourner ; l'édition est suspendue.",
    conflict_title: "Le fichier a changé pendant l'édition",
    conflict_file: 'Fichier',
    conflict_panel: 'Panneau',
    keep_file: 'Garder le fichier',
    keep_panel: 'Garder le panneau',
    confirm_delete: 'Supprimer la règle {name} ?',
    room: 'Pièce',
    light: 'Lumière',
    opening: 'Ouverture',
    climate: 'Climatisation',
    presence: 'Présence',
    illuminance: 'Luminosité',
    add_room: 'Ajouter une pièce',
    rooms_help: "Noms de pièces tels que l'aspirateur les expose. Utilisée par les règles aspirateur et présence.",
    remove: 'Retirer',
    today: "Déclenchements aujourd'hui",
    search: 'Rechercher une règle ou une entité',
    failures: 'Échecs',
    source: 'Source de la configuration',
    source_yaml: 'YAML',
    source_storage: 'Stockage',
    modified: 'Modifié à {time}',
    reload: 'Recharger',
    switch_yaml: 'Passer en YAML',
    switch_yaml_help: 'Écrit /config/house_rules.yaml depuis la configuration actuelle. Le fichier fait foi ensuite, éditable des deux côtés.',
    yaml_help: "Chaque enregistrement réécrit uniquement le bloc de la règle (par id), commentaires conservés, avec une copie .bak. Les modifications du fichier sont rechargées en quelques secondes.",
    conditions: 'Conditions globales',
    quiet_hours: 'Plage silencieuse',
    quiet_help: 'Lumières et sons coupés, notification seule (pour les règles qui la respectent).',
    notify: 'Cible de notification par défaut',
    alarm: "Entité d'alarme",
    repairs: 'Signalement Réparations quand une règle abandonne',
    vacation: 'Mode vacances',
    import: 'Import',
    import_help: 'Règles proposées depuis vos labels et automatisations. Les automatisations importées sont désactivées, jamais supprimées.',
    analyze: 'Analyser',
    import_selected: 'Importer {n}',
    nothing_found: 'Rien à importer.',
    yaml_file_help: "Tout le fichier {path}, tel qu'il est écrit. L'enregistrement vérifie d'abord le YAML et chaque règle, garde une copie .bak, et seules les règles modifiées redémarrent.",
    yaml_includes: 'Une partie de la configuration vient de fichiers inclus : elle se modifie dans ces fichiers ou dans les onglets Règles et Pièces.',
    yaml_storage_help: "La configuration est stockée par l'intégration : la voici en YAML, en lecture seule. Passez en YAML pour la modifier ici et dans le fichier.",
    copied: 'Copié',
    revert: 'Annuler les modifications',
    unsaved: 'Non enregistré',
    copy: 'Copier',
    saved: 'Enregistré',
    people_home: '{n} à la maison',
    nobody_home: 'Personne à la maison',
    ok: 'OK',
    'blocked.vacation': 'en pause (vacances)',
    'blocked.away': 'en pause (personne à la maison)',
    'blocked.alarm': 'en pause (alarme armée)',
  },
};

// Shared with the cards module (loaded first by the panel): scene, icons, tones, labels of types/states/results.
const hrs = () => window.__houseRulesShared;
const hrpEsc = (text) => hrs().esc(text);
const HRP_TYPES = [
  'keep_on',
  'auto_off',
  'sensor_flash',
  'sensor_chime',
  'appliance_resume',
  'cycle_done',
  'vacuum_follow',
  'vacuum_guard',
  'presence_light',
  'lock_guard',
  'leak_guard',
];
const HRP_RESULT_TONE = { ok: 'green', skipped: 'grey', active: 'red', failed: 'red' };
// Templates of a new rule, one per type (YAML, edited before saving).
const HRP_TEMPLATES = {
  keep_on: 'id: my_plug\ntype: keep_on\nentity_id: switch.my_plug\ndelay: "00:00:10"\nmax_attempts: 3\n',
  auto_off: 'id: kettle\ntype: auto_off\nentity_id: switch.kettle\nduration: "00:05:00"\n',
  sensor_flash:
    'id: door_alert\ntype: sensor_flash\ntrigger:\n  entity_id: binary_sensor.door\n  to: "on"\n  for: "00:02:00"\nlights: [light.hall]\ncolor: [255, 0, 0]\nrespect: [quiet_hours]\nescalation:\n  - after: "00:05:00"\n    notify: critical\n',
  sensor_chime:
    'id: door_chime\ntype: sensor_chime\ntrigger:\n  entity_id: binary_sensor.front_door\nmedia_player: media_player.living_room\nmedia: media-source://media_source/local/chime.mp3\nvolume: 0.4\nwindows:\n  - {start: "09:00", end: "21:00"}\n',
  appliance_resume:
    'id: dishwasher\ntype: appliance_resume\nswitch: switch.dishwasher\nprogress: sensor.dishwasher_progress\nmax_attempts: 2\n',
  cycle_done:
    'id: washing_machine\ntype: cycle_done\npower_entity: sensor.washing_machine_power\ndone_below: 3\ndone_for: "00:03:00"\ndoor: binary_sensor.washing_machine_door\nreminder: "00:30:00"\n',
  vacuum_follow: 'id: vacuum_lights\ntype: vacuum_follow\nvacuum: vacuum.robot\nroom_sensor: sensor.robot_current_room\ntransition: 10\n',
  vacuum_guard: 'id: vacuum_guard\ntype: vacuum_guard\nvacuum: vacuum.robot\nroom_sensor: sensor.robot_current_room\n',
  presence_light: 'id: hall_presence\ntype: presence_light\nroom: Hall\ndark_below: 30\noff_delay: "00:00:30"\n',
  lock_guard: 'id: front_lock\ntype: lock_guard\nlock: lock.front_door\ndoor: binary_sensor.front_door\nlock_after: "00:00:30"\n',
  leak_guard:
    'id: kitchen_leak\ntype: leak_guard\nsensors: [binary_sensor.sink_leak]\ncut: [switch.dishwasher]\nlights: [light.hall]\n',
};

class HouseRulesPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = undefined;
    this._ui = { tab: 'activity', filter: null, editing: null, search: '', jfilter: 'all', rooms: null, settings: null };
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

  set narrow(_v) {}
  set panel(_v) {}

  connectedCallback() {
    if (this._hass && !this._unsub) this._subscribe();
  }

  disconnectedCallback() {
    this._unsub?.then((u) => u()).catch(() => {});
    this._unsub = null;
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
    this.shadowRoot.innerHTML = `<style>${HRP_CSS}${hrs().animCss}</style><div class="page" style="${this.vars()}">${this.top()}<main>${content}</main>${this.dialog()}</div>`;
    this.bind();
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
    const r = 26;
    const c = 2 * Math.PI * r;
    return `<div style="position:relative;width:${size}px;height:${size}px;flex:none"><svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--divider-color)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${this.tone('amber')[0]}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg><div class="ringlabel">${this.dur(left)}</div></div>`;
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
    const watch = (d.rules || [])
      .filter((r) => r.state !== 'alert')
      .map((r) => this.tile(hrs().icons[r.type], hrs().tone[r.state] || 'grey', r.name, this.ruleLine(r)))
      .join('');
    const latest = [...(d.journal || [])]
      .reverse()
      .slice(0, 8)
      .map((e) => this.journalRow(e))
      .join('');
    return `<div class="cols"><div class="main">${alerts ? `<section><h2>${this.t('in_progress')}</h2>${alerts}</section>` : ''}${timers ? `<section><h2>${this.t('timers')} · ${(d.timers || []).length}</h2><div class="tiles">${timers}</div></section>` : ''}<section><h2>${this.t('watch')}</h2><div class="tiles">${watch}</div></section></div><aside class="card side"><h2>${this.t('latest')}</h2><ul>${latest}</ul><button class="link" data-tab="journal">${this.t('see_journal')}</button></aside></div>`;
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
            return `<div class="rrow ${sel ? 'sel' : ''}">${this.icon(hrs().icons[r.type], tone)}<div class="grow" style="flex:1 1 220px"><div class="tname">${hrpEsc(r.name)}</div><div class="sub small">${hrpEsc(r.id)}</div></div><span class="tstate" style="color:${this.tone(tone)[0]};min-width:120px">${hrpEsc(this.ruleLine(r))}</span><button class="btn sm" data-test="${hrpEsc(r.id)}"><ha-icon icon="mdi:play" style="--mdc-icon-size:14px"></ha-icon>${this.t('test')}</button>${r.state === 'snoozed' ? `<button class="btn sm" data-unsnooze="${hrpEsc(r.id)}">${this.t('resume')}</button>` : ''}<label class="sw"><input type="checkbox" data-enable="${hrpEsc(r.id)}" ${r.state !== 'disabled' ? 'checked' : ''} aria-label="${hrpEsc(r.name)}"><span></span></label><button class="btn sm" data-edit="${hrpEsc(r.id)}">${this.t('edit')}</button></div>`;
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
  tab_rooms() {
    const rooms = this._ui.rooms || JSON.parse(JSON.stringify(this._data.rooms || {}));
    this._ui.rooms = rooms;
    const fields = ['light', 'opening', 'climate', 'presence', 'illuminance'];
    const head = `<tr><th>${this.t('room')}</th>${fields.map((f) => `<th>${this.t(f)}</th>`).join('')}<th></th></tr>`;
    const rows = Object.entries(rooms)
      .map(([name, room], i) => {
        const cells = fields
          .map((f) => {
            let v = room[f] ?? '';
            if (Array.isArray(v)) v = v.join(', ');
            const st = (Array.isArray(room[f]) ? room[f][0] : room[f]) && this._hass.states[Array.isArray(room[f]) ? room[f][0] : room[f]];
            return `<td><input class="cell" id="room-${i}-${f}" data-room="${i}" data-field="${f}" value="${hrpEsc(v)}" placeholder="—" aria-label="${hrpEsc(name)} ${this.t(f)}">${st ? `<div class="sub small">${hrpEsc(st.state)}${st.attributes?.unit_of_measurement ? ` ${hrpEsc(st.attributes.unit_of_measurement)}` : ''}</div>` : ''}</td>`;
          })
          .join('');
        return `<tr><td><input class="cell name" id="room-${i}-name" data-room="${i}" data-field="__name" value="${hrpEsc(name)}" aria-label="${this.t('room')}"></td>${cells}<td><button class="rbtn plain" data-remove-room="${i}" aria-label="${this.t('remove')}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></td></tr>`;
      })
      .join('');
    const dirty = JSON.stringify(rooms) !== JSON.stringify(this._data.rooms || {});
    return `<div class="stack"><div class="row wrap"><div class="grow"><div class="ttl">${this.t('tabs').rooms}</div><div class="sub">${this.t('rooms_help')}</div></div><button class="btn" data-action="add-room"><ha-icon icon="mdi:plus" style="--mdc-icon-size:16px"></ha-icon>${this.t('add_room')}</button>${dirty ? `<button class="btn" data-action="reset-rooms">${this.t('cancel')}</button><button class="btn primary" data-action="save-rooms">${this.t('save')}</button>` : ''}</div><div class="card scroll"><table>${head}${rows}</table></div></div>`;
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
    return `<div class="stack"><div class="row wrap">${this.pill(file ? this.t('source_yaml') : this.t('source_storage'), file ? 'indigo' : 'grey')}<div class="grow sub">${hrpEsc(help)}</div>${dirty ? this.pill(this.t('unsaved'), 'amber') : ''}<button class="btn" data-action="copy">${this.t('copy')}</button>${file ? `${dirty ? `<button class="btn" data-action="yaml-revert">${this.t('revert')}</button>` : ''}<button class="btn primary" data-action="yaml-save" ${dirty ? '' : 'disabled'}>${this.t('save')}</button>` : `<button class="btn primary" data-action="switch-yaml">${this.t('switch_yaml')}</button>`}</div>${inc}${err}<textarea id="hrp-file" class="file" spellcheck="false" ${file ? '' : 'readonly'} aria-label="YAML">${hrpEsc(y.text)}</textarea></div>`;
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
        ${dirty ? `<div class="row end"><button class="btn" data-action="reset-settings">${this.t('cancel')}</button><button class="btn primary" data-action="save-settings">${this.t('save')}</button></div>` : ''}
      </section>
      <section class="card pad"><div class="row">${this.icon('mdi:import', 'indigo')}<div class="ttl">${this.t('import')}</div></div><p class="sub small">${this.t('import_help')}</p>${importBody}</section>
    </div>`;
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
    on('[data-room]', 'input', (el) => this.roomInput(el));
    on('[data-remove-room]', 'click', (el) => {
      const entries = Object.entries(this._ui.rooms);
      entries.splice(Number(el.dataset.removeRoom), 1);
      this._ui.rooms = Object.fromEntries(entries);
      this._render();
    });
    on('[data-prop]', 'change', (el) => {
      this._ui.proposals[Number(el.dataset.prop)].checked = el.checked;
      this._render();
    });
    on('#qh-start, #qh-end, #set-alarm, #set-notify, #set-repairs', 'change', () => this.settingsInput());
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
          let n = 1;
          while (this._ui.rooms[`Room ${n}`]) n++;
          this._ui.rooms[`Room ${n}`] = {};
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

  roomInput(el) {
    const entries = Object.entries(this._ui.rooms);
    const i = Number(el.dataset.room);
    const [name, room] = entries[i];
    if (el.dataset.field === '__name') {
      entries[i] = [el.value, room];
    } else {
      const value = el.value.trim();
      if (!value) delete room[el.dataset.field];
      else if (el.dataset.field === 'opening' && value.includes(','))
        room.opening = value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      else room[el.dataset.field] = value;
      entries[i] = [name, room];
    }
    this._ui.rooms = Object.fromEntries(entries);
    const dirtyBtn = this.shadowRoot.querySelector('[data-action="save-rooms"]');
    if (!dirtyBtn) this._render();
  }

  cleanRooms() {
    const out = {};
    for (const [name, room] of Object.entries(this._ui.rooms || {})) {
      if (!name.trim()) continue;
      out[name.trim()] = Object.fromEntries(Object.entries(room).filter(([, v]) => v !== '' && v != null));
    }
    return out;
  }

  settingsInput() {
    const r = this.shadowRoot;
    const s = this._ui.settings;
    const start = r.getElementById('qh-start').value;
    const end = r.getElementById('qh-end').value;
    s.quiet_hours = start && end ? { start, end } : null;
    s.alarm = r.getElementById('set-alarm').value.trim() || null;
    s.notify = r.getElementById('set-notify').value.trim() || null;
    s.repairs = r.getElementById('set-repairs').checked;
    this._render();
  }

  cleanSettings() {
    return Object.fromEntries(Object.entries(this._ui.settings || {}).filter(([, v]) => v !== null && v !== ''));
  }
}

const HRP_CSS = `
  :host { display: block; height: 100%; background: var(--primary-background-color); color: var(--primary-text-color); }
  .page { min-height: 100%; }
  .hdr { position: relative; height: 96px; overflow: hidden; background: var(--hr-sky); }
  .hdr .hr-scene { position: absolute; right: 24px; bottom: 5px; opacity: .9; }
  .hdr .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: var(--hr-ground); }
  .hdrc { position: absolute; left: 16px; right: 24px; top: 22px; display: flex; align-items: center; gap: 12px; }
  .hdrc .row { margin-right: min(360px, 30vw); }
  .menu { display: none; }
  @media (max-width: 870px) { .menu { display: inline-flex; } .hdrc .row { margin-right: 0; } .hdr .hr-scene { opacity: .35; } }
  .tabs { display: flex; flex-wrap: wrap; padding: 0 24px; background: var(--card-background-color); border-bottom: 1px solid var(--divider-color); }
  .tab { padding: 12px 4px; margin-right: 24px; font: 600 14px inherit; color: var(--secondary-text-color); background: none; border: 0; border-bottom: 3px solid transparent; cursor: pointer; }
  .tab.on { color: var(--primary-text-color); font-weight: 700; border-bottom-color: var(--primary-color); }
  main { max-width: 1232px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
  h2 { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--secondary-text-color); margin: 0 0 8px; }
  section { display: flex; flex-direction: column; gap: 8px; }
  .stack { display: flex; flex-direction: column; gap: 16px; }
  .cols { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
  .main { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 24px; }
  .side { flex: 1 1 320px; min-width: 0; padding: 16px; }
  .editor { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 12px; }
  .card { background: var(--card-background-color); border-radius: 16px; box-shadow: 0 0 0 1px var(--divider-color); }
  .pad { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(520px, 100%), 1fr)); gap: 20px; align-items: start; }
  .grid2.tight { gap: 10px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .tile { position: relative; display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: var(--hr-tile); min-width: 0; }
  .rrow { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: var(--hr-tile); flex-wrap: wrap; }
  .rrow.sel { box-shadow: inset 0 0 0 2px var(--primary-color); }
  .ico { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; }
  .ico ha-icon { --mdc-icon-size: 22px; }
  .ttl { font-weight: 700; font-size: 16px; line-height: 20px; }
  .sub { font-size: 13px; line-height: 18px; color: var(--secondary-text-color); }
  .small { font-size: 12px; line-height: 16px; }
  .grow { flex: 1; min-width: 0; }
  .row { display: flex; gap: 8px; align-items: center; }
  .row.wrap { flex-wrap: wrap; }
  .row.end { justify-content: flex-end; flex-wrap: wrap; }
  .tname { font-weight: 700; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tname.wrap { white-space: normal; }
  .lname { font-size: 13px; font-weight: 600; }
  .tstate { font-size: 12px; line-height: 16px; font-weight: 600; }
  .badge { position: absolute; top: 8px; right: 8px; width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 2px var(--hr-tile); }
  .pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--divider-color); background: transparent; color: var(--primary-text-color); font: 600 13px inherit; cursor: pointer; }
  .btn:hover { background: color-mix(in srgb, var(--primary-text-color) 6%, transparent); }
  .btn.sm { min-height: 32px; }
  .btn.red { border-color: var(--hr-red); color: var(--hr-red); }
  .btn.primary { border-color: var(--primary-color); color: var(--primary-color); }
  .btn[disabled] { opacity: .5; cursor: default; }
  .rbtn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--divider-color); background: color-mix(in srgb, var(--card-background-color) 70%, transparent); color: var(--primary-text-color); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; flex: none; }
  .rbtn.plain { border: 0; background: transparent; }
  .rbtn ha-icon { --mdc-icon-size: 18px; }
  .banner { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; padding: 16px; border-radius: 14px; background: var(--hr-red-bg); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hr-red) 35%, transparent); }
  .note { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--primary-color) 14%, transparent); font-size: 13px; }
  .note.red { background: var(--hr-red-bg); color: var(--hr-red); }
  .note ha-icon { --mdc-icon-size: 16px; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip { height: 32px; border: 0; border-radius: 16px; padding: 0 12px; cursor: pointer; font: 600 13px inherit; background: var(--card-background-color); color: var(--primary-text-color); box-shadow: inset 0 0 0 1px var(--divider-color); }
  .chip.on { background: var(--primary-color); color: var(--text-primary-color, #fff); box-shadow: none; }
  .sw { position: relative; display: inline-block; width: 40px; height: 24px; flex: none; }
  .sw input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
  .sw span { position: absolute; inset: 0; border-radius: 12px; background: var(--divider-color); pointer-events: none; }
  .sw span::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
  .sw input:checked + span { background: var(--primary-color); }
  .sw input:checked + span::after { left: 19px; }
  .field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; color: var(--secondary-text-color); }
  textarea, select, .cell { font: 13px/20px var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace); color: var(--primary-text-color); background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 10px; padding: 8px 10px; box-sizing: border-box; }
  select, .cell { font-family: inherit; height: 38px; padding: 0 10px; }
  .cell.name { font-weight: 700; }
  textarea { min-height: 320px; resize: vertical; width: 100%; tab-size: 2; }
  textarea.file { min-height: calc(100vh - 260px); }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; min-width: 820px; }
  th { text-align: left; font-size: 12px; font-weight: 700; color: var(--secondary-text-color); padding: 10px 12px; border-bottom: 1px solid var(--divider-color); white-space: nowrap; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--divider-color); vertical-align: top; }
  td .cell { width: 100%; min-width: 150px; }
  .when { font-size: 12px; color: var(--secondary-text-color); width: 44px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--divider-color); }
  .link { background: none; border: 0; color: var(--primary-color); font: 600 13px inherit; padding: 12px 0; cursor: pointer; }
  .ringlabel { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
  .srow { display: flex; gap: 16px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--divider-color); flex-wrap: wrap; }
  .srcbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px; background: var(--hr-tile); }
  .prow { display: flex; gap: 10px; align-items: center; padding: 8px 0; cursor: pointer; }
  .empty { padding: 24px; color: var(--secondary-text-color); }
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh; z-index: 10; }
  .dlg { width: min(760px, 92vw); padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 0 0 2px #F59E0B, 0 10px 30px rgba(0,0,0,.2); }
  .diff { padding: 10px 12px; border-radius: 10px; font-size: 12px; }
  .diff.a { background: color-mix(in srgb, #F59E0B 18%, transparent); }
  .diff.b { background: color-mix(in srgb, var(--primary-color) 16%, transparent); }
  .diff pre { margin: 6px 0 0; white-space: pre-wrap; font: 12px/18px var(--code-font-family, ui-monospace, monospace); }
  code { font-size: 13px; }
`;

if (!customElements.get('house-rules-panel')) customElements.define('house-rules-panel', HouseRulesPanel);
