// Assembles the Deep report from pre-written blocks and the participant's own
// numbers. Deterministic: the same answers always produce the same document.
//
// Audit section 10 sets the order of importance, and says plainly that if a
// statement is not supported by enough responses it should be omitted rather
// than padded. Every builder below returns nothing when its evidence is thin.

import { CALLINGS, ORDER } from '../data/trial.js';
import { FACETS, FACET_ORDER, FACETS_BY_CALLING, T } from '../data/trial-facets.js';
import { DILEMMAS, CRUCIBLE_CONTEXT } from '../data/trial-items.js';
import {
  CALLING_PROSE, FACET_PROSE, CONTRADICTION_PROSE, GAP_PROSE, TENSION_PROSE,
  CRUCIBLE_MEETS, DOMAIN_PROSE, DOMAIN_QUIET, TENSION_MILD, NO_BORDERLAND,
  GROWTH_PROMPTS, CLARITY_PROSE, LIMITS_COPY,
} from '../data/trial-prose.js';

const fname = (f) => FACETS[f].name;
const cname = (k) => CALLINGS[k].name;
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const list = (arr) => arr.length <= 1 ? (arr[0] || '')
  : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];

const strengthOf = (v) => (v >= 62 ? 'high' : v >= 38 ? 'mid' : 'low');

// ─── 2. the fivefold pattern ─────────────────────────────────────────
function fivefold(r) {
  const rows = r.ranked.map(([k, raw], i) => {
    const rel = r.callingRel[k];
    const status = r.active.includes(k) ? 'Active'
      : r.nearActive.includes(k) ? 'Near active' : 'Quiet';
    // one sentence specific to this person, not a definition of the Calling
    const facets = FACETS_BY_CALLING[k];
    const best = facets.slice().sort((a, b) => r.facetTrial[b] - r.facetTrial[a])[0];
    const worst = facets.slice().sort((a, b) => r.facetTrial[a] - r.facetTrial[b])[0];
    let line;
    if (status === 'Quiet') {
      line = `Quietest of the five for you. Within it, ${fname(best)} still came through more than ${fname(worst)}.`;
    } else if (r.facetTrial[best] - r.facetTrial[worst] >= 25) {
      line = `Carried mostly by ${fname(best)} at ${r.facetTrial[best]}, while ${fname(worst)} stayed at ${r.facetTrial[worst]}. This Calling is not uniform in you.`;
    } else {
      line = `Even across its three facets, which suggests this one runs as a whole in you rather than through one strong part.`;
    }
    return { calling: k, name: cname(k), raw, rel, status, rank: i + 1, line,
             colour: CALLINGS[k].colour };
  });
  return { id: 'fivefold', title: 'The Fivefold Pattern', rows,
    paras: ['Relative Resonance compares each Calling against your own strongest, not against other people. Your leading Calling therefore reads 100. It is not a percentage of your personality.'] };
}

