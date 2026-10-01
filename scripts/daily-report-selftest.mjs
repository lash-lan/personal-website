// The daily report, checked.
//
// Run: node scripts/daily-report-selftest.mjs
//
// A report is worse than no report if it is wrong, and worse again if it is
// confidently wrong about a day nobody recorded. The things that can go wrong
// here are not arithmetic, they are presence and honesty: a note silently
// dropped, an unrecorded habit printed as a failure, a page that throws on an
// empty day so the one day Lash most wants to explain is the one he cannot
// export.
//
// So these tests build real PDFs from real analysis and then read the words
// back out of the finished files, rather than checking the data that went in.
// A sentence that is composed and never drawn fails here.

import { inflateSync } from 'node:zlib';
import { analyse } from '../src/lib/plan/engine.js';
import { buildDailyReport } from '../src/lib/plan/daily-report.js';
import { seedRecords, SETTINGS, COLLECTIONS } from '../src/lib/plan/seed.js';

let pass = 0, fail = 0;
function is(label, got, want) {
  if (got === want || JSON.stringify(got) === JSON.stringify(want)) { pass++; return; }
  fail++;
  console.log(`  FAIL  ${label}\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`);
}
function ok(label, cond) { is(label, Boolean(cond), true); }
const section = (t) => console.log(`\n${t}`);

// ─── a plan to report on ────────────────────────────────────────────────────

const state = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
Object.assign(state, seedRecords());
state.settings = [{ id: 'main', ...SETTINGS }];
for (const c of ['daily', 'transactions', 'evidence', 'weekly', 'kpis']) state[c] = [];

const NOW = '2026-10-20';
const put = (rec) => { state.daily = state.daily.filter((r) => r.id !== rec.id).concat(rec); };

/**
 * Build the PDF and give back both its size and the words actually inside it.
 *
 * pdf-lib compresses its streams, so every deflated stream in the file is
 * inflated and the drawn strings are pulled out of the page operators. Reading
 * the finished file rather than the data that went into it is the point: it
 * catches a sentence that was composed but never drawn.
 */
async function render(date, opts) {
  const a = analyse(state, NOW);
  const { blob, filename } = await buildDailyReport(a, date, opts);
  const bytes = Buffer.from(new Uint8Array(await blob.arrayBuffer()));
  const latin = bytes.toString('latin1');
  let streams = '';
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(latin)) !== null) {
    const start = m.index + m[0].length;
    const end = latin.indexOf('endstream', start);
    if (end < 0) continue;
    try { streams += `${inflateSync(bytes.subarray(start, end)).toString('latin1')}\n`; } catch { /* not deflated */ }
  }
  // pdf-lib writes each drawn string as a hex literal followed by Tj.
  const words = [...streams.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)]
    .map((x) => Buffer.from(x[1], 'hex').toString('latin1'));
  return { filename, size: bytes.length, text: words.join(' ') };
}
const has = (text, s) => text.includes(s);

// ─── a day nobody recorded ──────────────────────────────────────────────────
section('A day with nothing in it');
{
  const r = await render('2026-10-05');
  ok('it still produces a file', r.size > 1000);
  is('named after the day', r.filename, 'daily-2026-10-05.pdf');
  ok('says nothing was logged', has(r.text, 'Nothing was logged'));
  ok('does not call it a bad day', !has(r.text, 'Below the standard'));
  ok('reports the record as absent', has(r.text, 'no record exists'));
  ok('still carries the provenance section', has(r.text, 'WHERE THESE NUMBERS CAME FROM'));
}

