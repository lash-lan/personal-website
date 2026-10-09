// Turns a cast chart into a reading.
//
// A rules engine, not a generative one. Every sentence printed is either a
// fact out of the chart or a line out of kp-prose.js chosen by the chart's own
// numbers. The same birth data always produces the same report word for word,
// and nothing is asserted that the chart does not support.

import { castChart, formatDegree } from './kp-chart.js';
import { PLANETS, HOUSES, CONFIDENCE, CAVEAT } from '../data/kp-prose.js';

const ordinal = (n) => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};
const list = (a) => (a.length <= 1 ? (a[0] ?? 'nothing')
  : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

// How wrong the birth time can be before the Ascendant's sub lord changes.
// Measured by re-casting the chart a minute at a time rather than estimated,
// because the answer governs how much weight the reading can carry.
async function timeTolerance(request, limit = 30) {
  const base = await castChart(request);
  const subject = base.cusps[0].subLord;
  let earlier = limit;
  let later = limit;
  for (let m = 1; m <= limit; m++) {
    if (earlier === limit) {
      const c = await castChart(shift(request, -m));
      if (c.cusps[0].subLord !== subject) earlier = m;
    }
    if (later === limit) {
      const c = await castChart(shift(request, m));
      if (c.cusps[0].subLord !== subject) later = m;
    }
    if (earlier < limit && later < limit) break;
  }
  return { earlier, later, tolerance: Math.min(earlier, later), capped: limit };
}

function shift(request, minutes) {
  const { year, month, day, hour, minute } = request.local;
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes, 0));
  return {
    ...request,
    local: {
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(),
    },
  };
}

function confidenceFor(minutes) {
  const band = CONFIDENCE.find((c) => minutes >= c.minMinutes) ?? CONFIDENCE[CONFIDENCE.length - 1];
  return { grade: band.grade, note: band.note.replace('{m}', String(minutes)) };
}

// KP's significators, reduced to a plain count: how many of the twelve matters
// each planet speaks for, by occupying a house or ruling its cusp's sign.
function significatorStrength(chart) {
  const tally = {};
  for (const p of chart.planets) tally[p.name] = { planet: p.name, houses: new Set() };
  for (let h = 1; h <= 12; h++) {
    for (const name of chart.occupants[h]) tally[name].houses.add(h);
    for (const name of chart.owners[h]) tally[name].houses.add(h);
  }
  return Object.values(tally)
    .map((t) => ({ planet: t.planet, houses: [...t.houses].sort((a, b) => a - b) }))
    .sort((a, b) => b.houses.length - a.houses.length || a.planet.localeCompare(b.planet));
}

