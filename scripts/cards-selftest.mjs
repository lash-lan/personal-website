// Checks the card set against docs/card-standards.md.
//
// Run: node scripts/cards-selftest.mjs
//
// This exists because the standards are only worth writing down if something
// enforces them. Every rule in the document is a test here.

import { existsSync } from 'node:fs';
import { CARDS, TIERS, TIER_ORDER, KEYWORDS, MUSTER_CEILING, costOf, artOf, COLLECTIBLE } from '../src/data/cards.js';

let fails = 0;
const fail = (msg) => { fails += 1; console.log(`  FAIL  ${msg}`); };
const section = (t) => console.log(`\n${t}`);

// ── ids are unique ──────────────────────────────────────────────────────────
section('Identity');
const seen = new Set();
for (const k of CARDS) {
  if (seen.has(k.id)) fail(`duplicate id ${k.id}`);
  seen.add(k.id);
  if (!k.name) fail(`${k.id} has no name`);
}
const names = CARDS.map((k) => k.name);
for (const n of new Set(names)) {
  if (names.filter((x) => x === n).length > 1) fail(`two cards named "${n}"`);
}
console.log(`  ${CARDS.length} cards, ${seen.size} distinct ids`);

// ── every card sits inside its rarity's power band ───────────────────────────
section('Power bands');
for (const k of CARDS) {
  if (!TIERS[k.tier]) { fail(`${k.name} has unknown tier ${k.tier}`); continue; }
  if (k.type !== 'character') continue;
  const [lo, hi] = TIERS[k.tier].power;
  if (k.power < lo || k.power > hi) {
    fail(`${k.name} is ${TIERS[k.tier].name} with ${k.power} Power, outside ${lo}–${hi}`);
  }
}
for (const t of TIER_ORDER) {
  const n = CARDS.filter((k) => k.tier === t).length;
  console.log(`  ${TIERS[t].name.padEnd(10)} ${String(n).padStart(3)} cards`);
}

// ── cost follows from power ─────────────────────────────────────────────────
section('Cost');
for (const k of CARDS) {
  if (k.cost > MUSTER_CEILING) {
    fail(`${k.name} costs ${k.cost}, above the Muster ceiling of ${MUSTER_CEILING} — unplayable`);
  }
}
for (const k of CARDS.filter((k) => k.type === 'character')) {
  const bare = costOf(k.power);
  if (k.cost < bare || k.cost > bare + 2) {
    fail(`${k.name}: ${k.power} Power should cost ${bare} to ${bare + 2}, prints ${k.cost}`);
  }
  if (k.text === null && k.cost !== bare) {
    fail(`${k.name} has no ability but pays ${k.cost} instead of ${bare}`);
  }
}
// A plain fighter must never be strictly better than another card of the same
// cost that also has an ability.
for (const k of CARDS.filter((k) => k.type === 'character' && !k.text)) {
  for (const o of CARDS.filter((o) => o.type === 'character' && o.text && o.cost === k.cost)) {
    if (k.power > o.power + 2) {
      fail(`${k.name} (${k.power} Power, no ability) outclasses ${o.name} (${o.power}) at the same cost`);
    }
  }
}

// ── only the closed keyword list appears ────────────────────────────────────
section('Keywords');
const known = Object.keys(KEYWORDS);
// A keyword claim looks like a short sentence in which every word is
// capitalised, e.g. "Quick Attack." A phrase that names a card, a lineage or a
// faction is a proper noun, not a keyword, so those words are allowed through.
const proper = new Set(
  CARDS.flatMap((k) => [k.name, k.line || '', ...(k.tags || [])].join(' ').split(/[^A-Za-z]+/))
);
const strays = new Set();
for (const k of CARDS) {
  if (!k.text) continue;
  for (const [, phrase] of k.text.matchAll(/(?:^|\. )([A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*){0,2})\./g)) {
    const words = phrase.trim().split(' ');
    if (known.includes(phrase.trim())) continue;
    if (words.some((w) => proper.has(w))) continue;   // a name, not a keyword
    strays.add(`${phrase.trim()}  (on ${k.name})`);
  }
}
if (strays.size) for (const t of strays) fail(`unlisted keyword: ${t}`);
console.log(`  ${known.length} keywords: ${known.join(', ')}`);
// The World Titans are not cards. The Law of Divine Distance forbids them
// intervening in mortal affairs and permits only Avatars, so an Avatar may be
// a card and the god behind it may not. This is checked rather than trusted,
// because a Titan is exactly the sort of card that creeps back in.
for (const k of CARDS) {
  if (k.line === 'World Titan') {
    fail(`${k.name} is a World Titan; the Law of Divine Distance keeps them out of the arena`);
  }
}

// ── art points at files that exist ──────────────────────────────────────────
section('Art');
let painted = 0;
for (const k of CARDS) {
  const path = artOf(k);
  if (!path) continue;
  painted += 1;
  if (!existsSync(new URL(`../public${path}`, import.meta.url))) {
    fail(`${k.name} points at ${path}, which is not there`);
  }
}
console.log(`  ${painted} of ${CARDS.length} cards have art (${CARDS.length - painted} still to paint)`);

// ── a legal 50-card deck is actually buildable ──────────────────────────────
section('Deck legality');
const chars = COLLECTIBLE.filter((k) => k.type === 'character');
const spells = COLLECTIBLE.filter((k) => k.type === 'spell');
console.log(`  ${chars.length} collectible characters, ${spells.length} spells`);
if (chars.length < 30) fail('fewer than 30 characters exist, so no legal deck can be built');
if (spells.length < 8) fail('fewer than 8 spells exist, so no legal deck can be built');
// Counting copies: the pool must be able to fill 50 slots without a Mythical.
const slots = COLLECTIBLE
  .filter((k) => k.tier !== 'tier_6')
  .reduce((n, k) => n + TIERS[k.tier].copies, 0);
if (slots < 50) fail(`only ${slots} non-Mythical card slots exist; 50 are needed`);
console.log(`  ${slots} legal slots available below Mythical`);

// ── the curve is playable: enough cheap cards to have a first turn ──────────
section('Curve');
const byCost = {};
for (const k of COLLECTIBLE) byCost[k.cost] = (byCost[k.cost] || 0) + 1;
for (const cost of Object.keys(byCost).map(Number).sort((a, b) => a - b)) {
  console.log(`  ${String(cost).padStart(2)} Muster  ${'█'.repeat(byCost[cost])} ${byCost[cost]}`);
}
const cheap = COLLECTIBLE.filter((k) => k.cost <= 2).length;
if (cheap < 8) fail(`only ${cheap} cards cost 2 or less; the first two turns would be dead`);

// ── every faction has something to build around ─────────────────────────────
section('Factions');
const tally = {};
for (const k of CARDS) for (const t of k.tags || []) tally[t] = (tally[t] || 0) + 1;
const big = Object.entries(tally).filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]);
for (const [t, n] of big) console.log(`  ${t.padEnd(20)} ${n}`);

console.log(fails === 0 ? '\nAll checks passed.' : `\n${fails} check(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
