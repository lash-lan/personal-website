// Checks the engine against the worked examples in the specification workbook.
//   node scripts/fivefold-selftest.mjs
import { QUESTIONS, CALLINGS, ORDER, ARCHETYPES, RULES, bandOf } from '../src/data/fivefold.js';
import { score, keyed, affinityOf } from '../src/lib/fivefold-engine.js';

let fail = 0;
const ok = (name, good, detail = '') => {
  if (!good) fail++;
  console.log(`${good ? '  ok  ' : ' FAIL '} ${name}${detail ? '   ' + detail : ''}`);
};

// Build answers that give a chosen Calling a chosen keyed value per item.
const answersFor = (perCalling) => QUESTIONS.map((q) => {
  const want = perCalling[q.calling];              // desired keyed value 1..5
  return q.reverse ? 6 - want : want;              // invert so keying restores it
});

console.log('\n── THE QUESTION SET ──');
ok('40 statements', QUESTIONS.length === 40);
ok('8 per Calling', ORDER.every((k) => QUESTIONS.filter((q) => q.calling === k).length === 8));
ok('10 reverse items', QUESTIONS.filter((q) => q.reverse).length === 10);
ok('weights are O1 H2 F4 V8 W16',
  CALLINGS.O.weight === 1 && CALLINGS.H.weight === 2 && CALLINGS.F.weight === 4 &&
  CALLINGS.V.weight === 8 && CALLINGS.W.weight === 16);

console.log('\n── WORKED EXAMPLES FROM THE WORKBOOK ──');
// Sheet "Scoring Logic", step 2: a reverse answer of 4 keys to 2.
ok('reverse answer 4 keys to 2', keyed(4, true) === 2);
ok('a normal answer is unchanged', keyed(4, false) === 4);
// Step 4: raw 31 becomes 71.875
ok('raw 31 gives affinity 71.875', affinityOf(31) === 71.875, String(affinityOf(31)));
// Range ends
ok('raw 8 gives 0 and raw 40 gives 100', affinityOf(8) === 0 && affinityOf(40) === 100);

// Step 8: Oath + Hearth + Forge + Watch = 23 = The Silent Warden
ok('code 23 is The Silent Warden', ARCHETYPES[23].name === 'The Silent Warden',
  ARCHETYPES[23].name);
// Step 9 example
ok('code 23 has four active Callings', ARCHETYPES[23].tier === 'High Calling');

console.log('\n── ACTIVATION RULES ──');
// Everything at 5 keyed: every Calling is 40 raw, 100 affinity, all active.
let r = score(answersFor({ O: 5, H: 5, F: 5, V: 5, W: 5 }));
ok('all fives gives the Fivefold Soul', r.code === 31 && r.archetype.name === 'The Fivefold Soul',
  `code ${r.code}`);
ok('all fives gives 100 affinity throughout', ORDER.every((k) => r.affinity[k] === 100));

// Everything at 1: all equal at 0, below 62.5, so the fallback activates all
// five because they are all exactly the maximum.
r = score(answersFor({ O: 1, H: 1, F: 1, V: 1, W: 1 }));
ok('all ones still yields a valid archetype', Boolean(r.archetype), `code ${r.code}`);
ok('all ones uses the fallback, not the 62.5 cutoff', r.max < RULES.activeMin);

// One Calling high, the rest low: only that one should be active.
r = score(answersFor({ O: 5, H: 1, F: 1, V: 1, W: 1 }));
ok('a single dominant Calling gives a True Calling',
  r.code === 1 && r.archetype.name === 'The Oathkeeper', `code ${r.code}`);

// The distance rule: a Calling above 62.5 but more than 15 points below the
// top must NOT activate. Oath keyed 5 (100), Hearth keyed 4 (75).
// 75 >= 62.5 but 75 < 100 - 15 = 85, so Hearth stays out.
r = score(answersFor({ O: 5, H: 4, F: 1, V: 1, W: 1 }));
ok('62.5 alone is not enough without closeness',
  r.affinity.H === 75 && r.active.H === false && r.code === 1,
  `Hearth ${r.affinity.H}, max ${r.max}, code ${r.code}`);

// And when it is close enough, it does activate. Both at 5 -> both 100.
r = score(answersFor({ O: 5, H: 5, F: 1, V: 1, W: 1 }));
ok('two equal Callings both activate', r.code === 3 && r.archetype.name === 'The Sacred Guardian',
  `code ${r.code}`);

console.log('\n── EVERY RESULT IS REACHABLE AND VALID ──');
const codes = Object.keys(ARCHETYPES).map(Number).sort((a, b) => a - b);
ok('31 archetypes, codes 1 to 31',
  codes.length === 31 && codes.every((c, i) => c === i + 1));
ok('every archetype has all its report copy',
  Object.values(ARCHETYPES).every((a) =>
    a.name && a.tier && a.reveal && a.essence && a.strengths && a.decide &&
    a.relationships && a.work && a.shadow && a.growth && a.footer));
ok('the blend text matches the code',
  codes.every((c) => {
    const parts = ORDER.filter((k) => c & CALLINGS[k].weight)
      .map((k) => CALLINGS[k].name.replace('The ', ''));
    return ARCHETYPES[c].blend.replace(/\s+/g, ' ') === parts.join(' + ');
  }));

// random walk over real answer sets
const seen = new Set();
let allValid = true;
for (let t = 0; t < 40000; t++) {
  const a = QUESTIONS.map(() => 1 + Math.floor(Math.random() * 5));
  const res = score(a);
  if (!res.archetype || res.code < 1 || res.code > 31) allValid = false;
  seen.add(res.code);
}
ok('40,000 random respondents all get a valid result', allValid);
console.log(`       reachable by chance: ${seen.size} of 31`);

console.log('\n── DISPLAY RULES ──');
r = score(answersFor({ O: 5, H: 4, F: 3, V: 2, W: 1 }));
ok('classification uses full precision, display is rounded',
  r.affinity.F === 50 && typeof r.display.F === 'number');
ok('bands resolve for every Calling', ORDER.every((k) => Boolean(r.bands[k])));
ok('62.5 lands in the Strong band', bandOf(62.5).label === 'Strong', bandOf(62.5).label);
ok('80 lands in the Dominant band', bandOf(80).label === 'Dominant', bandOf(80).label);
ok('all five scores are always shown, not only the active ones',
  Object.keys(r.display).length === 5);

console.log('\n── REFUSALS ──');
const rejects = (a) => { try { score(a); return false; } catch { return true; } };
ok('an incomplete set is refused', rejects(Array(39).fill(3)));
ok('an out of range answer is refused', rejects(Array(40).fill(6)));
ok('a zero answer is refused', rejects(Array(40).fill(0)));

console.log(fail ? `\n${fail} FAILED` : '\nall checks passed');
process.exit(fail ? 1 : 0);
