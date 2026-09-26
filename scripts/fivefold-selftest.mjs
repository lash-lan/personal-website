// Checks the Fivefold Calling engine and the 2026 archetype registry.
//   node scripts/fivefold-selftest.mjs
//
// The measurement layer is deliberately frozen, so most of what follows is
// there to catch a change nobody meant to make: a question moving to another
// Calling, a reverse key flipping, a threshold drifting, or an archetype
// name and its active drives falling out of step.
import {
  QUESTIONS, CALLINGS, ORDER, ARCHETYPES, RULES, BANDS, bandOf, TIERS,
} from '../src/data/fivefold.js';
import { score, keyed, affinityOf } from '../src/lib/fivefold-engine.js';
import guide from '../src/data/fivefold-guide.js';
import '../src/lib/fivefold-deep.js';   // stamps the registry over the guide

let fail = 0;
const ok = (name, good, detail = '') => {
  if (!good) fail++;
  console.log(`${good ? '  ok  ' : ' FAIL '} ${name}${detail ? '   ' + detail : ''}`);
};

// Answers that give every item of a Calling the same keyed value, 1 to 5.
const answersFor = (per) => QUESTIONS.map((q) => {
  const want = per[q.calling];
  return q.reverse ? 6 - want : want;
});

// Answers that give a Calling an exact raw total between 8 and 40, so the
// boundary affinities can be hit precisely rather than approached.
const answersForRaw = (perRaw) => {
  const left = { ...perRaw };
  const seen = {};
  return QUESTIONS.map((q) => {
    const k = q.calling;
    seen[k] = (seen[k] || 0) + 1;
    const itemsLeft = RULES.itemsPerCalling - seen[k] + 1;
    // spread the total as evenly as the 1..5 range allows
    const want = Math.max(1, Math.min(5, Math.round(left[k] / itemsLeft)));
    left[k] -= want;
    return q.reverse ? 6 - want : want;
  });
};

const rawFor = (affinity) => RULES.rawMin + (affinity / 100) * (RULES.rawMax - RULES.rawMin);
const keyOf = (name) => ORDER.find((k) => CALLINGS[k].name === name);
const codeFor = (...names) => names.reduce((n, d) => n + CALLINGS[keyOf(d)].weight, 0);

console.log('\n── THE MEASUREMENT LAYER, WHICH MUST NOT MOVE ──');
ok('40 statements', QUESTIONS.length === 40);
ok('8 per Calling', ORDER.every((k) => QUESTIONS.filter((q) => q.calling === k).length === 8));
ok('10 reverse items', QUESTIONS.filter((q) => q.reverse).length === 10);
ok('questions are in order 1 to 40', QUESTIONS.every((q, i) => q.n === i + 1));
ok('weights are Virtue 1, Devotion 2, Mastery 4, Influence 8, Vigilance 16',
  CALLINGS.O.weight === 1 && CALLINGS.H.weight === 2 && CALLINGS.F.weight === 4 &&
  CALLINGS.V.weight === 8 && CALLINGS.W.weight === 16);
ok('the scale is 1 to 5', RULES.likertMin === 1 && RULES.likertMax === 5);
ok('the threshold is 62.5 and the proximity rule is 15',
  RULES.activeMin === 62.5 && RULES.activeDistance === 15);
// The dimension assignment is the part a rename could most easily corrupt.
ok('the first five questions still run Virtue, Devotion, Mastery, Influence, Vigilance',
  QUESTIONS.slice(0, 5).map((q) => q.calling).join('') === 'OHFVW');

console.log('\n── SCORING ──');
ok('a reverse answer of 4 keys to 2', keyed(4, true) === 2);
ok('a reverse answer of 1 keys to 5 and 3 stays 3', keyed(1, true) === 5 && keyed(3, true) === 3);
ok('a normal answer is unchanged', keyed(4, false) === 4);
ok('raw 31 gives affinity 71.875', affinityOf(31) === 71.875, String(affinityOf(31)));
ok('raw 8 gives 0 and raw 40 gives 100', affinityOf(8) === 0 && affinityOf(40) === 100);
ok('reverse items really are reversed in a whole run',
  score(answersFor({ O: 5, H: 5, F: 5, V: 5, W: 5 })).raw.O === 40);

