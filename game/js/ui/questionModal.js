// questionModal.js — full-screen question overlay. One call = one game action.
// Renders the ten Italian item formats (ported from app/assets/app.js):
//   1 flashcard (self-graded recall)     7 letter-tile spelling
//   3 word → picture (emoji) MC          8 sentence building (word tiles)
//   4 cloze / gap fill                   9 reading mini-passage
//   5 gender/agreement sort             10 transformation drill
//   6 error correction                  11 matching pairs
//  12 generic MC (question + options; folded-in Muraverde bank)
// Grades, reports to the SRS (cards via review, drills via reviewKcs),
// updates streak/answer stats, shows feedback + next-review time.
//
// Format-grading semantics preserved from the Italian trainer:
//  - MC family (3/4/6/9/10/12) grades on first tap, against ORIGINAL option indices.
//  - Tiles (7/8) grade by RESULTING STRING, not tile-index sequence — many items
//    have duplicate letters and distractor tiles, so string equality is load-bearing.
//  - Sort (5) is all-or-nothing; matching (11) counts mistakes (0 = correct).
//  - Flashcard (1) is self-rated; Bene/Facile count as correct for the game action.

import { nextQuestion, reportAnswer, getSrs } from '../questions.js';
import { mutate, getSave } from '../state.js';
import { onReview as contractReview } from '../systems/contracts.js';

const FORMAT_LABEL = {
  1: 'Ricorda la parola', 3: 'Scegli l’immagine', 4: 'Completa la frase',
  5: 'Metti nel gruppo giusto', 6: 'Trova l’errore', 7: 'Scrivi la parola',
  8: 'Ordina le parole', 9: 'Leggi e rispondi', 10: 'Trasforma',
  11: 'Abbina le coppie', 12: 'Scegli la risposta',
};

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const fmtDelta = ms => {
  ms = Math.max(0, ms);
  if (ms < 36e5) return Math.max(1, Math.round(ms / 6e4)) + 'm';
  if (ms < 864e5) return (ms / 36e5).toFixed(1) + 'h';
  return (ms / 864e5).toFixed(1) + 'd';
};

// ----- audio -----
function ttsWord(it) {
  return it.italian?.lemma || it.prompt?.text || null;
}

