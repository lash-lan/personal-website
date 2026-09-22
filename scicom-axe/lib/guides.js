'use strict';
/**
 * guides.js — the new-joiner guides.
 *
 * Scicom's policies are written for auditors: purpose, scope, a responsibility
 * matrix, then numbered clauses. Correct, and almost unreadable on your first
 * week. These guides say the same thing in the order a person actually needs
 * it — what it is for, what you need before you start, then the steps.
 *
 * A guide never replaces the policy. Every one says so on its last page and
 * names the document it came from, so anybody can go and check.
 *
 * Content lives as JSON in `content/guides/`, one file per guide, so the
 * wording can be corrected without touching any code.
 */

const fs = require('fs');
const path = require('path');
const b = require('./builder');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'guides');
const W = b.CONTENT_WIDTH;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function longDate(d = new Date()) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* --------------------------------------------------------------- layout */

/** The band across the top: logo on the left, title on the right. */
function header(g) {
  const logoCell = b.cell(
    b.para(b.image('rIdLogo', 0.62, 0.62), { after: 0 }),
    { width: 900, noBorders: true, padX: 0, padY: 60, valign: 'center' });

  const titleCell = b.cell(
    b.para(b.run(g.title, { bold: true, size: 20, colour: b.NAVY }), { after: 2 })
    + (g.subtitle ? b.para(b.run(g.subtitle, { size: 10.5, colour: b.GREY }), { after: 0 }) : ''),
    { width: W - 900, noBorders: true, padX: 0, padY: 60, valign: 'center' });

  return b.table([logoCell + titleCell], [900, W - 900], { noBorders: true })
    + b.para(b.run(' ', { size: 4 }), { after: 4, borderBottom: { size: 12, colour: b.ORANGE } })
    + b.spacer(8);
}

/** A section heading. */
function heading(text) {
  return b.para(
    b.run(text, { bold: true, size: 12.5, colour: b.NAVY }),
    { before: 14, after: 6, keepNext: true });
}

/** The one-line summary, in a tinted box. */
function summaryBox(text) {
  return b.table([
    b.cell(b.para(b.run(text, { size: 11.5, colour: b.NAVY }), { after: 0 }),
      { width: W, shade: b.LIGHT, borderColour: b.LIGHT, padX: 180, padY: 150 }),
  ], [W]) + b.spacer(4);
}

/** Two-column facts. */
function factsTable(rows) {
  const left = 3100;
  const body = rows.map(([k, v]) => b.cell(
    b.para(b.run(k, { bold: true, size: 10, colour: b.GREY }), { after: 0 }),
    { width: left, shade: 'FAFBFE' })
    + b.cell(b.para(b.run(v, { size: 10.5 }), { after: 0 }), { width: W - left }));
  return b.table(body.map((r) => r), [left, W - left]);
}

/** The steps, numbered in orange. */
function steps(list) {
  const numCol = 560;
  return list.map((s, i) => {
    const n = b.cell(
      b.para(b.run(String(i + 1), { bold: true, size: 17, colour: b.ORANGE }),
        { after: 0, align: 'center' }),
      { width: numCol, noBorders: true, padX: 0, padY: 120, valign: 'top' });

    const bodyXml = b.para(b.run(s.title, { bold: true, size: 11.5, colour: b.NAVY }), { after: 3 })
      + b.para(b.run(s.body, { size: 10.5 }), { after: s.who ? 3 : 0 })
      + (s.who ? b.para(b.run('Who does this: ' + s.who, { size: 9.5, italic: true, colour: b.GREY }), { after: 0 }) : '');

    const c = b.cell(bodyXml, { width: W - numCol, noBorders: true, padX: 60, padY: 120 });
    return n + c;
  }).map((r) => r);
}

/** Bullets with an orange bar down the side. */
function watchOut(items) {
  return items.map((t) => b.para(
    b.run(t, { size: 10.5 }),
    { indent: 240, after: 6, borderLeft: { colour: b.ORANGE, size: 18 } })).join('');
}

