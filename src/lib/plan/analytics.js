// The one place a number is worked out.
//
// The old system had three different answers to "how is Reading going": the
// Daily page divided by every past day except Rest days, the monthly report
// divided by the days actually marked, and the dashboard average treated a
// blank day as a zero. Same data, three percentages, no label saying which was
// which. Everything now comes from here instead, so the screens cannot
// disagree.
//
// Two ideas run through all of it.
//
// A behavioural score says how the recorded behaviour went. Tracking
// completeness says how much of the day is actually known. They are reported
// side by side and never folded into one number, because "I did badly" and
// "I did not write it down" are different facts and only one of them is about
// behaviour.
//
// And a V1 day is scored by V1 rules, forever. See schema.js.

import { HABITS } from './seed.js';
import {
  STATE, SCHEMA, DOMAINS, SCORED, readDay, versionOf, readMark, NUTRITION,
} from './schema.js';
import { monthOf } from './engine-dates.js';

// ─── one day ────────────────────────────────────────────────────────────────

/**
 * September's rule, kept exactly as it was: Done over nine minus the Rests,
 * with anything unrecorded counting against you. Preserved rather than
 * reimplemented so the old numbers stay reproducible.
 */
function scoreV1(rec) {
  const marks = Object.values(rec?.marks ?? {}).filter(Boolean);
  if (!marks.length) return null;
  const rest = marks.filter((m) => m === 'rest').length;
  const yes = marks.filter((m) => m === 'yes').length;
  return yes / Math.max(1, HABITS.length - rest);
}

/** The V2 rule, over whichever habits are asked for. */
function scoreV2(day, ids) {
  let credit = 0, eligible = 0, recorded = 0, excused = 0, unrecorded = 0;
  for (const id of ids) {
    const st = day.habits[id]?.state ?? 'unrecorded';
    if (st === 'excused') { excused++; continue; }
    if (st === 'unrecorded') { unrecorded++; continue; }
    // Nutrition is three-state, so it contributes its own weight rather than
    // being flattened to done-or-not.
    const weight = id === 'nutrition' && day.habits[id].detail?.rating
      ? NUTRITION[day.habits[id].detail.rating].weight
      : STATE[st].weight;
    credit += weight;
    eligible++; recorded++;
  }
  return {
    score: eligible ? credit / eligible : null,
    credit, eligible, recorded, excused, unrecorded,
    // How much of what could have been recorded, was.
    completeness: (recorded + excused + unrecorded) > 0
      ? (recorded + excused) / (recorded + excused + unrecorded) : 0,
  };
}

/**
 * A whole day: its domains, its behavioural score, how complete it is, and
 * whether it clears the bar.
 */
export function analyseDay(date, rec, s) {
  const day = readDay(date, rec, s);
  const legacy = day.v === SCHEMA.V1;

  const domains = DOMAINS.map((d) => {
    const r = scoreV2(day, d.habits);
    return { ...d, ...r, shape: shapeOf(r) };
  });

  const overall = scoreV2(day, SCORED);
  const score = legacy ? scoreV1(rec) : overall.score;

  const minComplete = (Number(s.minTracking) || 70) / 100;
  const bar = (Number(s.goodDay) || 70) / 100;
  const enough = legacy ? score !== null : overall.completeness >= minComplete;

  return {
    ...day,
    domains,
    domain: Object.fromEntries(domains.map((d) => [d.id, d])),
    score,                               // the headline, scored by its own era
    scoreV2: overall.score,              // always V2 maths, for internal comparison
    completeness: legacy ? null : overall.completeness,
    recorded: overall.recorded, excused: overall.excused, unrecorded: overall.unrecorded,
    eligible: overall.eligible,
    scoredHabits: SCORED.length,
    enough,
    // Three outcomes, not two. A day nobody wrote down is not a bad day.
    verdict: score === null ? 'untracked'
      : !enough ? 'partial'
      : score >= bar ? 'good' : 'below',
  };
}

/** Four filled dots at most, so a domain can be read without a percentage. */
function shapeOf(r) {
  if (r.score === null) return { filled: 0, of: 0, label: 'Unrecorded' };
  const of = Math.min(4, Math.max(1, r.eligible));
  const filled = Math.round(r.score * of);
  const label = r.score >= 0.85 ? 'Strong' : r.score >= 0.6 ? 'Steady'
    : r.score >= 0.35 ? 'Patchy' : 'Low';
  return { filled, of, label };
}

// ─── a stretch of days ──────────────────────────────────────────────────────

/**
 * Summarise any run of days: a week, a month, the last seven. Everything a
 * report or a trend needs, worked out once.
 */
