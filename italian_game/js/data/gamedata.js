// ===== Races, classes, enemies, items, buildings, zones =====

const RACES = {
  topo:      { emoji:'🐭', sprite:'mouse', it:'Topo', en:'Mouse', desc_it:'Equilibrato e coraggioso', desc_en:'Balanced and brave',
               base:{hp:30, atk:6, def:5, wis:6, spd:6}, growth:{hp:6, atk:2, def:2, wis:2, spd:2} },
  riccio:    { emoji:'🦔', sprite:'hedgehog', it:'Riccio', en:'Hedgehog', desc_it:'Difesa di spine', desc_en:'Spiny defense',
               base:{hp:34, atk:5, def:8, wis:5, spd:4}, growth:{hp:7, atk:2, def:3, wis:2, spd:1} },
  lepre:     { emoji:'🐇', sprite:'hare', it:'Lepre', en:'Hare', desc_it:'Veloce come il vento', desc_en:'Fast as the wind',
               base:{hp:28, atk:6, def:4, wis:5, spd:10}, growth:{hp:5, atk:2, def:1, wis:2, spd:3} },
  lontra:    { emoji:'🦦', sprite:'otter', it:'Lontra', en:'Otter', desc_it:'Guerriera del fiume', desc_en:'Warrior of the river',
               base:{hp:30, atk:8, def:4, wis:5, spd:7}, growth:{hp:6, atk:3, def:1, wis:2, spd:2} },
  tasso:     { emoji:'🦡', sprite:'badger', it:'Tasso', en:'Badger', desc_it:'Forza della montagna', desc_en:'Strength of the mountain',
               base:{hp:40, atk:8, def:6, wis:4, spd:3}, growth:{hp:9, atk:3, def:2, wis:1, spd:1} },
};

const CLASSES = {
  guerriero: { emoji:'⚔️', it:'Guerriero', en:'Warrior', desc_it:'+Forza, +Vita', desc_en:'+Attack, +HP',
               mod:{hp:8, atk:3, def:1, wis:0, spd:0} },
  studioso:  { emoji:'📚', it:'Studioso', en:'Scholar', desc_it:'+Saggezza: più esperienza e indizi', desc_en:'+Wisdom: more XP and hints',
               mod:{hp:0, atk:0, def:0, wis:5, spd:1} },
  sentinella:{ emoji:'🏹', it:'Sentinella', en:'Scout', desc_it:'+Velocità: schiva e fuggi meglio', desc_en:'+Speed: dodge and flee better',
               mod:{hp:2, atk:1, def:1, wis:1, spd:4} },
};

