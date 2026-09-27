// Brings new paintings out of the download folder and into the site.
//
// Run: node scripts/import-card-art.mjs "C:/Users/lashl/Downloads/New Card Art"
//
// The paintings arrive as PNGs of about three megabytes each, which is far
// too heavy to serve: twenty-one of them is sixty megabytes. They are written
// out as WebP at the same size, which is what the site has always served.
//
// Matching is by hand, in MAP below, because the filenames are the character's
// full title rather than the card's name and guessing would eventually put the
// wrong face on a card.

import { readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { CARDS } from '../src/data/cards.js';

// painting filename (without .png)  ->  card id
const MAP = {
  'Abel, Second Son of Humanity': 'fa-abel',
  'Adamas, Father of Humanity': 'fa-adamas',
  'Antharaiel Whitewing': 'elu-antharaiel',
  'Anthurian Icetear - Vice  Captain of the Red Rangers': 'LAH.16',
  'Cainan, First Son of Humanity': 'fa-cainan',
  'Evalon, Mother of Humanity': 'fa-evalon',
  'Glorfarsall Elysium': 'elu-glorfarsall',
  'Hannahrial Icetear - Captain of the Red Rangers': 'LAH.06',
  'Hannahrial Icetear': 'ice-hannarial-young',   // her earlier self, in House colours
  'Hansall, First High King of Elves': 'elu-hansall',
  'Hansenel Icetear': 'ice-hansenel',
  'Icetear, Child of Winter': 'ice-child-of-winter',
  'King Gilgamesh': 'elu-gilgamesh',
  'Knight Titan Tyberius': 'div-tyberius',
  'Prince Raastali': 'elu-raastali',
  'Revendrinn Nyxthorn': 'elu-revendrinn',
  'Sederous Lionheart, King of Scraps': 'elu-sederous',
  'Serallion, Matron of the Moon': 'elu-serallion',
  'Susanna Bruhneville, Great Witch of the North': 'LAH.25',
  'The Pale Lady Slahaln': 'und-pale-lady',
  'Tiamel, First Queen of the Elu-Dragar': 'elu-tiamel',
};

// Where each card's painting is written. A card that already has a file keeps
// its filename, so nothing that points at it has to change.
const FILENAME = {
  'fa-abel': 'abel', 'fa-adamas': 'adamas', 'fa-cainan': 'cainan', 'fa-evalon': 'evalon',
  'LAH.16': 'anthuriun', 'LAH.06': 'hannarial', 'ice-hansenel': 'hansenel',
  'ice-hannarial-young': 'hannarial-young',
  'elu-hansall': 'hansall', 'elu-tiamel': 'tiamel', 'elu-serallion': 'serallion',
  'elu-sederous': 'sederous', 'elu-gilgamesh': 'gilgamesh', 'elu-raastali': 'raastali',
  'elu-revendrinn': 'revendrinn', 'elu-glorfarsall': 'glorfarsall',
  // new
  'elu-antharaiel': 'antharaiel-whitewing',
  'ice-child-of-winter': 'icetear-child-of-winter',
  'div-tyberius': 'knight-titan-tyberius',
  'LAH.25': 'susanna-bruhneville',
  'und-pale-lady': 'the-pale-lady',
};

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error('Give me the folder the paintings are in.');
  process.exit(1);
}

const byId = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const out = new URL('../public/images/cards/', import.meta.url);
const files = readdirSync(src).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

let done = 0, savedBytes = 0;
const unmatched = [];

for (const file of files) {
  const stem = basename(file).replace(/\.[^.]+$/, '').trim();
  const id = MAP[stem];
  if (!id) { unmatched.push(file); continue; }
  const card = byId[id];
  if (!card) { console.log(`  no card with id ${id} (for ${file})`); continue; }

  const name = FILENAME[id];
  const dest = new URL(`${name}.webp`, out);
  const before = statSync(join(src, file)).size;

  // Pillow is already on this machine and handles WebP, so no new tooling.
  execFileSync('python', ['-c', `
from PIL import Image
im = Image.open(r"""${join(src, file)}""").convert("RGB")
im.save(r"""${dest.pathname.slice(1)}""", "WEBP", quality=80, method=6)
`]);

  const after = statSync(dest.pathname.slice(1)).size;
  savedBytes += before - after;
  done += 1;
  console.log(`  ${card.name.padEnd(46)} -> ${name}.webp  ${(before / 1048576).toFixed(1)}MB to ${(after / 1024).toFixed(0)}KB`);
}

console.log(`\n${done} paintings imported, ${(savedBytes / 1048576).toFixed(1)}MB saved.`);
if (unmatched.length) {
  console.log('\nNot matched to a card, so left alone:');
  for (const f of unmatched) console.log(`  ${f}`);
}
