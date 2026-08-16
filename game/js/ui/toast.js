// toast.js — transient notifications, stacked bottom-up above the nav bar.
let holder = null;

export function toast(msg, icon = 'ℹ️', ms = 2600) {
  if (!holder) {
    holder = document.createElement('div');
    holder.className = 'toasts';
    document.body.appendChild(holder);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="ticon"></span><span class="tmsg"></span>`;
  el.querySelector('.ticon').textContent = icon;
  el.querySelector('.tmsg').textContent = msg;
  holder.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => {
    el.classList.remove('in');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

// Loot summary helper: {itemId: qty} -> toast
import { item } from '../data/items.js';
export function lootToast(gains, prefix = '', banked = 0) {
  const parts = Object.entries(gains).map(([id, q]) => `${item(id).icon} ${q > 1 ? q + '× ' : ''}${item(id).name}`);
  if (!parts.length) return;
  toast(`${prefix}${parts.join(', ')}${banked ? ' (pack full — sent to bank)' : ''}`, '🎁');
}