export function analyseRange(days) {
  const tracked = days.filter((d) => d.score !== null);
  const scored = days.filter((d) => d.enough && d.score !== null);
  const legacyDays = days.filter((d) => d.legacy).length;

  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  const steps = days.map((d) => d.steps).filter((x) => x != null && !Number.isNaN(x));
  const target = days.find((d) => d.habits.walking?.detail?.target)?.habits.walking.detail.target ?? 5000;

  const nutrition = { good: 0, mixed: 0, poor: 0, unrecorded: 0, legacy: 0 };
  for (const d of days) {
    const n = d.habits.nutrition;
    if (!n) continue;
    if (n.detail?.rating) nutrition[n.detail.rating]++;
    else if (n.detail?.legacyOnly && n.state !== 'unrecorded') nutrition.legacy++;
    else if (n.state === 'unrecorded') nutrition.unrecorded++;
  }

  const states = { done: 0, rest: 0, missed: 0, excused: 0, unrecorded: 0 };
  for (const d of days) for (const id of SCORED) states[d.habits[id]?.state ?? 'unrecorded']++;

  return {
    days: days.length,
    tracked: tracked.length,
    untracked: days.length - tracked.length,
    legacyDays,
    mixedSchema: legacyDays > 0 && legacyDays < days.length,
    // Only days complete enough to mean something go into the average, and the
    // count that went in is reported beside it.
    averageScore: mean(scored.map((d) => d.score)),
    averageOf: scored.length,
    completeness: mean(days.filter((d) => d.completeness != null).map((d) => d.completeness)),
    good: days.filter((d) => d.verdict === 'good').length,
    below: days.filter((d) => d.verdict === 'below').length,
    partial: days.filter((d) => d.verdict === 'partial').length,
    untrackedDays: days.filter((d) => d.verdict === 'untracked').length,
    domains: Object.fromEntries(DOMAINS.map((dm) => [dm.id,
      mean(days.map((d) => d.domain[dm.id].score).filter((x) => x != null))])),
    habits: Object.fromEntries(SCORED.map((id) => {
      const seen = days.map((d) => d.habits[id]).filter(Boolean);
      const counted = seen.filter((hh) => hh.state !== 'excused' && hh.state !== 'unrecorded');
      const credit = counted.reduce((a, hh) => a + (STATE[hh.state].weight ?? 0), 0);
      return [id, {
        rate: counted.length ? credit / counted.length : null,
        done: seen.filter((hh) => hh.state === 'done').length,
        rest: seen.filter((hh) => hh.state === 'rest').length,
        missed: seen.filter((hh) => hh.state === 'missed').length,
        excused: seen.filter((hh) => hh.state === 'excused').length,
        unrecorded: seen.filter((hh) => hh.state === 'unrecorded').length,
        counted: counted.length,
      }];
    })),
    steps: {
      recorded: steps.length,
      total: steps.reduce((a, b) => a + b, 0),
      average: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null,
      best: steps.length ? Math.max(...steps) : null,
      atTarget: steps.filter((x) => x >= target).length,
      target,
    },
    nutrition,
    states,
    contexts: days.reduce((acc, d) => { acc[d.context] = (acc[d.context] || 0) + 1; return acc; }, {}),
  };
}

/**
 * Consistency rather than perfection: how much of the last N days were good,
 * counting only days that were tracked well enough to judge.
 */
export function consistency(days, n) {
  const slice = days.slice(-n);
  const judged = slice.filter((d) => d.verdict === 'good' || d.verdict === 'below');
  return {
    of: n,
    judged: judged.length,
    good: judged.filter((d) => d.verdict === 'good').length,
    rate: judged.length ? judged.filter((d) => d.verdict === 'good').length / judged.length : null,
  };
}

/**
 * Streaks that do not punish a missing record.
 *
 * An untracked day pauses the run rather than ending it. A day that was
 * genuinely below the bar ends it. This is the difference between "you stopped"
 * and "you forgot to write it down", which the old streak could not tell apart.
 */
export function streaks(days) {
  let current = 0, best = 0, run = 0;
  for (const d of days) {
    if (d.verdict === 'good') { run++; best = Math.max(best, run); }
    else if (d.verdict === 'below') run = 0;
    // 'untracked' and 'partial' neither extend nor break it
  }
  for (let i = days.length - 1; i >= 0; i--) {
    const v = days[i].verdict;
    if (v === 'good') current++;
    else if (v === 'below') break;
  }
  return { current, best };
}

// ─── months, without an expiry date ─────────────────────────────────────────

/**
 * Which months the plan knows about. Worked out from the data rather than
 * hard-coded, so the system keeps going into 2027 and beyond without anyone
 * editing a constant.
 */
export function knownMonths(state, now) {
  const seen = new Set([monthOf(now)]);
  const add = (d) => { if (typeof d === 'string' && d.length >= 7) seen.add(d.slice(0, 7)); };
  for (const r of state.daily ?? []) add(r.id);
  for (const r of state.transactions ?? []) add(r.date);
  for (const r of state.evidence ?? []) add(r.date);
  for (const r of state.weekly ?? []) add(r.id);
  for (const r of state.budget ?? []) add(r.id);
  for (const t of state.tasks ?? []) { add(t.start); add(t.end); }
  return [...seen].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
}

/** The month before a given one, across a year boundary. */
export const prevMonth = (m) => {
  const [y, mm] = m.split('-').map(Number);
  return mm === 1 ? `${y - 1}-12` : `${y}-${String(mm - 1).padStart(2, '0')}`;
};

export const daysInMonth = (m) => {
  const [y, mm] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mm, 0)).getUTCDate();
};

/** Every date in a month, up to and including `until` if it falls inside. */
export function datesIn(month, until) {
  const out = [];
  const n = daysInMonth(month);
  for (let i = 1; i <= n; i++) {
    const d = `${month}-${String(i).padStart(2, '0')}`;
    if (until && d > until) break;
    out.push(d);
  }
  return out;
}
