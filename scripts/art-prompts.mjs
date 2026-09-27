// Writes docs/card-art-prompts.md - one image prompt per card that still
// needs art, plus the ones worth redoing at a usable size.
//
// Run: node scripts/art-prompts.mjs
//
// It is generated rather than hand-written so it stays true as the set
// changes: add a card, run this, and its prompt is in the document.

import { writeFileSync } from 'node:fs';
import { CARDS, TIERS, artOf, numberOf } from '../src/data/cards.js';

// ── Lash's own words, copied out of the lore database on his Desktop, so a
//    creature he has already described is described to the image model in the
//    way he wrote it rather than the way I would guess it.
const APPEARANCE = {
  'Leviathan': 'A mountain-sized serpentine whale with bioluminescent scars and jaws that bloom like a flower of death.',
  'Barlgowrath': 'Towering, armoured demon with molten cracks in obsidian skin and a crown of bone. Eyes glow like dying stars.',
  'Bhahamut': 'A massive lion-shaped behemoth with heads emerging from its shoulders - serpent, wolf and hawk.',
  'Wraith Knight': 'A skeletal figure in cracked ceremonial armour, wielding a blade of translucent grief.',
  'Stormspear': 'Avian humanoid with silver feathers and cloud-wrapped wings. Carries a staff etched with lightning runes.',
  'Goulargz': 'Massive, tusked humanoid with bone armour fused to its flesh, low-frequency growls unnerving everything near it.',
  'Fallen Lycaron': 'A winged, emaciated wolf-beast with crimson eyes and exposed bone joints. Its wings resemble torn shadows.',
  'Mercaptain': 'Scaled humanoid with a trident crown and a mantle of jellyfish silk.',
  'Mersoldier': 'Pale blue humanoid with webbed limbs, barnacled armour, and gills pulsing on the neck.',
  'Imptizzle': 'A palm-sized, chattering creature with bat wings, glowing yellow teeth, and a forked tongue too large for its mouth.',
  'Garudling': 'Fist-sized feathery raptor with too-bright eyes and sparks flickering off its beak.',
  'Ghoul': 'Pale, skin-stripped humanoid with elongated arms, jagged teeth, and no visible eyes.',
  'Norgod Reaver': 'Dwarf-like in build but colossal in size. Stone-blooded and iron-veined.',
  'Norgod Jarl': 'Dwarf-like in build but colossal in size. Stone-blooded and iron-veined.',
  'Norgod Oarsman': 'Dwarf-like in build but colossal in size. Stone-blooded and iron-veined.',
  'Oinstan Stonewright': 'Tall, thick-skinned humanoid with tusks, a wide jaw, and beast-shaped war paint.',
  'Oinstan Mason': 'Tall, thick-skinned humanoid with tusks, a wide jaw, and beast-shaped war paint.',
  'Exodan Wanderer': 'Marked by unnatural eyes, a strange aura, and half-manifested power showing at the edges.',
  'Exodan Scout': 'Marked by unnatural eyes, a strange aura, and half-manifested power showing at the edges.',
  'Kalbeliya Seer': 'Brightly robed, flame-eyed, skin tattooed with protective and storytelling sigils.',
  'Kalbeliya Dancer': 'Brightly robed, flame-eyed, skin tattooed with protective and storytelling sigils.',
  'Kalbeliya Outrider': 'Brightly robed, flame-eyed, skin tattooed with protective and storytelling sigils.',
};

