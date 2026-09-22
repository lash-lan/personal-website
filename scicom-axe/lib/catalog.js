'use strict';
/**
 * catalog.js — reads the `resources/` folder and works out which policies and
 * which forms belong to which workstream.
 *
 * Nothing about this is hard-coded per file: drop a new PDF into
 * `resources/<...>/Procedures - Policies/` and it appears in the system next
 * time the page is refreshed. That is what makes the "add / replace / remove a
 * policy" option work without anyone editing code.
 *
 * Where a form was originally an old .doc or .xls, we also look in
 * `templates/converted/` for the modern version and prefer that one, because
 * software can fill a .docx in but cannot fill a .doc in.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RESOURCES = path.join(ROOT, 'resources');
const CONVERTED = path.join(ROOT, 'templates', 'converted');

const POLICY_DIR = 'Procedures - Policies';
const FORM_DIR = 'Forms';

/**
 * Pull the Scicom document number out of a filename, if there is one.
 *
 * `\b` is no good as the leading boundary here: an underscore counts as a word
 * character, so "…Confirmation_SCKLHRD-PACBFR005" would not match. We look for
 * the start of the name or any non-letter-or-digit instead.
 */
function officialNumber(filename) {
  const m = filename.match(/(?:^|[^A-Za-z0-9])(SCKL[A-Z0-9-]*?(?:FR|QP|PL|GL|WI|TP)\s?\d+)/i);
  return m ? m[1].replace(/\s+/g, '') : null;
}

/** Turn "SCKLFINFR006 - Purchase Requisition v1.2.doc" into "Purchase Requisition". */
function prettyTitle(filename) {
  let t = filename.replace(/\.[a-z]+$/i, '');
  t = t.replace(/^SCKL[A-Z0-9-]*?(?:FR|QP|PL|GL|WI|TP)\s?\d+\s*[-–]\s*/i, '');
  t = t.replace(/\s*\(\d+\)\s*$/, '');              // trailing "(1)", "(3)" copy markers
  t = t.replace(/\s*[-–]?\s*c?v\s?\d+(\.\d+)*\s*$/i, ''); // trailing version "cv1.2", "v3.7"
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t || filename;
}

/** "cv1.2" / "v3.7" out of a filename, if present. */
function version(filename) {
  const m = filename.match(/\bc?v\s?(\d+(?:\.\d+)*)/i);
  return m ? m[1] : null;
}

function safeList(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && !d.name.startsWith('~$') && !d.name.startsWith('.'))
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function walkFolders(rel) {
  // Return every folder under resources/<rel> that is a policy or form folder,
  // plus the folder itself, so both "Governance resources/Forms" and
  // "Administrative resources/HR/Forms" are found.
  const out = [];
  const abs = path.join(RESOURCES, rel);
  if (!fs.existsSync(abs)) return out;
  const stack = [rel];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(path.join(RESOURCES, cur), { withFileTypes: true });
    } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const child = path.posix.join(cur, e.name);
      if (e.name === POLICY_DIR || e.name === FORM_DIR) out.push(child);
      else stack.push(child);
    }
  }
  return out.sort();
}

/** Has this legacy file been converted to a modern one we can actually fill? */
function convertedTwin(relPath) {
  const modern = relPath.replace(/\.doc$/i, '.docx').replace(/\.xls$/i, '.xlsx');
  if (modern === relPath) return null;
  const abs = path.join(CONVERTED, modern);
  return fs.existsSync(abs) ? modern : null;
}

function describe(folderRel, filename, kind) {
  const relPath = path.posix.join(folderRel, filename);
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const twin = convertedTwin(relPath);
  // The segment right after "<X> resources" is the sub-area, e.g. HR or ICT.
  const parts = folderRel.split('/');
  const subArea = parts.length > 2 ? parts[1] : null;
  return {
    id: Buffer.from(relPath).toString('base64url'),
    kind,                       // 'policy' | 'form'
    title: prettyTitle(filename),
    filename,
    relPath,                    // path inside resources/
    fillablePath: twin,         // path inside templates/converted/ (null if none)
    fillable: Boolean(twin) || ext === 'docx' || ext === 'xlsx',
    format: ext,
    legacy: ext === 'doc' || ext === 'xls',
    officialNo: officialNumber(filename),
    version: version(filename),
    subArea,
  };
}

/** Everything one workstream owns, read fresh off disk. */
function forWorkstream(ws) {
  const result = { policies: [], forms: [] };
  if (!ws.resourceFolder) return result;
  for (const folderRel of walkFolders(ws.resourceFolder)) {
    const isPolicy = folderRel.endsWith('/' + POLICY_DIR);
    const kind = isPolicy ? 'policy' : 'form';
    for (const f of safeList(path.join(RESOURCES, folderRel))) {
      result[isPolicy ? 'policies' : 'forms'].push(describe(folderRel, f, kind));
    }
  }
  return result;
}

/** Absolute path of a catalogue entry — the fillable copy where one exists. */
function absolutePath(entry, { preferFillable = true } = {}) {
  if (preferFillable && entry.fillablePath) return path.join(CONVERTED, entry.fillablePath);
  return path.join(RESOURCES, entry.relPath);
}

function decodeId(id) {
  try {
    return Buffer.from(id, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

module.exports = {
  ROOT, RESOURCES, CONVERTED, POLICY_DIR, FORM_DIR,
  forWorkstream, absolutePath, decodeId, prettyTitle, officialNumber, describe, safeList,
};
