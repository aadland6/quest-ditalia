// hud.js — persistent top bar: HP, coins, streak, due-review badge.
import { getSave, onChange, maxHp, combatLevel } from '../state.js';
import { dueCount } from '../questions.js';

let el = null;
let due = 0;

export function initHud() {
  el = document.getElementById('hud');
  onChange(render);
  render();
  refreshDue();
  setInterval(refreshDue, 30_000);
}

export async function refreshDue() {
  try { due = await dueCount(); render(); } catch { /* srs not ready yet */ }
}

function render() {
  if (!el) return;
  const s = getSave();
  const hp = s.hp, mx = maxHp();
  const pct = Math.round((hp / mx) * 100);
  el.innerHTML = `
    <div class="hud-id"><span class="hud-name">${escapeHtml(s.name)}</span><span class="hud-cb">⚔️${combatLevel()}</span></div>
    <div class="hud-hp" title="Hitpoints">
      <div class="hpbar"><i style="width:${pct}%" class="${pct < 30 ? 'low' : ''}"></i></div>
      <span class="hptext">${hp}/${mx}</span>
    </div>
    <div class="hud-right">
      ${s.streak >= 3 ? `<span class="hud-chip streak">🔥${s.streak}</span>` : ''}
      <span class="hud-chip">🪙${fmt(s.inv.coins || 0)}</span>
      <span class="hud-chip due ${due > 0 ? 'hot' : ''}" title="Reviews due">📖${due}</span>
    </div>`;
}

const fmt = n => n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(n);
const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
