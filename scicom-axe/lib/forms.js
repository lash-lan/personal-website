'use strict';
/**
 * forms.js — working out what a form is asking for, and answering it.
 *
 * This reads the labels off the real Scicom template and turns them into
 * questions you can answer one at a time. Nothing is hard-coded per form, so a
 * new form dropped into the resources folder becomes fillable straight away;
 * where the automatic reading needs a hand, `OVERRIDES` at the bottom corrects
 * it without touching any of the logic.
 *
 * Scicom's forms lay their fields out in four different ways, and all four are
 * handled here:
 *
 *   1.  Label :                         answer goes after the colon
 *   2.  Label  |  :  |  [blank]         answer goes in the third cell
 *   3.  Label  |  [blank]               answer goes in the next cell
 *   4.  Label  |  :  |  e.g. RM500      the example is replaced
 *
 *   plus  ☐ Resignation  ☐ Promotion    tick-boxes, offered as a choice
 *
 * Two things it deliberately does NOT ask you:
 *
 *   - Approval and sign-off sections. Those belong to whoever signs them.
 *   - Signature lines. Nobody should be typing a signature.
 *   - Dates the form wants for its own creation, which are filled in for you.
 */

const path = require('path');
const docx = require('./docx');
const llm = require('./llm');

/* -------------------------------------------------------- classification */

/**
 * Two different kinds of "somebody else's section", which must not be confused.
 *
 * APPROVAL sections are signed off by other people — approvals, verifications,
 * budget sign-off. Nobody should be typing into those, so they are dropped.
 *
 * "To be filled by the Line Manager" is NOT one of those. It says which ROLE
 * completes the section, and the person using this system is very often that
 * role. Dropping those emptied three whole forms. Instead the fields are kept
 * and tagged with whose section it is, so the screen can say so and offer to
 * skip the section in one go.
 */
const APPROVAL_RE = /(management approvals?|^approvals?$|budget (?:check|approval)|isms manager review|reviewed and approved by|for office use|approved by\s*:?\s*$|verification)/i;

const FILLED_BY_RE = /to be (?:filled|completed)(?:\s+(?:in|out))?\s+by\s+(?:the\s+)?([^),.]{2,40})/i;

// Never ask for these.
const NEVER_RE = /^(signature|sign|signed|name\s*[/&]\s*signature|name & date|name and date|chop|stamp|initial)s?\b/i;

// A cell carrying a signature line is a sign-off block; its dates are not ours.
const SIGN_BLOCK_RE = /\bsignature\b/i;

// Too bare to mean anything on its own.
const TOO_VAGUE_RE = /^(date|name|title|no|nos|yes|n\/a|na|others?|remarks?|status|type|amount)$/i;

// The form's own creation date — filled in automatically rather than asked.
const TODAY_RE = /\b(date of (?:requisition|request|application|submission)|request(?:ed)? date|submission date|date prepared|prepared on|form date|date of form|today'?s date|date raised)\b/i;

// A cell that only holds a colon, used as a spacer column.
const COLON_ONLY_RE = /^[:：\s/]+$/;

// A cell holding guidance rather than content, which we replace when answering.
const EXAMPLE_RE = /^\s*(e\.?g\b|\[x{2,}\]|x{3,}\b|<[^>]+>|insert\b|enter\b|state\b|specify\b)/i;

// A heading rather than a field: all capitals, or a lone phrase spanning a row.
function looksLikeHeading(text) {
  const t = text.trim();
  if (!t || t.length > 90) return false;
  const letters = t.replace(/[^A-Za-z]/g, '');
  return letters.length > 2 && letters === letters.toUpperCase();
}

const TYPE_RULES = [
  [/\b(date|dated|effective|expiry|commencement)\b/i, 'date'],
  [/\b(amount|total|cost|price|fee|salary|rate|budget|quantity|qty|headcount|number required|no\. of|number of)\b/i, 'number'],
  [/\b(reason|description|justification|details|purpose|scope|remarks?|comments?|background|summary|explain|specification)\b/i, 'long'],
  [/\b(e-?mail)\b/i, 'email'],
  [/\b(phone|contact number|mobile|tel)\b/i, 'phone'],
];

function inferType(label) {
  for (const [re, type] of TYPE_RULES) if (re.test(label)) return type;
  return label.length > 48 ? 'long' : 'text';
}

/** Turn "Reason for Purchase :" into "Reason for Purchase". */
function cleanLabel(raw) {
  let t = String(raw).replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*\([^)]*\)\s*$/, '').trim();     // drop a trailing hint in brackets
  t = t.replace(/[:：]\s*$/, '').trim();
  t = t.replace(/^[*•\-•☐☑☒]\s*/, '').trim();
  return t;
}

