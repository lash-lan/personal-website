// The browser side of the plan: fetch everything once, keep it in memory,
// save changes straight away, and redraw the page whenever something changes.

import { analyse, today } from './engine.js';

let state = null;
let draw = () => {};

export const $ = (sel, root = document) => root.querySelector(sel);

/**
 * Build an element. Text is always inserted as text, never as markup, so
 * nothing typed into the plan can turn into HTML.
 *   h('div', { class: 'x', onclick: fn }, 'text', child)
 */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val;
      }
    }
    else if (k === 'html') continue;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/** Small SVG helper for rings and charts. */
export function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, v);
  for (const kid of kids.flat(Infinity)) if (kid) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}

export const chip = (label, tone = 'grey') => h('span', { class: `chip ${tone}` }, label);

/**
 * A dropdown. `options` may be strings or { value, label }.
 * `onpick` runs with the chosen value as soon as it changes.
 */
export function pick(options, value, onpick, attrs = {}) {
  const sel = h('select', { ...attrs, onchange: (e) => onpick(e.target.value) });
  if (attrs.placeholder) sel.append(h('option', { value: '' }, attrs.placeholder));
  for (const o of options) {
    const v = typeof o === 'object' ? String(o.value) : String(o);
    const label = typeof o === 'object' ? o.label : o;
    const opt = h('option', { value: v }, label);
    if (String(value ?? '') === v) opt.selected = true;
    sel.append(opt);
  }
  return sel;
}

/** A row of big tap buttons — quicker than a dropdown when there are 2–4 choices. */
export function segmented(options, value, onpick, cls = '') {
  return h('div', { class: `seg ${cls}` }, options.map((o) => {
    const v = typeof o === 'object' ? o.value : o;
    const label = typeof o === 'object' ? o.label : o;
    return h('button', {
      type: 'button', class: `seg-btn ${String(value) === String(v) ? 'on' : ''} ${o.tone ?? ''}`,
      onclick: () => onpick(String(value) === String(v) && o.toggle ? '' : v),
      title: o.title,
    }, label);
  }));
}

export function toast(msg, tone = 'ok') {
  let box = $('#toast');
  if (!box) { box = h('div', { id: 'toast', role: 'status' }); document.body.append(box); }
  box.textContent = msg;
  box.className = `show ${tone}`;
  clearTimeout(box._t);
  box._t = setTimeout(() => (box.className = ''), tone === 'bad' ? 5000 : 1800);
}

async function post(body) {
  const res = await fetch('/api/plan/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (res.status === 401) { location.reload(); throw new Error('Signed out.'); }
  if (!res.ok) throw new Error(out.error || `Could not save (${res.status}).`);
  return out;
}

/** Save one record. The page updates at once; the database catches up. */
export async function save(collection, record, quiet = false) {
  const list = state[collection];
  const i = list.findIndex((r) => r.id === record.id);
  const before = i >= 0 ? list[i] : null;
  if (i >= 0) list[i] = record; else list.push(record);
  redraw();
  try {
    const { record: saved } = await post({ collection, id: record.id, data: record });
    const j = state[collection].findIndex((r) => r.id === record.id);
    if (j >= 0) state[collection][j] = saved;
    if (!quiet) toast('Saved ✓');
  } catch (err) {
    if (before) state[collection][state[collection].findIndex((r) => r.id === record.id)] = before;
    else state[collection] = state[collection].filter((r) => r.id !== record.id);
    redraw();
    toast(`Not saved: ${err.message}`, 'bad');
  }
}

/** Change a few fields on an existing record. */
export const patch = (collection, id, fields, quiet) => {
  const cur = state[collection].find((r) => r.id === id) ?? { id };
  return save(collection, { ...cur, ...fields, id }, quiet);
};

export async function remove(collection, id) {
  const before = state[collection];
  state[collection] = before.filter((r) => r.id !== id);
  redraw();
  try {
    await post({ collection, id, delete: true });
    toast('Deleted');
  } catch (err) {
    state[collection] = before;
    redraw();
    toast(`Not deleted: ${err.message}`, 'bad');
  }
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

let lastDay = today();
/** Redraw after changing something that only lives on screen (an open panel, a filter). */
export const refresh = () => redraw();

function redraw() {
  const app = $('#app');
  if (!app || !state) return;
  const scroll = window.scrollY;
  const focusKey = document.activeElement?.dataset?.key;
  const view = draw(analyse(state), state);
  app.replaceChildren(...[view].flat(Infinity).filter((n) => n instanceof Node));
  if (focusKey) $(`[data-key="${CSS.escape(focusKey)}"]`)?.focus();
  window.scrollTo(0, scroll);
}

/** Start a page: load the plan, then draw with `render(analysis, rawState)`. */
export async function boot(render) {
  draw = render;
  const app = $('#app');
  try {
    const res = await fetch('/api/plan/data', { cache: 'no-store' });
    if (res.status === 401) { location.reload(); return; }
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'Could not load the plan.');
    state = out.collections;
    redraw();
  } catch (err) {
    app.replaceChildren(h('div', { class: 'card empty' }, h('strong', {}, 'The plan could not be loaded.'), err.message));
    return;
  }
  // The plan is about days passing: redraw at midnight, and when you come back to the tab.
  setInterval(() => { if (today() !== lastDay) { lastDay = today(); redraw(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && today() !== lastDay) { lastDay = today(); redraw(); } });
}
