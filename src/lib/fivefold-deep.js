// The interpretation layer for The Fivefold Calling.
//
// The guide separates a stable measurement layer from a flexible
// interpretation layer, and this is the second one. The forty core questions
// still decide the archetype exactly as before, through fivefold-engine.js.
// Nothing here can change the code. The Depth Module only sharpens how the
// result is described.

import { CALLINGS, ORDER, QUESTIONS, RULES } from '../data/fivefold.js';
import { score } from './fivefold-engine.js';
import guide from '../data/fivefold-guide.js';

export const DEPTH = guide.depth;
export const FACETS = guide.facets;
export const BANDS = guide.bands;

export const bandFor = (v) =>
  BANDS.find((b) => v >= b.from) || BANDS[BANDS.length - 1];

const round = (n) => Math.round(n * 10) / 10;

// Every item, core and depth, indexed by its number so facets can reach both.
const ITEM = new Map();
QUESTIONS.forEach((q) => ITEM.set(q.n, { reverse: q.reverse, calling: q.calling }));
DEPTH.forEach((q) => ITEM.set(q.n, { reverse: q.reverse, calling: q.calling }));

/**
 * @param core  forty answers, 1 to 5, the official classifier
 * @param depth ten answers for questions 41 to 50, or null if skipped
 */
