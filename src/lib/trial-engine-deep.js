// The Deep Trial engine. Pure, no DOM, no randomness, no network.
//
// Four channels are scored separately and stay separate, because the Audit
// is explicit that the participant must not be collapsed into five numbers:
//
//   Mirror     what they say about themselves          15 items
//   Trial      what they chose when it cost something   24 dilemmas
//   Trade-off  what they kept when they could not keep both   6 pairs
//   Crucible   what happens first under sudden pressure       10 taps
//
// The archetype is decided by the Trial channel alone. The Master
// specification defines the archetype as behavioural, so self report and
// pressure response never move the mask.

import { CALLINGS, ORDER, ARCHETYPES, TIERS } from '../data/trial.js';
import { FACETS, FACET_ORDER, FACETS_BY_CALLING, T, bandOf, clarityBandOf, THEMES }
  from '../data/trial-facets.js';
import { MIRROR, MIRROR_SCALE, DILEMMAS, TRADEOFFS, CHANNEL } from '../data/trial-items.js';
import { crucibleTally, crucibleReading } from './trial-engine.js';

const zeroFacets = () => Object.fromEntries(FACET_ORDER.map((k) => [k, 0]));
const zeroCallings = () => Object.fromEntries(ORDER.map((k) => [k, 0]));
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

// ─── the evidence trail ──────────────────────────────────────────────
// Audit section 4: every answer is kept as an object, not a number, so the
// report can say why rather than only how much.
export function evidence(trialAnswers) {
  const out = [];
  DILEMMAS.forEach((q, i) => {
    const pick = trialAnswers[i];
    if (pick === null || pick === undefined) return;
    const c = q.choices[pick];
    out.push({
      questionId: q.n, title: q.title, selectedOption: pick,
      text: c.t, prompt: q.prompt,
      primaryCalling: c.p, secondaryCalling: c.s,
      facets: Object.keys(c.f), facetPoints: c.f,
      theme: c.th, personalCost: c.cost, relationship: c.rel,
      leadership: c.lead, uncertainty: c.unc, actionStyle: c.act,
    });
  });
  return out;
}

// ─── the Trial channel ───────────────────────────────────────────────
function trialChannel(answers) {
  const calling = zeroCallings();
  const facet = zeroFacets();
  const facetMax = zeroFacets();
  const themes = {};
  const styles = {};
  const costs = {};
  const rels = {};
  const leads = {};
  const uncs = {};

  // what a facet could have earned, given the options actually on offer
  DILEMMAS.forEach((q) => {
    FACET_ORDER.forEach((f) => {
      const best = Math.max(0, ...q.choices.map((c) => c.f[f] || 0));
      facetMax[f] += best;
    });
  });

  DILEMMAS.forEach((q, i) => {
    const pick = answers[i];
    if (pick === null || pick === undefined) return;
    const c = q.choices[pick];
    calling[c.p] += 3;
    calling[c.s] += 1;
    for (const [f, n] of Object.entries(c.f)) facet[f] += n;
    themes[c.th] = (themes[c.th] || 0) + 1;
    styles[c.act] = (styles[c.act] || 0) + 1;
    costs[c.cost] = (costs[c.cost] || 0) + 1;
    if (c.rel !== 'none') rels[c.rel] = (rels[c.rel] || 0) + 1;
    if (c.lead !== 'none') leads[c.lead] = (leads[c.lead] || 0) + 1;
    uncs[c.unc] = (uncs[c.unc] || 0) + 1;
  });

  return { calling, facet, facetMax, themes, styles, costs, rels, leads, uncs };
}

// ─── the Mirror channel ──────────────────────────────────────────────
function mirrorChannel(answers) {
  const facet = zeroFacets();
  let answered = 0, neutral = 0;
  MIRROR.forEach((item, i) => {
    const pick = answers[i];
    if (pick === null || pick === undefined) return;
    answered++;
    const step = MIRROR_SCALE[pick];
    facet[item.facet] = step.v;
    if (step.neutral) neutral++;
  });
  // roll the three facets up to a Calling level view
  const calling = {};
  for (const k of ORDER) {
    const fs = FACETS_BY_CALLING[k];
    calling[k] = Math.round(fs.reduce((n, f) => n + facet[f], 0) / fs.length);
  }
  return { facet, calling, answered, neutral };
}

// ─── the trade-off channel ───────────────────────────────────────────
function tradeoffChannel(answers) {
  const facet = zeroFacets();
  const kept = [];
  const given = [];
  TRADEOFFS.forEach((q, i) => {
    const pick = answers[i];
    if (pick === null || pick === undefined) return;
    const c = q.choices[pick];
    for (const [f, n] of Object.entries(c.f)) facet[f] += n * CHANNEL.tradeoffFacetWeight;
    kept.push(Object.keys(c.f)[0]);
    given.push(c.against);
  });
  return { facet, kept, given };
}

