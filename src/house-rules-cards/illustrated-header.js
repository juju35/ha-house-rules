// ---------- illustrated header: objects on the ground bar, one per configured family, coloured by status ----------
import { HR_TONE, HR_TONE_RANK } from "./core.js";

export const HR_FAMILY = {
  plug: ['keep_on', 'auto_off'],
  lamp: ['presence_light', 'sensor_flash'],
  robot: ['vacuum_follow', 'vacuum_guard'],
  lock: ['lock_guard'],
  bell: ['sensor_chime'],
  appliance: ['appliance_resume', 'cycle_done'],
  drop: ['leak_guard'],
};
export const HR_SCENE_MAX = 4;
export const HR_COLOR = { red: '#EF4444', amber: '#F59E0B', blue: '#3B82F6', green: '#16A34A', grey: '#9AA3B1' };

export function hrFamilyTone(rules, family) {
  let best = null;
  for (const r of rules) {
    if (!HR_FAMILY[family].includes(r.type)) continue;
    const tone = HR_TONE[r.state] || 'grey';
    if (best === null || HR_TONE_RANK[tone] > HR_TONE_RANK[best]) best = tone;
  }
  return best;
}

export function hrScene(rules, night) {
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
  // At most HR_SCENE_MAX objects, so the scene never runs under the title: the most urgent families (red first, then
  // amber, blue, green, grey; ties in the usual order), drawn in the usual order so an object keeps its place.
  const families = Object.keys(HR_FAMILY);
  const tones = Object.fromEntries(families.map((f) => [f, hrFamilyTone(rules, f)]));
  const shown = new Set(
    families
      .filter((f) => tones[f] !== null)
      .sort((a, b) => HR_TONE_RANK[tones[b]] - HR_TONE_RANK[tones[a]] || families.indexOf(a) - families.indexOf(b))
      .slice(0, HR_SCENE_MAX),
  );
  let x = 0;
  let svg = '';
  for (const family of families) {
    if (!shown.has(family)) continue;
    const tone = tones[family];
    svg += `<g transform="translate(${x},0)">${draw[family](HR_COLOR[tone], tone)}</g>`;
    x += width[family] + 22;
  }
  if (!svg) svg = draw.plug(HR_COLOR.grey, 'grey');
  return `<svg class="hr-scene" aria-hidden="true" width="${Math.max(x, 60)}" height="90" viewBox="0 0 ${Math.max(x, 60)} 90">${svg}</svg>`;
}
