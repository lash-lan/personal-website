// The Trial Record: four pages, assembled from the same result object the
// page displays, so the document and the screen can never disagree.
import { CALLINGS, ORDER, SCIENCE_COPY, BORDERLINE_MESSAGE } from '../data/trial.js';

const A4 = [595.28, 841.89];
const M = 54;                       // page margin
const INK = '#1b1a17';
const MUTE = '#6b6558';
const RULE = '#c9bfa8';

const hex = (rgb, s) => {
  const n = parseInt(s.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export async function buildTrialRecord(result, opts = {}) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  // pdf-lib names these TimesRomanBold / TimesRomanItalic, not TimesBold
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifB = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifI = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const C = (s) => hex(rgb, s);
  const when = opts.completedAt || new Date().toLocaleDateString(undefined,
    { year: 'numeric', month: 'long', day: 'numeric' });

  const pages = [];
  const newPage = () => {
    const p = doc.addPage(A4);
    p.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: C('#f7f3e9') });
    pages.push(p);
    return { p, y: A4[1] - M };
  };

  // wrap a paragraph to the page width
  const wrap = (text, font, size, width) => {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = w; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const para = (ctx, text, { font = serif, size = 10.5, colour = INK, lead = 15, gap = 10 } = {}) => {
    for (const ln of wrap(text, font, size, A4[0] - M * 2)) {
      ctx.p.drawText(ln, { x: M, y: ctx.y, size, font, color: C(colour) });
      ctx.y -= lead;
    }
    ctx.y -= gap;
  };
  const heading = (ctx, text) => {
    ctx.y -= 4;
    ctx.p.drawText(text.toUpperCase(), { x: M, y: ctx.y, size: 8.5, font: serifB,
      color: C(MUTE), ...{} });
    ctx.y -= 8;
    ctx.p.drawLine({ start: { x: M, y: ctx.y }, end: { x: A4[0] - M, y: ctx.y },
      thickness: 0.6, color: C(RULE) });
    ctx.y -= 16;
  };
  const footer = (p, n) => {
    p.drawLine({ start: { x: M, y: 54 }, end: { x: A4[0] - M, y: 54 },
      thickness: 0.6, color: C(RULE) });
    p.drawText('THE TRIAL OF CHARACTER', { x: M, y: 40, size: 7.5, font: serif, color: C(MUTE) });
    const right = 'bloodoficetear.com/trial';
    p.drawText(right, { x: A4[0] - M - serif.widthOfTextAtSize(right, 7.5), y: 40,
      size: 7.5, font: serif, color: C(MUTE) });
    p.drawText(String(n), { x: A4[0] / 2, y: 40, size: 7.5, font: serif, color: C(MUTE) });
  };

  const bar = (ctx, label, value, max, colour, note) => {
    const w = A4[0] - M * 2 - 150;
    ctx.p.drawText(label, { x: M, y: ctx.y, size: 10, font: serif, color: C(INK) });
    ctx.p.drawRectangle({ x: M + 96, y: ctx.y - 2, width: w, height: 9,
      color: C('#e6dfcd') });
    const filled = max > 0 ? Math.max(2, (value / max) * w) : 2;
    ctx.p.drawRectangle({ x: M + 96, y: ctx.y - 2, width: filled, height: 9, color: C(colour) });
    ctx.p.drawText(note, { x: M + 96 + w + 10, y: ctx.y, size: 9, font: serif, color: C(MUTE) });
    ctx.y -= 22;
  };

  const arch = result.archetype;

  // ── page 1: the seal ────────────────────────────────────────────────
  let c = newPage();
  c.y -= 40;
  c.p.drawText('THE TRIAL OF CHARACTER', { x: M, y: c.y, size: 11, font: serifB, color: C(MUTE) });
  c.y -= 14;
  c.p.drawText('A RECORD OF JUDGMENT', { x: M, y: c.y, size: 8, font: serif, color: C(MUTE) });
  c.y -= 56;

  if (opts.name) {
    c.p.drawText(opts.name, { x: M, y: c.y, size: 13, font: serifI, color: C(MUTE) });
    c.y -= 30;
  }

  for (const ln of wrap(arch.name.toUpperCase(), serifB, 30, A4[0] - M * 2)) {
    c.p.drawText(ln, { x: M, y: c.y, size: 30, font: serifB, color: C(INK) });
    c.y -= 34;
  }
  c.y -= 6;
  c.p.drawText(result.tier.toUpperCase(), { x: M, y: c.y, size: 9, font: serifB, color: C(MUTE) });
  c.y -= 26;
  para(c, arch.tagline, { font: serifI, size: 13, lead: 18, gap: 22 });

  heading(c, 'Callings that answered');
  for (const k of result.active) {
    const cal = CALLINGS[k];
    c.p.drawRectangle({ x: M, y: c.y - 1, width: 9, height: 9, color: C(cal.colour) });
    c.p.drawText(`${cal.name}   ${cal.meaning}`, { x: M + 18, y: c.y, size: 10,
      font: serif, color: C(INK) });
    c.y -= 18;
  }
  c.y -= 10;
  para(c, `Archetype mask ${result.mask}. Completed ${when}.`, { font: serifI, size: 9.5, colour: MUTE });
  footer(c.p, 1);

  // ── page 2: the pattern ─────────────────────────────────────────────
  c = newPage();
  heading(c, 'Your fivefold pattern');
  const maxRaw = Math.max(...ORDER.map((k) => result.raw[k]), 1);
  for (const k of ORDER) {
    const cal = CALLINGS[k];
    const on = result.active.includes(k);
    bar(c, cal.name, result.raw[k], maxRaw, on ? cal.colour : '#b8b0a0',
      `${result.raw[k]} raw · ${result.resonance[k]} Resonance${on ? ' · active' : ''}`);
  }
  c.y -= 6;
  para(c, 'Resonance is a reading of how strongly a Calling answered within this Trial. It is not a percentage of your personality.',
    { font: serifI, size: 9.5, colour: MUTE });

  heading(c, 'The five callings');
  for (const k of ORDER) {
    const cal = CALLINGS[k];
    c.p.drawText(`${cal.name}  ${cal.question}`, { x: M, y: c.y, size: 10, font: serifB, color: C(INK) });
    c.y -= 14;
    para(c, `${cal.meaning}. Virtue: ${cal.virtue}. Shadow: ${cal.shadow}.`,
      { size: 9.5, lead: 13, gap: 8, colour: MUTE });
  }

  heading(c, 'Why this archetype found you');
  para(c, arch.portrait, { size: 10.5, lead: 15 });
  footer(c.p, 2);

  // ── page 3: strength and shadow ─────────────────────────────────────
  c = newPage();
  heading(c, 'Your strength');
  para(c, arch.strengths, { size: 11, lead: 16 });

  heading(c, 'Your shadow');
  para(c, arch.shadow, { size: 11, lead: 16 });

  heading(c, 'How you decide');
  for (const d of result.decide) {
    para(c, `${d.name}: ${d.line}`, { size: 10.5, lead: 15, gap: 6 });
  }

  if (result.neighbours.length) {
    heading(c, 'Borderland');
    para(c, BORDERLINE_MESSAGE, { font: serifI, size: 10.5 });
    for (const n of result.neighbours) {
      para(c, `Were ${CALLINGS[n.calling].name} to answer a little louder, this record would read ${n.archetype.name}. ${n.archetype.tagline}`,
        { size: 10.5, lead: 15, gap: 8 });
    }
  }
  footer(c.p, 3);

  // ── page 4: the crucible and the limits ─────────────────────────────
  c = newPage();
  heading(c, 'The crucible');
  const cru = result.crucible;
  const cruMax = Math.max(...cru.bars.map((b) => b[1]), 1);
  const cruColour = { fight: '#9E3030', flight: '#2F7D78', freeze: '#684A87', assess: '#406A9B' };
  for (const [id, n] of cru.bars) {
    bar(c, id.charAt(0).toUpperCase() + id.slice(1), n, cruMax, cruColour[id], `${n} of 10`);
  }
  c.y -= 4;
  if (cru.label) {
    para(c, cru.kind === 'hybrid' ? `Hybrid: ${cru.label}` : `Dominant: ${cru.label}`,
      { font: serifB, size: 10.5 });
  }
  para(c, cru.text, { size: 10.5, lead: 15 });
  para(c, cru.caveat, { font: serifI, size: 9.5, colour: MUTE });

  heading(c, 'Science and limitations');
  para(c, SCIENCE_COPY, { size: 10, lead: 14 });
  para(c, 'The Five Callings are a fantasy translation of themes from trait psychology. They are not HEXACO scales, and this document is not a validated psychometric instrument.',
    { font: serifI, size: 9.5, colour: MUTE, lead: 13 });

  heading(c, 'Technical details');
  para(c, ORDER.map((k) => `${CALLINGS[k].name}: ${result.raw[k]} raw, ${result.resonance[k]} Resonance`).join('.  ') + '.',
    { size: 9.5, lead: 13, gap: 6 });
  para(c, `Active threshold ${result.cutoff} of a possible ${result.top}. Archetype mask ${result.mask}. Crucible counts: ` +
    cru.bars.map(([id, n]) => `${id} ${n}`).join(', ') + `. Completed ${when}.`,
    { size: 9.5, lead: 13 });
  footer(c.p, 4);

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}