const ENEMIES = {
  ratto:      { emoji:'🐀', sprite:'rat', it:'Ratto predone', en:'Rat raider', lv:1, hp:18, atk:5, def:2, spd:3, xp:10, coins:[2,6],  drops:{legno:[0,2], grano:[0,1]} },
  ragno:      { emoji:'🕷️', sprite:'spider', it:'Ragno del bosco', en:'Wood spider', lv:2, hp:24, atk:7, def:3, spd:5, xp:14, coins:[3,8],  drops:{legno:[1,2]} },
  vipera:     { emoji:'🐍', sprite:'snake', it:'Vipera del prato', en:'Meadow adder', lv:4, hp:34, atk:10, def:4, spd:7, xp:22, coins:[5,12], drops:{grano:[1,2]} },
  falco:      { emoji:'🦅', sprite:'hawk', it:'Falco predone', en:'Raider hawk', lv:5, hp:40, atk:12, def:5, spd:9, xp:28, coins:[6,14], drops:{grano:[1,3]} },
  dentegiallo:{ emoji:'🐀', sprite:'ratarmor', it:'Sgherro Dentegiallo', en:'Yellowtooth the Brute', lv:3, hp:42, atk:9, def:4, spd:4, xp:35, coins:[12,20], drops:{legno:[2,4]}, boss:true },
  viperaregina:{ emoji:'🐍', sprite:'snake', overlay:'crown', it:'Vipera Regina', en:'Viper Queen', lv:6, hp:58, atk:13, def:6, spd:8, xp:55, coins:[15,25], drops:{grano:[2,4]}, boss:true },
  capitano:   { emoji:'🐀', sprite:'ratarmor', overlay:'helm', it:'Capitano Codaferro', en:'Captain Irontail', lv:7, hp:70, atk:14, def:7, spd:6, xp:60, coins:[20,35], drops:{pietra:[2,4]}, boss:true },
  lupocapo:   { emoji:'🐺', sprite:'wolf', it:"Zanna d'Ombra", en:'Shadowfang', lv:11, hp:92, atk:22, def:10, spd:11, xp:95, coins:[25,40], drops:{pietra:[3,5]}, boss:true },
  lupo:       { emoji:'🐺', sprite:'wolf', it:'Lupo grigio', en:'Grey wolf', lv:8, hp:60, atk:16, def:7, spd:8, xp:40, coins:[8,18], drops:{pietra:[1,2]} },
  gatto:      { emoji:'🐈', sprite:'wildcat', it:'Gatto selvatico', en:'Wildcat', lv:10, hp:72, atk:19, def:9, spd:10, xp:52, coins:[10,22], drops:{pietra:[1,3]} },
  pipistrello:{ emoji:'🦇', sprite:'bat', it:'Pipistrello urlante', en:'Screeching bat', lv:12, hp:80, atk:22, def:10, spd:12, xp:64, coins:[12,26], drops:{pietra:[2,4]} },
  serpecava:  { emoji:'🐍', sprite:'snake', it:'Serpente della miniera', en:'Mine serpent', lv:14, hp:95, atk:26, def:12, spd:9, xp:80, coins:[15,30], drops:{pietra:[2,5], legno:[1,2]} },
  malaspina:  { emoji:'🦊', sprite:'fox', overlay:'crown', it:'Malaspina la Volpe', en:'Malaspina the Fox', lv:16, hp:160, atk:30, def:14, spd:12, xp:220, coins:[60,90], drops:{pietra:[4,8]}, boss:true },
  guardia:    { emoji:'🐀', sprite:'ratarmor', overlay:'helm', it:'Guardia della fortezza', en:'Fortress guard', lv:17, hp:110, atk:32, def:15, spd:10, xp:100, coins:[20,40], drops:{pietra:[2,5]} },
  zannagrigia:{ emoji:'🐀', sprite:'ratarmor', overlay:'crown', it:'Re Zannagrigia', en:'King Greyfang', lv:20, hp:260, atk:38, def:18, spd:14, xp:500, coins:[150,250], drops:{}, boss:true, final:true },
};

const ITEMS = {
  pane:     { emoji:'🍞', it:'Pane di segale', en:'Rye bread', type:'heal', heal:30, price:10 },
  formaggio:{ emoji:'🧀', it:'Formaggio stagionato', en:'Aged cheese', type:'heal', heal:70, price:25 },
  torta:    { emoji:'🥧', it:'Torta di more', en:'Blackberry pie', type:'heal', heal:9999, price:70 },
  // weapons (atk bonus)
  bastone:  { emoji:'🪃', it:'Bastone di quercia', en:'Oak staff', type:'weapon', atk:2, price:25, forge:0 },
  spada1:   { emoji:'🗡️', it:'Spada corta', en:'Short sword', type:'weapon', atk:5, price:80, forge:1 },
  spada2:   { emoji:'⚔️', it:"Spada d'acciaio", en:'Steel sword', type:'weapon', atk:10, price:220, forge:2 },
  spada3:   { emoji:'🌟', it:'Lama del Guardiano', en:'Blade of the Guardian', type:'weapon', atk:16, price:500, forge:3 },
  // armor (def bonus)
  tunica:   { emoji:'🥋', it:'Tunica di lana', en:'Wool tunic', type:'armor', def:1, price:20, forge:0 },
  cuoio:    { emoji:'🦺', it:'Cotta di cuoio', en:'Leather jerkin', type:'armor', def:4, price:70, forge:1 },
  ferro:    { emoji:'⛓️', it:'Maglia di ferro', en:'Iron mail', type:'armor', def:8, price:200, forge:2 },
  scudo:    { emoji:'🛡️', it:'Scudo di quercia', en:'Oak shield', type:'armor', def:13, price:450, forge:3 },
};

const RES_INFO = {
  monete: { emoji:'🪙', it:'monete', en:'coins' },
  legno:  { emoji:'🪵', it:'legno', en:'wood' },
  pietra: { emoji:'🪨', it:'pietra', en:'stone' },
  grano:  { emoji:'🌾', it:'grano', en:'grain' },
};

