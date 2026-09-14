// Pieces used on more than one page: rings, bars, task rows, the money form,
// the habit buttons and the road map.

import { h, svg, chip, pick, segmented, patch, save, newId, toast, refresh } from './client.js';
import { PILLARS, STATUSES, PERCENTS, LINE_ITEMS, PAY_FROM, HABITS, PHASES, PLAN_START, PLAN_END, LAUNCH } from './seed.js';
import { FLAG, fmtDay, daysBetween, rm } from './engine.js';

export const pillarColour = (id) => PILLARS.find((p) => p.id === id)?.colour ?? '#8c929d';
export const pillarIcon = (id) => PILLARS.find((p) => p.id === id)?.icon ?? '•';
const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

export function ring(value, size = 64, stroke = 7, colour = '#e3b341', centre = null) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp01(value);
  return h('div', { class: 'ring', style: { width: `${size}px`, height: `${size}px` } },
    svg('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true' },
      svg('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', 'stroke-width': stroke, style: 'stroke:rgba(255,255,255,0.08)' }),
      svg('circle', {
        cx: size / 2, cy: size / 2, r, fill: 'none', 'stroke-width': stroke, 'stroke-linecap': 'round',
        'stroke-dasharray': `${c * v} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})`, style: `stroke:${colour}`,
      })),
    centre && h('div', { class: 'ring-centre' }, centre));
}

export const bar = (fraction, tone = '', cls = '') =>
  h('div', { class: `bar ${tone} ${cls}` }, h('span', { style: { width: `${clamp01(fraction) * 100}%` } }));

export const flagChip = (flag) => chip(FLAG[flag].label, FLAG[flag].tone);

