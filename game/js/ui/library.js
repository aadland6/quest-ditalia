// library.js — pure SRS review: clear due cards, earn book crates every 5.
import { registerScreen, refresh } from './router.js';
import { header } from './common.js';
import { dueCount } from '../questions.js';
import { askQuestion } from './questionModal.js';
import { mutate, getSave } from '../state.js';
import { addItems, rollLoot } from '../systems/inventory.js';
import { checkAchievements } from '../systems/progress.js';
import { perks } from '../systems/perks.js';
import { toast, lootToast } from './toast.js';

const CRATE = [
  { item: 'coins', min: 15, max: 45, chance: 1 },
  { item: 'feather', min: 3, max: 8, chance: 0.4 },
  { item: 'flax', min: 2, max: 6, chance: 0.4 },
  { item: 'logs', min: 2, max: 5, chance: 0.3 },
  { item: 'iron_ore', min: 1, max: 3, chance: 0.25 },
  { item: 'bandage', min: 1, max: 1, chance: 0.15 },
  { item: 'uncut_sapphire', min: 1, max: 1, chance: 0.04 },
];

async function render(el) {
  el.appendChild(header('Library', '📚', 'world'));
  const body = document.createElement('div');
  body.className = 'screen-body';
  const s = getSave();
  let due = 0;
  try { due = await dueCount(); } catch { /* not ready */ }
  const sinceCrate = (s.libraryCleared || 0) % 5;

  body.innerHTML = `
    <p class="area-desc">The archivist rewards anyone who keeps their memory sharp.
      Every <b>5 due reviews</b> cleared here earns a book crate.</p>
    <div class="stat-tiles">
      <div class="tile"><b>${due}</b><span>reviews due</span></div>
      <div class="tile"><b>${s.libraryCleared || 0}</b><span>cleared all-time</span></div>
      <div class="tile"><b>${5 - sinceCrate}</b><span>to next crate</span></div>
    </div>
    <div class="combat-actions">
      <button class="btn primary" id="study" ${due < 1 ? 'disabled' : ''}>
        ${due > 0 ? '📖 Review a due card' : 'Nothing due — go play!'}
      </button>
    </div>
    <p class="hint">Due cards also appear naturally while you mine, fight and craft —
      the Library is for clearing a backlog (or pure study).</p>`;
  el.appendChild(body);

  body.querySelector('#study').onclick = async () => {
    const res = await askQuestion({ icon: '📚', title: 'Ripasso', sub: 'Biblioteca di Borgosereno' }, { dueOnly: true });
    if (!res) { refresh(); return; }
    mutate(st => { st.libraryCleared = (st.libraryCleared || 0) + 1; });
    if ((getSave().libraryCleared % 5) === 0) {
      const gains = rollLoot(CRATE);
      for (let i = 0; i < perks().crateBonus; i++) {          // Observatory: extra rolls
        for (const [id, q] of Object.entries(rollLoot(CRATE))) gains[id] = (gains[id] || 0) + q;
      }
      const { banked } = addItems(gains, { source: 'library' });
      lootToast(gains, '📦 Book crate: ', banked);
    } else if (res.correct) {
      toast('Nice recall. The archivist nods.', '📖');
    }
    checkAchievements();
    refresh();
  };
}

registerScreen('library', render);
