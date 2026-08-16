// skills.js — skill registry. Order matters for the skills screen.
export const SKILLS = [
  { id: 'attack',       name: 'Attack',       icon: '⚔️', group: 'combat',  blurb: 'Accuracy with melee weapons.' },
  { id: 'strength',     name: 'Strength',     icon: '💪', group: 'combat',  blurb: 'Melee damage.' },
  { id: 'defence',      name: 'Defence',      icon: '🛡️', group: 'combat',  blurb: 'Reduces damage taken.' },
  { id: 'ranged',       name: 'Ranged',       icon: '🏹', group: 'combat',  blurb: 'Accuracy and damage with bows.' },
  { id: 'hitpoints',    name: 'Hitpoints',    icon: '❤️', group: 'combat',  blurb: 'Your life total.' },
  { id: 'mining',       name: 'Mining',       icon: '⛏️', group: 'gather',  blurb: 'Extract ore, stone and gems.' },
  { id: 'woodcutting',  name: 'Woodcutting',  icon: '🪓', group: 'gather',  blurb: 'Fell trees for logs.' },
  { id: 'farming',      name: 'Farming',      icon: '🌱', group: 'gather',  blurb: 'Grow crops, herbs and food. Every skill feeds the farm.' },
  { id: 'smithing',     name: 'Smithing',     icon: '⚒️', group: 'artisan', blurb: 'Smelt bars, forge gear and tools.' },
  { id: 'fletching',    name: 'Fletching',    icon: '🎯', group: 'artisan', blurb: 'Carve bows and fletch arrows.' },
  { id: 'crafting',     name: 'Crafting',     icon: '🧵', group: 'artisan', blurb: 'Leatherwork, bowstrings, gems, jewellery.' },
  { id: 'construction', name: 'Construction', icon: '🏠', group: 'artisan', blurb: 'Build and upgrade your home.' },
];

export const SKILL = Object.fromEntries(SKILLS.map(s => [s.id, s]));
export const COMBAT_SKILLS = ['attack', 'strength', 'defence', 'ranged', 'hitpoints'];