// ─── a full day, with his own words ─────────────────────────────────────────
section('A full day');
{
  put({
    id: '2026-10-06', v: 2,
    marks: { walking: 'done', strength: 'done', care: 'done', aigp: 'done', reading: 'done', voice: 'rest', family: 'done', aunty: 'done' },
    steps: 7400,
    nutrition: 'good', nutritionNote: 'Grilled fish, rice, a lot of greens.',
    care: { teeth: true, skin: true, hair: true },
    familyNote: 'Called Dad in the evening, he sounded better.',
    reflection: 'A steady day.\nThe back held up through the whole walk, which it has not done in weeks.',
    notes: 'Two deploys went out clean.',
    priorities: [{ text: 'Finish the export', done: true }, { text: 'Ring the clinic', done: false }],
    context: 'normal', back: 'Good',
    updatedAt: Date.UTC(2026, 9, 6, 13, 30),
  });
  const r = await render('2026-10-06');

  // The whole point of the document: his words, not a summary of them.
  ok('the reflection is reproduced', has(r.text, 'The back held up through the whole walk'));
  ok('its second line survives too', has(r.text, 'A steady day'));
  ok('the note is reproduced', has(r.text, 'Two deploys went out clean'));
  ok('the family note is reproduced', has(r.text, 'Called Dad in the evening'));
  ok('what he ate is reproduced', has(r.text, 'Grilled fish'));
  ok('both priorities appear', has(r.text, 'Finish the export') && has(r.text, 'Ring the clinic'));

  // The working, not just the answer.
  ok('the step count is shown', has(r.text, '7,400'));
  ok('the scoring era is named', has(r.text, 'the current rules'));
  ok('the behaviour sum is shown', has(r.text, 'counted habit'));
  ok('the completeness sum is shown', has(r.text, 'Day known'));
  ok('rest is explained as a half', has(r.text, 'Rest counts a half'));
  ok('reflection is declared unscored', has(r.text, 'recorded and never scored'));
  ok('the record is identified', has(r.text, 'daily/2026-10-06'));
}

// ─── a half-recorded day must not read as a bad one ─────────────────────────
section('A partly recorded day');
{
  put({ id: '2026-10-07', v: 2, marks: { walking: 'done', reading: 'done' } });
  const r = await render('2026-10-07');
  ok('called partial, not bad', has(r.text, 'Partially recorded'));
  ok('says the blanks were left out of the score', has(r.text, 'missing information'));
  ok('does not call it below the standard', !has(r.text, 'Below the standard set'));
}

// ─── an excused day ─────────────────────────────────────────────────────────
section('Excused habits');
{
  put({
    id: '2026-10-08', v: 2, context: 'injured', back: 'Flare-up',
    marks: { walking: 'excused', strength: 'excused', care: 'done', aigp: 'done', reading: 'done', voice: 'done', family: 'done' },
    nutrition: 'good', care: { teeth: true, skin: true, hair: true },
  });
  const r = await render('2026-10-08');
  ok('the kind of day is carried', has(r.text, 'Injured'));
  ok('excused is explained', has(r.text, 'leaves the sum entirely'));
  ok('a good day is still possible while injured', has(r.text, 'A good day'));
}

// ─── walking: the mark and the steps disagreeing ────────────────────────────
section('When the mark and the steps disagree');
{
  put({ id: '2026-10-09', v: 2, marks: { walking: 'done' }, steps: 900 });
  const r = await render('2026-10-09');
  ok('the disagreement is printed, not corrected', has(r.text, 'The two disagree'));
  ok('both figures are shown', has(r.text, '900'));
  ok('the hand-set mark is named as the source', has(r.text, 'set by hand'));
}

// ─── September keeps its own rules ──────────────────────────────────────────
section('A day under the old rules');
{
  put({ id: '2026-09-15', marks: { reading: 'yes', voice: 'yes', walking: 'no', rest: 'rest' } });
  const r = await render('2026-09-15');
  ok('the old era is named', has(r.text, 'the original rules'));
  ok('it says the numbers are not comparable', has(r.text, 'not directly comparable'));
  ok('it refuses to re-score the day', has(r.text, 'never re-scored'));
}

