// Looks for narration produced by scripts/narrate.py.
//
// The audio itself lives in public/audio; the small timing files live here in
// src so the build can read them. The Cloudflare build environment has no
// filesystem access, so these are pulled in by Vite at build time rather than
// with node:fs.
//
// Before the narration workflow has run there are no timing files at all, the
// glob is empty, and these return null so pages keep the browser's own voice.
// Once the audio is committed the next build picks it up automatically.
const CUES = import.meta.glob('./audio/**/*.json', { eager: true });

function read(key) {
  // glob keys look like './audio/stories/the-sea-prison.json'
  const hit = CUES['./audio/' + key + '.json'];
  const meta = hit && (hit.default ?? hit);
  if (!meta || !Array.isArray(meta.cues) || !meta.cues.length) return null;
  return { src: '/audio/' + key + '.opus', cues: meta.cues };
}

/** One short story: a single track covering every paragraph on the page. */
export function storyTracks(slug) {
  const t = read('stories/' + slug);
  return t ? [{ ...t, offset: 0 }] : null;
}

/**
 * One saga part: a track per chapter, played in sequence. `offset` is where
 * that chapter's first paragraph sits among all the page's paragraphs, so the
 * highlight lands on the right line.
 */
export function sagaTracks(partSlug, chapters) {
  const tracks = [];
  let offset = 0;
  for (let i = 0; i < chapters.length; i++) {
    const spoken = chapters[i].paras.filter((p) => p.t !== 'break').length;
    const t = read(`saga/${partSlug}/${String(i).padStart(2, '0')}`);
    if (!t) return null;                 // all or nothing, so timings stay aligned
    tracks.push({ ...t, offset });
    offset += spoken;
  }
  return tracks.length ? tracks : null;
}
