// Builds a full record, on screen and as a PDF, for a spread of answer
// patterns. Catches missing copy and characters the PDF fonts cannot draw.
//
//   node scripts/fivefold-record-test.mjs

import { writeFileSync } from 'node:fs';
import { QUESTIONS } from '../src/data/fivefold.js';
import { analyse, DEPTH } from '../src/lib/fivefold-deep.js';
import { buildFivefold } from '../src/lib/fivefold-report.js';
import { buildTrialRecord } from '../src/lib/trial-report.js';

// pdf-lib wants a Blob, which older Node does not put on the global.
if (typeof Blob === 'undefined') {
  const { Blob } = await import('node:buffer');
  globalThis.Blob = Blob;
}

const PATTERNS = [
  ['every answer neutral', () => 3],
  ['Oath and Watch strong', (q) => (q.calling === 'O' || q.calling === 'W' ? 5 : 2)],
  ['all five strong', () => 5],
  ['all five quiet', () => 1],
  ['Hearth alone', (q) => (q.calling === 'H' ? 5 : 2)],
  ['leaning Forge', (q) => (q.calling === 'F' ? 5 : q.calling === 'V' ? 4 : 3)],
];

let failures = 0;
for (const [label, pick] of PATTERNS) {
  for (const withDepth of [true, false]) {
    const core = QUESTIONS.map((q) => (q.reverse ? 6 - pick(q) : pick(q)));
    const dep = withDepth ? DEPTH.map((q) => (q.reverse ? 6 - pick(q) : pick(q))) : null;
    const tag = `${label}${withDepth ? ' + depth' : ''}`;
    try {
      const r = analyse(core, dep, { name: 'Lash' });
      const doc = buildFivefold(r, { completedAt: '5 September 2026' });

      if (doc.pages.length !== 8) throw new Error(`${doc.pages.length} pages, expected 8`);
      const empty = doc.pages.filter((p) => !p.title ||
        (!(p.paras || []).length && !(p.bars || []).length && !(p.cards || []).length));
      if (empty.length) throw new Error('empty page: ' + empty.map((p) => p.n).join(', '));

      // counted over the prose only, not verdict.reader, which is a field
      const text = JSON.stringify(doc.pages);
      const uses = (text.match(/Lash/g) || []).length;
      if (uses < 3 || uses > 6) throw new Error(`name used ${uses} times, guide asks for 3 to 6`);
      const bad = text.match(/[—–;]/g);
      if (bad) throw new Error('em dash or semicolon in copy: ' + bad.length);
      if (/undefined|\[object|NaN/.test(text)) throw new Error('placeholder leaked into copy');

      const blob = await buildTrialRecord(doc, r);
      const kb = Math.round(blob.size / 102.4) / 10;
      console.log(`ok  ${tag.padEnd(30)} ${doc.verdict.name.padEnd(24)} ` +
        `${String(doc.words).padStart(4)} words  ${kb} kB`);
      if (tag === 'Oath and Watch strong + depth') {
        writeFileSync('sample-record.pdf', Buffer.from(await blob.arrayBuffer()));
      }
    } catch (err) {
      failures++;
      console.log(`FAIL ${tag}: ${err.message}`);
    }
  }
}
console.log(failures ? `\n${failures} failing` : '\nall patterns passed');
process.exit(failures ? 1 : 0);
