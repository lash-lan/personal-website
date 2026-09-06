// Builds a full record, on screen and as a PDF, for every archetype across
// several score patterns. Catches missing copy, template grammar bugs and
// characters the PDF fonts cannot draw.
//
//   node scripts/fivefold-record-test.mjs          all 31 archetypes
//   node scripts/fivefold-record-test.mjs --pdf    also write one sample PDF

import { writeFileSync } from 'node:fs';
import { QUESTIONS, ORDER, CALLINGS } from '../src/data/fivefold.js';
import { analyse, DEPTH } from '../src/lib/fivefold-deep.js';
import { buildFivefold } from '../src/lib/fivefold-report.js';
import { buildTrialRecord } from '../src/lib/trial-report.js';

// pdf-lib wants a Blob, which older Node does not put on the global.
if (typeof Blob === 'undefined') {
  const { Blob } = await import('node:buffer');
  globalThis.Blob = Blob;
}

const ALL = [...QUESTIONS, ...DEPTH];
const answerFor = (q, v) => (q.reverse ? 6 - v : v);

// Answers that activate exactly the given Callings. `lift` shifts the facets
// inside an active Calling so two readers of one archetype can be compared.
function build(targets, lift = {}) {
  const pick = (q) => {
    const base = targets.includes(q.calling) ? 5 : 1;
    const bump = lift[q.calling];
    if (base === 5 && bump) {
      // move the odd numbered items of this Calling down, which splits its
      // two facets apart without changing which Callings activate
      return q.n % 2 === (bump === 'first' ? 1 : 0) ? 3 : 5;
    }
    return base;
  };
  return {
    core: QUESTIONS.map((q) => answerFor(q, pick(q))),
    depth: DEPTH.map((q) => answerFor(q, pick(q))),
  };
}

// every combination of one to five Callings, which is the 31 archetypes
const COMBOS = [];
for (let mask = 1; mask < 32; mask++) {
  COMBOS.push(ORDER.filter((_, i) => mask & (1 << i)));
}

const PATTERNS = [
  ...COMBOS.map((c) => [`${c.join('')}`, () => build(c)]),
  // the facet variants, same archetype and deliberately different people
  ['OFW facets A', () => build(['O', 'F', 'W'], { O: 'first', F: 'first', W: 'first' })],
  ['OFW facets B', () => build(['O', 'F', 'W'], { O: 'second', F: 'second', W: 'second' })],
  // the edge cases that exposed the contradiction
  ['every answer neutral', () => ({ core: QUESTIONS.map(() => 3), depth: DEPTH.map(() => 3) })],
  ['every answer lowest', () => ({ core: QUESTIONS.map((q) => answerFor(q, 1)), depth: DEPTH.map((q) => answerFor(q, 1)) })],
  ['every answer highest', () => ({ core: QUESTIONS.map((q) => answerFor(q, 5)), depth: DEPTH.map((q) => answerFor(q, 5)) })],
];

// ── what a well formed report looks like ──
const collect = (doc) => {
  const out = [];
  const push = (where, t) => { if (t !== undefined && t !== null) out.push([where, String(t)]); };
  for (const p of doc.pages) {
    (p.paras || []).forEach((t, i) => push(`p${p.n} para ${i}`, t));
    (p.voices || []).forEach((t, i) => push(`p${p.n} voice ${i}`, t));
    (p.growth || []).forEach((t, i) => push(`p${p.n} growth ${i}`, t));
    (p.ideal || []).forEach((t, i) => push(`p${p.n} ideal ${i}`, t));
    (p.bad || []).forEach((t, i) => push(`p${p.n} bad ${i}`, t));
    (p.party || []).forEach((t, i) => push(`p${p.n} party ${i}`, t));
    (p.cards || []).forEach((c, i) => push(`p${p.n} card ${i}`, c.text));
    (p.perceptionPairs || []).forEach((c, i) => { push(`p${p.n} mean ${i}`, c.mean); push(`p${p.n} hear ${i}`, c.hear); });
    (p.sequence || []).forEach((s) => (s.terms || []).forEach((t, i) => push(`p${p.n} ${s.label} ${i}`, t.term)));
    (p.technical || []).forEach((t, i) => push(`p${p.n} tech ${i}`, t));
    push(`p${p.n} closing`, p.closing);
    push(`p${p.n} scalesNote`, p.scalesNote);
    if (p.stability) push(`p${p.n} stability`, p.stability.text);
  }
  return out;
};