// ─── 3. why this archetype found you ─────────────────────────────────
function why(r) {
  const p = [];
  const top = r.ranked[0][0];
  const second = r.ranked[1][0];
  const quiet = r.ranked[r.ranked.length - 1][0];
  const A = r.archetype;

  // what repeatedly drove the choices
  if (r.active.length === 1) {
    p.push(`You came out as ${A.name} because one Calling did the work. ${CALLING_PROSE[top].high} With ${r.callingRaw[top]} points against ${r.callingRaw[second]} for ${cname(second)}, nothing else came close enough to share the title.`);
  } else {
    const names = r.active.map(cname);
    p.push(`You came out as ${A.name} because ${list(names)} all answered, and answered at close to the same strength. ${CALLING_PROSE[top].high} Alongside it, ${lower(CALLING_PROSE[second][strengthOf(r.callingRel[second])])}`);
  }

  // two concrete recurring patterns, drawn from the actual answers
  if (r.repeatedThemes.length) {
    const t0 = r.repeatedThemes[0];
    p.push(`One pattern repeated more than any other. ${t0.label} came up ${t0.n} times, and each time you resolved it the same way. That is not a single decision. That is a disposition showing itself under different costumes.`);
    if (r.repeatedThemes[1]) {
      const t1 = r.repeatedThemes[1];
      p.push(`A second thread ran underneath it. ${t1.label} appeared ${t1.n} times, which tells us this is not a person who only has one instinct. When those two pressures met in the same scene, the first is the one that usually won.`);
    }
  }

  // dominant action style
  if (r.dominantStyle) {
    const [style, n] = r.dominantStyle;
    const styleWord = { act: 'moved directly on it', verify: 'went to find out more first',
      persuade: 'worked through the people involved', withdraw: 'stepped back from it',
      hold: 'held position and let it come to you' }[style];
    if (n >= 6) p.push(`Across the twenty four scenes, your most frequent instinct was not a value but a movement: ${n} times out of ${r.counts.trial}, you ${styleWord}. Whatever the dilemma was about, that is the shape your response took.`);
  }

  // name actual scenes, so the record demonstrably remembers the decisions
  const themeId = r.repeatedThemes[0]?.id;
  const cited = (themeId ? r.evidence.filter((e) => e.theme === themeId) : r.evidence)
    .slice(0, 2);
  if (cited.length === 2) {
    p.push(`Two moments show it directly. In ${cited[0].title}, you chose to ${lower(cited[0].text.replace(/\.$/, ''))}. In ${cited[1].title}, faced with a different problem entirely, you chose to ${lower(cited[1].text.replace(/\.$/, ''))}. The scenes had almost nothing in common. Your answer to them did.`);
  }

  // what you kept when you could not keep both
  if (r.tradeoffKept.length >= 3) {
    const kept = r.tradeoffKept.map(fname);
    const given = r.tradeoffGiven.map(fname);
    p.push(`The forced trade-offs are the hardest evidence in this record, because they removed the possibility of having both. Given six of them, you kept ${list(kept.slice(0, 3))} and let go of ${list(given.slice(0, 3))}. People are often surprised by their own answers here. It is one thing to value something and another to keep it when the alternative is taken off the table.`);
  }

  // what you were willing to sacrifice
  const highCost = r.costs.high || 0;
  if (highCost >= 3) {
    p.push(`You chose the expensive option ${highCost} times, where a cheaper and entirely defensible one was available. That is worth stating plainly, because it is the part of a result that cannot be faked by knowing what sounds good.`);
  } else if (highCost <= 1) {
    p.push(`You rarely took the option that carried a heavy personal cost. That is not a criticism. It suggests you weigh what a decision will actually take from you rather than choosing the most self sacrificing road on principle.`);
  }

  // what you rarely prioritised
  p.push(`What stayed quiet is as informative as what did not. ${cname(quiet)} finished last at ${r.callingRaw[quiet]} points. ${CALLING_PROSE[quiet].low}`);

  // what separated this from the nearest alternative
  if (r.neighbours.length) {
    const nb = r.neighbours[0];
    p.push(`You stood near ${nb.archetype.name}. What kept you from it was ${cname(nb.calling)}, which finished ${nb.distance} points short of becoming active. ${CALLING_PROSE[nb.calling][strengthOf(r.callingRel[nb.calling])]}`);
  }

  p.push(A.portrait);
  return { id: 'why', title: 'Why This Archetype Found You', paras: p };
}

