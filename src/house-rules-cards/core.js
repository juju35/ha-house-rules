import { HR_STRINGS } from "./i18n/strings.js";

export const HR_VERSION = '1.8.9';


export function hrLang(hass) {
  const lang = hass?.locale?.language || hass?.language || 'en';
  if (HR_STRINGS[lang]) return lang;
  const base = lang.split('-')[0];
  return HR_STRINGS[base] ? base : 'en';
}

export function hrT(hass, key, vars = {}) {
  const table = HR_STRINGS[hrLang(hass)];
  let text = table[key] ?? HR_STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  return text;
}

export function hrCount(hass, key, n) {
  return hrT(hass, n === 1 ? `${key}_one` : `${key}_other`, { n });
}

export const HR_ICONS = {
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
export const HR_TYPE_ORDER = Object.keys(HR_ICONS);

// Rule state -> tone of the charter (red alert, amber active, blue waiting, green armed, grey rest).
export const HR_TONE = {
  alert: 'red',
  failed: 'red',
  active: 'amber',
  waiting: 'blue',
  armed: 'green',
  idle: 'grey',
  disabled: 'grey',
  snoozed: 'grey',
};
export const HR_TONE_RANK = { red: 4, amber: 3, blue: 2, green: 1, grey: 0 };

export const HR_FILTERS = {
  all: null,
  alerts: ['sensor_flash', 'leak_guard', 'vacuum_guard'],
  plugs: ['keep_on', 'auto_off'],
  lights: ['presence_light', 'vacuum_follow', 'sensor_flash'],
  vacuum: ['vacuum_follow', 'vacuum_guard'],
  appliances: ['appliance_resume', 'cycle_done'],
};
