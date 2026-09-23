'use strict';
/**
 * intake.js — reading an uploaded file and working out what it is.
 *
 * You hand the system an invoice, a spreadsheet, a report or a photo of a
 * receipt. This decides what kind of thing it is and suggests what should be
 * recorded from it — an amount, an invoice number, a date, a supplier.
 *
 * It suggests. It never saves. Everything it works out comes back as a
 * proposal with every field editable, and nothing reaches the finance records
 * or the master list until you have looked at it and pressed the button. That
 * is deliberate: a number that quietly wrote itself into your accounts wrong
 * is far worse than a blank box.
 *
 * Where a local model is running it is asked for a second opinion on the
 * things it is good at — what the supplier is called, what the thing was for.
 * It is never trusted with the numbers; those come from the text itself.
 */

const path = require('path');
const llm = require('./llm');

/* ------------------------------------------------------------- patterns */

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Text as one long line, so a label and its value split across lines match. */
function flat(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function toIso(y, m, d) {
  const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);
  const mm = Number(m);
  const dd = Number(d);
  if (!(mm >= 1 && mm <= 12) || !(dd >= 1 && dd <= 31) || !(year >= 2000 && year <= 2100)) return null;
  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Every date in the text, with the label beside it where there is one.
 *
 * 03/04/2026 is ambiguous the world over. Malaysia and the UK write it
 * day-first, the United States month-first, and an American supplier invoicing
 * a Malaysian company writes it their way. Where the two digits cannot settle
 * it, day-first is assumed and the ambiguity is reported, so the screen can
 * say "check this one".
 */
function findDates(text) {
  const t = flat(text);
  const out = [];
  const push = (iso, at, label, ambiguous = false) => {
    if (iso) out.push({ value: iso, at, label: label || null, ambiguous });
  };

  const labelBefore = (index) => {
    const before = t.slice(Math.max(0, index - 60), index).toLowerCase();
    const m = before.match(/(invoice date|date of issue|issue date|billing date|payment date|due date|date paid|order date|date)\s*[:#]?\s*$/);
    return m ? m[1] : null;
  };

  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    push(toIso(m[1], m[2], m[3]), m.index, labelBefore(m.index));
  }
  for (const m of t.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const ambiguous = a <= 12 && b <= 12 && a !== b;
    // A number above twelve can only be the day, wherever it sits.
    const iso = b > 12 ? toIso(m[3], m[1], m[2]) : toIso(m[3], m[2], m[1]);
    push(iso, m.index, labelBefore(m.index), ambiguous);
  }
  for (const m of t.matchAll(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/g)) {
    const mm = MONTHS[m[2].slice(0, 4).toLowerCase()] || MONTHS[m[2].slice(0, 3).toLowerCase()];
    push(toIso(m[3], mm, m[1]), m.index, labelBefore(m.index));
  }
  for (const m of t.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g)) {
    const mm = MONTHS[m[1].slice(0, 4).toLowerCase()] || MONTHS[m[1].slice(0, 3).toLowerCase()];
    push(toIso(m[3], mm, m[2]), m.index, labelBefore(m.index));
  }

  return out;
}

/** The date an invoice was issued: the labelled one, else the earliest found. */
function invoiceDate(text) {
  const all = findDates(text);
  if (!all.length) return null;
  const issued = all.find((d) => /invoice date|date of issue|issue date|billing date|order date/.test(d.label || ''));
  if (issued) return issued;
  const dated = all.find((d) => d.label === 'date');
  if (dated) return dated;
  return all.slice().sort((a, b) => a.value.localeCompare(b.value))[0];
}

const CURRENCY_WORDS = {
  rm: 'MYR', myr: 'MYR', 'rm.': 'MYR',
  usd: 'USD', 'us$': 'USD', $: 'USD',
  sgd: 'SGD', eur: 'EUR', '€': 'EUR', gbp: 'GBP', '£': 'GBP',
};

function parseAmount(s) {
  const cleaned = String(s).replace(/[,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Every money figure in the text, with its currency and whatever labels it.
 *
 * The one that matters on an invoice is the grand total, which is nearly
 * always the largest and nearly always labelled. Both are used: labelled beats
 * unlabelled, and among labelled ones the total beats the subtotal.
 */
function findAmounts(text) {
  const t = flat(text);
  const out = [];
  const re = /(RM|MYR|USD|US\$|SGD|EUR|GBP|\$|€|£)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)|([0-9][0-9,]*\.[0-9]{2})\s?(RM|MYR|USD|SGD|EUR|GBP)\b/gi;

  for (const m of t.matchAll(re)) {
    const symbol = (m[1] || m[4] || '').toLowerCase();
    const value = parseAmount(m[2] || m[3]);
    if (value === null || value === 0) continue;
    const before = t.slice(Math.max(0, m.index - 70), m.index).toLowerCase();
    let role = null;
    if (/\b(grand total|amount due|total due|balance due|total payable|amount payable|total charged|charged)\b[^a-z]{0,12}$/.test(before)) role = 'total';
    else if (/\b(total)\b[^a-z]{0,12}$/.test(before)) role = 'total';
    else if (/\b(sub ?total|subtotal)\b[^a-z]{0,12}$/.test(before)) role = 'subtotal';
    else if (/\b(tax|vat|gst|sst|service tax)\b[^a-z]{0,12}$/.test(before)) role = 'tax';
    else if (/\b(discount|credit)\b[^a-z]{0,12}$/.test(before)) role = 'discount';
    out.push({ currency: CURRENCY_WORDS[symbol] || 'MYR', value, role, at: m.index });
  }
  return out;
}

function bestAmount(amounts, currency) {
  const pool = currency ? amounts.filter((a) => a.currency === currency) : amounts;
  if (!pool.length) return null;
  const totals = pool.filter((a) => a.role === 'total');
  if (totals.length) return totals[totals.length - 1];
  const plain = pool.filter((a) => !a.role || a.role === 'subtotal');
  if (!plain.length) return null;
  return plain.reduce((best, a) => (a.value > best.value ? a : best));
}

// The words that introduce an invoice number, and the words that sit between
// them and the number itself. "Invoice / Invoice Number / D41A2C1F-0012" is
// three tokens before anything useful, so the anchor is found first and the
// number is looked for just after it.
const INVOICE_ANCHOR_RE = /\b(?:tax\s+)?(?:invoice|inv|receipt|bill|statement)\s*(?:no\.?|number|num|#|id|ref(?:erence)?)?\s*[:#]?\s*/gi;

const NOT_A_NUMBER_RE = /^(number|numb|num|no|nos|date|dated|due|to|from|for|total|amount|id|ref|reference|summary|details?|invoice|receipt|bill|statement|order|period|paid|issued)$/i;

/** The invoice number: the first thing after "invoice" that has a digit in it. */
function findInvoiceNo(text) {
  const t = flat(text);
  for (const m of t.matchAll(INVOICE_ANCHOR_RE)) {
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 60);
    for (const token of after.split(/\s+/).slice(0, 4)) {
      const candidate = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9/_-]+$/g, '');
      if (!candidate) continue;
      if (NOT_A_NUMBER_RE.test(candidate)) continue;   // a label, keep looking
      if (!/\d/.test(candidate)) break;                // a real word: not here
      if (candidate.length < 3 || /^\d{1,2}$/.test(candidate)) break;
      return candidate;
    }
  }
  return null;
}

const PO_RE = /\b(?:p\.?o\.?|purchase order)\s*(?:no\.?|number|#)?\s*[:#]?\s*([A-Z0-9][A-Z0-9/_-]{2,24})\b/i;

/** A purchase order number, only where what follows really is a number. */
function findPurchaseOrder(text) {
  const m = String(text).match(PO_RE);
  if (!m) return null;
  const candidate = m[1];
  if (!/\d/.test(candidate) || NOT_A_NUMBER_RE.test(candidate)) return null;
  return candidate;
}
const CARD_RE = /\b(?:visa|mastercard|master card|amex|american express|card)\b[^0-9]{0,28}(?:\*{2,}|x{2,}|ending(?:\s+in)?|•{2,})\s*(\d{4})\b/i;
const CARD_PLAIN_RE = /\b(?:\*{4,}|x{4,}|•{4,})\s?(\d{4})\b/i;

const RECURRING_RE = /\b(subscription|monthly plan|per month|\/month|\/mo\b|billed monthly|billed annually|annual plan|yearly plan|recurring|renews on|auto-?renew|next billing date|billing period|seat[s]? per month)\b/i;
const CREDIT_RE = /\b(credits?|pay as you go|pay-as-you-go|usage|top ?up|prepaid)\b/i;

/**
 * One-off, monthly, yearly or pay-as-you-go.
 *
 * The exact wording matters: these are the same five choices the finance
 * screen offers, so a charge read off an invoice and one typed in by hand can
 * be counted together.
 */
function costTypeFor(text) {
  if (/\b(annual|yearly|per year|\/year|\/yr|12 months?)\b/i.test(text)
    && RECURRING_RE.test(text)) return 'Yearly subscription';
  if (RECURRING_RE.test(text)) return 'Monthly Subscription';
  if (CREDIT_RE.test(text)) return 'Pay per Use';
  return 'One time cost';
}

/* ------------------------------------------------------------ classifying */

/**
 * Is this an invoice, or a document that merely talks about invoices?
 *
 * A finance policy is full of the words "invoice", "receipt" and "paid", and
 * calling one a charge would put a made-up figure into the accounts. So this
 * scores the things only a real invoice has — a number, a total, a "bill to" —
 * against the things only a document has, and needs a clear win either way.
 */
const DOCUMENT_TELLS = /\b(table of contents|document classification|controlled document|version history|revision history|document owner|this policy|this procedure|scope\s+(?:and|&)\s+purpose|definitions)\b/i;

function invoiceScore(text, filename) {
  const t = flat(text);
  const head = t.slice(0, 400);
  const amounts = findAmounts(t);
  let score = 0;

  if (/\b(tax invoice|invoice|receipt|order confirmation)\b/i.test(head)) score += 2;
  if (findInvoiceNo(t)) score += 2;
  if (amounts.some((a) => a.role === 'total')) score += 2;
  if (/\b(bill(?:ed)? to|amount due|balance due|total due|amount payable|payment received)\b/i.test(t)) score += 1;
  if (looksFinancial(filename)) score += 1;

  if (DOCUMENT_TELLS.test(t)) score -= 3;
  if (t.length > 8000) score -= 2;          // invoices are short; policies are not

  return score;
}
const REPORT_HINT = /\b(report|minutes|memo|proposal|assessment|review|summary|plan|charter|register|policy|procedure)\b/i;

/** Does this spreadsheet look like a list of charges, or a list of people? */
function classifySheet(rows) {
  const header = (rows[0] || []).map((c) => String(c).toLowerCase());
  const joined = header.join(' | ');
  const has = (re) => header.some((c) => re.test(c));

  const money = has(/amount|cost|total|price|rm\b|usd|charge|spend|value/);
  const when = has(/date|month|period|invoice/);
  const who = has(/vendor|supplier|merchant|payee|description|item|particular/);
  const people = has(/\b(name|staff|employee|designation|position|department|contact|email|nric|passport)\b/);

  if (money && (when || who)) return { target: 'finance', confidence: who && when ? 'high' : 'medium', header: joined };
  if (people && !money) return { target: 'masterlist', confidence: 'medium', header: joined };
  return { target: 'masterlist', confidence: 'low', header: joined };
}

/** Which of our columns does a spreadsheet heading correspond to? */
const COLUMN_MAP = [
  ['date', /^(date|invoice date|transaction date|charge date|posting date)$/i],
  ['month', /^(month|period|billing period|fy month)$/i],
  ['vendor', /^(vendor|supplier|merchant|payee|company|provider|name of vendor)$/i],
  ['item', /^(item|description|particulars?|details?|service|product|narration)$/i],
  ['invoiceNo', /^(invoice ?(no|number|#)|inv ?no|bill ?no|receipt ?(no|number))$/i],
  ['amountRM', /^(amount ?\(?rm\)?|rm|myr|amount myr|total ?\(?rm\)?|cost ?\(?rm\)?)$/i],
  ['amountUSD', /^(amount ?\(?usd\)?|usd|amount usd|total ?\(?usd\)?|cost ?\(?usd\)?)$/i],
  ['fxRate', /^(fx|fx ?rate|exchange rate|rate)$/i],
  ['costType', /^(cost type|type of cost|billing|frequency|subscription\??)$/i],
  ['card', /^(card|paid by|payment method|card used)$/i],
  ['accountCode', /^(account|account code|gl|gl code|cost cent(re|er))$/i],
  ['project', /^(project|initiative|programme|program)$/i],
  ['purpose', /^(purpose|reason|justification|usage)$/i],
  ['company', /^(company|entity|legal entity|billed to)$/i],
  ['remark', /^(remark|remarks|notes?|comment)$/i],
];

function mapColumns(header) {
  const map = {};
  header.forEach((raw, i) => {
    const name = String(raw).replace(/\s+/g, ' ').trim();
    for (const [field, re] of COLUMN_MAP) {
      if (map[field] !== undefined) continue;
      if (re.test(name)) { map[field] = i; break; }
    }
  });
  return map;
}

function rowsToFinance(sheet, limit = 500) {
  const header = sheet.rows[0] || [];
  const map = mapColumns(header);
  if (map.amountRM === undefined && map.amountUSD === undefined) return null;

  const records = [];
  for (const row of sheet.rows.slice(1, limit + 1)) {
    const value = (field) => (map[field] === undefined ? null : (row[map[field]] || '').trim() || null);
    const number = (field) => {
      const v = value(field);
      if (!v) return null;
      const n = parseAmount(v.replace(/[A-Za-z$€£]/g, ''));
      return n === null ? null : n;
    };
    const rec = {
      date: normaliseSheetDate(value('date')),
      vendor: value('vendor'),
      item: value('item'),
      invoiceNo: value('invoiceNo'),
      amountRM: number('amountRM'),
      amountUSD: number('amountUSD'),
      fxRate: number('fxRate'),
      costType: value('costType'),
      card: value('card'),
      accountCode: value('accountCode'),
      project: value('project'),
      purpose: value('purpose'),
      company: value('company'),
      remark: value('remark'),
    };
    if (!rec.vendor && !rec.item) continue;
    if (rec.amountRM === null && rec.amountUSD === null) continue;
    records.push(rec);
  }
  return { columns: map, records, headerRow: header };
}

function normaliseSheetDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const found = findDates(value);
  return found.length ? found[0].value : null;
}

/* ------------------------------------------------------------- the guess */

/**
 * Work out what one uploaded file is and what should be recorded from it.
 * Returns a proposal; saving it is a separate, deliberate step.
 */
async function propose(filename, extraction, { knownVendors = [], useModel = true } = {}) {
  const base = path.basename(filename, path.extname(filename));
  const text = extraction.text || '';
  const t = flat(text);
  const notes = [];
  if (extraction.note) notes.push(extraction.note);

  /* ---- a spreadsheet is a list of things, not one thing ---- */
  if (extraction.kind === 'spreadsheet' && extraction.sheets.length) {
    const sheets = extraction.sheets.map((s) => {
      const verdict = classifySheet(s.rows);
      const finance = verdict.target === 'finance' ? rowsToFinance(s) : null;
      return {
        name: s.name,
        rowCount: s.rows.length,
        target: finance && finance.records.length ? 'finance' : verdict.target,
        confidence: verdict.confidence,
        header: s.rows[0] || [],
        sample: s.rows.slice(1, 6),
        finance: finance && finance.records.length
          ? { records: finance.records, columns: finance.columns, unmapped: unmappedColumns(s.rows[0] || [], finance.columns) }
          : null,
        rows: s.rows,
      };
    });
    const first = sheets.find((s) => s.finance) || sheets[0];
    if (!sheets.some((s) => s.finance)) {
      notes.push('No column of amounts was recognised, so this is offered as a list to import into the master list rather than as charges.');
    }
    return {
      target: first.target,
      kind: 'spreadsheet',
      confidence: first.confidence,
      sheets,
      notes,
      fields: {},
    };
  }

  /* ---- a photograph, or a scan: nothing to read ---- */
  if (!extraction.readable) {
    const asCharge = looksFinancial(base) || extraction.kind === 'image';
    return {
      target: asCharge ? 'finance' : 'document',
      kind: extraction.kind,
      confidence: 'none',
      fields: asCharge
        ? emptyFinanceFields({ vendor: vendorFromName(base, knownVendors), item: tidyName(base) })
        : { title: tidyName(base), subject: null, kindCode: 'OTH', officialNo: null },
      needsTyping: true,
      notes,
      evidence: {},
    };
  }

  /* ---- an invoice or a receipt ---- */
  if (invoiceScore(t, base) >= 4) {
    const amounts = findAmounts(t);
    const currency = pickCurrency(amounts);
    const chosen = bestAmount(amounts, currency);
    const otherCurrency = currency === 'MYR' ? 'USD' : 'MYR';
    const alt = bestAmount(amounts, otherCurrency);
    const date = invoiceDate(t);
    const invoiceNo = findInvoiceNo(t);
    const po = findPurchaseOrder(t);
    const card = (t.match(CARD_RE) || t.match(CARD_PLAIN_RE) || [])[1] || null;
    const vendor = vendorFromText(text, knownVendors) || vendorFromName(base, knownVendors);

    const fields = emptyFinanceFields({
      vendor,
      item: describedItem(text) || tidyName(base),
      invoiceNo,
      date: date ? date.value : null,
      amountRM: currency === 'MYR' && chosen ? chosen.value : (alt && alt.currency === 'MYR' ? alt.value : null),
      amountUSD: currency === 'USD' && chosen ? chosen.value : (alt && alt.currency === 'USD' ? alt.value : null),
      costType: costTypeFor(t),
      card: card ? `•••• ${card}` : null,
      purpose: null,
      remark: po ? `Purchase order ${po}` : null,
    });

    if (date && date.ambiguous) {
      notes.push(`The date on this reads ${date.value}, but it was written in a format where the day and the month could be either way round. Worth checking.`);
    }
    if (!chosen) notes.push('No amount could be picked out with any confidence — please type it in.');
    if (!invoiceNo) notes.push('No invoice number was found. If the supplier gave one, add it: it is what makes a charge traceable.');

    if (useModel) {
      const helped = await askModel(text, fields);
      if (helped) notes.push('The local model was used to suggest the supplier and what the charge was for. The numbers are read from the document itself, not from the model.');
    }

    return {
      target: 'finance',
      kind: extraction.kind,
      confidence: chosen && invoiceNo && date ? 'high' : chosen ? 'medium' : 'low',
      fields,
      notes,
      evidence: {
        amounts: amounts.slice(0, 12),
        dates: findDates(t).slice(0, 8),
        currency,
      },
    };
  }

  /* ---- everything else is a document ---- */
  const official = officialNumber(base) || officialNumber(t);
  const title = documentTitle(base, text, official);
  const head = (title + ' ' + t.slice(0, 800)).toLowerCase();

  return {
    target: 'document',
    kind: extraction.kind,
    confidence: REPORT_HINT.test(t.slice(0, 600)) ? 'medium' : 'low',
    fields: {
      title: title.length > 120 ? title.slice(0, 117) + '…' : title,
      subject: summarise(text),
      kindCode: /\b(policy|procedure|guideline|manual)\b/.test(head) ? 'POL'
        : /\breport\b/.test(head) ? 'RPT'
          : /\bmemo(randum)?\b/.test(head) ? 'MEM'
            : /\b(contract|agreement)\b/.test(head) ? 'CON'
              : /\bform\b/.test(head) ? 'FRM' : 'OTH',
      officialNo: official,
    },
    notes,
    excerpt: text.slice(0, 1200),
  };
}

/** A Scicom document number, written with or without its slashes. */
function officialNumber(text) {
  const m = String(text).match(/\bSCKL\s?\/?\s?[A-Z]{2,4}\s?\/?\s?(?:[A-Z]{2,6}\s?\/?\s?)?[A-Z]{2}\s?\/?\s?\d{3}\b/i);
  return m ? m[0].replace(/[\s/]/g, '').toUpperCase() : null;
}

/**
 * What to call the document.
 *
 * The first line of a Scicom PDF is usually its classification banner —
 * "Document Classification: Unrestricted" — which names nothing. The filename
 * is nearly always the better title, so it is used unless it says nothing
 * either.
 */
const BOILERPLATE_RE = /^(document classification|unrestricted|internal use|confidential|restricted|page \d|template version|content version|version \d)/i;

function documentTitle(base, text, official) {
  const fromName = tidyName(base)
    .replace(new RegExp('^' + (official || '____').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[-–]?\\s*', 'i'), '')
    .replace(/^SCKL[A-Z0-9]*\s*[-–]\s*/i, '')
    .replace(/\s*\(\d+\)$/, '')
    .trim();
  if (fromName.length >= 4 && /[A-Za-z]{3}/.test(fromName)) return fromName;

  for (const line of String(text).split('\n').map((l) => l.trim())) {
    if (line.length < 4 || line.length > 140) continue;
    if (BOILERPLATE_RE.test(line)) continue;
    if (/[A-Za-z]{3}/.test(line)) return line;
  }
  return tidyName(base);
}

function unmappedColumns(header, map) {
  const used = new Set(Object.values(map));
  return header.map((h, i) => (used.has(i) ? null : String(h).trim())).filter(Boolean);
}

function emptyFinanceFields(over = {}) {
  return {
    vendor: null, item: null, invoiceNo: null, date: null,
    amountRM: null, amountUSD: null, fxRate: null,
    costType: null, card: null, company: null, purpose: null,
    project: null, accountCode: null, remark: null,
    ...over,
  };
}

function looksFinancial(name) {
  return /invoice|receipt|bill|payment|statement|charge|subscription|renewal|paid|order/i.test(name);
}

function pickCurrency(amounts) {
  if (!amounts.length) return 'MYR';
  const counts = {};
  for (const a of amounts) counts[a.currency] = (counts[a.currency] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/** A supplier we already have on record, found anywhere in the text. */
function vendorFromText(text, knownVendors) {
  const t = flat(text).toLowerCase();
  const hit = knownVendors
    .filter((v) => v && v.length > 3 && t.includes(v.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  if (hit) return hit;

  // Otherwise the line above "invoice" or the first line that reads like a name.
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (line.length < 3 || line.length > 60) continue;
    if (/invoice|receipt|tax|statement|page \d/i.test(line)) continue;
    if (/^[\d\W]+$/.test(line)) continue;
    return line;
  }
  return null;
}

function vendorFromName(base, knownVendors) {
  const cleaned = tidyName(base);
  const hit = knownVendors.find((v) => v && cleaned.toLowerCase().includes(v.toLowerCase()));
  return hit || null;
}

function tidyName(base) {
  return String(base).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * What was actually bought. The first line of an invoice is the supplier's own
 * name, so a line that names a product is preferred where there is one.
 */
const ITEM_LINE_RE = /\b(subscription|plan|licen[cs]e|seats?|credits?|service|support|renewal|membership|hosting|api|usage)\b/i;

function describedItem(text) {
  const lines = String(text).split('\n').map((l) => l.trim())
    .filter((l) => l.length >= 4 && l.length <= 120);
  const named = lines.find((l) => ITEM_LINE_RE.test(l) && !/^(total|subtotal|amount|invoice|bill)/i.test(l));
  return named || firstMeaningfulLine(text);
}

function firstMeaningfulLine(text) {
  for (const line of String(text).split('\n').map((l) => l.trim())) {
    if (line.length >= 4 && line.length <= 140 && /[A-Za-z]{3}/.test(line)) return line;
  }
  return null;
}

function summarise(text) {
  const flatText = flat(text);
  if (flatText.length <= 240) return flatText;
  const cut = flatText.slice(0, 240);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

/**
 * Ask the local model for the two things it is genuinely better at than a
 * pattern: what the supplier is called, and what the charge was for. It is
 * asked only to fill blanks, never to overrule a figure read off the page.
 */
async function askModel(text, fields) {
  const s = await llm.check();
  if (!s.available) return false;

  const prompt = `Below is the text of an invoice or receipt.\n\n`
    + `Reply with exactly two lines and nothing else:\n`
    + `SUPPLIER: the company being paid\n`
    + `FOR: what was bought, in under twelve words\n\n`
    + `Write "unknown" if it is not stated. Do not guess amounts or dates.\n\n`
    + `---\n${String(text).slice(0, 4000)}\n---`;

  const reply = await llm.generate(prompt, {
    system: 'You read invoices and answer in the exact format asked for. You never invent details.',
    temperature: 0,
    maxTokens: 120,
  });
  if (!reply) return false;

  const supplier = (reply.match(/SUPPLIER\s*:\s*(.+)/i) || [])[1];
  const forWhat = (reply.match(/FOR\s*:\s*(.+)/i) || [])[1];
  const usable = (v) => v && !/^unknown$/i.test(v.trim()) && v.trim().length < 90;

  let used = false;
  if (!fields.vendor && usable(supplier)) { fields.vendor = supplier.trim(); used = true; }
  if (usable(forWhat)) { fields.purpose = forWhat.trim().replace(/[.]$/, ''); used = true; }
  return used;
}

module.exports = {
  propose, findDates, findAmounts, invoiceDate, bestAmount, findInvoiceNo, invoiceScore,
  classifySheet, mapColumns, rowsToFinance, flat,
};
