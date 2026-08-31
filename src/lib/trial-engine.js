// The Trial's scoring, kept free of any DOM so it can be tested on its own.
//
// Rules, exactly as specified:
//   every main choice gives +3 to one Calling and +1 to another
//   Resonance   = min(100, round(raw / 30 * 100))
//   Active      = raw / top >= 0.75, and the top Calling is always Active
//   Borderline  = an inactive Calling within 1 raw point of the cutoff
//   mask        = sum of the codes of the Active Callings, O1 H2 F4 V8 W16
//   The Crucible is counted separately and never touches the mask.

import { CALLINGS, ORDER, QUESTIONS, ARCHETYPES, TIERS, DECIDE,
         CRUCIBLE_READING, CRUCIBLE_HYBRID, CRUCIBLE_CAVEAT } from '../data/trial.js';

export const ACTIVE_RATIO = 0.75;

/** Answers are stored by Trial index, so returning to a Trial replaces its
 *  contribution instead of adding a second one. */
export function rawScores(answers) {
  const raw = { O: 0, H: 0, F: 0, V: 0, W: 0 };
  QUESTIONS.forEach((question, i) => {
    const pick = answers?.[i];
    if (pick == null) return;
    const choice = question.choices[pick];
    if (!choice) return;
    raw[choice.p] += 3;
    raw[choice.s] += 1;
  });
  return raw;
}

export const resonance = (rawValue) => Math.min(100, Math.round((rawValue / 30) * 100));

export function crucibleTally(responses) {
  const t = { fight: 0, flight: 0, freeze: 0, assess: 0 };
  (responses || []).forEach((r) => { if (r && t[r] !== undefined) t[r] += 1; });
  return t;
}

/** Dominant when the leader is 2 or more clear. Hybrid when the top two are
 *  within 1. Never a diagnosis, and never part of the archetype. */
export function crucibleReading(tally) {
  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  if (!top || top[1] === 0) {
    return { kind: 'none', top: null, bars: ranked, text: '', caveat: CRUCIBLE_CAVEAT };
  }
  const gap = top[1] - (second?.[1] ?? 0);
  if (gap >= 2) {
    return { kind: 'dominant', top: top[0], bars: ranked,
             label: cap(top[0]), text: CRUCIBLE_READING[top[0]], caveat: CRUCIBLE_CAVEAT };
  }
  if (gap <= 1) {
    const pair = [top[0], second[0]].sort();
    const key = pair.join('+');
    return {
      kind: 'hybrid', top: top[0], second: second[0], bars: ranked,
      label: `${cap(top[0])} and ${cap(second[0])}`,
      text: CRUCIBLE_HYBRID[key]
        || `${CRUCIBLE_READING[top[0]]} ${CRUCIBLE_READING[second[0]]}`,
      caveat: CRUCIBLE_CAVEAT,
    };
  }
  return { kind: 'dominant', top: top[0], bars: ranked,
           label: cap(top[0]), text: CRUCIBLE_READING[top[0]], caveat: CRUCIBLE_CAVEAT };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function evaluate(answers, crucibleResponses) {
  const raw = rawScores(answers);
  const top = Math.max(...ORDER.map((k) => raw[k]));

  const active = [];
  const borderline = [];
  if (top > 0) {
    const cutoff = ACTIVE_RATIO * top;
    ORDER.forEach((k) => {
      if (raw[k] >= cutoff || raw[k] === top) active.push(k);
      else if (cutoff - raw[k] <= 1) borderline.push(k);   // within one raw point
    });
  } else {
    active.push('O');   // nothing answered yet; keep the shape valid
  }

  const mask = active.reduce((m, k) => m + CALLINGS[k].code, 0);
  const archetype = ARCHETYPES[mask] ?? null;

  const neighbours = borderline.map((k) => {
    const nMask = mask + CALLINGS[k].code;
    return { calling: k, mask: nMask, archetype: ARCHETYPES[nMask] ?? null };
  }).filter((n) => n.archetype);

  return {
    raw,
    resonance: Object.fromEntries(ORDER.map((k) => [k, resonance(raw[k])])),
    top,
    cutoff: top > 0 ? +(ACTIVE_RATIO * top).toFixed(2) : 0,
    active,
    borderline,
    neighbours,
    mask,
    archetype,
    tier: TIERS[active.length] ?? '',
    decide: active.map((k) => ({ calling: k, name: CALLINGS[k].name, line: DECIDE[k] })),
    crucible: crucibleReading(crucibleTally(crucibleResponses)),
    total: ORDER.reduce((n, k) => n + raw[k], 0),
  };
}
