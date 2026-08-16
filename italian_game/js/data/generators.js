// ===== Procedural question generators =====
// Produce unlimited practice questions from the conjugator + vocab data.

const QuizGen = (() => {
  const R = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[R(arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // subjects with person index + participle agreement letter (essere-aux)
  const SUBJECTS = [
    { p:0, txt:'io',          gen:'o' },
    { p:1, txt:'tu',          gen:'o' },
    { p:2, txt:'Martino',     gen:'o' },
    { p:2, txt:'Rosalba',     gen:'a' },
    { p:2, txt:'il frate',    gen:'o' },
    { p:3, txt:'noi',         gen:'i' },
    { p:4, txt:'voi',         gen:'i' },
    { p:5, txt:'i topi',      gen:'i' },
    { p:5, txt:'le lepri',    gen:'e' },
  ];

  const TENSES_BY_LEVEL = {
    A1: ['presente','presente','presente','passatoProssimo','imperfetto','gerundio'],
    A2: ['passatoProssimo','imperfetto','futuro','futuro','condizionale','condizionale','presente'],
    B1: ['congiuntivo','congiuntivo','congPassato','congImperfetto','trapassato','futuroAnteriore','condPassato','futuro','condizionale'],
  };

  const TENSE_INFO = {
    presente:        { marker:'Ogni giorno', name:'presente',
      exp:"Presente indicativo: -are → -o/-i/-a/-iamo/-ate/-ano; -ere → -o/-i/-e/-iamo/-ete/-ono; -ire → -o/-i/-e/-iamo/-ite/-ono (some verbs add -isc-). Watch out for irregulars like andare (vado) and fare (faccio)." },
    passatoProssimo: { marker:'Ieri', name:'passato prossimo',
      exp:"Passato prossimo = present of avere/essere + past participle. Movement/change verbs (andare, venire, partire...) and reflexives take ESSERE, and the participle agrees with the subject (Rosa è andatA)." },
    imperfetto:      { marker:'Da giovane,', name:'imperfetto',
      exp:"Imperfetto describes habits, background and descriptions in the past: -avo/-evo/-ivo endings. 'Da giovane' (as a youngster) signals a repeated/ongoing situation, so use the imperfetto." },
    futuro:          { marker:'Domani', name:'futuro semplice',
      exp:"Futuro semplice: drop the final -e, -are becomes -er (parler-), then add -ò/-ai/-à/-emo/-ete/-anno. Common irregular stems: sar- (essere), avr- (avere), andr- (andare), far- (fare), vorr- (volere)." },
    condizionale:    { marker:'Con più tempo,', name:'condizionale presente',
      exp:"Condizionale presente uses the same stem as the future + -ei/-esti/-ebbe/-emmo/-este/-ebbero. It expresses 'would': parlerei = I would speak. Vorrei = I would like (polite)." },
    congiuntivo:     { marker:'Penso che', name:'congiuntivo presente',
      exp:"After opinion/doubt/emotion triggers (penso che, credo che, è possibile che, benché...) Italian uses the CONGIUNTIVO, not the indicative. Present subjunctive: -are → -i; -ere/-ire → -a. Irregulars: sia (essere), abbia (avere), vada (andare), faccia (fare)." },
    congPassato:     { marker:'Penso che ieri', name:'congiuntivo passato',
      exp:"Congiuntivo passato = subjunctive of avere/essere (abbia/sia) + past participle. Used after triggers like 'penso che' when the action happened BEFORE: Penso che ieri Marco abbia mangiato troppo." },
    congImperfetto:  { marker:'La badessa vorrebbe che', name:'congiuntivo imperfetto',
      exp:"Congiuntivo imperfetto: -are → -assi, -ere → -essi, -ire → -issi (fossi from essere). It follows past/conditional main verbs: Vorrei che tu venissi. Also used in type-2 hypotheticals: se avessi tempo..." },
    trapassato:      { marker:'Prima della festa,', name:'trapassato prossimo',
      exp:"Trapassato prossimo = imperfetto of avere/essere + participle (avevo mangiato, ero andato). It marks an action that happened BEFORE another past action: 'before the party, X had already...'." },
    futuroAnteriore: { marker:'Entro stasera,', name:'futuro anteriore',
      exp:"Futuro anteriore = future of avere/essere + participle (avrò finito, sarò partito): an action that WILL BE completed by a point in the future ('entro stasera' = by tonight)." },
    condPassato:     { marker:'Senza il tuo aiuto,', name:'condizionale passato',
      exp:"Condizionale passato = conditional of avere/essere + participle (avrei mangiato, sarei andato) — 'would have done'. Also for future-in-the-past: ha detto che sarebbe venuto." },
    gerundio:        { marker:'In questo momento,', name:'stare + gerundio',
      exp:"Stare + gerundio = the progressive: sto mangiando (I am eating right now). Gerund: -are → -ando, -ere/-ire → -endo. 'In questo momento' signals an action in progress." },
  };

  // one full question about verb forms
  function genConjugation(level){
    const tense = pick(TENSES_BY_LEVEL[level] || TENSES_BY_LEVEL.A1);
    const info = TENSE_INFO[tense];
    // A1 uses a friendlier subset of verbs
    const verbs = level === 'A1'
      ? VERB_LIST.filter(v => !['rimanere','tenere','salire','scegliere','vincere','ricevere','costruire'].includes(v))
      : VERB_LIST;
    const inf = pick(verbs);
    const subj = pick(SUBJECTS);
    const correct = Conj.get(inf, tense, subj.p, subj.gen);
    const comp = VERB_DATA[inf].comp || '';

    // distractors: other persons in the same tense + same person in a sibling tense
    const distractors = new Set();
    const persons = shuffle([0,1,2,3,4,5].filter(p => p !== subj.p));
    for (const p of persons) {
      const f = Conj.get(inf, tense, p, subj.gen);
      if (f !== correct) distractors.add(f);
      if (distractors.size >= 2) break;
    }
    const sibling = { presente:'imperfetto', passatoProssimo:'imperfetto', imperfetto:'passatoProssimo',
      futuro:'condizionale', condizionale:'futuro', congiuntivo:'presente', congPassato:'passatoProssimo',
      congImperfetto:'imperfetto', trapassato:'passatoProssimo', futuroAnteriore:'futuro',
      condPassato:'condizionale', gerundio:'presente' }[tense];
    const sib = Conj.get(inf, sibling, subj.p, subj.gen);
    if (sib !== correct) distractors.add(sib);
    while (distractors.size < 3) {
      const f = Conj.get(inf, tense, R(6), subj.gen) + ' ';
      if (f.trim() !== correct) distractors.add(f.trim() === correct ? correct + 'no' : f.trim());
    }

    const options = shuffle([correct, ...Array.from(distractors).slice(0,3)]);
    const marker = tense === 'congiuntivo' || tense === 'congPassato' || tense === 'congImperfetto'
      ? info.marker : info.marker;
    const sentence = `${marker} ${subj.txt} ___ ${comp}.`.replace(/\s+/g,' ');

    return {
      id: 'gen-conj', level, topic: 'coniugazione: ' + info.name, type: 'cloze',
      q_it: `Coniuga il verbo «${inf}» (${info.name}).`,
      q_en: `Conjugate «${inf}» (${VERB_DATA[inf].en}) in the ${info.name}.`,
      sentence, options, correct: options.indexOf(correct),
      explain_en: info.exp,
    };
  }

  // articles from the vocab bank
  function genArticle(level){
    const pool = VOCAB.filter(v => v.it.includes(' ') || v.it.includes("'"));
    const nouns = pool.filter(v => (level === 'A1' ? v.level === 'A1' : true));
    const w = pick(nouns.length ? nouns : pool);
    const art = w.it.includes("'") && !w.it.includes(' ')
      ? w.it.split("'")[0] + "'"
      : w.it.split(' ')[0];
    const all = ['il','lo','la',"l'",'i','gli','le'];
    const distract = shuffle(all.filter(a => a !== art)).slice(0,3);
    const options = shuffle([art, ...distract]);
    return {
      id: 'gen-art', level, topic: 'articoli', type: 'cloze',
      q_it: "Scegli l'articolo determinativo giusto.",
      q_en: 'Choose the correct definite article.',
      sentence: `___ ${w.bare} ${w.emoji}`,
      options, correct: options.indexOf(art),
      explain_en: "Il = masc. before most consonants; LO = masc. before s+consonant, z, gn, ps; LA = feminine; L' = before vowels; plurals: i / gli / le. The article must match the noun's gender and sound.",
    };
  }

  // emoji picture vocabulary
  function genVocabImage(level){
    const lvOrder = { A1:['A1'], A2:['A1','A2'], B1:['A2','B1','A1'] };
    const lv = pick(lvOrder[level] || ['A1']);
    let pool = VOCAB.filter(v => v.level === lv);
    if (pool.length < 4) pool = VOCAB;
    const w = pick(pool);
    const sameTheme = pool.filter(v => v.theme === w.theme && v.it !== w.it);
    const others = shuffle(sameTheme.length >= 3 ? sameTheme : pool.filter(v => v.it !== w.it)).slice(0,3);

    if (Math.random() < 0.5) {
      // see emoji, pick the word
      const options = shuffle([w, ...others].map(v => v.it));
      return {
        id: 'gen-vocab', level, topic: 'vocabolario', type: 'image',
        q_it: 'Che cos‘è? Scegli la parola giusta.',
        q_en: 'What is it? Choose the right word.',
        image: w.emoji, sentence: null,
        options, correct: options.indexOf(w.it),
        explain_en: `${w.emoji} = ${w.it} ("${w.en}"). Learn nouns together with their article — it tells you the gender.`,
      };
    } else {
      // see word, pick the emoji
      const options = shuffle([w, ...others].map(v => v.emoji));
      return {
        id: 'gen-vocab', level, topic: 'vocabolario', type: 'image-pick',
        q_it: `Quale immagine mostra «${w.it}»?`,
        q_en: `Which picture shows «${w.it}»?`,
        image: null, sentence: null, emojiOptions: true,
        options, correct: options.indexOf(w.emoji),
        explain_en: `${w.it} means "${w.en}" → ${w.emoji}.`,
      };
    }
  }

  // Bank-authored vocabulary (topics 'vocabolario-verbi' / 'vocabolario-nomi').
  // These are kept OUT of the general bank draw and served only through the
  // vocab slot below, so vocabulary keeps its original share of questions.
  const isVocabTopic = (t) => typeof t === 'string' && t.indexOf('vocabolario-') === 0;

  function bankVocab(level){
    const lvOrder = { A1:['A1'], A2:['A1','A2'], B1:['A2','B1','A1'] };
    const lv = pick(lvOrder[level] || ['A1']);
    const bank = BANKS[lv] ? BANKS[lv]() : [];
    const pool = bank.filter(q => isVocabTopic(q.topic));
    return pool.length ? pool[R(pool.length)] : null;
  }

  // vocab slot: half emoji-image drills, half frequency-list bank questions
  function genVocabMixed(level){
    if (Math.random() < 0.5) return genVocabImage(level);
    return bankVocab(level) || genVocabImage(level);
  }

  // articulated prepositions
  const PREP_SENTENCES = [
    { s:'Vado ___ mercato.', c:'al',    o:['allo','alla','ai'] },
    { s:'Il pane è ___ tavolo.', c:'sul', o:['sullo','sulla','sui'] },
    { s:'Torno ___ abbazia.', c:"all'", o:['alla','al','agli'] },
    { s:'Il libro ___ badessa è antico.', c:'della', o:['del','dello','dei'] },
    { s:'Usciamo ___ bosco.', c:'dal', o:['del','dallo','dalla'] },
    { s:'La chiave è ___ zaino.', c:'nello', o:['nel','nella','negli'] },
    { s:'I fiori ___ giardino sono belli.', c:'del', o:['della','dei','dal'] },
    { s:'Parliamo ___ studenti.', c:'agli', o:['ai','alle','allo'] },
    { s:'Vengo ___ colline.', c:'dalle', o:['dalla','dai','delle'] },
    { s:'Il gatto dorme ___ sedia.', c:'sulla', o:['sul','sullo','sulle'] },
    { s:'Metto il miele ___ pane.', c:'sul', o:['nel','sulla','al'] },
    { s:'La porta ___ torre è chiusa.', c:'della', o:['del','dalla','delle'] },
    { s:'Andiamo ___ amici stasera.', c:'dagli', o:['agli','dai','dalle'] },
    { s:'C’è una festa ___ prato.', c:'nel', o:['nello','sulla','dal'] },
    { s:'Il frate esce ___ chiesa.', c:'dalla', o:['della','dal','nella'] },
    { s:'Scriviamo ___ nostri amici.', c:'ai', o:['agli','alle','dai'] },
  ];
  function genPrepArt(level){
    const q = pick(PREP_SENTENCES);
    const options = shuffle([q.c, ...q.o]);
    return {
      id: 'gen-prep', level, topic: 'preposizioni articolate', type: 'cloze',
      q_it: 'Scegli la preposizione articolata giusta.',
      q_en: 'Choose the correct combined preposition.',
      sentence: q.s, options, correct: options.indexOf(q.c),
      explain_en: 'Preposition + article merge: a+il=al, a+lo=allo, di+la=della, da+il=dal, in+il=nel, su+il=sul, etc. Match the gender/number of the noun that follows.',
    };
  }

  // adjective agreement, built from vocab gender info
  const ADJS = [
    { m:'buono',  en:'good' }, { m:'piccolo', en:'small' }, { m:'vecchio', en:'old' },
    { m:'nuovo',  en:'new' },  { m:'rosso',   en:'red' },   { m:'bello',  en:'beautiful' },
  ];
  function genAgreement(level){
    const nouns = VOCAB.filter(v => /^(il|lo|la)\s/.test(v.it));
    const w = pick(nouns);
    const fem = w.it.startsWith('la ');
    const adj = pick(ADJS);
    const forms = [adj.m, adj.m.slice(0,-1)+'a', adj.m.slice(0,-1)+'i', adj.m.slice(0,-1)+'e'];
    const correct = fem ? forms[1] : forms[0];
    const options = shuffle(forms);
    return {
      id: 'gen-agr', level, topic: 'accordo aggettivo', type: 'cloze',
      q_it: "Accorda l'aggettivo con il nome.",
      q_en: 'Make the adjective agree with the noun.',
      sentence: `${w.it} ${w.emoji} è molto ___ .`,
      options, correct: options.indexOf(correct),
      explain_en: `Adjectives agree in gender and number: -o (masc sg), -a (fem sg), -i (masc pl), -e (fem pl). «${w.bare}» is ${fem?'feminine':'masculine'} singular → ${correct}.`,
    };
  }

  // number practice
  const NUMS = [[1,'uno'],[2,'due'],[3,'tre'],[4,'quattro'],[5,'cinque'],[6,'sei'],[7,'sette'],[8,'otto'],[9,'nove'],[10,'dieci'],
    [11,'undici'],[12,'dodici'],[15,'quindici'],[16,'sedici'],[17,'diciassette'],[20,'venti'],[21,'ventuno'],[28,'ventotto'],
    [30,'trenta'],[38,'trentotto'],[50,'cinquanta'],[66,'sessantasei'],[100,'cento'],[200,'duecento'],[1000,'mille']];
  function genNumber(level){
    const idx = R(NUMS.length);
    const [n, word] = NUMS[idx];
    const wrong = shuffle(NUMS.filter((x,i)=>i!==idx)).slice(0,3).map(x=>x[1]);
    const options = shuffle([word, ...wrong]);
    return {
      id:'gen-num', level:'A1', topic:'numeri', type:'mc',
      q_it:`Come si scrive il numero ${n}?`, q_en:`How do you write the number ${n}?`,
      sentence:null, options, correct: options.indexOf(word),
      explain_en:'Italian numbers: venti+uno drops the final vowel (ventuno, ventotto). Cento and mille never take "uno" before them.',
    };
  }

  // master entry point — mixes generated + hand-authored banks
  const BANKS = { A1: () => BANK_A1, A2: () => BANK_A2, B1: () => BANK_B1 };

  function generated(level){
    const gens = level === 'A1'
      ? [genConjugation, genConjugation, genArticle, genVocabMixed, genVocabMixed, genPrepArt, genAgreement, genNumber]
      : level === 'A2'
        ? [genConjugation, genConjugation, genVocabMixed, genPrepArt, genAgreement]
        : [genConjugation, genConjugation, genConjugation, genVocabMixed];
    return pick(gens)(level);
  }

  function fromBank(level){
    // include lower levels occasionally for consolidation
    const lvPool = level === 'B1' ? pick([['B1'],['B1'],['B1'],['A2'],['A1']])
                 : level === 'A2' ? pick([['A2'],['A2'],['A2'],['A1']])
                 : [['A1']][0];
    const bank = (BANKS[lvPool[0]] ? BANKS[lvPool[0]]() : BANK_A1)
      .filter(q => !isVocabTopic(q.topic));   // vocab is served via its own slot
    if (!bank.length) return null;
    return bank[R(bank.length)];
  }

  // Player study override (set in the ⚙️ settings panel).
  // levels: [] = automatic (zone level); topics: [] = all topics.
  function studyFilter(){
    if (typeof G !== 'undefined' && G && G.study &&
        ((G.study.levels && G.study.levels.length) || (G.study.topics && G.study.topics.length))) {
      return { levels: G.study.levels || [], topics: G.study.topics || [] };
    }
    return null;
  }

  function customQuestion(st, zoneLevel){
    const lvs = st.levels.length ? st.levels : ['A1','A2','B1'];
    const genTopics = st.topics.filter(t => t.startsWith('gen:'));
    const bankTopics = st.topics.filter(t => !t.startsWith('gen:'));

    // generator functions allowed under this filter
    const genFns = [];
    if (!st.topics.length) {
      genFns.push(() => generated(pick(lvs)));                 // levels-only: keep the normal mix
    } else {
      if (genTopics.includes('gen:conj'))  genFns.push(() => genConjugation(pick(lvs)));
      if (genTopics.includes('gen:vocab')) genFns.push(() => genVocabMixed(pick(lvs)));
    }

    // bank pool under this filter
    let pool = [];
    for (const lv of lvs) pool = pool.concat(BANKS[lv] ? BANKS[lv]() : []);
    if (bankTopics.length) pool = pool.filter(q => bankTopics.includes(q.topic));
    else if (st.topics.length) pool = [];                      // only generator chips selected
    else pool = pool.filter(q => !isVocabTopic(q.topic));      // levels-only: vocab stays in its own slot

    if (!pool.length && !genFns.length) return generated(zoneLevel); // nothing matches — safe fallback
    if (!pool.length) return pick(genFns)();
    if (!genFns.length) return pool[R(pool.length)];
    // both available: same 45/55 feel as the default mix
    return Math.random() < 0.45 ? pick(genFns)() : pool[R(pool.length)];
  }

  // topics: optional array of topic slugs to prefer from banks (zone curriculum)
  function getQuestion(level, topics){
    const st = studyFilter();
    if (st) return customQuestion(st, level);
    // default: 45% generated drills, 55% hand-authored bank
    if (Math.random() < 0.45) return generated(level);
    let q = null;
    const bank = BANKS[level] ? BANKS[level]() : [];
    if (topics && topics.length && bank.length) {
      const filtered = bank.filter(x => topics.includes(x.topic));
      if (filtered.length && Math.random() < 0.7) q = filtered[R(filtered.length)];
    }
    if (!q) q = fromBank(level);
    if (!q) q = generated(level);
    return q;
  }

  // catalog of all bank topics per level, with counts — for the settings UI
  function topicCatalog(){
    const cat = {};
    for (const lv of ['A1','A2','B1']) {
      const counts = {};
      for (const q of (BANKS[lv] ? BANKS[lv]() : [])) counts[q.topic] = (counts[q.topic] || 0) + 1;
      cat[lv] = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
    }
    return cat;
  }

  return { getQuestion, topicCatalog, genConjugation, genArticle, genVocabImage, genPrepArt, genAgreement, genNumber };
})();
