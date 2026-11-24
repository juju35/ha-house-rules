// What the panel reuses (it loads this module first): no copy of the scene, icons, tones and labels.
import { pickerDefine } from "./card-picker.js";
import { HR_ICONS, HR_TONE, HR_VERSION, hrT } from "./core.js";
import { HR_RING_C, HR_RING_R, hrEsc } from "./subscription.js";
import { hrDuration, hrTickRings } from "./rings.js";
import { hrScene } from "./illustrated-header.js";
import { HR_ANIM_CSS, HR_TONES_DARK, HR_TONES_LIGHT } from "./styles.js";
import { HouseRulesCard, HouseRulesMiniCard } from "./overview-card.js";
import { HouseRulesTimersCard } from "./timers-card.js";
import { HouseRulesActivityCard } from "./activity-card.js";
import { HR_STRINGS } from "./i18n/strings.js";

window.__houseRulesShared = {
  scene: hrScene,
  icons: HR_ICONS,
  tone: HR_TONE,
  tones: { light: HR_TONES_LIGHT, dark: HR_TONES_DARK },
  esc: hrEsc,
  duration: hrDuration,
  ring: { r: HR_RING_R, c: HR_RING_C },
  tickRings: hrTickRings,
  t: hrT,
  strings: HR_STRINGS,
  animCss: HR_ANIM_CSS,
};

export const HR_CARDS = [
  ['house-rules-card', HouseRulesCard, 'House Rules', 'Overview of your house rules: alerts and one tile per rule type.'],
  ['house-rules-mini-card', HouseRulesMiniCard, 'House Rules (mini)', 'House Rules folded to its illustrated header.'],
  ['house-rules-timers-card', HouseRulesTimersCard, 'House Rules timers', 'Running auto-off timers: +15 min, turn off.'],
  ['house-rules-activity-card', HouseRulesActivityCard, 'House Rules activity', 'What the house rules did, filterable.'],
];
window.customCards = window.customCards || [];
for (const [tag, cls, name, description] of HR_CARDS) {
  if (!customElements.get(tag)) pickerDefine(tag, cls);
  if (!window.customCards.some((c) => c.type === tag)) window.customCards.push({ type: tag, name, description, preview: true });
}
console.info(`%c HOUSE-RULES-CARDS %c ${HR_VERSION} `, 'color:#fff;background:#4f46e5;font-weight:700', '');
