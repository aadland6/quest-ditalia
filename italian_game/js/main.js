// ===== Boot, title, character creation, HUD, menus =====

// ---- generic dialog ----
let _dialogCb = null;
function showDialog(face, name, it, en, cb){
  const faceEl = $('dialog-face');
  if (face && typeof Sprites !== 'undefined' && Sprites.has(face)) faceEl.innerHTML = Sprites.html(face, 72);
  else faceEl.textContent = face;
  $('dialog-name').textContent = name;
  $('dialog-text').textContent = LANG === 'it' ? it : en;
  const enBox = $('dialog-text-en');
  enBox.classList.add('hidden');
  enBox.textContent = LANG === 'it' ? en : it;
  _dialogCb = cb || null;
  $('dialog-modal').classList.remove('hidden');
}
$('dialog-translate').onclick = () => $('dialog-text-en').classList.toggle('hidden');
$('dialog-ok').onclick = () => {
  $('dialog-modal').classList.add('hidden');
  const cb = _dialogCb; _dialogCb = null;
  if (cb) cb();
};

// ---- HUD ----
function updateHud(){
  if (!G) return;
  const rr = RACES[G.race];
  if (Sprites.has(rr.sprite)) $('hud-face').innerHTML = Sprites.html(rr.sprite, 34);
  else $('hud-face').textContent = rr.emoji;
  $('hud-name').textContent = G.name;
  $('hud-level').textContent = `${T('level_short')} ${G.level}`;
  $('hud-hp').style.width = Math.max(0, G.hp / maxHp() * 100) + '%';
  $('hud-hp-text').textContent = `${G.hp}/${maxHp()}`;
  $('hud-xp').style.width = Math.min(100, G.xp / xpForLevel(G.level) * 100) + '%';
  const z = ZONES[MAPS[G.map].zone];
  $('hud-zone').textContent = `${LANG === 'it' ? z.it : z.en} · ${z.level}`;
  if (typeof Settings !== 'undefined') Settings.updateBadge();
  $('hud-res').textContent = `🪙${G.resources.monete} 🪵${G.resources.legno} 🪨${G.resources.pietra} 🌾${G.resources.grano}`;
}

