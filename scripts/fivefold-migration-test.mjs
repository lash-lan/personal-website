// Checks the taxonomy rewriter on the exact shapes that appear in the data
// files, including the ones most likely to go wrong: a Calling word sitting
// inside a new archetype name, an old name that is a prefix of another, and
// the name "Fivefold Soul" that was also a tier.
//   node scripts/fivefold-migration-test.mjs
import { migrateText, TAXONOMY, alreadyMigrated } from './migrate-fivefold-taxonomy.mjs';

const RSQUO = '’';
const cases = [
  // names, in both the stored Title Case and the guide's shouted form
  ["name: 'The Oathkeeper',", "name: 'The Disciple',"],
  ['"name":"THE OATHKEEPER"', '"name":"THE DISCIPLE"'],
  ['"name":"THE FIVEFOLD SOUL"', '"name":"THE PARAGON OF THE FATELESS"'],
  // tiers, which must not be confused with the archetype of the same name
  ["tier: 'True Calling',", "tier: 'Pure',"],
  ['"tier":"Fivefold Soul"', '"tier":"Fivefold"'],
  ['"tier":"High Calling"', '"tier":"Fourfold"'],
  // a Calling word inside a NEW name must survive the same pass
  ["name: 'The Bannerlord',", "name: 'The Master of the Hearth',"],
  // an old name containing a Calling word must not be half-translated
  ["name: 'The Hearth Sentinel',", "name: 'The High Paladin',"],
  ["name: 'The Oathmarshal',", "name: 'The Steward',"],
  // longest-first: these three share a suffix
  ["name: 'The Justiciar',", "name: 'The Oathkeeper',"],
  ["name: 'The High Justiciar',", "name: 'The Grand Architect',"],
  ["name: 'The Iron Justiciar',", "name: 'The Knight Lord',"],
  // no cascading: old Chancellor becomes Mentor, and the new Chancellor at
  // code 10 must not then be rewritten again
  ["name: 'The Chancellor',", "name: 'The Mentor',"],
  ["name: 'The Bannerbearer',", "name: 'The Chancellor',"],
  // an escaped apostrophe inside a single quoted JavaScript string
  ["name: 'The King\\'s Shield',", "name: 'The Iron Sentinel',"],
  ['"name":"THE KING\'S SHIELD"', '"name":"THE IRON SENTINEL"'],
  // the five Callings in prose
  ["blend: 'Oath + Hearth + Forge + Voice + Watch'",
   "blend: 'Virtue + Devotion + Mastery + Influence + Vigilance'"],
  ['["Watch detects risk -> Oath judges the standard"]',
   '["Vigilance detects risk -> Virtue judges the standard"]'],
  ['Without Forge as a defining force', 'Without Mastery as a defining force'],
  ['Oath: "What should be done?"', 'Virtue: "What should be done?"'],
  // lower case ordinary words are left alone
  ['she kept her oath and raised her voice to watch',
   'she kept her oath and raised her voice to watch'],
  // the word Calling itself is untouched
  ['Hearth is not archetype-defining. Your Callings speak.',
   'Devotion is not archetype-defining. Your Callings speak.'],
];

let fail = 0;
for (const [input, want] of cases) {
  const got = migrateText(input);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${JSON.stringify(input).slice(0, 78)}`);
  if (!ok) {
    console.log(`        want ${JSON.stringify(want)}`);
    console.log(`        got  ${JSON.stringify(got)}`);
  }
}

// Several new names were the old name of a DIFFERENT archetype, so running
// the rewrite twice would walk Oathkeeper on to Disciple and destroy the
// file. That is why the migration guards itself instead of being idempotent.
// Both facts are asserted here so neither can be forgotten.
console.log('\n── the second-pass guard ──');
const reused = Object.values(TAXONOMY)
  .filter(([, next]) => migrateText(next) !== next)
  .map(([, next]) => next);
console.log(`  ok   ${reused.length} names would be damaged by a second pass: ${reused.join(', ')}`);

const migratedSample = "name: 'The Paragon of the Fateless', tier: 'Fivefold'";
const guarded = alreadyMigrated(migratedSample);
if (!guarded) { fail++; console.log(' FAIL  migrated text is not recognised by the guard'); }
else console.log('  ok   already-migrated text is recognised and skipped');

const oldSample = "name: 'The Fivefold Soul', tier: 'Fivefold Soul'";
if (alreadyMigrated(oldSample)) { fail++; console.log(' FAIL  the guard fires on un-migrated text'); }
else console.log('  ok   un-migrated text is not skipped');

console.log(fail ? `\n${fail} FAILED` : '\nall migration checks passed');
process.exit(fail ? 1 : 0);
