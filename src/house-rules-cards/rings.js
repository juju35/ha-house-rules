/** Every second, the countdown rings under root move on in place (no re-render: buttons keep hover and focus,
 * an open form or editor stays as it is). A ring: [data-ring-ends][data-ring-total] around .arc and .ringlabel. */
import { HR_RING_C } from "./subscription.js";

export function hrTickRings(root) {
  const now = Date.now() / 1000;
  for (const el of root?.querySelectorAll('[data-ring-ends]') || []) {
    const left = Math.max(0, Number(el.dataset.ringEnds) - now);
    const pct = Math.max(0, Math.min(1, left / (Number(el.dataset.ringTotal) || 1)));
    el.querySelector('.arc')?.setAttribute('stroke-dashoffset', (HR_RING_C * (1 - pct)).toFixed(1));
    const label = el.querySelector('.ringlabel');
    const text = hrDuration(left);
    if (label && label.textContent !== text) label.textContent = text;
  }
}

export function hrDuration(seconds) {
  seconds = Math.max(0, Math.round(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')}`;
  if (m >= 10) return `${m} min`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function hrTime(hass, ts) {
  try {
    return new Date(ts * 1000).toLocaleTimeString(hass?.locale?.language || undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_err) {
    return '';
  }
}
