/* Impara — static Italian trainer. GitHub Pages + IndexedDB. No backend. */
'use strict';

/* ---------- IndexedDB progress store ---------- */
const DB = (() => {
  let dbp;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('impara-it', 1);
      r.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('prog'))
          db.createObjectStore('prog', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta'))
          db.createObjectStore('meta', { keyPath: 'k' });
      };
      r.onsuccess = e => res(e.target.result);
      r.onerror = e => rej(e.target.error);
    });
    return dbp;
  }
  async function tx(store, mode) { return (await open()).transaction(store, mode).objectStore(store); }
  return {
    async get(id){ const s=await tx('prog','readonly'); return new Promise(r=>{const q=s.get(id);q.onsuccess=()=>r(q.result||null);q.onerror=()=>r(null);}); },
    async put(rec){ const s=await tx('prog','readwrite'); return new Promise(r=>{s.put(rec).onsuccess=()=>r();}); },
    async all(){ const s=await tx('prog','readonly'); return new Promise(r=>{const q=s.getAll();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>r([]);}); },
    async clear(){ const s=await tx('prog','readwrite'); return new Promise(r=>{s.clear().onsuccess=()=>r();}); },
  };
})();

/* ---------- SRS (Leitner) ---------- */
const DAY = 86400000;
const BOX_DAYS = [0, 1, 3, 7, 16, 35, 75];
function schedule(prog, quality) {
  // quality: 0 again, 1 hard, 2 good, 3 easy  (MC correct→good, wrong→again)
  const now = Date.now();
  let box = prog ? prog.box : 0;
  if (quality === 0) box = 0;
  else if (quality === 1) box = Math.max(0, box);       // stay
  else if (quality === 2) box = Math.min(BOX_DAYS.length - 1, box + 1);
  else box = Math.min(BOX_DAYS.length - 1, box + 2);
  const due = now + BOX_DAYS[box] * DAY + (box === 0 ? 0 : 0);
  return {
    box,
    due,
    seen: (prog?.seen || 0) + 1,
    correct: (prog?.correct || 0) + (quality >= 2 ? 1 : 0),
    wrong: (prog?.wrong || 0) + (quality < 2 ? 1 : 0),
    last: now,
  };
}

/* ---------- State ---------- */
const State = {
  index: null, bank: {}, silent: false,
  queue: [], pos: 0, sessionStats: { correct: 0, total: 0 }, currentLevel: null,
};
const SESSION_SIZE = 20;
const $ = s => document.querySelector(s);
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

/* ---------- Boot ---------- */
async function boot() {
  State.silent = localStorage.getItem('silent') === '1';
  $('#silentToggle').checked = State.silent;
  $('#silentToggle').addEventListener('change', e => {
    State.silent = e.target.checked; localStorage.setItem('silent', State.silent ? '1' : '0');
  });
  $('#quitBtn').onclick = () => showScreen('home');
  $('#homeBtn').onclick = () => { renderHome(); showScreen('home'); };
  $('#againBtn').onclick = () => (State.currentLevel ? startSession(State.currentLevel) : startMixed());
  $('#nextBtn').onclick = advance;
  $('#resetBtn').onclick = async () => { if (confirm('Reset all progress?')) { await DB.clear(); renderHome(); } };
  try {
    State.index = await fetch('data/index.json').then(r => { if(!r.ok) throw new Error(r.status); return r.json(); });
  } catch (err) {
    $('#loadErr').hidden = false;
    $('#loadErr').textContent = 'Could not load question bank (data/index.json). Serve this folder over HTTP (GitHub Pages or a local server) — opening the file directly with file:// blocks fetch.';
    return;
  }
  await renderHome();
}

