// Assembles the eight-page Fivefold Calling report.
//
// This is a rules engine, not a generative one. The guide allows "an AI or
// rules engine", and every sentence below comes from the guide's own copy
// library or from the reviewed facet copy, chosen by the reader's actual
// scores. The same answers always produce the same report, and nothing is
// invented that the scores do not support.
//
// The page architecture is the guide's, section by section.

import { CALLINGS, ORDER } from '../data/fivefold.js';
import { GUIDE } from './fivefold-deep.js';

const cname = (k) => CALLINGS[k].name;
const list = (a) => a.length <= 1 ? (a[0] || '')
  : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// The guide stores archetype names in capitals. Readers should not be shouted at.
const SMALL = new Set(['of', 'the', 'and']);
const titleCase = (s) => String(s || '').toLowerCase().split(' ')
  .map((w, i) => (i > 0 && SMALL.has(w) ? w : cap(w))).join(' ');
// the guide writes lists with semicolons, which this site does not use
const sentences = (t) => String(t || '').split(/\.\s+|;\s*/)
  .map((s) => s.trim()).filter(Boolean)
  .map((s) => cap(s).replace(/\.$/, '') + '.');

// The guide stores several fields as third person fragments with the subject
// left off, for example "shows care through loyalty" and "may carry
// responsibilities others never asked to be carried". Printed as they are they
// produce "Lash, this is where the pattern is felt. shows care through...".
// This restores the subject and puts the verb into second person.
const LEAD_ADVERBS = new Set(['often', 'usually', 'generally', 'sometimes', 'rarely', 'also', 'readily']);
const MODALS = /^(may|can|will|would|should|must|might)$/i;
export function secondPerson(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  if (/^[A-Z]/.test(s)) return s;          // already a complete sentence
  const words = s.split(' ');
  let i = 0;
  while (i < words.length && LEAD_ADVERBS.has(words[i].toLowerCase())) i++;
  // a modal is already in the bare form, so only a plain present tense verb
  // needs its third person ending removed
  if (i < words.length && !MODALS.test(words[i])) {
    words[i] = words[i].replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
  }
  return 'You ' + words.join(' ');
}

// "Oath: principle -> Watch: vigilance" and its unlabelled siblings
const stageTerms = (t) => String(t || '').split(/\s*->\s*/)
  .map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
const splitLabel = (p) => {
  const m = /^([A-Za-z]+):\s*(.+)$/.exec(p);
  return m ? { label: m[1], term: m[2] } : { label: null, term: p };
};

