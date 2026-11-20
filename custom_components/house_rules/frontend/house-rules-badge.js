// House Rules' sidebar badge, loaded on every page: the number of rules in alert on the panel's sidebar item, in red,
// like Home Assistant's own notifications count; with no alert, the number of running auto-off timers in the accent
// colour. Read from the integration's "Active alerts" and "Running timers" sensors (found by their unique attributes),
// which Home Assistant keeps up to date. The last value is kept by the browser, so the sidebar shows it at once.
var HR_COUNT_KEY = 'house-rules-count';
var HR_TONE_KEY = 'house-rules-badge-tone';
var HR_EVERY_MS = 15000;
// Red for alerts, the accent colour for timers.
var HR_BADGE_COLORS = {
  bad: 'var(--error-color, #db4437)',
  warn: 'var(--primary-color, #4f46e5)',
};
var HR_BADGE_TEXT = {};

function hrBadgeSaved() {
  try {
    var n = parseInt(localStorage.getItem(HR_COUNT_KEY), 10);
    var tone = localStorage.getItem(HR_TONE_KEY);
    return { count: Number.isFinite(n) && n > 0 ? n : 0, tone: tone in HR_BADGE_COLORS ? tone : 'warn' };
  } catch (_err) {
    return { count: 0, tone: 'warn' };
  }
}
window.__houseRulesBadge ??= hrBadgeSaved();

// The House Rules item in Home Assistant's sidebar, or null until the sidebar is drawn. The recent sidebar gives
// each item the id `sidebar-panel-<path>` and sets its href as a property (not an attribute), so the id is the
// reliable hook; `[href]` and `[data-panel]` catch the older sidebars (an <a> wrapping a paper-icon-item).
function hrSidebarItem() {
  var ha = document.querySelector('home-assistant')?.shadowRoot;
  var sidebar = ha?.querySelector('home-assistant-main')?.shadowRoot?.querySelector('ha-sidebar')?.shadowRoot;
  if (!sidebar) return null;
  return (
    sidebar.querySelector('#sidebar-panel-house-rules') ||
    sidebar.querySelector('[href="/house-rules"]') ||
    sidebar.querySelector('[data-panel="house-rules"]')
  );
}

// One badge span, styled as Home Assistant's own sidebar badge (class `badge`, so the sidebar's CSS places it and
// shows or hides it by slot and expanded state) but in our tone instead of the accent colour.
function hrBadgeSpan(text, tone, slot, key) {
  var el = document.createElement('span');
  el.className = 'badge house-rules-badge';
  el.slot = slot;
  el.dataset.key = key;
  el.textContent = text;
  // The start badge (shown collapsed, over the icon) is placed by Home Assistant's `ha-svg-icon + .badge` rule — but a
  // custom panel's sidebar icon is an <ha-icon>, not a bare <ha-svg-icon>, so that rule does not match and the badge
  // would sit in the start slot and push the panel label to the right. Position it ourselves (over the icon, like
  // Home Assistant's own: top var(--ha-space-1), left 26px) so it never affects the row's layout; the end badge stays
  // in flow at the trailing edge. The host's expanded/collapsed opacity rules still show the right one by slot.
  var place = slot === 'start' ? 'position:absolute; top:var(--ha-space-1, 4px); left:26px; z-index:1; pointer-events:none; ' : '';
  el.style.cssText = `${place}display:inline-flex; justify-content:center; min-width:18px; height:18px; box-sizing:border-box; padding:0 5px; align-items:center; border-radius:9px; font-size:11px; font-weight:500; line-height:1; color:${HR_BADGE_TEXT[tone] || '#fff'}; background:${HR_BADGE_COLORS[tone]};`;
  return el;
}