/* ---------- Home ---------- */
async function renderHome() {
  const prog = await DB.all();
  const byId = new Map(prog.map(p => [p.id, p]));
  const host = $('#levelCards'); host.innerHTML = '';
  const desc = { A1:'Beginner — first words & sounds', A2:'Elementary — everyday phrases', B1:'Intermediate — connected speech', B2:'Upper-int. — nuance & subjunctive' };

  // Mixed review card — spaced-repetition across ALL levels
  const now0 = Date.now();
  const dueCount = prog.filter(p => p.due <= now0).length;
  const mixed = document.createElement('div');
  mixed.className = 'level-card mixed';
  mixed.innerHTML = `<div class="lc-badge" style="background:var(--accent)">🔀</div>
    <div class="lc-body"><div class="lc-title">Mixed review</div>
    <div class="lc-sub">${dueCount ? dueCount + ' item' + (dueCount===1?'':'s') + ' due · all levels' : 'Spaced review across all levels'}</div></div>
    <div class="lc-ring" style="--p:0;background:var(--accent)"><span>${dueCount||'—'}</span></div>`;
  mixed.onclick = () => startMixed();
  host.appendChild(mixed);

  let totalSeen = 0;
  for (const lv of State.index.levels) {
    const count = State.index.counts[lv] || 0;
    const seen = (State.index.ids?.[lv] || []).filter(id => byId.has(id)).length;
    totalSeen += seen;
    const pct = count ? Math.round(seen / count * 100) : 0;
    const card = document.createElement('div');
    card.className = 'level-card';
    card.innerHTML = `<div class="lc-badge">${lv}</div>
      <div class="lc-body"><div class="lc-title">${lv} · ${count} items</div>
      <div class="lc-sub">${desc[lv]||''}</div></div>
      <div class="lc-ring" style="--p:${pct}"><span>${pct}%</span></div>`;
    card.onclick = () => startSession(lv);
    host.appendChild(card);
  }
  const grand = Object.values(State.index.counts).reduce((a,b)=>a+b,0);
  $('#statLine').textContent = `${totalSeen} / ${grand} items studied`;
}

