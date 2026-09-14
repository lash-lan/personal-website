import { h, chip, refresh } from './client.js';
import { PLAN_START, LAUNCH, HABITS } from './seed.js';
import { fmtDay, fmtDayLong, fmtMonth, rm, pct, daysBetween, addDays } from './engine.js';
import { ring, bar, taskRow, moneyForm, habitGrid, roadmap, spendBar, savingsMeter } from './ui.js';

const ui = { moneyOpen: false, draft: {} };
const RANK = { overdue: 0, blocked: 1, stale: 2, late: 3, ok: 4, upcoming: 5, done: 6 };

const stat = (value, label, tone = '') => h('div', { class: `stat ${tone}` }, h('b', {}, value), h('span', {}, label));

export function home(a) {
  const hour = new Date().getHours();
  const hello = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const total = a.needs.reduce((s, x) => s + x.n, 0);
  const launched = a.daysToLaunch < 0;
  const launchProgress = daysBetween(PLAN_START, a.now) / daysBetween(PLAN_START, LAUNCH);

  // ─── hero ───
  const hero = h('section', { class: 'hero card' },
    h('div', { class: 'hero-text' },
      h('div', { class: 'eyebrow' }, fmtDayLong(a.now)),
      h('h2', { class: 'hello' }, `${hello}, Lash.`),
      h('p', { class: 'dim' }, a.phase
        ? `Day ${a.planDay} of ${a.planLength} · Phase ${a.phase.id.slice(1)} of 6: ${a.phase.name}`
        : a.now < PLAN_START ? 'The plan begins on 14 September.' : 'The 2026 plan is complete.'),
      a.nextGate ? h('p', { class: 'nextgate' }, 'Next gate ', h('strong', {}, a.nextGate.gate), ' · ',
        a.nextGate.daysLeft === 0 ? 'today' : `${a.nextGate.daysLeft} day${a.nextGate.daysLeft === 1 ? '' : 's'} away`,
        ' · ', chip(`${pct(a.nextGate.readiness)} ready`, a.nextGate.status.tone)) : null,
      h('div', { class: 'hero-stats' },
        stat(pct(a.overall), 'of all tasks done'),
        stat(a.criticalOpen, 'launch-critical left', a.criticalOpen && a.daysToLaunch < 21 ? 'warn' : ''),
        stat(`${a.streak}`, a.streak === 1 ? 'good day in a row' : 'good days in a row', a.streak >= 3 ? 'fire' : ''),
        stat(total, total === 1 ? 'thing needs you' : 'things need you', total ? 'bad' : 'good'))),
    h('div', { class: 'hero-ring' },
      ring(launched ? 1 : launchProgress, 168, 12, '#e3b341',
        h('div', { class: 'ring-label' },
          h('b', {}, launched ? '🚀' : a.daysToLaunch),
          h('span', {}, launched ? 'launched' : a.daysToLaunch === 1 ? 'day to launch' : 'days to launch'))),
      h('div', { class: 'small dim center' }, 'Blood of Icetear + Dharmalogist · 15 Nov')));

  // ─── what needs you ───
  const banner = total === 0
    ? h('section', { class: 'banner ok' }, h('span', { class: 'banner-icon' }, '✓'),
        h('div', {}, h('strong', {}, 'All clear. '), h('span', {}, 'Everything is up to date. That is the whole trick: keep it this way.')))
    : h('section', { class: 'banner bad' },
        h('div', { class: 'banner-head' }, h('span', { class: 'banner-icon' }, '!'),
          h('div', {}, h('strong', {}, `${total} thing${total === 1 ? ' needs' : 's need'} you`),
            h('div', { class: 'small' }, 'Clear these before anything else. Tap one to go straight to it.'))),
        h('div', { class: 'alerts' }, a.needs.map((x) =>
          h('a', { href: x.href, class: `alert ${x.tone}` }, h('b', {}, x.n), h('span', {}, x.label), h('i', {}, '→')))));

  // ─── today ───
  const day = a.days.find((d) => d.date === a.now);
  const logged = Object.values(day?.rec?.marks ?? {}).filter(Boolean).length;
  const checkin = h('section', { class: 'card' },
    h('h2', {}, '✓ Today’s check-in', h('a', { class: 'more', href: '/plan/daily' }, 'Steps, back & notes →')),
    day
      ? [h('div', { class: 'sub' }, logged === 0 ? 'Nothing logged yet. Tap as you go through the day.'
          : `${logged} of ${HABITS.length} logged · score ${pct(day.score)}${logged === HABITS.length ? ' · complete ✓' : ''}`),
        h('div', { class: 'mt' }, habitGrid(a.now, day.rec))]
      : h('p', { class: 'dim mt' }, 'Today is outside the plan dates.'));

  // ─── focus ───
  const focus = a.tasks
    .filter((t) => t.type !== 'Backlog' && t.type !== 'Milestone' && t.status !== 'Done' && t.start <= addDays(a.now, 2))
    .sort((x, y) => RANK[x.flag] - RANK[y.flag] || x.end.localeCompare(y.end))
    .slice(0, 7);
  const focusCard = h('section', { class: 'card' },
    h('h2', {}, '▤ Your focus now', h('a', { class: 'more', href: '/plan/gantt' }, 'All tasks →')),
    h('div', { class: 'sub' }, 'Most urgent first. Change the status or % as you go and it saves instantly.'),
    focus.length
      ? h('div', { class: 'tasklist mt' }, focus.map((t) => taskRow(t, a.now)))
      : h('p', { class: 'empty' }, 'Nothing active right now. Enjoy it.'));

  // ─── road ───
  const road = h('section', { class: 'card' },
    h('h2', {}, '⛳ The road to 31 December', h('a', { class: 'more', href: '/plan/gates' }, 'Gates →')),
    roadmap(a));

  // ─── money ───
  const m = a.money;
  const moneyCard = h('section', { class: 'card' },
    h('h2', {}, `₪ Money · ${fmtMonth(m.month)}`, h('a', { class: 'more', href: '/plan/budget' }, 'Budget →')),
    h('div', { class: 'moneytop mt' },
      h('div', {}, h('div', { class: 'small dim' }, 'Spent on living'), h('div', { class: 'big' }, rm(m.living.actual)),
        h('div', { class: 'small dim' }, m.living.actual > m.living.plan
          ? h('span', { class: 'redtext' }, `${rm(m.living.actual - m.living.plan)} over the ${rm(m.living.plan)} ceiling`)
          : `${rm(m.living.plan - m.living.actual)} left of ${rm(m.living.plan)}`)),
      h('div', {}, h('div', { class: 'small dim' }, 'Saved this month'), h('div', { class: 'big' }, rm(m.savings.actual)),
        chip(m.rating.label, m.rating.tone))),
    h('div', { class: 'stack mt' },
      spendBar('🏠 Rent + utilities', m.housing.actual, m.housing.plan),
      spendBar('🍜 Food', m.food.actual, m.food.plan),
      spendBar('🔁 Subscriptions & transport', m.recurring.actual, m.recurring.plan),
      spendBar('🧴 Household, medical & misc', m.household.actual, m.household.plan)),
    h('div', { class: 'mt2' }, h('div', { class: 'small dim' }, 'Savings this month'), savingsMeter(m.savings.actual, a.s)),
    h('div', { class: 'mt2' }, ui.moneyOpen
      ? moneyForm(ui.draft, a.now, () => { ui.moneyOpen = false; })
      : h('div', { class: 'row' },
          h('button', { class: 'btn primary', onclick: () => { ui.moneyOpen = true; refresh(); } }, '＋ Log money'),
          h('span', { class: 'small dim' }, a.lastTx ? `Last entry ${fmtDay(a.lastTx)}` : 'Nothing logged yet'))));

  // ─── funds ───
  const fundTotal = a.funds.reduce((s, f) => s + f.balance, 0);
  const fundTarget = a.funds.reduce((s, f) => s + (Number(f.target) || 0), 0);
  const fundsCard = h('section', { class: 'card' },
    h('h2', {}, '🛡 Funds', h('a', { class: 'more', href: '/plan/funds' }, 'Funds →')),
    h('div', { class: 'fundhead mt' }, ring(fundTarget ? fundTotal / fundTarget : 0, 84, 8, '#56cf8a', h('div', { class: 'ring-label sm' }, h('b', {}, pct(fundTarget ? fundTotal / fundTarget : 0)))),
      h('div', {}, h('div', { class: 'big' }, rm(fundTotal)), h('div', { class: 'small dim' }, `of the ${rm(fundTarget)} financial structure`))),
    h('div', { class: 'stack mt' }, a.funds.map((f) =>
      h('div', { class: 'fundrow' },
        h('div', { class: 'spread small' }, h('span', {}, `${f.icon} ${f.id}`),
          h('span', {}, h('b', {}, rm(f.balance)), h('span', { class: 'dim' }, ` / ${rm(f.target)}`))),
        bar(f.target ? f.balance / f.target : 0, f.balance >= f.target ? 'green' : f.balance > 0 ? 'blue' : '')))));

  // ─── habits, last 14 days ───
  const recent = a.days.filter((d) => d.date <= a.now).slice(-14);
  const heat = h('section', { class: 'card' },
    h('h2', {}, '🔥 Daily system', h('a', { class: 'more', href: '/plan/daily' }, 'History →')),
    h('div', { class: 'sub' }, `Last 7 days average ${pct(a.avg7)} · a good day is ${a.s.goodDay}% or more`),
    recent.length ? h('div', { class: 'scrollx mt' }, h('table', { class: 'heat' },
      h('thead', {}, h('tr', {}, h('th', {}), recent.map((d) => h('th', { class: d.date === a.now ? 'today' : '' }, d.date.slice(8))))),
      h('tbody', {}, HABITS.map((hb) => h('tr', {},
        h('th', { title: hb.target }, `${hb.icon} ${hb.name}`),
        recent.map((d) => h('td', { class: `c-${d.rec?.marks?.[hb.id] || (d.date < a.now ? 'missing' : 'none')}`, title: `${hb.name} · ${fmtDay(d.date)}` }))))))) : null,
    h('div', { class: 'habitrates mt' }, a.habits.map((hb) =>
      h('div', { class: 'spread small' }, h('span', {}, `${hb.icon} ${hb.name}`), h('b', {}, pct(hb.rate))))));

  // ─── pillars + scorecard ───
  const pillars = h('section', { class: 'card' },
    h('h2', {}, '◆ Progress by pillar'),
    h('div', { class: 'pillars mt' }, a.pillars.map((p) =>
      h('a', { class: 'pillar', href: `/plan/gantt?pillar=${encodeURIComponent(p.id)}` },
        ring(p.progress, 64, 6, p.colour, h('div', { class: 'ring-label sm' }, h('b', {}, pct(p.progress)))),
        h('div', {}, h('strong', {}, p.id), h('div', { class: 'small dim' }, `${p.done} of ${p.total} done`),
          p.overdue ? chip(`${p.overdue} overdue`, 'red') : null)))));

  const tally = (label) => a.scorecard.filter((r) => r.status.label === label).length;
  const score = h('section', { class: 'card scorestrip' },
    h('h2', {}, '🏁 31 December scorecard', h('a', { class: 'more', href: '/plan/scorecard' }, 'Scorecard →')),
    h('div', { class: 'grid g4 mt' },
      stat(tally('Achieved'), 'achieved', 'good'), stat(tally('In progress'), 'in progress'),
      stat(tally('Not started'), 'not started'), stat(tally('At risk'), 'at risk', tally('At risk') ? 'bad' : '')),
    h('p', { class: 'quote' }, '15 November is where building a project ends and running two products begins.'));

  return h('div', { class: 'stack dash' },
    hero, banner,
    h('div', { class: 'grid g2' }, checkin, focusCard),
    road,
    h('div', { class: 'grid g2' }, moneyCard, fundsCard),
    h('div', { class: 'grid g2' }, heat, pillars),
    score);
}
