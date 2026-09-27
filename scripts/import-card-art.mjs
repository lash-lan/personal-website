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
  'Hannarial Icetear - Captain of the Red Rangers': 'LAH.06',
  'Hannarial Icetear': 'ice-hannarial-young',   // her earlier self, in House colours
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
  'Adamas, First King of Men': 'fa-adamas-king',
  'Anna, the White Witch': 'elu-anna',
  'Bruhneville Daughter': 'wit-bruhneville-daughter',
  'Darklord Anthurian Bloodwing': 'elu-darklord',
  'Edmonta Lothrin': 'LAH.11',
  'Elarien Thornwither': 'LAH.13',
  'Fiarra Starsterling': 'elu-fiarra',
  'Godrian Greyhide': 'gb-godrian',
  'Helena Katsunra, Great Witch of the East': 'LAH.22',
  'Karscyll, 3rd Queen of Elu-Dragar': 'elu-karscyll',
  'King Koschei, the Berserker King of Golskull': 'und-koschei-berserker',
  'Koschei, the Zombie King': 'und-koschei',
  'Leon Godrick, Second Prince of the Lionheart': 'LAH.01',
  'Melissra Orscina, Great Witch of the South': 'LAH.24',
  'Miss Crowly': 'und-miss-crowly',
  'Mordred, The Broken': 'men-mordred',
  'Morrina Penfyre, Great Witch of the West': 'LAH.23',
  'Numaya Steamrose': 'elu-numaya',
  'Nyrial Dagrhan, Princess of the Elu-Draghar': 'LAH.02',
  'Prince Arthur Penfyre': 'men-arthur',
  'Rellien & Vessa Aerwyn': 'LAH.12',
  'Seneal Icetear, Witch Queen of the North': 'LAH.26',
  'Solenyra Gravespine, High-Warden of the Red Rangers': 'LAH.08',
  'Tylon (Corrupted)': 'tylon-2',
  'Tylon(Awakened)': 'tylon-3',
  'Tylon (Spirit Awakened)': 'tylon-4',
  'Tylon (Leviathan)': 'tylon-5',
  'Warlord Wufgarr': 'men-wufgarr',
  'Winter, Ghosthowl': 'mon-winter',
  'World Sage Nilream, The White Dragon': 'mon-nilream',
  'Zhou Ying, Phoenix General': 'men-zhou',
  'Zhuge Guan, Dragon Strategist': 'men-zhuge',
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
  'fa-adamas-king': 'adamas-first-king', 'elu-anna': 'anna-white-witch',
  'wit-bruhneville-daughter': 'bruhneville-daughter', 'elu-darklord': 'darklord-anthurian',
  'LAH.11': 'edmonta-lothrin', 'LAH.13': 'elarien-thornwither',
  'elu-fiarra': 'fiarra-starsterling', 'gb-godrian': 'godrian-greyhide',
  'LAH.22': 'helena-katsunra', 'elu-karscyll': 'karscyll',
  'und-koschei-berserker': 'king-koschei', 'und-koschei': 'koschei',
  'LAH.01': 'leon-godrick', 'LAH.24': 'melissra-orscina', 'und-miss-crowly': 'miss-crowly',
  'men-mordred': 'mordred', 'LAH.23': 'morrina-penfyre', 'elu-numaya': 'numaya-steamrose',
  'LAH.02': 'nyrial-dagrhan', 'men-arthur': 'prince-arthur-penfyre',
  'LAH.12': 'rellien-and-vessa', 'LAH.26': 'seneal-icetear',
  'LAH.08': 'solenyra-gravespine', 'tylon-2': 'tylon-corrupted',
  'tylon-3': 'tylon-awakened', 'tylon-4': 'tylon-spirit-awakened',
  'tylon-5': 'tylon-leviathan', 'men-wufgarr': 'warlord-wufgarr',
  'mon-winter': 'winter-ghosthowl', 'mon-nilream': 'world-sage-nilream',
  'men-zhou': 'zhou-ying', 'men-zhuge': 'zhuge-guan',
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
