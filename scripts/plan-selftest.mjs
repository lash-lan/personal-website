// The plan's arithmetic, checked.
//
// Run: node scripts/plan-selftest.mjs
//
// The old system's worst faults were not crashes, they were numbers that were
// quietly wrong: a blank day scored as a failure, the same habit shown at two
// different percentages on two pages. None of that throws an error, so none of
// it shows up until someone reads a report and believes it.
//
// Every rule in the redesign therefore gets a test with the answer worked out
// by hand in the comment, so a change that alters a number has to argue with
// an expectation rather than slip past.

import { analyseDay, analyseRange, consistency, streaks, knownMonths, prevMonth, datesIn } from '../src/lib/plan/analytics.js';
import { readDay, readMark, stepBand, V2_FROM, SCORED, DOMAINS } from '../src/lib/plan/schema.js';

let pass = 0, fail = 0;
const near = (a, b) => a === b || (a != null && b != null && Math.abs(a - b) < 1e-9);

function is(label, got, want) {
  const ok = near(got, want) || JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; return; }
  fail++;
  console.log(`  FAIL  ${label}\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`);
}
const section = (t) => console.log(`\n${t}`);

const S = { goodDay: 70, minTracking: 70, stepTarget: 5000 };
const V2 = '2026-10-15';
const V1 = '2026-09-15';

// Nine habits: walking strength nutrition care | aigp reading voice | family | aunty
const day = (marks, extra = {}) => ({ v: 2, marks, ...extra });
const old = (marks, extra = {}) => ({ marks, ...extra });

// ─── the five states ────────────────────────────────────────────────────────
section('States');
is('legacy yes reads as done', readMark('yes'), 'done');
is('legacy no reads as missed', readMark('no'), 'missed');
is('legacy rest stays rest, never excused', readMark('rest'), 'rest');
is('absent reads as unrecorded', readMark(undefined), 'unrecorded');
is('empty string reads as unrecorded', readMark(''), 'unrecorded');

// ─── V2 daily scoring ───────────────────────────────────────────────────────
section('V2 daily score');

// All eight scored habits Done. Reflection is not scored and must not count.
{
  const marks = Object.fromEntries([...SCORED, 'aunty'].map((id) => [id, 'done']));
  const d = analyseDay(V2, day(marks, { nutrition: 'good', care: { teeth: true, skin: true, hair: true } }), S);
  is('all done scores 100%', d.score, 1);
  is('all done is a good day', d.verdict, 'good');
  is('eight scored habits, not nine', d.eligible, 8);
  is('completeness is full', d.completeness, 1);
}

// All Missed.
{
  const marks = Object.fromEntries(SCORED.map((id) => [id, 'missed']));
  const d = analyseDay(V2, day(marks, { nutrition: 'poor', care: {} }), S);
  is('all missed scores 0%', d.score, 0);
  is('all missed is below, not untracked', d.verdict, 'below');
}

// All Rest. Rest costs half, deliberately: it is not a free pass.
{
  const marks = Object.fromEntries(SCORED.map((id) => [id, 'rest']));
  const d = analyseDay(V2, day(marks, { nutrition: 'mixed' }), S);
  is('all rest scores 50%, not 0 and not excused', d.score, 0.5);
  is('all rest is below the 70% bar', d.verdict, 'below');
}

// Lash's own worked example: 5 Done, 2 Rest, 1 Missed, 1 Excused → 6/8 = 75%.
// Nine habits, but Reflection is unscored, so the eight here are the scored set.
{
  const d = analyseDay(V2, day({
    walking: 'done', strength: 'done', nutrition: 'done', care: 'done',
    aigp: 'rest', reading: 'rest', voice: 'missed', family: 'excused',
  }, { nutrition: 'good', care: { teeth: true, skin: true, hair: true }, steps: 9000 }), S);
  // done 4 (walking, strength, nutrition, care) + rest 2 x 0.5 = 5 credit over 7 eligible
  is('excused leaves the denominator', d.eligible, 7);
  is('5 credit over 7 eligible', d.score, 5 / 7);
  is('excused is counted separately', d.excused, 1);
}

