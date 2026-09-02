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

  const wrap = (text, font, size, width = W) => {
    const words = String(text ?? '').split(/\s+/).filter(Boolean);
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
    page.drawText(String(text).toUpperCase(), { x: M, y, size: 9, font: serifB, color: C(MUTE) });
    y -= 9;
    page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.7, color: C(RULE) });
    y -= 17;
  };

  const bar = (label, value, colour, note, dim) => {
    need(20);
    const trackX = M + 96;
    const trackW = W - 96 - 150;
    page.drawText(String(label), { x: M, y, size: 9.5, font: serif, color: C(INK) });
    page.drawRectangle({ x: trackX, y: y - 2, width: trackW, height: 8, color: C('#e6dfcd') });
    const filled = Math.max(2, (value / 100) * trackW);
    page.drawRectangle({ x: trackX, y: y - 2, width: filled, height: 8,
      color: C(dim ? '#b8b0a0' : colour) });
    page.drawText(String(note), { x: trackX + trackW + 9, y, size: 8.5, font: serif, color: C(MUTE) });
    y -= 18;
  };

  // ── the verdict ──
  newPage();
  y -= 26;
  page.drawText('THE FIVEFOLD CALLING', { x: M, y, size: 10.5, font: serifB, color: C(MUTE) });
  y -= 13;
  page.drawText('A RECORD OF JUDGMENT', { x: M, y, size: 8, font: serif, color: C(MUTE) });
  y -= 56;

  page.drawText(String(doc.verdict.tier).toUpperCase(),
    { x: M, y, size: 9, font: serifB, color: C(MUTE) });
  y -= 30;
  for (const ln of wrap(doc.verdict.name.toUpperCase(), serifB, 30)) {
    page.drawText(ln, { x: M, y, size: 30, font: serifB, color: C(INK) });
    y -= 34;
  }
  y -= 2;
  page.drawText(String(doc.verdict.blend), { x: M, y, size: 10, font: serif, color: C(MUTE) });
  y -= 26;

  let sx = M;
  for (const k of doc.verdict.active) {
    page.drawCircle({ x: sx + 5, y: y + 3, size: 5, color: C(CALLINGS[k].colour) });
    page.drawText(CALLINGS[k].name, { x: sx + 15, y, size: 9.5, font: serif, color: C(INK) });
    sx += 18 + serif.widthOfTextAtSize(CALLINGS[k].name, 9.5) + 16;
  }
  y -= 30;

  para(doc.verdict.reveal, { font: serifI, size: 13, lead: 18, gap: 20 });

  // all five, always, whether they counted or not
  heading('Your five affinities');
  for (const b of doc.bars) {
    bar(b.name, b.affinity, b.colour,
      `${b.affinity} · ${b.band}${b.active ? ' · active' : ''}`, !b.active);
  }
  y -= 6;
  para(`Completed ${doc.verdict.when}.`, { font: serifI, size: 9.5, colour: MUTE });

  // ── the written sections ──
  for (const s of doc.sections) {
    if (s.id === 'technical') continue;
    if (y < M + 190) newPage(); else y -= 14;
    heading(s.title);
    for (const t of (s.paras || [])) para(t);
    for (const t of (s.items || [])) para('•  ' + t, { gap: 6, indent: 6 });
  }

  // ── the appendix ──
  const tech = doc.sections.find((s) => s.id === 'technical');
  if (tech) {
    if (y < M + 230) newPage(); else y -= 16;
    heading(tech.title);
    for (const l of tech.lines) para(l, { size: 9, lead: 12.6, gap: 7, colour: MUTE });
    y -= 4;
    for (const t of tech.paras) para(t, { font: serifI, size: 9.5, lead: 13.4, colour: MUTE });
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