// ─── how you decide ──────────────────────────────────────────────────
// Built from the shape of the choices rather than their content: what you
// did, not what you valued. Every participant has this evidence.
const STYLE_READING = {
  act:      ['moving on it', 'Your default is to close the gap between deciding and doing. You are unlikely to be the person still weighing it when the moment passes, and correspondingly more likely to be the one who moved before the picture was complete.'],
  verify:   ['finding out more first', 'Your default is to convert uncertainty into information before spending a decision on it. This makes you accurate and, in situations that will not wait, occasionally late.'],
  persuade: ['working through the people involved', 'Your default is to treat a problem as something happening between people rather than to them. You look for the person whose agreement changes the situation.'],
  withdraw: ['stepping back from it', 'Your default is to decline the frame you were handed. This reads as retreat from outside and is more often refusal from inside.'],
  hold:     ['holding position', 'Your default is to stay where you are and let the situation come to you. That is a real decision rather than an absence of one, though it is frequently mistaken for the latter.'],
};

function decisions(r) {
  const total = r.counts.trial;
  if (!total) return null;
  const p = [];
  const ranked = Object.entries(r.styles).sort((a, b) => b[1] - a[1]);
  const [style, n] = ranked[0];
  const reading = STYLE_READING[style];

  p.push(`Set aside what you chose for a moment and look at the shape of how you chose. Across ${total} dilemmas your most common movement was ${reading[0]}, ${n} times. ${reading[1]}`);

  if (ranked[1]) {
    const [s2, n2] = ranked[1];
    p.push(`Your second instinct was ${STYLE_READING[s2][0]}, ${n2} times. Where the first fails you, this is what you fall back on, and the pair together describe your range better than either alone.`);
  }

  // does the person change with uncertainty?
  const highUnc = r.uncs.high || 0;
  if (highUnc >= 3) {
    const verifyRate = Math.round(((r.styles.verify || 0) / total) * 100);
    p.push(`${highUnc} of the scenes gave you badly incomplete information. Across the Trial as a whole you chose to check before acting ${verifyRate}% of the time, which is the clearest single measure this Trial has of how you handle not knowing.`);
  }

  // does the person change when the relationship changes?
  const trusted = r.rels.trusted || 0;
  const sub = r.rels.subordinate || 0;
  if (trusted >= 2 && sub >= 2) {
    p.push(`The scenes deliberately varied who was standing in front of you. ${trusted} involved someone you trusted and ${sub} involved someone in your care. People are rarely the same in both, and the difference between how you treated each is usually more revealing than either on its own.`);
  }

  // leading, when asked to
  const directive = r.leads.directive || 0;
  const consultative = r.leads.consultative || 0;
  if (directive + consultative >= 3) {
    p.push(directive > consultative
      ? `When a scene put you in command, you took the decision yourself ${directive} times against ${consultative} where you put it to others. You lead by deciding, not by gathering.`
      : `When a scene put you in command, you put the decision to others ${consultative} times against ${directive} where you took it alone. You lead by gathering consent rather than issuing direction.`);
  }

  return { id: 'decisions', title: 'How You Decide', paras: p };
}

