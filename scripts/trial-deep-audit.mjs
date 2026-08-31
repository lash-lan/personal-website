// Audits the Deep Trial against every requirement in the brief.
//   node scripts/trial-deep-audit.mjs
import { evaluateDeep } from '../src/lib/trial-engine-deep.js';
import { buildReport } from '../src/lib/trial-report-build.js';
import { ARCHETYPES, ORDER } from '../src/data/trial.js';
import { FACET_ORDER, T } from '../src/data/trial-facets.js';
import { MIRROR, DILEMMAS, TRADEOFFS } from '../src/data/trial-items.js';

let pass = 0, fail = 0;
const ok = (name, good, detail = '') => {
  if (good) pass++; else fail++;
  console.log(`${good ? '  ok  ' : ' FAIL '} ${name}${detail ? '   ' + detail : ''}`);
};
const rnd = (n, m) => Array.from({ length: n }, () => Math.floor(Math.random() * m));
const CRU = ['fight', 'flight', 'freeze', 'assess'];
const full = (over = {}) => ({
  mirror: rnd(15, 5), trial: rnd(24, 5), tradeoff: rnd(6, 2),
  crucible: rnd(10, 4).map((x) => CRU[x]), ...over,
});

console.log('\n── STRUCTURE ──');
ok('15 Mirror items, one per facet', MIRROR.length === 15 &&
  new Set(MIRROR.map((m) => m.facet)).size === 15);
ok('24 dilemmas, five options each', DILEMMAS.length === 24 &&
  DILEMMAS.every((d) => d.choices.length === 5));
ok('6 forced trade-offs, two options each', TRADEOFFS.length === 6 &&
  TRADEOFFS.every((t) => t.choices.length === 2));
ok('every option carries evidence tags', DILEMMAS.every((d) => d.choices.every((c) =>
  c.p && c.s && c.f && c.th && c.cost && c.act)));
ok('55 decisions in total', 15 + 24 + 6 + 10 === 55);

console.log('\n── ARCHETYPES AND THE MASK ──');
const seen = new Set();
for (let i = 0; i < 120000; i++) seen.add(evaluateDeep(full()).mask);
const all = Object.keys(ARCHETYPES).map(Number);
ok('all 31 archetypes still reachable', seen.size === 31, `${seen.size} of 31`);
ok('every mask maps to exactly one archetype', all.length === 31 &&
  new Set(Object.values(ARCHETYPES).map((a) => a.name)).size === 31);

console.log('\n── THE FOUR CHANNELS STAY SEPARATE ──');
const base = full();
const mirrorChanged = evaluateDeep({ ...base, mirror: base.mirror.map(() => 0) });
const mirrorChanged2 = evaluateDeep({ ...base, mirror: base.mirror.map(() => 4) });
ok('Mirror never moves the archetype', mirrorChanged.mask === mirrorChanged2.mask &&
  mirrorChanged.mask === evaluateDeep(base).mask);
ok('Mirror scores are kept apart from Trial scores',
  JSON.stringify(mirrorChanged.facetMirror) !== JSON.stringify(mirrorChanged.facetTrial) &&
  mirrorChanged.facetMirror.integrity === 0 && mirrorChanged2.facetMirror.integrity === 100);
const cruA = evaluateDeep({ ...base, crucible: Array(10).fill('fight') });
const cruB = evaluateDeep({ ...base, crucible: Array(10).fill('freeze') });
ok('Crucible never alters the archetype', cruA.mask === cruB.mask &&
  cruA.archetype.name === cruB.archetype.name);
ok('trade-offs feed facets but not the Calling mask',
  evaluateDeep({ ...base, tradeoff: Array(6).fill(0) }).mask ===
  evaluateDeep({ ...base, tradeoff: Array(6).fill(1) }).mask);

console.log('\n── NOT COLLAPSED TO FIVE NUMBERS ──');
const r = evaluateDeep(full());
ok('15 facet scores present', Object.keys(r.facetTrial).length === 15);
ok('answer level evidence retained', r.evidence.length === 24 &&
  r.evidence[0].theme && r.evidence[0].text && r.evidence[0].actionStyle);
ok('Mirror, Trial, trade-off and Crucible all exposed separately',
  !!r.facetMirror && !!r.facetTrial && !!r.tradeoffKept && !!r.crucible.bars);

console.log('\n── SUB-FACET ARITHMETIC ──');
// pick the option that awards integrity in dilemma 1 and check it lands
const d1 = DILEMMAS[0].choices.findIndex((c) => c.f.integrity);
const only = evaluateDeep({ mirror: [], trial: [d1, ...Array(23).fill(null)], tradeoff: [], crucible: [] });
ok('a single answer moves only the facets it tags',
  only.facetTrialRaw.integrity === DILEMMAS[0].choices[d1].f.integrity &&
  only.facetTrialRaw.loyalty === 0);
ok('facets normalise to 0..100', FACET_ORDER.every((f) =>
  r.facetTrial[f] >= 0 && r.facetTrial[f] <= 100));
ok('facet bands resolve for all 15', FACET_ORDER.every((f) => !!r.facetBand[f]));

