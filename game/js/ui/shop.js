// shop.js — General Store (buy/sell) and Sawmill (log→plank conversion).
import { registerScreen, refresh } from './router.js';
import { header, esc, fmt } from './common.js';
import { SHOP_STOCK, SELL_RATE, SAWMILL } from '../data/shop.js';
import { item } from '../data/items.js';
import { getSave } from '../state.js';
import { invQty, bankQty, addItems, removeItems, canAfford } from '../systems/inventory.js';
import { toast } from './toast.js';

let shopTab = 'buy';

function renderShop(el) {
  el.appendChild(header('General Store', '🛒', 'world'));
  const body = document.createElement('div');
  body.className = 'screen-body';
  const s = getSave();

  if (shopTab === 'buy') {
    body.innerHTML = `
      <div class="tabs">
        <button class="tab on" data-t="buy">Buy</button>
        <button class="tab" data-t="sell">Sell</button>
      </div>
      <div class="cards">
        ${SHOP_STOCK.map(row => `
          <button class="card ${invQty('coins') >= row.price ? '' : 'locked'}" data-buy="${row.item}">
            <span class="card-icon">${item(row.item).icon}</span>
            <span class="card-main">
              <span class="card-title">${esc(item(row.item).name)}</span>
              <span class="card-sub">${esc(item(row.item).desc || '')}</span>
            </span>
            <span class="card-side">🪙${row.price}</span>
          </button>`).join('')}
      </div>`;
  } else {
    const sellable = Object.entries(s.inv)
      .filter(([id]) => item(id).cat !== 'currency' && item(id).cat !== 'key' && item(id).value > 0)
      .sort((a, b) => item(b[0]).value - item(a[0]).value);
    body.innerHTML = `
      <div class="tabs">
        <button class="tab" data-t="buy">Buy</button>
        <button class="tab on" data-t="sell">Sell</button>
      </div>
      <p class="hint">The store pays ${Math.round(SELL_RATE * 100)}% of value. Tap to sell one, long-press to sell the whole stack.</p>
      ${sellable.length ? `<div class="item-grid">${sellable.map(([id, q]) => `
        <button class="item-cell" data-sell="${id}">
          <span class="cell-icon">${item(id).icon}</span>
          <span class="cell-qty">${fmt(q)}</span>
          <span class="cell-name">🪙${Math.floor(item(id).value * SELL_RATE)}</span>
        </button>`).join('')}</div>` : '<div class="empty">Nothing sellable in your pack.</div>'}`;
  }
  el.appendChild(body);

  body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { shopTab = b.dataset.t; refresh(); });

  body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const id = b.dataset.buy;
    const row = SHOP_STOCK.find(r => r.item === id);
    if (!removeItems({ coins: row.price })) { toast('Not enough coins', '🪙'); return; }
    addItems({ [id]: 1 }, { source: 'internal' });
    toast(`Bought ${item(id).name}`, '🛒');
    refresh();
  });

  body.querySelectorAll('[data-sell]').forEach(cell => {
    const id = cell.dataset.sell;
    let timer = null, long = false;
    const sell = all => {
      const qty = all ? invQty(id) : 1;
      if (qty < 1) return;
      const price = Math.floor(item(id).value * SELL_RATE) * qty;
      removeItems({ [id]: qty });
      addItems({ coins: price }, { source: 'internal' });
      toast(`Sold ${qty}× ${item(id).name} for 🪙${fmt(price)}`, '💰');
      refresh();
    };
    cell.addEventListener('pointerdown', () => { long = false; timer = setTimeout(() => { long = true; sell(true); }, 450); });
    cell.addEventListener('pointerup', () => { clearTimeout(timer); if (!long) sell(false); });
    cell.addEventListener('pointercancel', () => clearTimeout(timer));
  });
}

function renderSawmill(el) {
  el.appendChild(header('Sawmill', '🪚', 'world'));
  const body = document.createElement('div');
  body.className = 'screen-body';
  body.innerHTML = `
    <p class="hint">The miller cuts logs into planks — for a fee. Logs can come from your pack or the bank.</p>
    <div class="cards">
      ${SAWMILL.map(row => {
        const have = invQty(row.log) + bankQty(row.log);
        const ok = have > 0 && invQty('coins') >= row.fee;
        return `
          <button class="card ${ok ? '' : 'locked'}" data-mill="${row.log}">
            <span class="card-icon">${item(row.plank).icon}</span>
            <span class="card-main">
              <span class="card-title">${esc(item(row.log).name)} → ${esc(item(row.plank).name)}</span>
              <span class="card-sub">🪙${row.fee} each · ${fmt(have)} logs available</span>
            </span>
            <span class="card-side">${ok ? '▶' : have === 0 ? '🪵' : '🪙'}</span>
          </button>`;
      }).join('')}
    </div>
    <p class="hint">Tap converts one log; long-press converts up to 10.</p>`;
  el.appendChild(body);

  body.querySelectorAll('[data-mill]').forEach(cell => {
    const row = SAWMILL.find(r => r.log === cell.dataset.mill);
    let timer = null, long = false;
    const mill = n => {
      let done = 0;
      for (let i = 0; i < n; i++) {
        if (!canAfford({ [row.log]: 1 }, { useBank: true }) || invQty('coins') < row.fee) break;
        removeItems({ [row.log]: 1 }, { useBank: true });
        removeItems({ coins: row.fee });
        addItems({ [row.plank]: 1 }, { source: 'internal' });
        done++;
      }
      if (done) toast(`Cut ${done}× ${item(row.plank).name}`, '🪚');
      else toast('No logs or coins', '🪵');
      refresh();
    };
    cell.addEventListener('pointerdown', () => { long = false; timer = setTimeout(() => { long = true; mill(10); }, 450); });
    cell.addEventListener('pointerup', () => { clearTimeout(timer); if (!long) mill(1); });
    cell.addEventListener('pointercancel', () => clearTimeout(timer));
  });
}

registerScreen('shop', renderShop);
registerScreen('sawmill', renderSawmill);
