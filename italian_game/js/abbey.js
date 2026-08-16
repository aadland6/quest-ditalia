// ===== Abbey building minigame + forge shop =====

const Abbey = (() => {

  function resLine(){
    return Object.entries(G.resources)
      .map(([k, v]) => `${RES_INFO[k].emoji} ${v}`).join('  ');
  }

  function costText(cost){
    return Object.entries(cost).map(([k, v]) => `${v}${RES_INFO[k].emoji}`).join(' ');
  }

  function canAfford(cost){
    return Object.entries(cost).every(([k, v]) => (G.resources[k] || 0) >= v);
  }

  function open(){
    $('abbey-res').textContent = resLine();
    const box = $('abbey-buildings');
    box.innerHTML = '';
    for (const [id, b] of Object.entries(BUILDINGS)) {
      const lv = G.buildings[id];
      const row = document.createElement('div');
      row.className = 'building';
      const stars = '⭐'.repeat(lv) + '☆'.repeat(b.max - lv);
      let btnHtml;
      if (lv >= b.max) {
        btnHtml = `<button class="small-btn build-btn" disabled>${T('max_level')}</button>`;
      } else {
        const cost = b.costs[lv];
        btnHtml = `<button class="small-btn build-btn" data-b="${id}" ${canAfford(cost) ? '' : 'disabled'}>
          ${lv === 0 ? T('build') : T('upgrade')}</button>`;
      }
      row.innerHTML = `
        <div class="b-emoji">${b.emoji}</div>
        <div class="b-info">
          <div class="b-name">${LANG === 'it' ? b.it : b.en} ${stars}</div>
          <div class="b-desc">${LANG === 'it' ? b.desc_it : b.desc_en}</div>
          ${lv < b.max ? `<div class="b-cost">${costText(b.costs[lv])}</div>` : ''}
        </div>
        ${btnHtml}`;
      box.appendChild(row);
    }
    box.querySelectorAll('[data-b]').forEach(btn => {
      btn.onclick = () => build(btn.dataset.b);
    });
    $('abbey-modal').classList.remove('hidden');
  }

  function build(id){
    const b = BUILDINGS[id];
    const lv = G.buildings[id];
    if (lv >= b.max) return;
    const cost = b.costs[lv];
    if (!canAfford(cost)) { toast(T('not_enough')); return; }
    for (const [k, v] of Object.entries(cost)) G.resources[k] -= v;
    G.buildings[id]++;
    if (id === 'infermeria') G.hp = Math.min(maxHp(), G.hp + 5);
    saveGame(); updateHud();
    toast(`${b.emoji} ${T('built_msg')}`);
    open(); // refresh
  }

  // ---- forge shop ----
  function openShop(){
    $('shop-title').textContent = `🔥 ${LANG === 'it' ? 'Fucina di Bruno' : "Bruno's Forge"} — 🪙 ${G.resources.monete}`;
    const box = $('shop-items');
    box.innerHTML = '';
    const wares = Object.entries(ITEMS).filter(([id, it]) =>
      it.type === 'heal' || (it.forge !== undefined && it.forge <= G.buildings.fucina));
    for (const [id, it] of wares) {
      const row = document.createElement('div');
      row.className = 'item-row';
      const owned = it.type === 'weapon' ? G.weapon === id : it.type === 'armor' ? G.armor === id : false;
      const already = (it.type === 'weapon' || it.type === 'armor') && G.flags['own_' + id];
      const statTxt = it.type === 'heal' ? `+${it.heal > 999 ? 'MAX' : it.heal}❤️`
        : it.type === 'weapon' ? `+${it.atk}⚔️` : `+${it.def}🛡️`;
      let btn;
      if (owned) btn = `<button class="small-btn" disabled>${T('equipped')}</button>`;
      else if (already) btn = `<button class="small-btn" data-eq="${id}">${T('owned')} → ${T('equipped').split(' ')[0]}</button>`;
      else btn = `<button class="small-btn" data-buy="${id}" ${G.resources.monete >= it.price ? '' : 'disabled'}>🪙${it.price}</button>`;
      row.innerHTML = `<span>${it.emoji} ${LANG === 'it' ? it.it : it.en}</span>
        <span class="ir-desc">${statTxt}</span> ${btn}`;
      box.appendChild(row);
    }
    box.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buy(b.dataset.buy));
    box.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { equip(b.dataset.eq); openShop(); });
    $('shop-modal').classList.remove('hidden');
  }

  function buy(id){
    const it = ITEMS[id];
    if (G.resources.monete < it.price) { toast(T('not_enough')); return; }
    G.resources.monete -= it.price;
    if (it.type === 'heal') {
      G.inventory[id] = (G.inventory[id] || 0) + 1;
    } else {
      G.flags['own_' + id] = true;
      equip(id);
    }
    saveGame(); updateHud(); openShop();
  }

  function equip(id){
    const it = ITEMS[id];
    if (it.type === 'weapon') G.weapon = id;
    if (it.type === 'armor') G.armor = id;
    saveGame();
  }

  $('abbey-close').onclick = () => $('abbey-modal').classList.add('hidden');
  $('shop-close').onclick = () => $('shop-modal').classList.add('hidden');

  return { open, openShop };
})();
