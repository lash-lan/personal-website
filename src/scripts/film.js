// "A drop of blood on the ice": the scroll-directed opening of the home page.
//
// Hansall and the young Hannah Icetear meet on a frozen field, a spirit passes
// between them, their blades meet, one drop of blood falls, the ice cracks and
// the world's name appears. Scroll position is the clock: every layer is a
// pure function of progress (0..1) through the pinned section, so scrolling
// back up rewinds it exactly. Only the snow runs on its own time.
//
// Without JavaScript, with reduced motion or with data saver on, none of this
// runs and the section stays a single still picture with the title.

const BASE = '/cine/';

// ─── helpers ───
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a)); // progress within a sub-range
const smooth = (t) => t * t * (3 - 2 * t);
const ease = (t) => 1 - Math.pow(1 - t, 3);
const bump = (t) => Math.sin(Math.PI * clamp(t)); // 0 → 1 → 0

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

// ─── images ───
function loadImg(img, src, srcset) {
  if (img.dataset.src === src) return;
  img.dataset.src = src;
  if (srcset) { img.sizes = '100vw'; img.srcset = srcset; } else img.removeAttribute('srcset');
  img.src = src;
  img.decode?.().catch(() => {});
}
const wideSet = (id) => `${BASE}${id}-960.webp 960w, ${BASE}${id}-1536.webp 1536w`;

