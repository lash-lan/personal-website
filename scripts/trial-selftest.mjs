// Checks the Trial engine against the acceptance tests in the specification.
//   node scripts/trial-selftest.mjs
import { QUESTIONS, ARCHETYPES, CALLINGS, ORDER } from '../src/data/trial.js';
import { evaluate, rawScores, resonance, crucibleTally, crucibleReading } from '../src/lib/trial-engine.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  ' + detail : ''}`);
};

// 1. every Trial has exactly five main choices
check('1. ten Trials, five choices each',
  QUESTIONS.length === 10 && QUESTIONS.every((q) => q.choices.length === 5),
  `${QUESTIONS.length} Trials`);

// 2. every choice has exactly one +3 and one +1, and they differ
check('2. each choice gives one +3 and one +1',
  QUESTIONS.every((q) => q.choices.every((c) =>
    CALLINGS[c.p] && CALLINGS[c.s] && c.p !== c.s)));

// 3. points total exactly 40 across ten Trials, for every possible path
let totalsOk = true, seenTotals = new Set();
for (let trial = 0; trial < 400; trial++) {
  const answers = QUESTIONS.map(() => Math.floor(Math.random() * 5));
  const raw = rawScores(answers);
  const sum = ORDER.reduce((n, k) => n + raw[k], 0);
  seenTotals.add(sum);
  if (sum !== 40) totalsOk = false;
}
check('3. main-choice points total 40', totalsOk, `totals seen: ${[...seenTotals].join(',')}`);

// 4. Crucible answers never alter the mask
const fixed = QUESTIONS.map((_, i) => i % 5);
const maskA = evaluate(fixed, []).mask;
const maskB = evaluate(fixed, Array(10).fill('fight')).mask;
const maskC = evaluate(fixed, ['freeze','assess','flight','fight','assess','fight','freeze','flight','assess','fight']).mask;
check('4. Crucible never changes the archetype', maskA === maskB && maskB === maskC,
  `mask ${maskA} in all three`);

// 5 & 6. all 31 non-empty masks map to one and only one archetype
const masks = Object.keys(ARCHETYPES).map(Number).sort((x, y) => x - y);
const expected = Array.from({ length: 31 }, (_, i) => i + 1);
const names = new Set(Object.values(ARCHETYPES).map((x) => x.name));
check('5. all 31 masks present exactly once',
  masks.length === 31 && expected.every((m) => ARCHETYPES[m]) && names.size === 31);
check('6. codes are O1 H2 F4 V8 W16',
  CALLINGS.O.code === 1 && CALLINGS.H.code === 2 && CALLINGS.F.code === 4 &&
  CALLINGS.V.code === 8 && CALLINGS.W.code === 16);

// blend text must agree with the bits actually set in the mask
const LETTER = { O: 'Oath', H: 'Hearth', F: 'Forge', V: 'Voice', W: 'Watch' };
let blendOk = true;
for (const m of masks) {
  const parts = ORDER.filter((k) => m & CALLINGS[k].code).map((k) => LETTER[k]);
  if (ARCHETYPES[m].blend !== parts.join(' + ')) {
    blendOk = false;
    console.log(`      mask ${m}: blend "${ARCHETYPES[m].blend}" but bits say "${parts.join(' + ')}"`);
  }
}
check('6b. every blend matches its own bitmask', blendOk);

// the worked example from the specification
const ex = 1 + 2 + 4 + 16;
check('6c. Oath+Hearth+Forge+Watch = 23 = The Silent Warden',
  ex === 23 && ARCHETYPES[23].name === 'The Silent Warden');

// 7. answering a Trial again replaces its points rather than adding more
const before = rawScores([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const changed = [...Array(10).fill(0)]; changed[3] = 4;
const after = rawScores(changed);
check('7. re-answering replaces, never duplicates',
  ORDER.reduce((n, k) => n + before[k], 0) === 40 &&
  ORDER.reduce((n, k) => n + after[k], 0) === 40);

// 10. the top Calling is always active, so a mask is never empty
let alwaysActive = true;
for (let t = 0; t < 300; t++) {
  const r = evaluate(QUESTIONS.map(() => Math.floor(Math.random() * 5)), []);
  if (!r.mask || !r.archetype || r.active.length < 1) alwaysActive = false;
}
check('10. every run yields a valid archetype', alwaysActive);

// resonance is capped and rounded as specified
check('resonance formula', resonance(30) === 100 && resonance(15) === 50 && resonance(40) === 100);

// 11. borderline sits within one raw point of the cutoff
const b = evaluate(fixed, []);
const cutoff = 0.75 * b.top;
const borderOk = b.borderline.every((k) => (cutoff - b.raw[k]) <= 1 && b.raw[k] < cutoff);
check('11. borderline within one raw point', borderOk,
  `cutoff ${cutoff.toFixed(2)}, borderline [${b.borderline}]`);

// 12. Crucible hybrid and dominant
const dom = crucibleReading(crucibleTally(['fight','fight','fight','flight','assess']));
const hyb = crucibleReading(crucibleTally(['fight','fight','assess','assess','flight']));
check('12. dominant when clear by 2', dom.kind === 'dominant' && dom.top === 'fight');
check('12b. hybrid when top two within 1', hyb.kind === 'hybrid', hyb.label || '');

// how many distinct archetypes are actually reachable
const reached = new Set();
for (let t = 0; t < 60000; t++) {
  reached.add(evaluate(QUESTIONS.map(() => Math.floor(Math.random() * 5)), []).mask);
}
console.log(`\n  reachable archetypes in 60k random runs: ${reached.size} of 31`);
const missing = expected.filter((m) => !reached.has(m));
if (missing.length) console.log(`  not reached randomly: ${missing.map((m) => `${m} ${ARCHETYPES[m].name}`).join(', ')}`);

console.log(failures ? `\n${failures} FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