// ─── money, on and off ──────────────────────────────────────────────────────
section('Finances');
{
  state.transactions = [
    { id: 't1', date: '2026-10-06', item: 'Food', amount: 42.5, account: 'Maybank', remarks: 'Groceries for the week' },
    { id: 't2', date: '2026-10-06', item: 'Salary', amount: 5000, account: 'Maybank', remarks: '' },
  ];
  const on = await render('2026-10-06', { finances: true });
  ok('items are listed when the setting is on', has(on.text, 'Groceries for the week'));
  ok('the amount is shown', has(on.text, 'RM43') || has(on.text, 'RM42'));

  const off = await render('2026-10-06', { finances: false });
  ok('items are withheld when the setting is off', !has(off.text, 'Groceries for the week'));
  ok('but the count is still declared', has(off.text, '2 transactions'));
  ok('and the withholding is declared in the provenance', has(off.text, 'turned off for this report'));
}

// ─── the words used for a half ──────────────────────────────────────────────
section('Calling a half by its right name');
{
  put({ id: '2026-10-11', v: 2, marks: { reading: 'done' }, nutrition: 'mixed', care: { teeth: true, skin: true, hair: false } });
  const r = await render('2026-10-11');
  // Both of these score a half, and both were being labelled "Rest", which
  // reads as a day off from eating rather than a mixed meal.
  ok('a mixed meal is called Mixed', has(r.text, 'Mixed'));
  ok('a part-done care routine is counted, not called Rest', has(r.text, '2 of 3'));
  ok('the half credit is still explained', has(r.text, 'counts as a half'));
}

// ─── money moved is not money spent ─────────────────────────────────────────
section('Savings are not spending');
{
  state.transactions = [
    { id: 'm1', date: '2026-10-12', item: 'Food', amount: 40, account: 'Maybank', remarks: '' },
    { id: 'm2', date: '2026-10-12', item: 'Emergency Fund (Add)', amount: 500, account: 'Maybank', remarks: '' },
    { id: 'm3', date: '2026-10-12', item: 'Salary', amount: 5000, account: 'Maybank', remarks: '' },
  ];
  put({ id: '2026-10-12', v: 2, marks: { reading: 'done' } });
  const r = await render('2026-10-12');
  ok('money in is reported on its own', has(r.text, 'Came in'));
  ok('money into a fund is reported on its own', has(r.text, 'Moved into funds'));
  // RM540 would mean the RM500 transfer had been counted as spending.
  ok('the RM500 transfer is not added to spending', !has(r.text, 'RM540'));
  ok('spending is only the RM40', has(r.text, 'RM40'));
  state.transactions = [];
}

// ─── a day still in progress ────────────────────────────────────────────────
section('Today, still running');
{
  put({ id: NOW, v: 2, marks: { reading: 'done' } });
  const r = await render(NOW);
  ok('says the day was not over', has(r.text, 'still in progress'));
  ok('and records that in the provenance', has(r.text, 'still running'));
}

// ─── something very long must not break the layout ──────────────────────────
section('A very long entry');
{
  const long = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}: something worth remembering about the day.`).join('\n');
  put({ id: '2026-10-10', v: 2, marks: { reading: 'done' }, reflection: long, notes: long });
  const r = await render('2026-10-10');
  ok('it is written out in full', has(r.text, 'Line 120:'));
  ok('the provenance still follows it', has(r.text, 'WHERE THESE NUMBERS CAME FROM'));
  ok('the file is a sane size', r.size > 5000 && r.size < 2_000_000);
}

// ─── a date outside the plan ────────────────────────────────────────────────
section('A date the plan does not have');
{
  let message = '';
  try { await render('2001-01-01'); } catch (e) { message = e.message; }
  ok('it refuses clearly rather than inventing a day', message.includes('no day 2001-01-01'));
}

console.log(`\n${fail ? `${fail} FAILED, ` : ''}All ${pass} checks ${fail ? 'attempted' : 'passed'}.`);
process.exit(fail ? 1 : 0);
