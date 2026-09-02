// Assembles the result from the workbook's report library plus the reader's
// own scores. Deterministic: the same answers always give the same document.
//
// Section order follows the workbook's "Recommended Result Page Structure".

import { CALLINGS, ORDER, ARCHETYPES, RULES, SCIENCE_NOTE, AFFINITY_NOTE, bandOf }
  from '../data/fivefold.js';

const cname = (k) => CALLINGS[k].name;
const list = (arr) => arr.length <= 1 ? (arr[0] || '')
  : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
// The library writes lists as "a; b; c". This site does not use semicolons.
const sentences = (text) => String(text || '')
  .split(/;\s*/).map((s) => s.trim()).filter(Boolean)
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .map((s) => (/[.!?]$/.test(s) ? s : s + '.'));

export function buildFivefold(r, opts = {}) {
  const A = r.archetype;
  const when = opts.completedAt || new Date().toLocaleDateString(undefined,
    { year: 'numeric', month: 'long', day: 'numeric' });

  // 2. all five, always, active or not
  const bars = r.ranked.map((k) => ({
    calling: k,
    name: cname(k),
    dimension: CALLINGS[k].dimension,
    raw: r.raw[k],
    affinity: r.display[k],
    band: r.bands[k],
    active: r.active[k],
    colour: CALLINGS[k].colour,
  }));

  const sections = [];

  // The pattern, in the reader's own numbers. The workbook supplies band
  // language precisely so the five scores can be described without
  // overclaiming, so that is what this uses.
  const top = r.ranked[0], bottom = r.ranked[r.ranked.length - 1];
  const strongInactive = r.ranked.filter((k) => !r.active[k] && r.affinity[k] >= RULES.activeMin);
  const patternParas = [
    `Your highest is ${cname(top)} at ${r.display[top]}, which reads as ${r.bands[top]}. Your quietest is ${cname(bottom)} at ${r.display[bottom]}, which reads as ${r.bands[bottom]}. ${bandOf(r.affinity[bottom]).meaning}`,
  ];
  if (r.activeKeys.length === 1) {
    patternParas.push(`Only ${cname(r.activeKeys[0])} reached the line that defines an archetype, which is why your result rests on a single Calling rather than a blend.`);
  } else {
    const both = r.activeKeys.length === 2 ? 'both' : 'all';
    patternParas.push(`${list(r.activeKeys.map(cname))} ${both} reached the line and sit close enough together to count as one pattern. That is what makes this a ${A.tier.toLowerCase()} rather than a single motive.`);
  }
  if (strongInactive.length) {
    patternParas.push(`${list(strongInactive.map(cname))} scored strongly without counting toward the archetype, being more than ${RULES.activeDistance} points below your highest. Read those as real capacities that are not, on this test, what organises you.`);
  }
  patternParas.push(AFFINITY_NOTE);
  sections.push({ id: 'pattern', title: 'Your Fivefold Pattern', paras: patternParas });

  // 3. essence
  sections.push({
    id: 'essence', title: 'Your Essence',
    paras: [
      A.essence + (A.essence.endsWith('.') ? '' : '.'),
      `${A.reveal} In the world of the books, this is the shape of ${A.role}.`,
    ],
  });

  // 4. how you decide
  sections.push({
    id: 'decide', title: 'How You Decide',
    paras: sentences(A.decide),
  });

  // 5. strengths
  sections.push({
    id: 'strengths', title: 'Your Strengths',
    items: sentences(A.strengths).map((s) => s.replace(/\.$/, '')),
    paras: [],
  });

  // 6. relationships
  sections.push({
    id: 'relationships', title: 'How You Relate to People',
    paras: sentences(A.relationships),
  });

  // 7. leadership and work
  sections.push({
    id: 'work', title: 'Leadership and Work',
    paras: sentences(A.work),
  });

  // 8. under pressure
  sections.push({
    id: 'shadow', title: 'Under Pressure',
    paras: [
      ...sentences(A.shadow),
      'This is the predictable distortion of your own strengths rather than a flaw sitting beside them. It shows up most when you are certain, tired or pushed.',
    ],
  });

  // 9. growth
  sections.push({
    id: 'growth', title: 'Your Growth Path',
    paras: [...sentences(A.growth),
      'That is a counterweight, not a correction. It is offered for reflection and is not advice of any clinical kind.'],
  });

  // 10. the nearest Calling that did not make the archetype
  if (r.nearest) {
    const n = r.nearest;
    const p = [
      `Your strongest Calling outside the result is ${cname(n.calling)}, at ${Math.round(n.affinity * 10) / 10} affinity, which reads as ${bandOf(n.affinity).label}. ${bandOf(n.affinity).meaning}`,
    ];
    if (n.wouldBecome) {
      p.push(n.shortBy > 0
        ? `It fell ${Math.round(n.shortBy * 10) / 10} points short of counting toward your archetype. Had it reached the line, your result would read ${n.wouldBecome.name} instead of ${A.name}.`
        : `Had it counted toward your archetype, your result would read ${n.wouldBecome.name} instead of ${A.name}.`);
    }
    p.push('A Calling can be a real capacity without being one of the motives that organises you. That gap is often where people find they are capable of more than they reach for.');
    sections.push({ id: 'nearest', title: 'Your Nearest Calling', paras: p });
  }

  // the technical appendix
  sections.push({
    id: 'technical', title: 'Technical Record',
    lines: [
      'Raw scores, out of a possible 8 to 40 per Calling: ' +
        ORDER.map((k) => `${cname(k)} ${r.raw[k]}`).join(', ') + '.',
      'Affinity, being (raw minus 8) divided by 32, as a percentage: ' +
        ORDER.map((k) => `${cname(k)} ${r.display[k]}`).join(', ') + '.',
      `A Calling counts toward the archetype at ${RULES.activeMin} affinity or above, and within ${RULES.activeDistance} points of your highest. Your highest was ${Math.round(r.max * 10) / 10}.`,
      `Active Callings: ${list(r.activeKeys.map(cname))}. Archetype code ${r.code} of 31.`,
      `Completed ${when}. ${RULES.itemsPerCalling} statements per Calling, ${ORDER.length * RULES.itemsPerCalling} in total.`,
    ],
    paras: [AFFINITY_NOTE, SCIENCE_NOTE],
  });

  const words = sections.reduce((n, s) => n +
    [...(s.paras || []), ...(s.items || []), ...(s.lines || [])]
      .join(' ').split(/\s+/).filter(Boolean).length, 0);

  return {
    verdict: {
      name: A.name, tier: A.tier, blend: A.blend, reveal: A.reveal,
      legacy: A.legacy, role: A.role, footer: A.footer,
      active: r.activeKeys, code: r.code, when,
    },
    bars, sections, words,
  };
}