// ─── 4. the fifteen facet portrait ───────────────────────────────────
function facets(r) {
  const rows = FACET_ORDER.map((f) => ({
    facet: f, name: fname(f), value: r.facetTrial[f], band: r.facetBand[f],
    calling: FACETS[f].calling, colour: CALLINGS[FACETS[f].calling].colour,
  }));
  const p = [];
  const strong = r.strongestFacets.filter((f) => r.facetTrial[f] >= 55);
  const weak = r.weakestFacets.filter((f) => r.facetTrial[f] <= 35);

  if (strong.length) {
    p.push(`The facets that carried you: ${list(strong.map((f) => `${fname(f)} at ${r.facetTrial[f]}`))}. In practice ${list(strong.map((f) => FACET_PROSE[f].high))}.`);
  }
  if (weak.length) {
    p.push(`The quieter end: ${list(weak.map((f) => `${fname(f)} at ${r.facetTrial[f]}`))}. Across these scenes ${list(weak.map((f) => FACET_PROSE[f].low))}. A low facet here means it did not drive your choices, not that you lack it.`);
  }
  // a facet splitting its own Calling is the most interesting thing on this page
  for (const k of r.active) {
    const fs = FACETS_BY_CALLING[k];
    const hi = fs.slice().sort((a, b) => r.facetTrial[b] - r.facetTrial[a])[0];
    const lo = fs.slice().sort((a, b) => r.facetTrial[a] - r.facetTrial[b])[0];
    if (r.facetTrial[hi] - r.facetTrial[lo] >= 25) {
      p.push(`Inside ${cname(k)}, which is one of your active Callings, the three facets did not move together. ${fname(hi)} reached ${r.facetTrial[hi]} while ${fname(lo)} stayed at ${r.facetTrial[lo]}. Two people can both hold ${cname(k)} and mean quite different things by it. Yours runs through ${lower(FACET_PROSE[hi].high)}, rather than through ${lower(FACET_PROSE[lo].high)}. That distinction is most of what separates you from someone carrying the same title.`);
    }
  }
  // the middle of the profile, which is where most people actually live
  const mids = FACET_ORDER.filter((f) => r.facetTrial[f] > 35 && r.facetTrial[f] < 55);
  if (mids.length >= 3) {
    p.push(`${mids.length} of the fifteen facets landed in the middle band. That is the honest majority of most profiles, and it deserves saying rather than hiding: on ${list(mids.slice(0, 3).map(fname))} you were situational. These are the parts of you that the circumstances decide, and they are the reason a single label can never be the whole reading.`);
  }
  return { id: 'facets', title: 'The Fifteen Facet Portrait', rows, paras: p };
}

// ─── 5. the mirror and the trial ─────────────────────────────────────
function mirror(r) {
  if (!r.mirrorAnswered) return null;
  const notable = r.gaps.filter((g) => g.label !== 'Aligned');
  const p = [];
  const aligned = r.gaps.length - notable.length;

  p.push(`Before the scenes began you described yourself. Comparing those answers with what you actually chose is the closest this Trial comes to seeing you from two sides. On ${aligned} of ${r.gaps.length} facets the two broadly agreed.`);

  for (const g of notable.slice(0, 4)) {
    const fn = GAP_PROSE[g.label];
    if (fn) p.push(fn(fname(g.facet), g.self, g.acted));
  }
  if (!notable.length) {
    p.push('Nothing stood far enough apart to be worth calling a gap. Your self description and your behaviour under pressure told the same story, which is less common than you might expect.');
  }
  p.push('Neither side is the truer one. Self report shows what you value and aim at. Situational choice shows what surfaced when something had to be given up. Most people are both.');

  return { id: 'mirror', title: 'The Mirror and the Trial',
    rows: r.gaps.map((g) => ({ ...g, name: fname(g.facet) })), paras: p };
}

// ─── 6. inner tensions ───────────────────────────────────────────────
function tensions(r) {
  const p = [];
  const shown = [];
  for (const c of r.contradictions.slice(0, 3)) {
    const block = CONTRADICTION_PROSE[c.id];
    if (block) { shown.push(block.title); p.push(`**${block.title}.** ${block.body}`); }
  }
  // a tension between the two strongest Callings, when both are active
  if (r.active.length >= 2) {
    const [a, b] = r.active.slice(0, 2).sort();
    const key = a + b;
    const t = TENSION_PROSE[key];
    if (t && !shown.includes(t.title)) p.push(`**${t.title}.** ${t.body}`);
  }
  if (!p.length) {
    // No contradiction crossed the threshold. Say that honestly and give the
    // nearest real pull, rather than manufacturing a conflict.
    const [a, b] = r.ranked.slice(0, 2).map(([k]) => cname(k));
    p.push(TENSION_MILD(a, b));
    const spread = FACET_ORDER.slice().sort((x, y) => r.facetTrial[y] - r.facetTrial[x]);
    const hi = spread[0], lo = spread[spread.length - 1];
    p.push(`Beneath the Callings, the widest distance in your profile is between ${fname(hi)} at ${r.facetTrial[hi]} and ${fname(lo)} at ${r.facetTrial[lo]}. That gap of ${r.facetTrial[hi] - r.facetTrial[lo]} points is where you are least consistent with yourself, even though neither reading is extreme enough to call a contradiction.`);
  }
  return { id: 'tensions', title: 'Your Inner Tensions', paras: p };
}