function speakIt(word) {
  try {
    if (!('speechSynthesis' in window) || !word) return false;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'it-IT';
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('it'));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

function audioButton(it) {
  const clip = it.prompt?.audio_ref || null;
  const word = ttsWord(it);
  if (!clip && !word) return '';
  return `<button class="audio-btn" type="button">🔊 Ascolta</button>`;
}

function wireAudio(root, it) {
  const b = root.querySelector('.audio-btn');
  if (!b) return;
  const clip = it.prompt?.audio_ref || null;
  const word = ttsWord(it);
  b.onclick = () => {
    if (clip) {
      try { new Audio(clip).play().catch(() => speakIt(word)); return; } catch { /* fall through */ }
    }
    speakIt(word);
  };
}

// ----- shared blocks -----
const sentenceBlock = s =>
  `<div class="qsentence">${esc(s).replace(/_{2,}/g, '<span class="blank">____</span>')}</div>`;

// Prompt block: emoji cue (big), optional text (suppressed when the emoji IS the
// cue and the text would give the answer away — formats 1 and 7), EN subline, audio.
function promptBlock(it, { showText = true } = {}) {
  const p = it.prompt || {};
  let html = '';
  if (p.emoji) html += `<div class="qemoji">${esc(p.emoji)}</div>`;
  if (showText && p.text) html += `<div class="qstem">${esc(p.text)}</div>`;
  if (p.text_en) html += `<div class="qtext-en">${esc(p.text_en)}</div>`;
  html += audioButton(it);
  return html;
}

// Ask one question. context: { icon, title, sub } describes the game action.
// opts: { dueOnly } — Library mode. Resolves { correct, item, kind } or null if
// aborted before answering (no SRS review recorded) / no question available.
export async function askQuestion(context, opts = {}) {
  let q;
  try {
    q = await nextQuestion(opts);
  } catch (e) {
    console.error(e);
    toastError('Could not load a question (offline with uncached area?)');
    return null;
  }
  if (!q) return null;
  return presentQuestion(q, context);
}

// Exported for testing / the Palestra: present a specific item without
// consulting the SRS queue.
export function presentQuestion(q, context) {
  return new Promise(resolve => {
    const it = q.item;
    let answered = false;

    const ov = document.createElement('div');
    ov.className = 'qmodal';
    const kindBadge = q.kind === 'due'
      ? '<span class="badge due">ripasso</span>'
      : q.kind === 'drill'
        ? '<span class="badge drill">palestra</span>'
        : '<span class="badge new">nuova</span>';
    const streak = getSave().streak;
    const areaLine = it.content_area && it.cefr_level && !it.content_area.includes(it.cefr_level)
      ? `${it.content_area} · ${it.cefr_level}`
      : (it.content_area || it.cefr_level || '');

    ov.innerHTML = `
      <header class="qhead">
        <button class="qclose" aria-label="Cancel">✕</button>
        <div class="qctx"><span class="qicon">${context.icon || '❓'}</span>
          <div><div class="qtitle">${esc(context.title || '')}</div>
          <div class="qsub">${esc(context.sub || '')}</div></div></div>
        <div class="qmeta">${kindBadge}${streak >= 3 ? `<span class="badge streak">🔥${streak}</span>` : ''}</div>
      </header>
      <div class="qscroll">
        <div class="qtype">${FORMAT_LABEL[it.format] || ''}${areaLine ? ' · ' + esc(areaLine) : ''}</div>
        <div class="qbody"></div>
        <div class="qfeedback"></div>
      </div>
      <footer class="qfoot"><div class="qhint"></div></footer>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    const body = ov.querySelector('.qbody');
    const fbEl = ov.querySelector('.qfeedback');
    const foot = ov.querySelector('.qfoot');

    ov.querySelector('.qclose').onclick = () => {
      if (answered) return; // after grading, must Continue
      close(null);
    };

    function close(result) {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 200);
      resolve(result);
    }

    function setHint(t) { foot.querySelector('.qhint').textContent = t; }

    // Grade bookkeeping shared by every format. `reveal` is an optional
    // "here's the right answer" line shown on a miss.
    async function finish(correct, { reveal = '' } = {}) {
      if (answered) return;
      answered = true;

      mutate(s => {
        s.answered++;
        if (correct) { s.streak++; s.correctCount++; s.bestStreak = Math.max(s.bestStreak, s.streak); }
        else s.streak = 0;
      });

      let dueInfo = '';
      if (correct && q.kind === 'due') contractReview();   // contracts count due reviews
      try {
        await reportAnswer(it, correct);
        if (!it.drill) {
          const st = await getSrs().cardState(it.id);
          if (st) dueInfo = `Prossimo ripasso tra ~${fmtDelta(st.effective.at - Date.now())}`;
        }
      } catch (e) { console.error('srs review failed', e); }

      const streakNow = getSave().streak;
      fbEl.innerHTML = `
        <div class="fb ${correct ? 'ok' : 'bad'}">
          <div class="fb-head">${correct ? (streakNow >= 3 ? `✅ Giusto! 🔥 ${streakNow} di fila` : '✅ Giusto!') : '❌ Non proprio'}</div>
          ${!correct && reveal ? `<div class="fb-reveal">${esc(reveal)}</div>` : ''}
          <div class="fb-expl">${esc(it.explanation || '')}</div>
          ${dueInfo ? `<div class="fb-due">${dueInfo}</div>` : ''}
        </div>`;
      foot.innerHTML = `<button class="btn primary qcontinue">${correct ? 'Continua' : 'Ho capito'}</button>`;
      foot.querySelector('.qcontinue').onclick = () => close({ correct, item: it, kind: q.kind });
      fbEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Footer "Verifica" button used by formats 5/7/8.
    function checkButton(onCheck) {
      const b = document.createElement('button');
      b.className = 'btn primary qsubmit';
      b.textContent = 'Verifica';
      b.disabled = true;
      b.onclick = () => { if (!answered) onCheck(); };
      foot.appendChild(b);
      return b;
    }

    // ----- renderers -----
    const render = {
      1: renderFlashcard, 3: renderMc, 4: renderMc, 6: renderMc, 9: renderMc,
      10: renderMc, 12: renderMc, 5: renderSort, 7: renderTiles, 8: renderTiles,
      11: renderMatching,
    };
    (render[it.format] || renderMc)();
    wireAudio(body, it);

    // --- 1: flashcard, self-graded ---
    function renderFlashcard() {
      setHint('Pensa alla parola, poi controlla');
      body.innerHTML = promptBlock(it, { showText: !it.prompt?.emoji });
      const flash = document.createElement('div');
      flash.className = 'flash';
      flash.innerHTML = `<button class="btn wide qreveal">Mostra risposta</button>`;
      body.appendChild(flash);
      flash.querySelector('.qreveal').onclick = () => {
        const ita = it.italian || {};
        const answer = [ita.article, ita.lemma].filter(Boolean).join(' ') || it.prompt?.text || '';
        flash.innerHTML = `
          <div class="freveal">${esc(answer)}</div>
          ${ita.ipa ? `<div class="ipa">/${esc(ita.ipa)}/</div>` : ''}
          <div class="self-rate">
            <button class="rate again">Ancora</button>
            <button class="rate hard">Difficile</button>
            <button class="rate good">Bene</button>
            <button class="rate easy">Facile</button>
          </div>`;
        setHint('Come è andata?');
        const grade = ok => () => finish(ok);
        flash.querySelector('.again').onclick = grade(false);
        flash.querySelector('.hard').onclick = grade(false);
        flash.querySelector('.good').onclick = grade(true);
        flash.querySelector('.easy').onclick = grade(true);
      };
    }

    // --- MC family: 3 (emoji options), 4 cloze, 6 error, 9 reading, 10, 12 ---
    function renderMc() {
      setHint('Tocca la risposta');
      const p = it.prompt || {};
      let html = '';
      if (it.format === 3) {
        // word → picture: always show the Italian word even without prompt.text
        const ita = it.italian || {};
        const word = p.text || [ita.article, ita.lemma].filter(Boolean).join(' ');
        html += `<div class="qstem">${esc(word)}</div>`;
        if (p.text_en) html += `<div class="qtext-en">${esc(p.text_en)}</div>`;
        html += audioButton(it);
      } else {
        if (p.text) html += `<div class="qstem">${esc(p.text)}</div>`;
        if (p.text_en) html += `<div class="qtext-en">${esc(p.text_en)}</div>`;
        if (p.sentence) html += it.format === 9
          ? `<div class="qpassage">${esc(p.sentence)}</div>`
          : sentenceBlock(p.sentence);
        if (it.format === 9 && !p.text) html += `<div class="qstem">Rispondi alla domanda.</div>`;
        html += audioButton(it);
      }
      const emoji = it.format === 3;
      const order = shuffle(it.options.map((o, i) => i));
      html += `<div class="qopts ${emoji ? 'emoji-opts' : ''}">${order.map(i =>
        `<button class="qopt ${emoji ? 'emoji-opt' : ''}" data-i="${i}">${esc(it.options[i])}</button>`).join('')}</div>`;
      body.innerHTML = html;

      const key = new Set(it.correct || []);
      body.querySelectorAll('.qopt').forEach(b => b.onclick = () => {
        if (answered) return;
        const i = +b.dataset.i;
        const ok = key.has(i);
        body.querySelectorAll('.qopt').forEach(x => {
          if (key.has(+x.dataset.i)) x.classList.add('correct');
          x.disabled = true;
        });
        if (!ok) b.classList.add('wrong');
        finish(ok, { reveal: ok ? '' : 'Risposta: ' + it.options[[...key][0]] });
      });
    }

    // --- 5: gender/agreement sort (tap chip, tap bin) ---
    function renderSort() {
      setHint('Tocca una parola, poi il suo gruppo');
      const nouns = Object.keys(it.sort_map);
      const bins = it.options;
      let html = promptBlock(it);
      html += `<div class="gbins">${bins.map((b, i) =>
        `<div class="gbin" data-bin="${esc(b)}"><div class="gbin-label">${esc(b)}</div><div class="gbin-drop"></div></div>`).join('')}</div>`;
      html += `<div class="gchips">${shuffle(nouns).map(n =>
        `<button class="gchip" data-noun="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
      body.innerHTML = html;

      let selected = null;
      body.querySelectorAll('.gchip').forEach(c => c.onclick = () => {
        if (answered) return;
        body.querySelectorAll('.gchip').forEach(x => x.classList.remove('sel'));
        selected = c;
        c.classList.add('sel');
      });
      const btn = checkButton(() => {
        let ok = true;
        body.querySelectorAll('.gchip').forEach(c => {
          const want = it.sort_map[c.dataset.noun];
          const got = c.dataset.bin;
          if (got !== want) { ok = false; c.classList.add('wrong'); c.insertAdjacentHTML('beforeend', ` <span class="fixup">→ ${esc(want)}</span>`); }
          else c.classList.add('correct');
        });
        finish(ok);
      });
      body.querySelectorAll('.gbin').forEach(be => be.onclick = () => {
        if (answered || !selected) return;
        const chip = selected;
        chip.dataset.bin = be.dataset.bin;
        chip.classList.remove('sel');
        be.querySelector('.gbin-drop').appendChild(chip);
        selected = null;
        btn.disabled = ![...body.querySelectorAll('.gchip')].every(c => c.dataset.bin);
      });
    }

    // --- 7 letter tiles ('' join) / 8 sentence building (' ' join) ---
    function renderTiles() {
      const sep = it.format === 8 ? ' ' : '';
      setHint(it.format === 8 ? 'Tocca le parole in ordine' : 'Tocca le lettere in ordine');
      body.innerHTML = promptBlock(it, { showText: !it.prompt?.emoji })
        + `<div class="qtray" aria-label="risposta"></div>`
        + `<div class="qtile-bank">${it.tiles.map((t, i) =>
            `<button class="qtile ${it.format === 8 ? 'word' : 'letter'}" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;

      const tray = body.querySelector('.qtray');
      const target = it.correct.map(i => it.tiles[i]).join(sep);
      const btn = checkButton(() => {
        const built = [...tray.children].map(c => c.textContent).join(sep);
        const ok = built === target;
        tray.classList.add(ok ? 'ok' : 'bad');
        finish(ok, { reveal: ok ? '' : 'Risposta: ' + target });
      });
      const sync = () => { btn.disabled = answered || tray.children.length === 0; };

      body.querySelectorAll('.qtile-bank .qtile').forEach(t => t.onclick = () => {
        if (answered || t.classList.contains('placed')) return;
        t.classList.add('placed');
        const clone = t.cloneNode(true);
        clone.classList.remove('placed');
        clone.onclick = () => {           // tap a placed tile to take it back
          if (answered) return;
          clone.remove();
          t.classList.remove('placed');
          sync();
        };
        tray.appendChild(clone);
        sync();
      });
    }

    // --- 11: matching pairs (tap left, tap right; 0 mistakes = correct) ---
    function renderMatching() {
      setHint('Tocca una parola, poi la sua coppia');
      const leftIdx = [...new Set(it.correct.map(p => p[0]))];
      const rightIdx = [...new Set(it.correct.map(p => p[1]))];
      const valid = new Set(it.correct.map(p => p.join('-')));
      const isEmoji = s => /\p{Extended_Pictographic}/u.test(s);
      let html = promptBlock(it);
      html += `<div class="match-grid">
        <div class="match-col">${shuffle(leftIdx).map(i =>
          `<button class="qopt mopt ${isEmoji(it.options[i]) ? 'emoji-opt' : ''}" data-side="l" data-i="${i}">${esc(it.options[i])}</button>`).join('')}</div>
        <div class="match-col">${shuffle(rightIdx).map(i =>
          `<button class="qopt mopt ${isEmoji(it.options[i]) ? 'emoji-opt' : ''}" data-side="r" data-i="${i}">${esc(it.options[i])}</button>`).join('')}</div>
      </div>`;
      body.innerHTML = html;

      let selL = null, matched = 0, mistakes = 0;
      body.querySelectorAll('[data-side="l"]').forEach(b => b.onclick = () => {
        if (answered || b.classList.contains('correct')) return;
        body.querySelectorAll('[data-side="l"]').forEach(x => x.classList.remove('sel'));
        selL = b;
        b.classList.add('sel');
      });
      body.querySelectorAll('[data-side="r"]').forEach(b => b.onclick = () => {
        if (answered || !selL || b.classList.contains('correct')) return;
        const key = selL.dataset.i + '-' + b.dataset.i;
        if (valid.has(key)) {
          b.classList.add('correct');
          selL.classList.add('correct');
          selL.classList.remove('sel');
          selL = null;
          matched++;
          if (matched === it.correct.length) finish(mistakes === 0, { reveal: mistakes ? `Completato con ${mistakes} error${mistakes === 1 ? 'e' : 'i'}` : '' });
        } else {
          mistakes++;
          b.classList.add('wrong');
          const l = selL;
          setTimeout(() => { b.classList.remove('wrong'); l.classList.remove('sel'); }, 450);
          selL = null;
        }
      });
    }
  });
}

function toastError(msg) {
  import('./toast.js').then(m => m.toast(msg, '⚠️'));
}
