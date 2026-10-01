// The monthly report: one month of the plan, in one document, ready to print.
//
// There is no PDF library here on purpose. The browser already has a very good
// PDF writer in its print dialog, it handles fonts and page breaks properly,
// and it works the same on a phone, where "Save as PDF" and "Save to Files"
// are both just print. A library would mean a large dependency, worse text and
// a layout that has to be rebuilt by hand.
//
// So the page is built to be read on screen AND to print well, and the button
// calls window.print(). The print rules live at the bottom of plan.css.
import { h, chip, refresh } from './client.js';
import { HABITS, MONTHS, LINE_ITEMS } from './seed.js';
import { fmtDay, fmtDayLong, fmtMonth, monthOf, pct, rm, num, lineItem } from './engine.js';
import { empty } from './ui.js';

const state = { month: null };

/** Every month of the plan that has already started. */
const available = (now) => MONTHS.filter((m) => `${m}-01` <= now);

const MARK = { yes: '✓', no: '✗', rest: '–' };

// The career evidence fields, in the order they are asked for on the page.
const EVIDENCE_FIELDS = [
  ['problem', 'Problem'], ['responsibility', 'Responsibility'], ['action', 'Action'],
  ['result', 'Result'], ['proves', 'Proves'],
];

export function report(a) {
  const months = available(a.now);
  const month = state.month ?? (months.includes(monthOf(a.now)) ? monthOf(a.now) : months[months.length - 1]);
  const inMonth = (d) => monthOf(d) === month;
  const firstDay = `${month}-01`;

  // ── the month's slice of everything ──────────────────────────────────────
  const days = a.days.filter((d) => inMonth(d.date) && d.date <= a.now);
  const logged = days.filter((d) => d.score !== null);
  const goodDays = logged.filter((d) => d.score * 100 >= a.s.goodDay).length;
  const avg = logged.length ? logged.reduce((t, d) => t + d.score, 0) / logged.length : null;

  const tasksDue = a.tasks.filter((t) => inMonth(t.end));
  const doneTasks = tasksDue.filter((t) => t.status === 'Done');
  const openTasks = tasksDue.filter((t) => t.status !== 'Done');

  const tx = a.tx.filter((t) => inMonth(t.date));
  const money = a.months[month];
  const weeks = a.weeks.filter((w) => inMonth(w.date));
  const evidence = a.evidence.filter((e) => inMonth(e.date));
  const kpiRows = [...a.kpis.boi, ...a.kpis.dha].filter((k) => inMonth(k.week));

  const picker = h('section', { class: 'card noprint' },
    h('h2', {}, 'Monthly report'),
    h('p', { class: 'dim small' },
      'Everything recorded in one month: every day you checked in, every task that fell due, every ringgit, ',
      'the Sunday reviews, the product numbers and the career evidence. Choose a month and print it.'),
    h('div', { class: 'form mt' },
      h('label', { class: 'field' }, 'Month',
        h('select', { onchange: (e) => { state.month = e.target.value; refresh(); } },
          ...months.map((m) => h('option', { value: m, selected: m === month || null }, fmtMonth(m))))),
      h('div', { class: 'row mt' },
        h('button', { class: 'btn primary', onclick: () => window.print() }, 'Download PDF'),
        h('span', { class: 'dim small' }, 'Opens your print window. Choose "Save as PDF" as the destination.'))));

  // ── the document itself ──────────────────────────────────────────────────
  const head = h('section', { class: 'card report-head' },
    h('h1', {}, `${fmtMonth(month)}`),
    h('p', { class: 'dim' }, 'LASH 2026 · Independence & Mastery'),
    h('p', { class: 'small dim' },
      `Covering ${fmtDay(firstDay)} to ${fmtDay(days.length ? days[days.length - 1].date : firstDay)}. `,
      `Printed ${fmtDayLong(a.now)}. Phase: ${a.phase?.name ?? '—'}. `,
      a.daysToLaunch >= 0 ? `${a.daysToLaunch} days to launch.` : 'Launched.'));

  const summary = h('section', { class: 'card' },
    h('h2', {}, 'The month at a glance'),
    h('div', { class: 'grid4 mt' },
      stat('Days checked in', `${logged.length} of ${days.length}`),
      stat('Good days', `${goodDays}`, `${a.s.goodDay}% or better`),
      stat('Average day', avg === null ? '—' : pct(avg)),
      stat('Tasks completed', `${doneTasks.length} of ${tasksDue.length}`),
      stat('Money in', rm(money?.income.actual ?? 0)),
      stat('Money out', rm((money?.living.actual ?? 0) + (money?.fundSpend.actual ?? 0))),
      stat('Into savings', rm(money?.savings.actual ?? 0)),
      stat('Career evidence', `${evidence.length}`, `target ${a.s.evidencePerMonth} a month`)));

  // ── every day, habit by habit ────────────────────────────────────────────
  const daily = h('section', { class: 'card page-break' },
    h('h2', {}, 'Every day'),
    days.length === 0 ? empty('Nothing logged', 'No check-ins were recorded in this month.') :
      h('div', { class: 'tablewrap' },
        h('table', { class: 'rpt' },
          h('thead', {}, h('tr', {},
            h('th', {}, 'Day'),
            ...HABITS.map((x) => h('th', { class: 'tiny', title: x.name }, x.name.split(' ')[0])),
            h('th', {}, 'Steps'), h('th', {}, 'Score'))),
          h('tbody', {}, ...days.map((d) => h('tr', { class: d.score === null ? 'dim' : null },
            h('td', {}, fmtDay(d.date)),
            ...HABITS.map((x) => {
              const m = d.rec?.marks?.[x.id];
              return h('td', { class: `mark mark-${m ?? 'none'}` }, MARK[m] ?? '');
            }),
            h('td', {}, d.rec?.steps ? num(d.rec.steps) : ''),
            h('td', {}, d.score === null ? '' : pct(d.score))))))),
    days.length ? h('div', { class: 'mt' },
      h('h3', {}, 'How each habit went'),
      h('div', { class: 'tablewrap' },
        h('table', { class: 'rpt' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Habit'), h('th', {}, 'Target'), h('th', {}, 'Done'), h('th', {}, 'Logged'), h('th', {}, 'Rate'))),
          h('tbody', {}, ...HABITS.map((x) => {
            const counted = days.filter((d) => d.rec?.marks?.[x.id] && d.rec.marks[x.id] !== 'rest');
            const yes = counted.filter((d) => d.rec.marks[x.id] === 'yes').length;
            return h('tr', {}, h('td', {}, `${x.icon} ${x.name}`), h('td', { class: 'dim small' }, x.target),
              h('td', {}, String(yes)), h('td', {}, String(counted.length)),
              h('td', {}, counted.length ? pct(yes / counted.length) : '—'));
          }))))) : null);

  // ── tasks ────────────────────────────────────────────────────────────────
  const tasks = h('section', { class: 'card page-break' },
    h('h2', {}, 'Tasks due this month'),
    tasksDue.length === 0 ? empty('None', 'No tasks fell due in this month.') :
      h('div', {},
        h('p', { class: 'dim small' }, `${doneTasks.length} completed, ${openTasks.length} not.`),
        h('div', { class: 'tablewrap' },
          h('table', { class: 'rpt' },
            h('thead', {}, h('tr', {}, h('th', {}, 'Due'), h('th', {}, 'Task'), h('th', {}, 'Workstream'), h('th', {}, 'Status'), h('th', {}, 'Done'))),
            h('tbody', {}, ...tasksDue
              .slice().sort((x, y) => (x.end || '').localeCompare(y.end || ''))
              .map((t) => h('tr', { class: t.status === 'Done' ? null : 'open' },
                h('td', { class: 'nowrap' }, fmtDay(t.end)),
                h('td', {}, t.task ?? t.id),
                h('td', { class: 'dim small' }, t.workstream ?? ''),
                h('td', {}, t.status ?? ''),
                h('td', {}, t.pct != null ? pct(Number(t.pct) / 100) : ''))))))));

  // ── money ────────────────────────────────────────────────────────────────
  const byDay = [];
  for (const t of [...tx].sort((x, y) => (x.date || '').localeCompare(y.date || ''))) {
    const last = byDay[byDay.length - 1];
    if (last && last.date === t.date) last.rows.push(t); else byDay.push({ date: t.date, rows: [t] });
  }
  const planActual = LINE_ITEMS
    .map((l) => ({ name: l.name, plan: Number(money?.lines?.[l.name]) || 0, actual: Number(money?.actualByItem?.[l.name]) || 0 }))
    .filter((r) => r.plan || r.actual);

  const moneyCard = h('section', { class: 'card page-break' },
    h('h2', {}, 'Money'),
    !money ? empty('No budget', 'This month has no budget record.') : h('div', {},
      h('div', { class: 'grid4' },
        stat('In', rm(money.income.actual), `planned ${rm(money.income.plan)}`),
        stat('Living costs', rm(money.living.actual), `planned ${rm(money.living.plan)}`),
        stat('Savings', rm(money.savings.actual), `planned ${rm(money.savings.plan)}`),
        stat('Out of funds', rm(money.fundSpend.actual))),
      planActual.length ? h('div', { class: 'mt' },
        h('h3', {}, 'Planned against actual'),
        h('div', { class: 'tablewrap' },
          h('table', { class: 'rpt' },
            h('thead', {}, h('tr', {}, h('th', {}, 'Line'), h('th', {}, 'Planned'), h('th', {}, 'Actual'), h('th', {}, 'Difference'))),
            h('tbody', {}, ...planActual.map((r) => {
              const diff = r.actual - r.plan;
              const income = lineItem(r.name)?.category === 'Income';
              const bad = income ? diff < 0 : diff > 0;
              return h('tr', {}, h('td', {}, r.name), h('td', {}, rm(r.plan)), h('td', {}, rm(r.actual)),
                h('td', { class: diff === 0 ? 'dim' : bad ? 'redtext' : 'greentext' },
                  `${diff > 0 ? '+' : ''}${rm(diff)}`));
            }))))) : null,
      h('div', { class: 'mt' },
        h('h3', {}, `Every transaction (${tx.length})`),
        tx.length === 0 ? empty('Nothing logged', 'No money was recorded this month.') :
          h('div', { class: 'tablewrap' },
            h('table', { class: 'rpt' },
              h('thead', {}, h('tr', {}, h('th', {}, 'Day'), h('th', {}, 'Item'), h('th', {}, 'Note'), h('th', {}, 'Amount'))),
              h('tbody', {}, ...byDay.flatMap((g) => g.rows.map((t, i) => h('tr', {},
                h('td', {}, i === 0 ? fmtDay(g.date) : ''),
                h('td', {}, t.item ?? ''),
                h('td', { class: 'dim small' }, t.note ?? ''),
                h('td', { class: 'nowrap' }, rm(t.amount)))))))))));

  // ── the Sunday reviews ───────────────────────────────────────────────────
  const reviews = h('section', { class: 'card page-break' },
    h('h2', {}, 'Sunday reviews'),
    weeks.length === 0 ? empty('None', 'No Sunday fell in this month.') :
      h('div', { class: 'stack' }, ...weeks.map((w) => h('div', { class: 'rpt-review' },
        h('div', { class: 'row' }, h('strong', {}, fmtDayLong(w.date)),
          chip(w.rec?.done === 'Yes' ? 'Done' : w.status === 'upcoming' ? 'Upcoming' : 'Not done',
            w.rec?.done === 'Yes' ? 'green' : w.status === 'upcoming' ? 'grey' : 'red')),
        w.rec ? h('dl', { class: 'rpt-dl' },
          ...Object.entries(w.rec)
            .filter(([k, v]) => !['id', 'done'].includes(k) && typeof v === 'string' && v.trim())
            .flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])) : null))));

  // ── product numbers and career evidence ──────────────────────────────────
  const grow = h('section', { class: 'card page-break' },
    h('h2', {}, 'Product numbers'),
    kpiRows.length === 0 ? empty('None', 'No KPI week fell in this month.') :
      h('div', { class: 'tablewrap' },
        h('table', { class: 'rpt' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Week'), h('th', {}, 'Product'), h('th', {}, 'Recorded'))),
          h('tbody', {}, ...kpiRows.map((k) => h('tr', {},
            h('td', {}, fmtDay(k.week)),
            h('td', {}, k.id.startsWith('boi') ? 'Blood of Icetear' : 'Dharmalogist'),
            h('td', { class: 'small' }, k.rec
              ? Object.entries(k.rec).filter(([f, v]) => !['id', 'product', 'week'].includes(f) && v !== '' && v != null)
                .map(([f, v]) => `${f}: ${v}`).join(' · ') || 'logged'
              : h('span', { class: 'dim' }, 'not recorded'))))))),
    h('h2', { class: 'mt' }, 'Career evidence'),
    evidence.length === 0 ? empty('None', `Nothing recorded. The target is ${a.s.evidencePerMonth} a month.`) :
      h('div', { class: 'stack' }, ...evidence.map((e) => h('div', { class: 'rpt-review' },
        h('strong', {}, fmtDayLong(e.date)),
        h('dl', { class: 'rpt-dl' }, ...EVIDENCE_FIELDS.flatMap(([field, label]) =>
          (e[field] || '').trim() ? [h('dt', {}, label), h('dd', {}, e[field])] : []))))));

  return [picker, head, summary, daily, tasks, moneyCard, reviews, grow];
}

function stat(label, value, note) {
  return h('div', { class: 'rpt-stat' },
    h('div', { class: 'rpt-stat-v' }, value),
    h('div', { class: 'rpt-stat-l' }, label),
    note ? h('div', { class: 'dim tiny' }, note) : null);
}