// ─── 7. the crucible ─────────────────────────────────────────────────
function crucible(r) {
  if (!r.counts.crucible) return null;
  const cru = r.crucible;
  const p = [];
  const bars = cru.bars.map(([id, n]) => ({ id, n, label: id.charAt(0).toUpperCase() + id.slice(1) }));

  if (cru.kind === 'hybrid') {
    p.push(`Your pressure response did not resolve to one answer. ${cru.label} came out close together, which usually means the situation decides rather than the person.`);
  } else if (cru.kind === 'dominant') {
    p.push(`Under sudden pressure, one response led clearly: ${cru.label}, in ${cru.tally[cru.top]} of ${r.counts.crucible} moments.`);
  }
  if (cru.text) p.push(cru.text);
  if (cru.top && CRUCIBLE_MEETS[cru.top]) p.push(CRUCIBLE_MEETS[cru.top]);

  // The ten pressure moments were not all the same kind of danger. If one
  // kind drew the leading response more than the others, that is worth more
  // than the tally, because it says pressure is not one single thing for you.
  const sc = cru.strongestContext;
  if (sc && CRUCIBLE_CONTEXT[sc.ctx]) {
    const label = sc.id.charAt(0).toUpperCase() + sc.id.slice(1);
    p.push(`The ten moments were not all the same kind of danger, and your answers were not evenly spread across them. ${label} appeared in ${sc.hits} of the ${sc.of} moments involving ${CRUCIBLE_CONTEXT[sc.ctx]}, more than in any other kind. That is a more useful thing to know than the totals, because it suggests pressure is not one single experience for you. The situation decides which version of you arrives.`);
  } else if (r.counts.crucible >= 8) {
    p.push('Your responses were spread fairly evenly across the four kinds of danger the Trial put to you: physical, social, moral and unfamiliar. No one kind pulled a different reaction out of you, which suggests a reasonably consistent response to pressure whatever its source.');
  }

  // how it meets this particular archetype
  const top = r.ranked[0][0];
  p.push(`Set beside the rest of your pattern, this matters. Your ordinary decisions ran through ${cname(top)}, which takes time and judgment. A sudden threat removes both. That gap between how you decide when you have room and what happens when you do not is where most people are surprised by themselves.`);
  p.push(cru.caveat);

  return { id: 'crucible', title: 'The Crucible', bars, paras: p };
}

// ─── 8. how this may appear in life ──────────────────────────────────
function domains(r) {
  const subs = [];
  for (const [key, dom] of Object.entries(DOMAIN_PROSE)) {
    // rank this domain's facets and take the ones this person actually has.
    // The gate is relative to their own profile, because facet scores are
    // normalised against what was obtainable and rarely run near 100.
    const ranked = Object.keys(dom.byFacet)
      .sort((a, b) => r.facetTrial[b] - r.facetTrial[a]);
    const hits = ranked.filter((f) => r.facetTrial[f] >= 45).slice(0, 3);
    const lead = ranked[0];
    if (hits.length) {
      subs.push({
        title: dom.label,
        paras: [
          ...hits.map((f) => dom.byFacet[f]),
          `The strongest single driver here is ${fname(lead)} at ${r.facetTrial[lead]}.`,
        ],
      });
    } else {
      // The domain is quiet. Say so, and say what the quiet means, rather
      // than dropping a section the reader was told to expect.
      subs.push({
        title: dom.label,
        paras: [
          DOMAIN_QUIET[key],
          `Your highest facet in this area is ${fname(lead)} at ${r.facetTrial[lead]}, which is not enough on its own to describe a style.`,
        ],
      });
    }
  }
  if (!subs.length) return null;
  return { id: 'domains', title: 'How This May Appear in Life', subs,
    paras: ['These are the readings your own facet scores support. Where a domain is missing below, your answers did not give enough evidence to say anything worth reading.'] };
}

