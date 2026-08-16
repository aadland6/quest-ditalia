// bank.js — the bank: deposit/withdraw, deposit-all.
import { registerScreen, refresh } from './router.js';
import { header, esc, fmt } from './common.js';
import { getSave } from '../state.js';
import { item } from '../data/items.js';
import { deposit, withdraw, depositAll, usedSlots, invCap } from '../systems/inventory.js';
import { toast } from './toast.js';

let tab = 'bank'; // 'bank' | 'pack'

function grid(entries, side) {
  if (!entries.length) return '<div class="empty">Empty.</div>';
  return `<div class="item-grid">${entries.map(([id, q]) => `
    <button class="item-cell" data-id="${id}" data-side="${side}" title="${esc(item(id).name)}">
      <span class="cell-icon">${item(id).icon}</span>
      <span class="cell-qty">${fmt(q)}</span>
      <span class="cell-name">${esc(item(id).name)}</span>
    </button>`).join('')}</div>`;
}

function render(el) {
  el.appendChild(header('Bank of Borgosereno', '🏦', 'world'));
  const s = getSave();
  const body = document.createElement('div');
  body.className = 'screen-body';

  const bankEntries = Object.entries(s.bankVault).sort((a, b) => item(a[0]).name.localeCompare(item(b[0]).name));
  const packEntries = Object.entries(s.inv).sort((a, b) => item(a[0]).name.localeCompare(item(b[0]).name));

  body.innerHTML = `
    <div class="tabs">
      <button class="tab ${tab === 'pack' ? 'on' : ''}" data-t="pack">🎒 Pack (${usedSlots()}/${invCap()})</button>
      <button class="tab ${tab === 'bank' ? 'on' : ''}" data-t="bank">🏦 Vault (${bankEntries.length})</button>
    </div>
    ${tab === 'pack' ? `<button class="btn wide" id="depAll">Deposit all</button>` : ''}
    <p class="hint">${tab === 'pack' ? 'Tap an item to deposit it (long-press deposits 1).' : 'Tap an item to withdraw it (long-press withdraws 1).'}</p>
    ${tab === 'pack' ? grid(packEntries, 'pack') : grid(bankEntries, 'bank')}`;
  el.appendChild(body);

  body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; refresh(); });
  body.querySelector('#depAll')?.addEventListener('click', () => { depositAll(); toast('Deposited everything (coins stay with you)', '🏦'); refresh(); });

  body.querySelectorAll('.item-cell').forEach(cell => {
    let timer = null, longPressed = false;
    const id = cell.dataset.id, side = cell.dataset.side;
    const act = one => {
      if (side === 'pack') deposit(id, one ? 1 : Infinity);
      else withdraw(id, one ? 1 : Infinity);
      refresh();
    };
    cell.addEventListener('pointerdown', () => {
      longPressed = false;
      timer = setTimeout(() => { longPressed = true; act(true); }, 450);
    });
    cell.addEventListener('pointerup', () => {
      clearTimeout(timer);
      if (!longPressed) act(false);
    });
    cell.addEventListener('pointercancel', () => clearTimeout(timer));
  });
}

registerScreen('bank', render);
