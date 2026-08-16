// app.js — interactive demo wiring the SRS engine to the real question bank over IndexedDB.
import { SRS, HOUR, DAY } from '../game/js/srs/srs-engine.js';
import { IdbStorage } from '../game/js/srs/idb-storage.js';

const $ = s => document.querySelector(s);
const state = { now: Date.now(), srs: null, items: new Map(), kcCat: {}, current: null, answered: false, sel: new Set(), reasonSel: null };

const fmtDelta = ms => {
  const s = ms < 0 ? '-' : '';
  ms = Math.abs(ms);
  if (ms < HOUR) return s + Math.round(ms / 60000) + 'm';
  if (ms < DAY) return s + (ms / HOUR).toFixed(1) + 'h';
  return s + (ms / DAY).toFixed(1) + 'd';
};
const clockStr = () => new Date(state.now).toISOString().slice(0, 16).replace('T', ' ');

async function boot() {
  const [cards, bank, kcCat] = await Promise.all([
    fetch('./srs_cards.json').then(r => r.json()),
    fetch('../question_bank/question_bank.json').then(r => r.json()),
    fetch('./srs_kcs.json').then(r => r.json()),
  ]);
  state.kcCat = kcCat;
  for (const it of bank) state.items.set(it.id, it);
  state.srs = new SRS(new IdbStorage('gis-srs-demo'));
  await state.srs.init();
  // enroll once (idempotent, but skip the per-card scan if already loaded)
  const have = await state.srs.s.getAllCards();
  if (have.length < cards.length) await state.srs.enroll(cards, state.now);
  // populate the topic dropdown with content areas (used in 'by topic' new-card mode)
  const topic = $('#topic');
  Object.entries(kcCat).filter(([k, v]) => v.kind === 'area').sort((a, b) => a[1].label.localeCompare(b[1].label))
    .forEach(([k, v]) => { const o = document.createElement('option'); o.value = v.label; o.textContent = v.label; topic.appendChild(o); });
  wire();
  await refresh();
  await nextCard('new');
}

function wire() {
  $('#btnDue').onclick = () => nextCard('due');
  $('#btnNew').onclick = () => nextCard('new');
  $('#btnJumpH').onclick = () => { state.now += 6 * HOUR; refresh(); };
  $('#btnJumpD').onclick = () => { state.now += DAY; refresh(); };
  $('#btnReset').onclick = async () => { await state.srs.s.reset(); location.reload(); };
  $('#mode').onchange = () => { $('#topic').style.display = $('#mode').value === 'topic' ? '' : 'none'; };
}

async function refresh() {
  $('#clock').textContent = clockStr();
  const st = await state.srs.stats({ now: state.now });
  $('#dueN').textContent = st.dueNow;
  $('#newN').textContent = st.new;
  $('#avgM').textContent = (st.avgMastery * 100).toFixed(0) + '%';
  await renderKcPanel();
  await renderNeedPanel();
  if (state.current) await renderCardSidebar(state.current.id);
}

async function renderNeedPanel() {
  const needs = (await state.srs.areaNeeds({ minAnswers: 1 })).slice(0, 8);
  const panel = $('#needPanel');
  if (!needs.length) { panel.innerHTML = '<div class="muted">Answer questions to build a targeting signal…</div>'; return; }
  panel.innerHTML = needs.map(n => {
    const lab = state.kcCat[n.kc]?.label || n.kc;
    const acc = (n.accuracy * 100).toFixed(0);
    return `<div class="kc"><div class="lab"><span>${lab}</span><span>${acc}% acc · ${n.correct}/${n.answers}</span></div>
      <div class="bar"><i style="width:${(n.need * 100).toFixed(0)}%;background:linear-gradient(90deg,#4ade80,#f59e0b,#f87171)"></i></div></div>`;
  }).join('');
}

async function renderKcPanel() {
  const kcs = await state.srs.s.getAllKcs();
  const concept = kcs.filter(k => !k.kc.startsWith('area:') && k.seen > 0).sort((a, b) => b.seen - a.seen).slice(0, 12);
  const panel = $('#kcPanel');
  if (!concept.length) { panel.innerHTML = '<div class="muted">Answer some questions to build topic mastery…</div>'; return; }
  panel.innerHTML = concept.map(k => {
    const lab = state.kcCat[k.kc]?.label || k.kc;
    return `<div class="kc"><div class="lab"><span>${lab}</span><span>${(k.pL * 100).toFixed(0)}% · ${k.correct}/${k.seen}</span></div>
      <div class="bar"><i style="width:${(k.pL * 100).toFixed(0)}%"></i></div></div>`;
  }).join('');
}