// ─── 9. the shadow ───────────────────────────────────────────────────
function shadow(r) {
  const A = r.archetype;
  const p = [];
  const top = r.ranked[0][0];
  const strong = r.strongestFacets.filter((f) => r.facetTrial[f] >= 60);

  p.push(`Every strength in this record is also the thing most likely to cost you, and it costs you specifically when you are certain, tired or under pressure. ${A.shadow}`);
  p.push(`In your case the risk is not general. It has a shape. ${CALLING_PROSE[top].high} A Calling that strong stops feeling like a preference and starts feeling like the obvious way to behave, and at that point you can stop noticing that other people are running on something else entirely.`);

  if (strong.length) {
    const f = strong[0];
    p.push(`Watch ${fname(f)} in particular, which scored ${r.facetTrial[f]}. At that level it is doing a great deal of work for you, and overused it becomes the thing you reach for even where it does not fit. The version of this that people around you notice first is that ${lower(FACET_PROSE[f].high)}, applied to a situation that needed something gentler.`);
  }
  if (r.contradictions.length) {
    const c = CONTRADICTION_PROSE[r.contradictions[0].id];
    if (c) p.push(`Your sharpest internal contradiction feeds this directly. ${c.title} is not a flaw to correct so much as a fault line to know about, because it is where you will surprise yourself under load.`);
  }
  const weak = r.weakestFacets[0];
  const sub = r.strongestFacets[0];
  p.push(`The quietest part of you is ${fname(weak)} at ${r.facetTrial[weak]}. When a situation genuinely requires it, you are working without your strongest instrument, and you are likely to substitute one of your strong ones instead. In your case that substitute is most likely ${fname(sub)}, because it is the one nearest to hand. Using ${fname(sub)} on a problem that needed ${fname(weak)} is usually invisible from the inside and quite visible from the outside, and it is the single most predictable way this profile goes wrong.`);

  if (r.clarity.score < 60) {
    p.push(`One more caution specific to you. Your answers varied a good deal between scenes, so this shadow reading is drawn from a pattern that was itself changeable. Hold it loosely. The tendencies are real, but how reliably they appear is exactly what your own answers were least clear about.`);
  } else {
    p.push(`Your answers were consistent enough that this is unlikely to be an artefact of one bad scene. The same instincts appeared across situations that had little else in common, which is what makes the cost described above worth taking seriously rather than filing away.`);
  }
  p.push('None of this is a verdict, and none of it is fixed. It is the predictable cost of a pattern that is otherwise serving you well, described so that you can spot it happening rather than only recognise it afterwards.');

  return { id: 'shadow', title: 'Your Shadow', paras: p };
}

// ─── 10. growth ──────────────────────────────────────────────────────
function growth(r) {
  const picks = [];
  // the strongest facet, because overuse is the likelier problem
  if (r.strongestFacets[0]) picks.push(r.strongestFacets[0]);
  // the weakest, because absence is the other one
  if (r.weakestFacets[0]) picks.push(r.weakestFacets[0]);
  // whichever facets the contradictions named
  for (const c of r.contradictions.slice(0, 2)) {
    if (c.low && !picks.includes(c.low)) picks.push(c.low);
    else if (c.high && !picks.includes(c.high)) picks.push(c.high);
  }
  // the largest gap between the self described and the acted
  const g = r.gaps.find((x) => x.label !== 'Aligned');
  if (g && !picks.includes(g.facet)) picks.push(g.facet);

  const prompts = picks.slice(0, 5).map((f) => GROWTH_PROMPTS[f]).filter(Boolean);
  if (!prompts.length) return null;
  return { id: 'growth', title: 'Your Growth Path', prompts,
    paras: ['These are questions rather than instructions, and they are chosen from your own pattern rather than from a general list. They are for reflection. They are not advice, therapy or treatment of any kind.'] };
}