// Abbey buildings — each level costs resources and grants perks
const BUILDINGS = {
  campanile: { emoji:'🔔', it:'Campanile', en:'Belltower', max:3,
    desc_it:'Ogni livello: +10% esperienza', desc_en:'Each level: +10% XP',
    costs:[ {legno:10, pietra:5, monete:30}, {legno:20, pietra:15, monete:80}, {legno:35, pietra:30, monete:200} ] },
  biblioteca:{ emoji:'📚', it:'Biblioteca', en:'Library', max:3,
    desc_it:'Indizi gratis nelle domande (1 per livello, per battaglia)', desc_en:'Free hints on questions (1 per level, per battle)',
    costs:[ {legno:12, grano:6, monete:30}, {legno:25, pietra:10, monete:90}, {legno:40, pietra:25, monete:220} ] },
  fucina:    { emoji:'🔥', it:'Fucina', en:'Forge', max:3,
    desc_it:'Sblocca armi e armature migliori; liv. 2: colpo speciale', desc_en:'Unlocks better weapons/armor; lv 2: special strike',
    costs:[ {pietra:12, legno:8, monete:40}, {pietra:25, legno:15, monete:120}, {pietra:45, legno:25, monete:280} ] },
  infermeria:{ emoji:'🌿', it:'Infermeria', en:'Infirmary', max:3,
    desc_it:'Cure gratis in abbazia; +5 Vita massima per livello', desc_en:'Free healing at the abbey; +5 max HP per level',
    costs:[ {legno:10, grano:8, monete:30}, {legno:20, grano:18, monete:90}, {pietra:20, grano:30, monete:200} ] },
  mulino:    { emoji:'🌾', it:'Mulino', en:'Mill', max:3,
    desc_it:'+15% monete dalle battaglie per livello', desc_en:'+15% coins from battles per level',
    costs:[ {legno:15, pietra:8, monete:35}, {legno:30, pietra:15, monete:100}, {legno:50, pietra:30, monete:240} ] },
  orto:      { emoji:'🥕', it:'Orto', en:'Garden', max:3,
    desc_it:'+1 risorsa quando raccogli, per livello', desc_en:'+1 resource when gathering, per level',
    costs:[ {legno:8, grano:5, monete:20}, {legno:16, grano:12, monete:60}, {legno:30, grano:25, monete:150} ] },
};

// Zones — curriculum mapping (bank topic slugs per zone)
const ZONES = {
  abbazia:  { it:"Abbazia di Muraverde", en:'Muraverde Abbey', level:'A1', enemies:[], rate:0, minLv:1, topics:[] },
  bosco:    { it:'Il Bosco dei Sussurri', en:'The Whispering Woods', level:'A1', enemies:['ratto','ragno'], rate:0.14, minLv:1,
              topics:['articoli','nomi','presente','interrogativi'] },
  prato:    { it:'Il Prato Fiorito', en:'The Flowering Meadow', level:'A1', enemies:['ratto','ragno','vipera','falco'], rate:0.14, minLv:3,
              topics:['aggettivi','riflessivi','modali','piacere','preposizioni','possessivi'] },
  fiume:    { it:'Il Fiume Lucente', en:'The Shining River', level:'A2', enemies:['vipera','falco','lupo'], rate:0.15, minLv:6,
              topics:['passato-imperfetto','passato','futuro','scelta-verbo','possessivi-famiglia'] },
  colline:  { it:'Le Colline Brumose', en:'The Misty Hills', level:'A2', enemies:['lupo','gatto','falco'], rate:0.15, minLv:9,
              topics:['pronomi','ci-ne','condizionale','comparativi','imperativo','nomi-irregolari','avverbi'] },
  miniera:  { it:'La Miniera Buia', en:'The Dark Mine', level:'B1', enemies:['pipistrello','serpecava','gatto'], rate:0.16, minLv:12,
              topics:['congiuntivo','congiuntivo-imperfetto','pronomi-combinati','ci-ne','trapassato-futuro-anteriore','relativi'] },
  fortezza: { it:'La Fortezza di Zannagrigia', en:"Greyfang's Fortress", level:'B1', enemies:['guardia','serpecava','pipistrello'], rate:0.18, minLv:15,
              topics:['ipotetico','condizionale-passato','passiva-si','imperativo-lei','connettivi','discorso-indiretto','correzione','verbi-preposizioni','comparativi-avanzati'] },
};

function xpForLevel(l){ return Math.round(20 + (l-1) * 22 * (1 + (l-1) * 0.12)); }
