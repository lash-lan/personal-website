import { h, chip, pick, segmented, patch, save, remove, refresh, toast } from './client.js';
import { PILLARS, TYPES, STATUSES, PHASES, PLAN_START, PLAN_END, LAUNCH } from './seed.js';
import { FLAG, fmtDay, daysBetween, pct } from './engine.js';
import { ring, bar, taskRow, statusPick, pctPick, updateTask, flagChip, dueText, pillarColour, pillarIcon, phaseColour, roadmap, empty } from './ui.js';

// ─── Plan & Gantt ───
const g = { mode: 'timeline', pillar: '', show: '', open: null, adding: false, draft: {}, init: false };

const SHOW = [
  { value: '', label: 'All tasks' },
  { value: 'attention', label: '⚠ Needs attention' },
  { value: 'active', label: 'Active now' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'late', label: 'Late start' },
  { value: 'stale', label: 'Needs update' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'critical', label: '★ Launch-critical' },
  { value: 'done', label: 'Done' },
  { value: 'backlog', label: 'Backlog (after launch)' },
];

function matches(t, now) {
  if (g.pillar && t.pillar !== g.pillar) return false;
  switch (g.show) {
    case '': return true;
    case 'attention': return ['overdue', 'late', 'stale', 'blocked'].includes(t.flag);
    case 'active': return t.start <= now && t.end >= now && t.status !== 'Done';
    case 'critical': return t.critical;
    case 'backlog': return t.type === 'Backlog';
    default: return t.flag === g.show;
  }
}

function editor(t, now) {
  const custom = t.id.startsWith('N-');
  const set = (fields) => patch('tasks', t.id, { ...fields, updated: now });
  return h('div', { class: 'editor' },
    h('div', { class: 'form' },
      h('label', { class: 'field' }, 'Status', statusPick(t, now)),
      h('label', { class: 'field' }, 'How far along', pctPick(t, now)),
      h('label', { class: 'field' }, 'Start', h('input', { type: 'date', value: t.start, min: PLAN_START, max: PLAN_END,
        onchange: (e) => e.target.value && (e.target.value <= t.end ? set({ start: e.target.value }) : toast('Start must be before the end date.', 'bad')) })),
      h('label', { class: 'field' }, 'End', h('input', { type: 'date', value: t.end, min: PLAN_START, max: PLAN_END,
        onchange: (e) => e.target.value && (e.target.value >= t.start ? set({ end: e.target.value }) : toast('End must be after the start date.', 'bad')) })),
      h('label', { class: 'field' }, 'Launch-critical?', pick([{ value: 'yes', label: '★ Yes' }, { value: 'no', label: 'No' }], t.critical ? 'yes' : 'no', (v) => set({ critical: v === 'yes' }))),
      h('label', { class: 'field' }, 'Kind', pick(TYPES, t.type, (v) => set({ type: v }))),
      h('label', { class: 'field wide' }, 'Notes', h('input', { type: 'text', value: t.notes ?? '', placeholder: 'Anything worth remembering', onchange: (e) => set({ notes: e.target.value }) }))),
    h('div', { class: 'spread mt small' },
      h('span', { class: 'dim' }, `${t.id} · ${t.workstream} · ${t.updated ? `last updated ${fmtDay(t.updated)}` : 'never updated'}`),
      h('div', { class: 'row' },
        custom ? h('button', { class: 'btn small danger', onclick: () => { if (confirm(`Delete “${t.task}”?`)) { g.open = null; remove('tasks', t.id); } } }, 'Delete task') : null,
        h('button', { class: 'btn small', onclick: () => { g.open = null; refresh(); } }, 'Close'))));
}

