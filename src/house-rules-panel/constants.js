// House Rules sidebar panel (administrators): Activity, Rules, Rooms, Journal, Settings.
// Plain web component (ES modules in src/house-rules-panel/, assembled by scripts/build-frontend.mjs). Data: house_rules/subscribe; writes: house_rules/* WebSocket commands.
// The panel draws its own content (it does not embed the Lovelace cards).
export const HOUSE_RULES_PANEL_VERSION = '1.8.7';

// Rooms tab: the sections of a room (as on Smart Comfort's Rooms tab), the entities each field takes, the list fields.
export const HRP_WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const HRP_ROOM_LISTS = ['lights', 'opening', 'presence'];
export const HRP_ROOM_FILTERS = {
  lights: [{ domain: 'light' }],
  opening: [{ domain: 'binary_sensor', device_class: ['door', 'window', 'opening', 'garage_door'] }],
  presence: [{ domain: 'binary_sensor', device_class: ['occupancy', 'motion', 'presence'] }],
  illuminance: [{ domain: 'sensor', device_class: ['illuminance'] }],
  climate: [{ domain: 'climate' }],
  naps: [{ domain: 'schedule' }, { domain: 'input_boolean' }, { domain: 'binary_sensor' }, { domain: 'switch' }],
};
export const HRP_ROOM_LABELS = {
  lights: 'rm_light',
  opening: 'rm_opening',
  presence: 'rm_presence_sensor',
  illuminance: 'rm_illuminance',
  climate: 'rm_climate',
  naps: 'rm_nap_schedule',
};
export const HRP_ROOM_SECTIONS = [
  { key: 'lights', icon: 'mdi:lightbulb-outline', fields: [{ f: 'lights', list: true, label: 'rm_light' }] },
  { key: 'openings', icon: 'mdi:window-closed-variant', fields: [{ f: 'opening', list: true, label: 'rm_opening' }] },
  {
    key: 'presence',
    icon: 'mdi:motion-sensor',
    fields: [
      { f: 'presence', list: true, label: 'rm_presence_sensor' },
      { f: 'illuminance', label: 'rm_illuminance' },
    ],
  },
  { key: 'devices', icon: 'mdi:air-conditioner', fields: [{ f: 'climate', label: 'rm_climate' }] },
  { key: 'naps', icon: 'mdi:weather-night', naps: true },
];
