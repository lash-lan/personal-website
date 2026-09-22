'use strict';
/**
 * rules.js — the Hard Rules chatbot.
 *
 * Hard Rules are the standing instructions the system holds you to: things
 * like "every task must have a deadline". You change them by talking:
 *
 *   add rule: every purchase over RM 5000 needs two approvers
 *   for finance add rule: always record the card used
 *   change rule 3 to: ...
 *   remove rule 4
 *   show rules for governance
 *
 * The chatbot understands these without needing any AI. Where a local model is
 * available it is used only to tighten the wording, never to decide anything.
 */

const store = require('./store');
const ids = require('./ids');
const llm = require('./llm');
const seed = require('./seed');

function all() {
  return store.read('rules', () =>
    seed.RULES.map((r) => ({ ...r, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })));
}

function save(list) {
  return store.write('rules', list);
}

function inScope(rule, scope) {
  if (!scope || scope === 'all') return true;
  return rule.scope === scope;
}

function listFor(scope) {
  return all().filter((r) => inScope(r, scope));
}

/** Work out which workstream a phrase like "for finance" is pointing at. */
function resolveScope(phrase, workstreams) {
  if (!phrase) return null;
  const p = phrase.toLowerCase().trim().replace(/^the\s+/, '');
  if (/^(global|all|every|everything|everywhere)$/.test(p)) return 'global';
  for (const ws of workstreams) {
    const name = ws.name.toLowerCase();
    if (p === ws.id || p === ws.code.toLowerCase() || p === name) return ws.id;
    if (name.includes(p) && p.length >= 3) return ws.id;
    if (p.includes(ws.id.split('-')[0]) && ws.id.split('-')[0].length >= 4) return ws.id;
  }
  return null;
}

function scopeLabel(scope, workstreams) {
  if (scope === 'global') return 'all workstreams';
  const ws = workstreams.find((w) => w.id === scope);
  return ws ? ws.name : scope;
}

/** First sentence, trimmed, used as a short title. */
function titleFrom(text) {
  const first = String(text).split(/(?<=[.!?])\s/)[0] || String(text);
  const words = first.trim().replace(/[.]+$/, '').split(/\s+/);
  return words.slice(0, 9).join(' ') + (words.length > 9 ? '…' : '');
}

/**
 * Read one message from the user and decide what it is asking for.
 * Returns { intent, ... } — no data is changed here.
 */