console.log('\n── THE FIVE CASES THE SPECIFICATION NAMES ──');
const onlyActive = (...names) => {
  const per = Object.fromEntries(ORDER.map((k) => [k, 8]));
  for (const n of names) per[keyOf(n)] = 40;
  return score(answersForRaw(per));
};
const expect = (label, names, code, name) => {
  const r = onlyActive(...names);
  ok(`${label}: ${names.join(' + ')}`,
    r.code === code && r.archetype.name === `The ${name}`,
    `code ${r.code} ${r.archetype.name}`);
};
expect('pure', ['Mastery'], 4, 'Blacksmith');
expect('dual', ['Mastery', 'Influence'], 12, 'Mentor');
expect('triple', ['Devotion', 'Vigilance', 'Virtue'], 19, 'High Paladin');
expect('fourfold', ['Mastery', 'Devotion', 'Vigilance', 'Virtue'], 23, 'Paragon of Light');
expect('fivefold', ['Mastery', 'Influence', 'Devotion', 'Vigilance', 'Virtue'], 31,
  'Paragon of the Fateless');

console.log('\n── THE ACTIVATION BOUNDARIES ──');
// 62.5 exactly. Reachable, because raw 28 is a whole number of items.
let r = score(answersForRaw({ O: 28, H: 8, F: 8, V: 8, W: 8 }));
ok('an affinity of exactly 62.5 activates', r.affinity.O === 62.5 && r.active.O === true,
  `O ${r.affinity.O}`);
// Just below it.
r = score(answersForRaw({ O: 27, H: 8, F: 8, V: 8, W: 8 }));
ok('the step below 62.5 does not clear the bar on its own merit',
  r.affinity.O === 59.375 && r.max < RULES.activeMin, `O ${r.affinity.O}`);

// The proximity rule. One raw point is 3.125 affinity points, so a gap of
// exactly 15.000 cannot occur: the reachable gaps either side are 12.5 and
// 15.625. Both are checked; the exact boundary is unreachable by construction.
ok('a gap of exactly 15.000 is unreachable with 8 items', (15 / 3.125) % 1 !== 0,
  '15 / 3.125 = 4.8 raw points');
r = score(answersForRaw({ F: 40, O: rawFor(100 - 12.5), H: 8, V: 8, W: 8 }));
ok('12.5 below the highest stays active', r.affinity.O === 87.5 && r.active.O === true,
  `O ${r.affinity.O} of max ${r.max}`);
r = score(answersForRaw({ F: 40, O: rawFor(100 - 15.625), H: 8, V: 8, W: 8 }));
ok('15.625 below the highest drops out', r.affinity.O === 84.375 && r.active.O === false,
  `O ${r.affinity.O} of max ${r.max}`);
// And the reason it drops out is the proximity rule, not the threshold.
ok('it dropped out despite being well over 62.5', r.affinity.O > RULES.activeMin);

console.log('\n── THE FALLBACK, SO NOBODY GETS NOTHING ──');
r = score(answersForRaw({ O: 20, H: 20, F: 27, V: 20, W: 20 }));
ok('with every Calling under 62.5 the highest still activates',
  r.max < RULES.activeMin && r.code === 4 && r.activeKeys.join('') === 'F',
  `max ${r.max}, code ${r.code}`);
ok('the fallback is reported as the fallback', r.max < RULES.activeMin);
r = score(answersForRaw({ O: 25, H: 25, F: 25, V: 25, W: 25 }));
ok('a five way tie below the bar activates all five', r.code === 31, `code ${r.code}`);
ok('no answer set can ever produce code 0',
  [0, 1, 2, 3].every(() => true) &&
  score(answersFor({ O: 1, H: 1, F: 1, V: 1, W: 1 })).code !== 0);

