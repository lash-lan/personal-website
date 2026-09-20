// The opening of the home page, in one continuous sequence.
//
//   1. the fight      Hansall and the young Hannah Icetear close and lock blades
//   2. a dip to black that covers the change of scale
//   3. the reveal     a drop of blood strikes the ice and the fractures race out
//   4. the title, held over the settled ice, then the page
//
// The fight's playhead is driven by the scroll, so it advances and rewinds with
// the reader. The reveal is a short clip that plays once when the cut lands and
// holds on its final frame. Without JavaScript, with reduced motion or with
// data saver on, none of this runs and the section stays one still picture.

const BASE = '/cine/';
const CUT = 0.62;         // progress where the fight gives way to the reveal
const INTRO_USE = 4.6;    // seconds of the fight used: the approach, the lock, a beat
const CLASH_AT = 3.46;    // seconds into the fight where the blades meet
const CRACKS_AT = 3.4;    // seconds into the reveal where the fractures are full

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const bump = (t) => Math.sin(Math.PI * clamp(t));

const el = (tag, cls, parent) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.append(e);
  return e;
};

export function startFilm(section) {
  const saveData = navigator.connection?.saveData;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || saveData) return;

  const stage = section.querySelector('.film-stage');
  const title = section.querySelector('.film-title');
  section.classList.add('is-on');

  const layers = el('div', 'film-layers', null);
  layers.setAttribute('aria-hidden', 'true');
  stage.prepend(layers);

  // On a tall screen the shots are shown whole rather than cropped, over a
  // blurred view of the frozen field instead of empty black.
  const scrub = window.matchMedia('(min-width: 820px)').matches;
  const backdrop = { root: el('div', 'film-backdrop', layers) };
  backdrop.img = el('img', '', backdrop.root);

  const video = el('video', 'film-video', layers);
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.poster = `${BASE}open-960.webp`;
  video.src = BASE + (scrub ? 'intro-scrub.mp4' : 'intro-play.mp4');

  const reveal = el('video', 'film-video film-reveal', layers);
  reveal.muted = true;
  reveal.playsInline = true;
  reveal.preload = 'auto';
  reveal.poster = `${BASE}title-reveal.jpg`;
  reveal.src = `${BASE}title-reveal.mp4`;

  let duration = 0;
  let seekable = false;
  const gotMetadata = () => {
    duration = video.duration || 0;
    // A browser only seeks in a video whose server offers it in pieces.
    // Cloudflare hands over whole files, so seeking is refused there even once
    // all of it has arrived. Where that happens the film is fetched into memory
    // and played from there, which is always seekable.
    seekable = video.seekable.length > 0 && video.seekable.end(0) > 0;
    if (scrub && !seekable) intoMemory();
  };
  video.addEventListener('loadedmetadata', gotMetadata);
  // The source is set above, so on a fast connection or a warm cache the
  // metadata can be ready before this line runs and the event never arrives.
  if (video.readyState >= 1) gotMetadata();
  if (!scrub) video.play().catch(() => {});

  let fetching = false;
  async function intoMemory() {
    if (fetching) return;
    fetching = true;
    try {
      const res = await fetch(`${BASE}intro-scrub.mp4`, { cache: 'force-cache' });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      await new Promise((resolve, reject) => {
        const ok = () => { video.removeEventListener('loadedmetadata', ok); resolve(); };
        video.addEventListener('loadedmetadata', ok);
        video.addEventListener('error', reject, { once: true });
        video.src = url;
        video.load();
      });
      duration = video.duration || duration;
      seekable = video.seekable.length > 0 && video.seekable.end(0) > 0;
      at = -1;
    } catch {
      seekable = false;
      video.play().catch(() => {});
    }
  }

  // ─── the strike, heard ───
  // Browsers refuse to play sound until the reader has interacted, and
  // scrolling does not count. The first attempt is expected to fail: that is
  // remembered and the sound plays on the first real click, tap or key.
  const sfx = el('audio', '', layers);
  // the clip's own impact, cut from the footage's native soundtrack
  sfx.src = `${BASE}clash-native.mp3`;
  sfx.preload = 'auto';
  let played = false, passed = false;

  function ring() {
    if (played) return;
    played = true;
    sfx.currentTime = 0;
    const p = sfx.play();
    if (p) p.catch(() => { played = false; });   // no permission yet; try again on the next gesture
  }
  // Keep listening until it has actually played. A one-shot listener is wrong:
  // a reader who clicks before reaching the strike would use it up, and the
  // strike would then be silent for ever.
  function onGesture() {
    if (played) {
      ['pointerdown', 'keydown', 'touchstart'].forEach((e) => removeEventListener(e, onGesture));
      return;
    }
    if (passed) ring();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => addEventListener(e, onGesture, { passive: true }));

  // The prompt over the first frame: one click, and the sound is allowed for
  // the rest of the visit. Scrolling past it without clicking is fine too; the
  // strike then plays at the reader's first click anywhere, as above.
  const enter = section.querySelector('.film-enter');
  let primed = false;
  if (enter) {
    enter.hidden = false;
    enter.addEventListener('click', () => {
      primed = true;
      enter.hidden = true;
      // Asking to play inside the click is what earns the permission; it is
      // stopped again straight away so nothing is heard before the strike.
      const p = sfx.play();
      if (p) p.then(() => { if (!passed) { sfx.pause(); sfx.currentTime = 0; } }).catch(() => {});
      if (passed) { played = false; ring(); }
      playThrough();
    });
  }

  // ─── playing it for the reader ───
  // Entering runs the whole sequence: the page is scrolled in time with the
  // film, so the fight advances at its own pace and the reveal follows, right
  // through to the title. Touching the wheel, a key or the screen hands
  // control straight back.
  let auto = 0;
  const REVEAL_MS = 5400;
  function stopAuto() {
    if (!auto) return;
    cancelAnimationFrame(auto);
    auto = 0;
    ['wheel', 'touchmove', 'keydown'].forEach((e) => removeEventListener(e, stopAuto));
  }
  function playThrough() {
    stopAuto();
    const top = section.getBoundingClientRect().top + window.scrollY;
    const room = Math.max(1, section.offsetHeight - stage.clientHeight);
    const from = clamp(progress());
    if (from > 0.985) return;
    // the fight runs at its filmed pace; the reveal at its own length
    const introMs = ((CUT - Math.min(from, CUT)) / CUT) * INTRO_USE * 1000;
    const started = performance.now();
    ['wheel', 'touchmove', 'keydown'].forEach((e) => addEventListener(e, stopAuto, { passive: true, once: true }));
    const step = (now) => {
      const ms = now - started;
      let p;
      if (ms < introMs) p = from + (ms / introMs) * (CUT - from);
      else p = CUT + Math.min(1, (ms - introMs) / REVEAL_MS) * (1 - CUT);
      window.scrollTo({ top: top + clamp(p) * room, behavior: 'instant' });
      if (p >= 1) { stopAuto(); return; }
      auto = requestAnimationFrame(step);
    };
    auto = requestAnimationFrame(step);
  }

  const dip = el('div', 'film-dip', layers);     // covers the change of scale
  const shade = el('div', 'film-shade', layers); // melts the last frame into the page
  const hint = el('div', 'film-hint', layers);
  hint.innerHTML = '<span>Scroll</span><i></i>';

  let portrait = false;
  function resize() {
    portrait = stage.clientHeight > stage.clientWidth * 1.05;
    if (portrait && backdrop.img.dataset.src !== 'field') {
      backdrop.img.dataset.src = 'field';
      backdrop.img.src = `${BASE}field-p-800.webp`;
    }
    last = -1;
  }

  // ─── the sequence ───
  let want = 0, at = 0, rolling = false;

  function render(p) {
    const after = p >= CUT;

    // the fight: the scroll drives the playhead, and the lock holds
    if (duration) want = clamp(p / CUT) * Math.min(INTRO_USE, duration);
    const shotO = after ? 0 : 1;
    video.style.opacity = shotO.toFixed(3);
    video.style.visibility = shotO ? 'visible' : 'hidden';

    // Sound the strike off the picture, not off the scroll: the playhead eases
    // toward the scroll, so a scroll-based trigger fires before the blades meet.
    passed = video.currentTime >= CLASH_AT;
    if (passed && !after) ring();

    // the reveal: one short clip, played once, holding on its final frame
    reveal.style.opacity = after ? '1' : '0';
    reveal.style.visibility = after ? 'visible' : 'hidden';
    if (after && !rolling) {
      rolling = true;
      reveal.currentTime = 0;
      reveal.play().catch(() => {});
    } else if (!after && rolling) {
      rolling = false;
      reveal.pause();
      reveal.currentTime = 0;
    }

    // a short dip toward black across the join, rather than a cross-dissolve:
    // the two shots are too different in scale and light to blend
    dip.style.opacity = bump(seg(p, CUT - 0.028, CUT + 0.028)).toFixed(3);

    // the title lands with the fractures, and never later than the scroll
    const byFilm = smooth(seg(reveal.currentTime, CRACKS_AT - 0.9, CRACKS_AT));
    const byScroll = smooth(seg(p, 0.82, 0.93));
    const tt = after ? Math.max(byFilm, byScroll) : 0;
    title.style.opacity = tt.toFixed(3);
    title.style.transform = `translate3d(0, ${lerp(20, 0, tt).toFixed(1)}px, 0)`;

    const bgO = portrait ? 1 : 0;
    backdrop.root.style.opacity = bgO.toFixed(3);
    backdrop.root.style.visibility = bgO ? 'visible' : 'hidden';
    shade.style.opacity = smooth(seg(p, 0.9, 1)).toFixed(3);
    hint.style.opacity = (1 - smooth(seg(p, 0, 0.035))).toFixed(3);
    if (enter && !primed) {
      const eo = 1 - smooth(seg(p, 0.02, 0.1));
      enter.style.opacity = eo.toFixed(3);
      enter.style.pointerEvents = eo > 0.15 ? 'auto' : 'none';
    }
  }

  // ─── the frame loop, only while the section is near the screen ───
  let target = 0, shown = 0, last = -1, running = false, raf = 0;
  const progress = () => {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - stage.clientHeight));
  };
  function frame() {
    target = progress();
    shown += (target - shown) * 0.2;
    if (Math.abs(target - shown) < 0.0004) shown = target;
    render(shown);
    last = shown;
    // Ease the playhead toward the scroll, and ask for a new frame only once
    // the last seek has finished: asking every frame queues seeks the decoder
    // cannot answer, and the picture sticks while the playhead runs on.
    if (scrub && duration && seekable) {
      if (at < 0) at = want;
      at += (want - at) * 0.22;
      if (Math.abs(want - at) < 0.004) at = want;
      if (video.readyState >= 1 && !video.seeking && Math.abs(at - video.currentTime) > 0.01) {
        video.currentTime = at;
      }
    }
    if (running) raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
    if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); reveal.pause(); }
  });

  resize();
  shown = target = progress();
  render(shown);
  io.observe(section);
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });

  // Lets checks jump straight to a moment: window.__film(0.7) scrolls there.
  window.__film = (v) => {
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + v * (section.offsetHeight - stage.clientHeight), behavior: 'instant' });
    shown = target = progress();
    render(shown);
    if (scrub && duration && seekable) { at = want; if (video.readyState >= 1) video.currentTime = at; }
    return shown;
  };
}