/* ---------- Session ---------- */
async function loadBank(lv) {
  if (State.bank[lv]) return State.bank[lv];
  const arr = await fetch('data/' + State.index.chunks[lv]).then(r => r.json());
  State.bank[lv] = arr; return arr;
}
async function startSession(lv) {
  State.currentLevel = lv;
  const items = await loadBank(lv);
  const prog = new Map((await DB.all()).map(p => [p.id, p]));
  const now = Date.now();
  const visible = items.filter(it => !(State.silent && it.audio === 'required'));
  const due = [], fresh = [];
  for (const it of visible) {
    const p = prog.get(it.id);
    if (!p) fresh.push(it);
    else if (p.due <= now) due.push(it);
  }
  due.sort((a,b)=>(prog.get(a.id).due)-(prog.get(b.id).due));
  const queue = due.slice(0, SESSION_SIZE);
  for (const it of shuffle(fresh)) { if (queue.length >= SESSION_SIZE) break; queue.push(it); }
  if (queue.length === 0) queue.push(...shuffle(visible).slice(0, SESSION_SIZE)); // all reviewed → free practice
  State.queue = queue; State.pos = 0; State.sessionStats = { correct: 0, total: 0 };
  showScreen('study'); renderCurrent();
}
async function startMixed() {
  State.currentLevel = null; // null == mixed mode
  const all = [];
  for (const lv of State.index.levels) all.push(...await loadBank(lv));
  const prog = new Map((await DB.all()).map(p => [p.id, p]));
  const now = Date.now();
  const visible = all.filter(it => !(State.silent && it.audio === 'required'));
  const due = [], byLv = { A1:[], A2:[], B1:[], B2:[] };
  for (const it of visible) {
    const p = prog.get(it.id);
    if (!p) byLv[it.cefr_level].push(it);       // unseen, grouped by level
    else if (p.due <= now) due.push(it);         // due for review
  }
  due.sort((a,b) => prog.get(a.id).due - prog.get(b.id).due);
  const queue = due.slice(0, SESSION_SIZE);
  // fill remaining with fresh items, high-frequency-first (lower levels first, shuffled within)
  const fresh = [...shuffle(byLv.A1), ...shuffle(byLv.A2), ...shuffle(byLv.B1), ...shuffle(byLv.B2)];
  for (const it of fresh) { if (queue.length >= SESSION_SIZE) break; queue.push(it); }
  if (queue.length === 0) queue.push(...shuffle(visible).slice(0, SESSION_SIZE));
  State.queue = queue; State.pos = 0; State.sessionStats = { correct: 0, total: 0 };
  showScreen('study'); renderCurrent();
}
function updateProgressUI() {
  const total = State.queue.length, done = State.pos;
  $('#progressBar').style.width = (total ? done/total*100 : 0) + '%';
  $('#sessionCount').textContent = `${done}/${total}`;
}
function renderCurrent() {
  updateProgressUI();
  $('#feedback').hidden = true;
  const item = State.queue[State.pos];
  const host = $('#cardHost'); host.innerHTML = '';
  (RENDER[item.format] || RENDER.fallback)(item, host);
}
function afterAnswer(correct, item, quality) {
  State.sessionStats.total++; if (correct) State.sessionStats.correct++;
  DB.get(item.id).then(p => DB.put({ id:item.id, ...schedule(p, quality) }));
  const fb = $('#feedback'); fb.hidden = false;
  fb.className = 'feedback ' + (correct ? 'good' : 'bad');
  $('#feedbackBody').innerHTML =
    `<div class="fb-verdict">${correct ? '✓ Giusto!' : '✗ ' + (item.__reveal || 'Non proprio')}</div>` +
    `<div class="fb-expl">${escapeHtml(item.explanation || '')}</div>`;
  $('#nextBtn').focus();
}
function advance() {
  State.pos++;
  if (State.pos >= State.queue.length) return endSession();
  renderCurrent();
}
function endSession() {
  showScreen('summary');
  const { correct, total } = State.sessionStats;
  $('#summaryStats').innerHTML =
    `<div><div class="s-num">${total}</div><div class="s-lbl">Reviewed</div></div>
     <div><div class="s-num">${correct}</div><div class="s-lbl">Correct</div></div>
     <div><div class="s-num">${total?Math.round(correct/total*100):0}%</div><div class="s-lbl">Accuracy</div></div>`;
  renderHome();
}
function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); $('#'+id).classList.add('active'); }
function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ---------- shared bits ---------- */
function kicker(t){ const d=document.createElement('div'); d.className='q-kicker'; d.textContent=t; return d; }
function ttsWord(item){
  // Word to speak when there is no recorded clip: prefer the Italian lemma.
  return (item.italian && item.italian.lemma) || item.prompt.text || '';
}
function speakIt(text){
  try{
    if(!('speechSynthesis' in window) || !text) return false;
    const u=new SpeechSynthesisUtterance(text); u.lang='it-IT';
    const v=(window.speechSynthesis.getVoices()||[]).find(v=>/^it/i.test(v.lang));
    if(v) u.voice=v;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); return true;
  }catch(e){ return false; }
}
function audioButton(item){
  if (State.silent) return null;
  const hasClip = !!item.prompt.audio_ref;
  const word = ttsWord(item);
  // Show the button if we have a native clip OR a word we can synthesize.
  if (!hasClip && !word) return null;
  const b=document.createElement('button'); b.className='audio-btn';
  b.textContent='🔊 Ascolta';
  b.onclick=()=>{
    if(hasClip){
      try{ new Audio(item.prompt.audio_ref).play(); return; }catch(e){}
    }
    speakIt(word); // fallback: browser/machine TTS (it-IT)
  };
  return b;
}
function promptBlock(item, {emoji=true, text=true}={}){
  const wrap=document.createElement('div'); wrap.className='q-prompt';
  if (emoji && item.prompt.emoji){ const e=document.createElement('div'); e.className='q-emoji'; e.textContent=item.prompt.emoji; wrap.appendChild(e); }
  if (text && item.prompt.text){ const t=document.createElement('div'); t.className='q-text'; t.textContent=item.prompt.text; wrap.appendChild(t); }
  const ab=audioButton(item); if(ab) wrap.appendChild(ab);
  return wrap;
}
function mcOptions(item, host, {emoji=false, twoCol=false}={}){
  const box=document.createElement('div'); box.className='opts'+(emoji?' emoji':'')+(twoCol?' two':'');
  const order=shuffle(item.options.map((o,i)=>i));
  const correctSet=new Set(item.correct);
  order.forEach(i=>{
    const b=document.createElement('div'); b.className='opt'+(emoji?' emoji-opt':''); b.textContent=item.options[i];
    b.onclick=()=>{
      if(box.dataset.done) return; box.dataset.done='1';
      const ok=correctSet.has(i);
      b.classList.add(ok?'correct':'wrong');
      if(!ok){ item.__reveal='Risposta: '+item.options[[...correctSet][0]];
        box.querySelectorAll('.opt').forEach((el,idx)=>{ if(correctSet.has(order[idx])) el.classList.add('correct'); }); }
      box.querySelectorAll('.opt').forEach(el=>{ if(el!==b && !el.classList.contains('correct')) el.classList.add('dim'); });
      afterAnswer(ok, item, ok?2:0);
    };
    box.appendChild(b);
  });
  host.appendChild(box);
}
function checkButton(label, onClick){
  const b=document.createElement('button'); b.className='check-btn'; b.textContent=label||'Verifica'; b.onclick=onClick; return b;
}

/* ---------- Renderers per format ---------- */
const RENDER = {};