async function renderCardSidebar(id) {
  const st = await state.srs.cardState(id);
  if (!st) return;
  $('#cardKcs').innerHTML = st.kcMastery.map(({ kc, pL }) => {
    const lab = state.kcCat[kc]?.label || kc;
    const pct = pL == null ? 0 : pL * 100;
    return `<div class="kc"><div class="lab"><span>${lab}</span><span>${pct.toFixed(0)}%</span></div>
      <div class="bar"><i style="width:${pct.toFixed(0)}%"></i></div></div>`;
  }).join('');
  const bin = st.binDueAt - state.now, bay = st.bayesDueAt - state.now;
  $('#cardDue').innerHTML = st.status === 'new'
    ? '<span class="muted">new card — not yet scheduled</span>'
    : `<span>binary due <b class="binary">${fmtDelta(bin)}</b></span><span>bayesian due <b class="bayesian">${fmtDelta(bay)}</b></span>`;
}

async function nextCard(mode) {
  let pick = null; state.reason = null;
  if (mode === 'due') {
    const q = await state.srs.getDueQueue({ now: state.now, limit: 1 });
    pick = q[0]?.id || null;
    if (!pick) { showMessage('Nothing due right now. Jump the clock forward, or study a New card.'); return; }
  } else {
    const m = $('#mode').value;                       // 'adaptive' | 'random' | 'topic'
    const area = m === 'topic' ? $('#topic').value : null;
    const ns = await state.srs.getNewCards({ mode: m, area, limit: 1 });
    const rec = ns[0];
    pick = rec?.id || null;
    if (!pick) { showMessage('No new cards left for this selection. Try "Next due".'); return; }
    // explain the recommendation
    if (m === 'adaptive' && rec.reasonKc) state.reason = `adaptive pick — targeting weak area “${state.kcCat[rec.reasonKc]?.label || rec.reasonKc}” (need ${(rec.need * 100).toFixed(0)}%)`;
    else if (m === 'random') state.reason = 'random pick';
    else if (m === 'topic') state.reason = `topic pick — ${area}`;
  }
  state.current = state.items.get(pick);
  state.answered = false; state.sel = new Set(); state.reasonSel = null;
  renderQuestion();
  await renderCardSidebar(pick);
}

function showMessage(msg) { $('#qcard').innerHTML = `<div class="muted">${msg}</div>`; }

function renderQuestion() {
  const it = state.current;
  const c = $('#qcard');
  const multi = it.item_type === 'C';
  const typeLabel = { A: 'scenario', B: 'term recall', C: 'select all', D: 'two-tier', E: 'error correction', F: 'categorize' }[it.item_type] || it.item_type;
  let html = `<div class="tags">${it.id} · ${it.content_area} · ${typeLabel} · ${it.difficulty}/${it.cognitive_level}</div>
    ${state.reason ? `<div class="tags" style="color:var(--bay)">▸ ${escapeHtml(state.reason)}</div>` : ''}
    <div class="stem">${escapeHtml(it.stem)}</div>`;
  if (it.item_type === 'F') {
    const bins = [...new Set(Object.values(it.sort_map))];
    html += Object.keys(it.sort_map).map((chip, i) =>
      `<div class="chip"><span>${escapeHtml(chip)}</span>
        <select data-chip="${i}">${['<option value="">—</option>', ...bins.map(b => `<option>${escapeHtml(b)}</option>`)].join('')}</select></div>`).join('');
  } else {
    html += (it.options || []).map((o, i) => `<button class="opt" data-i="${i}">${escapeHtml(o)}</button>`).join('');
    if (it.item_type === 'D' && it.reason_tier) {
      html += `<div class="reason"><div class="muted">${escapeHtml(it.reason_tier.prompt || 'Why?')}</div>` +
        (it.reason_tier.options || []).map((o, i) => `<button class="opt ropt" data-r="${i}">${escapeHtml(o)}</button>`).join('') + `</div>`;
    }
  }
  html += `<div class="row" style="margin-top:14px"><button class="primary" id="btnSubmit">Submit</button>
    <span class="muted">${multi ? 'select all that apply' : it.item_type === 'F' ? 'assign each item' : 'pick one'}</span></div>
    <div id="fb"></div>`;
  c.innerHTML = html;
  c.querySelectorAll('.opt:not(.ropt)').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (multi) { b.classList.toggle('sel'); state.sel.has(i) ? state.sel.delete(i) : state.sel.add(i); }
    else { c.querySelectorAll('.opt:not(.ropt)').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); state.sel = new Set([i]); }
  });
  c.querySelectorAll('.ropt').forEach(b => b.onclick = () => {
    c.querySelectorAll('.ropt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); state.reasonSel = +b.dataset.r;
  });
  $('#btnSubmit').onclick = grade;
}