// ─── contradictions ──────────────────────────────────────────────────
// Audit section F. A contradiction needs one side clearly high, the other
// clearly lower, and a real distance between them.
const PAIRS = [
  { id: 'planVsFinish',    high: 'planning',      low: 'persistence' },
  { id: 'readVsSpeak',     high: 'socialReading', low: 'socialBoldness' },
  { id: 'loyalVsLimit',    high: 'loyalty',       low: 'boundaries' },
  { id: 'principleVsCase', high: 'integrity',     low: 'fairness' },
  { id: 'voiceVsPersuade', high: 'socialReading', low: 'persuasion' },
  { id: 'standardVsMercy', high: 'standards',     low: 'care' },
  { id: 'watchVsVerify',   high: 'threatDetection', low: 'verification' },
];

function contradictions(facetTrial, facetMirror, callingRel, cru) {
  const flags = [];
  for (const p of PAIRS) {
    const hi = facetTrial[p.high], lo = facetTrial[p.low];
    if (hi >= T.contradictionHigh && lo <= T.contradictionLow &&
        hi - lo >= T.contradictionMinGap) {
      flags.push({ id: p.id, high: p.high, low: p.low, hiValue: hi, loValue: lo });
    }
  }
  // vigilance sitting beside confrontation, which the Audit calls out by name
  if (callingRel.W >= 75 && cru.tally && cru.tally.fight >= 4) {
    flags.push({ id: 'watchAndFight', high: 'threatDetection', low: null,
                 hiValue: callingRel.W, loValue: cru.tally.fight });
  }
  // a moral self image that the situational choices did not repeat
  const oathGap = facetMirror.integrity - facetTrial.integrity;
  if (oathGap >= T.gapStrong) {
    flags.push({ id: 'idealVsPractice', high: 'integrity', low: null,
                 hiValue: facetMirror.integrity, loValue: facetTrial.integrity });
  }
  return flags;
}

// ─── Mirror against Trial ────────────────────────────────────────────
function mirrorTrial(facetMirror, facetTrial, mirrorAnswered) {
  const rows = [];
  for (const f of FACET_ORDER) {
    if (!mirrorAnswered) break;
    const self = facetMirror[f], acted = facetTrial[f];
    const gap = self - acted;
    let label = 'Aligned';
    if (gap >= T.gapNotable) label = 'Idealized';
    else if (gap <= -T.gapNotable) label = 'Hidden Strength';
    rows.push({ facet: f, self, acted, gap, strong: Math.abs(gap) >= T.gapStrong, label });
  }
  return rows.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}

// ─── profile clarity ─────────────────────────────────────────────────
// Audit section 5, implemented exactly as written.
function profileClarity({ callingRaw, ranked, active, mirror, facetTrial, themes }) {
  const C = T.clarity;
  let score = C.start;
  const reasons = [];

  const top = ranked[0]?.[1] ?? 0;
  const third = ranked[2]?.[1] ?? 0;
  if (third > 0 ? top >= third * (1 + C.topAboveThird) : top > 0) {
    score += C.each; reasons.push('The leading Calling stands clearly above the third.');
  }

  // does the active set survive the threshold moving either way?
  const setAt = (ratio) => ORDER.filter((k) => callingRaw[k] >= ratio * top).join('');
  if (setAt(T.activeRatio - C.thresholdWobble) === setAt(T.activeRatio) &&
      setAt(T.activeRatio + C.thresholdWobble) === setAt(T.activeRatio)) {
    score += C.each; reasons.push('The active Callings hold steady when the threshold is nudged.');
  }

  if (mirror.answered) {
    let agree = 0;
    for (const k of ORDER) {
      const acted = pct(callingRaw[k], top || 1);
      if (Math.abs(mirror.calling[k] - acted) <= C.mirrorTrialAgreeWithin) agree++;
    }
    if (agree >= C.mirrorTrialAgree) {
      score += C.each; reasons.push('Your self description and your choices broadly agree.');
    }
    if (mirror.neutral / mirror.answered <= C.neutralAllowance) {
      score += C.each; reasons.push('Few of your Mirror answers sat on the fence.');
    }
  }

  // the same facet showing up across more than one kind of situation
  const repeated = Object.entries(themes).filter(([, n]) => n >= T.themeRepeat);
  if (repeated.length >= 2) {
    score += C.each; reasons.push('The same instincts appeared across different kinds of pressure.');
  }

  score = Math.max(0, Math.min(100, score));
  return { score, band: clarityBandOf(score), reasons };
}

