// chestScreen.js — chest gauntlet: answer N questions to open; perfect = double roll.
import { registerScreen, show } from './router.js';
import { header, esc, progressBar } from './common.js';
import { AREA } from '../data/areas.js';
import { chestStatus, completeChest } from '../systems/chests.js';
import { askQuestion } from './questionModal.js';
import { toast, lootToast } from './toast.js';

function render(el, { areaId }) {
  const area = AREA[areaId];
  const chest = area.chest;
  el.appendChild(header(chest.name, chest.icon, 'world'));

  const body = document.createElement('div');
  body.className = 'screen-body chest';
  el.appendChild(body);

  let progress = 0, correctCount = 0, running = false, done = false;

  function draw(msg = '') {
    const st = chestStatus(chest);
    body.innerHTML = `
      <div class="chest-art">${chest.icon}</div>
      <p class="area-desc">${chest.questions} locks. Answer each to spring them.
        A <b>perfect run doubles the loot</b>.${chest.keyItem ? ` Consumes one ${esc(chest.keyItem.replace('_', ' '))}.` : ''}</p>
      ${progressBar(progress / chest.questions, 'chest-progress')}
      <div class="chest-count">${progress}/${chest.questions} locks sprung · ${correctCount} first-try</div>
      ${msg ? `<p class="hint">${msg}</p>` : ''}
      <div class="combat-actions">
        ${done
          ? `<button class="btn primary" id="back">Back to ${esc(area.name)}</button>`
          : st.canOpen
            ? `<button class="btn primary" id="go">${running ? 'Next lock' : 'Begin'}</button>
               <button class="btn ghost" id="abort">Walk away</button>`
            : `<button class="btn" id="back">Not available</button>`}
      </div>`;
    body.querySelector('#back')?.addEventListener('click', () => show('world'));
    body.querySelector('#abort')?.addEventListener('click', () => {
      toast('You leave the chest untouched (no cooldown, key kept).', '🚪');
      show('world');
    });
    body.querySelector('#go')?.addEventListener('click', nextLock);
  }

  async function nextLock() {
    running = true;
    const res = await askQuestion({
      icon: chest.icon, title: `${chest.name} — lock ${progress + 1} of ${chest.questions}`,
      sub: `Treasure · ${area.name}`,
    });
    if (!res) { draw('The lock resets as you step back. Progress holds.'); return; }
    if (res.correct) correctCount++;
    progress++; // wrong answers still advance — but cost the perfect bonus
    if (progress >= chest.questions) {
      done = true;
      const perfect = correctCount === chest.questions;
      const { gains, banked } = completeChest(chest, perfect);
      lootToast(gains, perfect ? '💯 PERFECT — double loot! ' : 'The chest creaks open: ', banked);
      draw(perfect ? 'Flawless. The mechanism practically applauds.' : 'Open! A perfect run would have doubled this.');
    } else {
      draw(res.correct ? 'Click. The next lock waits.' : 'The lock yields anyway — but the perfect bonus is gone.');
    }
  }

  draw();
}

registerScreen('chest', render);
