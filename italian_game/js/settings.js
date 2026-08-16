// ===== ⚙️ Study settings — level & topic filters for all quizzes =====

const Settings = (() => {

  function isActive(){
    return G && G.study && (G.study.levels.length > 0 || G.study.topics.length > 0);
  }

  function updateBadge(){
    $('btn-settings').classList.toggle('filtered', !!isActive());
  }

  function toggle(arr, value){
    const i = arr.indexOf(value);
    if (i >= 0) arr.splice(i, 1); else arr.push(value);
  }

  function topicLabel(slug){
    return slug.replace(/-/g, ' ');
  }

  function open(){
    render();
    $('settings-modal').classList.remove('hidden');
  }

  function close(){
    $('settings-modal').classList.add('hidden');
    saveGame();
    updateBadge();
    if (isActive()) toast('⚙️ ' + T('study_active'));
  }

  function render(){
    // --- level chips ---
    const lvBox = $('set-levels');
    lvBox.innerHTML = '';
    for (const lv of ['A1', 'A2', 'B1']) {
      const b = document.createElement('button');
      b.className = 'chip' + (G.study.levels.includes(lv) ? ' on' : '');
      b.textContent = lv;
      b.onclick = () => { toggle(G.study.levels, lv); render(); };
      lvBox.appendChild(b);
    }

    // --- topic chips, grouped by level + endless-drill generators ---
    const tBox = $('set-topics');
    tBox.innerHTML = '';

    const genGroup = document.createElement('div');
    genGroup.className = 'topic-group';
    genGroup.innerHTML = `<div class="tg-title lvl-GEN">♾️ ${T('study_gen')}</div>`;
    const genRow = document.createElement('div');
    genRow.className = 'chip-row';
    for (const [slug, key] of [['gen:conj', 'study_gen_conj'], ['gen:vocab', 'study_gen_vocab']]) {
      const b = document.createElement('button');
      b.className = 'chip' + (G.study.topics.includes(slug) ? ' on' : '');
      b.textContent = T(key);
      b.onclick = () => { toggle(G.study.topics, slug); render(); };
      genRow.appendChild(b);
    }
    genGroup.appendChild(genRow);
    tBox.appendChild(genGroup);

    const cat = QuizGen.topicCatalog();
    for (const lv of ['A1', 'A2', 'B1']) {
      const group = document.createElement('div');
      group.className = 'topic-group';
      group.innerHTML = `<div class="tg-title lvl-${lv}">${lv}</div>`;
      const row = document.createElement('div');
      row.className = 'chip-row';
      for (const [slug, n] of cat[lv]) {
        const b = document.createElement('button');
        b.className = 'chip' + (G.study.topics.includes(slug) ? ' on' : '');
        b.innerHTML = `${topicLabel(slug)} <span class="chip-n">${n}</span>`;
        b.onclick = () => { toggle(G.study.topics, slug); render(); };
        row.appendChild(b);
      }
      group.appendChild(row);
      tBox.appendChild(group);
    }
  }

  $('btn-settings').onclick = () => { if (G) open(); };
  $('settings-close').onclick = close;
  $('set-reset').onclick = () => {
    G.study.levels = [];
    G.study.topics = [];
    render();
  };

  return { open, updateBadge };
})();