function addForm(a) {
  const d = g.draft;
  d.pillar ??= 'Finance'; d.type ??= 'Task'; d.start ??= a.now < PLAN_START ? PLAN_START : a.now; d.end ??= d.start; d.critical ??= 'no';
  const submit = () => {
    if (!d.task?.trim()) return toast('Describe the task first.', 'bad');
    if (d.end < d.start) return toast('The end date is before the start date.', 'bad');
    const n = a.tasks.filter((t) => t.id.startsWith('N-')).map((t) => Number(t.id.slice(2)) || 0);
    const id = `N-${String(Math.max(0, ...n) + 1).padStart(2, '0')}`;
    save('tasks', { id, pillar: d.pillar, workstream: d.workstream?.trim() || 'Added', task: d.task.trim(), start: d.start, end: d.end,
      type: d.type, critical: d.critical === 'yes', notes: '', status: 'Not started', pct: 0, updated: a.now });
    g.draft = {}; g.adding = false;
  };
  return h('section', { class: 'card' },
    h('h2', {}, '＋ Add a task'),
    h('form', { class: 'form mt', onsubmit: (e) => { e.preventDefault(); submit(); } },
      h('label', { class: 'field wide' }, 'What needs doing?', h('input', { type: 'text', value: d.task ?? '', placeholder: 'e.g. Write the Trial results email', oninput: (e) => { d.task = e.target.value; } })),
      h('label', { class: 'field' }, 'Pillar', pick(PILLARS.map((p) => p.id), d.pillar, (v) => { d.pillar = v; })),
      h('label', { class: 'field' }, 'Kind', pick(TYPES, d.type, (v) => { d.type = v; })),
      h('label', { class: 'field' }, 'Start', h('input', { type: 'date', value: d.start, min: PLAN_START, max: PLAN_END, onchange: (e) => { d.start = e.target.value; } })),
      h('label', { class: 'field' }, 'End', h('input', { type: 'date', value: d.end, min: PLAN_START, max: PLAN_END, onchange: (e) => { d.end = e.target.value; } })),
      h('label', { class: 'field' }, 'Launch-critical?', pick([{ value: 'no', label: 'No' }, { value: 'yes', label: '★ Yes' }], d.critical, (v) => { d.critical = v; })),
      h('label', { class: 'field' }, 'Group (optional)', h('input', { type: 'text', value: d.workstream ?? '', placeholder: 'e.g. Payments', oninput: (e) => { d.workstream = e.target.value; } })),
      h('div', { class: 'row wide' },
        h('button', { class: 'btn primary', type: 'submit' }, 'Add task'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { g.adding = false; refresh(); } }, 'Cancel'))));
}

