// ===== Conjugation engine =====
// Generates verb forms for 11 tenses/moods, regular + irregular.
// Persons: 0=io 1=tu 2=lui/lei 3=noi 4=voi 5=loro

const VERB_DATA = {
  // regular -are
  parlare:   { en:'to speak',   comp:'con gli amici' },
  mangiare:  { en:'to eat',     comp:'una mela' },
  lavorare:  { en:'to work',    comp:'in cucina' },
  cantare:   { en:'to sing',    comp:'una canzone' },
  guardare:  { en:'to watch',   comp:'le stelle' },
  ascoltare: { en:'to listen',  comp:'la musica' },
  comprare:  { en:'to buy',     comp:'il pane' },
  cucinare:  { en:'to cook',    comp:'la zuppa' },
  studiare:  { en:'to study',   comp:"l'italiano" },
  cercare:   { en:'to look for',comp:'la chiave' },
  pagare:    { en:'to pay',     comp:'il conto' },
  giocare:   { en:'to play',    comp:'nel prato' },
  aspettare: { en:'to wait for',comp:'gli amici' },
  portare:   { en:'to bring',   comp:"l'acqua" },
  arrivare:  { en:'to arrive',  comp:"all'abbazia", aux:'essere' },
  tornare:   { en:'to return',  comp:'a casa', aux:'essere' },
  entrare:   { en:'to enter',   comp:'nella torre', aux:'essere' },

  // regular -ere
  prendere:  { en:'to take',    comp:'la spada', pp:'preso' },
  vedere:    { en:'to see',     comp:'il fiume', pp:'visto', futStem:'vedr' },
  leggere:   { en:'to read',    comp:'un libro', pp:'letto' },
  scrivere:  { en:'to write',   comp:'una lettera', pp:'scritto' },
  chiudere:  { en:'to close',   comp:'la porta', pp:'chiuso' },
  mettere:   { en:'to put',     comp:'il pane sul tavolo', pp:'messo' },
  perdere:   { en:'to lose',    comp:'la chiave', pp:'perso' },
  chiedere:  { en:'to ask',     comp:'aiuto', pp:'chiesto' },
  rispondere:{ en:'to answer',  comp:'alla lettera', pp:'risposto' },
  vivere:    { en:'to live',    comp:"nell'abbazia", pp:'vissuto', futStem:'vivr' },
  correre:   { en:'to run',     comp:'nel bosco', pp:'corso' },
  vincere:   { en:'to win',     comp:'la battaglia', pp:'vinto' },
  scegliere: { en:'to choose',  comp:'la strada', pp:'scelto',
               pres:['scelgo','scegli','sceglie','scegliamo','scegliete','scelgono'] },
  conoscere: { en:'to know (a person/place)', comp:'la badessa', pp:'conosciuto' },
  ricevere:  { en:'to receive', comp:'un regalo' },

  // regular -ire
  dormire:   { en:'to sleep',   comp:'tutta la notte' },
  partire:   { en:'to leave',   comp:'per il viaggio', aux:'essere' },
  sentire:   { en:'to hear',    comp:'un rumore' },
  aprire:    { en:'to open',    comp:'la porta', pp:'aperto' },
  offrire:   { en:'to offer',   comp:'una torta', pp:'offerto' },
  // -isc-
  finire:    { en:'to finish',  comp:'il lavoro', isc:true },
  capire:    { en:'to understand', comp:'la lezione', isc:true },
  preferire: { en:'to prefer',  comp:'il formaggio', isc:true },
  pulire:    { en:'to clean',   comp:'la stanza', isc:true },
  costruire: { en:'to build',   comp:'un muro', isc:true },

  // irregulars
  essere: { en:'to be', comp:'a casa', aux:'essere', pp:'stato',
    pres:['sono','sei','è','siamo','siete','sono'],
    impf:['ero','eri','era','eravamo','eravate','erano'],
    futStem:'sar',
    congPres:['sia','sia','sia','siamo','siate','siano'],
    congImpf:['fossi','fossi','fosse','fossimo','foste','fossero'] },
  avere: { en:'to have', comp:'fame', pp:'avuto',
    pres:['ho','hai','ha','abbiamo','avete','hanno'],
    futStem:'avr',
    congPres:['abbia','abbia','abbia','abbiamo','abbiate','abbiano'] },
  andare: { en:'to go', comp:'al mercato', aux:'essere',
    pres:['vado','vai','va','andiamo','andate','vanno'],
    futStem:'andr', congStem:'vada' },
  fare: { en:'to do / make', comp:'il pane', pp:'fatto',
    pres:['faccio','fai','fa','facciamo','fate','fanno'],
    impfStem:'fac', futStem:'far', congStem:'faccia', ger:'facendo' },
  dire: { en:'to say', comp:'la verità', pp:'detto',
    pres:['dico','dici','dice','diciamo','dite','dicono'],
    impfStem:'dic', futStem:'dir', congStem:'dica', ger:'dicendo' },
  venire: { en:'to come', comp:'alla festa', aux:'essere', pp:'venuto',
    pres:['vengo','vieni','viene','veniamo','venite','vengono'],
    futStem:'verr', congStem:'venga' },
  uscire: { en:'to go out', comp:'con gli amici', aux:'essere',
    pres:['esco','esci','esce','usciamo','uscite','escono'], congStem:'esca' },
  bere: { en:'to drink', comp:"l'acqua", pp:'bevuto',
    pres:['bevo','bevi','beve','beviamo','bevete','bevono'],
    impfStem:'bev', futStem:'berr', congStem:'beva', congImpfStem:'bev', ger:'bevendo' },
  stare: { en:'to stay', comp:'a casa', aux:'essere', pp:'stato',
    pres:['sto','stai','sta','stiamo','state','stanno'],
    futStem:'star', congPres:['stia','stia','stia','stiamo','stiate','stiano'],
    congImpf:['stessi','stessi','stesse','stessimo','steste','stessero'] },
  dare: { en:'to give', comp:'una mela al topo', pp:'dato',
    pres:['do','dai','dà','diamo','date','danno'],
    futStem:'dar', congPres:['dia','dia','dia','diamo','diate','diano'],
    congImpf:['dessi','dessi','desse','dessimo','deste','dessero'] },
  sapere: { en:'to know (a fact)', comp:'la risposta',
    pres:['so','sai','sa','sappiamo','sapete','sanno'],
    futStem:'sapr', congPres:['sappia','sappia','sappia','sappiamo','sappiate','sappiano'] },
  potere: { en:'can / to be able', comp:'aiutare gli amici',
    pres:['posso','puoi','può','possiamo','potete','possono'],
    futStem:'potr', congStem:'possa' },
  dovere: { en:'must / to have to', comp:'partire presto',
    pres:['devo','devi','deve','dobbiamo','dovete','devono'],
    futStem:'dovr', congStem:'debba' },
  volere: { en:'to want', comp:'una spada nuova',
    pres:['voglio','vuoi','vuole','vogliamo','volete','vogliono'],
    futStem:'vorr', congStem:'voglia' },
  rimanere: { en:'to remain', comp:"nell'abbazia", aux:'essere', pp:'rimasto',
    pres:['rimango','rimani','rimane','rimaniamo','rimanete','rimangono'],
    futStem:'rimarr', congStem:'rimanga' },
  salire: { en:'to go up', comp:'sulla torre', aux:'essere',
    pres:['salgo','sali','sale','saliamo','salite','salgono'], congStem:'salga' },
  tenere: { en:'to hold', comp:'la lanterna',
    pres:['tengo','tieni','tiene','teniamo','tenete','tengono'],
    futStem:'terr', congStem:'tenga' },
};

