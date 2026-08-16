// common.js — small shared UI helpers.
import { show } from './router.js';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const fmt = n => {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return n.toLocaleString();
};

export const fmtMs = ms => {
  ms = Math.max(0, ms);
  const h = Math.floor(ms / 36e5), m = Math.round((ms % 36e5) / 6e4);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// screen header with back button
export function header(title, icon = '', backTo = 'map', backParams = {}) {
  const el = document.createElement('div');
  el.className = 'screen-head';
  el.innerHTML = `<button class="backbtn" aria-label="Back">‹</button>
    <h1>${icon ? `<span class="head-icon">${icon}</span>` : ''}${esc(title)}</h1>`;
  el.querySelector('.backbtn').onclick = () => show(backTo, backParams);
  return el;
}

export function progressBar(frac, cls = '') {
  return `<div class="pbar ${cls}"><i style="width:${Math.round(Math.min(1, Math.max(0, frac)) * 100)}%"></i></div>`;
}