export async function buildReading(request, name = '') {
  const chart = await castChart(request);
  const tol = await timeTolerance(request);
  const confidence = confidenceFor(tol.tolerance);
  const asc = chart.cusps[0];
  const moon = chart.planets.find((p) => p.name === 'Moon');
  const strength = significatorStrength(chart);
  const who = name.trim() || 'This chart';
  const addressed = name.trim() ? name.trim() : 'You';

  const sections = [];

  // ── 1. the reading's own reliability, first and not last ─────────────
  sections.push({
    kind: 'note',
    heading: 'How much this reading can be trusted',
    tone: confidence.grade,
    body: [
      confidence.note,
      tol.tolerance >= tol.capped
        ? `Tested minute by minute, the sub lord of your Ascendant held steady across the full ${tol.capped} minutes either side that this engine checks.`
        : `Tested minute by minute: ${tol.earlier >= tol.capped ? `more than ${tol.capped}` : tol.earlier} minutes earlier, or ${tol.later >= tol.capped ? `more than ${tol.capped}` : tol.later} minutes later, and the sub lord of your Ascendant is a different planet.`,
      'This is said first because KP is unusually brittle. A sub can be a few arcminutes wide, and a reading built on the wrong side of one boundary is not a slightly different reading. It is a different reading.',
    ],
  });

  // ── 2. the three lords of the self ───────────────────────────────────
  sections.push({
    kind: 'prose',
    heading: 'The three lords of your Ascendant',
    body: [
      `Your Ascendant stands at ${formatDegree(asc.degreeInSign)} of ${asc.sign}, in the star of ${asc.nakshatra}, in the sub of ${asc.subLord}. KP reads that as three voices over the same matter, and it gives them very different weight.`,
      `${asc.signLord} is the sign lord, which is the widest and weakest of the three: ${PLANETS[asc.signLord].asSign}.`,
      `${asc.starLord} is the star lord, and KP treats the star lord as the governing voice: ${PLANETS[asc.starLord].asStar}.`,
      `${asc.subLord} is the sub lord, which in KP decides the outcome rather than the character of it: ${PLANETS[asc.subLord].asSub}.`,
      asc.signLord === asc.subLord
        ? `${asc.signLord} holds both the sign and the sub here. The tradition reads a doubled lord as a matter with little internal argument: ${PLANETS[asc.subLord].keynote} runs the question at both ends.`
        : `Where the sign lord and the sub lord differ, KP expects a pull between them. Here the frame is ${PLANETS[asc.signLord].keynote}, while the deciding voice is ${PLANETS[asc.subLord].keynote}.`,
      `${addressed}${name.trim() ? ',' : ''} the temperament the tradition assigns to that deciding planet is this: ${PLANETS[asc.subLord].temper}.`,
    ],
  });

  // ── 3. the Moon, which KP uses as the mind ───────────────────────────
  sections.push({
    kind: 'prose',
    heading: 'The Moon, and what KP reads from it',
    body: [
      `Your Moon stands at ${formatDegree(moon.degreeInSign)} of ${moon.sign}, star of ${moon.nakshatra}, sub of ${moon.subLord}, in the ${ordinal(moon.house)} house. KP uses the Moon for the mind and for timing rather than for character.`,
      `Its star lord is ${moon.starLord}: ${PLANETS[moon.starLord].asStar}.`,
      `Its sub lord is ${moon.subLord}: ${PLANETS[moon.subLord].asSub}.`,
      `The ${ordinal(moon.house)} house is ${HOUSES[moon.house - 1].matter} — ${HOUSES[moon.house - 1].holds}. With the Moon there, the tradition expects your attention to return to that ground whether or not you choose it.`,
    ],
  });

  // ── 4. the twelve matters, each by its cuspal sub lord ───────────────
  sections.push({
    kind: 'houses',
    heading: 'The twelve matters',
    intro: 'KP asks of each house not what it is like but whether it comes off, and it hands that decision to the sub lord of the cusp. Each line below names the cusp, its three lords, and what the tradition says the deciding planet makes the matter depend on.',
    rows: chart.cusps.map((c) => ({
      house: c.house,
      matter: HOUSES[c.house - 1].matter,
      holds: HOUSES[c.house - 1].holds,
      position: `${formatDegree(c.degreeInSign)} ${c.sign}`,
      signLord: c.signLord,
      starLord: c.starLord,
      subLord: c.subLord,
      question: HOUSES[c.house - 1].cuspal,
      verdict: PLANETS[c.subLord].asSub,
      occupants: chart.occupants[c.house],
    })),
  });

  // ── 5. which planets speak for most of the chart ─────────────────────
  const top = strength.filter((s) => s.houses.length === strength[0].houses.length);
  sections.push({
    kind: 'prose',
    heading: 'The planets that speak for most of your chart',
    body: [
      `Counting both the houses a planet sits in and the houses whose cusp it rules, ${list(top.map((t) => t.planet))} ${top.length === 1 ? 'speaks' : 'speak'} for the most of this chart — ${top[0].houses.length} of the twelve matters.`,
      ...top.map((t) => `${t.planet} carries ${list(t.houses.map((h) => `the ${ordinal(h)} (${HOUSES[h - 1].matter})`))}. Its keynote is ${PLANETS[t.planet].keynote}, and the tradition reads it as ${PLANETS[t.planet].temper}.`),
      `${strength[strength.length - 1].planet} speaks for the fewest: ${strength[strength.length - 1].houses.length === 0 ? 'none of the twelve, by either route' : list(strength[strength.length - 1].houses.map((h) => `the ${ordinal(h)}`))}.`,
    ],
  });

  // ── 6. the positions themselves, for checking ────────────────────────
  sections.push({
    kind: 'planets',
    heading: 'The positions, for checking',
    intro: `Sidereal longitudes, Krishnamurti ayanamsa ${formatDegree(chart.ayanamsa)}. Any KP program should reproduce these to within an arcminute. If one does not, one of us is wrong and it is worth finding out which.`,
    rows: chart.planets.map((p) => ({
      name: p.name,
      position: `${formatDegree(p.degreeInSign)} ${p.sign}`,
      nakshatra: p.nakshatra,
      pada: p.pada,
      signLord: p.signLord,
      starLord: p.starLord,
      subLord: p.subLord,
      house: p.house,
      retrograde: p.retrograde,
      subNumber: p.subNumber,
      marginMinutes: p.marginMinutes,
    })),
  });

  sections.push({ kind: 'caveat', heading: CAVEAT.heading, body: CAVEAT.body });

  return {
    title: name.trim() ? `${name.trim()} — KP Reading` : 'KP Reading',
    subject: who,
    meta: [
      ['Born', `${pad(request.local.day)} ${MONTHS[request.local.month - 1]} ${request.local.year}, ${pad(request.local.hour)}:${pad(request.local.minute)} local time`],
      ['Place', request.place ?? `${request.latitude.toFixed(4)}, ${request.longitude.toFixed(4)}`],
      ['Zone used', `${request.zone} (${chart.offsetMinutes >= 0 ? '+' : '−'}${pad(Math.floor(Math.abs(chart.offsetMinutes) / 60))}:${pad(Math.abs(chart.offsetMinutes) % 60)} at that instant)`],
      ['Universal time', chart.instant.replace('T', ' ').replace('.000Z', ' UTC')],
      ['Ayanamsa', `${formatDegree(chart.ayanamsa)} (Krishnamurti)`],
      ['Houses', 'Placidus, as KP requires'],
    ],
    confidence,
    chart,
    sections,
  };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');
