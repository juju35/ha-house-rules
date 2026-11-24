import { HouseRulesPanel } from "./panel.js";

export const HRP_CSS = `
  :host { display: block; height: 100%; background: var(--primary-background-color); color: var(--primary-text-color); }
  .page { min-height: 100%; }
  .hdr { position: relative; height: 96px; overflow: hidden; background: var(--hr-sky); container-type: inline-size; }
  .hdr .hr-scene { position: absolute; right: 24px; bottom: 5px; opacity: .9; }
  .hdr .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: var(--hr-ground); }
  .hdrc { position: absolute; left: 16px; right: 24px; top: 22px; display: flex; align-items: center; gap: 12px; }
  .hdrc .row { margin-right: min(360px, 30cqw); flex-shrink: 0; }
  .hdrc .grow > * { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hdrc .menu { display: none; }
  .page.narrow .hdrc .menu { display: inline-flex; }
  /* By the width of the panel, not of the window: the sidebar open leaves less room. */
  @container (max-width: 760px) { .hdrc .row { margin-right: 0; } .hdr .hr-scene { opacity: .35; } }
  @container (max-width: 480px) { .hdrc .row .pill { display: none; } }
  .tabs { display: flex; overflow-x: auto; scrollbar-width: none; padding: 0 24px; background: var(--card-background-color); border-bottom: 1px solid var(--divider-color); }
  .tab { flex-shrink: 0; padding: 12px 4px; margin-right: 24px; font-family: inherit; font-weight: 600; font-size: 14px; color: var(--secondary-text-color); background: none; border: 0; border-bottom: 3px solid transparent; cursor: pointer; }
  .tab.on { color: var(--primary-text-color); font-weight: 700; border-bottom-color: var(--primary-color); }
  main { max-width: 1232px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
  h2 { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--secondary-text-color); margin: 0 0 8px; }
  section { display: flex; flex-direction: column; gap: 8px; }
  .stack { display: flex; flex-direction: column; gap: 16px; }
  /* Rooms tab: a folding card per room and its sections, as on Smart Comfort */
  .room { padding: 6px 16px; display: flex; flex-direction: column; }
  .room.open { padding-bottom: 16px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 35%, transparent); }
  .rhead { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: 52px; }
  .rarea { --mdc-icon-size: 22px; color: var(--primary-color); }
  .rname { font-size: 17px; font-weight: 600; }
  .rmeta { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; flex: 1 1 auto; min-width: 0; }
  .racts { display: inline-flex; flex: none; margin-left: auto; }
  @media (max-width: 600px) {
    .rmeta { order: 3; flex-basis: 100%; padding: 0 0 8px 40px; }
    .card.freeareas > .grow { flex-basis: 100%; }
  }
  .ricons { display: inline-flex; gap: 8px; color: var(--secondary-text-color); font-size: 12px; }
  .ricon { display: inline-flex; align-items: center; gap: 2px; --mdc-icon-size: 16px; }
  .rfields { gap: 12px; margin-top: 4px; }
  .ffield { display: flex; flex-direction: column; gap: 4px; min-width: 200px; font-size: 12px; color: var(--secondary-text-color); }
  .ffield input, .ffield select { font: inherit; font-size: 15px; height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); box-sizing: border-box; }
  .rhelp { margin: 8px 0 4px; }
  .rhelp .link, .room .link { padding: 0; font-size: 12px; }
  .sec { border-top: 1px solid var(--divider-color); }
  .sechead { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 48px; padding: 0; border: 0; background: none; color: var(--primary-text-color); font-family: inherit; font-size: 14px; font-weight: 600; text-align: left; cursor: pointer; --mdc-icon-size: 20px; }
  .sechead > ha-icon:first-child { color: var(--primary-color); }
  .secsum { max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 400; }
  .secbody { display: flex; flex-direction: column; gap: 8px; padding: 0 0 12px 32px; }
  .flabel { font-size: 13px; color: var(--secondary-text-color); margin-top: 4px; }
  .pickrow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .picker { flex: 1 1 260px; min-width: 0; }
  .picker > .cell { width: 100%; }
  .pickrow.nap .ffield { min-width: 120px; }
  .days { display: inline-flex; flex-wrap: wrap; gap: 4px; }
  .day { min-width: 40px; height: 32px; border-radius: 16px; border: 1px solid var(--divider-color); background: transparent; color: var(--primary-text-color); font-family: inherit; font-size: 12px; cursor: pointer; }
  .day.on { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
  .chip.dashed { background: transparent; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 45%, transparent); color: var(--primary-color); }
  .room .chips { padding-top: 12px; border-top: 1px solid var(--divider-color); }
  .secbody .chip.dashed { align-self: flex-start; }
  .card.freeareas { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 8px; box-shadow: none; border: 1px dashed var(--divider-color); }
  .savebar { position: sticky; bottom: 12px; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 16px; padding: 10px 14px; border-radius: 12px; background: var(--ha-card-background, var(--card-background-color, #fff)); box-shadow: 0 4px 16px rgba(0, 0, 0, .18); border: 1px solid color-mix(in srgb, var(--primary-color) 40%, transparent); }
  .stack > .savebar { margin-top: 0; }
  .savebar .grow { font-size: 14px; font-weight: 500; }
  .cols { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
  .main { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 24px; }
  .side { flex: 1 1 320px; min-width: 0; padding: 16px; }
  .editor { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 12px; }
  .card { background: var(--card-background-color); border-radius: 16px; box-shadow: 0 0 0 1px var(--divider-color); }
  .pad { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(520px, 100%), 1fr)); gap: 20px; align-items: start; }
  .grid2.tight { gap: 10px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .tile { position: relative; display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: var(--hr-tile); min-width: 0; }
  .rrow { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: var(--hr-tile); }
  .rrow .grow { flex: 1; min-width: 0; }
  .rrow .acts { display: flex; align-items: center; gap: 8px; flex: none; }
  @media (max-width: 600px) { .rrow { flex-wrap: wrap; } .rrow .acts { width: 100%; justify-content: flex-end; } }
  .rrow.sel { box-shadow: inset 0 0 0 2px var(--primary-color); }
  .ico { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none; }
  .ico ha-icon { --mdc-icon-size: 22px; }
  .ttl { font-weight: 700; font-size: 16px; line-height: 20px; }
  .sub { font-size: 13px; line-height: 18px; color: var(--secondary-text-color); }
  .small { font-size: 12px; line-height: 16px; }
  .grow { flex: 1; min-width: 0; }
  .row { display: flex; gap: 8px; align-items: center; }
  .row.wrap { flex-wrap: wrap; }
  .row.end { justify-content: flex-end; flex-wrap: wrap; }
  .tname { font-weight: 700; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tname.wrap { white-space: normal; }
  .lname { font-size: 13px; font-weight: 600; }
  .tstate { font-size: 12px; line-height: 16px; font-weight: 600; }
  .badge { position: absolute; top: 8px; right: 8px; width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 2px var(--hr-tile); }
  .pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--divider-color); background: transparent; color: var(--primary-text-color); font-family: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
  .btn:hover { background: color-mix(in srgb, var(--primary-text-color) 6%, transparent); }
  .btn.sm { min-height: 32px; }
  .btn.red { border-color: var(--hr-red); color: var(--hr-red); }
  .btn.primary { border-color: var(--primary-color); color: var(--primary-color); }
  .btn[disabled] { opacity: .5; cursor: default; }
  .rbtn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--divider-color); background: color-mix(in srgb, var(--card-background-color) 70%, transparent); color: var(--primary-text-color); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; flex: none; }
  .rbtn.plain { border: 0; background: transparent; }
  .rbtn[disabled] { opacity: .35; cursor: default; }
  .rbtn ha-icon { --mdc-icon-size: 18px; }
  .banner { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; padding: 16px; border-radius: 14px; background: var(--hr-red-bg); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hr-red) 35%, transparent); }
  .note { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--primary-color) 14%, transparent); font-size: 13px; }
  .note.red { background: var(--hr-red-bg); color: var(--hr-red); }
  .note ha-icon { --mdc-icon-size: 16px; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip { height: 32px; border: 0; border-radius: 16px; padding: 0 12px; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 13px; background: var(--card-background-color); color: var(--primary-text-color); box-shadow: inset 0 0 0 1px var(--divider-color); }
  .chip.on { background: var(--primary-color); color: var(--text-primary-color, #fff); box-shadow: none; }
  .sw { position: relative; display: inline-block; width: 40px; height: 24px; flex: none; }
  .sw input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
  .sw span { position: absolute; inset: 0; border-radius: 12px; background: var(--divider-color); pointer-events: none; }
  .sw span::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
  .sw input:checked + span { background: var(--primary-color); }
  .sw input:checked + span::after { left: 19px; }
  .field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; color: var(--secondary-text-color); }
  textarea, select, .cell { font-size: 13px; line-height: 20px; font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace); color: var(--primary-text-color); background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 10px; padding: 8px 10px; box-sizing: border-box; }
  select, .cell { font-family: inherit; height: 38px; padding: 0 10px; }
  .cell.name { font-weight: 700; }
  textarea { min-height: 320px; resize: vertical; width: 100%; tab-size: 2; }
  textarea.file { min-height: calc(100vh - 260px); }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; min-width: 820px; }
  th { text-align: left; font-size: 12px; font-weight: 700; color: var(--secondary-text-color); padding: 10px 12px; border-bottom: 1px solid var(--divider-color); white-space: nowrap; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--divider-color); vertical-align: top; }
  td .cell { width: 100%; min-width: 150px; }
  .when { font-size: 12px; color: var(--secondary-text-color); width: 44px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--divider-color); }
  .link { background: none; border: 0; color: var(--primary-color); font-family: inherit; font-weight: 600; font-size: 13px; padding: 12px 0; cursor: pointer; }
  .ringlabel { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
  .srow { display: flex; gap: 16px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--divider-color); flex-wrap: wrap; }
  .srcbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px; background: var(--hr-tile); }
  .prow { display: flex; gap: 10px; align-items: center; padding: 8px 0; cursor: pointer; }
  .empty { padding: 24px; color: var(--secondary-text-color); }
  .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh; z-index: 10; }
  .dlg { width: min(760px, 92vw); padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 0 0 2px #F59E0B, 0 10px 30px rgba(0,0,0,.2); }
  .diff { padding: 10px 12px; border-radius: 10px; font-size: 12px; }
  .diff.a { background: color-mix(in srgb, #F59E0B 18%, transparent); }
  .diff.b { background: color-mix(in srgb, var(--primary-color) 16%, transparent); }
  .diff pre { margin: 6px 0 0; white-space: pre-wrap; font: 12px/18px var(--code-font-family, ui-monospace, monospace); }
  code { font-size: 13px; }
`;

if (!customElements.get('house-rules-panel')) customElements.define('house-rules-panel', HouseRulesPanel);
