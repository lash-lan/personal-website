// Turns the Master Report Generation Guide into data the site can assemble
// reports from, so the copy provably matches the document rather than being
// retyped. Re-run whenever the guide changes.
//
//   node scripts/build-fivefold-guide.mjs "path/to/guide.docx"

import { readFileSync, writeFileSync } from 'node:fs';
import { unzipSync } from 'fflate';

const SRC = process.argv[2] ||
  'C:/Users/lashlan.a/Downloads/Fivefold_Calling_Master_Report_Generation_Guide.docx';

const zip = unzipSync(new Uint8Array(readFileSync(SRC)));
const xml = Buffer.from(zip['word/document.xml']).toString('utf8');

// one line per Word paragraph, which is how the guide is structured
const lines = xml
  .replace(/<w:p[ >]/g, '\n<w:p ')
  .replace(/<w:tab\/>/g, '\t')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .split('\n')
  .map((l) => l.replace(/[ \t]+/g, ' ').trim())
  .filter(Boolean);

// The site does not use these anywhere, so they are converted on the way in.
const clean = (s) => String(s)
  .replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'")
  .replace(/\u2014/g, ', ').replace(/\u2013/g, ', ')
  .replace(/;\s*([a-z])/g, (_, c) => '. ' + c.toUpperCase())
  .replace(/;/g, '.')
  .replace(/\s+/g, ' ')
  .trim();

