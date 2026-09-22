'use strict';
/**
 * docx.js — reading the shape of a Word form, and writing answers back into it.
 *
 * The important decision here: we fill in the REAL Scicom template rather than
 * building a lookalike from scratch. The letterhead, the borders, the fonts and
 * the signature blocks are the ones colleagues are used to approving, and they
 * stay untouched. All we do is insert text.
 *
 * A Word document is XML. Inside it:
 *
 *   <w:tbl>   a table          <w:p>   a paragraph
 *   <w:tr>    a row            <w:r>   a run: a piece of text with one style
 *   <w:tc>    a cell           <w:t>   the text itself
 *
 * Rather than rebuild that XML — which is how formatting gets lost — we note
 * the exact character positions of the places we want to write, and splice the
 * new runs in. Everything we do not touch comes through byte for byte.
 */

const zip = require('./zip');

/* ------------------------------------------------------------- reading */

const TAG = /<(\/?)(w:(?:tbl|tr|tc|p|r|t))(\s[^>]*?)?(\/?)>/g;

// Word writes tick-boxes two different ways, and Scicom's forms use both.
//   1. A real form-field checkbox: <w:checkBox><w:default w:val="0"/></w:checkBox>
//   2. A plain ballot-box character typed into the text: U+2610
const FF_CHECKBOX = /<w:checkBox>([\s\S]*?)<\/w:checkBox>/g;
const BALLOT_EMPTY = '\u2610';
const BALLOT_TICKED = '\u2612';