export function analyse(core, depth = null, opts = {}) {
  const base = score(core);                    // unchanged, still authoritative

  // answers addressed by question number
  const answer = new Map();
  QUESTIONS.forEach((q, i) => answer.set(q.n, Number(core[i])));
  if (depth) DEPTH.forEach((q, i) => {
    const v = Number(depth[i]);
    if (v >= RULES.likertMin && v <= RULES.likertMax) answer.set(q.n, v);
  });

  // ── the ten facets ──
  // facet affinity = ((raw - 5) / 20) x 100, from five keyed items
  const facets = FACETS.map((f) => {
    const vals = f.items.map((n) => {
      const v = answer.get(n);
      if (v === undefined) return null;
      const meta = ITEM.get(n);
      return meta && meta.reverse ? 6 - v : v;
    });
    const known = vals.filter((v) => v !== null);
    // If the Depth Module was skipped, scale what we do have to the same range
    // rather than pretending a missing answer was a low one.
    const raw = known.reduce((a, b) => a + b, 0) * (f.items.length / (known.length || 1));
    const affinity = Math.max(0, Math.min(100, ((raw - 5) / 20) * 100));
    return {
      ...f,
      raw: round(raw),
      affinity: round(affinity),
      band: bandFor(affinity).label,
      complete: known.length === f.items.length,
    };
  });
  const facetBy = Object.fromEntries(facets.map((f) => [f.id, f]));
  const facetVal = (id) => (facetBy[id] ? facetBy[id].affinity : 0);

  // ── the runtime variables the guide's narrative rules read ──
  const activeScores = base.activeKeys.map((k) => base.affinity[k]);
  const primary = base.ranked[0];
  const activeSpread = round(Math.max(...activeScores) - Math.min(...activeScores));
  const inactive = ORDER.filter((k) => !base.active[k])
    .sort((a, b) => base.affinity[b] - base.affinity[a]);
  const highestInactive = inactive[0] || null;
  const activationFloor = round(Math.max(RULES.activeMin, base.max - RULES.activeDistance));
  const nearestGap = highestInactive
    ? round(activationFloor - base.affinity[highestInactive]) : null;

  const blendShape =
    activeSpread <= 5 ? 'balanced' : activeSpread <= 10 ? 'led' : 'dominant';
  const pathCloseness =
    nearestGap === null ? 'none'
      : nearestGap <= 3 ? 'bordering'
      : nearestGap <= 7 ? 'nearby'
      : nearestGap <= 12 ? 'secondary' : 'stable';

  // ── every expansion path, nearest first ──
  const paths = inactive.map((k) => {
    const required = round(Math.max(RULES.activeMin, base.max - RULES.activeDistance));
    return {
      calling: k,
      name: CALLINGS[k].name,
      affinity: base.display[k],
      required,
      gap: round(required - base.affinity[k]),
      becomes: guide.archetypes[base.code + CALLINGS[k].weight] || null,
    };
  }).filter((p) => p.becomes).sort((a, b) => a.gap - b.gap);

  // A contraction path only matters when an active Calling is sitting right on
  // the boundary, which is the guide's rule rather than a general listing.
  const lowestActive = base.activeKeys
    .slice().sort((a, b) => base.affinity[a] - base.affinity[b])[0];
  const contraction = lowestActive && base.activeKeys.length > 1 &&
    round(base.affinity[lowestActive] - activationFloor) <= 3
      ? {
          calling: lowestActive,
          name: CALLINGS[lowestActive].name,
          affinity: base.display[lowestActive],
          above: round(base.affinity[lowestActive] - activationFloor),
          becomes: guide.archetypes[base.code - CALLINGS[lowestActive].weight] || null,
        }
      : null;

  // ── facet splits inside one Calling ──
  const splits = [];
  for (const k of ORDER) {
    const pair = facets.filter((f) => f.calling === k);
    if (pair.length !== 2) continue;
    const [hi, lo] = pair.slice().sort((a, b) => b.affinity - a.affinity);
    const gap = round(hi.affinity - lo.affinity);
    if (gap >= 15) splits.push({ calling: k, high: hi, low: lo, gap });
  }
  splits.sort((a, b) => b.gap - a.gap);

  // ── the six behavioural scales ──
  // Interpretive displays, not extra psychological percentages. Clamped, and
  // each is labelled by its two poles rather than given a bare number.
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  const A = base.affinity;
  const scales = [
    { id: 'principle', low: 'Pragmatism', high: 'Principle',
      value: clamp(0.70 * A.O + 0.30 * facetVal('oath-integrity')) },
    { id: 'planning', low: 'Improvisation', high: 'Planning',
      value: clamp(0.65 * A.F + 0.35 * facetVal('forge-structure')) },
    { id: 'risk', low: 'Risk seeking', high: 'Risk aware',
      value: clamp(0.70 * A.W + 0.30 * facetVal('watch-risk-detection')) },
    { id: 'trust', low: 'Immediate trust', high: 'Earned trust',
      value: clamp(0.55 * A.W + 0.25 * facetVal('watch-trust-contingency') + 0.20 * A.H) },
    { id: 'conflict', low: 'Harmony', high: 'Resolution',
      value: clamp(0.40 * A.O + 0.35 * facetVal('voice-assertiveness') + 0.25 * A.F) },
    { id: 'execution', low: 'Exploratory', high: 'Structured execution',
      value: clamp(0.65 * A.F + 0.35 * facetVal('forge-persistence')) },
  ];

  // ── the decision pathway ──
  // Active Callings in order of affinity, with quieter ones as annotations.
  const VERB = { O: 'evaluates what should be done', H: 'checks the human cost',
    F: 'builds the structure', V: 'aligns the people', W: 'detects what is missing' };
  const flow = base.activeKeys
    .slice().sort((a, b) => base.affinity[b] - base.affinity[a])
    .map((k) => ({ calling: k, name: CALLINGS[k].name, does: VERB[k],
                   affinity: base.display[k] }));
  const sideInfluences = inactive
    .filter((k) => base.affinity[k] >= 55)
    .map((k) => ({ calling: k, name: CALLINGS[k].name, affinity: base.display[k] }));

  return {
    ...base,
    name: (opts.name || '').trim(),
    chapter: guide.archetypes[base.code],
    facets, facetBy,
    depthAnswered: Boolean(depth),
    primary, activeSpread, blendShape,
    highestInactive, activationFloor, nearestGap, pathCloseness,
    paths, nearest: paths[0] || null, contraction,
    splits, scales, flow, sideInfluences,
    callingBands: Object.fromEntries(ORDER.map((k) => [k, bandFor(A[k]).label])),
    modifierFor: (k) => {
      const list = guide.callingModifiers[k] || [];
      return (list.find((b) => A[k] >= b.from) || list[list.length - 1] || {}).text || '';
    },
  };
}

export const GUIDE = guide;
