// achievements.js — achievement definitions. `check(ctx)` receives
// { save, level(skill), totalLevel(), combatLevel() } and returns true when earned.

import { SKILLS } from './skills.js';

export const ACHIEVEMENTS = [];
const add = a => ACHIEVEMENTS.push(a);

// --- study ---
add({ id: 'first_answer', name: 'Prima Parola', icon: '📝', desc: 'Answer your first question.', check: c => c.save.answered >= 1 });
add({ id: 'answers_100', name: 'Century of Study', icon: '📖', desc: 'Answer 100 questions.', check: c => c.save.answered >= 100 });
add({ id: 'answers_1000', name: 'Scholar of Borgosereno', icon: '🎓', desc: 'Answer 1,000 questions.', check: c => c.save.answered >= 1000 });
add({ id: 'streak_10', name: 'On a Roll', icon: '🔥', desc: 'Reach a 10-answer streak.', check: c => c.save.bestStreak >= 10 });
add({ id: 'streak_25', name: 'Unstoppable', icon: '🌟', desc: 'Reach a 25-answer streak.', check: c => c.save.bestStreak >= 25 });
add({ id: 'streak_50', name: 'Bella Figura', icon: '🏵️', desc: 'Reach a 50-answer streak.', check: c => c.save.bestStreak >= 50 });
add({ id: 'library_25', name: 'Bookworm', icon: '🐛', desc: 'Clear 25 due reviews in the Library.', check: c => (c.save.libraryCleared || 0) >= 25 });
add({ id: 'library_250', name: 'Head Librarian', icon: '🦉', desc: 'Clear 250 due reviews in the Library.', check: c => (c.save.libraryCleared || 0) >= 250 });

// --- levels ---
for (const s of SKILLS) {
  add({ id: `lvl25_${s.id}`, name: `${s.name} Apprentice`, icon: s.icon, desc: `Reach level 25 ${s.name}.`, check: c => c.level(s.id) >= 25 });
  add({ id: `lvl50_${s.id}`, name: `${s.name} Journeyman`, icon: s.icon, desc: `Reach level 50 ${s.name}.`, check: c => c.level(s.id) >= 50 });
  add({ id: `lvl99_${s.id}`, name: `${s.name} Grandmaster`, icon: '🎖️', desc: `Reach level 99 ${s.name}.`, check: c => c.level(s.id) >= 99 });
}
add({ id: 'total_250', name: 'Well Rounded', icon: '📐', desc: 'Reach total level 250.', check: c => c.totalLevel() >= 250 });
add({ id: 'total_500', name: 'Renaissance Soul', icon: '🗿', desc: 'Reach total level 500.', check: c => c.totalLevel() >= 500 });

// --- combat ---
add({ id: 'first_kill', name: 'First Blood', icon: '🗡️', desc: 'Defeat any enemy.', check: c => Object.values(c.save.kills).some(n => n > 0) });
add({ id: 'kills_100', name: 'Veteran', icon: '⚔️', desc: 'Defeat 100 enemies.', check: c => Object.values(c.save.kills).reduce((a, b) => a + b, 0) >= 100 });
add({ id: 'wyrm_slayer', name: 'Wyrm Slayer', icon: '🐉', desc: 'Defeat an Elder Wyrm.', check: c => (c.save.kills.elder_wyrm || 0) >= 1 });
add({ id: 'cb_40', name: 'Force to Reckon With', icon: '💥', desc: 'Reach combat level 40.', check: c => c.combatLevel() >= 40 });

// --- chests ---
add({ id: 'first_chest', name: 'Lockpicker', icon: '🧰', desc: 'Open any chest.', check: c => Object.keys(c.save.chests).length >= 1 });
add({ id: 'all_chests', name: 'Master of Caches', icon: '👑', desc: 'Open all six chests at least once.', check: c => Object.keys(c.save.chests).length >= 6 });
add({ id: 'perfect_chest', name: 'Flawless Heist', icon: '💯', desc: 'Open a chest with a perfect answer run.', check: c => (c.save.perfectChests || 0) >= 1 });

// --- home ---
add({ id: 'first_room', name: 'Homesteader', icon: '🏠', desc: 'Build your first room.', check: c => Object.values(c.save.home).some(t => t >= 1) });
add({ id: 'all_rooms', name: 'Lord of the Manor', icon: '🏰', desc: 'Build all six rooms.', check: c => Object.values(c.save.home).filter(t => t >= 1).length >= 6 });
add({ id: 'max_home', name: 'Architect Supreme', icon: '📐', desc: 'Fully upgrade every room.', check: c => Object.values(c.save.home).filter(t => t >= 3).length >= 6 });

// --- farming ---
add({ id: 'first_harvest', name: 'Green Thumb', icon: '🌱', desc: 'Harvest your first crop.', check: c => (c.save.harvests || 0) >= 1 });
add({ id: 'harvests_50', name: 'Steward of the Soil', icon: '🌾', desc: 'Bring in 50 harvests.', check: c => (c.save.harvests || 0) >= 50 });
add({ id: 'starbloom_grown', name: 'Under Clear Skies', icon: '🌸', desc: 'Grow a starbloom.', check: c => !!c.save.log.starbloom });

// --- expansion ---
add({ id: 'satchel_owner', name: 'Pack Mule', icon: '👝', desc: 'Own any satchel.', check: c => ['leather_satchel', 'hunters_satchel', 'borsa_viaggiatore'].some(id => c.save.log[id]) });
add({ id: 'contracts_10', name: 'Guild Regular', icon: '📜', desc: 'Complete 10 daily contracts.', check: c => (c.save.contractsDone || 0) >= 10 });
add({ id: 'matriarch', name: 'Regina del Vulcano', icon: '🌋', desc: 'Defeat the Wyrm Matriarch.', check: c => (c.save.kills.wyrm_matriarch || 0) >= 1 });
add({ id: 'ring_amulet', name: 'Fully Accessorised', icon: '💍', desc: 'Wear a ring and an amulet at once.', check: c => !!c.save.equip.ring && !!c.save.equip.amulet });

// --- riches & rares ---
add({ id: 'coins_10k', name: 'Comfortable', icon: '🪙', desc: 'Hold 10,000 coins at once (inventory + bank).', check: c => ((c.save.inv.coins || 0) + (c.save.bankVault.coins || 0)) >= 10000 });
add({ id: 'maschera_veneziana', name: 'Il Carnevale', icon: '🎭', desc: 'Obtain the Maschera veneziana.', check: c => !!c.save.log.maschera_veneziana });
add({ id: 'all_rares', name: 'Cabinet of Curiosities', icon: '🗄️', desc: 'Collect all four trophy rares.', check: c => ['moka', 'vespa', 'divina_commedia', 'maschera_veneziana'].every(r => c.save.log[r]) });

export const ACH = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