// ─── the whole reading ───────────────────────────────────────────────
export function evaluateDeep(state) {
  const trial = trialChannel(state.trial || []);
  const mirror = mirrorChannel(state.mirror || []);
  const trade = tradeoffChannel(state.tradeoff || []);

  // Callings, from behaviour only
  const callingRaw = trial.calling;
  const ranked = ORDER.map((k) => [k, callingRaw[k]]).sort((a, b) => b[1] - a[1]);
  const top = ranked[0][1] || 0;
  const cutoff = T.activeRatio * top;

  const active = ORDER.filter((k) => callingRaw[k] >= cutoff && callingRaw[k] > 0);
  if (!active.length && top > 0) active.push(ranked[0][0]);
  const nearActive = ORDER.filter((k) =>
    !active.includes(k) && callingRaw[k] >= T.nearActiveRatio * top && callingRaw[k] > 0);

  // Relative Resonance, the Audit's fix for a top score displaying as 37
  const callingRel = Object.fromEntries(ORDER.map((k) => [k, pct(callingRaw[k], top || 1)]));

  const mask = active.reduce((n, k) => n + CALLINGS[k].code, 0);
  const archetype = ARCHETYPES[mask] || ARCHETYPES[CALLINGS[ranked[0][0]].code];
  const tier = TIERS[active.length] || TIERS[1];

  // facets, normalised against what was actually obtainable
  const facetTrial = {}, facetTrialRaw = {}, facetBand = {};
  for (const f of FACET_ORDER) {
    const earned = trial.facet[f] + trade.facet[f];
    const possible = trial.facetMax[f] + (TRADEOFFS.some((q) => q.choices.some((c) => c.f[f]))
      ? 3 * CHANNEL.tradeoffFacetWeight : 0);
    facetTrialRaw[f] = earned;
    facetTrial[f] = pct(earned, possible);
    facetBand[f] = bandOf(facetTrial[f]);
  }

  const strongestFacets = [...FACET_ORDER].sort((a, b) => facetTrial[b] - facetTrial[a]).slice(0, 4);
  const weakestFacets = [...FACET_ORDER].sort((a, b) => facetTrial[a] - facetTrial[b]).slice(0, 3);

  const cruTally = crucibleTally(state.crucible || []);
  const cru = crucibleReading(cruTally);
  cru.tally = cruTally;

  const gaps = mirrorTrial(mirror.facet, facetTrial, mirror.answered);
  const flags = contradictions(facetTrial, mirror.facet, callingRel, cru);

  const repeatedThemes = Object.entries(trial.themes)
    .filter(([, n]) => n >= T.themeRepeat)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id, n, label: THEMES[id] }));

  const dominantStyle = Object.entries(trial.styles).sort((a, b) => b[1] - a[1])[0] || null;

  // borderland: which single Calling, had it spoken louder, changes the result
  const neighbours = [];
  for (const k of ORDER) {
    if (active.includes(k)) continue;
    const alt = ARCHETYPES[mask + CALLINGS[k].code];
    if (!alt) continue;
    const distance = Math.max(0, cutoff - callingRaw[k]);
    neighbours.push({ calling: k, archetype: alt, distance, near: nearActive.includes(k) });
  }
  neighbours.sort((a, b) => a.distance - b.distance);

  const clarity = profileClarity({
    callingRaw, ranked, active, mirror, facetTrial, themes: trial.themes,
  });

  return {
    mode: 'deep',
    callingRaw, callingRel, ranked, top, cutoff, active, nearActive, mask, archetype, tier,
    facetTrial, facetTrialRaw, facetBand, facetMirror: mirror.facet,
    mirrorCalling: mirror.calling, mirrorAnswered: mirror.answered, mirrorNeutral: mirror.neutral,
    strongestFacets, weakestFacets,
    gaps, contradictions: flags,
    tradeoffKept: trade.kept, tradeoffGiven: trade.given,
    crucible: cru,
    themes: trial.themes, repeatedThemes, styles: trial.styles, dominantStyle,
    costs: trial.costs, rels: trial.rels, leads: trial.leads, uncs: trial.uncs,
    neighbours: neighbours.slice(0, 2),
    clarity,
    evidence: evidence(state.trial || []),
    counts: {
      mirror: mirror.answered,
      trial: (state.trial || []).filter((x) => x !== null && x !== undefined).length,
      tradeoff: (state.tradeoff || []).filter((x) => x !== null && x !== undefined).length,
      crucible: (state.crucible || []).filter(Boolean).length,
    },
  };
}
