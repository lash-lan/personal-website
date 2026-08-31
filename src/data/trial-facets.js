// The fifteen facets, and every tunable number in the Deep Trial.
//
// The Report Audit names the fifteen facets but does not fix the numeric
// thresholds, so they are gathered here rather than scattered through the
// engine. Change a number in this file and the whole report follows. Nothing
// in trial-engine.js hard codes any of these values.

// ─── THE FIFTEEN FACETS ──────────────────────────────────────────────
// Audit section D: Oath, Hearth, Forge, Voice, Watch, three facets each.
export const FACETS = {
  // The Oath
  integrity:      { calling: 'O', name: 'Integrity',       q: 'Do I hold the line when no one is watching?' },
  fairness:       { calling: 'O', name: 'Fairness',        q: 'Do I weigh people by the same measure?' },
  moralCourage:   { calling: 'O', name: 'Moral Courage',   q: 'Do I speak when speaking costs me?' },
  // The Hearth
  loyalty:        { calling: 'H', name: 'Loyalty',         q: 'Do I stay when staying is hard?' },
  care:           { calling: 'H', name: 'Care',            q: 'Do I notice what people need?' },
  boundaries:     { calling: 'H', name: 'Boundaries',      q: 'Can I refuse someone I love?' },
  // The Forge
  planning:       { calling: 'F', name: 'Planning',        q: 'Do I see the shape of the work before it starts?' },
  persistence:    { calling: 'F', name: 'Persistence',     q: 'Do I finish what stops being interesting?' },
  standards:      { calling: 'F', name: 'Standards',       q: 'Do I insist the work be good?' },
  // The Voice
  socialBoldness: { calling: 'V', name: 'Social Boldness', q: 'Do I speak first in a room that matters?' },
  persuasion:     { calling: 'V', name: 'Persuasion',      q: 'Do I move people toward what I believe?' },
  socialReading:  { calling: 'V', name: 'Social Reading',  q: 'Do I see what a room is really doing?' },
  // The Watch
  threatDetection:{ calling: 'W', name: 'Threat Detection',q: 'Do I feel the danger before it arrives?' },
  verification:   { calling: 'W', name: 'Verification',    q: 'Do I check what I have been told?' },
  contingency:    { calling: 'W', name: 'Contingency',     q: 'Do I keep a second road open?' },
};

// Stable order for display, grouped by Calling.
export const FACET_ORDER = [
  'integrity', 'fairness', 'moralCourage',
  'loyalty', 'care', 'boundaries',
  'planning', 'persistence', 'standards',
  'socialBoldness', 'persuasion', 'socialReading',
  'threatDetection', 'verification', 'contingency',
];

export const FACETS_BY_CALLING = {
  O: ['integrity', 'fairness', 'moralCourage'],
  H: ['loyalty', 'care', 'boundaries'],
  F: ['planning', 'persistence', 'standards'],
  V: ['socialBoldness', 'persuasion', 'socialReading'],
  W: ['threatDetection', 'verification', 'contingency'],
};

// ─── TUNABLE THRESHOLDS ──────────────────────────────────────────────
// Every number the report depends on, in one place. Each carries the reason
// it was set where it is, so a later change is an informed one.
export const T = {
  // Facet bands. Scores are normalised 0 to 100 against the most a facet
  // could have scored, so the bands are read as "of what was available".
  // Cut at 20 point steps, with the middle band widened slightly because
  // most people land there and calling it Moderate should mean something.
  bands: [
    { at: 80, label: 'Very High' },
    { at: 62, label: 'High' },
    { at: 38, label: 'Moderate' },
    { at: 20, label: 'Low' },
    { at: 0,  label: 'Very Low' },
  ],

  // Mirror against Trial. A gap has to be large enough that it is unlikely
  // to be noise from a single answer. One dilemma can move a facet by
  // roughly 12 points, so 18 keeps a single choice from creating a "gap",
  // and 30 marks the ones worth a paragraph of their own.
  gapNotable: 18,
  gapStrong: 30,

  // Contradiction triggers. A contradiction needs one facet clearly high
  // and its partner clearly lower, in the same person, with enough evidence
  // behind both. These follow the pairs listed in Audit section F.
  contradictionHigh: 62,      // the high side must reach High
  contradictionLow: 45,       // the low side must sit below this
  contradictionMinGap: 20,    // and the two must be this far apart

  // Callings. Unchanged from the Master specification: a Calling is active
  // at 75% of the top score, and the bitmask is built from the active set.
  activeRatio: 0.75,
  nearActiveRatio: 0.62,      // "near active" for display only, never in the mask
  borderlineRaw: 1,           // within this many raw points of the cutoff

  // Profile clarity, exactly as Audit section 5 sets it out.
  clarity: {
    start: 50,
    topAboveThird: 0.15,      // +10 if the top Calling is 15% above third
    thresholdWobble: 0.05,    // +10 if the active set survives a 5% move
    mirrorTrialAgree: 3,      // +10 if Mirror and Trial agree on 3 of 5
    mirrorTrialAgreeWithin: 20,
    neutralAllowance: 0.20,   // +10 if 20% or fewer Mirror answers are neutral
    each: 10,
    bandNames: [
      { at: 80, label: 'Clear Pattern' },
      { at: 60, label: 'Coherent but Blended' },
      { at: 40, label: 'Broad or Context Sensitive' },
      { at: 0,  label: 'Highly Mixed Pattern' },
    ],
  },

  // A theme counts as "repeated" once it drives this many choices. Twenty
  // four dilemmas across fifteen themes means chance alone gives most themes
  // one or two, so three is the point where a pattern is worth naming.
  themeRepeat: 3,

  // Report length, from Audit section 3.
  deepWords: { min: 1800, max: 3000 },

  // Evidence gates. Audit section 10: if a statement is not supported by
  // enough responses, omit it rather than pad.
  minAnswersForFacetProse: 2,
  minAnswersForDomainProse: 3,
};

// Which band a normalised score falls in.
export const bandOf = (value) =>
  (T.bands.find((b) => value >= b.at) || T.bands[T.bands.length - 1]).label;

export const clarityBandOf = (value) =>
  (T.clarity.bandNames.find((b) => value >= b.at) || T.clarity.bandNames[3]).label;

// ─── THE FIFTEEN SCENARIO DIMENSIONS ─────────────────────────────────
// Audit section 8. Every dilemma is tagged with one of these, and the bank
// is balanced so each appears more than once.
export const THEMES = {
  justiceLoyalty:      'Justice against loyalty',
  compassionFairness:  'Compassion against fairness',
  preparationSpeed:    'Preparation against speed',
  certaintyAction:     'Certainty against action',
  influenceDirect:     'Influence against direct action',
  reputationTruth:     'Reputation against truth',
  costDuty:            'Personal cost against duty',
  belongingIndependence:'Belonging against independence',
  ambitionIntegrity:   'Ambition against integrity',
  mercyStandards:      'Mercy against standards',
  trustVerification:   'Trust against verification',
  safetyObjective:     'Short term safety against the long objective',
  publicPrivate:       'Public confrontation against private correction',
  authorityDissent:    'Authority against dissent',
  responsibilitySelf:  'Responsibility against self preservation',
};