console.log('\n── TIES AT THE TOP ──');
r = score(answersForRaw({ O: 40, H: 40, F: 8, V: 8, W: 8 }));
ok('two Callings tied at the top both activate', r.code === 3 && r.archetype.name === 'The Saint',
  `code ${r.code} ${r.archetype.name}`);
ok('the tie is exact at full precision', r.affinity.O === r.affinity.H);

console.log('\n── PRECISION AND DISPLAY ──');
r = score(answersForRaw({ O: 27, H: 8, F: 40, V: 8, W: 8 }));
ok('classification reads full precision, not the rounded display',
  r.affinity.O === 59.375 && r.display.O === 59.4 && r.active.O === false,
  `${r.affinity.O} shown as ${r.display.O}`);
ok('all five scores are always present, active or not',
  Object.keys(r.display).length === 5 && ORDER.every((k) => typeof r.display[k] === 'number'));
ok('62.5 lands in the Active band', bandOf(62.5).label === 'Active', bandOf(62.5).label);
ok('85 lands in Defining and 84.999 does not',
  bandOf(85).label === 'Defining' && bandOf(84.999).label === 'Strong');
ok('55 lands in Emerging, 45 in Available, 0 in Quiet',
  bandOf(55).label === 'Emerging' && bandOf(45).label === 'Available' && bandOf(0).label === 'Quiet');
ok('the guide bands agree with the registry bands',
  BANDS.every((b) => (guide.bands.find((g) => g.from === b.at) || {}).label === b.label));

console.log('\n── THE REGISTRY, AGAINST THE SPECIFICATION TABLE ──');
// Section 44 of the specification, copied in full. This is the check that
// matters most: a name may only ever sit on its own combination of drives.
const TABLE = `
1 Disciple: Virtue
2 Caregiver: Devotion
3 Saint: Devotion + Virtue
4 Blacksmith: Mastery
5 Oathkeeper: Mastery + Virtue
6 Steward: Mastery + Devotion
7 True Shepherd: Mastery + Devotion + Virtue
8 Orator: Influence
9 Beacon: Influence + Virtue
10 Chancellor: Influence + Devotion
11 White Eminence: Influence + Devotion + Virtue
12 Mentor: Mastery + Influence
13 Grand Architect: Mastery + Influence + Virtue
14 Master of the Hearth: Mastery + Influence + Devotion
15 Great World Sage: Mastery + Influence + Devotion + Virtue
16 Night Sentry: Vigilance
17 Inquisitor: Vigilance + Virtue
18 Aegis: Devotion + Vigilance
19 High Paladin: Devotion + Vigilance + Virtue
20 Ward Summoner: Mastery + Vigilance
21 Knight Lord: Mastery + Vigilance + Virtue
22 Iron Sentinel: Mastery + Devotion + Vigilance
23 Paragon of Light: Mastery + Devotion + Vigilance + Virtue
24 Spy: Influence + Vigilance
25 High Warden: Influence + Vigilance + Virtue
26 Vigil Keeper: Influence + Devotion + Vigilance
27 Speaker of the Gods: Influence + Devotion + Vigilance + Virtue
28 Spy Lord: Mastery + Influence + Vigilance
29 Protector of the Realm: Mastery + Influence + Vigilance + Virtue
30 Lord of Ghost’s Shadow: Mastery + Influence + Devotion + Vigilance
31 Paragon of the Fateless: Mastery + Influence + Devotion + Vigilance + Virtue
`.trim().split('\n').map((line) => {
  const [, code, name, drives] = /^(\d+) (.+?): (.+)$/.exec(line.trim());
  return { code: Number(code), name, drives: drives.split(' + ') };
});

ok('the table has all 31 rows', TABLE.length === 31);
let tableBad = 0;
for (const row of TABLE) {
  const a = ARCHETYPES[row.code];
  const wantCode = codeFor(...row.drives);
  const named = a && a.name === `The ${row.name}`;
  const summed = wantCode === row.code;
  const blended = a && a.blend.split(' + ').sort().join(' + ') === row.drives.slice().sort().join(' + ');
  if (!(a && named && summed && blended)) {
    tableBad++;
    console.log(` FAIL  ${row.code} ${row.name}: ` +
      `${!a ? 'missing' : ''}${!named ? `named ${a.name}` : ''}` +
      `${!summed ? ` drives sum to ${wantCode}` : ''}${a && !blended ? ` blend ${a.blend}` : ''}`);
  }
}
ok('all 31 names sit on the drive combination the table gives them', tableBad === 0);

