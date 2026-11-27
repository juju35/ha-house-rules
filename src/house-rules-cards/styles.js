// Animations of the illustrated header, shared with the panel.
export const HR_ANIM_CSS = `
  .hr-blink { animation: hr-blink 1s steps(1) infinite; }
  @keyframes hr-blink { 50% { opacity: .15; } }
  .hr-glow { animation: hr-glow 3s ease-in-out infinite; }
  @keyframes hr-glow { 50% { opacity: .6; } }
  .hr-roll { animation: hr-roll 6s ease-in-out infinite alternate; }
  @keyframes hr-roll { to { transform: translateX(-18px); } }
  @media (prefers-reduced-motion: reduce) { .hr-blink, .hr-glow, .hr-roll { animation: none; } }
`;

export const HR_CSS = `
  :host { display: block; }
  ha-card { overflow: hidden; }
  .hdr { position: relative; height: 90px; overflow: hidden; background: var(--hr-sky); }
  .hdr .hr-scene { position: absolute; right: 16px; bottom: 10px; }
  .hdr .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: var(--hr-ground); }
  .hdrc { position: absolute; left: 16px; top: 16px; right: 16px; display: flex; align-items: flex-start; gap: 12px; }
  .hdr.has-zoom .hdrc { right: 36px; }
  .zoom { all: unset; position: absolute; z-index: 2; top: 5px; right: 5px; cursor: pointer; width: 24px; height: 24px; border-radius: 50%; box-sizing: border-box;
          display: grid; place-items: center; color: #33506b; background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7);
          -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
  .zoom:hover { background: rgba(255,255,255,.75); }
  .zoom.on-night { color: #ffffff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
  .zoom.on-night:hover { background: rgba(255,255,255,.22); }
  .zoom:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
  .zoom ha-icon { --mdc-icon-size: 16px; display: flex; }
  .ico { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; }
  .ico ha-icon { --mdc-icon-size: 22px; }
  .ttl { font-weight: 700; font-size: 16px; line-height: 20px; color: var(--primary-text-color); }
  .sub { font-size: 13px; line-height: 18px; color: var(--secondary-text-color); }
  .grow { flex: 1; min-width: 0; }
  .pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .body { padding: 16px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .tile { position: relative; display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 10px; background: var(--hr-tile); min-width: 0; }
  .tname { font-weight: 700; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--primary-text-color); }
  .tstate { font-size: 12px; line-height: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .badge { position: absolute; top: 8px; right: 8px; width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 2px var(--hr-tile); }
  .banner { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: var(--hr-red-bg); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hr-red) 35%, transparent); }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--divider-color); background: transparent; color: var(--primary-text-color); font-family: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
  .btn.red { border-color: var(--hr-red); color: var(--hr-red); }
  .rings { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .ring { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 8px; border-radius: 12px; background: var(--hr-tile); text-align: center; }
  .ring .tname { white-space: normal; font-size: 13px; }
  .row { display: flex; gap: 6px; }
  .empty { padding: 8px 0; color: var(--secondary-text-color); font-size: 13px; }
  ul { list-style: none; margin: 6px 0 0; padding: 0; }
  li { display: flex; gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--divider-color); }
  li:last-child { border-bottom: 0; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { height: 28px; border: 0; border-radius: 14px; padding: 0 12px; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 12px; background: var(--hr-tile); color: var(--primary-text-color); }
  .chip.on { background: var(--primary-color); color: var(--text-primary-color, #fff); }
`;

export const HR_TONES_LIGHT = {
  red: ['#B91C1C', '#FEE2E2'],
  amber: ['#B45309', '#FEF3C7'],
  blue: ['#1D4ED8', '#DBEAFE'],
  green: ['#15803D', '#DCFCE7'],
  grey: ['#4B5563', '#E5E7EB'],
  indigo: ['#4338CA', '#E0E7FF'],
};
export const HR_TONES_DARK = {
  red: ['#FCA5A5', '#7F1D1D'],
  amber: ['#FBBF24', '#5B3A0A'],
  blue: ['#93C5FD', '#1E3A8A'],
  green: ['#4ADE80', '#14532D'],
  grey: ['#D1D5DB', '#374151'],
  indigo: ['#A5B4FC', '#312E81'],
};