// ── Where each allegiance stands. A card with no setting behind it is the
//    single most common way these portraits go wrong.
const SETTING = [
  ['Red Rangers',       'a deep green forest of enormous trees, crimson banners hanging between them, the light coming down in shafts'],
  ['Icetear',           'a hall of pale blue ice, frost blooming across carved stone, cold winter light'],
  ['Elu-Dragar',        'storm-wracked mountain peaks above the cloud line, dragons circling in the far distance'],
  ['Elu-Chandra',       'a moonlit shore, silver water, a huge low moon behind'],
  ['Elu-Hsal',          'grey ghost-light over broken funerary stones, thin mist at knee height'],
  ['Elu Primus',        'an ancient elven grove, white bark and gold leaf, warm filtered light'],
  ['Nyxthorn',          'a dark wood at night, violet light caught in the leaves'],
  ['Whitegrove',        'a white-barked sanctuary forest, golden afternoon light'],
  ['Elu-Dues',          'a sunlit elven citadel of pale stone and blue banners'],
  ['Gods Blood',        'Heaven’s Throat: a mountain empire carved in gold, colossal golden statues standing along the walls'],
  ['Humanity',          'the fortified stone kingdom of Adamas, watchfires burning on the walls'],
  ['Sinodess',          'the deck of a ship at sea, rigging and salt spray, a hard bright sky'],
  ['Undead',            'catacombs lit by low green flame, bone stacked in the arches'],
  ['Demon',             'the Abyssal Realm: black rock, distant fire, a sky like a bruise'],
  ['Devil',             'the Abyssal Realm: black rock, distant fire, a sky like a bruise'],
  ['Divine',            'Avalonus: radiant cloud and white gold architecture, unbearable light behind'],
  ['Angel',             'Avalonus: radiant cloud and white gold architecture, unbearable light behind'],
  ['Knight Sisterhood', 'a moonlit cloister of pale stone, the moon framed in an arch'],
  ['Inquisition',       'a candlelit stone chamber hung with chains and writ'],
  ['Slayers',           'a cold hillside beside the carcass of something enormous'],
  ['Five Tribes',       'a night camp in the heat of Lokharron, firelight, painted wagons'],
  ['Norgods',           'a freezing northern cliff above a grey sea'],
  ['Oinstans',          'a vast stone quarry under a hard white sky'],
  ['Exodas',            'the Shattered Lowlands: broken farmland and ruined walls to the horizon'],
  ['Orc',               'a raided camp at dusk, smoke rising behind'],
  ['Archmagi',          'a high tower room of instruments and drifting light'],
  ['Witch',             'a black wood under a huge moon, candles burning in the branches'],
  ['Sea',               'deep green water, shafts of light coming down from far above'],
  ['Beast',             'the Verdant Wilds: dense jungle, enormous ferns, heavy wet air'],
  ['Dragon',            'the High Dragon Mountains, peaks piercing the cloud'],
  ['Knight',            'the walls of a great citadel, banners snapping in the wind'],
  ['Lionheart',         'a gold and crimson throne hall'],
  ['Corrupted',         'the Abyssal Breach: a wound in the world, reality unstable around it'],
];
const settingFor = (card) => {
  for (const [tag, place] of SETTING) if ((card.tags || []).includes(tag)) return place;
  if (/Elf/.test(card.line || '')) return 'an ancient elven grove, white bark and gold leaf';
  if (/Human/.test(card.line || '')) return 'the fortified stone kingdom of Adamas';
  return 'a wild landscape of the world of Icetear, weather closing in';
};

const slug = (name) => name.toLowerCase()
  .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// How much presence a card should have, by rarity. Keyed on the tier id, not
// the display name, so renaming a rarity never silently changes the prompts.
const GRANDEUR = {
  tier_1: 'an ordinary soldier of their people, plain gear, no grandeur',
  tier_2: 'an ordinary soldier of their people, plain gear, no grandeur',
  tier_3: 'someone of rank and note, but not a legend',
  tier_4: 'someone of real standing, better armed and better dressed than most',
  tier_5: 'unmistakably one of the great powers of the world, the composition built around them',
  tier_6: 'unmistakably one of the great powers of the world, the composition built around them',
};

// A character is a portrait, a spell is a moment. They want different prompts.
function promptFor(card) {
  const rarity = TIERS[card.tier].name;
  if (card.type === 'spell') {
    return `A moment, not a portrait: ${card.name}. ${card.text} `
      + `Set in ${settingFor(card)}. No lettering anywhere in the image. `
      + `Leave the top fifth and the bottom quarter uncluttered.`;
  }
  const look = APPEARANCE[card.name];
  const who = `${card.name}, ${/^[AEIOU]/.test(card.line) ? 'an' : 'a'} ${card.line}`;
  return `Waist-up portrait of ${who}. `
    + (look ? `${look} ` : '')
    + `Standing in ${settingFor(card)}. `
    + `${rarity} rarity: ${GRANDEUR[card.tier]}.`;
}

