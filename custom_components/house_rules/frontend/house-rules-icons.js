// Icon set "house-rules": the integration's emblem (a house with a switch, and a lightning badge), for the panel's
// sidebar entry (house-rules:emblem) and anywhere an icon name is accepted. One monochrome path on the 24 grid.
// Registered in both the current and the older frontend icon APIs, so it resolves whenever Home Assistant rebuilds
// the sidebar. Loaded on every page, since the sidebar shows before any dashboard.
(() => {
  const EMBLEM =
    'M23.28 4.00 L23.28 4.80 L23.12 5.59 L22.82 6.33 L22.37 7.00 L21.80 7.57 L21.13 8.02 L20.39 8.32 L19.60 8.48 L18.80 8.48 L18.01 8.32 L17.27 8.02 L16.60 7.57 L16.03 7.00 L15.58 6.33 L15.28 5.59 L15.12 4.80 L15.12 4.00 L15.28 3.21 L15.58 2.47 L16.03 1.80 L16.60 1.23 L17.27 0.78 L18.01 0.48 L18.80 0.32 L19.60 0.32 L20.39 0.48 L21.13 0.78 L21.80 1.23 L22.37 1.80 L22.82 2.47 L23.12 3.21ZM19.50 3.70 L20.30 1.20 L19.80 1.20 L17.10 5.10 L18.90 5.10 L18.20 7.70 L21.30 3.70Z M1.14 10.64 L1.12 10.22 L1.35 9.87 L10.55 2.07 L10.93 1.90 L11.21 1.93 L11.45 2.07 L13.91 4.15 L13.93 4.92 L14.00 5.43 L14.21 6.19 L14.41 6.67 L14.94 7.56 L15.27 7.96 L15.84 8.50 L16.70 9.07 L17.41 9.39 L17.91 9.54 L18.68 9.67 L19.20 9.70 L19.72 9.67 L20.32 9.58 L20.75 9.97 L20.90 10.36 L20.79 10.77 L20.60 10.97 L20.34 11.09 L17.60 11.10 L17.57 19.71 L17.41 20.15 L17.24 20.42 L17.02 20.64 L16.61 20.88 L16.31 20.97 L16.00 21.00 L6.00 21.00 L5.54 20.93 L5.11 20.73 L4.87 20.53 L4.67 20.29 L4.52 20.01 L4.41 19.56 L4.40 11.10 L1.66 11.09 L1.40 10.97ZM8.22 17.33 L8.63 17.50 L9.30 17.60 L12.70 17.60 L13.15 17.56 L13.58 17.42 L13.98 17.21 L14.33 16.93 L14.61 16.58 L14.82 16.18 L14.96 15.75 L15.00 15.30 L14.96 14.85 L14.82 14.42 L14.48 13.84 L14.16 13.52 L13.58 13.18 L13.15 13.04 L12.70 13.00 L9.30 13.00 L8.85 13.04 L8.42 13.18 L7.84 13.52 L7.39 14.02 L7.10 14.63 L7.00 15.30 L7.10 15.97 L7.39 16.58 L7.67 16.93Z M14.17 14.80 L14.25 15.40 L14.09 15.99 L13.72 16.47 L13.20 16.77 L12.60 16.85 L12.01 16.69 L11.53 16.32 L11.23 15.80 L11.15 15.20 L11.31 14.61 L11.68 14.13 L12.20 13.83 L12.80 13.75 L13.39 13.91 L13.87 14.28Z';
  const icons = { emblem: EMBLEM };
  window.customIcons = window.customIcons || {};
  window.customIcons['house-rules'] = {
    getIcon: async (name) => ({ path: icons[name] || EMBLEM }),
    getIconList: async () => Object.keys(icons).map((name) => ({ name })),
  };
  window.customIconsets = window.customIconsets || {};
  window.customIconsets['house-rules'] = async (name) => ({ path: icons[name] || EMBLEM });

  // Home Assistant draws an icon whose set is not registered yet as a legacy <iron-icon>, and that ha-icon keeps the
  // legacy mode for good (the flag is only cleared for MDI icons): a sidebar drawn before this module ran — the first
  // load of a page, the module not cached yet — showed the emblem blank until the page was reloaded. Those icons are
  // reset and drawn again: at once, then every 250 ms until the sidebar has drawn the entry (up to 15 s).
  const PREFIX = 'house-rules:';
  const redraw = (root, depth = 0) => {
    if (!root || depth > 8) return 0;
    let found = 0;
    for (const el of root.querySelectorAll('*')) {
      if (el.localName === 'ha-icon' && String(el.icon || '').startsWith(PREFIX)) {
        found += 1;
        if (el._legacy) {
          const icon = el.icon;
          el._legacy = false;
          el.icon = '';
          requestAnimationFrame(() => {
            el.icon = icon;
          });
        }
      }
      if (el.shadowRoot) found += redraw(el.shadowRoot, depth + 1);
    }
    return found;
  };
  const redrawSoon = (tries = 60) => {
    if (redraw(document.querySelector('home-assistant')?.shadowRoot) || tries <= 1) return;
    setTimeout(() => redrawSoon(tries - 1), 250);
  };
  redrawSoon();
})();
