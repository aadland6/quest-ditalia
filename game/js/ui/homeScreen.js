// homeScreen.js — your home: rooms, build projects, hearth rest, garden crate.
import { registerScreen, refresh } from './router.js';
import { header, esc, fmt, fmtMs, progressBar } from './common.js';
import { ROOMS, ROOM } from '../data/construction.js';
import { item } from '../data/items.js';
import { getSave, mutate, level, maxHp } from '../state.js';
import { roomTier, nextTierInfo, canStartProject, startProject, cancelProject, doBuildStep, gardenReady, claimGarden } from '../systems/home.js';
import { invQty, bankQty } from '../systems/inventory.js';
import { perks } from '../systems/perks.js';
import { todaysContract, claimContract } from '../systems/contracts.js';
import { plots, plotState } from '../systems/farming.js';
import { show } from './router.js';
import { toast, lootToast } from './toast.js';

function costHtml(cost) {
  return Object.entries(cost).map(([id, q]) => {
    const have = invQty(id) + bankQty(id);
    return `<span class="cost ${have >= q ? 'ok' : 'short'}">${item(id).icon}${q}<small>/${fmt(have)}</small></span>`;
  }).join(' ');
}

function render(el) {
  el.appendChild(header('Your Home', '🏠', 'world'));
  const s = getSave();
  const body = document.createElement('div');
  body.className = 'screen-body';

  let html = `<p class="area-desc">Construction level ${level('construction')}. Rooms grant permanent perks.</p>`;

  // active project banner
  if (s.build) {
    const room = ROOM[s.build.roomId];
    html += `
      <div class="build-banner">
        <div class="bb-title">🔨 Building: ${room.icon} ${esc(room.name)} tier ${s.build.tier}</div>
        ${progressBar(s.build.done / s.build.total)}
        <div class="bb-sub">${s.build.done}/${s.build.total} steps</div>
        <div class="combat-actions">
          <button class="btn primary" id="buildStep">🔨 Work on it</button>
          <button class="btn ghost" id="cancelBuild">Cancel (refund materials)</button>
        </div>
      </div>`;
  }

  // hearth rest + garden claim quick actions
  const hearthT = roomTier('hearth');
  const g = gardenReady();
  html += `<div class="cards">`;

  // farm entry (always available — farming is its own skill)
  const farmPlots = plots();
  const readyN = farmPlots.filter(p => p && plotState(p).state === 'ready').length;
  const growingN = farmPlots.filter(p => p && plotState(p).state === 'growing').length;
  html += `
    <button class="card ${readyN > 0 ? 'ready' : ''}" id="gofarm">
      <span class="card-icon">🌱</span>
      <span class="card-main"><span class="card-title">Your Farm</span>
      <span class="card-sub">${readyN > 0 ? `${readyN} plot${readyN > 1 ? 's' : ''} ready to harvest!` : growingN > 0 ? `${growingN} crop${growingN > 1 ? 's' : ''} growing` : 'Plant seeds, grow crops and herbs'}</span></span>
      <span class="card-side">${readyN > 0 ? '✨' : '›'}</span>
    </button>`;

  // daily contract (Sala delle Mappe)
  const contract = todaysContract();
  if (contract) {
    const done = contract.done >= contract.n;
    html += `
      <div class="card ${done && !contract.claimed ? 'ready' : ''}">
        <span class="card-icon">${contract.icon}</span>
        <span class="card-main"><span class="card-title">Incarico del giorno</span>
        <span class="card-sub">${esc(contract.label)} — ${contract.claimed ? 'complete! new contract tomorrow' : `${contract.done}/${contract.n}`}</span></span>
        ${!contract.claimed && done ? `<button class="btn small primary" id="claimContract">Claim</button>` : ''}
      </div>`;
  }
  if (hearthT > 0) {
    const healPct = Math.round(perks().hearthHeal * 100);
    html += `
      <button class="card" id="rest" ${s.hp >= maxHp() ? 'disabled' : ''}>
        <span class="card-icon">🔥</span>
        <span class="card-main"><span class="card-title">Rest at the hearth</span>
        <span class="card-sub">Heal ${healPct}% of max HP</span></span>
        <span class="card-side">${s.hp}/${maxHp()}</span>
      </button>`;
  }
  if (roomTier('garden') > 0) {
    html += `
      <button class="card ${g.ok ? 'ready' : 'locked'}" id="garden">
        <span class="card-icon">🌻</span>
        <span class="card-main"><span class="card-title">Garden crate</span>
        <span class="card-sub">Daily supplies from your plot</span></span>
        <span class="card-side">${g.ok ? '✨ ready' : '⏳ ' + fmtMs((g.readyAt || 0) - Date.now())}</span>
      </button>`;
  }
  html += `</div>`;

  // rooms
  html += `<h2 class="sect">Rooms</h2><div class="cards">`;
  for (const room of ROOMS) {
    const tier = roomTier(room.id);
    const next = nextTierInfo(room.id);
    const chk = next ? canStartProject(room.id) : { ok: false };
    html += `
      <div class="card room ${tier > 0 ? 'built' : ''}">
        <span class="card-icon">${room.icon}</span>
        <span class="card-main">
          <span class="card-title">${esc(room.name)} ${tier > 0 ? `<span class="tier-pips">${'●'.repeat(tier)}${'○'.repeat(3 - tier)}</span>` : ''}</span>
          <span class="card-sub">${tier > 0 ? esc(room.perk(tier)) : esc(room.desc)}</span>
          ${next ? `<span class="card-sub build-cost">Tier ${next.tierNum} (lvl ${next.lvl}): ${costHtml(next.cost)}</span>` : '<span class="card-sub build-cost">Fully upgraded ★</span>'}
        </span>
        ${next ? `<button class="btn small ${chk.ok ? 'primary' : ''}" data-build="${room.id}" ${chk.ok ? '' : 'disabled'}>${tier === 0 ? 'Build' : 'Upgrade'}</button>` : ''}
      </div>`;
  }
  html += `</div>`;

  // trophy display
  const rares = ['moka', 'vespa', 'divina_commedia', 'maschera_veneziana'].filter(r => s.log[r]);
  if (roomTier('trophy') > 0) {
    html += `<h2 class="sect">Trophy Hall</h2><div class="trophy-shelf">
      ${rares.length ? rares.map(r => `<span class="trophy" title="${esc(item(r).name)}">${item(r).icon}</span>`).join('') : '<span class="hint">No rares yet — chests and wyrms await.</span>'}
    </div>`;
  }

  body.innerHTML = html;
  el.appendChild(body);

  body.querySelector('#gofarm')?.addEventListener('click', () => show('farm'));
  body.querySelector('#claimContract')?.addEventListener('click', () => {
    const res = claimContract();
    if (!res) return;
    toast(`Contract complete! +🪙${fmt(res.coins)}${res.xp ? ` and +${res.xp} ${res.xpSkill} xp` : ''}`, '🗺️');
    refresh();
  });
  body.querySelector('#buildStep')?.addEventListener('click', async () => {
    const res = await doBuildStep();
    if (!res) { refresh(); return; }
    if (res.blocked) { toast(res.blocked, '🔒'); return; }
    if (!res.correct) { toast(res.msg, '💨'); refresh(); return; }
    if (res.finished) toast(`${res.room.name} complete! ${res.room.perk(roomTier(res.room.id))}`, '🎉');
    refresh();
  });
  body.querySelector('#cancelBuild')?.addEventListener('click', () => { cancelProject(); toast('Project cancelled, materials refunded', '↩️'); refresh(); });
  body.querySelector('#rest')?.addEventListener('click', () => {
    mutate(st => { st.hp = Math.min(maxHp(), st.hp + Math.ceil(maxHp() * perks().hearthHeal)); });
    toast('You rest by the fire.', '🔥');
    refresh();
  });
  body.querySelector('#garden')?.addEventListener('click', () => {
    const res = claimGarden();
    if (!res.ok) { toast(res.why || 'Not ready', '⏳'); return; }
    lootToast(res.gains, '🌻 Garden crate: ', res.banked);
    refresh();
  });
  body.querySelectorAll('[data-build]').forEach(b => b.onclick = () => {
    const res = startProject(b.dataset.build);
    if (!res.ok) { toast(res.why, '🔒'); return; }
    toast('Materials committed. Work the project to finish it!', '🔨');
    refresh();
  });
}

registerScreen('home', render);