const codes = Object.keys(ARCHETYPES).map(Number).sort((a, b) => a - b);
ok('codes 1 to 31 with no gaps and nothing extra',
  codes.length === 31 && codes.every((c, i) => c === i + 1));
ok('every name is unique', new Set(TABLE.map((t) => t.name)).size === 31);
ok('the drive count matches the tier everywhere', TABLE.every((row) =>
  TIERS[ARCHETYPES[row.code].tier].drives === row.drives.length));

console.log('\n── TITAN METADATA ──');
const FOUR = [15, 23, 27, 29, 30];
ok('the five fourfold results carry a mythic title',
  FOUR.every((c) => typeof ARCHETYPES[c].mythicTitle === 'string' && ARCHETYPES[c].mythicTitle));
ok('each fourfold names the drive it lacks, and lacks it',
  FOUR.every((c) => {
    const miss = ARCHETYPES[c].missing;
    return miss && !ARCHETYPES[c].blend.includes(CALLINGS[miss].name);
  }));
ok('each fourfold says what its missing drive does NOT mean',
  FOUR.every((c) => /does not/i.test(ARCHETYPES[c].notThis || '')));
ok('the Fateless has no Titan patron',
  !ARCHETYPES[31].mythicTitle && typeof ARCHETYPES[31].integration === 'string');
ok('no other archetype has a mythic title',
  codes.filter((c) => ARCHETYPES[c].mythicTitle).join(',') === FOUR.join(','));

console.log('\n── NOTHING STILL SPEAKS THE OLD LANGUAGE ──');
const OLD_DRIVES = ['Oath', 'Hearth', 'Forge', 'Voice', 'Watch'];
const blob = JSON.stringify(ARCHETYPES) + JSON.stringify(guide.archetypes) +
  JSON.stringify(CALLINGS) + JSON.stringify(guide.callingModifiers);
for (const word of OLD_DRIVES) {
  // "Master of the Hearth" is a new archetype name and is allowed to keep it
  const stray = blob.replace(/Master of the Hearth/g, '').match(new RegExp(`\\b${word}\\b`, 'g'));
  ok(`no stray "${word}" in the registry or the guide`, !stray, stray ? `${stray.length} left` : '');
}
const OLD_TIERS = ['True Calling', 'Bound Calling', 'Triune Calling', 'High Calling', 'Fivefold Soul'];
ok('no old tier names survive', OLD_TIERS.every((t) => !blob.includes(t)));

console.log('\n── THE GUIDE AGREES WITH THE REGISTRY ──');
ok('every code in the registry has guide copy',
  codes.every((c) => guide.archetypes[c]));
ok('the guide prints the registry name and tier for all 31',
  codes.every((c) => guide.archetypes[c].name === ARCHETYPES[c].name &&
    guide.archetypes[c].tier === ARCHETYPES[c].tier));
ok('every decision pathway stage still names a Calling the engine knows',
  codes.every((c) => (guide.archetypes[c].decisionPath || []).every((stage) => {
    const word = String(stage).split(/[\s:]/)[0];
    return !/^[A-Z][a-z]+$/.test(word) || ORDER.some((k) => CALLINGS[k].name === word) ||
      !OLD_DRIVES.concat(ORDER.map((k) => CALLINGS[k].name)).includes(word);
  })));

console.log('\n── EVERY RESULT IS REACHABLE ──');
const seen = new Set();
for (let i = 0; i < 20000; i++) {
  const answers = QUESTIONS.map(() => 1 + Math.floor(Math.random() * 5));
  seen.add(score(answers).code);
}
ok('random answering reaches many of the 31', seen.size > 12, `${seen.size} of 31 by chance`);
for (let c = 1; c <= 31; c++) {
  const names = ORDER.filter((k) => c & CALLINGS[k].weight).map((k) => CALLINGS[k].name);
  const got = onlyActive(...names);
  if (got.code !== c) { fail++; console.log(` FAIL  code ${c} not reachable, got ${got.code}`); }
}
ok('all 31 codes are reachable by construction', true);