// ── the document ────────────────────────────────────────────────────────────
const L = [];
const w = (...s) => L.push(...s);

w('# Card art prompts');
w('');
w('Generated by `scripts/art-prompts.mjs`. Re-run it after changing the set.');
w('');
w('## How to use this');
w('');
w('**Paste section 1 as your first message in a ChatGPT conversation.** It sets');
w('the house style. Then paste one card prompt per message. Keep using the same');
w('conversation so the cards come out looking like they belong together - start a');
w('new one and the style drifts.');
w('');
w('Save each result into `public/images/cards/` under the filename given, then');
w('tell me and I will wire it up.');
w('');
w('The First Family portraits and the eleven undersized ones have been');
w('replaced already, so what is left below is the art that has never existed.');
w('');
w('---');
w('');
w('## 1. The house style - paste this first');
w('');
w('```');
w('For this whole conversation you are making character art for a dark fantasy');
w('trading card game called Blood of Icetear. Every image must follow these rules');
w('without being reminded.');
w('');
w('FORMAT');
w('- 2:3 portrait, 1024 x 1536 or larger. Never square. Never landscape.');
w('');
w('COMPOSITION - the card frame covers parts of the image, so:');
w('- Put the face in the upper-middle third. NEVER at the very top edge.');
w('- Leave clear headroom above any crown, helm, horns or halo.');
w('- Put nothing that matters in the bottom quarter. It will be covered.');
w('- Waist-up or chest-up. No full-body-at-a-distance shots.');
w('- Keep hands, weapons and wings inside the frame, away from the left and');
w('  right edges.');
w('');
w('STYLE');
w('- Painted, not photographic. Oil and digital painting, visible brushwork.');
w('- Dark, rich, low-key colour. One strong light source.');
w('- Never a plain white, grey or empty studio background. Every character');
w('  stands somewhere real, with depth and atmosphere behind them.');
w('- Period-accurate: armour, cloth, leather, fur. No modern clothing, no');
w('  modern hair, no studio portrait lighting.');
w('- It must read instantly at thumbnail size: clear silhouette, strong shape.');
w('');
w('NEVER');
w('- No text, letters, numbers, signatures, watermarks or borders.');
w('- No card frame, no UI, no nameplate. Art only, edge to edge.');
w('');
w('Reply "ready" and I will send the first character.');
w('```');
w('');
w('---');
w('');

// ── 4. everything still unpainted, in the order it matters ──────────────────
const unpainted = CARDS.filter((c) => !artOf(c) && !(c.tags || []).includes('Token'));
const ORDER = ['tier_6', 'tier_5', 'tier_4', 'tier_3', 'tier_2', 'tier_1'];
unpainted.sort((a, b) => ORDER.indexOf(a.tier) - ORDER.indexOf(b.tier) || a.name.localeCompare(b.name));

w(`## 2. The ${unpainted.length} cards with no art yet`);
w('');
w('In order of how much it matters - the rarest cards are the ones people look');
w('at. If you only do some, do them from the top.');
w('');
let lastTier = null;
for (const card of unpainted) {
  if (card.tier !== lastTier) {
    lastTier = card.tier;
    const n = unpainted.filter((c) => c.tier === lastTier).length;
    w('');
    w(`### ${TIERS[lastTier].name} (${n})`);
    w('');
  }
  w(`**${card.name}** - \`${numberOf(card)}\` - save as \`public/images/cards/${slug(card.name)}.webp\``);
  w('');
  w('```');
  w(promptFor(card));
  w('```');
  w('');
}

w('---');
w('');
w('## 3. The tokens');
w('');
w('Tokens are summoned rather than drawn, so they are seen constantly. They can');
w('share art with their parent card or get something simple and generic.');
w('');
for (const card of CARDS.filter((c) => (c.tags || []).includes('Token'))) {
  w(`- **${card.name}** - \`public/images/cards/${slug(card.name)}.webp\` - ${promptFor(card)}`);
}
w('');

writeFileSync(new URL('../docs/card-art-prompts.md', import.meta.url), L.join('\n'), 'utf8');
console.log(`docs/card-art-prompts.md written`);
console.log(`  ${unpainted.length} cards still needing art, ${CARDS.filter((c) => (c.tags || []).includes('Token')).length} of them tokens`);