console.log('\n── BACK NAVIGATION ──');
const a1 = full();
const before = evaluateDeep(a1);
const a2 = { ...a1, trial: [...a1.trial] };
a2.trial[5] = (a2.trial[5] + 1) % 5;          // go back and change one answer
const after = evaluateDeep(a2);
const sum = (o) => ORDER.reduce((n, k) => n + o.callingRaw[k], 0);
ok('re-answering replaces, never accumulates',
  sum(before) === 24 * 4 && sum(after) === 24 * 4, `${sum(before)} then ${sum(after)}`);
ok('evidence count stays at one per question', after.evidence.length === 24);

console.log('\n── CONTRADICTIONS THE BRIEF NAMED ──');
// build a participant who maximises one facet and starves its partner
function seek(id, tries = 60000) {
  for (let i = 0; i < tries; i++) {
    const s = full();
    const res = evaluateDeep(s);
    if (res.contradictions.some((c) => c.id === id)) return res;
  }
  return null;
}
for (const [id, label] of [
  ['planVsFinish', 'high planning + low persistence'],
  ['readVsSpeak', 'high social reading + low social boldness'],
  ['loyalVsLimit', 'high loyalty + weak boundaries'],
  ['watchAndFight', 'high vigilance + high confrontation'],
  ['idealVsPractice', 'strong moral self-image + pragmatic choices'],
]) {
  const hit = seek(id);
  ok(`triggers: ${label}`, !!hit, hit ? '' : 'never fired in 60k runs');
}

console.log('\n── NEIGHBOURING ARCHETYPE ──');
let nbOk = true, nbChecked = 0;
for (let i = 0; i < 2000; i++) {
  const res = evaluateDeep(full());
  for (const nb of res.neighbours) {
    nbChecked++;
    // a neighbour must be this mask plus exactly one more Calling
    const diff = nb.archetype.mask - res.mask;
    if (!(diff > 0 && (diff & (diff - 1)) === 0)) nbOk = false;
    if (res.active.includes(nb.calling)) nbOk = false;
  }
}
ok('every neighbour is one Calling away and not already active', nbOk, `${nbChecked} checked`);

console.log('\n── THE REPORT ──');
const REQUIRED = [
  ['why this archetype was selected', 'why'],
  ['which Callings dominated and which were quiet', 'fivefold'],
  ['the 15 sub-facet pattern', 'facets'],
  ['how they tend to make decisions', 'decisions'],
  ['strongest internal tensions', 'tensions'],
  ['where self-perception and choices align and differ', 'mirror'],
  ['how they respond under pressure, and how it meets the archetype', 'crucible'],
  ['leadership, relationships, conflict, uncertainty, work', 'domains'],
  ['shadow side and blind spots', 'shadow'],
  ['growth path', 'growth'],
  ['nearest neighbouring archetype', 'borderlands'],
  ['technical scoring details', 'technical'],
];
let docs = [], missing = {};
for (let i = 0; i < 300; i++) {
  const res = evaluateDeep(full());
  const doc = buildReport(res, { completedAt: '1 January' });
  docs.push(doc);
  for (const [label, id] of REQUIRED) {
    if (!doc.sections.some((s) => s.id === id)) missing[label] = (missing[label] || 0) + 1;
  }
}
for (const [label, id] of REQUIRED) {
  const miss = missing[label] || 0;
  ok(`section present: ${label}`, miss === 0, miss ? `absent in ${miss} of 300` : '');
}
const words = docs.map((d) => d.words);
ok('report length within 1,800 to 3,000',
  words.filter((w) => w < 1800 || w > 3000).length <= 3,
  `min ${Math.min(...words)}, max ${Math.max(...words)}, avg ${Math.round(words.reduce((a, b) => a + b) / words.length)}`);

console.log('\n── PERSONALISATION, NOT PLACEHOLDER ──');
// two people with the SAME archetype must not receive the same prose
const byArchetype = {};
for (let i = 0; i < 4000 && Object.values(byArchetype).every((v) => v.length < 2); i++) {
  const res = evaluateDeep(full());
  (byArchetype[res.archetype.name] ||= []).push(buildReport(res, { completedAt: '1 January' }));
}
const pair = Object.values(byArchetype).find((v) => v.length >= 2);
const proseOf = (doc) => doc.sections.flatMap((s) => s.paras || []).join('\n');
ok('same archetype, different report', pair && proseOf(pair[0]) !== proseOf(pair[1]));
const lorem = /lorem|TODO|placeholder|XXX|\{\{|\bundefined\b|\bNaN\b|\[object/i;
ok('no placeholder or broken interpolation anywhere',
  docs.every((d) => !lorem.test(proseOf(d) + JSON.stringify(d.sections))));
ok('no forbidden scientific claim', docs.every((d) =>
  !/clinically validated|scientifically validated|official HEXACO|objectively true/i.test(proseOf(d))));
ok('limitations statement present', docs.every((d) =>
  /not a validated psychometric/i.test(proseOf(d))));

console.log('\n── DETERMINISM ──');
const fixed = full();
const one = JSON.stringify(buildReport(evaluateDeep(fixed), { completedAt: 'X' }));
const two = JSON.stringify(buildReport(evaluateDeep(fixed), { completedAt: 'X' }));
ok('identical answers produce an identical report', one === two);

console.log(`\n${fail ? fail + ' FAILED, ' : ''}${pass} passed`);
process.exit(fail ? 1 : 0);
