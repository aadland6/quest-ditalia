// packScreen.js — inventory + equipment. Tap equippables to equip; tap consumables to use.
import { registerScreen, refresh } from './router.js';
import { esc, fmt } from './common.js';
import { getSave, maxHp } from '../state.js';
import { item } from '../data/items.js';
import { invQty, usedSlots, invCap } from '../systems/inventory.js';
import { SLOTS, equipItem, unequip, meetsReqs, reqText, gearStats } from '../systems/equipment.js';
import { eatFood } from '../systems/combat.js';
import { toast } from './toast.js';

const SLOT_META = {
  weapon: ['🗡️', 'Weapon'], shield: ['🛡️', 'Shield'], head: ['🪖', 'Head'], body: ['🥋', 'Body'],
  legs: ['👖', 'Legs'], ammo: ['➳', 'Ammo'], amulet: ['📿', 'Amulet'], ring: ['💍', 'Ring'],
};

function render(el) {
  const s = getSave();
  const g = gearStats();
  const body = document.createElement('div');
  body.className = 'screen-body';

  const gearLine = [
    g.acc ? `⚔️acc ${g.acc}` : '', g.str ? `💪str ${g.str}` : '', g.def ? `🛡️def ${g.def}` : '',
    g.rAcc ? `🏹acc ${g.rAcc}` : '', g.rStr ? `🏹str ${g.rStr}` : '',
  ].filter(Boolean).join(' · ') || 'no bonuses';

  let html = `
    <div class="screen-head solo"><h1><span class="head-icon">🎒</span>Pack &amp; Gear</h1></div>
    <h2 class="sect">Equipped <span class="sect-note">${gearLine}</span></h2>
    <div class="equip-row">
      ${SLOTS.map(slot => {
        const id = s.equip[slot];
        const [icon, label] = SLOT_META[slot];
        const ammoCount = slot === 'ammo' && id ? fmt(invQty(id)) : '';
        return `
          <button class="equip-cell ${id ? 'filled' : ''}" data-slot="${slot}" title="${label}">
            <span class="cell-icon">${id ? item(id).icon : icon}</span>
            <span class="cell-name">${id ? esc(item(id).name) + (ammoCount ? ` ×${ammoCount}` : '') : label}</span>
          </button>`;
      }).join('')}
    </div>
    <h2 class="sect">Pack <span class="sect-note">${usedSlots()}/${invCap()} slots</span></h2>`;

  const entries = Object.entries(s.inv).sort((a, b) => {
    const ia = item(a[0]), ib = item(b[0]);
    return (ia.cat === 'currency' ? -1 : 0) - (ib.cat === 'currency' ? -1 : 0) || ia.name.localeCompare(ib.name);
  });

  html += entries.length ? `<div class="item-grid">
    ${entries.map(([id, q]) => {
      const it = item(id);
      const equippable = !!it.equip;
      const usable = it.cat === 'consumable';
      return `
        <button class="item-cell ${equippable ? 'equippable' : ''}" data-item="${id}">
          <span class="cell-icon">${it.icon}</span>
          <span class="cell-qty">${fmt(q)}</span>
          <span class="cell-name">${esc(it.name)}</span>
          ${equippable ? '<span class="cell-tag">equip</span>' : usable ? '<span class="cell-tag">use</span>' : ''}
        </button>`;
    }).join('')}</div>` : '<div class="empty">Your pack is empty.</div>';

  html += `<p class="hint">Tap gear to equip it, bandages to use them. Item details on long-press.</p>`;
  body.innerHTML = html;
  el.appendChild(body);

  body.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => {
    const slot = b.dataset.slot;
    if (s.equip[slot]) { unequip(slot); toast(`Unequipped ${slot}`, '🎒'); refresh(); }
  });

  body.querySelectorAll('[data-item]').forEach(cell => {
    const id = cell.dataset.item;
    const it = item(id);
    let timer = null, long = false;
    const primary = () => {
      if (it.equip) {
        if (!meetsReqs(id)) { toast(`Requires ${reqText(id)}`, '🔒'); return; }
        equipItem(id);
        toast(`Equipped ${it.name}`, '✅');
        refresh();
      } else if (it.heal) {
        if (getSave().hp >= maxHp()) { toast('Already at full health', '❤️'); return; }
        eatFood(id);
        toast(`${it.name} — you feel better.`, it.icon);
        refresh();
      } else {
        showDetail();
      }
    };
    const showDetail = () => {
      const eq = it.equip;
      const stats = eq ? [eq.acc && `acc ${eq.acc}`, eq.str && `str ${eq.str}`, eq.def && `def ${eq.def}`, eq.rAcc && `r.acc ${eq.rAcc}`, eq.rStr && `r.str ${eq.rStr}`].filter(Boolean).join(', ') : '';
      toast(`${it.name} — ${it.desc || ''}${stats ? ' [' + stats + ']' : ''} (value ${it.value})`, it.icon, 4200);
    };
    cell.addEventListener('pointerdown', () => { long = false; timer = setTimeout(() => { long = true; showDetail(); }, 450); });
    cell.addEventListener('pointerup', () => { clearTimeout(timer); if (!long) primary(); });
    cell.addEventListener('pointercancel', () => clearTimeout(timer));
  });
}

registerScreen('pack', render);
