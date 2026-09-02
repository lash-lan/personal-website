// Generates src/data/fivefold.js straight from the specification workbook,
// so the site's data provably matches the spreadsheet rather than being
// retyped by hand.
//
//   node scripts/build-fivefold-data.mjs "path/to/workbook.xlsx"
//
// Re-run it whenever the workbook changes.

import XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';

const src = process.argv[2] ||
  'C:/Users/lashlan.a/Downloads/Fivefold_Calling_Complete_Rules_Logic_and_Reports (1).xlsx';

const wb = XLSX.readFile(src);
const sheet = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' });
const clean = (v) => String(v).replace(/\s+/g, ' ').trim();
const q = (s) => "'" + clean(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

// ── the five Callings, and the colours the site already uses ──
const CALLING_META = {
  'The Oath':   { key: 'O', weight: 1,  dimension: 'Virtue',    colour: '#C89B3C' },
  'The Hearth': { key: 'H', weight: 2,  dimension: 'Devotion',  colour: '#9E3030' },
  'The Forge':  { key: 'F', weight: 4,  dimension: 'Mastery',   colour: '#406A9B' },
  'The Voice':  { key: 'V', weight: 8,  dimension: 'Influence', colour: '#2F7D78' },
  'The Watch':  { key: 'W', weight: 16, dimension: 'Vigilance', colour: '#684A87' },
};

// ── questions ──
const qRows = sheet('Questions & Key').slice(3).filter((r) => Number(r[0]));
if (qRows.length !== 40) throw new Error(`expected 40 questions, found ${qRows.length}`);
const questions = qRows.map((r) => ({
  n: Number(r[0]),
  t: clean(r[1]),
  calling: CALLING_META[clean(r[3])].key,
  reverse: clean(r[4]).toUpperCase() === 'YES',
}));
for (const k of Object.values(CALLING_META)) {
  const n = questions.filter((x) => x.calling === k.key).length;
  if (n !== 8) throw new Error(`${k.key} has ${n} items, expected 8`);
}

// ── the 31 archetypes and their report copy ──
const libRows = sheet('Report Library');
const head = libRows[2].map(clean);
const col = (name) => {
  const i = head.indexOf(name);
  if (i === -1) throw new Error(`missing column "${name}"`);
  return i;
};
const F = {
  code: col('Code'), tier: col('Tier'), name: col('Archetype'),
  blend: col('Active Callings'), reveal: col('Reveal Line'), essence: col('Essence'),
  strengths: col('Core Strengths'), decide: col('Decision Style'),
  relationships: col('Relationships'), work: col('Leadership / Work'),
  shadow: col('Shadow Pattern'), growth: col('Growth Path'),
  role: col('Fantasy Role Feel'), footer: col('Result Footer'), legacy: col('Legacy Name'),
};
const archRows = libRows.slice(3).filter((r) => Number(r[F.code]));
if (archRows.length !== 31) throw new Error(`expected 31 archetypes, found ${archRows.length}`);

// ── the affinity bands ──
const bandRows = sheet('Score Bands').slice(3).filter((r) => clean(r[1]));
const bands = bandRows.map((r) => {
  const from = parseFloat(String(r[0]).split(/[–-]/)[0]);
  return { at: from, label: clean(r[1]), meaning: clean(r[3]) };
}).sort((a, b) => b.at - a.at);

// ── emit ──
const lines = [];
lines.push(`// The Fivefold Calling: questions, scoring constants and all 31 results.
//
// GENERATED FROM THE SPECIFICATION WORKBOOK. Do not edit by hand.
//   node scripts/build-fivefold-data.mjs "path/to/workbook.xlsx"
//
// Every string below is taken verbatim from the workbook, so the site and the
// specification cannot drift apart.

export const TEST_NAME = 'The Fivefold Calling';
export const TEST_CTA = 'Begin the Fivefold Trial';

// Scoring constants, from the Developer Spec sheet.
export const RULES = {
  likertMin: 1,
  likertMax: 5,
  itemsPerCalling: 8,
  rawMin: 8,
  rawMax: 40,
  activeMin: 62.5,          // a Calling must reach this to be archetype-defining
  activeDistance: 15,       // and be within this many points of the highest
};

export const CALLINGS = {`);
for (const [publicName, m] of Object.entries(CALLING_META)) {
  lines.push(`  ${m.key}: { key: '${m.key}', name: ${q(publicName)}, dimension: ${q(m.dimension)}, weight: ${m.weight}, colour: '${m.colour}' },`);
}
lines.push(`};

export const ORDER = ['O', 'H', 'F', 'V', 'W'];

// The five point scale. Value is the raw answer, 1 to 5.
export const SCALE = [
  { v: 1, t: 'Strongly disagree' },
  { v: 2, t: 'Disagree' },
  { v: 3, t: 'Mixed or neutral' },
  { v: 4, t: 'Agree' },
  { v: 5, t: 'Strongly agree' },
];

// Reverse items are scored 6 minus the answer. Never shown to the reader.
export const QUESTIONS = [`);
for (const x of questions) {
  lines.push(`  { n: ${x.n}, calling: '${x.calling}', reverse: ${x.reverse}, t: ${q(x.t)} },`);
}
lines.push(`];

// Display bands for a single Calling's affinity.
export const BANDS = [`);
for (const b of bands) {
  lines.push(`  { at: ${b.at}, label: ${q(b.label)}, meaning: ${q(b.meaning)} },`);
}
lines.push(`];

export const bandOf = (affinity) =>
  (BANDS.find((b) => affinity >= b.at) || BANDS[BANDS.length - 1]);

// All 31 results, keyed by the bitmask code.
export const ARCHETYPES = {`);
for (const r of archRows.sort((a, b) => Number(a[F.code]) - Number(b[F.code]))) {
  lines.push(`  ${Number(r[F.code])}: {
    code: ${Number(r[F.code])},
    tier: ${q(r[F.tier])},
    name: ${q(r[F.name])},
    blend: ${q(r[F.blend])},
    reveal: ${q(r[F.reveal])},
    essence: ${q(r[F.essence])},
    strengths: ${q(r[F.strengths])},
    decide: ${q(r[F.decide])},
    relationships: ${q(r[F.relationships])},
    work: ${q(r[F.work])},
    shadow: ${q(r[F.shadow])},
    growth: ${q(r[F.growth])},
    role: ${q(r[F.role])},
    footer: ${q(r[F.footer])},
    legacy: ${q(r[F.legacy])},
  },`);
}
lines.push(`};

// The wording the workbook requires around scientific claims.
export const SCIENCE_NOTE =
  'A research-inspired fantasy personality assessment. It is not a validated clinical or diagnostic instrument.';
export const AFFINITY_NOTE =
  'Affinity is a score on this test\\'s own scale. It does not mean you are that percentage virtuous or vigilant as an objective fact.';
`);

const out = lines.join('\n');
writeFileSync('src/data/fivefold.js', out, 'utf8');
console.log(`written src/data/fivefold.js`);
console.log(`  questions: ${questions.length}, reverse: ${questions.filter((x) => x.reverse).length}`);
console.log(`  archetypes: ${archRows.length}`);
console.log(`  bands: ${bands.length} -> ${bands.map((b) => b.label).join(', ')}`);
