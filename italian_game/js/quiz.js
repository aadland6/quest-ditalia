// ===== Quiz UI =====
// Quiz.ask({level, topics, question?, harder?, onDone(correct)}) — shows the modal.

const Quiz = (() => {
  let current = null;
  let onDone = null;
  let answered = false;
  let hintsLeft = 0;

  function nextLevel(lv){ return lv === 'A1' ? 'A2' : 'B1'; }

  function pickQuestion(opts){
    // 25% chance to resurface a missed question (spaced review)
    if (!opts.harder && G && G.review.length && Math.random() < 0.25) {
      const idx = Math.floor(Math.random() * G.review.length);
      const q = G.review[idx];
      q._fromReview = true;
      return q;
    }
    const lv = opts.harder ? nextLevel(opts.level) : opts.level;
    return QuizGen.getQuestion(lv, opts.topics);
  }

  function resetBattleHints(){ hintsLeft = G ? G.buildings.biblioteca : 0; }

  function ask(opts){
    current = opts.question || pickQuestion(opts);
    onDone = opts.onDone;
    answered = false;
    render();
    $('quiz-modal').classList.remove('hidden');
  }

  function render(){
    const q = current;
    $('quiz-tags').innerHTML =
      `<span class="tag lvl-${q.level}">${q.level}</span>` +
      `<span class="tag">${q.topic}</span>` +
      (q._fromReview ? `<span class="tag">📖 ${T('review_tab')}</span>` : '');
    $('quiz-instruction').textContent = LANG === 'it' ? q.q_it : q.q_en;

    const sent = $('quiz-sentence');
    if (q.sentence) {
      sent.innerHTML = q.sentence.replace(/___/g, '<span class="blank">____</span>');
      sent.style.display = '';
    } else { sent.style.display = 'none'; }

    const img = $('quiz-image');
    if (q.image) { img.textContent = q.image; img.style.display = ''; }
    else { img.style.display = 'none'; }

    const box = $('quiz-options');
    box.innerHTML = '';
    q.options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'quiz-opt' + (q.emojiOptions ? ' emoji-opt' : '');
      b.textContent = opt;
      b.onclick = () => answer(i, b);
      box.appendChild(b);
    });

    $('quiz-feedback').classList.add('hidden');
    $('quiz-feedback').className = 'hidden';
    $('quiz-feedback').id = 'quiz-feedback';
    $('quiz-continue').classList.add('hidden');
    $('quiz-help').style.display = '';
    $('quiz-hint').style.display = '';
  }

  function answer(i, btn){
    if (answered) return;
    answered = true;
    const q = current;
    const ok = i === q.correct;
    const buttons = Array.from($('quiz-options').children);
    buttons.forEach((b, j) => {
      b.disabled = true;
      if (j === q.correct) b.classList.add('correct');
      else if (j === i && !ok) b.classList.add('wrong');
    });

    const fb = $('quiz-feedback');
    fb.classList.remove('hidden');
    fb.classList.add(ok ? 'ok' : 'no');
    fb.innerHTML = ok
      ? `<b>✅ ${T('correct_fb')}</b>`
      : `<b>❌ ${T('wrong_fb')}</b> ${T('answer_was')} <b>${q.options[q.correct]}</b><br><br>💡 ${q.explain_en}`;

    // bookkeeping
    if (G) {
      if (ok) {
        G.counters.ok++;
        if (q.id === 'gen-vocab' && q.image) G.counters.words[q.image] = true;
        if (q._fromReview) G.review = G.review.filter(r => r !== q);
      } else {
        G.counters.no++;
        if (!q._fromReview && G.review.length < 40) {
          const snap = JSON.parse(JSON.stringify(q));
          delete snap._fromReview;
          G.review.push(snap);
        }
      }
    }

    $('quiz-help').style.display = 'none';
    $('quiz-hint').style.display = 'none';
    $('quiz-continue').classList.remove('hidden');
    $('quiz-continue').onclick = () => {
      $('quiz-modal').classList.add('hidden');
      const cb = onDone; onDone = null;
      if (cb) cb(ok);
    };
  }

  function help(){
    if (answered) return;
    const fb = $('quiz-feedback');
    fb.classList.remove('hidden');
    fb.classList.add('ok');
    fb.innerHTML = `💡 ${current.explain_en}`;
  }

  function hint(){
    if (answered) return;
    if (hintsLeft <= 0) { toastSafe(T('no_hints')); return; }
    hintsLeft--;
    const q = current;
    const wrongIdx = q.options.map((_, i) => i).filter(i => i !== q.correct);
    wrongIdx.sort(() => Math.random() - 0.5);
    const buttons = Array.from($('quiz-options').children);
    wrongIdx.slice(0, 2).forEach(i => { buttons[i].disabled = true; buttons[i].style.opacity = 0.25; });
    toastSafe(T('hint_used'));
  }

  function toastSafe(msg){
    // toast lives on the world screen; fall back to feedback box inside modals
    const fb = $('quiz-feedback');
    fb.classList.remove('hidden');
    fb.innerHTML = `💡 ${msg}`;
  }

  $('quiz-help').onclick = help;
  $('quiz-hint').onclick = hint;

  return { ask, resetBattleHints };
})();
