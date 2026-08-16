// ===== Turn-based battle, powered by Italian questions =====

const Battle = (() => {
  let enemy = null, enemyMax = 0, streak = 0, onEnd = null, busy = false;

  function zoneOf(){ return ZONES[MAPS[G.map].zone]; }

  function start(enemyId, cb){
    const base = ENEMIES[enemyId];
    // scale enemy slightly with player level above its own
    const over = Math.max(0, G.level - base.lv);
    enemy = {
      id: enemyId, ...base,
      hp: base.hp + over * 4,
      atk: base.atk + over * 1,
    };
    enemyMax = enemy.hp;
    streak = 0; busy = false; onEnd = cb || null;
    Quiz.resetBattleHints();

    const esz = enemy.boss ? 104 : 84;
    if (enemy.sprite && Sprites.has(enemy.sprite)) {
      $('enemy-emoji').innerHTML = `<span class="sprite-stack">${Sprites.html(enemy.sprite, esz)}${enemy.overlay ? Sprites.html(enemy.overlay, esz, 'ovl') : ''}</span>`;
      $('enemy-emoji').style.fontSize = '';
    } else {
      $('enemy-emoji').textContent = enemy.emoji;
      $('enemy-emoji').style.fontSize = enemy.boss ? '96px' : '72px';
    }
    $('enemy-emoji').className = 'c-emoji' + (enemy.boss ? ' boss' : '');
    $('enemy-name').textContent = (LANG === 'it' ? enemy.it : enemy.en) + ` (Lv ${enemy.lv})`;
    if (Sprites.has(RACES[G.race].sprite)) $('player-emoji').innerHTML = Sprites.html(RACES[G.race].sprite, 84);
    else $('player-emoji').textContent = RACES[G.race].emoji;
    $('player-emoji').className = 'c-emoji';
    $('player-name').textContent = G.name;
    $('battle-log').innerHTML = '';
    log(`⚔️ ${T('enemy_appears')} ${enemy.emoji} ${LANG === 'it' ? enemy.it : enemy.en}!`, 'info');
    bars();
    setMenu(true);
    $('bb-special').disabled = G.buildings.fucina < 2;
    showScreen('screen-battle');
  }

  function log(msg, cls){
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.innerHTML = msg;
    const el = $('battle-log');
    el.appendChild(p);
    el.scrollTop = el.scrollHeight;
  }

  function bars(){
    $('enemy-hp').style.width = Math.max(0, enemy.hp / enemyMax * 100) + '%';
    $('player-hp').style.width = Math.max(0, G.hp / maxHp() * 100) + '%';
    updateHud();
  }

  function setMenu(on){
    ['bb-attack','bb-special','bb-item','bb-flee'].forEach(id => $(id).disabled = !on);
    if (on) $('bb-special').disabled = G.buildings.fucina < 2;
  }

  function playerAttack(harder){
    if (busy) return;
    if (harder && G.buildings.fucina < 2) { log(T('special_locked'), 'info'); return; }
    busy = true; setMenu(false);
    const z = zoneOf();
    Quiz.ask({
      level: z.level, topics: z.topics, harder,
      onDone: (ok) => {
        if (ok) {
          streak++;
          const mult = (harder ? 2 : 1) * (1 + Math.min(streak - 1, 5) * 0.12);
          const dmg = Math.max(2, Math.round((atkTotal() * 1.6 + 2 - enemy.def * 0.5) * mult));
          enemy.hp -= dmg;
          hitAnim('enemy-emoji');
          log(`${T('you_advance')} <b>-${dmg}</b> ${streak > 1 ? `(🔥 ${T('streak')} x${streak})` : ''}`, 'good');
        } else {
          streak = 0;
          log(T('you_miss'), 'bad');
        }
        bars();
        if (enemy.hp <= 0) return victory();
        setTimeout(enemyTurn, 600);
      }
    });
  }

  function enemyTurn(){
    // dodge chance from speed
    const dodge = Math.min(0.35, Math.max(0, (G.stats.spd - enemy.spd) * 0.03 + 0.08));
    if (Math.random() < dodge) {
      log(`💨 ${G.name} schiva! (dodged!)`, 'good');
    } else {
      const dmg = Math.max(1, Math.round(enemy.atk * 1.3 - defTotal() * 0.7 + Math.random() * 3));
      G.hp -= dmg;
      hitAnim('player-emoji');
      log(`${enemy.emoji} ${LANG === 'it' ? enemy.it : enemy.en} ${T('enemy_hits')} <b>-${dmg}</b>`, 'bad');
    }
    bars();
    if (G.hp <= 0) return defeat();
    busy = false; setMenu(true);
  }

  function hitAnim(id){
    const el = $(id);
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  }

  function victory(){
    $('enemy-emoji').classList.add('dead');
    const [c1, c2] = enemy.coins;
    const coinMult = 1 + G.buildings.mulino * 0.15;
    const coins = Math.round((c1 + Math.random() * (c2 - c1)) * coinMult);
    G.resources.monete += coins;
    let dropTxt = '';
    for (const [res, [a, b]] of Object.entries(enemy.drops || {})) {
      const n = a + Math.floor(Math.random() * (b - a + 1));
      if (n > 0) { G.resources[res] = (G.resources[res] || 0) + n; dropTxt += ` +${n}${RES_INFO[res].emoji}`; }
    }
    const { got, leveled } = gainXp(enemy.xp);
    G.counters.battles++;
    log(`🏆 <b>${T('victory')}</b> +${got} ${T('got_xp')}, +${coins}🪙${dropTxt}`, 'good');
    if (leveled) log(`⭐ <b>${T('level_up')}</b> (Lv ${G.level})`, 'good');
    saveGame();
    endSoon(1400, true);
  }

  function defeat(){
    $('player-emoji').classList.add('dead');
    log(`💀 <b>${T('defeat')}</b>`, 'bad');
    G.resources.monete = Math.floor(G.resources.monete * 0.7);
    G.hp = Math.max(1, Math.floor(maxHp() * 0.5));
    G.map = 'abbazia'; G.x = 11; G.y = 13;
    saveGame();
    setTimeout(() => {
      showScreen('screen-world');
      World.loadMap();
      showDialog('hedgehog', 'Fratello Aldo', T('respawn_msg'), T('respawn_msg'));
      if (onEnd) onEnd(false);
    }, 1600);
  }

  function flee(){
    if (busy) return;
    busy = true; setMenu(false);
    const chance = Math.min(0.9, 0.5 + (G.stats.spd - enemy.spd) * 0.04 + (G.cls === 'sentinella' ? 0.15 : 0));
    if (enemy.boss) { log(T('flee_fail'), 'bad'); setTimeout(enemyTurn, 700); return; }
    if (Math.random() < chance) {
      log(`🏃 ${T('fled')}`, 'info');
      endSoon(900, false);
    } else {
      log(T('flee_fail'), 'bad');
      setTimeout(enemyTurn, 700);
    }
  }

  function items(){
    if (busy) return;
    const heals = Object.entries(G.inventory).filter(([id, n]) => n > 0 && ITEMS[id].type === 'heal');
    if (!heals.length) { log(T('no_items'), 'info'); return; }
    busy = true; setMenu(false);
    const menu = $('battle-menu');
    menu._saved = menu.innerHTML;
    menu.innerHTML = '';
    heals.forEach(([id, n]) => {
      const it = ITEMS[id];
      const b = document.createElement('button');
      b.className = 'battle-btn';
      b.textContent = `${it.emoji} ${LANG === 'it' ? it.it : it.en} ×${n} (+${it.heal > 999 ? 'MAX' : it.heal})`;
      b.onclick = () => {
        G.inventory[id]--;
        G.hp = Math.min(maxHp(), G.hp + it.heal);
        restoreMenu();
        log(`${it.emoji} +${it.heal > 999 ? 'MAX' : it.heal} ❤️`, 'good');
        bars();
        setTimeout(enemyTurn, 600);
      };
      menu.appendChild(b);
    });
    const back = document.createElement('button');
    back.className = 'battle-btn';
    back.textContent = '↩️ ' + T('back');
    back.onclick = () => { restoreMenu(); busy = false; setMenu(true); };
    menu.appendChild(back);

    function restoreMenu(){
      menu.innerHTML = menu._saved;
      wireButtons();
    }
  }

  function endSoon(ms, won){
    setTimeout(() => {
      showScreen('screen-world');
      World.loadMap();
      updateHud();
      const cb = onEnd; onEnd = null;
      if (cb) cb(won);
    }, ms);
  }

  function wireButtons(){
    $('bb-attack').onclick = () => playerAttack(false);
    $('bb-special').onclick = () => playerAttack(true);
    $('bb-item').onclick = items;
    $('bb-flee').onclick = flee;
  }
  wireButtons();

  return { start };
})();
