'use strict';
/**
 * llm.js — the optional local AI.
 *
 * The system is built to work with no AI at all. If Ollama happens to be
 * running on this computer (http://127.0.0.1:11434), we use it to tidy up
 * wording. If it is not running, every function here quietly falls back to a
 * plain rule-based tidy-up and nothing breaks.
 *
 * Nothing is ever sent over the internet. Ollama runs entirely on the machine.
 */

const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const PREFERRED = (process.env.OLLAMA_MODEL || '').trim();
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 20000);

// Models we would pick automatically, best first. All are small enough to run
// comfortably on a laptop.
const WISHLIST = ['llama3.2', 'llama3.1', 'qwen2.5', 'mistral', 'phi3', 'gemma2'];

let status = { checked: 0, available: false, model: null, models: [], error: null };
const CHECK_EVERY_MS = 30000;

async function fetchJson(url, options = {}, timeout = 4000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Is a local model available right now? Cached for half a minute. */
async function check(force = false) {
  if (!force && Date.now() - status.checked < CHECK_EVERY_MS) return status;
  status.checked = Date.now();
  try {
    const data = await fetchJson(`${OLLAMA}/api/tags`);
    const models = (data.models || []).map((m) => m.name);
    let chosen = null;
    if (PREFERRED && models.some((m) => m === PREFERRED || m.startsWith(PREFERRED + ':'))) {
      chosen = models.find((m) => m === PREFERRED || m.startsWith(PREFERRED + ':'));
    } else {
      for (const want of WISHLIST) {
        const hit = models.find((m) => m === want || m.startsWith(want + ':'));
        if (hit) { chosen = hit; break; }
      }
      if (!chosen && models.length) chosen = models[0];
    }
    status = { checked: Date.now(), available: Boolean(chosen), model: chosen, models, error: null };
  } catch (err) {
    status = { checked: Date.now(), available: false, model: null, models: [], error: String(err.message || err) };
  }
  return status;
}

/** Ask the local model. Returns null if there is no model or it fails. */
async function generate(prompt, { system, temperature = 0.2, maxTokens = 600 } = {}) {
  const s = await check();
  if (!s.available) return null;
  try {
    const data = await fetchJson(`${OLLAMA}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: s.model,
        prompt,
        system,
        stream: false,
        options: { temperature, num_predict: maxTokens },
      }),
    }, TIMEOUT_MS);
    const text = (data.response || '').trim();
    return text || null;
  } catch (err) {
    status.error = String(err.message || err);
    return null;
  }
}

/* ------------------------------------------------- rule-based fallbacks */

/**
 * Only expansions that cannot be mistaken for something else.
 *
 * Single letters are deliberately absent. "w" for "with" and "r" for "are"
 * look harmless until a form says "R&D" or "P&L", which split into single
 * letters at a word boundary and come out as "are&D".
 */
const ABBREVIATIONS = {
  asap: 'as soon as possible',
  approx: 'approximately',
  info: 'information',
  mgmt: 'management',
  dept: 'department',
  pls: 'please',
  plz: 'please',
  thx: 'thanks',
  fyi: 'for your information',
  eta: 'estimated time of arrival',
};

// Currencies and units that should always be capitals, including when they are
// written straight against a number: "rm9k" -> "RM9k".
const UPPERCASE_RE = /\b(rm|usd|myr|sgd|gbp|eur|gpu|cpu|ram|api|llm|ict|hr|isms|sop|po|pr)\b/gi;

/**
 * Tidy free text without any AI: fix spacing, capitalise sentences, expand a
 * handful of abbreviations, and make sure it ends with a full stop.
 */
function tidy(text) {
  if (!text) return '';
  let t = String(text).replace(/\s+/g, ' ').trim();

  // Expand only the abbreviations above, and only whole words.
  t = t.replace(/[A-Za-z]{2,}/g, (m) => {
    const k = m.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ABBREVIATIONS, k) ? ABBREVIATIONS[k] : m;
  });

  // Currencies and common acronyms in capitals, even against a number.
  t = t.replace(UPPERCASE_RE, (m) => m.toUpperCase());
  t = t.replace(/\b(rm|usd|myr)(?=\d)/gi, (m) => m.toUpperCase());

  // Tidy the spacing around punctuation without breaking decimals or times.
  t = t.replace(/\s+([,.;:!?])/g, '$1');
  // A colon between digits is a time (09:30) or a ratio, so leave those alone.
  t = t.replace(/([,;!?])(?=[^\s])/g, '$1 ');
  t = t.replace(/(?<!\d):(?=[^\s\d])/g, ': ');
  t = t.replace(/\.(?=[A-Za-z])/g, '. ');

  // Capitalise the first letter of each sentence.
  t = t.replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());
  if (t && !/[.!?]$/.test(t)) t += '.';
  return t;
}

/**
 * Turn a short scribbled answer into clean, formal wording for a form field.
 * Uses the local model where one exists; otherwise falls back to `tidy`.
 */
async function polish(text, { field, formName, maxWords = 90 } = {}) {
  const plain = tidy(text);
  if (!plain) return { text: '', usedModel: false };
  const s = await check();
  if (!s.available) return { text: plain, usedModel: false };

  const out = await generate(
    `Field: ${field || 'Details'}\nForm: ${formName || 'internal form'}\nWhat the person wrote: "${text}"\n\nRewrite it now.`,
    {
      system:
        'You rewrite short notes into clear, formal English for a corporate form. ' +
        'Rules: keep every fact, invent nothing, add no new details, names, dates or numbers. ' +
        `Keep it under ${maxWords} words. Use plain professional English, no jargon, no bullet points, ` +
        'no preamble and no quotation marks. Reply with the rewritten text only.',
      temperature: 0.15,
      maxTokens: Math.ceil(maxWords * 2),
    });

  if (!out) return { text: plain, usedModel: false };
  const cleaned = out.replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ' ').trim();
  // Guard against a model that ignores instructions and rambles.
  if (!cleaned || cleaned.split(/\s+/).length > maxWords * 2) {
    return { text: plain, usedModel: false };
  }
  return { text: cleaned, usedModel: true };
}

module.exports = { check, generate, polish, tidy, OLLAMA };
