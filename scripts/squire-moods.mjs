// Gives every chapter of The Squire its atmosphere.
//
// Set by hand, from reading how each chapter opens and where it ends up.
// An earlier version of this script scored paragraphs for battle and warmth
// words and let the winner pick the mood. It was discarded: words like fire,
// held and arms turn up as often in a beating as in an embrace, so the page
// lurched between moods in a way that had nothing to do with the story.
//
// Each chapter therefore names the mood it opens in and, where the chapter
// genuinely turns, the mood it lands in. The change is made across the last
// stretch of the chapter so it arrives with the prose rather than snapping.
//
//   node scripts/squire-moods.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/data/the-squire.json';
const story = JSON.parse(readFileSync(FILE, 'utf8'));

// open  : where the chapter begins
// turn  : the mood it moves into, if it moves at all
// at    : how far through the chapter the turn happens, 0 to 1
const ARC = {
  1:  { open: 'dread',  turn: 'wonder', at: 0.30, back: 'dread' },  // the road, the Gate rising, the dread returning
  2:  { open: 'dread',  turn: 'hearth', at: 0.72 },                 // the woman they fear, and unexpected laughter
  3:  { open: 'dread',  turn: 'abyss',  at: 0.86 },                 // no safe hour, then darkness took everything
  4:  { open: 'dread' },                                            // waking in blood, the ritual of the morning
  5:  { open: 'dread' },                                            // the wound, the rain, the assassins
  6:  { open: 'hearth', turn: 'dread',  at: 0.22 },                 // a dream of home, then what monsters look like
  7:  { open: 'wrath',  turn: 'abyss',  at: 0.80 },                 // victory and burning, then darkness took me
  8:  { open: 'dread' },                                            // pain becoming predictable
  9:  { open: 'frost',  turn: 'dread',  at: 0.70 },                 // the needle, the quiet mercy, the fear beneath
  10: { open: 'hearth', turn: 'dread',  at: 0.35 },                 // a letter from home, and what follows it
  11: { open: 'dread',  turn: 'wrath',  at: 0.45 },                 // the duel of claim
  12: { open: 'dread',  turn: 'abyss',  at: 0.75 },                 // the embrace, and what it costs
  13: { open: 'dread',  turn: 'hearth', at: 0.55 },                 // a place at the edge, and choosing to follow
  14: { open: 'wrath',  turn: 'abyss',  at: 0.88 },                 // the siege, and being alive barely
  15: { open: 'abyss' },                                            // the relics of the dead
};

let total = 0;
const tally = {};

for (const ch of story.chapters) {
  const arc = ARC[ch.n] || { open: 'dread' };
  const n = ch.paras.length;
  const zones = [];

  if (!arc.turn) {
    zones.push({ mood: arc.open, start: 0, end: n - 1 });
  } else {
    const at = Math.max(1, Math.min(n - 1, Math.round(n * arc.at)));
    zones.push({ mood: arc.open, start: 0, end: at - 1 });
    if (arc.back) {
      // a passage that lifts and then settles again, as in chapter one
      const backAt = Math.min(n - 1, at + Math.max(6, Math.round(n * 0.18)));
      zones.push({ mood: arc.turn, start: at, end: backAt - 1 });
      zones.push({ mood: arc.back, start: backAt, end: n - 1 });
    } else {
      zones.push({ mood: arc.turn, start: at, end: n - 1 });
    }
  }

  ch.mood = arc.open;
  ch.zones = zones;
  total += zones.length;
  for (const z of zones) tally[z.mood] = (tally[z.mood] || 0) + (z.end - z.start + 1);
}

// every paragraph must sit inside exactly one zone
for (const ch of story.chapters) {
  let expect = 0;
  for (const z of ch.zones) {
    if (z.start !== expect) throw new Error(`chapter ${ch.n}: gap at ${z.start}`);
    if (z.end < z.start) throw new Error(`chapter ${ch.n}: empty zone`);
    expect = z.end + 1;
  }
  if (expect !== ch.paras.length) throw new Error(`chapter ${ch.n}: covers ${expect} of ${ch.paras.length}`);
}

writeFileSync(FILE, JSON.stringify(story), 'utf8');

console.log(`${total} zones across ${story.chapters.length} chapters, every paragraph covered\n`);
for (const ch of story.chapters) {
  console.log(`  ${ch.numeral.padStart(4)}  ${ch.title.slice(0, 26).padEnd(28)}` +
    ch.zones.map((z) => `${z.mood}(${z.end - z.start + 1})`).join(' → '));
}
const all = Object.values(tally).reduce((a, b) => a + b, 0);
console.log('\nshare of the story in each mood:');
for (const [m, c] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${m.padEnd(8)} ${String(Math.round((c / all) * 100)).padStart(3)}%`);
}
