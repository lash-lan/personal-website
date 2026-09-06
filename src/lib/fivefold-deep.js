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
import { FACET_PROSE, HIGH_AT, LOW_BELOW } from '../data/fivefold-facet-prose.js';

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

// The guide writes its decision pathways as "Watch detects risk -> Oath judges
// the standard -> ...", so the leading word of each stage names the Calling.
const KEY_BY_WORD = { Oath: 'O', Hearth: 'H', Forge: 'F', Voice: 'V', Watch: 'W' };

// The guide's runtime rule for the pathway, quoted so the numbers below can be
// checked against it: "reorder the first two stages if another active Calling
// exceeds the default first stage by more than 7 points. If an inactive
// Calling is >=55, show it as a side influence rather than a main step."
const REORDER_MARGIN = 7;
const SIDE_INFLUENCE_MIN = 55;

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

  // Facets alter the prose inside an archetype rather than only sitting in the
  // appendix. A facet speaks only when it is genuinely high or genuinely
  // quiet, so a middling profile does not collect filler.
  const facetNotes = facets.map((f) => {
    const copy = FACET_PROSE[f.id];
    if (!copy) return null;
    const side = f.affinity >= HIGH_AT ? 'high' : f.affinity < LOW_BELOW ? 'low' : null;
    if (!side) return null;
    return { id: f.id, name: f.name, where: copy.where, side,
             affinity: f.affinity, band: f.band, text: copy[side] };
  }).filter(Boolean)
    // strongest signal first, measured as distance from the middle
    .sort((a, b) => Math.abs(b.affinity - 50) - Math.abs(a.affinity - 50));
  const notesFor = (where) => facetNotes.filter((n) => n.where === where);

  // ── the runtime variables the guide's narrative rules read ──
  const activeScores = base.activeKeys.map((k) => base.affinity[k]);
  const primary = base.ranked[0];
  const activeSpread = round(Math.max(...activeScores) - Math.min(...activeScores));
  const inactive = ORDER.filter((k) => !base.active[k])
    .sort((a, b) => base.affinity[b] - base.affinity[a]);
  const highestInactive = inactive[0] || null;
  const activationFloor = round(Math.max(RULES.activeMin, base.max - RULES.activeDistance));

  // Which rule actually produced this result. When nobody clears the absolute
  // floor the engine falls back to activating whatever scored highest, and a
  // report that does not say so contradicts its own appendix.
  const activationRule = base.max >= RULES.activeMin ? 'absolute' : 'relative';
  // A perfect tie has no dominance to interpret and no Calling uniquely
  // closest to leaving the pattern.
  const tied = base.activeKeys.length > 1 && activeSpread === 0;

  const nearestGap = highestInactive
    ? round(activationFloor - base.affinity[highestInactive]) : null;

  const blendShape = tied ? 'tied'
    : activeSpread <= 5 ? 'balanced' : activeSpread <= 10 ? 'led' : 'dominant';
  const pathCloseness =
    nearestGap === null ? 'none'
      : nearestGap <= 3 ? 'bordering'
      : nearestGap <= 7 ? 'nearby'
      : nearestGap <= 12 ? 'secondary' : 'stable';

  // ── every expansion path, nearest first ──
  const paths = inactive.map((k) => {
    const required = activationFloor;
    return {
      calling: k,
      name: CALLINGS[k].name,
      affinity: base.display[k],
      required,
      gap: round(required - base.affinity[k]),
      becomes: guide.archetypes[base.code + CALLINGS[k].weight] || null,
    };
  }).filter((p) => p.becomes).sort((a, b) => a.gap - b.gap);

  // Several inactive Callings can sit exactly the same distance from the line,
  // in which case naming one of them as "the nearest" is the engine picking
  // mechanically rather than the profile pointing anywhere.
  const nearestTied = paths.length > 1
    ? paths.filter((p) => p.gap === paths[0].gap) : paths.slice(0, 1);

  // A contraction path only matters when an active Calling is genuinely above
  // the line and sitting close to it. Under the relative rule nothing is above
  // the line at all, and a tie leaves no single Calling nearest to falling out,
  // so in both cases there is no contraction to report.
  const lowestActive = base.activeKeys
    .slice().sort((a, b) => base.affinity[a] - base.affinity[b])[0];
  const aboveFloor = lowestActive ? round(base.affinity[lowestActive] - activationFloor) : null;
  const contraction = lowestActive && base.activeKeys.length > 1 &&
    activationRule === 'absolute' && !tied && aboveFloor >= 0 && aboveFloor <= 3
      ? {
          calling: lowestActive,
          name: CALLINGS[lowestActive].name,
          affinity: base.display[lowestActive],
          above: aboveFloor,
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
  // Interpretive displays, not extra psychological percentages. Each leans on
  // the narrower facet as well as the Calling, so two readers who share an
  // archetype do not automatically share these.
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
  const A = base.affinity;
  const scales = [
    { id: 'principle', low: 'Pragmatism', high: 'Principle',
      value: clamp(0.55 * A.O + 0.45 * facetVal('oath-integrity')) },
    { id: 'planning', low: 'Improvisation', high: 'Planning',
      value: clamp(0.50 * A.F + 0.50 * facetVal('forge-structure')) },
    { id: 'risk', low: 'Risk seeking', high: 'Risk aware',
      value: clamp(0.55 * A.W + 0.45 * facetVal('watch-risk-detection')) },
    { id: 'trust', low: 'Immediate trust', high: 'Earned trust',
      value: clamp(0.40 * A.W + 0.45 * facetVal('watch-trust-contingency') + 0.15 * A.H) },
    { id: 'conflict', low: 'Harmony', high: 'Resolution',
      value: clamp(0.30 * A.O + 0.45 * facetVal('voice-assertiveness') + 0.25 * facetVal('oath-equality-candor')) },
    { id: 'execution', low: 'Exploratory', high: 'Structured execution',
      value: clamp(0.50 * A.F + 0.50 * facetVal('forge-persistence')) },
  ];
  const scaleSpread = round(Math.max(...scales.map((s) => s.value)) -
                            Math.min(...scales.map((s) => s.value)));

  // ── the decision pathway ──
  // Taken from the archetype's own default in the guide, then adjusted by the
  // guide's runtime rule. It is not an affinity ranking dressed up as a
  // sequence, because a ranking of equal scores carries no information.
  const chapter = guide.archetypes[base.code];
  const defaultStages = String((chapter && chapter.decisionPath && chapter.decisionPath[0]) || '')
    .split(/\s*->\s*/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((s) => {
      const word = s.split(' ')[0];
      const calling = KEY_BY_WORD[word];
      if (!calling) return null;
      return { calling, name: CALLINGS[calling].name,
               does: s.slice(word.length).trim(), affinity: base.display[calling] };
    })
    .filter(Boolean);

  let flow = defaultStages;
  let pathwaySource = 'default';
  if (flow.length >= 2) {
    const firstAffinity = base.affinity[flow[0].calling];
    const challenger = flow.slice(1)
      .filter((s) => base.active[s.calling])
      .sort((a, b) => base.affinity[b.calling] - base.affinity[a.calling])[0];
    if (challenger && base.affinity[challenger.calling] - firstAffinity > REORDER_MARGIN) {
      flow = [challenger, ...flow.filter((s) => s !== challenger)];
      pathwaySource = 'reordered';
    }
  }
  const sideInfluences = inactive
    .filter((k) => base.affinity[k] >= SIDE_INFLUENCE_MIN)
    .map((k) => ({ calling: k, name: CALLINGS[k].name, affinity: base.display[k] }));

  return {
    ...base,
    name: (opts.name || '').trim(),
    chapter,
    facets, facetBy, facetNotes, notesFor,
    depthAnswered: Boolean(depth),
    primary, activeSpread, blendShape, tied, activationRule,
    highestInactive, activationFloor, nearestGap, pathCloseness,
    paths, nearest: paths[0] || null, nearestTied, nearestAmbiguous: nearestTied.length > 1,
    contraction,
    splits, scales, scaleSpread, flow, pathwaySource, sideInfluences,
    callingBands: Object.fromEntries(ORDER.map((k) => [k, bandFor(A[k]).label])),
    modifierFor: (k) => {
      const list = guide.callingModifiers[k] || [];
      return (list.find((b) => A[k] >= b.from) || list[list.length - 1] || {}).text || '';
    },
  };
}

export const GUIDE = guide;