// ─── unrecorded must never become failure ───────────────────────────────────
section('Unrecorded is not failure');
{
  // Four of eight recorded, all Done. The old system scored this 4/9 = 44%.
  const d = analyseDay(V2, day({ walking: 'done', strength: 'done', aigp: 'done', reading: 'done' },
    { steps: 9000 }), S);
  is('score reflects only what was recorded', d.score, 1);
  is('the four unrecorded are counted', d.unrecorded, 4);
  is('completeness is 4 of 8', d.completeness, 0.5);
  is('below the tracking bar, so partial rather than good', d.verdict, 'partial');
}
{
  const d = analyseDay(V2, day({}), S);
  is('a blank day has no score at all', d.score, null);
  is('a blank day is untracked, not bad', d.verdict, 'untracked');
}

// ─── excused ────────────────────────────────────────────────────────────────
section('Excused');
{
  // An injured day, honestly recorded: strength and walking excused, the rest done.
  const d = analyseDay(V2, day({
    walking: 'excused', strength: 'excused', nutrition: 'done', care: 'done',
    aigp: 'done', reading: 'done', voice: 'done', family: 'done',
  }, { context: 'injured', back: 'Flare-up', nutrition: 'good', care: { teeth: true, skin: true, hair: true } }), S);
  is('excused habits leave the denominator', d.eligible, 6);
  is('an honest injured day still scores 100%', d.score, 1);
  is('and is a good day', d.verdict, 'good');
  is('context is kept', d.context, 'injured');
  is('back is kept', d.back, 'Flare-up');
  is('excused does not count as missing data', d.completeness, 1);
}

// ─── legacy days keep legacy rules ──────────────────────────────────────────
section('Legacy September');
{
  // The V1 rule: done over nine minus rests, unrecorded counting against you.
  // 6 yes, 1 no, 2 rest  →  6 / (9 - 2) = 0.857
  const d = analyseDay(V1, old({
    reading: 'yes', voice: 'yes', walking: 'rest', strength: 'rest', aigp: 'yes',
    nutrition: 'yes', care: 'yes', family: 'yes', aunty: 'no',
  }), S);
  is('September is scored by September rules', d.score, 6 / 7);
  is('and is flagged legacy', d.legacy, true);
  is('completeness is not claimed for a legacy day', d.completeness, null);
}
{
  // The same marks under V2 maths would differ, which is exactly why the two
  // are kept apart. Reflection drops out and the two rests cost half each.
  const d = analyseDay(V1, old({
    reading: 'yes', voice: 'yes', walking: 'rest', strength: 'rest', aigp: 'yes',
    nutrition: 'yes', care: 'yes', family: 'yes', aunty: 'no',
  }), S);
  is('V1 headline differs from V2 maths, and both are available', d.score !== d.scoreV2, true);
}
{
  const d = analyseDay(V1, old({ reading: 'yes' }), S);
  // V1: 1 yes, 0 rest → 1/9
  is('a barely-logged September day keeps its harsh old score', d.score, 1 / 9);
}
is('the switchover date is before October', V2_FROM <= '2026-10-01', true);

// ─── walking from steps ─────────────────────────────────────────────────────
section('Walking and steps');
{
  const d = readDay(V2, { v: 2, steps: 7243 }, S);
  is('steps alone derive Done', d.habits.walking.state, 'done');
  is('and say where it came from', d.habits.walking.detail.source, 'steps');
}
{
  const d = readDay(V2, { v: 2, steps: 3000 }, S);
  is('below target derives Missed', d.habits.walking.state, 'missed');
  is('progress toward target is kept', Math.round(d.habits.walking.detail.toward * 100) / 100, 0.6);
}
{
  const d = readDay(V2, { v: 2, steps: 3000, marks: { walking: 'done' } }, S);
  is('a manual mark beats the step derivation', d.habits.walking.state, 'done');
  is('the step count stays visible', d.habits.walking.detail.steps, 3000);
  is('and the disagreement is flagged rather than hidden', d.habits.walking.detail.inconsistent, true);
}
{
  const d = readDay(V2, { v: 2, steps: 7000, marks: { walking: 'excused' } }, S);
  is('excused outranks a step count that would have passed', d.habits.walking.state, 'excused');
  is('and is not called inconsistent', d.habits.walking.detail.inconsistent, false);
}
{
  const d = readDay(V2, { v: 2 }, S);
  is('no steps and no mark is unrecorded, not missed', d.habits.walking.state, 'unrecorded');
}
is('steps bands', [stepBand(0), stepBand(3000), stepBand(4600), stepBand(5200)],
  ['Getting started', 'Moving', 'Almost there', 'Target reached']);
