// The Trial Record. Built from the same document object the screen renders,
// so the page and the PDF cannot disagree with one another.
//
// Text flows and breaks across pages rather than being pinned to fixed pages,
// because the report length varies with the participant. A Deep record
// normally runs to seven or ten pages.

import { CALLINGS } from '../data/trial.js';

const A4 = [595.28, 841.89];
const M = 56;                       // page margin
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
  // pdf-lib names these TimesRomanBold and TimesRomanItalic
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
    const colour = o.colour || INK;
    const indent = o.indent || 0;
    // a **lead-in.** at the start becomes a bold opening phrase
    let body = String(text ?? '');
    let boldLead = null;
    const m = /^\*\*(.+?)\*\*\s*(.*)$/s.exec(body);
    if (m) { boldLead = m[1]; body = m[2]; }

    if (boldLead) {
      need(lead * 2);
      const leadWidth = serifB.widthOfTextAtSize(boldLead + ' ', size);
      page.drawText(boldLead, { x: M + indent, y, size, font: serifB, color: C(INK) });
      // continue the first line beside the bold opening
      const first = wrap(body, font, size, W - indent - leadWidth);
      if (first.length) {
        page.drawText(first[0], { x: M + indent + leadWidth, y, size, font, color: C(colour) });
      }
      y -= lead;
      const rest = wrap(first.slice(1).join(' '), font, size, W - indent);
      for (const ln of rest) { need(lead); page.drawText(ln, { x: M + indent, y, size, font, color: C(colour) }); y -= lead; }
    } else {
      for (const ln of wrap(body, font, size, W - indent)) {
        need(lead);
        page.drawText(ln, { x: M + indent, y, size, font, color: C(colour) });
        y -= lead;
      }
    }
    y -= o.gap ?? 9;
  };

  const heading = (text) => {
    need(46);
    y -= 8;
    page.drawText(String(text).toUpperCase(), { x: M, y, size: 9, font: serifB, color: C(MUTE) });
    y -= 9;
    page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.7, color: C(RULE) });
    y -= 17;
  };

  const subheading = (text) => {
    need(30);
    y -= 3;
    page.drawText(String(text), { x: M, y, size: 10, font: serifB, color: C(INK) });
    y -= 15;
  };

  const bar = (label, value, max, colour, note) => {
    need(20);
    const trackX = M + 104;
    const trackW = W - 104 - 132;
    page.drawText(String(label), { x: M, y, size: 9.5, font: serif, color: C(INK) });
    page.drawRectangle({ x: trackX, y: y - 2, width: trackW, height: 8, color: C('#e6dfcd') });
    const filled = Math.max(2, (value / (max || 1)) * trackW);
    page.drawRectangle({ x: trackX, y: y - 2, width: filled, height: 8, color: C(colour) });
    page.drawText(String(note), { x: trackX + trackW + 9, y, size: 8.5, font: serif, color: C(MUTE) });
    y -= 18;
  };

  // ── page one: the verdict ──
  newPage();
  y -= 26;
  page.drawText('THE TRIAL OF CHARACTER', { x: M, y, size: 10.5, font: serifB, color: C(MUTE) });
  y -= 13;
  page.drawText('A RECORD OF JUDGMENT', { x: M, y, size: 8, font: serif, color: C(MUTE) });
  y -= 58;

  page.drawText(String(doc.verdict.tier).toUpperCase(),
    { x: M, y, size: 9, font: serifB, color: C(MUTE) });
  y -= 30;
  for (const ln of wrap(doc.verdict.name.toUpperCase(), serifB, 30)) {
    page.drawText(ln, { x: M, y, size: 30, font: serifB, color: C(INK) });
    y -= 34;
  }
  y -= 2;
  page.drawText(String(doc.verdict.blend), { x: M, y, size: 10, font: serif, color: C(MUTE) });
  y -= 28;

  // the active Calling sigils
  let sx = M;
  for (const k of doc.verdict.active) {
    page.drawCircle({ x: sx + 5, y: y + 3, size: 5, color: C(CALLINGS[k].colour) });
    page.drawText(CALLINGS[k].name, { x: sx + 15, y, size: 9.5, font: serif, color: C(INK) });
    sx += 18 + serif.widthOfTextAtSize(CALLINGS[k].name, 9.5) + 16;
  }
  y -= 30;

  para(doc.verdict.tagline, { font: serifI, size: 13, lead: 18, gap: 16 });
  para(doc.verdict.line, { size: 11, lead: 16, gap: 18 });

  heading('Profile clarity');
  para(`${doc.verdict.clarity.score} of 100, read as ${doc.verdict.clarity.band}.`,
    { font: serifB, size: 10.5, gap: 5 });
  para(doc.verdict.clarityNote, { size: 10, colour: MUTE });
  for (const reason of doc.verdict.clarity.reasons) {
    para('•  ' + reason, { size: 9.5, lead: 13, gap: 3, colour: MUTE, indent: 6 });
  }
  y -= 8;
  para(`Completed ${doc.verdict.when}.`, { font: serifI, size: 9.5, colour: MUTE });

  // ── the sections ──
  for (const s of doc.sections) {
    if (s.id === 'technical') continue;              // the appendix goes last
    // Sections flow rather than each claiming a fresh page. The Audit is
    // pointed about the old record wasting space, and a page holding one
    // heading and two lines is the thing it was complaining about.
    if (y < M + 200) newPage(); else y -= 16;
    heading(s.title);

    if (s.id === 'fivefold') {
      for (const row of s.rows) {
        bar(row.name, row.rel, 100, row.status === 'Quiet' ? '#b8b0a0' : row.colour,
          `${row.raw} pts · ${row.rel} · ${row.status}`);
        para(row.line, { size: 9.5, lead: 13, colour: MUTE, indent: 104, gap: 8 });
      }
      y -= 4;
    }

    if (s.id === 'facets') {
      for (const row of s.rows) {
        bar(row.name, row.value, 100, row.colour, `${row.value} · ${row.band}`);
      }
      y -= 6;
    }

    if (s.id === 'mirror' && s.rows) {
      for (const row of s.rows.slice(0, 15)) {
        need(15);
        page.drawText(row.name, { x: M, y, size: 9.5, font: serif, color: C(INK) });
        page.drawText(`you said ${row.self}`, { x: M + 150, y, size: 9, font: serif, color: C(MUTE) });
        page.drawText(`you chose ${row.acted}`, { x: M + 235, y, size: 9, font: serif, color: C(MUTE) });
        page.drawText(row.label, { x: M + 330, y, size: 9, font: row.label === 'Aligned' ? serif : serifB,
          color: C(row.label === 'Aligned' ? MUTE : INK) });
        y -= 14;
      }
      y -= 8;
    }

    if (s.id === 'crucible' && s.bars) {
      const max = Math.max(...s.bars.map((b) => b.n), 1);
      const col = { Fight: '#9E3030', Flight: '#2F7D78', Freeze: '#684A87', Assess: '#406A9B' };
      for (const b of s.bars) bar(b.label, b.n, max, col[b.label], `${b.n} of ${result.counts.crucible}`);
      y -= 6;
    }

    for (const t of (s.paras || [])) para(t, { size: 10.5, lead: 15.2 });

    for (const sub of (s.subs || [])) {
      subheading(sub.title);
      for (const t of sub.paras) para(t, { size: 10.2, lead: 14.6 });
    }

    for (const t of (s.prompts || [])) {
      para('•  ' + t, { size: 10.5, lead: 15, gap: 7, indent: 6 });
    }
  }

  // ── the appendix ──
  const tech = doc.sections.find((s) => s.id === 'technical');
  if (tech) {
    if (y < M + 260) newPage(); else y -= 18;
    heading(tech.title);
    for (const l of tech.lines) para(l, { size: 9, lead: 12.6, gap: 7, colour: MUTE });
    y -= 6;
    heading('Science and limitations');
    for (const t of tech.paras) para(t, { font: serifI, size: 9.5, lead: 13.4, colour: MUTE });
  }

  // ── footers, once the page count is known ──
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 52 }, end: { x: A4[0] - M, y: 52 },
      thickness: 0.6, color: C(RULE) });
    p.drawText('THE TRIAL OF CHARACTER', { x: M, y: 39, size: 7.5, font: serif, color: C(MUTE) });
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
