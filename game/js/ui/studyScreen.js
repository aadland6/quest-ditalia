// studyScreen.js — the study dashboard: SRS mastery, weakest areas,
// achievements, collection log, and character options.
import { registerScreen, refresh, show } from './router.js';
import { esc, fmt, progressBar } from './common.js';
import { getSave, mutate, hardReset } from '../state.js';
import { srsStats, areaNeeds, getSrs } from '../questions.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ITEMS, item } from '../data/items.js';
import { toast } from './toast.js';
import { DRILL_KCS, DRILLABLE_KCS, makeDrill } from '../data/conjdrills.js';
import { presentQuestion } from './questionModal.js';

let tab = 'study';

async function render(el) {
  const s = getSave();
  const body = document.createElement('div');
  body.className = 'screen-body';

  const acc = s.answered ? Math.round((s.correctCount / s.answered) * 100) : 0;
  let html = `
    <div class="screen-head solo"><h1><span class="head-icon">🧠</span>Study</h1></div>
    <div class="tabs">
      <button class="tab ${tab === 'study' ? 'on' : ''}" data-t="study">Mastery</button>
      <button class="tab ${tab === 'ach' ? 'on' : ''}" data-t="ach">Achievements</button>
      <button class="tab ${tab === 'log' ? 'on' : ''}" data-t="log">Collection</button>
    </div>`;

  if (tab === 'study') {
    let st = null, needs = [];
    try { st = await srsStats(); needs = await areaNeeds(); } catch { /* not ready */ }
    html += `
      <div class="stat-tiles">
        <div class="tile"><b>${fmt(s.answered)}</b><span>answered</span></div>
        <div class="tile"><b>${acc}%</b><span>accuracy</span></div>
        <div class="tile"><b>${s.bestStreak}</b><span>best streak</span></div>
      </div>`;
    if (st) {
      html += `
        <div class="stat-tiles">
          <div class="tile"><b>${fmt(st.seen)}</b><span>cards seen</span></div>
          <div class="tile"><b>${fmt(st.new)}</b><span>cards unseen</span></div>
          <div class="tile"><b>${Math.round(st.avgMastery * 100)}%</b><span>avg mastery</span></div>
        </div>`;
    }
    html += `<h2 class="sect">Weakest study areas</h2>`;
    if (needs.length) {
      html += `<div class="cards">${needs.slice(0, 8).map(n => `
        <div class="card need">
          <span class="card-main">
            <span class="card-title">${esc(labelForKc(n.kc))}</span>
            ${progressBar(1 - n.need, 'needbar')}
            <span class="card-sub">${Math.round(n.accuracy * 100)}% accuracy · ${n.correct}/${n.answers} answered</span>
          </span>
        </div>`).join('')}</div>
      <p class="hint">The adaptive picker automatically serves more questions from weak areas.</p>`;
    } else {
      html += `<p class="hint">Answer questions to build a mastery picture — every game action counts.</p>`;
    }

    // Palestra dei verbi — free conjugation drilling per tense. Mastery bars show
    // the shared concept posterior (the same KC that authored grammar cards move).
    html += `<h2 class="sect">🏋️ Palestra dei verbi</h2>
      <p class="sect-note">Allena una coniugazione: le risposte aggiornano la padronanza del concetto (e riprogrammano le carte collegate).</p>
      <div class="cards">`;
    for (const kc of DRILLABLE_KCS) {
      let rec = null;
      try { rec = await getSrs().kcState(kc); } catch { /* not ready */ }
      const pL = rec?.pL ?? null;
      const sub = rec?.seen
        ? `${Math.round(pL * 100)}% padronanza · ${rec.correct}/${rec.seen} risposte`
        : 'non ancora incontrato';
      html += `
        <div class="card">
          <span class="card-main">
            <span class="card-title">${esc(DRILL_KCS[kc].name)}</span>
            ${pL != null ? progressBar(pL, 'needbar') : ''}
            <span class="card-sub">${sub}</span>
          </span>
          <span class="card-side"><button class="btn small" data-drill="${kc}">Allena</button></span>
        </div>`;
    }
    html += `</div>`;
  } else if (tab === 'ach') {
    const earned = ACHIEVEMENTS.filter(a => s.ach[a.id]);
    const locked = ACHIEVEMENTS.filter(a => !s.ach[a.id]);
    html += `
      <div class="stat-tiles"><div class="tile"><b>${earned.length}/${ACHIEVEMENTS.length}</b><span>earned</span></div></div>
      <div class="cards">
        ${earned.map(a => `<div class="card ach earned"><span class="card-icon">${a.icon}</span>
          <span class="card-main"><span class="card-title">${esc(a.name)}</span>
          <span class="card-sub">${esc(a.desc)}</span></span><span class="card-side">✅</span></div>`).join('')}
        ${locked.map(a => `<div class="card ach"><span class="card-icon">🔒</span>
          <span class="card-main"><span class="card-title">${esc(a.name)}</span>
          <span class="card-sub">${esc(a.desc)}</span></span></div>`).join('')}
      </div>`;
  } else {
    const found = Object.keys(s.log).filter(id => ITEMS[id]);
    const all = Object.values(ITEMS).filter(it => it.cat !== 'currency');
    html += `
      <div class="stat-tiles"><div class="tile"><b>${found.length}/${all.length + 1}</b><span>items discovered</span></div></div>
      <div class="item-grid log-grid">
        ${all.map(it => s.log[it.id]
          ? `<div class="item-cell found" title="${esc(it.name)}"><span class="cell-icon">${it.icon}</span><span class="cell-name">${esc(it.name)}</span></div>`
          : `<div class="item-cell unfound" title="???"><span class="cell-icon">❓</span><span class="cell-name">???</span></div>`).join('')}
      </div>`;
  }

  // character options live in Settings now
  if (tab === 'study') {
    html += `
      <div class="combat-actions">
        <button class="btn" id="gotoSettings">⚙️ Settings (controls, rename, reset)</button>
      </div>`;
  }

  body.innerHTML = html;
  el.appendChild(body);

  body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; refresh(); });
  body.querySelector('#gotoSettings')?.addEventListener('click', () => show('settings'));
  body.querySelectorAll('[data-drill]').forEach(b => b.onclick = () => drillLoop(b.dataset.drill));
}

// Serve drills for one tense until the player closes the modal.
async function drillLoop(kc) {
  for (;;) {
    const item = makeDrill(kc);
    if (!item) break;
    const res = await presentQuestion({ item, kind: 'drill' }, {
      icon: '🏋️', title: 'Palestra dei verbi', sub: DRILL_KCS[kc].name,
    });
    if (!res) break;                 // cancelled before answering
  }
  refresh();
}

let kcLabels = null;
function labelForKc(kc) {
  return kcLabels?.[kc]?.label || kc.replace('area:', '').replace(/-/g, ' ');
}
fetch('./data/srs_kcs.json').then(r => r.json()).then(j => { kcLabels = j; }).catch(() => {});

registerScreen('study', render);
