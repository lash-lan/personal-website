'use strict';
/**
 * extract.js — getting the words and numbers out of a file somebody hands you.
 *
 * Four kinds of file go in, and plain text and tables come out:
 *
 *   .csv .tsv     rows, read directly
 *   .xlsx         rows, read out of the sheet XML inside the archive
 *   .docx         the text of the document
 *   .pdf          the text, where the PDF was made by a computer
 *   photos/scans  nothing — see below
 *
 * A photograph of a receipt is a picture of some words, not the words. Reading
 * it needs OCR, which is a separate piece of software this system deliberately
 * does not install. So a photo is kept, attached, and handed back with its
 * boxes empty for you to type in — which is honest, and takes a minute.
 *
 * Everything here works on the file's own bytes. Nothing is uploaded anywhere.
 */

const zlib = require('zlib');
const path = require('path');
const zip = require('./zip');

/* -------------------------------------------------------------- helpers */

function stripXml(xml) {
  return xml
    .replace(/<w:p\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ------------------------------------------------------------------ CSV */

/**
 * Read comma- or tab-separated text into rows.
 *
 * Handles quoted fields, commas inside quotes, and doubled quotes, because
 * every export out of Excel produces all three.
 */
function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === delimiter) { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ''));
}

function guessDelimiter(text) {
  const head = text.slice(0, 4000);
  const commas = (head.match(/,/g) || []).length;
  const tabs = (head.match(/\t/g) || []).length;
  const semis = (head.match(/;/g) || []).length;
  if (tabs > commas && tabs > semis) return '\t';
  if (semis > commas) return ';';
  return ',';
}

/* ---------------------------------------------------------------- Excel */

/** A1 -> 0, B1 -> 1, AA1 -> 26. */
function columnIndex(ref) {
  const letters = String(ref).match(/^[A-Z]+/i);
  if (!letters) return 0;
  let n = 0;
  for (const ch of letters[0].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Excel keeps dates as a count of days since 1900, with a famous off-by-one. */
function excelDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n < 20000 || n > 60000) return null;
  const ms = Math.round((n - 25569) * 86400000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

function sharedStrings(entries) {
  let xml;
  try { xml = zip.readText(entries, 'xl/sharedStrings.xml'); } catch { return []; }
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) =>
    decodeEntities([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
}

/** Which number formats mean "this is a date", so 45000 reads as a date. */
function dateFormats(entries) {
  const dates = new Set();
  let xml;
  try { xml = zip.readText(entries, 'xl/styles.xml'); } catch { return dates; }
  if (!xml) return dates;

  const custom = new Set();
  for (const m of xml.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
    if (/[dmy]/i.test(m[2]) && !/[#0]/.test(m[2].replace(/\[[^\]]*\]/g, ''))) custom.add(m[1]);
  }
  // 14–22 and 45–47 are Excel's own built-in date and time formats.
  const builtIn = new Set(['14', '15', '16', '17', '18', '19', '20', '21', '22', '45', '46', '47']);

  const cellXfs = xml.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/);
  if (!cellXfs) return dates;
  let i = 0;
  for (const m of cellXfs[0].matchAll(/<xf\b[^>]*>/g)) {
    const id = (m[0].match(/numFmtId="(\d+)"/) || [])[1];
    if (id && (builtIn.has(id) || custom.has(id))) dates.add(i);
    i++;
  }
  return dates;
}

function readWorkbook(buf) {
  const entries = zip.read(buf);
  const strings = sharedStrings(entries);
  const dateStyles = dateFormats(entries);

  // Sheet names, in the order the workbook lists them.
  let names = [];
  try {
    const wb = zip.readText(entries, 'xl/workbook.xml') || '';
    names = [...wb.matchAll(/<sheet\b[^>]*name="([^"]*)"/g)].map((m) => decodeEntities(m[1]));
  } catch { /* fall back to file order */ }

  const sheetFiles = entries
    .map((e) => e.name)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, c) => Number(a.match(/\d+/)[0]) - Number(c.match(/\d+/)[0]));

  const sheets = [];
  sheetFiles.forEach((name, idx) => {
    const xml = zip.readText(entries, name) || '';
    const rows = [];
    for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const cm of rowMatch[1].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1] || '';
        const inner = cm[2] || '';
        const ref = (attrs.match(/r="([A-Z]+\d+)"/) || [])[1];
        const type = (attrs.match(/t="([^"]+)"/) || [])[1];
        const style = Number((attrs.match(/s="(\d+)"/) || [])[1]);
        const raw = (inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/) || [])[1];
        const inlineStr = [...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('');

        let value = '';
        if (type === 's') value = strings[Number(raw)] ?? '';
        else if (type === 'inlineStr') value = decodeEntities(inlineStr);
        else if (raw !== undefined) {
          value = decodeEntities(raw);
          if (dateStyles.has(style)) value = excelDate(raw) || value;
        }
        const at = ref ? columnIndex(ref) : cells.length;
        while (cells.length < at) cells.push('');
        cells[at] = String(value).trim();
      }
      if (cells.some((c) => c !== '')) rows.push(cells);
    }
    if (rows.length) sheets.push({ name: names[idx] || `Sheet ${idx + 1}`, rows });
  });

  return sheets;
}