export function buildFivefold(r, opts = {}) {
  const when = opts.completedAt || new Date().toLocaleDateString(undefined,
    { year: 'numeric', month: 'long', day: 'numeric' });
  const A = r.chapter;
  const who = r.name || '';
  // The guide asks for the name three to six times. These are its suggested
  // placements: the opening, the core drive, relationships, the shadow and
  // the closing. Without a name the sentences still read properly.
  const named = (text, fallback) => (who ? `${who}, ${text}` : cap(fallback || text));
  const activeNames = r.activeKeys.map(cname);

  const bars = r.ranked.map((k) => ({
    calling: k, name: cname(k), dimension: CALLINGS[k].dimension,
    affinity: r.display[k], band: r.callingBands[k], active: r.active[k],
    colour: CALLINGS[k].colour, modifier: r.modifierFor(k),
  }));

  const pages = [];

  // ── 1. Your Calling ──
  pages.push({
    n: 1, id: 'calling', title: 'Your Calling',
    paras: [
      named(`your result is ${titleCase(A.name)}.`,
        `Your result is ${titleCase(A.name)}.`),
      A.baseIdentity.replace(/\{NAME\}/g, who || 'You').replace(/^You,\s*/, ''),
    ],
    motto: A.motto,
  });

  // ── 2. Your Fivefold Pattern ──
  const shape = {
    tied: 'Your active Callings scored identically. Nothing in the measurement makes one of them the master motive, so the title describes the shape of the profile rather than a dominant drive.',
    balanced: 'Your active Callings operate almost as peers. No single one of them is the master motive.',
    led: `${cname(r.primary)} leads, and the other active Callings constrain and support it rather than competing with it.`,
    dominant: `${cname(r.primary)} is the organising motive inside this archetype. The others operate underneath it.`,
  }[r.blendShape];

  const patternParas = [
    `Five Callings were measured. ${list(activeNames)} ${r.activeKeys.length > 1 ? 'count' : 'counts'} toward the title. ${shape}`,
  ];
  // The report must be honest about which rule produced the result. Saying a
  // Calling is active while the appendix says the floor was never reached is
  // the kind of contradiction that makes a real system look invented.
  if (r.activationRule === 'relative') {
    patternParas.push(
      `**A note on how this result was reached.** The absolute threshold for a Calling to count toward a title is 62.5 affinity. Your strongest reached ${r.display[r.primary]}, so no Calling cleared it. The guide's fallback then applies, and the highest scoring Callings activate relative to one another instead. This result came from that fallback rule rather than from any Calling passing the bar, and it should be read as the shape of your profile rather than as evidence of strong drives.`);
  } else {
    patternParas.push(
      `A Calling counts toward the title at 62.5 affinity, and must also stay within fifteen points of your strongest. Your strongest was ${Math.round(r.max * 10) / 10}, which put the working line at ${r.activationFloor}.`);
  }

  const emerging = ORDER.filter((k) => !r.active[k] && r.affinity[k] >= 55 && r.affinity[k] < 62.5);
  if (emerging.length) {
    patternParas.push(`${list(emerging.map(cname))} sat just below the line. Not part of the title, but strong enough to colour particular relationships and decisions, which is why ${emerging.length > 1 ? 'they appear' : 'it appears'} later in this record.`);
  }
  const quiet = ORDER.filter((k) => r.affinity[k] < 45);
  if (quiet.length) {
    patternParas.push(`${list(quiet.map(cname))} came out quiet. Read that as a counterweight you can borrow when your usual strengths begin to overreach, never as a defect.`);
  }
  pages.push({ n: 2, id: 'pattern', title: 'Your Fivefold Pattern', bars, paras: patternParas });

  // ── 3. Inside the Archetype ──
  // An archetype is not its Callings stacked up. The combination is the point,
  // so what emerges from it leads the page and the individual voices follow.
  const insideParas = [];
  if (r.activeKeys.length > 1) {
    insideParas.push(`**What emerges from the combination.** ${titleCase(A.name)} is not ${list(activeNames)} standing side by side. It is what happens when all ${r.activeKeys.length === 2 ? 'two' : r.activeKeys.length === 3 ? 'three' : r.activeKeys.length === 4 ? 'four' : 'five'} of them have to negotiate inside one person, on the same decision, at the same time. ${A.contradiction}`);
  } else {
    insideParas.push(`**Your central tension.** ${A.contradiction}`);
  }
  insideParas.push(`The drive underneath it is simple to state and harder to live. ${A.drive}`);
  insideParas.push(...r.notesFor('inside').map((n) => n.text));

  pages.push({
    n: 3, id: 'inside', title: 'Inside the Archetype',
    paras: insideParas,
    cards: [
      { label: 'Core drive', text: A.drive },
      { label: 'Seeks', text: cap(A.seeks) },
      { label: 'Fears', text: cap(A.fears) },
      { label: 'Needs', text: cap(A.needs) },
      { label: 'Resists', text: cap(A.resists) },
    ],
    voicesTitle: r.activeKeys.length > 1
      ? `How your ${r.activeKeys.length} Callings speak` : 'How your Calling speaks',
    voices: A.callingsSpeak.slice(0, 5),
  });

  // ── 4. How Your Mind Works ──
  const mindParas = [];
  if (r.tied) {
    // No evidence supports an ordering, so none is asserted.
    mindParas.push('**Your pattern does not show a reliable first voice.** Your active Callings scored identically, so nothing in your answers says which of them reaches a decision first. Context decides. In a question of fairness one will speak first, in a question of risk another will, and the order changes with the situation rather than staying fixed.');
    mindParas.push(`The sequence below is this archetype's default in the guide, shown so you can see the parts rather than because your scores selected that order.`);
  } else if (r.pathwaySource === 'reordered') {
    mindParas.push(`**Your decisions run in a particular order.** This archetype's usual first move is ${r.chapter.decisionPath && stageTerms(r.chapter.decisionPath[0])[0] ? splitLabel(stageTerms(r.chapter.decisionPath[0])[0]).term || stageTerms(r.chapter.decisionPath[0])[0] : ''}, but ${r.flow[0].name} scored high enough above it to take the lead, so your sequence begins there instead.`);
  } else {
    mindParas.push('**Your decisions tend to run in one order.** This is the pathway the guide gives this archetype, and nothing in your scores displaced it.');
  }
  if (r.sideInfluences.length) {
    mindParas.push(`${list(r.sideInfluences.map((s) => s.name))} ${r.sideInfluences.length > 1 ? 'sit' : 'sits'} below the line but above 55, so ${r.sideInfluences.length > 1 ? 'they influence' : 'it influences'} the outcome as a side voice rather than as a step in the sequence.`);
  }
  // the guide's own templates for a facet split inside one Calling
  for (const s of r.splits) {
    const tpl = GUIDE.facetSplits.find((t) =>
      t.when.toLowerCase().includes(s.high.name.split(' ').pop().toLowerCase()) &&
      t.when.toLowerCase().includes(s.low.name.split(' ').pop().toLowerCase()));
    mindParas.push(tpl ? tpl.text
      : `Inside ${cname(s.calling)}, ${s.high.name} reached ${s.high.affinity} while ${s.low.name} stayed at ${s.low.affinity}. That ${s.gap} point split is worth naming rather than averaging away.`);
  }
  mindParas.push(...r.notesFor('mind').map((n) => n.text));
  // Six bars all sitting on the midpoint say nothing, and should admit it.
  const scalesNote = r.scaleSpread < 8
    ? 'These six scales came out close to level. That is a real finding rather than a missing one. It means no single behavioural tendency runs far ahead of the others, and your behaviour is more likely to follow the situation than a fixed setting.'
    : null;

  pages.push({ n: 4, id: 'mind', title: 'How Your Mind Works',
    flow: r.flow, flowCertain: !r.tied, pathwaySource: r.pathwaySource,
    scales: r.scales, scalesNote, paras: mindParas });

  // ── 5. You & Other People ──
  // The guide stores intention and misreading as alternating lines. They are
  // paired here so the reader is not left to infer which belongs to which.
  const perceptionPairs = [];
  for (let i = 0; i + 1 < (A.perception || []).length; i += 2) {
    perceptionPairs.push({ mean: cap(A.perception[i]), hear: cap(A.perception[i + 1]) });
  }
  pages.push({
    n: 5, id: 'people', title: 'You and Other People',
    paras: [
      named(`this is where the pattern is felt by everyone else. ${secondPerson(A.care)}.`,
        `This is where the pattern is felt by everyone else. ${secondPerson(A.care)}.`),
      `**How you build trust.** ${secondPerson(A.trust).replace(/\.$/, '')}.`,
      `**What you need from others.** ${cap(A.needFromOthers).replace(/\.$/, '')}.`,
      `**Where it becomes difficult.** ${A.difficult.map((d) => secondPerson(d).replace(/\.$/, '') + '.').join(' ')}`,
      ...r.notesFor('people').map((n) => n.text),
    ],
    perceptionPairs,
  });

  // ── 6. Leadership and Purpose ──
  pages.push({
    n: 6, id: 'purpose', title: 'Leadership and Purpose',
    paras: [...A.leadership.map((l) => cap(l)), ...r.notesFor('purpose').map((n) => n.text)],
    ideal: A.idealRole.map(cap),
    bad: A.badEnvironment.map(cap),
    party: A.party.map(cap),
  });

  // ── 7. Your Shadow ──
  // The guide stores these four stages as arrow separated terms, one per
  // active Calling and in the same order, so they line up into a real
  // progression rather than four loose sentences.
  const balancedParts = stageTerms(A.balanced).map(splitLabel);
  const stageLabels = balancedParts.map((p) => p.label);
  const stageRow = (label, text, first) => ({
    label,
    terms: (first ? balancedParts.map((p) => p.term) : stageTerms(text))
      .map((t, i) => ({ calling: stageLabels[i] || null, term: cap(t) })),
  });
  const shadowSequence = [
    stageRow('Balanced', A.balanced, true),
    stageRow('Strained', A.strained),
    stageRow('Shadow', A.shadow),
    stageRow('Return', A.ret),
  ];

  const shadowParas = [
    named('nothing here is a separate defect. Every line below is one of your strengths pushed past its useful range, which is why the progression runs downward from exactly the things you are good at.',
      'Nothing here is a separate defect. Every line below is one of your strengths pushed past its useful range, which is why the progression runs downward from exactly the things you are good at.'),
  ];
  // the guide intensifies only where a Calling is 85 or above
  const defining = ORDER.filter((k) => r.affinity[k] >= 85);
  for (const k of defining) {
    shadowParas.push(`${cname(k)} reached ${r.display[k]}, which the guide treats as defining and difficult to ignore. At that strength it carries a matching cost, and this is the one to watch.`);
  }
  if (A.warning) shadowParas.push(`The sentence you are most likely to say to yourself: ${A.warning}`);
  pages.push({
    n: 7, id: 'shadow', title: 'Your Shadow',
    sequence: shadowSequence, paras: shadowParas,
  });

  // ── 8. Growth and Record ──
  const pathParas = [];
  let stability = null;

  // Two separate questions, and a tie can make either one unanswerable:
  // which Calling is closest to joining the pattern, and which is closest to
  // leaving it. Naming one when several are level would be the engine
  // selecting mechanically rather than the profile pointing anywhere.
  const leavingUnclear = r.tied && r.activeKeys.length > 1;
  const joiningUnclear = r.nearestAmbiguous || !r.nearest;

  if (leavingUnclear || joiningUnclear) {
    const parts = [];
    if (leavingUnclear) {
      parts.push(`All ${r.activeKeys.length === 5 ? 'five' : r.activeKeys.length} of your active Callings are currently tied, so no single Calling is uniquely closest to leaving the pattern.`);
    }
    if (!r.nearest) {
      parts.push('Every Calling already counts toward your title, so there is nothing left to join it.');
    } else if (r.nearestAmbiguous) {
      parts.push(`${list(r.nearestTied.map((p) => p.name))} are all exactly ${r.nearest.gap} points from the line, so none of them is uniquely closest to joining it either.`);
    }
    parts.push(`Your result therefore rests on the activation rule rather than on dominance between Callings.`);
    stability = { title: 'Archetype stability', text: parts.join(' ') };
  }

  if (r.nearest && !r.nearestAmbiguous) {
    const n = r.nearest;
    const emphasis = {
      bordering: `You are on the border. ${n.name} is only ${n.gap} affinity points from counting toward your title, which makes ${titleCase(n.becomes.name)} a genuinely close reading of you.`,
      nearby: `${n.name} sits ${n.gap} points below the line. Near enough to be worth knowing.`,
      secondary: `${n.name} is ${n.gap} points below the line. A real capacity rather than a near miss.`,
      stable: `${n.name} is ${n.gap} points below the line, so your result is settled rather than borderline.`,
    }[r.pathCloseness] || '';
    if (emphasis) pathParas.push(emphasis);
    pathParas.push(`Were it to cross, this record would read ${titleCase(n.becomes.name)} instead. ${n.becomes.motto}`);
    pathParas.push('This is not a suggestion that you should become another personality. A neighbouring result appears when one Calling becomes strong enough, or quiet enough, to cross the boundary.');
  }
  if (r.contraction && r.contraction.becomes) {
    pathParas.push(`In the other direction, ${r.contraction.name} sits only ${r.contraction.above} points above the line. Were it to fall below, the result would read ${titleCase(r.contraction.becomes.name)}.`);
  }

  pages.push({
    n: 8, id: 'growth', title: 'Growth and Record',
    growth: A.growth,
    paras: [
      named(`this is the useful part. ${A.atBest}`, `This is the useful part. ${A.atBest}`),
      ...pathParas,
    ],
    stability,
    closing: GUIDE.closing.replace(/\{NAME\}/g, who || 'Reader').replace(/^Reader,\s*/, ''),
    technical: [
      'Affinities: ' + ORDER.map((k) => `${cname(k)} ${r.display[k]}`).join(', ') + '.',
      `Active: ${list(activeNames)}. Archetype code ${r.code} of 31.`,
      r.activationRule === 'absolute'
        ? `Activation floor ${r.activationFloor}, cleared by every active Calling.`
        : `Absolute floor 62.5 was not reached by any Calling, so the relative fallback rule activated the highest scoring instead.`,
      !r.nearest ? 'No expansion path remains, every Calling already counts.'
        : r.nearestAmbiguous
          ? `Nearest path tied between ${list(r.nearestTied.map((p) => p.name))}, ${r.nearest.gap} points short each.`
          : `Nearest path: ${r.nearest.name}, ${r.nearest.gap} points short.`,
      leavingUnclear ? 'Active Callings tied, so no contraction path is reported.'
        : r.contraction ? `Contraction path: ${r.contraction.name}, ${r.contraction.above} points above the line.`
        : 'No active Calling sits close enough to the line to report a contraction path.',
      'Facets: ' + r.facets.map((f) => `${f.name} ${f.affinity}`).join(', ') + '.',
      `Decision pathway: archetype default${r.pathwaySource === 'reordered' ? ', reordered by score' : ''}${r.tied ? ', order not evidenced by your scores' : ''}.`,
      `Depth Module ${r.depthAnswered ? 'answered' : 'not answered'}. Completed ${when}.`,
    ],
    disclaimer: GUIDE.disclaimer,
  });

  const words = pages.reduce((n, p) => n +
    [...(p.paras || []), ...(p.growth || []), ...(p.technical || []),
     ...(p.ideal || []), ...(p.bad || []), ...(p.party || []), ...(p.voices || []),
     p.closing || '', p.disclaimer || '', p.scalesNote || '',
     p.stability ? p.stability.text : '']
      .join(' ').split(/\s+/).filter(Boolean).length, 0);

  return {
    verdict: {
      name: titleCase(A.name), tier: A.tier, blend: A.blend,
      motto: A.motto, reader: who, active: r.activeKeys, code: r.code, when,
    },
    // the page and the PDF both render from pages, so they cannot disagree
    bars, pages, words,
  };
}