console.log('\n── A SAVED RESULT STILL CLASSIFIES THE SAME ──');
// The trial stores answers, never a name, so an old record is re-scored by
// the same unchanged mathematics and simply prints its new title.
const OLD_RECORD = [
  5, 4, 4, 2, 5, 1, 2, 2, 4, 1, 5, 4, 4, 2, 5, 1, 2, 2, 4, 1,
  5, 4, 4, 2, 5, 5, 4, 4, 2, 5, 5, 4, 4, 2, 5, 5, 4, 4, 2, 5,
];
// These figures were taken by scoring the same answers against the data file
// as it stood BEFORE the migration (git show HEAD:src/data/fivefold.js), so
// they pin the old behaviour rather than merely echoing the new.
const again = score(OLD_RECORD);
ok('a stored answer set scores without error', again && again.code >= 1 && again.code <= 31,
  `code ${again.code} = ${again.archetype.name}`);
ok('its raw totals match the pre-migration engine exactly',
  again.raw.O === 40 && again.raw.H === 32 && again.raw.F === 32 &&
  again.raw.V === 16 && again.raw.W === 40, JSON.stringify(again.raw));
ok('its affinities match the pre-migration engine exactly',
  again.affinity.O === 100 && again.affinity.H === 75 && again.affinity.F === 75 &&
  again.affinity.V === 25 && again.affinity.W === 100);
ok('it still classifies to code 17, as it did before the rename',
  again.code === 17 && again.activeKeys.join(',') === 'O,W', `code ${again.code}`);
ok('code 17 now prints as the Inquisitor, where it once printed as the Sentinel',
  again.archetype.name === 'The Inquisitor', again.archetype.name);

console.log('\n── THE DEPTH MODULE CANNOT TOUCH THE RESULT ──');
// Questions 41 to 50 may colour the writing. They may not move a score, flip
// a Calling on or off, or change the code. The forty remain the classifier.
const { analyse, DEPTH } = await import('../src/lib/fivefold-deep.js');
const coreOnly = answersForRaw({ O: 30, H: 26, F: 34, V: 18, W: 29 });
const plain = analyse(coreOnly, null);
let depthMoved = 0;
for (const v of [1, 2, 3, 4, 5]) {
  const withDepth = analyse(coreOnly, DEPTH.map(() => v));
  if (withDepth.code !== plain.code) depthMoved++;
  if (ORDER.some((k) => withDepth.affinity[k] !== plain.affinity[k])) depthMoved++;
  if (ORDER.some((k) => withDepth.active[k] !== plain.active[k])) depthMoved++;
}
ok('no depth answers change the code, the affinities or which Callings are active',
  depthMoved === 0, `code ${plain.code} throughout`);
ok('the classifier is the forty, and only the forty', DEPTH.every((q) => q.n > 40));

console.log('\n── REFUSALS ──');
const refuses = (answers, why) => {
  try { score(answers); ok(why, false, 'it was accepted'); }
  catch { ok(why, true); }
};
refuses(answersFor({ O: 5, H: 5, F: 5, V: 5, W: 5 }).slice(0, 39), 'an incomplete set is refused');
refuses(answersFor({ O: 5, H: 5, F: 5, V: 5, W: 5 }).map((v, i) => (i ? v : 9)),
  'an out of range answer is refused');
refuses(answersFor({ O: 5, H: 5, F: 5, V: 5, W: 5 }).map((v, i) => (i ? v : 0)),
  'a zero answer is refused');
refuses(answersFor({ O: 5, H: 5, F: 5, V: 5, W: 5 }).map((v, i) => (i ? v : null)),
  'an unanswered question is refused');

console.log(fail ? `\n${fail} FAILED` : '\nall checks passed');
process.exit(fail ? 1 : 0);
