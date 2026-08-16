// ===== Overworld: tile rendering, movement, roaming enemies, interactions =====

const World = (() => {
  const TILE = 32;
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  let grid = [];          // 2D char array (mutable copy — nodes/chests deplete)
  let map = null;
  let moving = false;
  let roamers = [];       // visible wandering enemies
  let phase = 0;          // animation tick counter
  let tickTimer = null;

  function loadMap(){
    map = MAPS[G.map];
    grid = map.grid.map(row => row.split(''));
    spawnLoot();
    spawnRoamers();
    startTick();
    applyCtrl();
    draw();
    updateHud();
  }

  // ---- dynamic spawns ----
  function randomFloorTiles(n, avoid){
    const spots = [];
    for (let y = 1; y < grid.length - 1; y++)
      for (let x = 1; x < grid[y].length - 1; x++)
        if (grid[y][x] === '.' || (map.zone === 'abbazia' && grid[y][x] === ','))
          spots.push([x, y]);
    const chosen = [];
    let guard = 200;
    while (chosen.length < n && spots.length && guard--) {
      const [x, y] = spots[Math.floor(Math.random() * spots.length)];
      if (avoid.some(([ax, ay]) => Math.abs(ax - x) + Math.abs(ay - y) < 3)) continue;
      if (chosen.some(([cx, cy]) => Math.abs(cx - x) + Math.abs(cy - y) < 4)) continue;
      chosen.push([x, y]);
    }
    return chosen;
  }

  function protectedSpots(){
    const pts = (map.portals || []).map(p => [p.x, p.y])
      .concat((map.npcs || []).map(n => [n.x, n.y]));
    if (map.boss) pts.push([map.boss.x, map.boss.y]);
    pts.push([G.x, G.y]);
    return pts;
  }

  function spawnLoot(){
    const avoid = protectedSpots();
    // 2-3 chests per visit — they vanish once looted, respawn on re-entry
    for (const [x, y] of randomFloorTiles(2 + Math.floor(Math.random() * 2), avoid)) grid[y][x] = 'C';
    // 1-2 coin sparkles
    for (const [x, y] of randomFloorTiles(1 + Math.floor(Math.random() * 2), avoid)) grid[y][x] = '*';
  }

  function spawnRoamers(){
    roamers = [];
    const zone = ZONES[map.zone];
    if (!zone.enemies.length) return;
    const avoid = protectedSpots();
    const n = 2 + Math.floor(Math.random() * 3); // 2-4 wanderers
    for (const [x, y] of randomFloorTiles(n, avoid)) {
      const id = zone.enemies[Math.floor(Math.random() * zone.enemies.length)];
      roamers.push({ x, y, id, emoji: ENEMIES[id].emoji, alert: false });
    }
  }

  // ---- animation / AI tick ----
  function startTick(){
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, 400);
  }

  function uiBusy(){
    return !$('screen-world').classList.contains('active')
      || ['quiz-modal','dialog-modal','menu-modal','abbey-modal','shop-modal','settings-modal']
         .some(id => !$(id).classList.contains('hidden'));
  }

  function tick(){
    if (!G || uiBusy()) return;
    phase++;
    if (phase % 2 === 0) moveRoamers(); // enemies step every other tick (~0.8s)
    try { draw(); } catch(e) { console.error('draw failed', e); }
  }

  function moveRoamers(){
    for (const r of roamers) {
      const dist = Math.abs(r.x - G.x) + Math.abs(r.y - G.y);
      let dx = 0, dy = 0;
      if (dist <= 5) {
        // chase: step along the larger axis toward the player
        r.alert = true;
        if (Math.abs(G.x - r.x) >= Math.abs(G.y - r.y)) dx = Math.sign(G.x - r.x);
        else dy = Math.sign(G.y - r.y);
      } else {
        r.alert = false;
        if (Math.random() < 0.5) continue; // idle
        const d = [[0,1],[0,-1],[1,0],[-1,0]][Math.floor(Math.random() * 4)];
        dx = d[0]; dy = d[1];
      }
      const nx = r.x + dx, ny = r.y + dy;
      if (nx === G.x && ny === G.y) { startRoamerBattle(r); return; }
      if (roamerBlocked(nx, ny)) {
        // chase fallback: try the other axis
        if (r.alert) {
          const ax = dy !== 0 ? Math.sign(G.x - r.x) : 0;
          const ay = dx !== 0 ? Math.sign(G.y - r.y) : 0;
          if ((ax || ay) && !roamerBlocked(r.x + ax, r.y + ay)
              && !(r.x + ax === G.x && r.y + ay === G.y)) { r.x += ax; r.y += ay; }
          else if (r.x + ax === G.x && r.y + ay === G.y) { startRoamerBattle(r); return; }
        }
        continue;
      }
      r.x = nx; r.y = ny;
    }
  }

  function roamerBlocked(x, y){
    const t = tileAt(x, y);
    if (t === '#' || t === 'W' || t === 'A' || t === 'C' || t === '*') return true;
    if (npcAt(x, y)) return true;
    if ((map.portals || []).some(p => p.x === x && p.y === y)) return true;
    if (map.boss && !G.flags[map.boss.flag] && map.boss.x === x && map.boss.y === y) return true;
    if (roamers.some(r => r.x === x && r.y === y)) return true;
    return false;
  }

  function startRoamerBattle(r){
    roamers = roamers.filter(q => q !== r); // it either falls in battle or scatters if you flee
    toast('⚠️ ' + T('roamer_spotted'));
    setTimeout(() => Battle.start(r.id), 250);
  }

  // ---- helpers ----
  function tileAt(x, y){
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return '#';
    return grid[y][x];
  }

  function isBlocked(x, y){
    const t = tileAt(x, y);
    if (t === '#' || t === 'W') return true;
    if (npcAt(x, y)) return true;
    if (t === 'A') return true;
    return false;
  }

  function npcAt(x, y){
    return (map.npcs || []).find(n => n.x === x && n.y === y);
  }

  // ---- rendering ----
  const NODE_SPRITES = { C:'chest', L:'log', S:'stonepile', G:'wheat', A:'buildsite' };
  // emoji stand-ins so the map stays playable even if sprite images fail to decode
  const SPRITE_FALLBACK = {
    pine:'🌲', oak:'🌳', wall:'🧱', boulder:'🪨', mountain:'⛰️',
    flower:'🌸', mushroom:'🍄', fern:'🌿', wheat:'🌾', gem:'💎', bones:'🦴',
    chest:'🎁', log:'🪵', stonepile:'🪨', buildsite:'🏗️', portal:'🌀',
  };

  function draw(){
    const ts = TILESETS[map.zone];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const t = grid[y][x];
        let color = t === ',' ? ts.path : t === 'W' ? (ts.water || '#33556e') : ts.ground;
        ctx.fillStyle = color;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        if ((x + y) % 2 === 0 && t !== 'W') {
          ctx.fillStyle = 'rgba(51,36,26,0.06)'; // subtle inked stipple
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
        if (t === '#') drawSprite(ts.block, x, y, 1);
        else if (t === 'F') drawSprite(ts.deco, x, y, 0.8);
        else if (NODE_SPRITES[t]) drawSprite(NODE_SPRITES[t], x, y, 0.92);
        if (t === '*') drawStar(x, y, phase % 2 === 0);
        if (t === 'W') {
          ctx.strokeStyle = 'rgba(234,217,176,0.35)'; // parchment-ink wave lines
          ctx.lineWidth = 1.2;
          const off = (phase * 3 + x * 7) % TILE;
          ctx.beginPath();
          ctx.moveTo(x * TILE + Math.min(off, TILE - 10), y * TILE + TILE * 0.4);
          ctx.quadraticCurveTo(x * TILE + Math.min(off, TILE - 10) + 5, y * TILE + TILE * 0.4 - 3,
                               x * TILE + Math.min(off, TILE - 10) + 10, y * TILE + TILE * 0.4);
          ctx.stroke();
        }
      }
    }
    // portals pulse
    for (const p of (map.portals || [])) drawSprite('portal', p.x, p.y, 0.94 + 0.05 * (phase % 3), '🌀');
    // npcs
    for (const n of (map.npcs || [])) drawSprite(n.sprite, n.x, n.y, 1, n.emoji);
    // roamers (bob when alerted)
    for (const r of roamers) {
      const e = ENEMIES[r.id];
      drawSprite(e.sprite, r.x, r.y, r.alert ? 1.06 : 0.94, r.emoji);
      if (r.alert) drawAlert(r.x, r.y);
    }
    // boss (with crown/helm overlay)
    if (map.boss && !G.flags[map.boss.flag]) {
      const b = ENEMIES[map.boss.id];
      drawSprite(b.sprite, map.boss.x, map.boss.y, 1.22, b.emoji);
      if (b.overlay) drawSprite(b.overlay, map.boss.x, map.boss.y, 1.22);
    }
    // player
    drawSprite(RACES[G.race].sprite, G.x, G.y, 1.05, RACES[G.race].emoji);
  }

  // sprite with emoji fallback while images finish decoding (or if decoding fails)
  function drawSprite(key, x, y, scale, fallback){
    const size = TILE * (scale || 1);
    const px = x * TILE + (TILE - size) / 2;
    const py = y * TILE + (TILE - size) / 2;
    try {
      if (key && Sprites.draw(ctx, key, px, py, size)) return;
    } catch(e) { /* WebKit can throw on SVG drawImage — fall through to emoji */ }
    const fb = fallback || SPRITE_FALLBACK[key];
    if (fb) drawEmoji(fb, x, y, scale);
  }

  function drawStar(x, y, big){
    const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
    const r = big ? 7 : 5;
    ctx.fillStyle = '#c9a227';
    ctx.strokeStyle = '#5c4030';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + 1.5, cy - 1.5, cx + r, cy);
    ctx.quadraticCurveTo(cx + 1.5, cy + 1.5, cx, cy + r);
    ctx.quadraticCurveTo(cx - 1.5, cy + 1.5, cx - r, cy);
    ctx.quadraticCurveTo(cx - 1.5, cy - 1.5, cx, cy - r);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  function drawAlert(x, y){
    const cx = x * TILE + TILE / 2, cy = y * TILE - 6;
    ctx.fillStyle = '#a33327';
    ctx.strokeStyle = '#33241a';
    ctx.lineWidth = 1;
    ctx.fillRect(cx - 1.6, cy - 9, 3.2, 7);
    ctx.strokeRect(cx - 1.6, cy - 9, 3.2, 7);
    ctx.beginPath(); ctx.arc(cx, cy + 1.5, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  function drawEmoji(e, x, y, scale){
    ctx.fillStyle = '#000'; // opaque — emoji glyphs inherit fillStyle alpha
    ctx.font = `${Math.round(TILE * 0.8 * (scale || 1))}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e, x * TILE + TILE / 2, y * TILE + TILE / 2 + 1);
  }

  // ---- movement ----
  function move(dx, dy){
    if (moving) return;
    const nx = G.x + dx, ny = G.y + dy;

    // bump interactions
    const npc = npcAt(nx, ny);
    if (npc) return talkTo(npc);
    if (tileAt(nx, ny) === 'A') return Abbey.open();

    // walking into a roamer starts the fight
    const r = roamers.find(q => q.x === nx && q.y === ny);
    if (r) { startRoamerBattle(r); return; }

    if (isBlocked(nx, ny)) return;

    moving = true;
    G.x = nx; G.y = ny;
    // release the debounce BEFORE drawing so a render error can never freeze movement
    setTimeout(() => { moving = false; }, 110);
    try { draw(); } catch(e) { console.error('draw failed', e); }

    // boss trigger — within 1 tile of an undefeated boss
    if (map.boss && !G.flags[map.boss.flag]
        && Math.abs(nx - map.boss.x) + Math.abs(ny - map.boss.y) <= 1) {
      const b = map.boss;
      showDialog(ENEMIES[b.id].sprite || ENEMIES[b.id].emoji, LANG === 'it' ? ENEMIES[b.id].it : ENEMIES[b.id].en,
        b.it, b.en, () => {
          Battle.start(b.id, (won) => {
            if (won) {
              G.flags[b.flag] = true;
              saveGame();
              if (ENEMIES[b.id].final) {
                setTimeout(() => showDialog('🏰', 'Muraverde', T('the_end'), T('the_end')), 600);
              }
            }
          });
        });
      return;
    }

    // portal
    const p = (map.portals || []).find(q => q.x === nx && q.y === ny);
    if (p) return usePortal(p);

    // collectibles
    const t = tileAt(nx, ny);
    if (t === 'C') return openChest(nx, ny);
    if (t === '*') return pickSparkle(nx, ny);
    if (t === 'L' || t === 'S' || t === 'G') return gather(nx, ny, t);

    // random encounter on wild ground (reduced — roamers provide most fights)
    const zone = ZONES[map.zone];
    if (t === '.' && zone.rate > 0 && Math.random() < zone.rate * 0.6) {
      const id = zone.enemies[Math.floor(Math.random() * zone.enemies.length)];
      setTimeout(() => Battle.start(id), 150);
    }
  }

  function usePortal(p){
    const destZone = ZONES[MAPS[p.to].zone];
    if (G.level < destZone.minLv) {
      toast(`🔒 ${T('need_level')} ${destZone.minLv}`);
      stepBack();
      return;
    }
    const gateFlag = `gate_${G.map}_${p.to}`;
    if (p.gate && !G.flags[gateFlag]) {
      stepBack();
      askGate(p, gateFlag, p.gate);
      return;
    }
    G.map = p.to; G.x = p.tx; G.y = p.ty;
    saveGame();
    loadMap();
    toast(`📍 ${LANG === 'it' ? destZone.it : destZone.en} · ${destZone.level}`);
  }

  function stepBack(){
    const opts = [[0,-1],[0,1],[-1,0],[1,0]];
    for (const [dx, dy] of opts) {
      const t = tileAt(G.x + dx, G.y + dy);
      if (t === ',' || t === '.') { G.x += dx; G.y += dy; break; }
    }
    draw();
  }

  function askGate(p, flag, needed){
    let correct = 0;
    toast(`🔒 ${T('gate_locked')} (${needed})`);
    const zone = ZONES[map.zone];
    const askNext = () => {
      Quiz.ask({ level: zone.level, topics: zone.topics, onDone: (ok) => {
        if (!ok) { toast(`🔒 ${T('gate_fail')}`); return; }
        correct++;
        if (correct >= needed) {
          G.flags[flag] = true; saveGame();
          toast(`🔓 ${T('gate_open')}`);
        } else {
          setTimeout(askNext, 350);
        }
      }});
    };
    askNext();
  }

  function openChest(x, y){
    const zone = ZONES[map.zone];
    const golden = Math.random() < 0.2;
    Quiz.ask({ level: zone.level, topics: zone.topics, onDone: (ok) => {
      if (!ok) { toast(`🔒 ${T('chest_fail')}`); return; }
      grid[y][x] = '.'; // gone until you re-enter the map
      const lvMult = zone.level === 'A1' ? 1 : zone.level === 'A2' ? 2 : 3;
      const base = golden ? 40 : 15;
      const coins = base * lvMult + Math.floor(Math.random() * base * lvMult);
      G.resources.monete += coins;
      let extra = '';
      if (golden) {
        const res = ['legno','pietra','grano'][Math.floor(Math.random() * 3)];
        const n = 3 + Math.floor(Math.random() * 3);
        G.resources[res] += n;
        extra = ` +${n}${RES_INFO[res].emoji}`;
        const item = Math.random() < 0.5 ? 'formaggio' : 'torta';
        G.inventory[item] = (G.inventory[item] || 0) + 1;
        extra += ` +1 ${ITEMS[item].emoji}`;
      } else if (Math.random() < 0.5) {
        const item = Math.random() < 0.7 ? 'pane' : 'formaggio';
        G.inventory[item] = (G.inventory[item] || 0) + 1;
        extra = ` +1 ${ITEMS[item].emoji}`;
      }
      saveGame(); draw(); updateHud();
      toast(`${golden ? '🌟 ' + T('chest_gold') : '🎁 ' + T('chest_open')} +${coins}🪙${extra}`);
    }});
  }

  function pickSparkle(x, y){
    grid[y][x] = '.';
    const lvMult = ZONES[map.zone].level === 'A1' ? 1 : ZONES[map.zone].level === 'A2' ? 2 : 3;
    const coins = 5 * lvMult + Math.floor(Math.random() * 10 * lvMult);
    G.resources.monete += coins;
    saveGame(); draw(); updateHud();
    toast(`✨ ${T('sparkle_found')} ${coins}🪙!`);
  }

  function gather(x, y, t){
    const res = t === 'L' ? 'legno' : t === 'S' ? 'pietra' : 'grano';
    Quiz.ask({ level: ZONES[map.zone].level, topics: null,
      question: QuizGen.genVocabImage(ZONES[map.zone].level),
      onDone: (ok) => {
        if (!ok) { toast(T('gather_fail')); grid[y][x] = '.'; draw(); return; }
        const n = 2 + G.buildings.orto + Math.floor(Math.random() * 2);
        G.resources[res] += n;
        grid[y][x] = '.'; // depleted until map reload
        saveGame(); draw(); updateHud();
        toast(`${RES_INFO[res].emoji} ${T('gathered')} ${n} ${LANG === 'it' ? RES_INFO[res].it : RES_INFO[res].en}!`);
      }});
  }

  function talkTo(npc){
    showDialog(npc.sprite || npc.emoji, npc.name, npc.it, npc.en, () => {
      if (npc.role === 'fabbro') Abbey.openShop();
      if (npc.role === 'infermeria') { G.hp = maxHp(); saveGame(); updateHud(); toast(`💚 ${T('healed')}`); }
      if (npc.role === 'biblioteca') Menu.open('review');
      if (npc.role === 'badessa') Abbey.open();
    });
  }

  // ---- input ----
  const KEYS = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0],
                 w:[0,-1], s:[0,1], a:[-1,0], d:[1,0] };
  document.addEventListener('keydown', (e) => {
    if (!G || !$('screen-world').classList.contains('active')) return;
    if (uiBusy()) return;
    const k = KEYS[e.key];
    if (k) { e.preventDefault(); move(k[0], k[1]); }
    if (e.key === 'Escape' || e.key === 'm') Menu.open('stats');
  });

  // touch d-pad with hold-to-repeat
  document.querySelectorAll('.dp').forEach(btn => {
    const dir = btn.dataset.dir;
    const vec = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[dir];
    let timer = null;
    const fire = () => {
      if (uiBusy()) return; // don't move while battles/menus/quizzes are open
      if (dir === 'action') { Menu.open('stats'); return; }
      move(vec[0], vec[1]);
    };
    const stop = () => { clearInterval(timer); timer = null; };
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault(); stop(); fire();
      if (vec) timer = setInterval(fire, 200);
    });
    btn.addEventListener('touchend', stop);
    btn.addEventListener('touchcancel', stop);
    btn.addEventListener('mousedown', fire);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
  });

  // ---- control scheme: d-pad (default) vs tap-to-move (iPad-friendly) ----
  function applyCtrl(){
    const touch = G && G.ctrl === 'touch';
    $('touch-controls').classList.toggle('ctrl-off', touch);
    $('btn-ctrl').textContent = touch ? '👆' : '🕹️';
  }

  $('btn-ctrl').addEventListener('click', () => {
    if (!G) return;
    G.ctrl = G.ctrl === 'touch' ? 'dpad' : 'touch';
    saveGame();
    applyCtrl();
    toast(G.ctrl === 'touch' ? '👆 ' + T('ctrl_touch') : '🕹️ ' + T('ctrl_dpad'));
  });

  // tap/hold on the map walks toward the touched point; tap your hero = menu (like ●)
  const tapNav = { timer: null, x: 0, y: 0 };
  function tapPoint(e){
    const t = e.touches ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    tapNav.x = (t.clientX - rect.left) * (canvas.width / rect.width) / TILE;
    tapNav.y = (t.clientY - rect.top) * (canvas.height / rect.height) / TILE;
  }
  function tapStep(){
    if (uiBusy()) return;
    const dx = tapNav.x - (G.x + 0.5), dy = tapNav.y - (G.y + 0.5);
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return; // arrived
    if (Math.abs(dx) >= Math.abs(dy)) move(Math.sign(dx), 0);
    else move(0, Math.sign(dy));
  }
  function tapStart(e){
    if (!G || G.ctrl !== 'touch' || uiBusy()) return;
    if (e.cancelable) e.preventDefault();
    clearInterval(tapNav.timer); tapNav.timer = null;
    tapPoint(e);
    const dx = tapNav.x - (G.x + 0.5), dy = tapNav.y - (G.y + 0.5);
    if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6) { Menu.open('stats'); return; }
    tapStep();
    tapNav.timer = setInterval(tapStep, 200);
  }
  function tapEnd(){ clearInterval(tapNav.timer); tapNav.timer = null; }
  canvas.addEventListener('touchstart', tapStart, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    if (tapNav.timer) { tapPoint(e); if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  canvas.addEventListener('touchend', tapEnd);
  canvas.addEventListener('touchcancel', tapEnd);
  canvas.addEventListener('mousedown', tapStart);
  canvas.addEventListener('mousemove', (e) => { if (tapNav.timer) tapPoint(e); });
  window.addEventListener('mouseup', tapEnd);
  window.addEventListener('blur', tapEnd);

  return { loadMap, draw, _debug: () => ({ roamers, phase }) };
})();
