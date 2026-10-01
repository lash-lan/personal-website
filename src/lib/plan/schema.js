// What a day means, in one place.
//
// The plan has two generations of daily record and will keep both forever.
//
// V1 is September. Rest was free: it left the denominator entirely, so a day
// of nine Rests scored 0/1. Unrecorded was punished: the denominator was a
// fixed nine, so forgetting to tap and failing came to the same number.
//
// V2 is everything from the switchover. Rest costs half, because Lash knows he
// will reach for it as an excuse. Excused is the real exception and leaves the
// denominator. Unrecorded leaves the behavioural score altogether and is
// counted separately as missing information, because not knowing is not the
// same as failing.
//
// A V1 day is NEVER rescored under V2 rules. September happened under the old
// contract and keeps it. Anything that compares across the boundary has to say
// so rather than pretend the numbers are the same kind of thing.

import { HABITS } from './seed.js';

/** The date V2 scoring begins. Days before this keep V1 rules forever. */
export const V2_FROM = '2026-10-01';

export const SCHEMA = { V1: 1, V2: 2 };

/** Which generation a stored record belongs to. */
export const versionOf = (rec, date) =>
  rec?.v === 2 ? SCHEMA.V2 : rec?.v === 1 ? SCHEMA.V1 : (date >= V2_FROM ? SCHEMA.V2 : SCHEMA.V1);

// ─── the five states ────────────────────────────────────────────────────────

export const STATE = {
  done:       { id: 'done',       label: 'Done',       glyph: '✓', weight: 1,    counts: true },
  rest:       { id: 'rest',       label: 'Rest',       glyph: '◐', weight: 0.5,  counts: true },
  missed:     { id: 'missed',     label: 'Missed',     glyph: '✗', weight: 0,    counts: true },
  excused:    { id: 'excused',    label: 'Excused',    glyph: '–', weight: null, counts: false },
  unrecorded: { id: 'unrecorded', label: 'Unrecorded', glyph: '·', weight: null, counts: false },
};
export const STATES = ['done', 'rest', 'missed', 'excused'];   // the four you can choose

/** The old words, as they are still stored in September's rows. */
const LEGACY = { yes: 'done', no: 'missed', rest: 'rest' };

/**
 * Read a stored mark as one of the five states.
 * A V1 'rest' stays Rest. It is never promoted to Excused: the old records
 * cannot tell the difference between choosing not to and being unable to.
 */
export const readMark = (raw) =>
  raw == null || raw === '' ? 'unrecorded'
    : STATE[raw] ? raw
    : LEGACY[raw] ?? 'unrecorded';

// ─── the three domains ──────────────────────────────────────────────────────
//
// Reflection sits outside them on purpose. It is worth recording and worth
// reading, and it is not a wellbeing behaviour to be marked out of ten.

export const DOMAINS = [
  { id: 'body',   label: 'Body',   habits: ['walking', 'strength', 'nutrition', 'care'] },
  { id: 'growth', label: 'Growth', habits: ['aigp', 'reading', 'voice'] },
  { id: 'life',   label: 'Life',   habits: ['family'] },
];
export const SCORED = DOMAINS.flatMap((d) => d.habits);
export const UNSCORED = ['aunty'];                  // Reflection / Aunty check-in
export const domainOf = (id) => DOMAINS.find((d) => d.habits.includes(id))?.id ?? null;

export const DAY_CONTEXTS = ['normal', 'injured', 'sick', 'travel', 'exceptional'];

/** Habits a context makes it reasonable to excuse. Only ever a suggestion. */
export const SUGGEST_EXCUSE = {
  injured: ['walking', 'strength'],
  sick: ['walking', 'strength'],
  travel: [],
  exceptional: [],
  normal: [],
};
/** The same, from the back field, which until now was recorded and ignored. */
export const BACK_SUGGESTS = { Sore: ['strength'], 'Flare-up': ['walking', 'strength'] };

// ─── nutrition ──────────────────────────────────────────────────────────────

export const NUTRITION = {
  good:  { id: 'good',  label: 'Good',  weight: 1 },
  mixed: { id: 'mixed', label: 'Mixed', weight: 0.5 },
  poor:  { id: 'poor',  label: 'Poor',  weight: 0 },
};
export const NUTRITION_ORDER = ['good', 'mixed', 'poor'];