/* ------------------------------------------------------------------ PDF */

/**
 * Pull the text out of a PDF.
 *
 * A PDF is a set of numbered objects; the page text sits in "content
 * streams", usually compressed the same way a ZIP is. This inflates every
 * stream it can and reads the text-drawing operators out of them — `(some
 * words) Tj` and `[(some) -20 (words)] TJ`.
 *
 * It works on a PDF a computer produced: an emailed invoice, an exported
 * report. It finds nothing in a scan, because a scan holds a picture, not
 * words. Fonts with their own private encoding can also come out as nonsense.
 * Both cases are reported rather than guessed at.
 */
function readPdf(buf) {
  const chunks = [];
  let at = 0;

  while (true) {
    const start = buf.indexOf('stream', at);
    if (start < 0) break;
    let from = start + 6;
    if (buf[from] === 0x0d) from++;
    if (buf[from] === 0x0a) from++;
    const end = buf.indexOf('endstream', from);
    if (end < 0) break;
    at = end + 9;

    const dict = buf.toString('latin1', Math.max(0, start - 800), start);
    const raw = buf.subarray(from, end);
    let data = null;
    if (/\/FlateDecode/.test(dict)) {
      try { data = zlib.inflateSync(raw); } catch { try { data = zlib.inflateRawSync(raw); } catch { data = null; } }
    } else if (!/\/(DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode|Image)/.test(dict)) {
      data = raw;
    }
    if (data) chunks.push(data.toString('latin1'));
  }

  const text = chunks.map(textFromContent).filter(Boolean).join('\n');
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), streams: chunks.length };
}

/** Read `(text) Tj` and `[(a)(b)] TJ` out of one content stream. */
function textFromContent(content) {
  if (!/\b(Tj|TJ)\b/.test(content)) return '';
  const out = [];

  for (const m of content.matchAll(/(?:\[((?:[^\][\\]|\\.)*)\]\s*TJ)|(?:\(((?:[^()\\]|\\.)*)\)\s*Tj)|(T\*|Td|TD|ET)/g)) {
    if (m[1] !== undefined) {
      const parts = [...m[1].matchAll(/\(((?:[^()\\]|\\.)*)\)|(-?\d+(?:\.\d+)?)/g)].map((p) => {
        if (p[1] !== undefined) return pdfString(p[1]);
        // A large negative kern is how a PDF writes a space between words.
        return Number(p[2]) < -180 ? ' ' : '';
      });
      out.push(parts.join(''));
    } else if (m[2] !== undefined) {
      out.push(pdfString(m[2]));
    } else {
      out.push('\n');
    }
  }

  return out.join('')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}

function pdfString(s) {
  return s.replace(/\\([nrtbf()\\]|\d{1,3})/g, (m, c) => {
    if (c === 'n') return '\n';
    if (c === 'r') return '';
    if (c === 't') return '\t';
    if (c === 'b' || c === 'f') return '';
    if (/^\d+$/.test(c)) return String.fromCharCode(parseInt(c, 8));
    return c;
  });
}