// 1: flashcard (emoji/text -> word), self-graded recall
RENDER[1] = (item, host) => {
  host.appendChild(kicker('Ricorda la parola'));
  host.appendChild(promptBlock(item, {text:!item.prompt.emoji}));
  const flash=document.createElement('div'); flash.className='flash'; host.appendChild(flash);
  const showBtn=checkButton('Mostra risposta', ()=>{
    flash.innerHTML='';
    const ans=document.createElement('div'); ans.className='reveal';
    ans.textContent=(item.italian.article?item.italian.article+' ':'')+item.italian.lemma; flash.appendChild(ans);
    if(item.italian.ipa){ const i=document.createElement('div'); i.className='ipa'; i.textContent='/'+item.italian.ipa+'/'; flash.appendChild(i); }
    const rate=document.createElement('div'); rate.className='self-rate';
    [['Again','again',0],['Hard','hard',1],['Good','good',2],['Easy','easy',3]].forEach(([lbl,cls,q])=>{
      const rb=document.createElement('button'); rb.className=cls; rb.textContent=lbl;
      rb.onclick=()=>afterAnswer(q>=2, item, q); rate.appendChild(rb);
    });
    flash.appendChild(rate);
  });
  flash.appendChild(showBtn);
};

// 3: word -> picture(emoji) MC
RENDER[3] = (item, host) => {
  host.appendChild(kicker('Tocca l’immagine giusta'));
  const p=document.createElement('div'); p.className='q-prompt';
  const t=document.createElement('div'); t.className='q-text';
  t.textContent=item.prompt.text || ((item.italian.article?item.italian.article+' ':'')+item.italian.lemma);
  p.appendChild(t); const ab=audioButton(item); if(ab)p.appendChild(ab); host.appendChild(p);
  mcOptions(item, host, {emoji:true});
};

// 4: cloze / gap-fill
RENDER[4] = (item, host) => {
  host.appendChild(kicker('Completa la frase'));
  host.appendChild(sentenceBlock(item.prompt.sentence));
  mcOptions(item, host, {twoCol:true});
};

// 6: error correction
RENDER[6] = (item, host) => {
  host.appendChild(kicker('Scegli la frase corretta'));
  if(item.prompt.sentence){ const s=sentenceBlock(item.prompt.sentence); s.style.opacity=.8; host.appendChild(s); }
  mcOptions(item, host);
};

// 9: reading passage + comprehension
RENDER[9] = (item, host) => {
  host.appendChild(kicker('Leggi e rispondi'));
  host.appendChild(sentenceBlock(item.prompt.sentence));
  const q=document.createElement('div'); q.className='q-instr'; q.textContent=item.prompt.text; host.appendChild(q);
  mcOptions(item, host);
};

// 10: transformation (MC or tiles)
RENDER[10] = (item, host) => {
  host.appendChild(kicker('Trasforma'));
  const p=document.createElement('div'); p.className='q-instr'; p.textContent=item.prompt.text; host.appendChild(p);
  if (item.tiles && item.tiles.length) return tileSpelling(item, host, '');
  mcOptions(item, host, {twoCol:true});
};

// 7: letter-tile spelling
RENDER[7] = (item, host) => {
  host.appendChild(kicker('Scrivi la parola'));
  host.appendChild(promptBlock(item, {text:!item.prompt.emoji}));
  tileSpelling(item, host, '');
};

// 8: sentence building from word tiles
RENDER[8] = (item, host) => {
  host.appendChild(kicker('Ordina le parole'));
  if(item.prompt.text){ const p=document.createElement('div'); p.className='q-instr'; p.textContent=item.prompt.text; host.appendChild(p); }
  tileSpelling(item, host, ' ');
};

// shared tile engine for 7/8/10-tiles
function tileSpelling(item, host, sep){
  const target = item.correct.map(i => item.tiles[i]).join(sep);
  const tray=document.createElement('div'); tray.className='tile-tray';
  const bank=document.createElement('div'); bank.className='tile-bank';
  const placed=[];
  item.tiles.forEach((tk,i)=>{
    const t=document.createElement('div'); t.className='tile'+(sep===''?' letter':'');
    t.textContent=tk;
    t.onclick=()=>{ if(t.classList.contains('placed'))return; t.classList.add('placed');
      const c=t.cloneNode(true); c.classList.remove('placed'); c.onclick=()=>{ c.remove(); t.classList.remove('placed'); syncBtn(); };
      tray.appendChild(c); placed.push(i); syncBtn(); };
    bank.appendChild(t);
  });
  host.appendChild(tray); host.appendChild(bank);
  const btn=checkButton('Verifica', ()=>{
    const built=[...tray.children].map(c=>c.textContent).join(sep);
    const ok = built === target;
    if(!ok) item.__reveal = 'Risposta: '+target;
    tray.style.borderColor = ok?'var(--good)':'var(--bad)';
    afterAnswer(ok, item, ok?2:0);
  });
  btn.disabled=true; host.appendChild(btn);
  function syncBtn(){ btn.disabled = tray.children.length===0; }
}

