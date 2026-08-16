// on-screen error reporter — surfaces runtime errors on devices without a console
(function(){
  function show(msg){
    var b = document.getElementById('err-banner');
    if (!b) return;
    b.textContent = '⚠️ ' + msg + '  (tocca per chiudere / tap to dismiss)';
    b.classList.remove('hidden');
    b.onclick = function(){ b.classList.add('hidden'); };
  }
  window.addEventListener('error', function(e){
    show((e.message || 'Errore') + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno);
  });
  window.addEventListener('unhandledrejection', function(e){
    show('Promise: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });
})();

// ===== Medieval woodcut SVG sprites =====
// All art is generated inline (data URIs) — zero external assets.
// Style: thick ink outlines (#33241a), muted manuscript palette, 32×32 viewBox.

const Sprites = (() => {
  const INK = '#33241a';
  const S = 1.4; // outline width

  // ---------- creature template ----------
  // Consistent woodland-critter builder: tail + body + belly + head + ears + face.
  function critter(o){
    const fur = o.fur, belly = o.belly || '#e6dac2';
    let tail = '';
    if (o.tail === 'thin')
      tail = `<path d="M23 24 Q29 26 28 19" fill="none" stroke="${INK}" stroke-width="${S}" stroke-linecap="round"/>`;
    if (o.tail === 'bushy')
      tail = `<path d="M22 25 Q31 24 29 14 Q27 8 24 12 Q26 18 21 21 Z" fill="${o.tailColor || fur}" stroke="${INK}" stroke-width="${S}"/>`;
    if (o.tail === 'squirrel')
      tail = `<path d="M21 24 Q31 25 30 12 Q29 4 23 7 Q27 12 24 17 Q22 20 20 21 Z" fill="${o.tailColor || fur}" stroke="${INK}" stroke-width="${S}"/>`;

    let ears = '';
    switch (o.ears) {
      case 'mouse':
        ears = `<circle cx="10" cy="6.5" r="3.8" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>
                <circle cx="22" cy="6.5" r="3.8" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>
                <circle cx="10" cy="6.5" r="1.8" fill="#d9a5a0"/><circle cx="22" cy="6.5" r="1.8" fill="#d9a5a0"/>`;
        break;
      case 'round':
        ears = `<circle cx="10.5" cy="7" r="2.8" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>
                <circle cx="21.5" cy="7" r="2.8" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>`;
        break;
      case 'long':
        ears = `<ellipse cx="12" cy="3.6" rx="2.3" ry="6" fill="${fur}" stroke="${INK}" stroke-width="${S}" transform="rotate(-8 12 4)"/>
                <ellipse cx="20" cy="3.6" rx="2.3" ry="6" fill="${fur}" stroke="${INK}" stroke-width="${S}" transform="rotate(8 20 4)"/>
                <ellipse cx="12" cy="4" rx="1" ry="3.6" fill="#d9a5a0" transform="rotate(-8 12 4)"/>
                <ellipse cx="20" cy="4" rx="1" ry="3.6" fill="#d9a5a0" transform="rotate(8 20 4)"/>`;
        break;
      case 'pointy':
        ears = `<path d="M8 10 L10 3 L14 8 Z" fill="${fur}" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>
                <path d="M24 10 L22 3 L18 8 Z" fill="${fur}" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>`;
        break;
      case 'spikes':
        ears = `<path d="M8 10 L7 4 L11 8 L12 2 L15 7 L17 2 L19 7 L22 3 L23 8 L26 5 L24 11"
                fill="${o.spikeColor || '#5c452e'}" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>`;
        break;
      case 'tiny':
        ears = `<circle cx="11" cy="6.8" r="2.1" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>
                <circle cx="21" cy="6.8" r="2.1" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>`;
        break;
      case 'horns':
        ears = `<path d="M10 8 Q6 5 7 1" fill="none" stroke="#8a7a5c" stroke-width="2.6" stroke-linecap="round"/>
                <path d="M22 8 Q26 5 25 1" fill="none" stroke="#8a7a5c" stroke-width="2.6" stroke-linecap="round"/>
                <path d="M10 8 Q6 5 7 1 M22 8 Q26 5 25 1" fill="none" stroke="${INK}" stroke-width="0.8"/>
                <circle cx="10.5" cy="7" r="2" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>
                <circle cx="21.5" cy="7" r="2" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>`;
        break;
      case 'tuft':
        ears = `<path d="M9 9 L9.5 2.5 L13 8 Z" fill="${fur}" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>
                <path d="M23 9 L22.5 2.5 L19 8 Z" fill="${fur}" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>`;
        break;
    }

    const extras = (o.extras || []).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      ${tail}
      <ellipse cx="16" cy="22" rx="8.2" ry="7" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>
      <ellipse cx="16" cy="23.5" rx="4.6" ry="4.6" fill="${belly}"/>
      <ellipse cx="12" cy="28.4" rx="2.4" ry="1.5" fill="${fur}" stroke="${INK}" stroke-width="1"/>
      <ellipse cx="20" cy="28.4" rx="2.4" ry="1.5" fill="${fur}" stroke="${INK}" stroke-width="1"/>
      ${ears}
      <circle cx="16" cy="12.5" r="7.6" fill="${fur}" stroke="${INK}" stroke-width="${S}"/>
      ${o.mask || ''}
      <ellipse cx="16" cy="15.6" rx="3.2" ry="2.4" fill="${belly}"/>
      <circle cx="13.2" cy="11.5" r="1.15" fill="${INK}"/>
      <circle cx="18.8" cy="11.5" r="1.15" fill="${INK}"/>
      <ellipse cx="16" cy="14.6" rx="1.15" ry="0.9" fill="#5c3a33"/>
      ${extras}
    </svg>`;
  }

  const badgerMask = `<path d="M11 6.5 Q13 12 12.5 18" stroke="#efe6d6" stroke-width="2.6" fill="none"/>
    <path d="M21 6.5 Q19 12 19.5 18" stroke="#efe6d6" stroke-width="2.6" fill="none"/>`;
  const catStripes = `<path d="M10 20 h3 M19 20 h3 M11 24 h2.4 M18.6 24 h2.4" stroke="#6e5a40" stroke-width="1.4"/>`;
  const armor = `<path d="M9 20 a7.5 6 0 0 0 14 0 l-1.6 1.4 -2 -1.6 -2 1.6 -2.4 -1.6 -2.4 1.6 -2 -1.6 Z" fill="#8b8b93" stroke="${INK}" stroke-width="1"/>`;

  // ---------- bespoke creatures ----------
  const bespoke = {
    spider: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <g stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round">
        <path d="M12 14 Q5 10 3 5 M12 17 Q4 17 2 13 M12 20 Q5 23 4 27 M13 22 Q9 27 10 30"/>
        <path d="M20 14 Q27 10 29 5 M20 17 Q28 17 30 13 M20 20 Q27 23 28 27 M19 22 Q23 27 22 30"/>
      </g>
      <circle cx="16" cy="19" r="7" fill="#3f3630" stroke="${INK}" stroke-width="${S}"/>
      <circle cx="16" cy="10" r="4.4" fill="#4a4038" stroke="${INK}" stroke-width="${S}"/>
      <circle cx="14.4" cy="9.4" r="1" fill="#c94f3d"/><circle cx="17.6" cy="9.4" r="1" fill="#c94f3d"/>
      <path d="M13 22 Q16 24.5 19 22" stroke="#8a7355" stroke-width="1.2" fill="none"/>
    </svg>`,
    snake: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M6 27 Q2 22 8 20 Q16 18 14 14 Q12 9 19 8"
        fill="none" stroke="#6e7f3d" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M6 27 Q2 22 8 20 Q16 18 14 14 Q12 9 19 8"
        fill="none" stroke="${INK}" stroke-width="1"/>
      <path d="M8 21 l2 1 M12 17 l2 1 M13 12 l2 .6" stroke="#4c5a2a" stroke-width="1.2"/>
      <circle cx="21.5" cy="8.5" r="4.4" fill="#77883f" stroke="${INK}" stroke-width="${S}"/>
      <circle cx="20.5" cy="7.2" r="1" fill="#d8b23a"/><circle cx="23.5" cy="7.2" r="1" fill="#d8b23a"/>
      <path d="M25.5 10 L29 11 M29 11 L27.8 9.4 M29 11 L28 12.6" stroke="#a33327" stroke-width="1.1" fill="none"/>
    </svg>`,
    hawk: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M4 12 Q9 4 15 9 L12 16 Q6 17 4 12 Z" fill="#8a6f4a" stroke="${INK}" stroke-width="${S}"/>
      <path d="M28 12 Q23 4 17 9 L20 16 Q26 17 28 12 Z" fill="#8a6f4a" stroke="${INK}" stroke-width="${S}"/>
      <ellipse cx="16" cy="18" rx="6.4" ry="8" fill="#a08154" stroke="${INK}" stroke-width="${S}"/>
      <path d="M13 25 L16 30 L19 25" fill="#6e5637" stroke="${INK}" stroke-width="1"/>
      <circle cx="16" cy="9.5" r="5" fill="#8a6f4a" stroke="${INK}" stroke-width="${S}"/>
      <circle cx="14" cy="8.6" r="1.1" fill="#e8c66a"/><circle cx="18" cy="8.6" r="1.1" fill="#e8c66a"/>
      <path d="M15 11.5 Q16 13.5 17 11.5 L16 14 Z" fill="#d8b23a" stroke="${INK}" stroke-width="0.9"/>
      <path d="M12 20 q4 2 8 0 M12.6 23 q3.4 1.8 6.8 0" stroke="#6e5637" stroke-width="1" fill="none"/>
    </svg>`,
    bat: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M15 14 Q9 8 2 9 Q5 12 4 15 Q8 14 9 17 Q12 16 13 19 Z" fill="#5a4a5e" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>
      <path d="M17 14 Q23 8 30 9 Q27 12 28 15 Q24 14 23 17 Q20 16 19 19 Z" fill="#5a4a5e" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>
      <ellipse cx="16" cy="17" rx="5" ry="6.4" fill="#6b5a70" stroke="${INK}" stroke-width="${S}"/>
      <path d="M12.5 9 L13.5 4.5 L15.5 8 Z M19.5 9 L18.5 4.5 L16.5 8 Z" fill="#6b5a70" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
      <circle cx="14" cy="13" r="1.1" fill="#e8c66a"/><circle cx="18" cy="13" r="1.1" fill="#e8c66a"/>
      <path d="M14.5 16 l1 1 1-1 1 1 1-1" stroke="#efe6d6" stroke-width="0.9" fill="none"/>
    </svg>`,
  };

  // ---------- species registry ----------
  const CREATURES = {
    mouse:    critter({ fur:'#b7a894', ears:'mouse', tail:'thin' }),
    hedgehog: critter({ fur:'#a98a63', ears:'spikes', spikeColor:'#5c452e',
               extras:[`<path d="M8.5 18 Q6 14 8 11 M23.5 18 Q26 14 24 11" stroke="#5c452e" stroke-width="2" fill="none"/>`] }),
    hare:     critter({ fur:'#cfc4ad', ears:'long', tail:'thin' }),
    otter:    critter({ fur:'#8a5f3c', belly:'#c9a877', ears:'tiny', tail:'thin' }),
    badger:   critter({ fur:'#6e6a66', belly:'#b9b4ae', ears:'tiny', mask:badgerMask }),
    squirrel: critter({ fur:'#a3562e', belly:'#e0c7a8', ears:'tuft', tail:'squirrel', tailColor:'#b46a3e' }),
    goat:     critter({ fur:'#cabfae', belly:'#e8e0d0', ears:'horns' }),
    rat:      critter({ fur:'#7d7468', belly:'#a89f92', ears:'round', tail:'thin' }),
    fox:      critter({ fur:'#b0552a', belly:'#e8d7b8', ears:'pointy', tail:'bushy', tailColor:'#c2683a' }),
    wolf:     critter({ fur:'#6f6f75', belly:'#a5a5aa', ears:'pointy', tail:'bushy' }),
    wildcat:  critter({ fur:'#8a7355', belly:'#c9b894', ears:'pointy', tail:'thin', extras:[catStripes] }),
    ratarmor: critter({ fur:'#7d7468', belly:'#a89f92', ears:'round', tail:'thin', extras:[armor] }),
    spider:   bespoke.spider,
    snake:    bespoke.snake,
    hawk:     bespoke.hawk,
    bat:      bespoke.bat,
  };

  // ---------- overlays (drawn on top of a creature) ----------
  const OVERLAYS = {
    crown: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M10.5 6.5 L11 1.5 L14 4.5 L16 0.8 L18 4.5 L21 1.5 L21.5 6.5 Z"
        fill="#c9a227" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
      <circle cx="16" cy="3" r="0.9" fill="#a33327"/>
    </svg>`,
    helm: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M9 8.5 Q9 2.5 16 2.5 Q23 2.5 23 8.5 L21.5 9 Q16 6.5 10.5 9 Z"
        fill="#8b8b93" stroke="${INK}" stroke-width="1.1"/>
      <path d="M16 2.5 L16 0.5" stroke="#a33327" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  };

  // ---------- tiles ----------
  const TILE_SVGS = {
    pine: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M16 2 L24 12 L20.5 11.5 L26 20 L21.5 19.5 L27 28 L5 28 L10.5 19.5 L6 20 L11.5 11.5 L8 12 Z"
        fill="#3e5230" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>
      <path d="M13 12 l3 3 M16 18 l4 3 M11 22 l4 3" stroke="#5c7a3f" stroke-width="1.1"/>
      <rect x="14" y="27" width="4" height="4" fill="#6e4f30" stroke="${INK}" stroke-width="1"/>
    </svg>`,
    oak: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="10" cy="13" r="6.5" fill="#55703c" stroke="${INK}" stroke-width="${S}"/>
      <circle cx="22" cy="13" r="6.5" fill="#55703c" stroke="${INK}" stroke-width="${S}"/>
      <circle cx="16" cy="8" r="6.5" fill="#628049" stroke="${INK}" stroke-width="${S}"/>
      <circle cx="16" cy="14" r="6.8" fill="#628049"/>
      <rect x="14" y="19" width="4" height="10" fill="#6e4f30" stroke="${INK}" stroke-width="1.1"/>
      <path d="M14 22 l-4 -3 M18 22 l4 -3" stroke="#6e4f30" stroke-width="2"/>
      <circle cx="12" cy="10" r="1" fill="#8fae6a"/><circle cx="20" cy="8" r="1" fill="#8fae6a"/>
    </svg>`,
    wall: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="0" y="0" width="32" height="32" fill="#8d6a4f"/>
      <g stroke="#5c4030" stroke-width="1.6">
        <path d="M0 8 h32 M0 16 h32 M0 24 h32"/>
        <path d="M8 0 v8 M20 0 v8 M14 8 v8 M26 8 v8 M2 8 v8 M8 16 v8 M20 16 v8 M14 24 v8 M26 24 v8 M2 24 v8"/>
      </g>
      <path d="M0 1 h32 M0 31 h32" stroke="#5c4030" stroke-width="2"/>
      <path d="M3 4 h3 M17 12 h3 M9 20 h3 M23 28 h3" stroke="#a3805f" stroke-width="1.2"/>
    </svg>`,
    boulder: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M6 26 Q3 18 9 13 Q13 6 20 8 Q28 9 27 17 Q29 24 23 26 Z"
        fill="#8b8474" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>
      <path d="M12 14 L18 12 M10 20 L16 17 M20 15 L23 20" stroke="#6b6455" stroke-width="1.2"/>
      <path d="M9 14 Q12 9 19 9" stroke="#a8a190" stroke-width="1.4" fill="none"/>
    </svg>`,
    mountain: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M2 29 L12 7 L18 16 L22 10 L30 29 Z" fill="#7d7565" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>
      <path d="M12 7 L15 12 L12.5 13.5 L10 11 Z" fill="#efe6d6" stroke="${INK}" stroke-width="0.9"/>
      <path d="M22 10 L24.5 15 L21.5 14 Z" fill="#efe6d6" stroke="${INK}" stroke-width="0.9"/>
      <path d="M13 18 L15 24 M20 18 L18 24" stroke="#635c4e" stroke-width="1.1"/>
    </svg>`,
    flower: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M16 20 Q15 26 12 29 M16 20 Q17 26 20 29" stroke="#55703c" stroke-width="1.4" fill="none"/>
      <g fill="#c94f3d" stroke="${INK}" stroke-width="0.9">
        <circle cx="16" cy="9" r="3"/><circle cx="11" cy="13" r="3"/><circle cx="21" cy="13" r="3"/>
        <circle cx="13" cy="18" r="3"/><circle cx="19" cy="18" r="3"/>
      </g>
      <circle cx="16" cy="14" r="2.6" fill="#e8c66a" stroke="${INK}" stroke-width="0.9"/>
    </svg>`,
    mushroom: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="13.5" y="17" width="5" height="9" rx="2" fill="#e6dac2" stroke="${INK}" stroke-width="1.1"/>
      <path d="M6 17 Q6 7 16 7 Q26 7 26 17 Z" fill="#a33327" stroke="${INK}" stroke-width="${S}"/>
      <circle cx="12" cy="12" r="1.6" fill="#efe6d6"/><circle cx="19" cy="10.5" r="1.3" fill="#efe6d6"/>
      <circle cx="21.5" cy="14" r="1.1" fill="#efe6d6"/>
    </svg>`,
    wheat: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <g stroke="#a98b3c" stroke-width="1.4" fill="none">
        <path d="M11 28 Q10 18 12 10 M16 29 Q16 18 16 8 M21 28 Q22 18 20 10"/>
      </g>
      <g fill="#d8b23a" stroke="${INK}" stroke-width="0.8">
        <ellipse cx="12" cy="9" rx="2.2" ry="4.4"/><ellipse cx="16" cy="7" rx="2.2" ry="4.6"/><ellipse cx="20" cy="9" rx="2.2" ry="4.4"/>
      </g>
      <path d="M10.5 7 l-2 -2 M13.5 6 l1.5 -2.5 M18.5 5 l-1.5 -2.5 M21.5 7 l2 -2" stroke="#a98b3c" stroke-width="1"/>
    </svg>`,
    log: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="4" y="14" width="22" height="9" rx="4.5" fill="#8a643e" stroke="${INK}" stroke-width="${S}"/>
      <ellipse cx="26" cy="18.5" rx="3.4" ry="4.5" fill="#c9a877" stroke="${INK}" stroke-width="1.1"/>
      <ellipse cx="26" cy="18.5" rx="1.6" ry="2.2" fill="none" stroke="#8a643e" stroke-width="1"/>
      <path d="M8 16.5 h10 M7 20.5 h8" stroke="#6e4f30" stroke-width="1"/>
      <rect x="7" y="9" width="16" height="7" rx="3.5" fill="#a3805f" stroke="${INK}" stroke-width="1.2"/>
      <ellipse cx="23" cy="12.5" rx="2.6" ry="3.4" fill="#e0c7a8" stroke="${INK}" stroke-width="1"/>
    </svg>`,
    stonepile: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M5 26 Q4 20 10 19 Q12 14 17 16 Q23 14 24 20 Q29 21 27 26 Z"
        fill="#8b8474" stroke="${INK}" stroke-width="${S}" stroke-linejoin="round"/>
      <path d="M11 26 Q10 21 15 21 Q20 20 21 26" fill="#a8a190" stroke="${INK}" stroke-width="1"/>
      <path d="M13 18 l3 1.4" stroke="#6b6455" stroke-width="1.1"/>
    </svg>`,
    chest: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="5" y="13" width="22" height="13" rx="2" fill="#8a643e" stroke="${INK}" stroke-width="${S}"/>
      <path d="M5 15 Q5 7 16 7 Q27 7 27 15 Z" fill="#a3805f" stroke="${INK}" stroke-width="${S}"/>
      <path d="M9 8.5 V13 M23 8.5 V13 M9 15 V26 M23 15 V26" stroke="#6e4f30" stroke-width="1.3"/>
      <rect x="13.5" y="13" width="5" height="7" rx="1" fill="#c9a227" stroke="${INK}" stroke-width="1.1"/>
      <circle cx="16" cy="16" r="1.1" fill="#6e4f30"/>
    </svg>`,
    portal: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M4 30 V14 Q4 3 16 3 Q28 3 28 14 V30" fill="none" stroke="#8b8474" stroke-width="4.4"/>
      <path d="M4 30 V14 Q4 3 16 3 Q28 3 28 14 V30" fill="none" stroke="${INK}" stroke-width="1"/>
      <path d="M8 30 V14 Q8 7 16 7 Q24 7 24 14 V30" fill="#2c3e50"/>
      <path d="M16 24 Q11 23 12 18 Q13 14 17 15 Q20 16 19 19 Q18 21 16 20"
        fill="none" stroke="#7ec8ff" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="10" cy="6" r="1" fill="#a8a190"/><circle cx="22" cy="6" r="1" fill="#a8a190"/>
    </svg>`,
    buildsite: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M4 28 h24" stroke="${INK}" stroke-width="2"/>
      <path d="M7 28 V10 M25 28 V10 M7 14 h18 M7 21 h18" stroke="#8a643e" stroke-width="2.2"/>
      <path d="M7 10 L25 10" stroke="#8a643e" stroke-width="2.2"/>
      <path d="M7 14 l6 7 M19 14 l6 7" stroke="#a3805f" stroke-width="1.4"/>
      <path d="M20 5 l4 3 -2 2.4 -4 -3 Z" fill="#8b8b93" stroke="${INK}" stroke-width="1"/>
      <path d="M22 8 l-7 6" stroke="#6e4f30" stroke-width="1.6"/>
    </svg>`,
    bones: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="14" cy="14" r="6.4" fill="#e6dac2" stroke="${INK}" stroke-width="1.2"/>
      <rect x="11" y="18" width="6" height="4.4" rx="1.5" fill="#e6dac2" stroke="${INK}" stroke-width="1"/>
      <circle cx="11.8" cy="13" r="1.7" fill="${INK}"/><circle cx="16.2" cy="13" r="1.7" fill="${INK}"/>
      <path d="M12.8 20 v2 M15.2 20 v2" stroke="${INK}" stroke-width="0.9"/>
      <path d="M20 24 L27 20 M20 20 L27 24" stroke="#d5c6a8" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,
    gem: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M10 12 L16 7 L22 12 L16 25 Z" fill="#7ec8ff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M10 12 L22 12 M16 7 L13 12 L16 25 M16 7 L19 12 L16 25" stroke="#4a90c2" stroke-width="0.9" fill="none"/>
      <path d="M12 10 l1.4 -1.2" stroke="#eaf6ff" stroke-width="1.4"/>
    </svg>`,
    fern: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M16 28 Q15 18 16 10" stroke="#4c5a2a" stroke-width="1.4" fill="none"/>
      <g stroke="#5c7a3f" stroke-width="1.2" fill="none">
        <path d="M16 12 Q11 11 9 7 M16 12 Q21 11 23 7 M16 17 Q10 16 8 12 M16 17 Q22 16 24 12 M16 22 Q11 22 9 18 M16 22 Q21 22 23 18"/>
      </g>
    </svg>`,
  };

  // ---------- image cache ----------
  const cache = {};
  function svgFor(key){
    return CREATURES[key] || TILE_SVGS[key] || OVERLAYS[key] || null;
  }
  function uri(key){
    const svg = svgFor(key);
    return svg ? 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))) : null;
  }
  function img(key){
    if (cache[key]) return cache[key];
    const u = uri(key);
    if (!u) return null;
    const im = new Image();
    im.src = u;
    cache[key] = im;
    return im;
  }
  function preload(){
    for (const k of Object.keys(CREATURES)) img(k);
    for (const k of Object.keys(TILE_SVGS)) img(k);
    for (const k of Object.keys(OVERLAYS)) img(k);
  }
  function has(key){ return !!svgFor(key); }

  // draw onto canvas; returns false if not ready (caller may fall back)
  function draw(ctx, key, px, py, size){
    const im = img(key);
    if (!im || !im.complete || !im.naturalWidth) return false;
    ctx.drawImage(im, px, py, size, size);
    return true;
  }

  // html img tag for DOM (HUD, dialogs, battle, cards)
  function html(key, size, cls){
    const u = uri(key);
    return u ? `<img src="${u}" width="${size}" height="${size}" class="${cls || ''}" alt="">` : '';
  }

  // ---------- illuminated title wordmark ----------
  function wordmark(){
    const serif = `Luminari, 'Palatino', 'Book Antiqua', Georgia, serif`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 240" role="img" aria-label="Le Cronache di Muraverde">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f0d886"/><stop offset="0.45" stop-color="#c9a227"/>
          <stop offset="0.55" stop-color="#a97f1a"/><stop offset="1" stop-color="#e3c563"/>
        </linearGradient>
        <linearGradient id="parch" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f2e6c4"/><stop offset="1" stop-color="#e2cf9f"/>
        </linearGradient>
      </defs>

      <!-- parchment cartouche -->
      <rect x="8" y="8" width="504" height="224" rx="10" fill="url(#parch)" stroke="#5c4030" stroke-width="3"/>
      <rect x="16" y="16" width="488" height="208" rx="6" fill="none" stroke="#8a643e" stroke-width="1.4"/>
      <!-- corner quatrefoils -->
      <g fill="#a33327" stroke="#5c4030" stroke-width="1">
        ${[[24,24],[496,24],[24,216],[496,216]].map(([x,y]) =>
          `<g transform="translate(${x} ${y})">
            <circle cx="0" cy="-4.6" r="3.4"/><circle cx="0" cy="4.6" r="3.4"/>
            <circle cx="-4.6" cy="0" r="3.4"/><circle cx="4.6" cy="0" r="3.4"/>
            <circle cx="0" cy="0" r="2.4" fill="#c9a227"/>
          </g>`).join('')}
      </g>

      <!-- illuminated initial M -->
      <g transform="translate(40 62)">
        <rect x="0" y="0" width="110" height="116" rx="6" fill="#27415c" stroke="#5c4030" stroke-width="2.4"/>
        <rect x="5" y="5" width="100" height="106" rx="4" fill="none" stroke="url(#gold)" stroke-width="2"/>
        <!-- filigree vines -->
        <g stroke="#7ea0c2" stroke-width="1.3" fill="none" opacity="0.9">
          <path d="M12 100 Q8 78 16 66 Q10 52 18 40 Q12 26 22 16"/>
          <path d="M98 100 Q102 78 94 66 Q100 52 92 40 Q98 26 88 16"/>
          <circle cx="16" cy="66" r="2"/><circle cx="94" cy="66" r="2"/>
          <circle cx="18" cy="40" r="2"/><circle cx="92" cy="40" r="2"/>
        </g>
        <text x="55" y="88" text-anchor="middle" font-family="${serif}" font-size="82" font-weight="bold"
          fill="url(#gold)" stroke="#5c4030" stroke-width="1.6">M</text>
        <!-- red pen flourishes -->
        <path d="M14 108 Q55 100 96 108" stroke="#a33327" stroke-width="1.3" fill="none"/>
      </g>

      <!-- lettering -->
      <text x="330" y="88" text-anchor="middle" font-family="${serif}" font-size="30"
        fill="#5c4030" letter-spacing="4" style="font-variant:small-caps">Le Cronache di</text>
      <text x="163" y="152" text-anchor="start" font-family="${serif}" font-size="56" font-weight="bold"
        fill="#7a2318" stroke="#33241a" stroke-width="0.8" letter-spacing="2"
        style="font-variant:small-caps">uraverde</text>

      <!-- vine flourish divider -->
      <g transform="translate(325 190)" stroke="#55703c" stroke-width="1.8" fill="none">
        <path d="M-150 0 Q-75 -12 0 0 Q75 12 150 0"/>
        <path d="M-150 0 q-8 -8 -16 -4 M150 0 q8 8 16 4"/>
      </g>
      <g fill="#55703c">
        <circle cx="250" cy="184" r="3"/><circle cx="400" cy="196" r="3"/>
      </g>
      <path d="M325 182 l6 8 -6 8 -6 -8 Z" fill="#c9a227" stroke="#5c4030" stroke-width="0.9"/>

      <!-- rubric -->
      <text x="325" y="216" text-anchor="middle" font-family="${serif}" font-size="14"
        fill="#a33327" letter-spacing="3" style="font-variant:small-caps">✠ liber italicae linguae ✠</text>
    </svg>`;
  }

  return { draw, html, has, preload, uri, wordmark };
})();

Sprites.preload();
