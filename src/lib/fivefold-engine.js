// The Fivefold Calling scoring engine.
//
// This follows the workbook's Scoring Logic sheet step for step. Two rules
// there are easy to get wrong and are called out in the workbook itself:
//
//   - a Calling is not active merely because it reaches 62.5. It must also
//     sit within 15 points of the highest score, so the result reflects what
//     actually organises the person rather than everything they are good at.
//   - classification uses full precision. Rounding happens only for display,
//     because rounding first can move a borderline score across the line.

import { CALLINGS, ORDER, QUESTIONS, RULES, ARCHETYPES, bandOf } from '../data/fivefold.js';

/** Step 2: reverse items are scored 6 minus the answer. */
export const keyed = (answer, reverse) => (reverse ? 6 - Number(answer) : Number(answer));

/** Step 4: put every Calling on the same 0 to 100 scale. */
export const affinityOf = (raw) =>
  ((raw - RULES.rawMin) / (RULES.rawMax - RULES.rawMin)) * 100;

export function validate(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
    return `All ${QUESTIONS.length} questions must be answered.`;
  }
  const bad = answers.findIndex(
    (v) => !Number.isInteger(Number(v)) || Number(v) < RULES.likertMin || Number(v) > RULES.likertMax
  );
  if (bad !== -1) return `Question ${bad + 1} has no valid answer.`;
  return null;
}

export function score(answers) {
  const problem = validate(answers);
  if (problem) throw new Error(problem);

  // Steps 2 and 3: key each item, then sum by Calling.
  const raw = Object.fromEntries(ORDER.map((k) => [k, 0]));
  QUESTIONS.forEach((q, i) => { raw[q.calling] += keyed(answers[i], q.reverse); });

  // Step 4, kept at full precision.
  const affinity = Object.fromEntries(ORDER.map((k) => [k, affinityOf(raw[k])]));

  // Step 5.
  const max = Math.max(...ORDER.map((k) => affinity[k]));

  // Steps 6 and 7: both tests must pass, unless nobody clears the bar, in
  // which case the highest activates so a reader always gets a result.
  const active = {};
  for (const k of ORDER) {
    active[k] = max >= RULES.activeMin
      ? affinity[k] >= RULES.activeMin && affinity[k] >= max - RULES.activeDistance
      : affinity[k] === max;
  }

  // Step 8.
  const code = ORDER.reduce((sum, k) => sum + (active[k] ? CALLINGS[k].weight : 0), 0);
  const archetype = ARCHETYPES[code];
  if (!archetype) throw new Error(`No archetype for code ${code}`);

  const activeKeys = ORDER.filter((k) => active[k]);
  const ranked = ORDER.slice().sort((a, b) => affinity[b] - affinity[a]);

  // Step 10: the strongest Calling that did not make the archetype, and what
  // it would have made had it done so.
  const nearestKey = ranked.find((k) => !active[k]) || null;
  const nearest = nearestKey ? {
    calling: nearestKey,
    affinity: affinity[nearestKey],
    shortBy: Math.max(0, Math.max(RULES.activeMin, max - RULES.activeDistance) - affinity[nearestKey]),
    wouldBecome: ARCHETYPES[code + CALLINGS[nearestKey].weight] || null,
  } : null;

  return {
    raw, affinity, max, active, activeKeys, code, archetype, ranked, nearest,
    tier: archetype.tier,
    // rounded only here, for display
    display: Object.fromEntries(ORDER.map((k) => [k, Math.round(affinity[k] * 10) / 10])),
    bands: Object.fromEntries(ORDER.map((k) => [k, bandOf(affinity[k]).label])),
  };
}
