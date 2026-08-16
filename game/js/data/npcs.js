// npcs.js — the people (and dog) of the world. Tap an NPC to hear a line.
// Dialogue is graded Italian for immersion: town folk speak simple A1/A2 with an
// English gloss, the further you roam the harder the Italian gets, and the ghost
// speaks flowing C1 with no help at all. `radius` is how far they wander.

export const NPCS = [
  {
    id: 'mayor', name: 'Sindaca Alda', x: 38, y: 62, radius: 2,
    colors: { shirt: 0x7a4a8a, pants: 0x3a3a44, hair: 0xd8d4c8 },
    lines: [
      'Benvenuto a Borgosereno! (Welcome to Borgosereno!) Knowledge built this town.',
      'Qui ogni azione è una domanda. (Here every action is a question.) Literally.',
      'La biblioteca premia chi studia. (The library rewards those who study.) Tell Lira I sent you.',
      'Si dice che i draghi del picco parlino solo italiano… (They say the peak’s wyrms speak only Italian…)',
    ],
  },
  {
    id: 'archivist', name: 'Bibliotecaria Lira', x: 41, y: 62, radius: 1,
    colors: { shirt: 0x3f5f9f, pants: 0x2f2f3a, hair: 0x8a4a2a },
    lines: [
      'Ripetere è ricordare. (To repeat is to remember.) The scheduler knows when.',
      'Ogni cinque ripassi ti do una cassa di libri. (Every five reviews I set a book crate aside for you.)',
      'Poco ma spesso — little and often beats cramming. That is the forgetting curve, not opinion.',
      'Una parola al giorno… e in un anno ne sai trecentosessantacinque.',
    ],
  },
  {
    id: 'smith', name: 'Fabbro Berra', x: 34, y: 62, radius: 2,
    colors: { shirt: 0x6a3a2a, pants: 0x3a3a3a, hair: 0x2a2a2a },
    lines: [
      'Il ferro è caldo! (The iron is hot!) Bronze before iron, iron before steel.',
      'Forgia una vanga — the farm won’t dig itself.',
      'Uno scudo ha salvato più studenti di ogni scusa. (A shield has saved more students than any excuse.)',
      'Portami il carbone. (Bring me coal.) Everything good needs coal.',
    ],
  },
  {
    id: 'grocer', name: 'Bottegaio Fino', x: 37, y: 63, radius: 2,
    colors: { shirt: 0x4a7a4a, pants: 0x5a4a33, hair: 0x6a4a2a },
    lines: [
      'Piume, semi, bende — la bottega ha tutto! (Feathers, seeds, salves — the shop has it all!)',
      'Compro quasi tutto a sei monete su dieci. (I buy almost anything at six coins on the ten.) A fair margin!',
      'Quanto costa? Poco! (How much? Not much!) …for you, my friend.',
      'Lo spaventapasseri dei Campi? Pieno di vecchi quaderni, dicono. (The scarecrow? Stuffed with old notebooks, they say.)',
    ],
  },
  {
    id: 'villager_kid', name: 'Pippo', x: 36, y: 67, radius: 4,
    colors: { shirt: 0xc9a13a, pants: 0x4a5a8a, hair: 0x8a4a2a }, scale: 0.75,
    lines: [
      'Da grande voglio fare il poeta! (When I grow up I want to be a poet!)',
      'Ho visto uno slime vicino al ponte! (I saw a slime by the bridge!) It looked… quizzical.',
      'Il vecchio minatore parla con le rocce. (The old miner talks to rocks.) Sometimes they answer!',
      'Facciamo una gara fino al pozzo! (Race you to the well!)',
    ],
  },
  {
    id: 'dog', name: 'Biscotto', x: 40, y: 66, radius: 4, kind: 'dog',
    lines: ['Bau!', 'Bau bau!', '*tail wagging intensifies*', '*sniffs your bag hopefully*'],
  },
  {
    id: 'prospector', name: 'Vecchio Gruffo', x: 18, y: 48, radius: 2,
    colors: { shirt: 0x5a4a33, pants: 0x4a3a2a, hair: 0xd8d4c8 },
    lines: [
      'Le vene più profonde vogliono mani più ferme. (The deeper veins want steadier hands.) Level up, then return.',
      'La runite… la cerco da cinquant’anni. Canta, sai. In fa diesis.',
      'La roccia delle gemme ha i suoi umori: giorni di zaffiro e giorni di diamante.',
      'Occhio ai crawler — rubano quello che i minatori perdono.',
    ],
  },
  {
    id: 'fletcher', name: 'Arciera Rondine', x: 52, y: 55, radius: 2,
    colors: { shirt: 0x4a5a3a, pants: 0x3a3a2a, hair: 0x2a2a1a },
    lines: [
      'Il tasso cresce in fondo al bosco — worth every level it demands.',
      'L’arco lungo tira più lontano dell’arco corto, ma tutti e due tirano più lontano dei rimpianti.',
      'Controlla i nidi: piume, e a volte semi portati via dagli uccelli.',
      'I lupi tengono a bada i cervi. Io tengo a bada i lupi. Equilibrio.',
    ],
  },
  {
    id: 'farmer', name: 'Contadina Pella', x: 33, y: 82, radius: 3,
    colors: { shirt: 0x8a6a3a, pants: 0x5a4a33, hair: 0x6a5a3a },
    lines: [
      'Farina d’ossa: ossa e argilla macinate fini. Alle piante piace da matti.',
      'Lo starbloom fiorisce solo per chi ha visto settanta stagioni — livello settanta, intendo.',
      'Ancora slime nel mio lino! Almeno sono biodegradabili.',
      'La serra taglia un decimo dell’attesa. Il vetro è pazienza diventata solida.',
    ],
  },
  {
    id: 'guard', name: 'Capitano Sorrello', x: 45, y: 28, radius: 1,
    colors: { shirt: 0x8a2f2f, pants: 0x3a3a44, hair: 0x2a2a2a },
    lines: [
      'Oltre questo cancello ci sono i briganti. Livello di combattimento dieci, o torna indietro.',
      'Il loro capitano porta le chiavi buone. Vaglielo a togliere tu.',
      'Tenere la linea e rispondere bene — in fondo è la stessa cosa.',
    ],
  },
  {
    id: 'ghost', name: 'Lo Studioso Pallido', x: 12, y: 24, radius: 2, kind: 'ghost',
    lines: [
      'Uuuh… chi non ripassa ciò che ha imparato è condannato a dimenticarlo…',
      'Morii con seimilacentoquarantatré carte mai viste. Non fare come me.',
      'Il congiuntivo… se solo l’avessi studiato quando ne avevo il tempo…',
      'Persino la morte non è che un intervallo di ripasso molto, molto lungo.',
    ],
  },
];
