// Prints one report as plain text, for reading rather than testing.
//
//   node scripts/fivefold-inspect.mjs neutral
//   node scripts/fivefold-inspect.mjs OFW

import { QUESTIONS, ORDER } from '../src/data/fivefold.js';
import { analyse, DEPTH } from '../src/lib/fivefold-deep.js';
import { buildFivefold } from '../src/lib/fivefold-report.js';

const arg = (process.argv[2] || 'neutral').toUpperCase();
const answerFor = (q, v) => (q.reverse ? 6 - v : v);
const targets = ORDER.filter((k) => arg.includes(k));

const pick = (q) => (arg === 'NEUTRAL' ? 3 : targets.includes(q.calling) ? 5 : 1);
const core = QUESTIONS.map((q) => (arg === 'NEUTRAL' ? 3 : answerFor(q, pick(q))));
const depth = DEPTH.map((q) => (arg === 'NEUTRAL' ? 3 : answerFor(q, pick(q))));

const r = analyse(core, depth, { name: 'Lash' });
const doc = buildFivefold(r, { completedAt: '5 September 2026' });

const rule = (t) => console.log('\n' + t + '\n' + '-'.repeat(t.length));
console.log(`${doc.verdict.name}  (${doc.verdict.tier})   ${doc.verdict.motto}`);
console.log(`affinities: ${ORDER.map((k) => k + ' ' + r.display[k]).join('  ')}`);
console.log(`rule ${r.activationRule} | floor ${r.activationFloor} | tied ${r.tied} | ` +
  `nearest ${r.nearest ? r.nearest.name + ' gap ' + r.nearest.gap : 'none'} | ` +
  `ambiguous ${r.nearestAmbiguous} | contraction ${r.contraction ? r.contraction.name : 'none'}`);

for (const p of doc.pages) {
  rule(`${p.n}. ${p.title}`);
  (p.paras || []).forEach((t) => console.log('  ' + t.replace(/\*\*/g, '') + '\n'));
  if (p.bars) p.bars.forEach((b) => console.log(`  ${b.name.padEnd(12)} ${String(b.affinity).padStart(5)}  ${b.band}${b.active ? '  active' : ''}`));
  if (p.cards) p.cards.forEach((c) => console.log(`  ${c.label}: ${c.text}`));
  if (p.voices) { console.log('  ' + p.voicesTitle); p.voices.forEach((v) => console.log('    ' + v)); }
  if (p.flow) console.log('  pathway (' + p.pathwaySource + (p.flowCertain ? '' : ', not evidenced') + '): ' +
    p.flow.map((f) => f.name).join(' -> '));
  if (p.scales) p.scales.forEach((s) => console.log(`  ${s.low.padEnd(22)} ${String(s.value).padStart(3)}  ${s.high}`));
  if (p.scalesNote) console.log('\n  ' + p.scalesNote);
  if (p.perceptionPairs) p.perceptionPairs.forEach((x) => console.log(`  ${x.mean.padEnd(30)} -> ${x.hear}`));
  if (p.sequence) p.sequence.forEach((s) => console.log(`  ${s.label.padEnd(10)} ${s.terms.map((t) => (t.calling ? t.calling + ': ' : '') + t.term).join('  |  ')}`));
  ['ideal', 'bad', 'party', 'growth'].forEach((k) => (p[k] || []).forEach((t) => console.log('  - ' + t)));
  if (p.stability) console.log(`\n  ${p.stability.title.toUpperCase()}\n  ${p.stability.text}`);
  if (p.closing) console.log('\n  ' + p.closing);
  if (p.technical) { console.log(''); p.technical.forEach((t) => console.log('  . ' + t)); }
}
console.log(`\nwords ${doc.words}`);
