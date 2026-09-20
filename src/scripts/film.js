// "A drop of blood on the ice": the scroll-directed opening of the home page.
//
// First the film: Hansall and the young Hannah Icetear close on each other and
// lock blades, a ten second shot whose playhead is driven by the scroll. Then
// the ending: a single drop of blood falls, the ice cracks, and the world's
// name appears. Scroll position is the clock, so scrolling back rewinds it.
// Only the snow and the sound run on their own time.
//
// Without JavaScript, with reduced motion or with data saver on, none of this
// runs and the section stays a single still picture with the title.

const BASE = '/cine/';
const VIDEO_END = 0.5;    // progress where the film hands over to the ending
const CLASH_FRAC = 0.42;  // where in the film the blades meet

// ─── helpers ───
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const ease = (t) => 1 - Math.pow(1 - t, 3);
const bump = (t) => Math.sin(Math.PI * clamp(t));

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const el = (tag, cls, parent) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.append(e);
  return e;
};
const svgEl = (tag, attrs, parent) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
};
function loadImg(img, src, srcset) {
  if (img.dataset.src === src) return;
  img.dataset.src = src;
  if (srcset) { img.sizes = '100vw'; img.srcset = srcset; } else img.removeAttribute('srcset');
  img.src = src;
  img.decode?.().catch(() => {});
}

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

  // ─── the film ───
  // Narrow screens play it through once: scrubbing is unreliable on iOS and
  // costs battery. Wide screens scrub it with the scroll.
  const scrub = window.matchMedia('(min-width: 820px)').matches;
  // On a tall screen the film is shown whole rather than cropped, so the frozen
  // field sits behind it, blurred and darkened, instead of empty black.
  const backdrop = { root: el('div', 'film-backdrop', layers) };
  backdrop.img = el('img', '', backdrop.root);
  const video = el('video', 'film-video', layers);
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.poster = `${BASE}still-960.webp`;
  video.src = BASE + (scrub ? 'intro-scrub.mp4' : 'intro-play.mp4');

  let duration = 0;
  const gotMetadata = () => { duration = video.duration || 0; };
  video.addEventListener('loadedmetadata', gotMetadata);
  // The source is set above, so on a fast connection or a warm cache the
  // metadata can be ready before this line runs and the event never arrives.
  // Without this check the playhead would sit on frame 0 for ever.
  if (video.readyState >= 1) gotMetadata();
  if (!scrub) video.play().catch(() => {});

  // ─── the clash, heard ───
  // Browsers refuse to play sound until the visitor has interacted, and
  // scrolling does not count. So the first attempt is expected to fail: we
  // remember that and play it on the first real click, tap or key instead.
  const sfx = el('audio', '', layers);
  sfx.src = `${BASE}sword-clash.mp3`;
  sfx.preload = 'auto';
  let played = false, blocked = false, passed = false;

  function ring() {
    if (played) return;
    played = true;
    sfx.currentTime = 0;
    const p = sfx.play();
    if (p) p.catch(() => { played = false; blocked = true; });
  }
  function unlock() {
    if (!blocked) return;
    blocked = false;
    if (passed) ring();
  }
  ['pointerdown', 'keydown'].forEach((e) => addEventListener(e, unlock, { once: true, passive: true }));

  // ─── the ending ───
  const ice = { root: el('div', 'film-plate film-ice', layers) };
  ice.img = el('img', '', ice.root);

  const svg = svgEl('svg', { class: 'film-svg' }, layers);
  const defs = svgEl('defs', {}, svg);
  const grad = (id, attrs, stops) => {
    const g = svgEl('radialGradient', { id, ...attrs }, defs);
    stops.forEach(([o, c, a = 1]) => svgEl('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  };
  grad('film-drop', { cx: '0.42', cy: '0.6', r: '0.75', fx: '0.36', fy: '0.5' }, [['0', '#a3151e'], ['0.5', '#5e080d'], ['1', '#1c0203']]);
  grad('film-pool', { cx: '0.5', cy: '0.5', r: '0.5' }, [['0', '#4f060b'], ['0.82', '#40050a'], ['0.95', '#2a0305'], ['1', '#2a0305', 0.85]]);
  grad('film-speck', {}, [['0', '#4a0509'], ['1', '#2a0204']]);
  grad('film-stain', {}, [['0', '#5c070c', 0.55], ['0.6', '#4a0509', 0.28], ['1', '#4a0509', 0]]);
  const crackGrad = svgEl('radialGradient', { id: 'film-crack', gradientUnits: 'userSpaceOnUse' }, defs);
  [['0', '#4a0509', 1], ['0.13', '#5e080d', 0.95], ['0.3', '#8fa9bf', 0.8], ['0.45', '#cfe3f2', 0.9], ['1', '#cfe3f2', 0.35]].forEach(([o, c, a]) =>
    svgEl('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, crackGrad));
  const blur = (id, sd) => { const f = svgEl('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs); svgEl('feGaussianBlur', { stdDeviation: sd }, f); };
  blur('film-soft', 0.05);
  blur('film-wide', 0.35);

  const cracksG = svgEl('g', { class: 'film-cracks', stroke: 'url(#film-crack)' }, svg);

  const wobble = (() => {
    const r = mulberry32(31);
    const a = r() * 6.28, b = r() * 6.28, c = r() * 6.28;
    let d = '';
    for (let i = 0; i <= 180; i++) {
      const t = (i / 180) * Math.PI * 2;
      const spikes = 0.22 * Math.pow(Math.max(0, Math.sin(13 * t + c)), 10) + 0.1 * Math.pow(Math.max(0, Math.sin(7 * t + a)), 12);
      const rad = 1 + 0.08 * Math.sin(2 * t + a) + 0.05 * Math.sin(3 * t + b) + 0.02 * Math.sin(9 * t + c) + spikes;
      d += `${i ? 'L' : 'M'}${(Math.cos(t) * rad).toFixed(3)},${(Math.sin(t) * rad * 0.86).toFixed(3)}`;
    }
    return d + 'Z';
  })();
  const pool = svgEl('g', { class: 'film-pool' }, svg);
  svgEl('path', { d: wobble, fill: 'url(#film-stain)', transform: 'scale(2.3)', filter: 'url(#film-wide)' }, pool);
  svgEl('path', { d: wobble, fill: 'url(#film-pool)' }, pool);
  svgEl('ellipse', { cx: -0.28, cy: -0.3, rx: 0.4, ry: 0.05, transform: 'rotate(-14 -0.28 -0.3)', fill: '#ffeef0', opacity: 0.38, filter: 'url(#film-soft)' }, pool);
  svgEl('ellipse', { cx: 0.34, cy: 0.28, rx: 0.1, ry: 0.03, fill: '#ffd6d9', opacity: 0.12, filter: 'url(#film-soft)' }, pool);

  const sr = mulberry32(59);
  const splash = Array.from({ length: 18 }, () => {
    const ang = sr() * Math.PI * 2;
    return { ang, dist: 0.03 + sr() * 0.1, size: 0.0012 + sr() * 0.0026, stretch: 1.6 + sr() * 2.2,
      el: svgEl('ellipse', { class: 'film-splat', rx: 0, ry: 0, fill: 'url(#film-speck)' }, svg) };
  });

  const drop = svgEl('g', { class: 'film-drop' }, svg);
  const streak = svgEl('ellipse', { cx: 0, cy: -3.2, rx: 0.42, ry: 2.4, fill: '#5e080d', opacity: 0, filter: 'url(#film-soft)' }, drop);
  svgEl('path', { d: 'M0,-1.7 C0.3,-1 1,-0.25 1,0.35 A1,1 0 1,1 -1,0.35 C-1,-0.25 -0.3,-1 0,-1.7 Z', fill: 'url(#film-drop)' }, drop);
  svgEl('ellipse', { cx: -0.36, cy: 0.05, rx: 0.2, ry: 0.42, transform: 'rotate(12 -0.36 0.05)', fill: '#fff1f2', opacity: 0.75, filter: 'url(#film-soft)' }, drop);
  svgEl('ellipse', { cx: 0.42, cy: 0.78, rx: 0.2, ry: 0.08, fill: '#ff8a90', opacity: 0.3, filter: 'url(#film-soft)' }, drop);

  const snow = el('canvas', 'film-snow', layers);
  const flash = el('div', 'film-flash', layers);
  const shade = el('div', 'film-shade', layers);
  const hint = el('div', 'film-hint', layers);
  hint.innerHTML = '<span>Scroll</span><i></i>';

  // ─── sizes ───
  let W = 0, H = 0, portrait = false, cracks = [];
  const impact = { x: 0, y: 0 };

  function buildCracks() {
    cracksG.replaceChildren();
    impact.x = W * 0.5;
    impact.y = H * (portrait ? 0.58 : 0.56);
    crackGrad.setAttribute('cx', impact.x);
    crackGrad.setAttribute('cy', impact.y);
    crackGrad.setAttribute('r', Math.max(W, H) * 0.55);
    const rnd = mulberry32(1147);
    const reach = Math.max(W, H);
    cracks = [];
    const branch = (x, y, angle, length, width, delay) => {
      let d = `M${x.toFixed(1)},${y.toFixed(1)}`;
      let travelled = 0;
      const pts = [];
      while (travelled < length) {
        const step = reach * (0.018 + rnd() * 0.03);
        angle += (rnd() - 0.5) * 0.7;
        x += Math.cos(angle) * step;
        y += Math.sin(angle) * step * 0.82;
        travelled += step;
        d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        pts.push([x, y, angle, travelled]);
      }
      const path = svgEl('path', { d, 'stroke-width': width.toFixed(2) }, cracksG);
      cracks.push({ path, len: 0, delay });
      return pts;
    };
    const arms = 11;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
      const len = reach * (0.26 + rnd() * 0.34);
      const pts = branch(impact.x, impact.y, a, len, 2.4, (i % 4) * 0.006);
      for (let k = 0; k < 1 + (rnd() > 0.5 ? 1 : 0); k++) {
        const at = pts[Math.floor(pts.length * (0.3 + rnd() * 0.4))];
        if (!at) continue;
        branch(at[0], at[1], at[2] + (rnd() > 0.5 ? 1 : -1) * (0.5 + rnd() * 0.5), len * (0.25 + rnd() * 0.3), 1.2, 0.02 + at[3] / len * 0.05);
      }
    }
    for (const c of cracks) {
      c.len = c.path.getTotalLength();
      c.path.style.strokeDasharray = `${c.len} ${c.len}`;
    }
  }

  function resize() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    portrait = H > W * 1.05;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    snow.width = Math.round(W * Math.min(2, window.devicePixelRatio || 1));
    snow.height = Math.round(H * Math.min(2, window.devicePixelRatio || 1));
    loadImg(ice.img, portrait ? `${BASE}ice-p-800.webp` : `${BASE}ice-960.webp`, portrait ? '' : `${BASE}ice-960.webp 960w, ${BASE}ice-1536.webp 1536w`);
    if (portrait) loadImg(backdrop.img, `${BASE}field-p-800.webp`);
    buildCracks();
    last = -1;
  }

  // ─── the scene ───
  let want = 0, at = 0;   // wanted and current playhead, eased so seeking stays smooth
  let snowStrength = 0;

  function render(p) {
    const cut = smooth(seg(p, VIDEO_END + 0.03, VIDEO_END + 0.05)); // hard cut to the ice
    const shot = 1 - cut;

    // the film: the scroll drives the playhead, and the last frame holds
    if (duration) want = clamp(p / VIDEO_END) * duration;
    video.style.opacity = shot.toFixed(3);
    video.style.visibility = shot > 0.002 ? 'visible' : 'hidden';
    const bgO = portrait ? shot : 0;
    backdrop.root.style.opacity = bgO.toFixed(3);
    backdrop.root.style.visibility = bgO > 0.002 ? 'visible' : 'hidden';
    passed = duration ? want >= duration * CLASH_FRAC : false;
    if (passed) ring();

    // the blades meet: a white flash over the film, then the cut
    const fl = 0.45 * bump(seg(p, VIDEO_END - 0.03, VIDEO_END + 0.05));
    flash.style.opacity = fl.toFixed(3);
    flash.style.visibility = fl > 0.002 ? 'visible' : 'hidden';

    // one drop falls from the locked blades onto the ice
    const df = seg(p, VIDEO_END - 0.04, 0.72);
    const dropOn = p > VIDEO_END - 0.04 && p < 0.72;
    const dy = lerp(H * 0.2, impact.y, df * df);
    const ds = Math.min(W, H) * lerp(0.006, 0.022, smooth(seg(p, 0.64, 0.72)));
    drop.setAttribute('transform', `translate(${impact.x.toFixed(1)},${dy.toFixed(1)}) scale(${ds.toFixed(2)},${(ds * (1 + df * 0.3)).toFixed(2)})`);
    drop.style.opacity = dropOn ? '1' : '0';
    streak.setAttribute('opacity', (0.4 * df * (1 - smooth(seg(p, 0.7, 0.72)))).toFixed(3));

    // the close-up of the ice, pulling slowly back while the damage spreads
    ice.root.style.opacity = cut.toFixed(3);
    ice.root.style.visibility = cut > 0.002 ? 'visible' : 'hidden';
    ice.root.style.transform = `scale(${lerp(1.28, 1, smooth(seg(p, VIDEO_END + 0.05, 1))).toFixed(4)})`;

    const hit = seg(p, 0.72, 1);
    const r0 = Math.min(W, H);
    const R = r0 * 0.042 * ease(seg(p, 0.72, 0.78)) * lerp(1, 1.22, hit);
    pool.setAttribute('transform', `translate(${impact.x.toFixed(1)},${impact.y.toFixed(1)}) scale(${Math.max(0.01, R).toFixed(2)})`);
    pool.style.opacity = p > 0.72 ? '1' : '0';
    const st = seg(p, 0.72, 0.75);
    for (const s of splash) {
      const d = s.dist * r0 * ease(st);
      const x = impact.x + Math.cos(s.ang) * d;
      const y = impact.y + Math.sin(s.ang) * d * 0.86;
      const k = s.size * r0;
      s.el.setAttribute('cx', x.toFixed(1));
      s.el.setAttribute('cy', y.toFixed(1));
      s.el.setAttribute('rx', (k * lerp(1, s.stretch, ease(st))).toFixed(2));
      s.el.setAttribute('ry', (k * 0.8).toFixed(2));
      s.el.setAttribute('transform', `rotate(${(Math.atan2(Math.sin(s.ang) * 0.86, Math.cos(s.ang)) * 180 / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`);
      s.el.style.opacity = p > 0.72 ? '0.9' : '0';
    }
    for (const c of cracks) {
      const d = smooth(seg(p, 0.74 + c.delay, 0.9 + c.delay));
      c.path.style.strokeDashoffset = (c.len * (1 - d)).toFixed(1);
      c.path.style.opacity = d > 0 ? '1' : '0';
    }

    // the world's name, and the end of the shot melting into the page
    const tt = smooth(seg(p, 0.84, 0.94));
    title.style.opacity = tt.toFixed(3);
    title.style.transform = `translate3d(0, ${lerp(24, 0, tt).toFixed(1)}px, 0)`;
    shade.style.opacity = smooth(seg(p, 0.9, 1)).toFixed(3);
    hint.style.opacity = (1 - smooth(seg(p, 0, 0.035))).toFixed(3);
    snowStrength = cut * 0.75;
  }

  // ─── snow over the close-up ───
  const rnd = mulberry32(7);
  const flakes = Array.from({ length: 140 }, () => ({ x: rnd(), y: rnd(), z: 0.3 + rnd() * 0.7, ph: rnd() * 6.28 }));
  const ctx = snow.getContext('2d');
  let tPrev = performance.now();
  function drawSnow(now) {
    const dt = Math.min(0.05, (now - tPrev) / 1000);
    tPrev = now;
    const cw = snow.width, ch = snow.height;
    ctx.clearRect(0, 0, cw, ch);
    if (snowStrength < 0.01) return;
    const n = portrait ? 70 : 140;
    ctx.fillStyle = '#e8f1fa';
    for (let i = 0; i < n; i++) {
      const f = flakes[i];
      f.y += dt * (0.03 + f.z * 0.07);
      f.x += dt * (0.012 + Math.sin(now / 1400 + f.ph) * 0.02) * f.z;
      if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
      if (f.x > 1.02) f.x = -0.02;
      ctx.globalAlpha = snowStrength * (0.25 + f.z * 0.55);
      ctx.beginPath();
      ctx.arc(f.x * cw, f.y * ch, (0.6 + f.z * 1.8) * (cw / Math.max(1, W)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─── the frame loop, only while the section is near the screen ───
  let target = 0, shown = 0, last = -1, running = false, raf = 0;
  const progress = () => {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - H));
  };
  function frame(now) {
    target = progress();
    shown += (target - shown) * 0.2;
    if (Math.abs(target - shown) < 0.0004) shown = target;
    if (shown !== last) { render(shown); last = shown; }
    // Ease the playhead toward where the scroll wants it. Seeking straight to
    // every scroll value looks jittery, and the decoder cannot keep up.
    if (scrub && duration) {
      at += (want - at) * 0.22;
      if (Math.abs(want - at) < 0.004) at = want;
      if (video.readyState >= 1) video.currentTime = at;
    }
    drawSnow(now);
    if (running) raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !running) { running = true; tPrev = performance.now(); raf = requestAnimationFrame(frame); }
    if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
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
    window.scrollTo({ top: top + v * (section.offsetHeight - H), behavior: 'instant' });
    shown = target = progress();
    render(shown);
    if (scrub && duration) { at = want; if (video.readyState >= 1) video.currentTime = at; }
    return shown;
  };
}