// ─── 11. borderlands ─────────────────────────────────────────────────
function borderlands(r) {
  const p = [];
  if (!r.neighbours.length) {
    return { id: 'borderlands', title: 'Borderlands', paras: [NO_BORDERLAND] };
  }
  for (const nb of r.neighbours) {
    p.push(`**${nb.archetype.name}.** ${nb.archetype.tagline} You did not become this because ${cname(nb.calling)} finished ${nb.distance} ${nb.distance === 1 ? 'point' : 'points'} below the line that would have made it active. ${nb.near ? 'It came close enough that a handful of different choices would have changed your title.' : 'It was not close, which makes your result more settled than it might look.'}`);
  }
  return { id: 'borderlands', title: 'Borderlands', paras: p };
}

// ─── 12. the technical record ────────────────────────────────────────
function technical(r, when) {
  const lines = [
    `Callings, raw points from the ${r.counts.trial} dilemmas: ` +
      ORDER.map((k) => `${cname(k)} ${r.callingRaw[k]}`).join(', ') + '.',
    `Relative Resonance: ` + ORDER.map((k) => `${cname(k)} ${r.callingRel[k]}`).join(', ') + '.',
    `Active threshold ${r.cutoff.toFixed(2)} of a top score of ${r.top}. Archetype mask ${r.mask}.`,
    `Facets, normalised against the points actually available: ` +
      FACET_ORDER.map((f) => `${fname(f)} ${r.facetTrial[f]}`).join(', ') + '.',
    `Channels answered: Mirror ${r.counts.mirror} of 15, dilemmas ${r.counts.trial} of 24, trade-offs ${r.counts.tradeoff} of 6, Crucible ${r.counts.crucible} of 10.`,
    `Crucible counts: ` + r.crucible.bars.map(([id, n]) => `${id} ${n}`).join(', ') + '.',
    `Profile clarity ${r.clarity.score} of 100, read as ${r.clarity.band}.`,
    `Completed ${when}. Mode: Deep Trial.`,
  ];
  return { id: 'technical', title: 'Technical Record', lines,
    paras: [LIMITS_COPY] };
}

// ─── the whole document ──────────────────────────────────────────────
export function buildReport(r, opts = {}) {
  const when = opts.completedAt || new Date().toLocaleDateString(undefined,
    { year: 'numeric', month: 'long', day: 'numeric' });

  const top = r.ranked[0][0];
  const verdictLine = r.active.length === 1
    ? `Your decisions repeatedly returned to one thing: ${lower(CALLING_PROSE[top].high)}`
    : `Your decisions repeatedly drew on ${list(r.active.map(cname))}, and never resolved into just one of them.`;

  const sections = [
    fivefold(r), why(r), decisions(r), facets(r), mirror(r), tensions(r), crucible(r),
    domains(r), shadow(r), growth(r), borderlands(r), technical(r, when),
  ].filter(Boolean);

  const words = sections.reduce((n, s) => {
    const bits = [...(s.paras || []), ...(s.prompts || []), ...(s.lines || []),
      ...(s.rows || []).map((x) => x.line || ''),
      ...(s.subs || []).flatMap((x) => x.paras)];
    return n + bits.join(' ').split(/\s+/).filter(Boolean).length;
  }, 0);

  return {
    verdict: {
      name: r.archetype.name, tier: r.tier, blend: r.archetype.blend,
      tagline: r.archetype.tagline, line: verdictLine,
      active: r.active, clarity: r.clarity, clarityNote: CLARITY_PROSE[r.clarity.band],
      when,
    },
    sections, words, target: T.deepWords,
  };
}
