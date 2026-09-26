// One-time migration to the 2026 Fivefold Calling taxonomy.
//
//   node scripts/migrate-fivefold-taxonomy.mjs [--check]
//
// Two things change, and nothing else:
//
//   1. the 31 archetypes are renamed and re-tiered, keeping every
//      active-drive combination exactly where it was;
//   2. the five Callings take their canonical names, so the Oath becomes
//      Virtue, the Hearth becomes Devotion, the Forge becomes Mastery, the
//      Voice becomes Influence and the Watch becomes Vigilance.
//
// The scoring mathematics, the forty questions, their dimension assignments
// and their reverse keys are deliberately untouched, so a result recorded
// before this migration classifies to the same code afterwards and only its
// printed name changes.
//
// Both data files were generated from a specification workbook that no longer
// exists on this machine, so they are now the source of truth and are edited
// here instead of regenerated.
//
// Every replacement happens in ONE pass over the text. An archetype name is
// matched before the Calling words inside it, and a replacement is never
// rescanned, so "Master of the Hearth" goes in whole and stays whole.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

// ── the authoritative table, from the specification ──────────────────────
// code: [old name, new name, tier, mythic title]
export const TAXONOMY = {
  1:  ['Oathkeeper',      'Disciple',                'Pure'],
  2:  ['Hearthguard',     'Caregiver',               'Pure'],
  3:  ['Sacred Guardian', 'Saint',                   'Dual'],
  4:  ['Strategos',       'Blacksmith',              'Pure'],
  5:  ['Justiciar',       'Oathkeeper',              'Dual'],
  6:  ['Oathmarshal',     'Steward',                 'Dual'],
  7:  ['Paladin',         'True Shepherd',           'Triple'],
  8:  ['Courtier',        'Orator',                  'Pure'],
  9:  ['Herald',          'Beacon',                  'Dual'],
  10: ['Bannerbearer',    'Chancellor',              'Dual'],
  11: ['Radiant Herald',  'White Eminence',          'Triple'],
  12: ['Chancellor',      'Mentor',                  'Dual'],
  13: ['High Justiciar',  'Grand Architect',         'Triple'],
  14: ['Bannerlord',      'Master of the Hearth',    'Triple'],
  15: ['Lionheart',       'Great World Sage',        'Fourfold', 'Conduit of the Titans'],
  16: ['Watcher',         'Night Sentry',            'Pure'],
  17: ['Sentinel',        'Inquisitor',              'Dual'],
  18: ['Last Warden',     'Aegis',                   'Dual'],
  19: ['Hearth Sentinel', 'High Paladin',            'Triple'],
  20: ['Iron Warden',     'Ward Summoner',           'Dual'],
  21: ['Iron Justiciar',  'Knight Lord',             'Triple'],
  22: ['King’s Shield', 'Iron Sentinel',        'Triple'],
  23: ['Silent Warden',   'Paragon of Light',        'Fourfold', 'Hyperion’s Paragon'],
  24: ['Whispermaster',   'Spy',                     'Dual'],
  25: ['Truthwarden',     'High Warden',             'Triple'],
  26: ['Veiled Guardian', 'Vigil Keeper',            'Triple'],
  27: ['Dawnbringer',     'Speaker of the Gods',     'Fourfold', 'Titans’ Emissary'],
  28: ['Mastermind',      'Spy Lord',                'Triple'],
  29: ['Lawgiver',        'Protector of the Realm',  'Fourfold', 'Chosen of Ra'],
  30: ['Sovereign',       'Lord of Ghost’s Shadow', 'Fourfold', 'Thanathos’ Shadow'],
  31: ['Fivefold Soul',   'Paragon of the Fateless', 'Fivefold'],
};