function parse(message, workstreams) {
  const raw = String(message || '').trim();
  const text = raw.replace(/\s+/g, ' ');
  const lower = text.toLowerCase();

  if (!text) return { intent: 'empty' };

  if (/^(help|what can you do|\?|commands)$/i.test(lower)) return { intent: 'help' };

  // show / list
  let m = lower.match(/^(?:show|list|what are|view)(?: me)?(?: the)?\s+(?:hard\s+)?rules?(?:\s+(?:for|in|on)\s+(.+?))?[?.]?$/);
  if (m) return { intent: 'list', scope: resolveScope(m[1], workstreams) || (m[1] ? 'unknown' : null), scopePhrase: m[1] };

  // remove rule N
  m = text.match(/^(?:remove|delete|drop|scrap|get rid of)\s+(?:hard\s+)?rule\s*#?\s*(\d+)/i);
  if (m) return { intent: 'remove', index: Number(m[1]) };

  // change rule N to ...   ("to", "to:", "so that", ":" and "-" all accepted)
  m = text.match(/^(?:change|update|edit|amend|revise|reword)\s+(?:hard\s+)?rule\s*#?\s*(\d+)\s*(?:to\b|so that\b)?\s*[:\-]?\s*(.+)$/i);
  if (m && m[2].trim()) return { intent: 'replace', index: Number(m[1]), text: m[2].trim() };

  // move rule N to <scope>
  m = text.match(/^(?:move|reassign)\s+(?:hard\s+)?rule\s*#?\s*(\d+)\s+to\s+(.+)$/i);
  if (m) {
    const scope = resolveScope(m[2], workstreams);
    return scope
      ? { intent: 'move', index: Number(m[1]), scope }
      : { intent: 'unknown-scope', scopePhrase: m[2] };
  }

  // [for <scope>,] add rule: ...
  m = text.match(/^(?:(?:for|under|in)\s+(.+?)[,:]?\s+)?(?:add|create|new|set)\s+(?:a\s+)?(?:hard\s+)?rule\s*[:\-]?\s*(.+)$/i);
  if (m && m[2].trim()) {
    const scopePhrase = m[1];
    const scope = scopePhrase ? resolveScope(scopePhrase, workstreams) : 'global';
    if (scopePhrase && !scope) return { intent: 'unknown-scope', scopePhrase };
    return { intent: 'add', scope: scope || 'global', text: m[2].trim() };
  }

  // add rule ... for <scope>  (scope at the end)
  m = text.match(/^(?:add|create|new|set)\s+(?:a\s+)?(?:hard\s+)?rule\s*[:\-]?\s*(.+?)\s+(?:for|under|in)\s+(?:the\s+)?([a-z /&-]+?)(?:\s+workstream)?[.]?$/i);
  if (m) {
    const scope = resolveScope(m[2], workstreams);
    if (scope) return { intent: 'add', scope, text: m[1].trim() };
  }

  // A bare "rule: ..." also counts.
  m = text.match(/^(?:hard\s+)?rule\s*[:\-]\s*(.+)$/i);
  if (m) return { intent: 'add', scope: 'global', text: m[1].trim() };

  return { intent: 'unclear', text };
}

/**
 * Carry out a parsed instruction. This is the only place rules are changed.
 *
 * Rule numbers ALWAYS mean positions in the full list, which is the list shown
 * on screen. Filtering a listing to one workstream does not renumber anything,
 * because "change rule 3" meaning two different rules depending on what you
 * last asked to see is exactly how the wrong rule gets edited.
 */
async function apply(parsed, { workstreams }) {
  const now = new Date().toISOString();
  const list = all();

  const say = (reply, extra = {}) => ({ reply, rules: all(), ...extra });
  const pick = (index) => list[index - 1];

  switch (parsed.intent) {
    case 'empty':
      return say('Type an instruction, for example: add rule: every invoice must name the card used.');

    case 'help':
      return say(
        'You can tell me things like:\n' +
        '• add rule: every purchase over RM 5,000 needs two approvers\n' +
        '• for finance add rule: always record which card was used\n' +
        '• change rule 3 to: deadlines are set in working days, not calendar days\n' +
        '• move rule 2 to governance\n' +
        '• remove rule 4\n' +
        '• show rules for finance\n\n' +
        'Rules numbered here match the numbers shown in the list on screen.');

    case 'list': {
      if (parsed.scope === 'unknown') {
        return say(`I could not tell which workstream "${parsed.scopePhrase}" means. The workstreams are: ${workstreams.map((w) => w.name).join(', ')}.`);
      }
      // Number every rule by its position in the full list, so the numbers
      // here always match the numbers on screen even when the listing is
      // filtered to one workstream.
      const chosen = list
        .map((r, i) => ({ r, n: i + 1 }))
        .filter(({ r }) => inScope(r, parsed.scope));
      if (!chosen.length) {
        return say(parsed.scope
          ? `There are no rules set for ${scopeLabel(parsed.scope, workstreams)} yet.`
          : 'There are no hard rules yet. Add one with: add rule: …');
      }
      const lines = chosen.map(({ r, n }) => `${n}. [${scopeLabel(r.scope, workstreams)}] ${r.text}`);
      return say(`${chosen.length} rule${chosen.length === 1 ? '' : 's'}:\n${lines.join('\n')}`
        + (parsed.scope ? '\n\n(The numbers are their positions in the full list on screen.)' : ''));
    }

    case 'unknown-scope':
      return say(`I could not tell which workstream "${parsed.scopePhrase}" means. Try one of: ${workstreams.map((w) => w.name).join(', ')}, or say "global" for a rule that applies everywhere.`);

    case 'add': {
      const polished = await llm.polish(parsed.text, { field: 'Hard rule', formName: 'standing rules', maxWords: 60 });
      const rule = {
        id: ids.uid('rule'),
        scope: parsed.scope,
        title: titleFrom(polished.text || parsed.text),
        text: polished.text || llm.tidy(parsed.text),
        original: parsed.text,
        createdAt: now,
        updatedAt: now,
        source: 'chat',
      };
      list.push(rule);
      save(list);
      return say(
        `Added, applying to ${scopeLabel(rule.scope, workstreams)}:\n\n“${rule.text}”` +
        (polished.usedModel ? '\n\n(Wording tightened by the local model. Your original is kept.)' : ''),
        { changed: 'add', ruleId: rule.id });
    }

    case 'replace': {
      const target = pick(parsed.index);
      if (!target) return say(`There is no rule ${parsed.index}. There ${list.length === 1 ? 'is 1 rule' : `are ${list.length} rules`}.`);
      const idx = parsed.index - 1;
      const before = list[idx].text;
      const polished = await llm.polish(parsed.text, { field: 'Hard rule', formName: 'standing rules', maxWords: 60 });
      list[idx] = {
        ...list[idx],
        text: polished.text || llm.tidy(parsed.text),
        title: titleFrom(polished.text || parsed.text),
        original: parsed.text,
        updatedAt: now,
        source: 'chat',
      };
      save(list);
      return say(`Rule ${parsed.index} changed.\n\nWas: “${before}”\nNow: “${list[idx].text}”`, { changed: 'replace', ruleId: list[idx].id });
    }

    case 'move': {
      const target = pick(parsed.index);
      if (!target) return say(`There is no rule ${parsed.index}. There ${list.length === 1 ? 'is 1 rule' : `are ${list.length} rules`}.`);
      const idx = parsed.index - 1;
      const was = scopeLabel(list[idx].scope, workstreams);
      list[idx] = { ...list[idx], scope: parsed.scope, updatedAt: now };
      save(list);
      return say(`Rule ${parsed.index} moved from ${was} to ${scopeLabel(parsed.scope, workstreams)}.`, { changed: 'move', ruleId: list[idx].id });
    }

    case 'remove': {
      const target = pick(parsed.index);
      if (!target) return say(`There is no rule ${parsed.index}. There ${list.length === 1 ? 'is 1 rule' : `are ${list.length} rules`}.`);
      const [gone] = list.splice(parsed.index - 1, 1);
      save(list);
      return say(`Removed rule ${parsed.index}: “${gone.text}”`, { changed: 'remove', ruleId: gone.id });
    }

    default:
      return say(
        'I did not follow that. I only change rules when the instruction is unmistakable, so nothing has been changed.\n\n' +
        'Try: add rule: ' + (parsed.text ? parsed.text.replace(/^rule\s*/i, '') : 'your rule here') +
        '\nOr type help to see everything I understand.');
  }
}

module.exports = { all, listFor, parse, apply, scopeLabel, resolveScope };