// ---- pause menu ----
const Menu = (() => {
  let tab = 'stats';

  function open(t){
    tab = t || 'stats';
    document.querySelectorAll('.menu-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab));
    render();
    $('menu-modal').classList.remove('hidden');
  }

  function render(){
    const c = $('menu-content');
    if (tab === 'stats') {
      const r = RACES[G.race], cl = CLASSES[G.cls];
      c.innerHTML = `
        <h3>${r.emoji} ${G.name} — ${LANG==='it'?r.it:r.en} ${cl.emoji} ${LANG==='it'?cl.it:cl.en}</h3>
        <div class="stat-grid">
          <span>⭐ ${T('level_short')} ${G.level}</span><span>✨ ${G.xp}/${xpForLevel(G.level)} XP</span>
          <span>❤️ ${T('stat_hp')}: ${G.hp}/${maxHp()}</span><span>⚔️ ${T('stat_atk')}: ${G.stats.atk}${G.weapon?` (+${ITEMS[G.weapon].atk})`:''}</span>
          <span>🛡️ ${T('stat_def')}: ${G.stats.def}${G.armor?` (+${ITEMS[G.armor].def})`:''}</span><span>📖 ${T('stat_wis')}: ${G.stats.wis}</span>
          <span>💨 ${T('stat_spd')}: ${G.stats.spd}</span><span>⚔️ ${T('weapon')}: ${G.weapon?ITEMS[G.weapon].emoji+' '+(LANG==='it'?ITEMS[G.weapon].it:ITEMS[G.weapon].en):'—'}</span>
          <span>🥋 ${T('armor')}: ${G.armor?ITEMS[G.armor].emoji+' '+(LANG==='it'?ITEMS[G.armor].it:ITEMS[G.armor].en):'—'}</span><span></span>
        </div>
        <h3 style="margin-top:12px">📊 ${LANG==='it'?'Progressi':'Progress'}</h3>
        <div class="stat-grid">
          <span>✅ ${T('questions_ok')}: ${G.counters.ok}</span>
          <span>❌ ${T('questions_no')}: ${G.counters.no}</span>
          <span>🗡️ ${LANG==='it'?'Battaglie vinte':'Battles won'}: ${G.counters.battles}</span>
          <span>🧠 ${T('new_words')}: ${Object.keys(G.counters.words).length}</span>
        </div>`;
    }
    if (tab === 'bag') {
      const items = Object.entries(G.inventory).filter(([, n]) => n > 0);
      c.innerHTML = `<h3>🎒 ${T('bag_tab')}</h3>` + (items.length
        ? items.map(([id, n]) => {
            const it = ITEMS[id];
            return `<div class="item-row"><span>${it.emoji} ${LANG==='it'?it.it:it.en} ×${n}</span>
              <span class="ir-desc">+${it.heal>999?'MAX':it.heal}❤️</span>
              <button class="small-btn" data-use="${id}">${LANG==='it'?'Usa':'Use'}</button></div>`;
          }).join('')
        : `<p>${T('no_items')}</p>`);
      c.querySelectorAll('[data-use]').forEach(b => b.onclick = () => {
        const id = b.dataset.use, it = ITEMS[id];
        if (G.inventory[id] > 0 && G.hp < maxHp()) {
          G.inventory[id]--;
          G.hp = Math.min(maxHp(), G.hp + it.heal);
          saveGame(); updateHud(); render();
        }
      });
    }
    if (tab === 'review') {
      c.innerHTML = `<h3>📖 ${T('review_tab')}</h3>
        <p>${G.review.length ? T('review_intro') + ' ' + G.review.length : T('review_none')}</p>
        ${G.review.length ? `<br><button class="big-btn" id="btn-review-start">📚 ${T('review_start')}</button>` : ''}`;
      const b = $('btn-review-start');
      if (b) b.onclick = () => {
        $('menu-modal').classList.add('hidden');
        reviewNext();
      };
    }
    if (tab === 'save') {
      c.innerHTML = `<h3>💾 ${T('save_tab')}</h3>
        <button class="small-btn" id="btn-do-save">💾 ${T('save_btn')}</button>
        <button class="small-btn" id="btn-do-export">📤 ${T('export_btn')}</button>
        <button class="small-btn" id="btn-do-import">📥 ${T('import_btn')}</button>
        <p style="margin-top:8px;font-size:12px" id="save-msg"></p>
        <textarea id="save-code" placeholder="${T('save_code')}"></textarea>`;
      $('btn-do-save').onclick = () => { saveGame(); $('save-msg').textContent = '✅ ' + T('save_done'); };
      $('btn-do-export').onclick = () => {
        $('save-code').value = exportSave();
        $('save-code').select();
        $('save-msg').textContent = '📤 ' + T('save_code');
      };
      $('btn-do-import').onclick = () => {
        const code = $('save-code').value;
        if (importSave(code)) {
          LANG = G.lang || 'it'; applyI18n();
          $('menu-modal').classList.add('hidden');
          World.loadMap(); updateHud();
        } else $('save-msg').textContent = '❌ ' + T('bad_code');
      };
    }
  }

  function reviewNext(){
    if (!G.review.length) { toast('🎉 ' + T('review_none')); return; }
    const q = G.review[0];
    q._fromReview = true;
    Quiz.ask({ question: q, onDone: (ok) => {
      if (ok) { gainXp(4); updateHud(); saveGame(); }
      if (G.review.length) setTimeout(reviewNext, 350);
      else toast('🎉 ' + T('review_none'));
    }});
  }

  document.querySelectorAll('.menu-tab').forEach(b => b.onclick = () => open(b.dataset.tab));
  $('menu-close').onclick = () => $('menu-modal').classList.add('hidden');
  return { open };
})();

// ---- character creation ----
const Create = (() => {
  let race = 'topo', cls = 'guerriero';

  function renderCards(){
    const rl = $('race-list'); rl.innerHTML = '';
    for (const [id, r] of Object.entries(RACES)) {
      const d = document.createElement('button');
      d.className = 'pick-card' + (race === id ? ' sel' : '');
      const face = Sprites.has(r.sprite) ? Sprites.html(r.sprite, 40) : r.emoji;
      d.innerHTML = `<span class="pc-emoji">${face}</span><span class="pc-name">${LANG==='it'?r.it:r.en}</span>
        <span class="pc-desc">${LANG==='it'?r.desc_it:r.desc_en}</span>`;
      d.onclick = () => { race = id; renderCards(); };
      rl.appendChild(d);
    }
    const cl = $('class-list'); cl.innerHTML = '';
    for (const [id, c] of Object.entries(CLASSES)) {
      const d = document.createElement('button');
      d.className = 'pick-card' + (cls === id ? ' sel' : '');
      d.innerHTML = `<span class="pc-emoji">${c.emoji}</span><span class="pc-name">${LANG==='it'?c.it:c.en}</span>
        <span class="pc-desc">${LANG==='it'?c.desc_it:c.desc_en}</span>`;
      d.onclick = () => { cls = id; renderCards(); };
      cl.appendChild(d);
    }
    const r = RACES[race], c = CLASSES[cls];
    const st = {};
    for (const k of ['hp','atk','def','wis','spd']) st[k] = r.base[k] + c.mod[k];
    $('create-preview').innerHTML =
      `${r.emoji}${c.emoji} ❤️${st.hp} ⚔️${st.atk} 🛡️${st.def} 📖${st.wis} 💨${st.spd}`;
  }

  function show(){ renderCards(); showScreen('screen-create'); }

  $('btn-create-go').onclick = () => {
    const name = $('create-name').value.trim() || 'Matthias';
    G = newGameState(name, race, cls);
    LANG = 'it'; applyI18n();
    saveGame();
    showScreen('screen-world');
    World.loadMap();
    setTimeout(() => {
      const npc = MAPS.abbazia.npcs[0];
      showDialog(npc.sprite || npc.emoji, npc.name, npc.it, npc.en);
    }, 400);
  };
  $('btn-create-back').onclick = () => showScreen('screen-title');

  return { show };
})();

// ---- title ----
$('btn-new').onclick = () => Create.show();
$('btn-continue').onclick = () => {
  if (loadGame()) {
    LANG = G.lang || 'it';
    applyI18n();
    showScreen('screen-world');
    World.loadMap();
  } else {
    toastTitle(LANG === 'it' ? 'Nessun salvataggio trovato.' : 'No save found.');
  }
};
$('btn-import').onclick = () => {
  const code = prompt(T('paste_code'));
  if (code && importSave(code)) {
    LANG = G.lang || 'it'; applyI18n();
    showScreen('screen-world');
    World.loadMap();
  } else if (code) alert(T('bad_code'));
};
function toastTitle(msg){ alert(msg); }

// ---- world buttons ----
$('btn-menu').onclick = () => Menu.open('stats');
$('btn-lang').onclick = toggleLang;

// ---- boot ----
$('title-wordmark').innerHTML = Sprites.wordmark();
applyI18n();

// dev hook: append ?autotest to the URL to auto-start in the woods and
// auto-walk a few steps — used to verify rendering/movement on real devices.
if (location.search.includes('autotest')) {
  G = newGameState('Prova', 'topo', 'guerriero');
  G.map = 'bosco'; G.x = 12; G.y = 1;
  showScreen('screen-world'); World.loadMap();
  setTimeout(() => {           // wait for sprite decode, then pace west/south
    const path = ['ArrowLeft','ArrowLeft','ArrowDown','ArrowLeft','ArrowDown','ArrowLeft','ArrowLeft','ArrowDown'];
    let step = 0;
    const iv = setInterval(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: path[step], bubbles: true }));
      if (++step >= path.length) clearInterval(iv);
    }, 600);
  }, 4000);
}
if (localStorage.getItem(SAVE_KEY)) $('btn-continue').style.opacity = 1;
else $('btn-continue').style.opacity = 0.6;