// The badge on the sidebar item: the number of active alerts, in the most serious severity's colour, like the
// notifications count; none when there is nothing active. On the recent sidebar (ha-list-item-button /
// ha-md-list-item) it mirrors Home Assistant's own badge — a span in the start slot (shown when the sidebar is
// collapsed, over the icon) and one in the end slot (shown when expanded) — so the sidebar's CSS handles the
// placement and the collapsed/expanded switch. On the older sidebar (an <a>) a single span is placed at the right.
// Redrawn when Home Assistant rebuilds its items; unchanged, it writes nothing (so the observer below does not loop).
function hrBadgeRedraw() {
  var item = hrSidebarItem();
  if (!item) return false;
  var count = window.__houseRulesBadge.count;
  var tone = window.__houseRulesBadge.tone;
  var spans = item.querySelectorAll(':scope > .house-rules-badge');
  if (!count) {
    for (var b of spans) b.remove();
    return true;
  }
  var text = count > 99 ? '99+' : String(count);
  var key = `${tone}:${text}`;
  if (item.localName === 'a') {
    var badge = spans[0];
    if (badge && badge.dataset.key === key) return true;
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'house-rules-badge';
      item.style.position = 'relative';
      item.appendChild(badge);
    }
    badge.dataset.key = key;
    badge.textContent = text;
    badge.style.cssText = `position:absolute; right:12px; top:50%; transform:translateY(-50%); min-width:18px; height:18px; box-sizing:border-box; padding:0 5px; display:inline-flex; align-items:center; justify-content:center; border-radius:9px; font-size:11px; font-weight:500; line-height:1; pointer-events:none; z-index:1; color:${HR_BADGE_TEXT[tone] || '#fff'}; background:${HR_BADGE_COLORS[tone]};`;
    return true;
  }
  if (spans.length === 2 && spans[0].dataset.key === key) return true;
  for (var old of spans) old.remove();
  // The start badge goes right after the icon, so the sidebar's `ha-svg-icon + .badge` rule places it over the icon.
  var icon = item.querySelector(':scope > ha-svg-icon[slot="start"]') || item.querySelector(':scope > ha-icon[slot="start"]');
  var start = hrBadgeSpan(text, tone, 'start', key);
  if (icon) item.insertBefore(start, icon.nextSibling);
  else item.appendChild(start);
  item.appendChild(hrBadgeSpan(text, tone, 'end', key));
  return true;
}

// Until the sidebar has drawn the item (it may come after this module): every 250 ms for 5 seconds
function hrBadgeRedrawSoon(tries = 20) {
  if (hrBadgeRedraw() || tries <= 1) return;
  setTimeout(() => hrBadgeRedrawSoon(tries - 1), 250);
}

// The sidebar rebuilds its items (opened, folded, panels changed): the badge is added again when it is dropped
function hrBadgeObserve() {
  var item = hrSidebarItem();
  var sidebar = item?.getRootNode();
  if (!sidebar) {
    setTimeout(hrBadgeObserve, 500);
    return;
  }
  if (sidebar.__houseRulesBadgeObserved) return;
  sidebar.__houseRulesBadgeObserved = true;
  new MutationObserver(() => {
    if (window.__houseRulesBadgeRaf) return;
    window.__houseRulesBadgeRaf = requestAnimationFrame(() => {
      window.__houseRulesBadgeRaf = 0;
      hrBadgeRedraw();
    });
  }).observe(sidebar, { childList: true, subtree: true });
}

// The count and the most serious severity: the badge drawn again when they change, kept for the next page
function hrSetBadge(count, tone) {
  count = Math.max(0, parseInt(count, 10) || 0);
  if (!(tone in HR_BADGE_COLORS)) tone = 'warn';
  if (window.__houseRulesBadge.count === count && window.__houseRulesBadge.tone === tone) return;
  window.__houseRulesBadge = { count: count, tone: tone };
  try {
    localStorage.setItem(HR_COUNT_KEY, String(count));
    localStorage.setItem(HR_TONE_KEY, tone);
  } catch (_err) {
    // drawn anyway, not kept
  }
  hrBadgeRedraw();
}

// The integration's sensors: "Active alerts" carries `house_rules_alerts`, "Running timers" carries `timers`.
function hrSensor(hass, attr) {
  var states = hass?.states;
  if (!states) return null;
  for (var id in states) {
    if (!id.startsWith('sensor.')) continue;
    var st = states[id];
    if (st?.attributes && attr in st.attributes) {
      if (hass.entities?.[id] && hass.entities[id].platform !== 'house_rules') continue;
      return st;
    }
  }
  return null;
}

// Alerts first (red), else running timers (accent)
function hrFollow() {
  var hass = document.querySelector('home-assistant')?.hass;
  if (!hass?.user?.is_admin || document.hidden) return;
  var alerts = hrSensor(hass, 'house_rules_alerts');
  if (!alerts) return;
  var count = parseInt(alerts.state, 10) || 0;
  if (count > 0) {
    hrSetBadge(count, 'bad');
    return;
  }
  var timers = hrSensor(hass, 'timers');
  hrSetBadge(parseInt(timers?.state, 10) || 0, 'warn');
}

if (!window.__houseRulesBadge_init) {
  window.__houseRulesBadge_init = true;
  hrBadgeRedrawSoon();
  hrBadgeObserve();
  // The alerts read a few seconds after the page, once Home Assistant has drawn it, then every 15 seconds
  setTimeout(hrFollow, 3000);
  setInterval(hrFollow, HR_EVERY_MS);
}
