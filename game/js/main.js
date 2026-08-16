// main.js — boot: state + SRS init, screen registration, bottom nav, onboarding.
import { initState, getSave, mutate } from './state.js';
import { initQuestions } from './questions.js';
import { initHud, refreshDue } from './ui/hud.js';
import { show, setNavUpdater } from './ui/router.js';
import { setNotifier } from './systems/progress.js';
import { toast } from './ui/toast.js';

// screen registrations (side-effect imports)
import './ui/worldScreen.js';
import './ui/workshop.js';
import './ui/bank.js';
import './ui/shop.js';
import './ui/library.js';
import './ui/homeScreen.js';
import './ui/combatScreen.js';
import './ui/chestScreen.js';
import './ui/skillsScreen.js';
import './ui/skillTree.js';
import './ui/packScreen.js';
import './ui/studyScreen.js';
import './ui/farmScreen.js';
import './ui/settingsScreen.js';

const NAV = [
  { screen: 'world', icon: '🗺️', label: 'World' },
  { screen: 'skills', icon: '📊', label: 'Skills' },
  { screen: 'pack', icon: '🎒', label: 'Pack' },
  { screen: 'home', icon: '🏠', label: 'Home' },
  { screen: 'study', icon: '🧠', label: 'Study' },
];

// sub-screens highlight their parent tab
const NAV_PARENT = {
  combat: 'world', chest: 'world',
  bank: 'world', workshop: 'world', shop: 'world', sawmill: 'world', library: 'world',
  farm: 'home', skilltree: 'skills', settings: 'world',
};

function buildNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = NAV.map(n =>
    `<button class="navbtn" data-nav="${n.screen}"><span class="nicon">${n.icon}</span><span class="nlabel">${n.label}</span></button>`).join('');
  nav.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => show(b.dataset.nav));
  setNavUpdater(name => {
    const active = NAV_PARENT[name] || name;
    nav.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === active));
  });
}

function showFatal(e) {
  document.getElementById('screen').innerHTML =
    `<div class="fatal"><h2>⚠️ Boot failed</h2><p>${String(e?.message || e)}</p>
     <p class="hint">This game needs to be served over http(s) — file:// won't work.</p></div>`;
  console.error(e);
}

function onboarding() {
  const s = getSave();
  if (s.seenIntro) return;
  mutate(st => { st.seenIntro = true; });
  const ov = document.createElement('div');
  ov.className = 'qmodal open intro';
  ov.innerHTML = `
    <div class="qscroll intro-scroll">
      <div class="intro-art">🇮🇹</div>
      <h1>Quest d'Italia</h1>
      <p>Benvenuto, Viaggiatore! This land runs on <b>Italian</b>: every swing of a
      pickaxe, every arrow loosed, every lock picked asks you a question — vocabulary,
      grammar, listening, reading.</p>
      <p><b>Correct answers</b> land the blow, win the ore, spring the lock.<br>
      <b>Wrong answers</b> miss — and the enemy strikes back.</p>
      <p>The scheduler remembers everything you answer and brings words back
      <i>just before you'd forget them</i>. When a verb tense wobbles, the world
      starts drilling it. Playing <i>is</i> studying.</p>
      <p>Start in the <b>mine</b> or <b>forest</b>, bank your haul in town, smith your
      first iron sword, and work toward the wyrms on the peak. 🐉</p>
      <div class="combat-actions"><button class="btn primary" id="begin">Andiamo!</button></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#begin').onclick = () => ov.remove();
}

async function boot() {
  try {
    await initState();
    buildNav();
    initHud();
    setNotifier((msg, icon) => toast(msg, icon));
    show('world');
    await initQuestions();     // SRS + shard index (heavier — after first paint)
    refreshDue();
    onboarding();
  } catch (e) {
    showFatal(e);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
