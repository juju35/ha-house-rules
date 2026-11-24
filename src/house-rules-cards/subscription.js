// ---------- shared subscription ----------
export const hrHub = (window.__houseRulesHub ??= { listeners: new Set(), data: undefined, unsub: null, connection: null });

export function hrSubscribe(hass, listener) {
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

export function hrEsc(text) {
  return String(text ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

// The timers card's rings: radius and circumference in the 64×64 viewBox.
export const HR_RING_R = 26;
export const HR_RING_C = 2 * Math.PI * HR_RING_R;