// 5: gender / agreement sort
RENDER[5] = (item, host) => {
  host.appendChild(kicker(item.prompt.text || 'Ordina nei contenitori'));
  const nouns=Object.keys(item.sort_map);
  const pool=document.createElement('div'); pool.className='sort-pool';
  const bins=document.createElement('div'); bins.className='bins';
  let selected=null;
  const binEls={};
  item.options.forEach(b=>{
    const be=document.createElement('div'); be.className='bin';
    be.innerHTML=`<div class="bin-label">${b}</div>`; binEls[b]=be;
    be.onclick=()=>{ if(!selected)return; const chip=selected; chip.dataset.bin=b; be.appendChild(chip);
      chip.style.opacity=1; selected=null; };
    bins.appendChild(be);
  });
  shuffle(nouns).forEach(n=>{
    const c=document.createElement('div'); c.className='chip'; c.textContent=n; c.dataset.noun=n;
    c.onclick=()=>{ selected && (selected.style.outline=''); selected=c; c.style.outline='2px solid var(--accent)'; };
    pool.appendChild(c);
  });
  host.appendChild(pool); host.appendChild(bins);
  host.appendChild(checkButton('Verifica', ()=>{
    let ok=true;
    document.querySelectorAll('.chip').forEach(c=>{ if(c.dataset.bin!==item.sort_map[c.dataset.noun]) ok=false; });
    if(!ok) item.__reveal='Controlla i generi';
    afterAnswer(ok, item, ok?2:0);
  }));
};

// 11: matching pairs
RENDER[11] = (item, host) => {
  host.appendChild(kicker('Abbina le coppie'));
  const validPairs=new Set(item.correct.map(p=>p.join('-')));
  const leftIdx=[...new Set(item.correct.map(p=>p[0]))];
  const rightIdx=[...new Set(item.correct.map(p=>p[1]))];
  const wrap=document.createElement('div'); wrap.style.display='grid'; wrap.style.gridTemplateColumns='1fr 1fr'; wrap.style.gap='10px';
  const colL=document.createElement('div'), colR=document.createElement('div');
  colL.className='opts'; colR.className='opts'; wrap.appendChild(colL); wrap.appendChild(colR);
  let selL=null, matched=0, mistakes=0;
  function mkChip(i, col, isLeft){
    const b=document.createElement('div'); b.className='opt'; b.style.fontSize=/\p{Emoji}/u.test(item.options[i])?'2.2rem':'1rem';
    b.textContent=item.options[i]; b.dataset.i=i;
    b.onclick=()=>{
      if(b.classList.contains('correct'))return;
      if(isLeft){ if(selL)selL.style.outline=''; selL=b; b.style.outline='2px solid var(--accent)'; return; }
      if(!selL)return;
      const key=selL.dataset.i+'-'+i;
      if(validPairs.has(key)){ b.classList.add('correct'); selL.classList.add('correct'); selL.style.outline=''; selL=null; matched++;
        if(matched===item.correct.length){ afterAnswer(mistakes===0, item, mistakes===0?3:(mistakes<=2?2:1)); } }
      else { mistakes++; b.classList.add('wrong'); const bb=selL; setTimeout(()=>{b.classList.remove('wrong');bb.style.outline='';},450); selL=null; }
    };
    col.appendChild(b);
  }
  shuffle(leftIdx).forEach(i=>mkChip(i,colL,true));
  shuffle(rightIdx).forEach(i=>mkChip(i,colR,false));
  host.appendChild(wrap);
};

RENDER.fallback = (item, host) => {
  host.appendChild(kicker('Item'));
  const d=document.createElement('div'); d.className='q-text'; d.textContent=item.prompt.text||item.italian?.lemma||'—'; host.appendChild(d);
  host.appendChild(checkButton('Continua', ()=>afterAnswer(true,item,2)));
};

function sentenceBlock(text){
  const d=document.createElement('div'); d.className='q-sentence';
  d.innerHTML = escapeHtml(text||'').replace(/_{2,}|\bblank\b/gi,'<span class="blank">____</span>');
  return d;
}

boot();