export function gantt(a) {
  if (!g.init) {
    const q = new URLSearchParams(location.search);
    g.show = SHOW.some((s) => s.value === q.get('show')) ? q.get('show') : '';
    g.pillar = PILLARS.some((p) => p.id === q.get('pillar')) ? q.get('pillar') : '';
    if (matchMedia('(max-width: 700px)').matches) g.mode = 'list';
    g.init = true;
  }
  const list = a.tasks.filter((t) => matches(t, a.now));
  const counts = Object.fromEntries(Object.keys(FLAG).map((k) => [k, a.tasks.filter((t) => t.flag === k).length]));
  const toggle = (id) => { g.open = g.open === id ? null : id; refresh(); };

  const controls = h('section', { class: 'card controls' },
    h('div', { class: 'form' },
      h('label', { class: 'field' }, 'Pillar', pick([{ value: '', label: 'All pillars' }, ...PILLARS.map((p) => ({ value: p.id, label: `${p.icon} ${p.id}` }))], g.pillar, (v) => { g.pillar = v; refresh(); })),
      h('label', { class: 'field' }, 'Show', pick(SHOW, g.show, (v) => { g.show = v; refresh(); })),
      h('label', { class: 'field' }, 'View', segmented([{ value: 'timeline', label: '▤ Timeline' }, { value: 'list', label: '☰ List' }], g.mode, (v) => { g.mode = v; refresh(); })),
      h('div', { class: 'field' }, h('button', { class: 'btn primary', onclick: () => { g.adding = !g.adding; refresh(); } }, g.adding ? 'Close form' : '＋ Add task'))),
    h('div', { class: 'row mt' },
      ['overdue', 'blocked', 'stale', 'late', 'ok', 'upcoming', 'done'].map((k) =>
        h('button', { class: `chipbtn ${g.show === k ? 'on' : ''}`, onclick: () => { g.show = g.show === k ? '' : k; refresh(); } },
          chip(`${counts[k]} ${FLAG[k].label.toLowerCase()}`, FLAG[k].tone)))));

  if (!list.length) return [controls, g.adding ? addForm(a) : null, h('section', { class: 'card' }, empty('Nothing matches.', 'Try “All tasks”.'))];

  const byPhase = PHASES.map((p) => ({ p, rows: list.filter((t) => t.phase.id === p.id) })).filter((x) => x.rows.length);

  if (g.mode === 'list') {
    return [controls, g.adding ? addForm(a) : null,
      ...byPhase.map(({ p, rows }) => h('section', { class: 'card' },
        h('h2', {}, h('span', { class: 'phasedot', style: { background: phaseColour(p.id) } }), `${p.name}`, h('span', { class: 'small dim' }, `${fmtDay(p.start)} – ${fmtDay(p.end)}`)),
        h('div', { class: 'tasklist mt' }, rows.map((t) => [taskRow(t, a.now, () => toggle(t.id)), g.open === t.id ? editor(t, a.now) : null]))))];
  }

  const span = a.planLength;
  const x = (d) => Math.max(0, Math.min(100, (daysBetween(PLAN_START, d) / span) * 100));
  const wid = (s, e) => Math.max(0.9, ((daysBetween(s, e) + 1) / span) * 100);
  const todayX = a.now >= PLAN_START && a.now <= PLAN_END ? `${x(a.now) + 50 / span}%` : null;
  const weekLines = []; for (let d = '2026-09-14'; d <= PLAN_END; d = new Date(Date.parse(d) + 7 * 864e5).toISOString().slice(0, 10)) weekLines.push(d);

  const track = (content) => h('div', { class: 'gt-track' },
    weekLines.map((d) => h('i', { class: 'wk', style: { left: `${x(d)}%` } })),
    h('i', { class: 'launchline', style: { left: `${x(LAUNCH) + 50 / span}%` } }),
    todayX ? h('i', { class: 'todayline', style: { left: todayX } }) : null,
    content);

  return [controls, g.adding ? addForm(a) : null,
    h('section', { class: 'card gantt-card' },
      h('div', { class: 'scrollx' }, h('div', { class: 'gantt' },
        h('div', { class: 'gt-row gt-head' },
          h('div', { class: 'gt-name' }, `${list.length} task${list.length === 1 ? '' : 's'} · tap one to update`),
          track([
            ...[['2026-09-14', 'Sep'], ['2026-10-01', 'Oct'], ['2026-11-01', 'Nov'], ['2026-12-01', 'Dec']].map(([d, m]) => h('span', { class: 'mon', style: { left: `${x(d)}%` } }, m)),
            todayX ? h('span', { class: 'todaylabel', style: { left: todayX } }, 'Today') : null,
          ])),
        byPhase.map(({ p, rows }) => [
          h('div', { class: 'gt-row gt-phase' },
            h('div', { class: 'gt-name' }, h('span', { class: 'phasedot', style: { background: phaseColour(p.id) } }), p.name, h('span', { class: 'dim' }, ` · ${fmtDay(p.start)} – ${fmtDay(p.end)}`)),
            track(h('div', { class: 'phaseband', style: { left: `${x(p.start)}%`, width: `${wid(p.start, p.end)}%`, background: phaseColour(p.id) } }))),
          rows.map((t) => [
            h('div', { class: `gt-row gt-task ${g.open === t.id ? 'open' : ''}`, onclick: () => toggle(t.id), role: 'button', tabindex: '0',
              onkeydown: (e) => { if (e.key === 'Enter') toggle(t.id); } },
              h('div', { class: 'gt-name', title: t.task },
                h('span', { class: 'pdot', style: { background: pillarColour(t.pillar) }, title: t.pillar }),
                t.critical ? h('span', { class: 'crit' }, '★') : null,
                h('span', { class: 'gt-label' }, t.task),
                h('span', { class: `flagdot f-${FLAG[t.flag].tone}`, title: FLAG[t.flag].label })),
              track(t.type === 'Milestone'
                ? h('div', { class: `diamond ${FLAG[t.flag].tone}`, style: { left: `${x(t.end) + 50 / span}%` }, title: `${t.task} · ${fmtDay(t.end)}` })
                : h('div', { class: `gbar ${FLAG[t.flag].tone} ${t.type === 'Backlog' ? 'backlog' : ''}`, style: { left: `${x(t.start)}%`, width: `${wid(t.start, t.end)}%` },
                    title: `${fmtDay(t.start)} – ${fmtDay(t.end)} · ${t.status} · ${t.pct}%` },
                    h('span', { class: 'gfill', style: { width: `${Number(t.pct) || 0}%` } })))),
            g.open === t.id ? h('div', { class: 'gt-editor' },
              h('div', { class: 'spread' }, h('strong', {}, t.task), flagChip(t.flag)),
              h('div', { class: 'small dim' }, dueText(t, a.now)),
              editor(t, a.now)) : null,
          ]),
        ]))),
      h('div', { class: 'legend small mt' },
        [['grey', 'Planned'], ['blue', 'On track'], ['amber', 'Late start / needs update'], ['red', 'Overdue / blocked'], ['green', 'Done']].map(([c, l]) => h('span', {}, h('i', { class: `sw ${c}` }), l)),
        h('span', {}, h('i', { class: 'sw today' }), 'Today'), h('span', {}, h('i', { class: 'sw launch' }), '15 Nov launch')))];
}

