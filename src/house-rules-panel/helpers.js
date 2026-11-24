// Shared with the cards module (loaded first by the panel): scene, icons, tones, labels of types/states/results.
export const hrs = () => window.__houseRulesShared;
export const hrpEsc = (text) => hrs().esc(text);
export const HRP_TYPES = [
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
export const HRP_RESULT_TONE = { ok: 'green', skipped: 'grey', active: 'red', failed: 'red' };
// Templates of a new rule, one per type (YAML, edited before saving).
export const HRP_TEMPLATES = {
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
  presence_light:
    'id: hall_presence\ntype: presence_light\nroom: Hall\ndark_below: 30\non_after: 2\noff_delay: "00:00:30"\nslots:\n  - {start: "22:00", end: "07:00", brightness: 20}\n',
  lock_guard: 'id: front_lock\ntype: lock_guard\nlock: lock.front_door\ndoor: binary_sensor.front_door\nlock_after: "00:00:30"\n',
  leak_guard:
    'id: kitchen_leak\ntype: leak_guard\nsensors: [binary_sensor.sink_leak]\ncut: [switch.dishwasher]\nlights: [light.hall]\n',
};
