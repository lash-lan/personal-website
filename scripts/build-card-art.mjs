// Make card art from Lash's own character references.
//   node scripts/build-card-art.mjs
//
// The originals are 2 to 3 MB ChatGPT PNGs sitting on the Desktop. A card
// needs a thumbnail, so each one is cropped square a little above centre,
// where a portrait's face usually sits, and written out as a small webp.
// The originals are never touched.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = 'C:/Users/lashl/OneDrive/Desktop/Fantasy World IP/Fantasy World Vision/Character References';
const OUT = path.join(ROOT, 'public/images/cards');

// card id -> the folder holding that character's references
const FROM = {
  hansall:     'Elu/High Elves - Elu Primus/Hansall',
  hannarial:   'Elu/High Elves - Elu Primus/Hannah Icetear',
  hansenel:    'Elu/High Elves - Elu Primus/Hansenel Icetear',
  glorfarsall: 'Elu/High Elves - Elu Primus/Glorfarsall Elysium',
  revendrinn:  'Elu/High Elves - Elu Primus/Revendrinn Nyxthorn',
  anthuriun:   'Elu/Half Elves - Elu-Dues/Anthurian Icetear',
  tiamel:      'Elu/Half Elves - Elu-Dues/First Elu-Dragar Queen Tiamel',
  gilgamesh:   'Elu/Half Elves - Elu-Dues/King Gilgamesh',
  raastali:    'Elu/Half Elves - Elu-Dues/Prince Rastaali',
  sederous:    'Elu/Half Elves - Elu-Dues/Sederous The King of Scraps',
  serallion:   'Elu/Moon Elves -Elu Chandra/First Matron of the Moon Serallion',
  abel:        'Humans/Abel',
  adamas:      'Humans/Adamas',
  cainan:      'Humans/Cainan',
  evalon:      'Humans/Evalon',
  caligular:   "God's Blood/Caligular King of Domination",
  vishraa:     "God's Blood/General Vishraa",
};

// ffmpeg comes from the Python package already installed for the narration
// work, which is the only copy on this machine.
const ffmpeg = execFileSync('python',
  ['-c', 'import imageio_ffmpeg,sys; sys.stdout.write(imageio_ffmpeg.get_ffmpeg_exe())'])
  .toString().trim();
if (!ffmpeg || !fs.existsSync(ffmpeg)) throw new Error('no ffmpeg found');

fs.mkdirSync(OUT, { recursive: true });
let made = 0;
const missing = [];
for (const [id, rel] of Object.entries(FROM)) {
  const dir = path.join(SRC, rel);
  if (!fs.existsSync(dir)) { missing.push(`${id}: no folder ${rel}`); continue; }
  const pngs = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort();
  if (!pngs.length) { missing.push(`${id}: no png in ${rel}`); continue; }
  const src = path.join(dir, pngs[0]);
  const dest = path.join(OUT, `${id}.webp`);
  // square, taken a little above centre so a face is not cut off, then small
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src,
    '-vf', "crop='min(iw,ih)':'min(iw,ih)':'(iw-min(iw,ih))/2':'(ih-min(iw,ih))*0.18',scale=320:320",
    '-frames:v', '1', '-c:v', 'libwebp', '-quality', '78', dest]);
  made++;
  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`  ${id.padEnd(12)} ${String(kb).padStart(4)} KB   ${pngs[0].slice(0, 44)}`);
}
console.log(`\n${made} card portraits written to public/images/cards`);
for (const m of missing) console.log('  missing  ' + m);
