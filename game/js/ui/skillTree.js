// skillTree.js — per-skill unlock ladder: everything the skill unlocks, level by
// level, assembled from the game's data registries. Tap a skill on the Skills
// screen to open it.
import { registerScreen } from './router.js';
import { header, esc } from './common.js';
import { SKILL } from '../data/skills.js';
import { AREAS } from '../data/areas.js';
import { RECIPES } from '../data/recipes.js';
import { ITEMS } from '../data/items.js';
import { ROOMS } from '../data/construction.js';
import { CROPS, PLOT_LEVELS } from '../data/farming.js';
import { ENEMIES } from '../data/enemies.js';
import { level } from '../state.js';

function ladder(skillId) {
  const rows = [];
  const add = (lvl, icon, label, note = '') => rows.push({ lvl, icon, label, note });

  // gathering nodes across all areas
  for (const a of AREAS) {
    for (const n of a.gather) {
      if (n.skill === skillId) add(n.lvl, n.icon, n.name, `${a.name} · ${n.xp} xp`);
    }
  }

  // production recipes
  for (const r of RECIPES) {
    if (r.skill === skillId) {
      const outId = Object.keys(r.out)[0];
      add(r.lvl, ITEMS[outId]?.icon || '⚒️', r.name, `${r.xp} xp`);
    }
  }

  // equipment requirements
  for (const it of Object.values(ITEMS)) {
    const req = it.equip?.req || {};
    if (req[skillId]) add(req[skillId], it.icon, `Wield ${it.name}`, statLine(it));
  }

  // construction rooms
  if (skillId === 'construction') {
    for (const room of ROOMS) {
      room.tiers.forEach((t, i) => add(t.lvl, room.icon, `${room.name} tier ${i + 1}`, room.perk(i + 1)));
    }
  }

  // farming crops + plots
  if (skillId === 'farming') {
    for (const c of CROPS) add(c.lvl, c.icon, `Grow ${c.name.toLowerCase()}`, `${c.plantXp}+${c.harvestXp} xp · ${c.growMin >= 60 ? c.growMin / 60 + 'h' : c.growMin + 'm'}`);
    PLOT_LEVELS.forEach((l, i) => { if (l > 1) add(l, '🟫', `Plot ${i + 1} unlocked`); });
  }

  // combat milestones: area gates + a sensible enemy ladder
  if (['attack', 'strength', 'defence', 'ranged', 'hitpoints'].includes(skillId)) {
    for (const a of AREAS) {
      if (a.unlock?.combat) add(a.unlock.combat, a.icon, `${a.name} opens`, `combat level ${a.unlock.combat} (all combat skills count)`);
    }
    if (skillId === 'strength' || skillId === 'ranged') {
      for (let l = 8; l <= 96; l += 8) add(l, '💥', `Max hit +1`, skillId === 'ranged' ? 'ranged damage' : 'melee damage');
    }
    if (skillId === 'hitpoints') {
      for (const e of ENEMIES) add(e.level, e.icon, `${e.name}`, `enemy level ${e.level} — a fair fight around here`);
    }
  }

  rows.sort((x, y) => x.lvl - y.lvl || x.label.localeCompare(y.label));
  return rows;
}

function statLine(it) {
  const eq = it.equip || {};
  return [eq.acc && `acc ${eq.acc}`, eq.str && `str ${eq.str}`, eq.def && `def ${eq.def}`,
    eq.rAcc && `r.acc ${eq.rAcc}`, eq.rStr && `r.str ${eq.rStr}`].filter(Boolean).join(' · ');
}

function render(el, { skillId }) {
  const sk = SKILL[skillId];
  el.appendChild(header(`${sk.name} tree`, sk.icon, 'skills'));
  const body = document.createElement('div');
  body.className = 'screen-body';
  const lvl = level(skillId);
  const rows = ladder(skillId);

  let html = `<p class="area-desc">${esc(sk.blurb)} You are level <b>${lvl}</b>.</p><div class="ladder">`;
  let markerPlaced = false;
  for (const r of rows) {
    if (!markerPlaced && r.lvl > lvl) {
      html += `<div class="ladder-now">— you are here (level ${lvl}) —</div>`;
      markerPlaced = true;
    }
    html += `
      <div class="ladder-row ${r.lvl <= lvl ? 'done' : ''}">
        <span class="ladder-lvl">${r.lvl}</span>
        <span class="ladder-icon">${r.icon}</span>
        <span class="ladder-main"><span class="ladder-label">${esc(r.label)}</span>
        ${r.note ? `<span class="ladder-note">${esc(r.note)}</span>` : ''}</span>
        <span class="ladder-tick">${r.lvl <= lvl ? '✓' : ''}</span>
      </div>`;
  }
  if (!markerPlaced) html += `<div class="ladder-now">— you are here (level ${lvl}) — tree complete! —</div>`;
  html += `</div>`;
  body.innerHTML = html;
  el.appendChild(body);
}

registerScreen('skilltree', render);