export function startFilm(section) {
  const saveData = navigator.connection?.saveData;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || saveData) return;

  const stage = section.querySelector('.film-stage');
  const title = section.querySelector('.film-title');
  section.classList.add('is-on');

  // ─── build the layers, back to front ───
  const layers = el('div', 'film-layers', null);
  layers.setAttribute('aria-hidden', 'true');
  stage.prepend(layers);

  const plate = (cls) => { const d = el('div', `film-plate ${cls}`, layers); return { root: d, img: el('img', '', d) }; };
  const field = plate('film-field');

  const figure = (cls, name) => {
    const root = el('div', `film-figure ${cls}`, layers);
    const poses = {};
    for (const pose of ['stand', 'turn', 'attack']) {
      const img = el('img', `pose-${pose}`, root);
      img.alt = '';
      poses[pose] = img;
    }
    return { root, poses, name };
  };
  const hansall = figure('film-hansall', 'hansall');
  const hannah = figure('film-hannah', 'hannah');

  const spirits = Array.from({ length: 5 }, (_, i) => {
    const d = el('div', 'film-spirit', layers);
    d.style.zIndex = String(5 - i);
    return { root: d, img: el('img', '', d) };
  });

  const fg = plate('film-foreground');
  const ice = plate('film-ice');

  // cracks, ripples, the pool and the drop share one SVG in screen pixels
  const svg = svgEl('svg', { class: 'film-svg' }, layers);
  const defs = svgEl('defs', {}, svg);
  const crackGrad = svgEl('radialGradient', { id: 'film-crack', gradientUnits: 'userSpaceOnUse' }, defs);
  // blood seeps a little way into the cracks (dark), then they turn to frost
  [['0', '#4a0509', 1], ['0.13', '#5e080d', 0.95], ['0.3', '#8fa9bf', 0.8], ['0.45', '#cfe3f2', 0.9], ['1', '#cfe3f2', 0.35]].forEach(([o, c, a]) =>
    svgEl('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, crackGrad));
  // Blood at night on ice reads almost black-red, with one bright wet highlight.
  const grad = (id, attrs, stops) => {
    const g = svgEl('radialGradient', { id, ...attrs }, defs);
    stops.forEach(([o, c, a = 1]) => svgEl('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  };
  grad('film-drop', { cx: '0.42', cy: '0.6', r: '0.75', fx: '0.36', fy: '0.5' }, [['0', '#a3151e'], ['0.5', '#5e080d'], ['1', '#1c0203']]);
  // a pool is flat and deep in the middle, and thin, lighter and see-through at its edge
  // flat, not domed: an almost even dark red with only a thin darker rim
  grad('film-pool', { cx: '0.5', cy: '0.5', r: '0.5' }, [['0', '#4f060b'], ['0.82', '#40050a'], ['0.95', '#2a0305'], ['1', '#2a0305', 0.85]]);
  grad('film-speck', {}, [['0', '#4a0509'], ['1', '#2a0204']]);
  grad('film-stain', {}, [['0', '#5c070c', 0.55], ['0.6', '#4a0509', 0.28], ['1', '#4a0509', 0]]);
  const blur = (id, sd) => { const f = svgEl('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs); svgEl('feGaussianBlur', { stdDeviation: sd }, f); };
  blur('film-soft', 0.05);  // in the unit space of the drop and pool (1 = their radius)
  blur('film-wide', 0.35);

  const cracksG = svgEl('g', { class: 'film-cracks', stroke: 'url(#film-crack)' }, svg);

  // an uneven pool: a wobbly outline drawn once at radius 1, then scaled
  const wobble = (() => {
    const r = mulberry32(31);
    const a = r() * 6.28, b = r() * 6.28, c = r() * 6.28;
    let d = '';
    for (let i = 0; i <= 180; i++) {
      const t = (i / 180) * Math.PI * 2;
      // soft lobes, plus a few short sharp points where the drop burst
      const spikes = 0.22 * Math.pow(Math.max(0, Math.sin(13 * t + c)), 10) + 0.1 * Math.pow(Math.max(0, Math.sin(7 * t + a)), 12);
      const rad = 1 + 0.08 * Math.sin(2 * t + a) + 0.05 * Math.sin(3 * t + b) + 0.02 * Math.sin(9 * t + c) + spikes;
      d += `${i ? 'L' : 'M'}${(Math.cos(t) * rad).toFixed(3)},${(Math.sin(t) * rad * 0.86).toFixed(3)}`;
    }
    return d + 'Z';
  })();
  const pool = svgEl('g', { class: 'film-pool' }, svg);
  svgEl('path', { d: wobble, fill: 'url(#film-stain)', transform: 'scale(2.3)', filter: 'url(#film-wide)' }, pool); // soaking into the frost
  svgEl('path', { d: wobble, fill: 'url(#film-pool)' }, pool);
  // the moon caught in the wet surface: one thin, sharp glint
  svgEl('ellipse', { cx: -0.28, cy: -0.3, rx: 0.4, ry: 0.05, transform: 'rotate(-14 -0.28 -0.3)', fill: '#ffeef0', opacity: 0.38, filter: 'url(#film-soft)' }, pool);
  svgEl('ellipse', { cx: 0.34, cy: 0.28, rx: 0.1, ry: 0.03, fill: '#ffd6d9', opacity: 0.12, filter: 'url(#film-soft)' }, pool);

  // specks thrown out by the impact: small, stretched along their flight, tails pointing outward
  const sr = mulberry32(59);
  const splash = Array.from({ length: 18 }, () => {
    const ang = sr() * Math.PI * 2;
    return { ang, dist: 0.03 + sr() * 0.1, size: 0.0012 + sr() * 0.0026, stretch: 1.6 + sr() * 2.2,
      el: svgEl('ellipse', { class: 'film-splat', rx: 0, ry: 0, fill: 'url(#film-speck)' }, svg) };
  });

  // the falling drop: glossy body, a bright highlight, and a faint streak behind it
  const drop = svgEl('g', { class: 'film-drop' }, svg);
  const streak = svgEl('ellipse', { cx: 0, cy: -3.2, rx: 0.42, ry: 2.4, fill: '#5e080d', opacity: 0, filter: 'url(#film-soft)' }, drop);
  svgEl('path', { d: 'M0,-1.7 C0.3,-1 1,-0.25 1,0.35 A1,1 0 1,1 -1,0.35 C-1,-0.25 -0.3,-1 0,-1.7 Z', fill: 'url(#film-drop)' }, drop);
  svgEl('ellipse', { cx: -0.36, cy: 0.05, rx: 0.2, ry: 0.42, transform: 'rotate(12 -0.36 0.05)', fill: '#fff1f2', opacity: 0.75, filter: 'url(#film-soft)' }, drop);
  svgEl('ellipse', { cx: 0.42, cy: 0.78, rx: 0.2, ry: 0.08, fill: '#ff8a90', opacity: 0.3, filter: 'url(#film-soft)' }, drop);

  const snow = el('canvas', 'film-snow', layers);
  const flash = el('div', 'film-flash', layers);
  const shade = el('div', 'film-shade', layers); // fades the bottom into the page at the end
  const hint = el('div', 'film-hint', layers);
  hint.innerHTML = '<span>Scroll</span><i></i>';

  // ─── sizes and sources ───
  let W = 0, H = 0, portrait = false, cracks = [];
  const impact = { x: 0, y: 0 };

  function sources() {
    portrait = H > W * 1.05;
    if (portrait) {
      loadImg(field.img, `${BASE}field-p-800.webp`);
      loadImg(ice.img, `${BASE}ice-p-800.webp`);
    } else {
      loadImg(field.img, `${BASE}field-960.webp`, wideSet('field'));
      loadImg(ice.img, `${BASE}ice-960.webp`, wideSet('ice'));
    }
    loadImg(fg.img, `${BASE}foreground-960.webp`, wideSet('foreground'));
    const big = H * (portrait ? 0.42 : 0.62) * (window.devicePixelRatio || 1) > 700 ? 760 : 440;
    for (const f of [hansall, hannah]) {
      for (const [pose, img] of Object.entries(f.poses)) loadImg(img, `${BASE}${f.name}-${pose}-${big}.webp`);
    }
    const sp = Math.min(W, H) * (window.devicePixelRatio || 1) > 700 ? 900 : 520;
    for (const s of spirits) loadImg(s.img, `${BASE}spirit-${sp}.webp`);
  }

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
        y += Math.sin(angle) * step * 0.82; // seen from above at a slight angle
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
      // one or two thinner cracks splitting off each arm
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
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    snow.width = Math.round(W * Math.min(2, window.devicePixelRatio || 1));
    snow.height = Math.round(H * Math.min(2, window.devicePixelRatio || 1));
    sources();
    buildCracks();
    last = -1;
  }

  // ─── the scene: every value below is a function of p ───
  const FIG_H = 600; // layout height of a figure box; scaled with transform only
  const setPlate = (pl, o, s, x = 0, y = 0) => {
    pl.root.style.opacity = o.toFixed(3);
    pl.root.style.visibility = o > 0.002 ? 'visible' : 'hidden';
    pl.root.style.transform = `translate3d(${x.toFixed(2)}%, ${y.toFixed(2)}%, 0) scale(${s.toFixed(4)})`;
  };

  function placeFigure(f, cx, feet, height, o, turn, attack, lean) {
    const k = height / FIG_H;
    const st = f.root.style;
    st.opacity = o.toFixed(3);
    st.visibility = o > 0.002 ? 'visible' : 'hidden';
    st.transform = `translate3d(${(cx * W - (FIG_H * 2 / 3) / 2).toFixed(1)}px, ${(feet * H - FIG_H).toFixed(1)}px, 0) scale(${k.toFixed(4)}) rotate(${lean.toFixed(2)}deg)`;
    // Each new pose fades in on top of a fully opaque earlier one, so the
    // figure never turns see-through mid-change.
    f.poses.stand.style.opacity = turn < 0.999 && attack < 0.999 ? '1' : '0';
    f.poses.turn.style.opacity = (attack < 0.999 ? turn : 0).toFixed(3);
    f.poses.attack.style.opacity = attack.toFixed(3);
  }

  function render(p) {
    // opening: out of darkness, the camera drifts forward over the whole wide shot
    const open = smooth(seg(p, 0, 0.1));
    const Z = lerp(1, portrait ? 1.1 : 1.22, smooth(seg(p, 0.04, 0.66)));
    const cut = smooth(seg(p, 0.715, 0.73)); // hard cut to the close-up of the ice
    const wide = 1 - cut;

    // the first screen already shows the field, a little dimmed, so nobody lands on darkness
    const lit = lerp(0.72, 1, open);
    setPlate(field, lit * wide, Math.pow(Z, 0.6) * lerp(1.06, 1, open), 0, lerp(0, -1.5, seg(p, 0, 0.66)));
    // the foreground is nearest the camera: it grows fastest and passes out of frame
    const fgO = lit * wide * (1 - smooth(seg(p, 0.46, 0.64)));
    setPlate(fg, fgO, Math.pow(Z, 2.2) * lerp(1.12, 1, open), 0, lerp(0, 3, seg(p, 0.2, 0.64)));

    // the two of them arrive at different speeds, then the camera pushes between them
    const turn = smooth(seg(p, 0.4, 0.43));
    const attack = smooth(seg(p, 0.61, 0.64));
    const hIn = ease(seg(p, 0.06, 0.3));
    const nIn = ease(seg(p, 0.1, 0.34));
    // phones: smaller figures, further apart, no lunge, so they never merge into one shape
    const home = portrait ? 0.24 : 0.34;
    const lunge = portrait ? 0 : 0.018 * attack;
    const hx = lerp(-0.35, home, hIn) + lunge;
    const nx = lerp(1.35, 1 - home, nIn) - lunge;
    const figH = H * (portrait ? 0.42 : 0.62);
    const feet = portrait ? 0.9 : 0.93;
    const sx = (x) => 0.5 + (x - 0.5) * Z; // camera zoom about the centre
    const sy = (y) => 0.5 + (y - 0.5) * Z;
    placeFigure(hansall, sx(hx), sy(feet), figH * Z, wide, turn, attack, lerp(-1.5, 0, hIn) + attack * 2);
    placeFigure(hannah, sx(nx), sy(feet), figH * Z, wide, turn, attack, lerp(1.5, 0, nIn) - attack * 2);

    // the spirit leaves Hansall and crosses to Hannah on a rising curve
    const t = seg(p, 0.44, 0.62);
    const from = { x: sx(hx) * W, y: sy(feet - 0.38) * H };
    const to = { x: sx(nx) * W, y: sy(feet - 0.4) * H };
    const ctrl = { x: W * 0.5, y: H * (portrait ? 0.2 : 0.14) };
    const sSize = Math.min(W, H) * 0.3;
    spirits.forEach((s, i) => {
      const u = clamp(t - i * 0.035);
      const q = 1 - u;
      const x = q * q * from.x + 2 * q * u * ctrl.x + u * u * to.x;
      const y = q * q * from.y + 2 * q * u * ctrl.y + u * u * to.y;
      const dx = 2 * q * (ctrl.x - from.x) + 2 * u * (to.x - ctrl.x);
      const dy = 2 * q * (ctrl.y - from.y) + 2 * u * (to.y - ctrl.y);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const o = bump(t) * (i === 0 ? 0.95 : 0.35 * (1 - i / 5)) * (t > 0 && t < 1 ? 1 : 0);
      const k = (sSize / 1000) * (1 - i * 0.08);
      const st = s.root.style;
      st.opacity = o.toFixed(3);
      st.visibility = o > 0.002 ? 'visible' : 'hidden';
      st.transform = `translate3d(${(x - 500).toFixed(1)}px, ${(y - 500).toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg) scale(${k.toFixed(4)})`;
    });

    // the blades meet: a white flash
    const fl = 0.5 * bump(seg(p, 0.685, 0.725));
    flash.style.opacity = fl.toFixed(3);
    flash.style.visibility = fl > 0.002 ? 'visible' : 'hidden';

    // one drop falls from where the blades met, down onto the ice
    const df = seg(p, 0.655, 0.78);
    const dropOn = p > 0.655 && p < 0.78;
    const dy0 = sy(feet - 0.5) * H;
    const dy = lerp(dy0, impact.y, df * df);
    const ds = Math.min(W, H) * lerp(0.006, 0.022, smooth(seg(p, 0.7, 0.78)));
    drop.setAttribute('transform', `translate(${impact.x.toFixed(1)},${dy.toFixed(1)}) scale(${ds.toFixed(2)},${(ds * (1 + df * 0.3)).toFixed(2)})`);
    drop.style.opacity = dropOn ? '1' : '0';
    streak.setAttribute('opacity', (0.4 * df * (1 - smooth(seg(p, 0.76, 0.78)))).toFixed(3)); // motion streak while falling fast

    // the close-up of the ice pulls slowly back while the damage spreads
    setPlate(ice, cut, lerp(1.28, 1, smooth(seg(p, 0.72, 1))));
    const hit = seg(p, 0.78, 1);
    const r0 = Math.min(W, H);
    // the pool spreads fast at first, then keeps creeping outward
    const R = r0 * 0.042 * ease(seg(p, 0.78, 0.84)) * lerp(1, 1.22, hit);
    pool.setAttribute('transform', `translate(${impact.x.toFixed(1)},${impact.y.toFixed(1)}) scale(${Math.max(0.01, R).toFixed(2)})`);
    pool.style.opacity = p > 0.78 ? '1' : '0';
    // specks fly outward from the impact and stay where they land
    const st = seg(p, 0.78, 0.81);
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
      s.el.style.opacity = p > 0.78 ? '0.9' : '0';
    }
    for (const c of cracks) {
      const d = smooth(seg(p, 0.8 + c.delay, 0.93 + c.delay));
      c.path.style.strokeDashoffset = (c.len * (1 - d)).toFixed(1);
      c.path.style.opacity = d > 0 ? '1' : '0';
    }

    // the world's name, and the end of the shot melting into the page
    const tt = smooth(seg(p, 0.86, 0.95));
    title.style.opacity = tt.toFixed(3);
    title.style.transform = `translate3d(0, ${lerp(24, 0, tt).toFixed(1)}px, 0)`;
    shade.style.opacity = smooth(seg(p, 0.9, 1)).toFixed(3);
    hint.style.opacity = (1 - smooth(seg(p, 0, 0.035))).toFixed(3);

    snowStrength = wide * 0.9 + cut * 0.5;
  }

  // ─── snow: small particle loop, only while the section is on screen ───
  let snowStrength = 1;
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

  // ─── the frame loop: runs only while the section is near the screen ───
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
    return shown;
  };
}