// Forge -> Mastery and the rest. The keys stay O H F V W everywhere in code,
// because the saved answers and the bit weights are keyed by them and renaming
// those would risk silently swapping two dimensions for no reader-visible gain.
export const DRIVES = {
  Oath: 'Virtue', Hearth: 'Devotion', Forge: 'Mastery', Voice: 'Influence', Watch: 'Vigilance',
};

const TIERS = {
  'True Calling': 'Pure', 'Bound Calling': 'Dual', 'Triune Calling': 'Triple',
  'High Calling': 'Fourfold', 'Fivefold Soul': 'Fivefold',
};

// ── the single-pass rewriter ─────────────────────────────────────────────
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// An apostrophe reaches us three ways: bare, curly, or backslash-escaped
// inside a single quoted JavaScript string. Match all three, and always write
// the curly one back, which is safe inside every quoting style in these files.
const anyApostrophe = (s) => s.split(/[’']/).map(esc).join("\\\\?['’]");

function rules() {
  const out = [];

  // 1. tier values, matched together with their key, so the archetype once
  //    called "Fivefold Soul" and the tier of the same name cannot collide
  for (const [old, next] of Object.entries(TIERS)) {
    out.push({
      // the key is bare in fivefold.js and quoted in the guide's JSON
      re: `(["']?tier["']?\\s*:\\s*["'])${esc(old)}(["'])`,
      fn: (m) => m.replace(old, next),
    });
  }

  // 2. archetype names, longest first so "High Justiciar" beats "Justiciar",
  //    in both the Title Case and the SHOUTED form the guide stores
  const byLength = Object.values(TAXONOMY)
    .map(([o, n]) => [o, n])
    .sort((a, b) => b[0].length - a[0].length);
  for (const [old, next] of byLength) {
    out.push({ re: `\\b${anyApostrophe(old.toUpperCase())}\\b`, fn: () => next.toUpperCase() });
    out.push({ re: `\\b${anyApostrophe(old)}\\b`, fn: () => next });
  }

  // 3. the five Callings, only where they stand as the capitalised proper noun
  for (const [old, next] of Object.entries(DRIVES)) {
    out.push({ re: `\\b${esc(old.toUpperCase())}\\b`, fn: () => next.toUpperCase() });
    out.push({ re: `\\b${esc(old)}\\b`, fn: () => next });
  }
  return out;
}

export function migrateText(text) {
  const all = rules();
  const re = new RegExp(all.map((r, i) => `(?<r${i}>${r.re})`).join('|'), 'g');
  return text.replace(re, (whole, ...rest) => {
    const groups = rest[rest.length - 1];
    for (let i = 0; i < all.length; i++) {
      if (groups[`r${i}`] !== undefined) return all[i].fn(whole);
    }
    return whole;
  });
}

// This rewrite is NOT safe to run twice. Several new names were old names of
// a different archetype, so a second pass would move Oathkeeper on to
// Disciple and quietly destroy the file. The guard below makes that
// impossible rather than leaving it to whoever runs the script.
export function alreadyMigrated(text) {
  return text.includes('Paragon of the Fateless') || text.includes('PARAGON OF THE FATELESS');
}

// ── run it ───────────────────────────────────────────────────────────────
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  const FILES = ['src/data/fivefold.js', 'src/data/fivefold-guide.js'];
  let changed = 0;
  for (const rel of FILES) {
    const file = path.join(ROOT, rel);
    const before = fs.readFileSync(file, 'utf8');
    if (alreadyMigrated(before)) {
      console.log(`  SKIPPED    ${rel} is already on the new taxonomy`);
      continue;
    }
    const after = migrateText(before);
    if (before === after) { console.log(`  unchanged  ${rel}`); continue; }
    changed++;
    if (CHECK) { console.log(`  would edit ${rel}`); continue; }
    fs.writeFileSync(file, after);
    console.log(`  migrated   ${rel}`);
  }
  console.log(changed ? `\n${changed} file(s) ${CHECK ? 'would change' : 'migrated'}` : '\nnothing to do');
}