function bullets(items) {
  return items.map((t) => b.para(
    b.run('•   ', { colour: b.ORANGE, bold: true }) + b.run(t, { size: 10.5 }),
    { indent: 240, hanging: 240, after: 4 })).join('');
}

/** Questions and answers. */
function qa(pairs) {
  return pairs.map(([q, a]) =>
    b.para(b.run(q, { bold: true, size: 10.5, colour: b.NAVY }), { after: 2, before: 6 })
    + b.para(b.run(a, { size: 10.5 }), { after: 0 })).join('');
}

/** The closing note. Every guide carries one. */
function footer(g) {
  const src = g.source || {};
  const line = [
    src.officialNo ? `Scicom document ${src.officialNo}` : null,
    src.version ? `version ${src.version}` : null,
  ].filter(Boolean).join(', ');

  return b.spacer(14)
    + b.para(b.run(' ', { size: 4 }), { after: 6, borderBottom: { size: 8, colour: b.LINE } })
    + b.table([
      b.cell(
        b.para(b.run('This is a plain-English summary, not the policy itself.', { bold: true, size: 9.5, colour: b.NAVY }), { after: 3 })
        + b.para(b.run(
          `It is based on ${line || 'the Scicom policy'}. Where this guide and the policy disagree, `
          + `the policy is right and this guide is wrong — go and read it, or ask the document owner. `
          + `Policies are revised from time to time; check you are looking at the current version.`,
          { size: 9.5, colour: b.GREY }), { after: 3 })
        + b.para(b.run(`Prepared by Scicom Axe on ${longDate()}.`, { size: 9, colour: b.GREY }), { after: 0 }),
        { width: W, shade: 'FAFBFE', borderColour: b.LINE, padX: 180, padY: 140 }),
    ], [W]);
}

/* ---------------------------------------------------------- the whole thing */

function body(g) {
  let out = header(g);

  if (g.inOneLine) out += summaryBox(g.inOneLine);

  if (g.appliesTo) {
    out += heading('Who this is for');
    out += b.para(b.run(g.appliesTo, { size: 10.5 }), { after: 4 });
  }

  if (g.before && g.before.length) {
    out += heading('Before you start');
    out += bullets(g.before);
  }

  if (g.atAGlance && g.atAGlance.length) {
    out += heading('At a glance');
    out += factsTable(g.atAGlance);
  }

  if (g.steps && g.steps.length) {
    out += heading('What to do, step by step');
    out += b.table(steps(g.steps), [560, W - 560], { noBorders: true });
  }

  if (g.whoDoesWhat && g.whoDoesWhat.length) {
    out += heading('Who does what');
    out += factsTable(g.whoDoesWhat);
  }

  if (g.watchOut && g.watchOut.length) {
    out += heading('Watch out for');
    out += watchOut(g.watchOut);
  }

  if (g.questions && g.questions.length) {
    out += heading('Questions people actually ask');
    out += qa(g.questions);
  }

  if (g.forms && g.forms.length) {
    out += heading('Forms you will need');
    out += bullets(g.forms);
  }

  out += footer(g);
  return out;
}

/** Build one guide and save it. */
function build(guide, outPath) {
  return b.write(body(guide), {
    outPath,
    title: `${guide.title} — a guide for new joiners`,
  });
}

/* ------------------------------------------------------------- the library */

function load(id) {
  const p = path.join(CONTENT_DIR, id + '.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function all() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs.readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8'));
      } catch (err) {
        console.error(`[guides] ${f} is not valid JSON: ${err.message}`);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, c) => (a.order || 99) - (c.order || 99) || a.title.localeCompare(c.title));
}

function forWorkstream(workstreamId) {
  return all().filter((g) => g.workstream === workstreamId);
}

module.exports = { build, body, load, all, forWorkstream, CONTENT_DIR, longDate };