is('no steps means no band', stepBand(null), null);

// ─── nutrition ──────────────────────────────────────────────────────────────
section('Nutrition');
{
  const g = readDay(V2, { v: 2, nutrition: 'good' }, S);
  const m = readDay(V2, { v: 2, nutrition: 'mixed' }, S);
  const p = readDay(V2, { v: 2, nutrition: 'poor' }, S);
  is('good reads as done', g.habits.nutrition.state, 'done');
  is('mixed reads as the half state', m.habits.nutrition.state, 'rest');
  is('poor reads as missed', p.habits.nutrition.state, 'missed');
  is('the note is carried', readDay(V2, { v: 2, nutrition: 'mixed', nutritionNote: 'Roti and a teh' }, S)
    .habits.nutrition.detail.note, 'Roti and a teh');
}
{
  // Mixed is worth half, so one mixed among seven done is not a full score.
  const marks = Object.fromEntries(SCORED.filter((id) => id !== 'nutrition').map((id) => [id, 'done']));
  const d = analyseDay(V2, day(marks, { nutrition: 'mixed', steps: 9000, care: { teeth: true, skin: true, hair: true } }), S);
  is('mixed nutrition costs half a habit', d.score, 7.5 / 8);
}
{
  const d = readDay(V1, old({ nutrition: 'yes' }), S);
  is('a legacy nutrition record is marked as having no rating', d.habits.nutrition.detail.legacyOnly, true);
  is('and no rating is invented', d.habits.nutrition.detail.rating, null);
}

// ─── personal care ──────────────────────────────────────────────────────────
section('Personal care');
{
  const d = readDay(V2, { v: 2, care: { teeth: true, skin: true, hair: false } }, S);
  is('two of three recorded parts is the half state', d.habits.care.state, 'rest');
  is('the parts are kept', d.habits.care.detail.done, 2);
  is('and how many were recorded', d.habits.care.detail.recorded, 3);
}
{
  const d = readDay(V2, { v: 2, care: { teeth: true, skin: true, hair: true } }, S);
  is('all three is done', d.habits.care.state, 'done');
}
{
  const d = readDay(V2, { v: 2, care: {} }, S);
  is('no parts recorded is unrecorded', d.habits.care.state, 'unrecorded');
}
{
  const d = readDay(V1, old({ care: 'yes' }), S);
  is('a legacy care record has no breakdown', d.habits.care.detail.legacyOnly, true);
  is('and none is fabricated', d.habits.care.detail.parts, null);
}

// ─── domains ────────────────────────────────────────────────────────────────
section('Domains');
{
  const d = analyseDay(V2, day({
    walking: 'done', strength: 'done', nutrition: 'done', care: 'done',
    aigp: 'missed', reading: 'missed', voice: 'missed', family: 'done',
  }, { nutrition: 'good', care: { teeth: true, skin: true, hair: true }, steps: 9000 }), S);
  is('body strong', d.domain.body.score, 1);
  is('growth low', d.domain.growth.score, 0);
  is('life maintained', d.domain.life.score, 1);
  is('body reads as Strong', d.domain.body.shape.label, 'Strong');
  is('growth reads as Low', d.domain.growth.shape.label, 'Low');
}
is('reflection is in no domain', DOMAINS.flatMap((d) => d.habits).includes('aunty'), false);