/** The hint a form gives in brackets, e.g. "(Type/Make/Model, Quantity)". */
function hintFrom(raw) {
  const m = String(raw).match(/\(([^)]{6,})\)/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/* ------------------------------------------------------------ discovery */

function describeCell(cell) {
  const text = cell.text.replace(/\s+/g, ' ').trim();
  const boxes = [
    ...(cell.checkBoxes || []).map((b) => ({ ...b, kind: 'ff' })),
    ...(cell.ballots || []).map((at) => ({ at, kind: 'ballot' })),
  ];
  return {
    cell,
    text,
    empty: !text,
    colonOnly: Boolean(text) && COLON_ONLY_RE.test(text),
    example: EXAMPLE_RE.test(text),
    heading: looksLikeHeading(text),
    boxes,
    fillable: cell.paragraphs.length > 0,
  };
}

/**
 * Read a template and return every field it contains, each with the exact
 * place in the document where its answer will be written.
 */
function discover(templatePath) {
  const { doc } = docx.load(templatePath);
  const fields = [];
  const choices = [];
  let section = null;
  let sectionIsOthers = false;
  let sectionOwner = null;      // "Line Manager", "HR", … when the form says so
  let seq = 0;

  for (const table of doc.tables) {
    for (const row of table.rows) {
      const cells = row.cells.map(describeCell);
      const rowText = cells.map((c) => c.text).filter(Boolean).join(' ').trim();

      // Is this row a section heading?
      const distinct = [...new Set(cells.map((c) => c.text).filter(Boolean))];
      if (distinct.length === 1 && (looksLikeHeading(distinct[0]) || FILLED_BY_RE.test(distinct[0]))) {
        const heading = distinct[0];
        section = cleanLabel(heading.replace(FILLED_BY_RE, '').replace(/\(\s*\)/, '')).trim()
          || cleanLabel(heading);
        sectionIsOthers = APPROVAL_RE.test(heading);
        const who = heading.match(FILLED_BY_RE);
        sectionOwner = who ? who[1].replace(/\s+/g, ' ').trim() : null;
        continue;
      }
      if (APPROVAL_RE.test(rowText) && cells.every((c) => !c.boxes.length)) {
        sectionIsOthers = true;
        sectionOwner = null;
      }

      // Tick-boxes: each cell holding one is an option in this section.
      const boxCells = cells.filter((c) => c.boxes.length === 1 && c.text);
      if (boxCells.length >= 2 && !sectionIsOthers) {
        for (const bc of boxCells) {
          choices.push({
            section: section || 'Options',
            sectionOwner,
            label: cleanLabel(bc.text),
            box: bc.boxes[0],
          });
        }
        continue;
      }

      // Label and target pairs.
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (c.empty || c.colonOnly || c.heading || c.boxes.length) continue;

        const rawLabel = c.cell.paragraphs.map((p) => p.text).join(' ');
        const label = cleanLabel(c.text);
        if (!label || label.length < 2 || label.length > 80) continue;
        if (NEVER_RE.test(label)) continue;
        if (SIGN_BLOCK_RE.test(c.text)) continue;
        if (APPROVAL_RE.test(c.text)) continue;
        if (TOO_VAGUE_RE.test(label)) continue;
        if (/^\d+[.)]?$/.test(label)) continue;          // a row number

        // Look right for somewhere to put the answer, stepping over colon cells.
        let target = null;
        for (let j = i + 1; j < cells.length; j++) {
          const t = cells[j];
          if (t.colonOnly) continue;
          if (t.empty && t.fillable) {
            target = { kind: 'into', para: t.cell.paragraphs[0] };
            i = j;                                        // consumed
          } else if (t.example) {
            target = { kind: 'replace', para: firstTextParagraph(t.cell), hint: t.text };
            i = j;
          }
          break;                                          // only the next one counts
        }

        // Nothing beside it — does the label end with a colon and have room below?
        if (!target) {
          if (!/[:：]\s*(\([^)]*\)\s*)?$/.test(c.text)) continue;
          const labelPara = c.cell.paragraphs.find((p) => p.text.trim());
          const below = c.cell.paragraphs.slice(
            c.cell.paragraphs.indexOf(labelPara) + 1).find((p) => !p.text.trim());
          target = below
            ? { kind: 'into', para: below }
            : { kind: 'append', para: labelPara || c.cell.paragraphs[0] };
        }
        if (!target || !target.para) continue;

        fields.push({
          id: 'q' + (++seq),
          label,
          section,
          hint: target.hint || hintFrom(rawLabel),
          type: TODAY_RE.test(label) ? 'date' : inferType(label),
          forOthers: sectionIsOthers,
          sectionOwner,
          autoToday: TODAY_RE.test(label),
          targetAt: target.para.end,
          targetKind: target.kind,
        });
      }
    }
  }

  return { fields: dedupe(fields), choices: groupChoices(choices) };
}