export function dueText(t, now) {
  if (t.status === 'Done') return `Finished · was due ${fmtDay(t.end)}`;
  const d = daysBetween(now, t.end);
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} overdue`;
  if (t.start > now) return `Starts ${fmtDay(t.start)}`;
  if (d === 0) return 'Due today';
  return `Due ${fmtDay(t.end)} · ${d} day${d === 1 ? '' : 's'} left`;
}

/** Change a task. The "last updated" date is stamped for you. */
export function updateTask(t, fields, now) {
  const next = { ...fields, updated: now };
  if (fields.status === 'Done') next.pct = 100;
  if (fields.status && fields.status !== 'Done' && Number(t.pct) === 100) next.pct = 90;
  if (fields.status === 'In progress' && !Number(t.pct)) next.pct = 10;
  if (fields.pct !== undefined) {
    next.pct = Number(fields.pct);
    if (next.pct === 100) next.status = 'Done';
    else if (t.status === 'Done' || (next.pct > 0 && t.status === 'Not started')) next.status = 'In progress';
  }
  return patch('tasks', t.id, next);
}

export const statusPick = (t, now) =>
  pick(STATUSES, t.status, (v) => updateTask(t, { status: v }, now), { class: `status s-${t.status.replace(/\s/g, '')}`, 'aria-label': 'Status' });

export const pctPick = (t, now) =>
  pick(PERCENTS.map((p) => ({ value: p, label: `${p}%` })), PERCENTS.includes(Number(t.pct)) ? Number(t.pct) : 0,
    (v) => updateTask(t, { pct: Number(v) }, now), { class: 'pct', 'aria-label': 'Percent done' });

export function taskRow(t, now, onopen) {
  return h('div', { class: `task t-${t.flag}`, style: { '--pc': pillarColour(t.pillar) } },
    h('div', { class: 'task-main', onclick: onopen, role: onopen ? 'button' : null, tabindex: onopen ? '0' : null },
      h('div', { class: 'task-title' }, t.critical ? h('span', { class: 'crit', title: 'Launch-critical' }, '★ ') : null, t.task),
      h('div', { class: 'task-meta' },
        h('span', {}, `${pillarIcon(t.pillar)} ${t.pillar}`),
        h('span', { class: t.flag === 'overdue' ? 'redtext' : '' }, dueText(t, now)),
        flagChip(t.flag))),
    h('div', { class: 'task-ctl' }, statusPick(t, now), pctPick(t, now)));
}

export function spendBar(label, actual, plan) {
  const f = plan ? actual / plan : actual > 0 ? 1.01 : 0;
  const tone = f > 1 ? 'red' : f > 0.85 ? 'amber' : 'blue';
  return h('div', { class: 'spend' },
    h('div', { class: 'spread small' }, h('span', {}, label),
      h('span', {}, h('b', { class: f > 1 ? 'redtext' : '' }, rm(actual)), h('span', { class: 'dim' }, ` / ${rm(plan)}`))),
    bar(f, tone));
}

export function savingsMeter(amount, s) {
  const top = s.savExcellent * 1.15;
  const at = (v) => `${Math.min(100, (v / top) * 100)}%`;
  const tone = amount >= s.savTarget ? 'green' : amount >= s.savMin ? 'amber' : 'red';
  return h('div', { class: 'meter' },
    h('div', { class: `bar tall ${tone}` }, h('span', { style: { width: at(amount) } })),
    h('div', { class: 'meter-ticks' },
      h('span', { style: { left: at(s.savMin) } }, `${rm(s.savMin)} min`),
      h('span', { style: { left: at(s.savTarget) } }, `${rm(s.savTarget)} target`),
      h('span', { style: { left: at(s.savExcellent) } }, `${rm(s.savExcellent)}+`)));
}

/** The quick "log money" form. `draft` keeps what you typed if the page redraws. */
export function moneyForm(draft, now, onDone) {
  draft.date ??= now;
  draft.account ??= 'Maybank';
  const groups = [['Money in', 'Income'], ['Spending', 'Expense'], ['Saving into a fund', 'Fund Add'], ['Paying from a fund', 'Fund Spend']];
  const item = h('select', { onchange: (e) => { draft.item = e.target.value; } },
    h('option', { value: '' }, 'Pick what it was…'),
    groups.map(([label, cat]) => {
      const g = h('optgroup', { label });
      for (const li of LINE_ITEMS.filter((l) => l.category === cat)) {
        const o = h('option', { value: li.name }, li.name);
        if (draft.item === li.name) o.selected = true;
        g.append(o);
      }
      return g;
    }));

  const submit = () => {
    const amount = Number(draft.amount);
    if (!draft.item) return toast('Pick what it was first.', 'bad');
    if (!(amount > 0)) return toast('Type an amount above zero.', 'bad');
    const record = { id: newId(), date: draft.date || now, item: draft.item, amount: Math.round(amount * 100) / 100,
      account: draft.account, remarks: draft.remarks ?? '' };
    draft.amount = ''; draft.remarks = ''; draft.item = '';
    onDone?.();
    save('transactions', record);
  };

  return h('form', { class: 'form moneyform', onsubmit: (e) => { e.preventDefault(); submit(); } },
    h('label', { class: 'field' }, 'Date', h('input', { type: 'date', value: draft.date, onchange: (e) => { draft.date = e.target.value; } })),
    h('label', { class: 'field' }, 'What was it?', item),
    h('label', { class: 'field' }, 'Amount (RM)', h('input', { type: 'number', inputmode: 'decimal', min: '0', step: '0.01', placeholder: '0.00',
      value: draft.amount ?? '', oninput: (e) => { draft.amount = e.target.value; } })),
    h('label', { class: 'field' }, 'Paid from / into', pick(PAY_FROM, draft.account, (v) => { draft.account = v; })),
    h('label', { class: 'field wide' }, 'Note (optional)', h('input', { type: 'text', value: draft.remarks ?? '', placeholder: 'e.g. Lunch at the mamak',
      oninput: (e) => { draft.remarks = e.target.value; } })),
    h('div', { class: 'row wide' },
      h('button', { class: 'btn primary', type: 'submit' }, 'Save'),
      onDone ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { onDone(); refresh(); } }, 'Cancel') : null));
}

/** Done / Missed / Rest for each habit on one day. Tap again to clear. */
export function habitGrid(date, rec) {
  const marks = rec?.marks ?? {};
  const set = (id, v) => patch('daily', date, { marks: { ...marks, [id]: v } }, true);
  return h('div', { class: 'habits' }, HABITS.map((hb) =>
    h('div', { class: `habit m-${marks[hb.id] || 'none'}` },
      h('div', { class: 'habit-name' },
        h('span', { class: 'habit-icon' }, hb.icon),
        h('div', {}, h('strong', {}, hb.name), h('small', {}, hb.target))),
      segmented([
        { value: 'yes', label: '✓ Done', tone: 'green', toggle: true },
        { value: 'no', label: '✗ Missed', tone: 'red', toggle: true },
        { value: 'rest', label: 'Rest', tone: 'grey', toggle: true, title: 'Rest day, e.g. back recovery. Does not count against you.' },
      ], marks[hb.id] ?? '', (v) => set(hb.id, v)))));
}

const PHASE_COLOURS = ['#6aa8ff', '#b48ef0', '#f2b04b', '#f06b6b', '#56cf8a', '#9aa1ad'];
export const phaseColour = (id) => PHASE_COLOURS[PHASES.findIndex((p) => p.id === id)] ?? '#9aa1ad';

/** 14 Sep → 31 Dec as one strip: phases, gates, and where today is. */
export function roadmap(a) {
  const span = a.planLength;
  const x = (d) => Math.max(0, Math.min(100, (daysBetween(PLAN_START, d) / span) * 100));
  const w = (s, e) => ((daysBetween(s, e) + 1) / span) * 100;
  const inPlan = a.now >= PLAN_START && a.now <= PLAN_END;
  return h('div', { class: 'road' },
    h('div', { class: 'road-months' }, [['2026-09-14', 'Sep'], ['2026-10-01', 'Oct'], ['2026-11-01', 'Nov'], ['2026-12-01', 'Dec']]
      .map(([d, m]) => h('span', { style: { left: `${x(d)}%` } }, m))),
    h('div', { class: 'road-bands' }, PHASES.map((p) =>
      h('div', { class: `band ${a.phase?.id === p.id ? 'now' : ''} ${p.end < a.now ? 'past' : ''}`,
        style: { left: `${x(p.start)}%`, width: `${w(p.start, p.end)}%`, '--c': phaseColour(p.id) }, title: `${p.name}: ${fmtDay(p.start)} – ${fmtDay(p.end)}` },
      h('span', {}, p.name)))),
    inPlan ? h('div', { class: 'road-fill', style: { width: `${x(a.now) + 100 / span}%` } }) : null,
    h('div', { class: 'road-gates' }, a.gates.map((g) =>
      h('div', { class: `pin ${g.status.tone} ${g.gateDate === LAUNCH ? 'launch' : ''}`,
        style: { left: `${x(g.gateDate) + 100 / span}%` }, title: `${g.gate} · ${fmtDay(g.gateDate)} · ${g.status.label}` },
      h('i', {}), h('span', {}, g.gateDate === LAUNCH ? `🚀 ${fmtDay(g.gateDate)}` : fmtDay(g.gateDate))))),
    inPlan ? h('div', { class: 'road-today', style: { left: `${x(a.now) + 50 / span}%` } }, h('span', {}, 'Today')) : null);
}

export const empty = (title, text) => h('div', { class: 'empty' }, h('strong', {}, title), text);