async function grade() {
  if (state.answered) return;
  const it = state.current;
  let correct = false;
  if (it.item_type === 'F') {
    const bins = {}; document.querySelectorAll('[data-chip]').forEach(s => { bins[Object.keys(it.sort_map)[+s.dataset.chip]] = s.value; });
    correct = Object.entries(it.sort_map).every(([chip, bin]) => bins[chip] === bin);
  } else {
    const key = new Set(it.correct || []);
    const same = state.sel.size === key.size && [...state.sel].every(i => key.has(i));
    let reasonOk = true;
    if (it.item_type === 'D' && it.reason_tier) {
      const rc = Array.isArray(it.reason_tier.correct) ? it.reason_tier.correct[0] : it.reason_tier.correct;
      reasonOk = state.reasonSel === rc;
    }
    correct = same && reasonOk;
  }
  state.answered = true;

  // reveal keyed answers
  if (it.item_type !== 'F') {
    document.querySelectorAll('.opt:not(.ropt)').forEach(b => {
      const i = +b.dataset.i;
      if ((it.correct || []).includes(i)) b.classList.add('correct');
      else if (state.sel.has(i)) b.classList.add('wrong');
    });
    if (it.item_type === 'D' && it.reason_tier) {
      const rc = Array.isArray(it.reason_tier.correct) ? it.reason_tier.correct[0] : it.reason_tier.correct;
      document.querySelectorAll('.ropt').forEach(b => { const i = +b.dataset.r; if (i === rc) b.classList.add('correct'); else if (i === state.reasonSel) b.classList.add('wrong'); });
    }
  }

  const before = await state.srs.cardState(it.id);
  const res = await state.srs.review(it.id, correct, state.now);
  const after = await state.srs.cardState(it.id);
  const eff = after.effective;

  const kcDeltas = res.kcsUpdated.filter(k => !k.kc.startsWith('area:')).map(k => {
    const b = before.kcMastery.find(x => x.kc === k.kc)?.pL ?? null;
    const lab = state.kcCat[k.kc]?.label || k.kc;
    const arrow = b == null ? '' : (k.pL >= b ? '↑' : '↓');
    return `${lab} ${(k.pL * 100).toFixed(0)}%${arrow}`;
  }).join(' · ');

  $('#fb').innerHTML = `<div class="fb ${correct ? 'correct' : 'wrong'}">
    <div><b>${correct ? 'Correct' : 'Not quite'}.</b> ${escapeHtml(it.explanation || '')}</div>
    <div class="muted" style="margin-top:8px">Binary curve → next in <b>${fmtDelta(after.binDueAt - state.now)}</b> ·
      Bayesian → <b>${fmtDelta(after.bayesDueAt - state.now)}</b> ·
      scheduler picks <span class="pill ${eff.by}">${eff.by}</span> (soonest wins)</div>
    ${kcDeltas ? `<div class="muted" style="margin-top:6px">Topic mastery updated for siblings: ${kcDeltas}</div>` : ''}
    <div class="row" style="margin-top:10px"><button class="primary" id="btnNext2">Continue</button></div>
  </div>`;
  $('#btnNext2').onclick = () => nextCard('due');
  await refresh();
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

boot().catch(e => { $('#qcard').innerHTML = `<div class="fb wrong">Boot error: ${escapeHtml(e.message)}<br><pre>${escapeHtml(e.stack || '')}</pre></div>`; });