function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function encode(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Walk the document body and note where every table, row, cell, paragraph and
 * run begins and ends. Positions are offsets into the original XML string.
 */
function parse(xml) {
  const bodyStart = xml.indexOf('<w:body');
  const body = bodyStart < 0 ? 0 : xml.indexOf('>', bodyStart) + 1;

  const tables = [];
  const stack = [];          // open elements, innermost last
  let table = null, row = null, cell = null, para = null, run = null;
  let textStart = -1;

  TAG.lastIndex = body;
  let m;
  while ((m = TAG.exec(xml))) {
    const [full, closing, name, attrs = '', selfClosing] = m;
    const at = m.index;
    const after = at + full.length;

    if (selfClosing === '/') continue;   // e.g. <w:p/> — nothing inside to fill

    if (!closing) {
      switch (name) {
        case 'w:tbl':
          table = { start: at, rows: [], depth: stack.length };
          stack.push('tbl');
          break;
        case 'w:tr':
          if (!table) break;
          row = { start: at, cells: [] };
          stack.push('tr');
          break;
        case 'w:tc':
          if (!row) break;
          cell = { start: at, innerStart: after, paragraphs: [], text: '' };
          stack.push('tc');
          break;
        case 'w:p':
          para = { start: at, innerStart: after, runs: [], text: '' };
          stack.push('p');
          break;
        case 'w:r':
          if (!para) break;
          run = { start: at, innerStart: after, text: '', rPr: '' };
          stack.push('r');
          break;
        case 'w:t':
          if (!run) break;
          textStart = after;
          break;
      }
      continue;
    }

    switch (name) {
      case 'w:t':
        if (run && textStart >= 0) {
          const raw = xml.slice(textStart, at);
          // Note where any ballot-box characters sit, so they can be ticked.
          for (let i = raw.indexOf(BALLOT_EMPTY); i >= 0; i = raw.indexOf(BALLOT_EMPTY, i + 1)) {
            run.ballots = run.ballots || [];
            run.ballots.push(textStart + i);
          }
          run.text += decode(raw);
          textStart = -1;
        }
        break;
      case 'w:r':
        if (run && para) {
          run.end = after;
          // Keep the run's own formatting so anything we add matches it.
          const rpr = xml.slice(run.innerStart, at).match(/^<w:rPr>[\s\S]*?<\/w:rPr>/);
          run.rPr = rpr ? rpr[0] : '';
          para.runs.push(run);
          para.text += run.text;
          run = null;
          stack.pop();
        }
        break;
      case 'w:p':
        if (para) {
          para.end = at;                       // position of </w:p>
          para.endAfter = after;
          if (para.runs.length) {
            para.runsStart = para.runs[0].start;
            para.runsEnd = para.runs[para.runs.length - 1].end;
          }
          para.ballots = para.runs.flatMap((r) => r.ballots || []);
          // Form-field checkboxes living in this paragraph.
          para.checkBoxes = [];
          FF_CHECKBOX.lastIndex = para.innerStart;
          let cb;
          while ((cb = FF_CHECKBOX.exec(xml)) && cb.index < at) {
            para.checkBoxes.push({ start: cb.index, end: cb.index + cb[0].length, inner: cb[1] });
          }
          FF_CHECKBOX.lastIndex = 0;
          if (cell) cell.paragraphs.push(para);
          para = null;
          stack.pop();
        }
        break;
      case 'w:tc':
        if (cell && row) {
          cell.end = at;
          cell.text = cell.paragraphs.map((p) => p.text).join('\n').trim();
          cell.ballots = cell.paragraphs.flatMap((p) => p.ballots || []);
          cell.checkBoxes = cell.paragraphs.flatMap((p) => p.checkBoxes || []);
          row.cells.push(cell);
          cell = null;
          stack.pop();
        }
        break;
      case 'w:tr':
        if (row && table) {
          row.end = at;
          table.rows.push(row);
          row = null;
          stack.pop();
        }
        break;
      case 'w:tbl':
        if (table) {
          table.end = at;
          tables.push(table);
          table = null;
          stack.pop();
        }
        break;
    }
  }
  return { xml, tables };
}

function load(filePath) {
  const fs = require('fs');
  const entries = zip.read(fs.readFileSync(filePath));
  const xml = zip.readText(entries, 'word/document.xml');
  if (!xml) throw new Error('That file has no Word document inside it.');
  return { entries, xml, doc: parse(xml) };
}

/* ------------------------------------------------------------- writing */

/**
 * One edit: put `text` into the document at a chosen place.
 * Kinds:
 *   'append'  add to the end of a paragraph, after whatever is already there
 *   'into'    put into an empty paragraph
 */
function runXml(text, rPr, { leadingSpace = false } = {}) {
  const value = (leadingSpace ? ' ' : '') + text;
  return `<w:r>${rPr}<w:t xml:space="preserve">${encode(value)}</w:t></w:r>`;
}

/**
 * Apply a set of writes and return the new XML.
 *
 * Writes are applied from the end of the document backwards, so that inserting
 * text never shifts the positions of the writes still to come.
 */
function applyWrites(xml, writes) {
  const ordered = [...writes].filter(Boolean).sort((a, b) => b.at - a.at);
  let out = xml;
  for (const w of ordered) {
    // `removeTo` replaces a stretch of the document; without it we only insert.
    const cutTo = w.removeTo != null ? w.removeTo : w.at;
    out = out.slice(0, w.at) + (w.xml || '') + out.slice(cutTo);
  }
  return out;
}

/** Swap the placeholder example text in a cell for the real answer. */
function replaceParagraphText(para, text) {
  if (para.runsStart == null) return writeIntoParagraph(para, text, { space: false });
  const rPr = para.runs[0].rPr || '';
  return { at: para.runsStart, removeTo: para.runsEnd, xml: runXml(text, rPr), text };
}

/** Tick a box, whichever of the two kinds it is. */
function tickCheckbox(box) {
  if (box.kind === 'ballot') {
    return { at: box.at, removeTo: box.at + 1, xml: BALLOT_TICKED, text: BALLOT_TICKED };
  }
  // A form-field checkbox: set its default to 1 and mark it checked.
  const inner = box.inner.replace(/<w:default[^>]*\/>/, '') + '<w:default w:val="1"/><w:checked w:val="1"/>';
  return { at: box.start, removeTo: box.end, xml: `<w:checkBox>${inner}</w:checkBox>`, text: 'ticked' };
}

/** Write an answer into a paragraph, matching the formatting already in it. */
function writeIntoParagraph(para, text, { space } = {}) {
  const last = para.runs[para.runs.length - 1];
  const rPr = last ? last.rPr : '';
  const needsSpace = space !== undefined
    ? space
    : Boolean(para.text) && !/\s$/.test(para.text);
  return {
    at: para.end,                       // just before </w:p>
    xml: runXml(text, rPr, { leadingSpace: needsSpace }),
    text,
  };
}

function save(entries, xml, outPath) {
  const fs = require('fs');
  zip.replaceText(entries, 'word/document.xml', xml);
  fs.mkdirSync(require('path').dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, zip.write(entries));
  return outPath;
}

module.exports = {
  parse, load, save, applyWrites, writeIntoParagraph, replaceParagraphText,
  tickCheckbox, runXml, encode, decode, BALLOT_EMPTY, BALLOT_TICKED,
};
