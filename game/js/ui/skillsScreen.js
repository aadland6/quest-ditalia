// skillsScreen.js — all 11 skills with levels, xp bars, and totals.
import { registerScreen, show } from './router.js';
import { esc, fmt, progressBar } from './common.js';
import { SKILLS } from '../data/skills.js';
import { getSave, level, totalLevel, combatLevel } from '../state.js';
import { levelProgress, xpToNext, MAX_LEVEL } from '../xp.js';

const GROUPS = [
  ['combat', 'Combat'],
  ['gather', 'Gathering'],
  ['artisan', 'Artisan'],
];

function render(el) {
  const s = getSave();
  const body = document.createElement('div');
  body.className = 'screen-body';
  let html = `
    <div class="screen-head solo"><h1><span class="head-icon">📊</span>Skills</h1></div>
    <div class="stat-tiles">
      <div class="tile"><b>${totalLevel()}</b><span>total level</span></div>
      <div class="tile"><b>${combatLevel()}</b><span>combat level</span></div>
      <div class="tile"><b>${fmt(Object.values(s.xp).reduce((a, b) => a + b, 0))}</b><span>total xp</span></div>
    </div>`;

  for (const [gid, gname] of GROUPS) {
    html += `<h2 class="sect">${gname}</h2><div class="cards">`;
    for (const sk of SKILLS.filter(x => x.group === gid)) {
      const lvl = level(sk.id);
      const xp = s.xp[sk.id] || 0;
      html += `
        <button class="card skill" data-tree="${sk.id}">
          <span class="card-icon">${sk.icon}</span>
          <span class="card-main">
            <span class="card-title">${esc(sk.name)}
              <span class="skill-lvl">${lvl}${lvl >= MAX_LEVEL ? ' 🏆' : ''}</span></span>
            ${progressBar(levelProgress(xp), 'xpbar')}
            <span class="card-sub">${fmt(xp)} xp${lvl < MAX_LEVEL ? ` · ${fmt(xpToNext(xp))} to ${lvl + 1}` : ' · maxed!'}</span>
          </span>
          <span class="card-side">›</span>
        </button>`;
    }
    html += `</div>`;
  }
  body.innerHTML = html;
  el.appendChild(body);
  body.querySelectorAll('[data-tree]').forEach(b => b.onclick = () => show('skilltree', { skillId: b.dataset.tree }));
}

registerScreen('skills', render);