export const CARE_PARTS = [
  { id: 'teeth', label: 'Teeth' },
  { id: 'skin', label: 'Skin' },
  { id: 'hair', label: 'Hair' },
];

// ─── reading one day ────────────────────────────────────────────────────────

/**
 * Everything about a single day, in the shape the rest of the system uses.
 * Nothing here writes, guesses or fills a gap: a thing that was not recorded
 * comes back as unrecorded and says so.
 */
export function readDay(date, rec, settings = {}) {
  const v = versionOf(rec, date);
  const legacy = v === SCHEMA.V1;
  const stepTarget = Number(settings.stepTarget) || 5000;
  const marks = rec?.marks ?? {};
  const out = { date, v, legacy, rec: rec ?? null, habits: {}, missing: [] };

  for (const h of HABITS) {
    const id = h.id;
    let state = readMark(marks[id]);
    let detail = null;

    // Walking: an explicit mark always wins, steps only fill a gap.
    if (id === 'walking') {
      const steps = rec?.steps === '' || rec?.steps == null ? null : Number(rec.steps);
      const fromSteps = steps == null ? null : steps >= stepTarget ? 'done' : 'missed';
      const manual = state !== 'unrecorded';
      if (!manual && fromSteps) state = fromSteps;
      detail = {
        steps, target: stepTarget,
        toward: steps == null ? null : Math.min(1, steps / stepTarget),
        source: manual ? 'manual' : fromSteps ? 'steps' : null,
        // Said plainly rather than silently corrected, so Lash and Amelia can
        // both see it and decide what it means.
        inconsistent: Boolean(manual && fromSteps && state !== fromSteps && state !== 'excused'),
      };
    }

    // Nutrition: three-state from V2, the old yes/no from V1.
    if (id === 'nutrition') {
      if (!legacy && rec?.nutrition) {
        state = rec.nutrition === 'good' ? 'done' : rec.nutrition === 'poor' ? 'missed' : 'rest';
        detail = { rating: rec.nutrition, note: rec.nutritionNote ?? '', legacyOnly: false };
      } else if (state !== 'unrecorded') {
        detail = { rating: null, note: rec?.nutritionNote ?? '', legacyOnly: true };
      } else {
        detail = { rating: null, note: '', legacyOnly: legacy };
      }
    }

    // Personal care: three parts from V2, one tick from V1.
    if (id === 'care') {
      const parts = rec?.care ?? null;
      if (!legacy && parts && typeof parts === 'object') {
        const recorded = CARE_PARTS.filter((p) => parts[p.id] != null);
        const done = recorded.filter((p) => parts[p.id] === true).length;
        if (state !== 'excused') {
          state = recorded.length === 0 ? 'unrecorded'
            : done === recorded.length ? 'done' : done === 0 ? 'missed' : 'rest';
        }
        detail = { parts, done, recorded: recorded.length, legacyOnly: false };
      } else {
        detail = { parts: null, done: null, recorded: null, legacyOnly: true };
      }
    }

    out.habits[id] = { id, name: h.name, target: h.target, icon: h.icon, state, detail, domain: domainOf(id) };
    if (state === 'unrecorded' && SCORED.includes(id)) out.missing.push(id);
  }

  out.context = rec?.context ?? 'normal';
  out.back = rec?.back ?? '';
  out.notes = rec?.notes ?? '';
  out.reflection = rec?.reflection ?? '';
  out.familyNote = rec?.familyNote ?? '';
  out.priorities = Array.isArray(rec?.priorities) ? rec.priorities.slice(0, 3) : [];
  out.steps = rec?.steps === '' || rec?.steps == null ? null : Number(rec.steps);
  out.hasAnything = Object.values(marks).some(Boolean) || out.steps != null
    || Boolean(rec?.nutrition || rec?.care || rec?.reflection || rec?.notes);
  return out;
}

/** What a step count deserves to be called, short of the target. */
export const STEP_BANDS = [
  { from: 0,    label: 'Getting started' },
  { from: 2500, label: 'Moving' },
  { from: 4500, label: 'Almost there' },
  { from: 1,    label: 'Target reached', atTarget: true },
];
export function stepBand(steps, target = 5000) {
  if (steps == null) return null;
  if (steps >= target) return 'Target reached';
  const frac = steps / target;
  return frac >= 0.9 ? 'Almost there' : frac >= 0.5 ? 'Moving' : 'Getting started';
}
