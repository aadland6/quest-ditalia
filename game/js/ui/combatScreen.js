// combatScreen.js — turn-based combat UI. Answer to strike; miss and be struck.
import { registerScreen, show } from './router.js';
import { header, esc, fmt, progressBar } from './common.js';
import { ENEMY } from '../data/enemies.js';
import { AREA } from '../data/areas.js';
import { getSave, mutate, maxHp, level } from '../state.js';
import { startFight, playerAttack, enemyAttack, eatFood, bestFood, playerCombatProfile } from '../systems/combat.js';
import { weaponStyle } from '../systems/equipment.js';
import { invQty } from '../systems/inventory.js';
import { item } from '../data/items.js';
import { askQuestion } from './questionModal.js';
import { toast, lootToast } from './toast.js';

function render(el, { enemyId, areaId }) {
  const enemy = ENEMY[enemyId];
  const fight = startFight(enemyId);
  el.appendChild(header(`Fighting: ${enemy.name}`, enemy.icon, 'world'));

  const body = document.createElement('div');
  body.className = 'screen-body combat';
  el.appendChild(body);

  const logLines = [];
  const log = (msg, cls = '') => {
    logLines.unshift({ msg, cls });
    if (logLines.length > 6) logLines.pop();
  };

  function draw() {
    const s = getSave();
    const prof = playerCombatProfile();
    const styleRow = prof.style === 'melee'
      ? `<div class="style-row">
          ${['attack', 'strength', 'defence'].map(st => `
            <button class="stylebtn ${s.style === st ? 'on' : ''}" data-style="${st}">
              ${st === 'attack' ? '⚔️' : st === 'strength' ? '💪' : '🛡️'} ${st[0].toUpperCase() + st.slice(1)}
            </button>`).join('')}
         </div>`
      : `<div class="style-row ranged-info">🏹 Ranged · ${prof.ammo ? `${item(prof.ammo).icon} ${fmt(invQty(prof.ammo))} ${esc(item(prof.ammo).name)}s` : '<b class="warn">no arrows equipped!</b>'}</div>`;

    body.innerHTML = `
      <div class="fighter enemy-side ${fight.over && fight.won ? 'dead' : ''}">
        <div class="f-head"><span class="f-icon">${enemy.icon}</span>
          <div><div class="f-name">${esc(enemy.name)} <span class="lvl-tag">Lv ${enemy.level}</span></div>
          <div class="f-sub">max hit ${enemy.maxHit}</div></div>
          <span class="f-hp">${fight.enemyHp}/${enemy.hp}</span></div>
        ${progressBar(fight.enemyHp / enemy.hp, 'hp-enemy')}
      </div>
      <div class="vs">⚡</div>
      <div class="fighter player-side">
        <div class="f-head"><span class="f-icon">🧑‍🎓</span>
          <div><div class="f-name">${esc(s.name)}</div>
          <div class="f-sub">max hit ${prof.maxHit} · ${prof.style}</div></div>
          <span class="f-hp">${s.hp}/${maxHp()}</span></div>
        ${progressBar(s.hp / maxHp(), 'hp-player')}
      </div>
      ${styleRow}
      <div class="combat-actions">
        ${fight.over ? `
          <button class="btn primary" id="again">${fight.won ? 'Fight again' : 'Recover & retry'}</button>
          <button class="btn" id="leave">Back to ${esc(AREA[areaId].name)}</button>
        ` : `
          <button class="btn primary attack" id="atk">${prof.style === 'ranged' ? '🏹 Loose arrow' : '⚔️ Strike'}</button>
          ${(() => { const f = bestFood(); return f
            ? `<button class="btn" id="heal" data-food="${f}" ${s.hp >= maxHp() ? 'disabled' : ''}>${item(f).icon} ${esc(item(f).name)} (${invQty(f)})</button>`
            : '<button class="btn" disabled>🩹 no food</button>'; })()}
          <button class="btn ghost" id="flee">🏃 Flee</button>
        `}
      </div>
      <div class="combat-log">${logLines.map(l => `<div class="cl ${l.cls}">${l.msg}</div>`).join('')}</div>`;

    body.querySelectorAll('[data-style]').forEach(b => b.onclick = () => {
      mutate(st => { st.style = b.dataset.style; });
      draw();
    });
    body.querySelector('#flee')?.addEventListener('click', () => show('world'));
    body.querySelector('#leave')?.addEventListener('click', () => show('world'));
    body.querySelector('#again')?.addEventListener('click', () => show('combat', { enemyId, areaId }));
    body.querySelector('#heal')?.addEventListener('click', e => {
      const f = e.currentTarget.dataset.food;
      if (eatFood(f)) { log(`${item(f).icon} You use ${esc(item(f).name)}.`, 'ok'); draw(); }
    });
    body.querySelector('#atk')?.addEventListener('click', round);
  }

  async function round() {
    const prof = playerCombatProfile();
    if (prof.style === 'ranged' && !prof.ammo) {
      toast('Equip arrows first (Pack → tap arrows)', '🏹');
      return;
    }
    const res = await askQuestion({
      icon: enemy.icon,
      title: `${enemy.name} — ${fight.enemyHp}/${enemy.hp} HP`,
      sub: prof.style === 'ranged' ? 'Ranged combat' : 'Melee combat',
    });
    if (!res) return;

    if (res.correct) {
      const r = playerAttack(fight);
      if (r.noAmmo) { toast('Out of arrows!', '🏹'); draw(); return; }
      if (!r.hit) log(`Your ${r.style === 'ranged' ? 'arrow glances off' : 'blow glances off'} ${esc(enemy.name)}.`, 'miss');
      else log(`You ${r.style === 'ranged' ? 'shoot' : 'hit'} ${esc(enemy.name)} for <b>${r.dmg}</b> (+${r.xp}xp).`, 'ok');
      if (fight.over && fight.won) {
        log(`☠️ ${esc(enemy.name)} is defeated! +${r.bonusXp + r.bonusHpXp} bonus xp`, 'ok');
        lootToast(r.loot.gains, 'Loot: ', r.loot.banked);
      }
    } else {
      const r = enemyAttack(fight);
      if (!r.hit) log(`${esc(enemy.name)} lashes out — you dodge.`, 'miss');
      else log(`${esc(enemy.name)} hits you for <b>${r.dmg}</b>.`, 'bad');
      if (r.fled) {
        toast('You barely escape with your life! Rest at the hearth or use bandages.', '🏃');
        show('world');
        return;
      }
    }
    draw();
  }

  draw();
}

registerScreen('combat', render);
