// conjdrills.js — procedural conjugation drills, driven by the SRS's Bayesian
// concept layer (NOT the per-card scheduler). Each drill targets one tense KC
// (ids shared with srs/build_italian_index.py — the same KCs that authored
// grammar cards update). A wrong answer on any congiuntivo card lowers
// `conj-congiuntivo` mastery, which makes the drill picker target that tense;
// drill answers update the KC via srs.reviewKcs() and reschedule the sibling
// authored cards. Ported from italian_game/js/data/generators.js.

import { VERB_DATA, VERB_LIST, Conj } from './verbs.js';

const R = n => Math.floor(Math.random() * n);
const pick = arr => arr[R(arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// subjects with person index + participle agreement letter (essere-aux)
const SUBJECTS = [
  { p: 0, txt: 'io', gen: 'o' },
  { p: 1, txt: 'tu', gen: 'o' },
  { p: 2, txt: 'Martino', gen: 'o' },
  { p: 2, txt: 'Rosalba', gen: 'a' },
  { p: 2, txt: 'il nonno', gen: 'o' },
  { p: 3, txt: 'noi', gen: 'i' },
  { p: 4, txt: 'voi', gen: 'i' },
  { p: 5, txt: 'i ragazzi', gen: 'i' },
  { p: 5, txt: 'le sorelle', gen: 'e' },
];

// KC id -> conjugation engine tense + drill metadata.
export const DRILL_KCS = {
  'conj-presente': { tense: 'presente', name: 'presente', marker: 'Ogni giorno',
    exp: "Presente indicativo: -are → -o/-i/-a/-iamo/-ate/-ano; -ere → -o/-i/-e/-iamo/-ete/-ono; -ire → -o/-i/-e/-iamo/-ite/-ono (alcuni verbi aggiungono -isc-). Attenzione agli irregolari come andare (vado) e fare (faccio)." },
  'conj-passato-prossimo': { tense: 'passatoProssimo', name: 'passato prossimo', marker: 'Ieri',
    exp: "Passato prossimo = presente di avere/essere + participio passato. I verbi di movimento/cambiamento (andare, venire, partire…) e i riflessivi prendono ESSERE, e il participio concorda con il soggetto (Rosalba è andatA)." },
  'conj-imperfetto': { tense: 'imperfetto', name: 'imperfetto', marker: 'Da giovane,',
    exp: "L'imperfetto descrive abitudini, sfondi e descrizioni nel passato: desinenze -avo/-evo/-ivo. 'Da giovane' segnala una situazione ripetuta o continuata: si usa l'imperfetto." },
  'conj-futuro': { tense: 'futuro', name: 'futuro semplice', marker: 'Domani',
    exp: "Futuro semplice: cade la -e finale, -are diventa -er (parler-), poi -ò/-ai/-à/-emo/-ete/-anno. Radici irregolari comuni: sar- (essere), avr- (avere), andr- (andare), far- (fare), vorr- (volere)." },
  'conj-condizionale': { tense: 'condizionale', name: 'condizionale presente', marker: 'Con più tempo,',
    exp: "Il condizionale presente usa la stessa radice del futuro + -ei/-esti/-ebbe/-emmo/-este/-ebbero. Esprime 'would': parlerei. Vorrei = forma di cortesia." },
  'conj-congiuntivo': { tense: 'congiuntivo', name: 'congiuntivo presente', marker: 'Penso che',
    exp: "Dopo espressioni di opinione/dubbio/emozione (penso che, credo che, è possibile che, benché…) si usa il CONGIUNTIVO, non l'indicativo. Presente: -are → -i; -ere/-ire → -a. Irregolari: sia, abbia, vada, faccia." },
  'conj-cong-passato': { tense: 'congPassato', name: 'congiuntivo passato', marker: 'Penso che ieri',
    exp: "Congiuntivo passato = congiuntivo di avere/essere (abbia/sia) + participio. Si usa dopo 'penso che' ecc. quando l'azione è AVVENUTA PRIMA: Penso che ieri Marco abbia mangiato troppo." },
  'conj-cong-imperfetto': { tense: 'congImperfetto', name: 'congiuntivo imperfetto', marker: 'La nonna vorrebbe che',
    exp: "Congiuntivo imperfetto: -are → -assi, -ere → -essi, -ire → -issi (fossi da essere). Segue verbi principali al passato o al condizionale: Vorrei che tu venissi. Anche nel periodo ipotetico: se avessi tempo…" },
  'conj-trapassato': { tense: 'trapassato', name: 'trapassato prossimo', marker: 'Prima della festa,',
    exp: "Trapassato prossimo = imperfetto di avere/essere + participio (avevo mangiato, ero andato). Indica un'azione avvenuta PRIMA di un'altra azione passata." },
  'conj-futuro-anteriore': { tense: 'futuroAnteriore', name: 'futuro anteriore', marker: 'Entro stasera,',
    exp: "Futuro anteriore = futuro di avere/essere + participio (avrò finito, sarò partito): un'azione che SARÀ completata entro un punto del futuro ('entro stasera')." },
  'conj-cond-passato': { tense: 'condPassato', name: 'condizionale passato', marker: 'Senza il tuo aiuto,',
    exp: "Condizionale passato = condizionale di avere/essere + participio (avrei mangiato, sarei andato) — 'would have done'. Anche per il futuro nel passato: ha detto che sarebbe venuto." },
  'conj-gerundio': { tense: 'gerundio', name: 'stare + gerundio', marker: 'In questo momento,',
    exp: "Stare + gerundio = la forma progressiva: sto mangiando (proprio ora). Gerundio: -are → -ando, -ere/-ire → -endo. 'In questo momento' segnala un'azione in corso." },
};

export const DRILLABLE_KCS = Object.keys(DRILL_KCS);

// friendlier verb subset for the simple tenses a beginner meets first
const HARD_VERBS = new Set(['rimanere', 'tenere', 'salire', 'scegliere', 'vincere', 'ricevere', 'costruire']);
const BEGINNER_TENSES = new Set(['presente', 'passatoProssimo', 'imperfetto', 'gerundio']);

// sibling tense used for one distractor (same person, contrasting tense)
const SIBLING = {
  presente: 'imperfetto', passatoProssimo: 'imperfetto', imperfetto: 'passatoProssimo',
  futuro: 'condizionale', condizionale: 'futuro', congiuntivo: 'presente',
  congPassato: 'passatoProssimo', congImperfetto: 'imperfetto', trapassato: 'passatoProssimo',
  futuroAnteriore: 'futuro', condPassato: 'condizionale', gerundio: 'presente',
};

// Build one drill item (unified bank schema + {drill:true, kcs}) for a tense KC.
export function makeDrill(kc) {
  const info = DRILL_KCS[kc];
  if (!info) return null;
  const { tense, name, marker, exp } = info;
  const verbs = BEGINNER_TENSES.has(tense) ? VERB_LIST.filter(v => !HARD_VERBS.has(v)) : VERB_LIST;
  const inf = pick(verbs);
  const subj = pick(SUBJECTS);
  const correct = Conj.get(inf, tense, subj.p, subj.gen);
  const comp = VERB_DATA[inf].comp || '';

  const distractors = new Set();
  for (const p of shuffle([0, 1, 2, 3, 4, 5].filter(p => p !== subj.p))) {
    const f = Conj.get(inf, tense, p, subj.gen);
    if (f !== correct) distractors.add(f);
    if (distractors.size >= 2) break;
  }
  const sib = Conj.get(inf, SIBLING[tense], subj.p, subj.gen);
  if (sib !== correct) distractors.add(sib);
  for (let p = 0; distractors.size < 3 && p < 6; p++) {
    const f = Conj.get(inf, tense, p, subj.gen);
    if (f !== correct) distractors.add(f);
  }

  const options = shuffle([correct, ...[...distractors].slice(0, 3)]);
  const sentence = `${marker} ${subj.txt} ___ ${comp}.`.replace(/\s+/g, ' ');

  return {
    id: `DRILL-${inf}-${tense}`,
    drill: true,
    kcs: [kc],
    content_area: 'Palestra dei verbi',
    format: 4,
    difficulty: 'core',
    cefr_level: null,
    prompt: {
      text: `Coniuga «${inf}» (${name}).`,
      text_en: `Conjugate «${inf}» (${VERB_DATA[inf].en}) in the ${name}.`,
      emoji: null, audio_ref: null, sentence,
    },
    options,
    tiles: null,
    correct: [options.indexOf(correct)],
    sort_map: null,
    explanation: exp,
    italian: null,
  };
}