// ─── Phases & Gates ───
export function gates(a) {
  const cards = a.gates.map((gt) => {
    const open = a.tasks.filter((t) => t.type === 'Task' && t.phase.id === gt.id && t.status !== 'Done')
      .sort((x, y) => (y.critical - x.critical) || x.end.localeCompare(y.end));
    const current = a.phase?.id === gt.id;
    return h('section', { class: `card gate ${current ? 'current' : ''}`, style: { '--c': phaseColour(gt.id) } },
      h('div', { class: 'gate-top' },
        ring(gt.readiness, 76, 8, phaseColour(gt.id), h('div', { class: 'ring-label sm' }, h('b', {}, pct(gt.readiness)))),
        h('div', {},
          h('div', { class: 'eyebrow' }, `Phase ${gt.id.slice(1)} · ${fmtDay(gt.start)} – ${fmtDay(gt.end)}${current ? ' · you are here' : ''}`),
          h('h2', {}, gt.name),
          h('div', { class: 'row mt' }, chip(gt.status.label, gt.status.tone),
            chip(`🚩 ${gt.gate} · ${fmtDay(gt.gateDate)}`, gt.gateDate === LAUNCH ? 'gold' : 'grey'),
            gt.daysLeft >= 0 && gt.status.label !== 'Passed' ? chip(gt.daysLeft === 0 ? 'today' : `${gt.daysLeft} days left`, gt.daysLeft <= 5 ? 'amber' : 'grey') : null))),
      h('p', { class: 'criterion' }, gt.criterion),
      h('div', { class: 'small dim' }, `${gt.done} of ${gt.total} tasks done · ${gt.criticalOpen} launch-critical still open`),
      open.length && gt.start <= a.now
        ? h('details', { class: 'mt', open: current || null },
            h('summary', {}, `Open tasks (${open.length})`),
            h('div', { class: 'tasklist mt' }, open.slice(0, 12).map((t) => taskRow(t, a.now))))
        : null);
  });

  const rules = h('section', { class: 'card rules' },
    h('h2', {}, 'The rules'),
    h('ol', {},
      h('li', {}, 'September = Foundation · October = Build · Early November = Test.'),
      h('li', {}, '15 November = Launch · Late November = Market · December = Validate + Improve · 31 December = Review.'),
      h('li', { class: 'strong' }, '15 November does not move because you thought of more features.'),
      h('li', {}, 'Lore, extra artwork and extra pages wait in the Backlog until after launch.'),
      h('li', {}, 'After 15 November: stop building what you imagine people want. Watch what they actually do.')));

  return h('div', { class: 'stack' }, h('section', { class: 'card' }, roadmap(a)), h('div', { class: 'grid g2' }, cards), rules);
}

// ─── Scorecard ───
export function scorecard(a) {
  const tally = (label) => a.scorecard.filter((r) => r.status.label === label).length;
  const areas = [...new Set(a.scorecard.map((r) => r.area))];
  return h('div', { class: 'stack' },
    h('div', { class: 'grid g4' },
      [['Achieved', 'green'], ['In progress', 'blue'], ['Not started', 'grey'], ['At risk', 'red']].map(([l, tone]) =>
        h('section', { class: `card tally ${tone}` }, h('div', { class: 'big' }, tally(l)), h('div', { class: 'dim' }, l)))),
    h('section', { class: 'card' },
      h('div', { class: 'sub' }, 'Nothing to type here. Every row is worked out from your tasks, funds, check-ins and numbers.'),
      h('div', { class: 'scrollx mt' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Objective'), h('th', {}, 'Target by 31 Dec'), h('th', {}, 'Now'), h('th', {}, 'Status'))),
        h('tbody', {}, areas.map((area) => [
          h('tr', { class: 'group' }, h('td', { colspan: '4' }, area)),
          a.scorecard.filter((r) => r.area === area).map((r) =>
            h('tr', {}, h('td', {}, h('strong', {}, r.objective)), h('td', { class: 'dim' }, r.target), h('td', {}, r.current ?? '–'), h('td', {}, chip(r.status.label, r.status.tone)))),
        ]))))));
}