// ── find every archetype chapter ──
const starts = [];
lines.forEach((l, i) => {
  if (/^THE [A-Z][A-Z' ]+$/.test(l) && /^Code \d+ /.test(lines[i + 1] || '')) {
    starts.push(i);
  }
});
if (starts.length !== 31) {
  console.error(`expected 31 archetype chapters, found ${starts.length}`);
}

// pull the block of lines that follows a label, up to the next known label
const LABELS = new Set([
  'MOTTO', 'Base Identity', 'CORE DRIVE', 'SEEKS', 'FEARS', 'NEEDS', 'Resists',
  'Central Tension', 'INTERNAL CONTRADICTION', 'How the Active Callings Speak',
  'Default Decision Pathway', 'You & Other People', 'How you show care',
  'How you build trust', 'What you need from others',
  'Where relationships become difficult', 'What you mean -> what they may hear',
  'YOUR INTENTION', 'OTHERS MAY EXPERIENCE IT AS', 'Leadership, Work & Purpose',
  'Ideal role conditions', 'Bad environment', 'Your Place in the Party',
  'When You Are At Your Best', 'AT YOUR BEST', 'Your Shadow', 'BALANCED',
  'STRAINED', 'SHADOW', 'RETURN', 'Likely warning sentence', 'Growth Roadmap',
  'Score-Sensitive Variants', 'Nearest-Path Logic for This Archetype',
]);

function after(block, label, opts = {}) {
  const i = block.findIndex((l) => l === label || l.replace(/\u2192/g, '->') === label);
  if (i === -1) return opts.many ? [] : '';
  const out = [];
  for (let j = i + 1; j < block.length; j++) {
    const l = block[j];
    if (LABELS.has(l) || LABELS.has(l.replace(/\u2192/g, '->'))) break;
    if (/^(Central Tension|You & Other People|Leadership, Work|Your Place|When You|Your Shadow|Growth Roadmap|Score-Sensitive|Nearest-Path)/.test(l)) break;
    out.push(clean(l));
    if (!opts.many) break;
  }
  return opts.many ? out : (out[0] || '');
}

const archetypes = {};
starts.forEach((s, n) => {
  const end = n + 1 < starts.length ? starts[n + 1] : lines.length;
  const block = lines.slice(s, end);
  const head = block[1];                       // "Code 1 • True Calling • Oath"
  const m = /^Code (\d+)\s*[•·]\s*([^•·]+)[•·]\s*(.+)$/.exec(head);
  if (!m) { console.error('bad header:', head); return; }
  const code = Number(m[1]);

  archetypes[code] = {
    code,
    name: clean(block[0]),
    tier: clean(m[2]),
    blend: clean(m[3]),
    motto: after(block, 'MOTTO'),
    // The guide prefixes this with an instruction to the report writer and
    // wraps the actual sentence in quotes. Only the sentence belongs in a
    // reader's report.
    baseIdentity: clean(after(block, 'Base Identity')
      .replace(/^Use this as the opening interpretation[^:]*:\s*/i, '')
      .replace(/^"|"$/g, '')),
    // CORE DRIVE is laid out as a table: the three column headers come first,
    // then the values beneath them, preceded by the drive statement itself.
    ...(() => {
      const i = block.indexOf('NEEDS');
      const v = i === -1 ? [] : block.slice(i + 1, i + 5).map(clean);
      return { drive: v[0] || '', seeks: v[1] || '', fears: v[2] || '', needs: v[3] || '' };
    })(),
    resists: after(block, 'Resists'),
    contradiction: after(block, 'INTERNAL CONTRADICTION'),
    callingsSpeak: after(block, 'How the Active Callings Speak', { many: true }),
    decisionPath: after(block, 'Default Decision Pathway', { many: true }),
    care: after(block, 'How you show care'),
    trust: after(block, 'How you build trust'),
    needFromOthers: after(block, 'What you need from others'),
    difficult: after(block, 'Where relationships become difficult', { many: true }),
    perception: after(block, 'OTHERS MAY EXPERIENCE IT AS', { many: true }),
    leadership: after(block, 'Leadership, Work & Purpose', { many: true }),
    idealRole: after(block, 'Ideal role conditions', { many: true }),
    badEnvironment: after(block, 'Bad environment', { many: true }),
    party: after(block, 'Your Place in the Party', { many: true }),
    atBest: after(block, 'AT YOUR BEST'),
    balanced: after(block, 'BALANCED'),
    strained: after(block, 'STRAINED'),
    shadow: after(block, 'SHADOW'),
    ret: after(block, 'RETURN'),
    warning: after(block, 'Likely warning sentence'),
    growth: after(block, 'Growth Roadmap', { many: true }),
  };
});

// ── the reusable copy library ──
const grabBetween = (from, to) => {
  const a = lines.findIndex((l) => l.startsWith(from));
  const b = lines.findIndex((l, i) => i > a && l.startsWith(to));
  return lines.slice(a + 1, b === -1 ? lines.length : b);
};

// Calling modifiers: five Callings, six bands each
const modLines = grabBetween('14. Calling-Level Modifiers', '15. Facet Split');
const KEY = { Oath: 'O', Hearth: 'H', Forge: 'F', Voice: 'V', Watch: 'W' };
const callingModifiers = {};
let currentCalling = null;
for (const l of modLines) {
  if (KEY[l]) { currentCalling = KEY[l]; callingModifiers[currentCalling] = []; continue; }
  const b = /^([\d.]+)\s*[–-]\s*([\d.]+)\s*:\s*(.+)$/.exec(l);
  if (b && currentCalling) {
    callingModifiers[currentCalling].push({
      from: Number(b[1]), to: Number(b[2]), text: clean(b[3]),
    });
  }
}
for (const k of Object.keys(callingModifiers)) {
  callingModifiers[k].sort((x, y) => y.from - x.from);
}

// Facet split templates
const splitLines = grabBetween('15. Facet Split', '16. Report Closing');
const facetSplits = [];
for (let i = 0; i < splitLines.length; i++) {
  if (/^High /.test(splitLines[i]) && splitLines[i + 1]) {
    facetSplits.push({ when: clean(splitLines[i]), text: clean(splitLines[i + 1]) });
    i++;
  }
}

const closing = grabBetween('16. Report Closing', '17. Input Object')
  .filter((l) => l !== 'CLOSING' && !/^Part V/.test(l)).map(clean).join(' ');

const disclaimer = grabBetween('20. Methodology Disclaimer', '\u0000')
  .filter((l) => l !== 'REQUIRED WORDING').map(clean).join(' ');

// ── the optional Depth Module, questions 41 to 50 ──
// Five cells per row: number, Calling, facet, reverse, statement. These never
// touch the archetype code. They only sharpen the report.
const depthLines = grabBetween('3. Optional Depth Module', '4. Core Affinity');
const depth = [];
for (let i = 0; i < depthLines.length; i++) {
  if (/^(4[1-9]|50)$/.test(depthLines[i])) {
    const [n, calling, facet, rev, statement] = depthLines.slice(i, i + 5);
    if (KEY[calling] && statement) {
      depth.push({
        n: Number(n), calling: KEY[calling], facet: clean(facet),
        reverse: /yes/i.test(rev), t: clean(statement),
      });
      i += 4;
    }
  }
}

// ── the ten personalisation facets, and which items feed each ──
const facetLines = grabBetween('6. Ten Personalization Facets', '7. Do Not Write');
const facets = [];
for (let i = 0; i < facetLines.length; i++) {
  const m = /^(Oath|Hearth|Forge|Voice|Watch)\s*[-–]\s*(.+)$/.exec(facetLines[i]);
  const items = facetLines[i + 1] || '';
  if (m && /^[\d,\s]+$/.test(items)) {
    facets.push({
      id: (m[1] + '-' + m[2]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      calling: KEY[m[1]],
      name: clean(`${m[1]} ${m[2]}`),
      items: items.split(',').map((x) => Number(x.trim())).filter(Boolean),
      changes: clean(facetLines[i + 2] || ''),
    });
  }
}

// ── the display bands for a single affinity ──
const bandLines = grabBetween('5. Score Interpretation Bands', '6. Ten Personalization');
const bands = [];
for (let i = 0; i < bandLines.length; i++) {
  const m = /^([\d.]+)\s*[–-]\s*([\d.]+)$/.exec(bandLines[i]);
  if (m && bandLines[i + 1]) {
    bands.push({
      from: Number(m[1]), to: Number(m[2]),
      label: clean(bandLines[i + 1]),
      meaning: clean(bandLines[i + 2] || ''),
    });
  }
}
bands.sort((a, b) => b.from - a.from);

const out = {
  archetypes, callingModifiers, facetSplits, closing, disclaimer,
  depth, facets, bands,
};
// Emitted as a module rather than raw JSON, to match the other data files and
// to avoid needing an import attribute.
const header = [
  '// The Master Report Generation Guide, as data.',
  '// GENERATED. Do not edit by hand:',
  '//   node scripts/build-fivefold-guide.mjs "path/to/guide.docx"',
  '',
].join('\n');
writeFileSync('src/data/fivefold-guide.js',
  header + 'export default ' + JSON.stringify(out) + ';\n', 'utf8');

const missing = [];
for (const a of Object.values(archetypes)) {
  for (const [k, v] of Object.entries(a)) {
    if (v === '' || (Array.isArray(v) && !v.length)) missing.push(`${a.code} ${a.name}: ${k}`);
  }
}
console.log(`archetypes parsed : ${Object.keys(archetypes).length} of 31`);
console.log(`calling modifiers : ${Object.entries(callingModifiers).map(([k, v]) => k + ':' + v.length).join(' ')}`);
console.log(`facet splits      : ${facetSplits.length}`);
console.log(`closing           : ${closing.length} chars`);
console.log(`disclaimer        : ${disclaimer.length} chars`);
console.log(`depth questions   : ${depth.length} of 10`);
console.log(`facets            : ${facets.length} of 10`);
console.log(`bands             : ${bands.length} -> ${bands.map((b) => b.label).join(', ')}`);
console.log(`empty fields      : ${missing.length}`);
missing.slice(0, 12).forEach((m) => console.log('   ' + m));