const NAME = 'Lash';
function check(doc, r) {
  const problems = [];
  const add = (m) => problems.push(m);

  if (doc.pages.length !== 8) add(`${doc.pages.length} pages, expected 8`);

  for (const [where, text] of collect(doc)) {
    const t = text.trim();
    if (!t) { add(`${where}: empty`); continue; }
    if (/\b(undefined|NaN|\[object)/.test(t)) add(`${where}: placeholder leaked`);
    if (/[—–;]/.test(t)) add(`${where}: em dash or semicolon`);
    if (/\{NAME\}/.test(t)) add(`${where}: unreplaced name token`);
    if (/\s{2,}/.test(t)) add(`${where}: double space`);
    if (/\s\./.test(t)) add(`${where}: space before a full stop`);
    if (/\.\s+[a-z]/.test(t.replace(/\b(e\.g|i\.e|vs)\./gi, 'X'))) add(`${where}: sentence starts lowercase: "${t.slice(0, 90)}"`);
    // a paragraph must open with a capital, a name, a quote or a bold lead-in
    if (!/^(\*\*|["'(]|[A-Z0-9])/.test(t)) add(`${where}: opens lowercase: "${t.slice(0, 60)}"`);
    if ((t.match(/\*\*/g) || []).length % 2) add(`${where}: unbalanced bold marker`);
    // a capitalised pronoun mid sentence, which the source document does often
    if (/,\s+(You|We|They|It|He|She)\b/.test(t)) add(`${where}: pronoun capitalised after a comma`);
  }

  const prose = JSON.stringify(doc.pages);
  const uses = (prose.match(new RegExp(NAME, 'g')) || []).length;
  if (uses < 3 || uses > 6) add(`name used ${uses} times, guide asks for 3 to 6`);

  // the contradiction the review caught: a claim of activation that the
  // appendix denies, and a negative distance described as being above a line
  if (/-\d/.test(prose.replace(/"[^"]*-\d[^"]*(affinity|Calling)[^"]*"/g, ''))) {
    const hit = collect(doc).find(([, t]) => /-\d+(\.\d+)? points/.test(t));
    if (hit) add(`${hit[0]}: negative distance described as a positive one`);
  }
  if (r.activationRule === 'relative' && !/fallback/.test(prose)) {
    add('relative activation rule used but never disclosed');
  }
  // Tied active Callings mean no single one is closest to LEAVING, which kills
  // the contraction path. It says nothing about which inactive Calling is
  // closest to JOINING, so a nearest path there is still meaningful.
  if (r.tied && r.activeKeys.length > 1 && /points above the line/i.test(prose)) {
    add('tied active Callings but a contraction path is still named');
  }
  if (r.nearestAmbiguous && /Were it to cross/.test(prose)) {
    add('several Callings equally near, but one is named as the nearest');
  }
  if ((r.tied && r.activeKeys.length > 1) || r.nearestAmbiguous || !r.nearest) {
    if (!/Archetype stability/i.test(JSON.stringify(doc.pages.map((p) => p.stability)))) {
      add('ambiguous profile with no stability note');
    }
  }
  return problems;
}

// ── run ──
const wantPdf = process.argv.includes('--pdf');
let failures = 0, checked = 0;
const seen = new Set();

for (const [label, make] of PATTERNS) {
  const { core, depth } = make();
  for (const dep of [depth, null]) {
    const r = analyse(core, dep, { name: NAME });
    const doc = buildFivefold(r, { completedAt: '5 September 2026' });
    seen.add(r.code);
    checked++;
    const problems = check(doc, r);
    try {
      const blob = await buildTrialRecord(doc, r);
      if (!blob.size) problems.push('empty PDF');
      if (wantPdf && label === 'OFW facets A' && dep) {
        writeFileSync('sample-record.pdf', Buffer.from(await blob.arrayBuffer()));
      }
    } catch (err) { problems.push('PDF: ' + err.message); }

    if (problems.length) {
      failures++;
      console.log(`FAIL ${label}${dep ? ' + depth' : ''} (${doc.verdict.name})`);
      problems.slice(0, 4).forEach((p) => console.log('       ' + p));
    }
  }
}

// two readers of one archetype must not receive the same report
const a = analyse(build(['O', 'F', 'W'], { O: 'first', F: 'first', W: 'first' }).core,
  build(['O', 'F', 'W'], { O: 'first', F: 'first', W: 'first' }).depth, { name: NAME });
const b = analyse(build(['O', 'F', 'W'], { O: 'second', F: 'second', W: 'second' }).core,
  build(['O', 'F', 'W'], { O: 'second', F: 'second', W: 'second' }).depth, { name: NAME });
const da = buildFivefold(a), db = buildFivefold(b);
const same = a.code === b.code;
const differs = JSON.stringify(da.pages) !== JSON.stringify(db.pages);
console.log(`\narchetypes reached : ${seen.size} of 31`);
console.log(`reports checked    : ${checked}`);
console.log(`facet variation    : same archetype ${same ? 'yes' : 'NO'}, different report ${differs ? 'yes' : 'NO'}`);
if (!same || !differs) failures++;
if (seen.size !== 31) { console.log('not every archetype was reached'); failures++; }
console.log(failures ? `\n${failures} failing` : '\nall reports passed');
process.exit(failures ? 1 : 0);