const VERB_LIST = Object.keys(VERB_DATA);

const Conj = (() => {
  const PERSONS = ['io','tu','lui/lei','noi','voi','loro'];

  function group(inf){ return inf.slice(-3); } // are/ere/ire

  function stem(inf){ return inf.slice(0, -3); }

  // spelling fixups when attaching an ending that starts with i or e to an -are stem
  function fixAre(st, ending){
    if (/^[ie]/.test(ending)) {
      if (/[cg]$/.test(st) && !/[i]$/.test(st)) return st + 'h' + ending;   // cerc -> cerchi
      if (/i$/.test(st) && ending.startsWith('i')) return st + ending.slice(1); // mangi + i -> mangi
    }
    return st + ending;
  }

  function presente(inf){
    const d = VERB_DATA[inf] || {};
    if (d.pres) return d.pres;
    const g = group(inf), st = stem(inf);
    if (g === 'are') {
      return ['o','i','a','iamo','ate','ano'].map(e => fixAre(st, e));
    }
    if (g === 'ere') return ['o','i','e','iamo','ete','ono'].map(e => st + e);
    // ire
    if (d.isc) return ['isco','isci','isce','iamo','ite','iscono'].map(e => st + e);
    return ['o','i','e','iamo','ite','ono'].map(e => st + e);
  }

  function imperfetto(inf){
    const d = VERB_DATA[inf] || {};
    if (d.impf) return d.impf;
    const g = group(inf);
    const st = d.impfStem ? d.impfStem : stem(inf);
    const v = d.impfStem ? 'e' : (g === 'are' ? 'a' : g === 'ere' ? 'e' : 'i');
    return ['vo','vi','va','vamo','vate','vano'].map(e => st + v + e);
  }

  function futStem(inf){
    const d = VERB_DATA[inf] || {};
    if (d.futStem) return d.futStem;
    const g = group(inf), st = stem(inf);
    if (g === 'are') {
      let s = st;
      if (/[cg]$/.test(s) && !/i$/.test(s)) s += 'h';   // cercher, pagher
      if (/[cg]i$/.test(s)) s = s.slice(0, -1);          // manger, comincer
      return s + 'er';
    }
    return st + (g === 'ere' ? 'er' : 'ir');
  }

  function futuro(inf){
    const s = futStem(inf);
    return ['ò','ai','à','emo','ete','anno'].map(e => s + e);
  }
  function condizionale(inf){
    const s = futStem(inf);
    return ['ei','esti','ebbe','emmo','este','ebbero'].map(e => s + e);
  }

  function congPresente(inf){
    const d = VERB_DATA[inf] || {};
    if (d.congPres) return d.congPres;
    const pres = presente(inf);
    if (d.congStem) {
      const s = d.congStem;
      const voi = pres[3].replace(/iamo$/, 'iate');
      return [s, s, s, pres[3], voi, s + 'no'];
    }
    const g = group(inf), st = stem(inf);
    if (g === 'are') {
      const s = fixAre(st, 'i');
      return [s, s, s, st + 'iamo', st + 'iate', fixAre(st, 'ino')];
    }
    const s = d.isc ? st + 'isca' : st + 'a';
    return [s, s, s, st + 'iamo', st + 'iate', (d.isc ? st + 'iscano' : st + 'ano')];
  }

  function congImperfetto(inf){
    const d = VERB_DATA[inf] || {};
    if (d.congImpf) return d.congImpf;
    const g = group(inf);
    const st = d.congImpfStem || d.impfStem || stem(inf);
    const v = (d.congImpfStem || d.impfStem) ? 'e' : (g === 'are' ? 'a' : g === 'ere' ? 'e' : 'i');
    return ['ssi','ssi','sse','ssimo','ste','ssero'].map(e => st + v + e);
  }

  function participio(inf, gen){
    const d = VERB_DATA[inf] || {};
    let pp = d.pp;
    if (!pp) {
      const g = group(inf), st = stem(inf);
      pp = st + (g === 'are' ? 'ato' : g === 'ere' ? 'uto' : 'ito');
    }
    if (gen) pp = pp.slice(0, -1) + gen; // 'o'|'a'|'i'|'e'
    return pp;
  }

  function gerundio(inf){
    const d = VERB_DATA[inf] || {};
    if (d.ger) return d.ger;
    const g = group(inf);
    return stem(inf) + (g === 'are' ? 'ando' : 'endo');
  }

  function aux(inf){ return (VERB_DATA[inf] && VERB_DATA[inf].aux) || 'avere'; }

  // agreement letters per person for essere-aux; subjects chosen by generator
  const AGR = ['o','o','o','i','i','i']; // default masc; generator overrides for named female subjects

  function compound(inf, auxTense, person, gen){
    const a = aux(inf);
    const auxForms = ({
      presente: presente(a),
      imperfetto: imperfetto(a),
      futuro: futuro(a),
      condizionale: condizionale(a),
      congPresente: congPresente(a),
    })[auxTense];
    let g = null;
    if (a === 'essere') g = gen || AGR[person];
    return auxForms[person] + ' ' + participio(inf, g);
  }

  function get(inf, tense, person, gen){
    switch(tense){
      case 'presente':        return presente(inf)[person];
      case 'imperfetto':      return imperfetto(inf)[person];
      case 'futuro':          return futuro(inf)[person];
      case 'condizionale':    return condizionale(inf)[person];
      case 'congiuntivo':     return congPresente(inf)[person];
      case 'congImperfetto':  return congImperfetto(inf)[person];
      case 'passatoProssimo': return compound(inf, 'presente', person, gen);
      case 'trapassato':      return compound(inf, 'imperfetto', person, gen);
      case 'futuroAnteriore': return compound(inf, 'futuro', person, gen);
      case 'condPassato':     return compound(inf, 'condizionale', person, gen);
      case 'congPassato':     return compound(inf, 'congPresente', person, gen);
      case 'gerundio':        return presente('stare')[person] + ' ' + gerundio(inf); // stare + gerundio
      default: return presente(inf)[person];
    }
  }

  return { get, presente, imperfetto, futuro, condizionale, congPresente, congImperfetto,
           participio, gerundio, aux, PERSONS };
})();
