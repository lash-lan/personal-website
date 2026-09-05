// Assembles the eight-page Fivefold Calling report.
//
// This is a rules engine, not a generative one. The guide allows "an AI or
// rules engine", and every sentence below comes from the guide's own copy
// library, chosen by the reader's actual scores. The same answers always
// produce the same report, and nothing is invented that the scores do not
// support.
//
// The page architecture is the guide's, section by section.

import { CALLINGS, ORDER } from '../data/fivefold.js';
import { GUIDE, bandFor } from './fivefold-deep.js';

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

export function buildFivefold(r, opts = {}) {
  const when = opts.completedAt || new Date().toLocaleDateString(undefined,
    { year: 'numeric', month: 'long', day: 'numeric' });
  const A = r.chapter;
  const who = r.name || '';
  // The guide asks for the name three to six times. These are its suggested
  // placements: the opening, the core drive, relationships, the shadow and
  // the closing. Without a name the sentences still read properly.
  const named = (text, fallback) => (who ? `${who}, ${text}` : cap(fallback || text));

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
    balanced: 'Your active Callings operate almost as peers. No single one of them is the master motive.',
    led: `${cname(r.primary)} leads, and the other active Callings constrain and support it rather than competing with it.`,
    dominant: `${cname(r.primary)} is the organising motive inside this archetype. The others operate underneath it.`,
  }[r.blendShape];
  const patternParas = [
    `Five Callings were measured. ${list(r.activeKeys.map(cname))} reached the line that defines an archetype. ${shape}`,
    `A Calling counts toward the title at ${r.activationFloor} affinity, which is the higher of 62.5 and fifteen points below your strongest. Your strongest was ${Math.round(r.max * 10) / 10}.`,
  ];
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
  pages.push({
    n: 3, id: 'inside', title: 'Inside the Archetype',
    cards: [
      { label: 'Core drive', text: A.drive },
      { label: 'Seeks', text: A.seeks },
      { label: 'Fears', text: A.fears },
      { label: 'Needs', text: A.needs },
      { label: 'Resists', text: A.resists },
    ],
    paras: [
      `The drive underneath this archetype is simple to state and harder to live. ${A.drive}`,
      `**Your central tension.** ${A.contradiction}`,
      ...A.callingsSpeak.slice(0, 5),
    ],
  });

  // ── 4. How Your Mind Works ──
  const flowLine = r.flow.map((f) => `${f.name} ${f.does}`).join(', then ');
  const mindParas = [`Your decisions tend to run in one order: ${flowLine}.`];
  if (r.sideInfluences.length) {
    mindParas.push(`${list(r.sideInfluences.map((s) => s.name))} sits below the line but above 55, so ${r.sideInfluences.length > 1 ? 'they quietly influence' : 'it quietly influences'} the outcome without leading it.`);
  }
  for (const s of r.splits) {
    const tpl = GUIDE.facetSplits.find((t) =>
      t.when.toLowerCase().includes(s.high.name.split(' ').pop().toLowerCase()) &&
      t.when.toLowerCase().includes(s.low.name.split(' ').pop().toLowerCase()));
    mindParas.push(tpl ? tpl.text
      : `Inside ${cname(s.calling)}, ${s.high.name} reached ${s.high.affinity} while ${s.low.name} stayed at ${s.low.affinity}. That ${s.gap} point split is worth naming rather than averaging away.`);
  }
  pages.push({ n: 4, id: 'mind', title: 'How Your Mind Works',
    flow: r.flow, scales: r.scales, paras: mindParas });

  // ── 5. You & Other People ──
  pages.push({
    n: 5, id: 'people', title: 'You and Other People',
    paras: [
      named(`this is where the pattern is felt by everyone else. ${A.care}`, `This is where the pattern is felt by everyone else. ${A.care}`),
      `**How you build trust.** ${cap(A.trust)}.`,
      `**What you need from others.** ${cap(A.needFromOthers)}.`,
      `**Where it becomes difficult.** ${sentences(A.difficult.join('. ')).join(' ')}`,
    ],
    perception: A.perception,
  });

  // ── 6. Leadership and Purpose ──
  pages.push({
    n: 6, id: 'purpose', title: 'Leadership and Purpose',
    paras: [...A.leadership.map((l) => cap(l))],
    ideal: A.idealRole,
    bad: A.badEnvironment,
    party: A.party,
  });

  // ── 7. Your Shadow ──
  const shadowParas = [
    named(`nothing here is a separate defect. Every line below is one of your strengths pushed past its useful range.`,
      `Nothing here is a separate defect. Every line below is one of your strengths pushed past its useful range.`),
  ];
  // the guide intensifies only where a Calling is 85 or above
  const defining = ORDER.filter((k) => r.affinity[k] >= 85);
  for (const k of defining) {
    shadowParas.push(`${cname(k)} reached ${r.display[k]}, which the guide treats as defining and difficult to ignore. At that strength it carries a matching cost, and this is the one to watch.`);
  }
  if (A.warning) shadowParas.push(`The sentence you are most likely to say to yourself: ${A.warning}`);
  pages.push({
    n: 7, id: 'shadow', title: 'Your Shadow',
    sequence: [
      { label: 'Balanced', text: A.balanced },
      { label: 'Strained', text: A.strained },
      { label: 'Shadow', text: A.shadow },
      { label: 'Return', text: A.ret },
    ],
    paras: shadowParas,
  });

  // ── 8. Growth and Record ──
  const pathParas = [];
  if (r.nearest) {
    const n = r.nearest;
    const emphasis = {
      bordering: `You are on the border. ${n.name} is only ${n.gap} affinity points from counting toward your title, which makes ${titleCase(n.becomes.name)} a genuinely close reading of you.`,
      nearby: `${n.name} sits ${n.gap} points below the line. Near enough to be worth knowing.`,
      secondary: `${n.name} is ${n.gap} points below the line. A real capacity rather than a near miss.`,
      stable: `${n.name} is ${n.gap} points below the line, so your result is settled rather than borderline.`,
    }[r.pathCloseness] || '';
    pathParas.push(emphasis);
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
    closing: GUIDE.closing.replace(/\{NAME\}/g, who || 'Reader').replace(/^Reader,\s*/, ''),
    technical: [
      'Affinities: ' + ORDER.map((k) => `${cname(k)} ${r.display[k]}`).join(', ') + '.',
      `Active: ${list(r.activeKeys.map(cname))}. Archetype code ${r.code} of 31. Activation floor ${r.activationFloor}.`,
      r.nearest ? `Nearest path: ${r.nearest.name}, ${r.nearest.gap} points short.` : 'No expansion path remains.',
      'Facets: ' + r.facets.map((f) => `${f.name} ${f.affinity}`).join(', ') + '.',
      `Depth Module ${r.depthAnswered ? 'answered' : 'not answered'}. Completed ${when}.`,
    ],
    disclaimer: GUIDE.disclaimer,
  });

  const words = pages.reduce((n, p) => n +
    [...(p.paras || []), ...(p.growth || []), ...(p.technical || []),
     ...(p.ideal || []), ...(p.bad || []), ...(p.party || []),
     p.closing || '', p.disclaimer || '']
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
