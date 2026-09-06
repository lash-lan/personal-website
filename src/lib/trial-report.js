// The Fivefold Calling record, as a PDF.
//
// Built from the same document object the page renders, so the printed record
// and the screen cannot disagree. Text flows and breaks across pages rather
// than being pinned to fixed pages, because length varies with the result.

import { CALLINGS } from '../data/fivefold.js';

const A4 = [595.28, 841.89];
const M = 56;
const INK = '#1b1a17';
const MUTE = '#6b6558';
const RULE = '#c9bfa8';
const PAPER = '#f7f3e9';

const hex = (rgb, s) => {
  const n = parseInt(String(s).replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export async function buildTrialRecord(doc, result) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifB = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifI = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const C = (s) => hex(rgb, s);

  const W = A4[0] - M * 2;
  const pages = [];
  let page, y;

  const newPage = () => {
    page = pdf.addPage(A4);
    page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: C(PAPER) });
    pages.push(page);
    y = A4[1] - M;
  };
  const need = (h) => { if (y - h < M + 34) newPage(); };

  // The standard PDF fonts only cover WinAnsi. Anything outside it is folded
  // down here rather than thrown, so an unusual character cannot break a
  // reader's download.
  const safe = (t) => String(t ?? '')
    .replace(/\*\*/g, '')
    .replace(/→/g, 'then').replace(/[–—]/g, ', ')
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

  const wrap = (text, font, size, width = W) => {
    const words = safe(text).split(/\s+/).filter(Boolean);
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

  const para = (text, o = {}) => {
    const font = o.font || serif;
    const size = o.size ?? 10.5;
    const lead = o.lead ?? 15.2;
    const indent = o.indent || 0;
    for (const ln of wrap(text, font, size, W - indent)) {
      need(lead);
      page.drawText(ln, { x: M + indent, y, size, font, color: C(o.colour || INK) });
      y -= lead;
    }
    y -= o.gap ?? 9;
  };

  const heading = (text) => {
    need(48);
    y -= 8;
    page.drawText(safe(text).toUpperCase(), { x: M, y, size: 9, font: serifB, color: C(MUTE) });
    y -= 9;
    page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.7, color: C(RULE) });
    y -= 17;
  };

  const label = (text) => {
    need(28);
    y -= 2;
    page.drawText(safe(text).toUpperCase(), { x: M, y, size: 8, font: serifB, color: C(MUTE) });
    y -= 14;
  };

  const bar = (name, value, colour, note, dim) => {
    need(20);
    const trackX = M + 96;
    const trackW = W - 96 - 150;
    page.drawText(safe(name), { x: M, y, size: 9.5, font: serif, color: C(INK) });
    page.drawRectangle({ x: trackX, y: y - 2, width: trackW, height: 8, color: C('#e6dfcd') });
    const filled = Math.max(2, (value / 100) * trackW);
    page.drawRectangle({ x: trackX, y: y - 2, width: filled, height: 8,
      color: C(dim ? '#b8b0a0' : colour) });
    page.drawText(safe(note), { x: trackX + trackW + 9, y, size: 8.5, font: serif, color: C(MUTE) });
    y -= 18;
  };

  // ── two columns with an arrow between them ──
  // What a reader means on the left, what it can land as on the right. Ten
  // alternating bullets made the reader work out the pairing for themselves.
  const arrowRight = (x, yy, w) => {
    page.drawLine({ start: { x, y: yy }, end: { x: x + w, y: yy }, thickness: 0.7, color: C(RULE) });
    page.drawLine({ start: { x: x + w - 3.5, y: yy + 2.5 }, end: { x: x + w, y: yy }, thickness: 0.7, color: C(RULE) });
    page.drawLine({ start: { x: x + w - 3.5, y: yy - 2.5 }, end: { x: x + w, y: yy }, thickness: 0.7, color: C(RULE) });
  };
  const pairRow = (left, right) => {
    const gap = 30;
    const colW = (W - gap) / 2;
    const l = wrap(left, serif, 9.5, colW);
    const rr = wrap(right, serifI, 9.5, colW);
    const h = Math.max(l.length, rr.length) * 13 + 7;
    need(h);
    const top = y;
    l.forEach((ln, i) => page.drawText(ln, { x: M, y: top - i * 13, size: 9.5, font: serif, color: C(INK) }));
    rr.forEach((ln, i) => page.drawText(ln, { x: M + colW + gap, y: top - i * 13, size: 9.5, font: serifI, color: C(MUTE) }));
    arrowRight(M + colW + 7, top + 3, gap - 14);
    y = top - h;
  };

  // ── a downward progression ──
  // Balanced to Strained to Shadow to Return, each stage carrying one term per
  // active Calling, so the reader can see their own strength turning into its
  // own cost.
  const arrowDown = (x, top, h) => {
    page.drawLine({ start: { x, y: top }, end: { x, y: top - h }, thickness: 0.7, color: C(RULE) });
    page.drawLine({ start: { x: x - 2.5, y: top - h + 3.5 }, end: { x, y: top - h }, thickness: 0.7, color: C(RULE) });
    page.drawLine({ start: { x: x + 2.5, y: top - h + 3.5 }, end: { x, y: top - h }, thickness: 0.7, color: C(RULE) });
  };
  const stage = (row, isLast) => {
    const terms = (row.terms || []).map((t) => (t.calling ? t.calling + ' ' : '') + t.term);
    const body = wrap(terms.join('   ·   '), serif, 9.5, W - 74);
    need(body.length * 13 + 26);
    const top = y;
    page.drawText(safe(row.label).toUpperCase(), { x: M, y: top, size: 8, font: serifB, color: C(MUTE) });
    body.forEach((ln, i) => page.drawText(ln, { x: M + 74, y: top - i * 13, size: 9.5, font: serif, color: C(INK) }));
    y = top - body.length * 13 - 4;
    if (!isLast) { arrowDown(M + 16, y - 1, 12); y -= 20; }
  };

  // ── the verdict ──
  newPage();
  y -= 26;
  page.drawText('THE FIVEFOLD CALLING', { x: M, y, size: 10.5, font: serifB, color: C(MUTE) });
  y -= 13;
  page.drawText('A RECORD OF JUDGMENT', { x: M, y, size: 8, font: serif, color: C(MUTE) });
  y -= 56;

  page.drawText(safe(doc.verdict.tier).toUpperCase(),
    { x: M, y, size: 9, font: serifB, color: C(MUTE) });
  y -= 30;
  for (const ln of wrap(doc.verdict.name.toUpperCase(), serifB, 30)) {
    page.drawText(ln, { x: M, y, size: 30, font: serifB, color: C(INK) });
    y -= 34;
  }
  y -= 2;
  page.drawText(safe(doc.verdict.blend), { x: M, y, size: 10, font: serif, color: C(MUTE) });
  y -= 26;

  let sx = M;
  for (const k of doc.verdict.active) {
    page.drawCircle({ x: sx + 5, y: y + 3, size: 5, color: C(CALLINGS[k].colour) });
    page.drawText(safe(CALLINGS[k].name), { x: sx + 15, y, size: 9.5, font: serif, color: C(INK) });
    sx += 18 + serif.widthOfTextAtSize(CALLINGS[k].name, 9.5) + 16;
  }
  y -= 30;

  para(doc.verdict.motto, { font: serifI, size: 13, lead: 18, gap: 20 });
  para(doc.verdict.reader
    ? `Prepared for ${doc.verdict.reader}. Completed ${doc.verdict.when}.`
    : `Completed ${doc.verdict.when}.`,
    { font: serifI, size: 9.5, colour: MUTE, gap: 14 });

  const bullets = (title, items) => {
    if (!items || !items.length) return;
    label(title);
    for (const t of items) para('·  ' + t, { gap: 5, indent: 8 });
    y -= 3;
  };
  const card = (name, text) => {
    if (!text) return;
    para(`${name}. ${text}`, { gap: 7, indent: 8 });
  };

  // ── the eight pages of the record ──
  for (const s of doc.pages) {
    if (y < M + 210) newPage(); else y -= 14;
    heading(`${s.n}. ${s.title}`);

    if (s.bars) {
      for (const b of s.bars) {
        bar(b.name, b.affinity, b.colour,
          `${b.affinity} · ${b.band}${b.active ? ' · active' : ''}`, !b.active);
        para(b.modifier, { size: 9, lead: 12.4, gap: 8, indent: 96, colour: MUTE });
      }
      y -= 4;
    }

    for (const t of (s.paras || [])) para(t);

    for (const c of (s.cards || [])) card(c.label, c.text);

    if (s.voices && s.voices.length) {
      label(s.voicesTitle || 'How your Callings speak');
      for (const v of s.voices) para(v, { gap: 6, indent: 8 });
      y -= 3;
    }

    if (s.flow) {
      label('Decision pathway');
      para(s.flow.map((f) => f.name).join('  then  '), { font: serifI, gap: 6, indent: 8 });
      if (!s.flowCertain) {
        para('Shown as the default for this archetype. Your scores did not select this order.',
          { size: 9, lead: 12.4, gap: 8, indent: 8, colour: MUTE });
      }
      y -= 2;
    }
    if (s.scales) {
      for (const sc of s.scales) bar(sc.low, sc.value, '#8a6d2f', sc.high, false);
      y -= 4;
      if (s.scalesNote) para(s.scalesNote, { font: serifI, size: 9.5, lead: 13.4, colour: MUTE });
    }

    if (s.perceptionPairs && s.perceptionPairs.length) {
      label('What you mean, and what they may hear');
      for (const p of s.perceptionPairs) pairRow(p.mean, p.hear);
      y -= 6;
    }

    bullets('Ideal conditions', s.ideal);
    bullets('Bad environment', s.bad);
    bullets('Your place in the party', s.party);

    if (s.sequence && s.sequence.length) {
      y -= 4;
      s.sequence.forEach((row, i) => stage(row, i === s.sequence.length - 1));
      y -= 10;
    }

    bullets('Growth roadmap', s.growth);

    if (s.stability) {
      label(s.stability.title);
      para(s.stability.text, { gap: 10, indent: 8 });
    }

    if (s.closing) { y -= 4; para(s.closing, { font: serifI, lead: 15.6 }); }
  }

  // ── the appendix ──
  const last = doc.pages[doc.pages.length - 1];
  if (last && last.technical) {
    if (y < M + 200) newPage(); else y -= 16;
    heading('How this was scored');
    for (const l of last.technical) para(l, { size: 9, lead: 12.6, gap: 7, colour: MUTE });
    y -= 4;
    para(last.disclaimer, { font: serifI, size: 9.5, lead: 13.4, colour: MUTE });
  }

  // ── footers, once the count is known ──
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 52 }, end: { x: A4[0] - M, y: 52 },
      thickness: 0.6, color: C(RULE) });
    p.drawText('THE FIVEFOLD CALLING', { x: M, y: 39, size: 7.5, font: serif, color: C(MUTE) });
    const right = 'bloodoficetear.com/trial';
    p.drawText(right, { x: A4[0] - M - serif.widthOfTextAtSize(right, 7.5), y: 39,
      size: 7.5, font: serif, color: C(MUTE) });
    const n = `${i + 1} of ${pages.length}`;
    p.drawText(n, { x: A4[0] / 2 - serif.widthOfTextAtSize(n, 7.5) / 2, y: 39,
      size: 7.5, font: serif, color: C(MUTE) });
  });

  const bytes = await pdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
}
