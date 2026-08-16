// settingsScreen.js — game settings: control scheme, D-pad side, character options.
import { registerScreen, refresh, show } from './router.js';
import { header, esc } from './common.js';
import { getSave, mutate, hardReset } from '../state.js';
import { getSrs } from '../questions.js';
import { toast } from './toast.js';

function optionRow(group, value, current, title, sub) {
  return `
    <button class="card ${current === value ? 'selected' : ''}" data-set="${group}" data-val="${value}">
      <span class="card-icon">${current === value ? '🔘' : '⚪'}</span>
      <span class="card-main">
        <span class="card-title">${esc(title)}</span>
        <span class="card-sub">${esc(sub)}</span>
      </span>
    </button>`;
}

function render(el) {
  el.appendChild(header('Settings', '⚙️', 'world'));
  const s = getSave();
  const st = s.settings;
  const body = document.createElement('div');
  body.className = 'screen-body';

  body.innerHTML = `
    <h2 class="sect">Movement controls</h2>
    <div class="cards">
      ${optionRow('controls', 'dpad', st.controls, 'Direction pad (default)',
        'On-screen 8-way pad moves you. Tap rocks, trees, monsters and doors to use them.')}
      ${optionRow('controls', 'tap', st.controls, 'Tap to move',
        'Tap the ground to walk there (pathfinding). Tap things to use them.')}
    </div>

    ${st.controls === 'dpad' ? `
    <h2 class="sect">D-pad position</h2>
    <div class="cards">
      ${optionRow('dpadSide', 'left', st.dpadSide, 'Left side', 'Pad sits bottom-left.')}
      ${optionRow('dpadSide', 'right', st.dpadSide, 'Right side', 'Pad sits bottom-right.')}
    </div>` : ''}

    <h2 class="sect">Camera</h2>
    <p class="hint">Drag anywhere in the world to orbit. Pinch (or scroll) to zoom. These are always on.</p>

    <h2 class="sect">Character</h2>
    <div class="combat-actions">
      <button class="btn" id="rename">✏️ Rename (${esc(s.name)})</button>
      <button class="btn danger" id="reset">🗑️ Reset everything</button>
    </div>
    <p class="hint">Reset wipes the game save AND the spaced-repetition study history.</p>`;
  el.appendChild(body);

  body.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    mutate(sv => { sv.settings[b.dataset.set] = b.dataset.val; });
    refresh();
  });
  body.querySelector('#rename').onclick = () => {
    const name = prompt('Character name:', s.name);
    if (name?.trim()) { mutate(sv => { sv.name = name.trim().slice(0, 20); }); refresh(); }
  };
  body.querySelector('#reset').onclick = async () => {
    if (!confirm('Reset ALL progress — game AND study history? This cannot be undone.')) return;
    if (!confirm('Really? Your SRS scheduling memory will be wiped too.')) return;
    await hardReset();
    try { await getSrs().s.reset(); } catch (e) { console.error(e); }
    location.reload();
  };
}

registerScreen('settings', render);