function firstTextParagraph(cell) {
  return cell.paragraphs.find((p) => p.text.trim()) || cell.paragraphs[0];
}

/** The same label twice usually means a repeated approval block. Keep the first. */
function dedupe(fields) {
  const seen = new Set();
  return fields.filter((f) => {
    const key = (f.section || '') + '|' + f.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Turn loose tick-boxes into one choice question per section. */
function groupChoices(choices) {
  const groups = new Map();
  for (const c of choices) {
    if (!groups.has(c.section)) groups.set(c.section, []);
    groups.get(c.section).push(c);
  }
  let n = 0;
  return [...groups.entries()]
    .filter(([, opts]) => opts.length >= 2)
    .map(([section, opts]) => ({
      id: 'c' + (++n),
      section,
      sectionOwner: opts[0].sectionOwner || null,
      kind: 'choice',
      options: opts.map((o, i) => ({ value: 'o' + i, label: o.label, box: o.box })),
    }));
}

/* --------------------------------------------------------- the question set */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function longDate(d = new Date()) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * The questions actually put to the user: other people's sections dropped,
 * creation dates pre-filled, and any per-form corrections applied.
 */
function questionsFor(templatePath, formTitle) {
  const { fields, choices } = discover(templatePath);
  const override = OVERRIDES[path.basename(templatePath)] || {};
  const skip = new Set((override.skip || []).map((s) => s.toLowerCase()));
  const rewrite = override.ask || {};

  const asked = [];
  const auto = [];

  for (const q of fields) {
    if (q.forOthers) continue;
    if (skip.has(q.label.toLowerCase())) continue;

    if (q.autoToday) {
      auto.push({ ...q, value: longDate(), why: "today's date" });
      continue;
    }
    const custom = rewrite[q.label.toLowerCase()];
    const type = custom?.type || q.type;
    asked.push({
      ...q,
      kind: 'field',
      type,
      question: custom?.question || defaultQuestion(q),
      hint: custom?.hint !== undefined ? custom.hint : q.hint,
      polish: type === 'long',
      optional: true,
    });
  }

  for (const c of choices) {
    if (skip.has(c.section.toLowerCase())) continue;
    asked.push({
      ...c,
      question: `${sentence(c.section)} — which of these apply? Pick any number, or skip.`,
      optional: true,
      multi: true,
    });
  }

  return { asked, auto, total: fields.length + choices.length, formTitle };
}

function sentence(s) {
  if (!s) return 'Options';
  return /^[A-Z0-9 /&()-]+$/.test(s)
    ? s.charAt(0) + s.slice(1).toLowerCase()
    : s;
}

function defaultQuestion(q) {
  const l = q.label;
  // The same label often appears in two sections of one form — "Effective
  // Date" under Resignation and again under Transfers — so always say which.
  const where = q.section ? ` — ${sentence(q.section)}` : '';
  switch (q.type) {
    case 'date':
    case 'number':
      return `What is the ${lower(l)}?${where}`;
    case 'long':
      return `${l}?${where}`.replace(/\?\?/, '?');
    default:
      return `What should go in "${l}"?${where}`;
  }
}

function lower(s) {
  return /^[A-Z0-9 /&-]+$/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/* -------------------------------------------------------------- filling */

/**
 * Write the answers into the template and save a copy.
 *
 * `answers` is { questionId: value }. For a choice question the value is an
 * array of the option values ticked. Anything missing is left blank, exactly
 * as it would be on paper.
 */
async function fill(templatePath, answers, { outPath, usePolish = true, formTitle } = {}) {
  const { entries, xml, doc } = docx.load(templatePath);
  const set = questionsFor(templatePath, formTitle);
  const byId = new Map([...set.asked, ...set.auto].map((q) => [q.id, q]));

  const writes = [];
  const record = [];
  let polishedCount = 0;

  for (const q of set.auto) {
    writes.push(makeWrite(doc, q, q.value));
    record.push({ label: q.label, value: q.value, source: 'filled in for you' });
  }

  for (const [id, raw] of Object.entries(answers || {})) {
    const q = byId.get(id);
    if (!q) continue;

    if (q.kind === 'choice') {
      const picked = [].concat(raw || []).filter(Boolean);
      const labels = [];
      for (const value of picked) {
        const opt = q.options.find((o) => o.value === value);
        if (!opt) continue;
        writes.push(docx.tickCheckbox(opt.box));
        labels.push(opt.label);
      }
      if (labels.length) record.push({ label: q.section, value: labels.join(', '), source: 'ticked' });
      continue;
    }

    const value = String(raw == null ? '' : raw).trim();
    if (!value) continue;                    // left blank on purpose

    let final = value;
    let source = 'as you wrote it';
    if (usePolish && q.polish) {
      const out = await llm.polish(value, { field: q.label, formName: formTitle, maxWords: 90 });
      final = out.text || llm.tidy(value);
      if (out.usedModel) { source = 'tidied by the local model'; polishedCount++; }
      else source = 'tidied';
    } else if (q.type === 'date') {
      final = prettyDate(value);
    }
    writes.push(makeWrite(doc, q, final));
    record.push({ label: q.label, value: final, original: value, source });
  }

  const newXml = docx.applyWrites(xml, writes.filter(Boolean));
  const saved = docx.save(entries, newXml, outPath);
  return { path: saved, filled: record, polishedCount };
}

function makeWrite(doc, q, text) {
  const para = findParagraphEndingAt(doc, q.targetAt);
  if (!para) return null;
  if (q.targetKind === 'replace') return docx.replaceParagraphText(para, text);
  return docx.writeIntoParagraph(para, text, {
    space: q.targetKind === 'append' ? undefined : false,
  });
}

function findParagraphEndingAt(doc, at) {
  for (const t of doc.tables) {
    for (const r of t.rows) {
      for (const c of r.cells) {
        for (const p of c.paragraphs) if (p.end === at) return p;
      }
    }
  }
  return null;
}

/** "2026-10-15" becomes "15 October 2026"; anything else is left as typed. */
function prettyDate(value) {
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  return longDate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/* ------------------------------------------------------------ overrides */

/**
 * Where reading the template automatically gets a question wrong or asks for
 * something nobody should type, correct it here, keyed by filename.
 *
 * `skip` drops a field or a whole tick-box section. `ask` rewrites the wording.
 * Anything not mentioned is handled automatically.
 */
const OVERRIDES = {
  'SCKLFINFR006 - Purchase Requisition v1.2.docx': {
    skip: ['name and signature of requester', 'hod/manager date', 'chief financial officer',
      'chief executive officer', 'cost account allocated to', 'name and details of finance provider',
      'terms of financing', 'recommended quote', 'quote 1', 'quote 2', 'quote 3'],
    ask: {
      'description of goods/service required': {
        question: 'What are you asking to buy? Include the make, model and quantity if you know them.',
        type: 'long',
      },
      'reason for purchase': {
        question: 'Why is it needed? A sentence or two is enough — I will tidy the wording.',
        type: 'long',
      },
      'preferred supplier': {
        question: 'Is there a supplier you want to use? Leave blank if not.',
        type: 'text',
      },
      'required date of delivery of items or services': {
        question: 'When do you need it by?',
        type: 'date',
      },
      'other details supporting this requisition': {
        question: 'Anything else supporting the request? Leave blank if not.',
        type: 'long',
      },
    },
  },
};

module.exports = { discover, questionsFor, fill, longDate, isoDate, OVERRIDES };