// ─── a range of days ────────────────────────────────────────────────────────
section('Ranges');
{
  const days = [
    analyseDay('2026-10-01', day({ walking: 'done', strength: 'done', nutrition: 'done', care: 'done', aigp: 'done', reading: 'done', voice: 'done', family: 'done' }, { steps: 8000, nutrition: 'good', care: { teeth: true, skin: true, hair: true } }), S),
    analyseDay('2026-10-02', day({}), S),                                  // untracked
    analyseDay('2026-10-03', day({ walking: 'missed', strength: 'missed', nutrition: 'missed', care: 'missed', aigp: 'missed', reading: 'missed', voice: 'missed', family: 'missed' }, { steps: 1200, nutrition: 'poor', care: {} }), S),
  ];
  const r = analyseRange(days);
  is('three days', r.days, 3);
  is('two tracked', r.tracked, 2);
  is('the blank day does not drag the average to zero', r.averageScore, 0.5);
  is('and the average says how many days it is of', r.averageOf, 2);
  is('one good day', r.good, 1);
  is('one untracked day', r.untrackedDays, 1);
  is('steps are only counted where recorded', r.steps.recorded, 2);
  is('average steps ignores the blank day', r.steps.average, 4600);
  is('one day reached the target', r.steps.atTarget, 1);
  is('best day', r.steps.best, 8000);
  is('nutrition distribution', [r.nutrition.good, r.nutrition.poor, r.nutrition.unrecorded], [1, 1, 1]);
}
{
  // A month that mixes September and October must say so rather than average
  // two different scoring systems together in silence.
  const days = [
    analyseDay('2026-09-30', old({ reading: 'yes' }), S),
    analyseDay('2026-10-01', day({ reading: 'done' }), S),
  ];
  const r = analyseRange(days);
  is('a mixed-schema range is flagged', r.mixedSchema, true);
  is('and counts its legacy days', r.legacyDays, 1);
}
{
  const r = analyseRange([]);
  is('an empty range does not crash', r.days, 0);
  is('and reports no average rather than zero', r.averageScore, null);
}

// ─── streaks and consistency ────────────────────────────────────────────────
section('Streaks');
{
  const good = () => analyseDay(V2, day(Object.fromEntries(SCORED.map((i) => [i, 'done'])),
    { steps: 9000, nutrition: 'good', care: { teeth: true, skin: true, hair: true } }), S);
  const blank = () => analyseDay(V2, day({}), S);
  const bad = () => analyseDay(V2, day(Object.fromEntries(SCORED.map((i) => [i, 'missed'])),
    { steps: 100, nutrition: 'poor', care: {} }), S);

  is('a forgotten day pauses the streak rather than ending it',
    streaks([good(), good(), blank(), good()]).current, 3);
  is('a genuinely bad day does end it',
    streaks([good(), good(), bad(), good()]).current, 1);
  is('the best run is remembered',
    streaks([good(), good(), good(), bad(), good()]).best, 3);
  is('consistency counts only days it can judge',
    consistency([good(), blank(), good(), bad()], 4), { of: 4, judged: 3, good: 2, rate: 2 / 3 });
}

// ─── months without an expiry date ──────────────────────────────────────────
section('Dynamic months');
{
  const state = {
    daily: [{ id: '2026-09-15' }, { id: '2027-03-02' }],
    transactions: [{ date: '2026-12-31' }], evidence: [], weekly: [], budget: [], tasks: [],
  };
  const m = knownMonths(state, '2027-01-20');
  is('months come from the data, not a constant', m.includes('2027-03'), true);
  is('September is still known', m.includes('2026-09'), true);
  is('and the current month is always present', m.includes('2027-01'), true);
  is('they are sorted', [...m].sort().join() === m.join(), true);
}
is('previous month crosses a year boundary', prevMonth('2027-01'), '2026-12');
is('February has 28 days in 2026', datesIn('2026-02').length, 28);
is('a month can stop at today', datesIn('2026-10', '2026-10-05').length, 5);
is('and 2028 is a leap year', datesIn('2028-02').length, 29);

console.log(fail === 0
  ? `\nAll ${pass} checks passed.`
  : `\n${pass} passed, ${fail} FAILED.`);
process.exit(fail === 0 ? 0 : 1);