/* ---------------------------------------------------------------- the job */

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.gif', '.bmp', '.tif', '.tiff']);

/**
 * Read whatever was handed in. Never throws for a file it simply cannot read —
 * it says so in `note` and hands back what it has, so the screen can ask you
 * to type the few things it needs.
 */
function extract(filename, buf) {
  const ext = path.extname(filename).toLowerCase();

  if (IMAGE_EXT.has(ext)) {
    return {
      kind: 'image', ext, text: '', sheets: [], readable: false,
      note: 'This is a photograph, so the words in it are a picture rather than text. '
        + 'Nothing could be read out of it automatically — the file is kept and attached, '
        + 'and the few details needed can be typed in below.',
    };
  }

  if (ext === '.csv' || ext === '.tsv' || ext === '.txt') {
    const text = buf.toString('utf8').replace(/^﻿/, '');
    if (ext === '.txt') return { kind: 'text', ext, text, sheets: [], readable: Boolean(text.trim()), note: null };
    const rows = parseDelimited(text, ext === '.tsv' ? '\t' : guessDelimiter(text));
    return {
      kind: 'spreadsheet', ext, text: rows.slice(0, 40).map((r) => r.join(' | ')).join('\n'),
      sheets: rows.length ? [{ name: path.basename(filename, ext), rows }] : [],
      readable: rows.length > 0,
      note: rows.length ? null : 'The file appears to be empty.',
    };
  }

  if (ext === '.xlsx' || ext === '.xlsm') {
    let sheets;
    try {
      sheets = readWorkbook(buf);
    } catch (err) {
      return { kind: 'spreadsheet', ext, text: '', sheets: [], readable: false, note: `That spreadsheet could not be opened: ${err.message}` };
    }
    const total = sheets.reduce((n, s) => n + s.rows.length, 0);
    return {
      kind: 'spreadsheet', ext, sheets, readable: total > 0,
      text: sheets.map((s) => `[${s.name}]\n` + s.rows.slice(0, 25).map((r) => r.join(' | ')).join('\n')).join('\n\n'),
      note: total ? null : 'No rows were found in that spreadsheet.',
    };
  }

  if (ext === '.xls' || ext === '.doc') {
    return {
      kind: 'legacy', ext, text: '', sheets: [], readable: false,
      note: `A ${ext} file is the old Microsoft format, which this system cannot open. `
        + `Open it in Excel or Word and save it as ${ext === '.xls' ? '.xlsx' : '.docx'}, then upload that.`,
    };
  }

  if (ext === '.docx') {
    try {
      const entries = zip.read(buf);
      const xml = zip.readText(entries, 'word/document.xml') || '';
      const text = stripXml(xml);
      return { kind: 'word', ext, text, sheets: [], readable: Boolean(text), note: text ? null : 'That document appears to be empty.' };
    } catch (err) {
      return { kind: 'word', ext, text: '', sheets: [], readable: false, note: `That document could not be opened: ${err.message}` };
    }
  }

  if (ext === '.pdf') {
    let out;
    try {
      out = readPdf(buf);
    } catch (err) {
      return { kind: 'pdf', ext, text: '', sheets: [], readable: false, note: `That PDF could not be read: ${err.message}` };
    }
    const readable = out.text.replace(/\s/g, '').length > 40;
    return {
      kind: 'pdf', ext, text: out.text, sheets: [], readable,
      note: readable ? null
        : 'No text could be read out of this PDF. That almost always means it is a scan — '
          + 'a photograph of a page rather than a page of words. The file is kept and attached; '
          + 'the details can be typed in below.',
    };
  }

  return {
    kind: 'unknown', ext, text: '', sheets: [], readable: false,
    note: `${ext || 'That file'} is not a kind this system can read. It can read `
      + 'Excel and CSV, Word, PDF, and it will keep a photograph without reading it.',
  };
}

module.exports = { extract, parseDelimited, readWorkbook, readPdf, stripXml, IMAGE_EXT };
