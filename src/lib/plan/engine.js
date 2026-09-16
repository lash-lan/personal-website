// Every number the plan shows, worked out from what has been recorded. This is
// the spreadsheet's formulas, moved into one place so every page agrees.

import {
  PHASES, PILLARS, HABITS, FUNDS, LINE_ITEMS, ACCOUNTS, MONTHS, SETTINGS,
  PLAN_START, PLAN_END, LAUNCH, RECURRING,
} from './seed.js';

// ─── dates (always plain YYYY-MM-DD strings, in your own time zone) ───
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
const utc = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
export const addDays = (s, n) => { const d = new Date(utc(s) + n * 86400000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
export const monthOf = (s) => (s || '').slice(0, 7);
export const weekday = (s) => new Date(utc(s)).getUTCDay(); // 0 = Sunday
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const fmtDay = (s) => (s ? `${Number(s.slice(8))} ${MON[Number(s.slice(5, 7)) - 1]}` : '');
export const fmtDayLong = (s) => (s ? `${DAY[weekday(s)]} ${fmtDay(s)}` : '');
export const fmtMonth = (m) => `${MON[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
export const rm = (n) => `RM${Math.round(Number(n) || 0).toLocaleString('en-MY')}`;
export const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-MY');
export const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;

export const lineItem = (name) => LINE_ITEMS.find((l) => l.name === name);
export const phaseOf = (date) => PHASES.find((p) => date >= p.start && date <= p.end) ?? (date < PLAN_START ? PHASES[0] : PHASES[PHASES.length - 1]);
export const SUNDAYS = (() => { const out = []; for (let d = '2026-09-20'; d <= PLAN_END; d = addDays(d, 7)) out.push(d); return out; })();
export const KPI_WEEKS = Array.from({ length: 7 }, (_, i) => addDays('2026-11-16', 7 * i));

// ─── tasks ───
export const FLAG = {
  done: { label: 'Done', tone: 'green' },
  overdue: { label: 'Overdue', tone: 'red' },
  blocked: { label: 'Blocked', tone: 'red' },
  late: { label: 'Late start', tone: 'amber' },
  stale: { label: 'Needs update', tone: 'amber' },
  upcoming: { label: 'Upcoming', tone: 'grey' },
  ok: { label: 'On track', tone: 'blue' },
};

export function taskFlag(t, now, s) {
  if (t.status === 'Done') return 'done';
  if (t.end < now) return 'overdue';
  if (t.status === 'Blocked') return 'blocked';
  if (t.status === 'Not started' && t.start < now && t.type !== 'Backlog') return 'late';
  if (t.status === 'In progress' && (!t.updated || daysBetween(t.updated, now) > s.staleDays)) return 'stale';
  if (t.start > now) return 'upcoming';
  return 'ok';
}

// ─── daily log ───
export function dayScore(rec) {
  const marks = Object.values(rec?.marks ?? {}).filter(Boolean);
  if (!marks.length) return null;
  const rest = marks.filter((m) => m === 'rest').length;
  const yes = marks.filter((m) => m === 'yes').length;
  return yes / Math.max(1, HABITS.length - rest);
}
export function dayStatus(date, rec, now) {
  if (date > now) return 'upcoming';
  const n = Object.values(rec?.marks ?? {}).filter(Boolean).length;
  if (n === 0) return date < now ? 'missed' : 'today';
  return n < HABITS.length ? 'partial' : 'logged';
}

export const savingsRating = (amount, s) =>
  amount >= s.savExcellent ? { label: 'Excellent', tone: 'green' }
    : amount >= s.savTarget ? { label: 'Target hit', tone: 'green' }
    : amount >= s.savMin ? { label: 'Minimum', tone: 'amber' }
    : { label: 'Below minimum', tone: 'red' };

/** Everything, worked out once per render. */
export function analyse(state, now = today()) {
  const s = { ...SETTINGS, ...(state.settings.find((x) => x.id === 'main') ?? {}) };
  const byId = (coll) => Object.fromEntries(state[coll].map((r) => [r.id, r]));
  const tasks = [...state.tasks].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))
    .map((t) => ({ ...t, flag: taskFlag(t, now, s), phase: phaseOf(t.start) }));
  const task = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const count = (f) => tasks.filter(f).length;

  // money
  const tx = [...state.transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sumTx = (f) => tx.filter(f).reduce((a, t) => a + (Number(t.amount) || 0), 0);
  const budgets = byId('budget');
  const monthMoney = (m) => {
    const lines = budgets[m]?.lines ?? {};
    const inMonth = (t) => monthOf(t.date) === m;
    const cat = (c) => (t) => inMonth(t) && lineItem(t.item)?.category === c;
    const grp = (g) => (t) => inMonth(t) && lineItem(t.item)?.group === g;
    const plan = (f) => LINE_ITEMS.filter(f).reduce((a, l) => a + (Number(lines[l.name]) || 0), 0);
    const actualByItem = {};
    for (const t of tx) if (inMonth(t)) actualByItem[t.item] = (actualByItem[t.item] || 0) + (Number(t.amount) || 0);
    const r = {
      month: m, lines, estimates: budgets[m]?.estimates ?? [], actualByItem,
      income: { plan: plan((l) => l.category === 'Income'), actual: sumTx(cat('Income')) },
      living: { plan: plan((l) => l.category === 'Expense'), actual: sumTx(cat('Expense')) },
      food: { plan: Number(lines.Food) || 0, actual: sumTx((t) => inMonth(t) && t.item === 'Food') },
      housing: { plan: Number(lines['Rent + Utilities']) || 0, actual: sumTx(grp('Housing')) },
      recurring: { plan: plan((l) => l.group === 'Recurring'), actual: sumTx(grp('Recurring')) },
      household: { plan: plan((l) => l.group === 'Household' || l.group === 'Unplanned'), actual: sumTx(grp('Household')) + sumTx(grp('Unplanned')) },
      savings: { plan: plan((l) => l.category === 'Fund Add'), actual: sumTx(cat('Fund Add')) },
      fundSpend: { actual: sumTx(cat('Fund Spend')) },
    };
    r.unallocated = r.income.plan - r.living.plan - r.savings.plan;
    r.rate = { plan: r.income.plan ? r.savings.plan / r.income.plan : 0, actual: r.income.actual ? r.savings.actual / r.income.actual : 0 };
    r.rating = savingsRating(r.savings.actual, s);
    r.foodSweep = Math.max(0, r.food.plan - r.food.actual);
    const d = new Date(utc(`${m}-01`)); const last = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
    r.daysInMonth = Number(last.slice(8)); r.lastDay = `${m}-${last.slice(8)}`;
    return r;
  };
  const months = Object.fromEntries(MONTHS.map((m) => [m, monthMoney(m)]));
  const curMonth = MONTHS.includes(monthOf(now)) ? monthOf(now) : now < `${MONTHS[0]}-01` ? MONTHS[0] : MONTHS[MONTHS.length - 1];
  const lastTx = tx.find((t) => t.date)?.date ?? '';
  const txGap = lastTx ? Math.max(0, daysBetween(lastTx, now)) : null;

  // funds
  const fundRec = byId('funds');
  const funds = FUNDS.map((f) => {
    const r = { ...f, ...(fundRec[f.id] ?? {}) };
    const added = sumTx((t) => t.item === `${f.id} (Add)`);
    const spent = sumTx((t) => t.item === `${f.id} (Spend)`);
    const balance = (Number(r.opening) || 0) + added - spent;
    const progress = r.target ? balance / r.target : 0;
    const planned = MONTHS.reduce((a, m) => a + (Number(budgets[m]?.lines?.[`${f.id} (Add)`]) || 0), 0);
    const status = balance >= r.target ? { label: 'Fully funded', tone: 'green' }
      : balance <= 0 ? { label: 'Not funded', tone: 'red' }
      : balance >= (r.yearEnd || 0) && r.yearEnd ? { label: 'On track', tone: 'blue' }
      : { label: 'Building', tone: 'amber' };
    return { ...r, added, spent, balance, progress, projected: (Number(r.opening) || 0) + planned, status };
  });
  const fund = Object.fromEntries(funds.map((f) => [f.id, f]));
  const investAge = s.verifiedOn ? daysBetween(s.verifiedOn, now) : null;
  const investStale = investAge === null || investAge > s.valueDays;

  /**
   * The three pots, kept apart on purpose. Only Maybank cash is an emergency
   * reserve; MooMoo is investments held as a secondary reserve; EPF is locked
   * retirement money. The total is a net worth snapshot, never a fund balance.
   */
  const n = (x) => Number(x) || 0;
  const assets = {
    emergencyCash: fund['Emergency Fund'].balance,
    moomooTotal: n(s.moomooTotal), moomooInvested: n(s.moomooInvested), moomooCash: n(s.moomooCash),
    moomooPL: n(s.moomooPL), moomooHoldings: s.moomooHoldings ?? '',
    epfTotal: n(s.epfTotal), epfAccount1: n(s.epfAccount1), epfAccount2: n(s.epfAccount2), epfAccount3: n(s.epfAccount3),
    epfContributions2026: n(s.epfContributions2026),
    verifiedOn: s.verifiedOn ?? '',
  };
  assets.total = Number((assets.emergencyCash + assets.moomooTotal + assets.epfTotal).toFixed(2));
  const snapshots = [...state.snapshots].sort((a2, b2) => (b2.id || '').localeCompare(a2.id || ''));

  // daily
  const daily = byId('daily');
  const days = [];
  for (let d = PLAN_START; d <= PLAN_END; d = addDays(d, 1)) {
    days.push({ date: d, rec: daily[d], score: dayScore(daily[d]), status: dayStatus(d, daily[d], now) });
  }
  const past = days.filter((d) => d.date <= now);
  const good = (d) => d.score !== null && d.score * 100 >= s.goodDay;
  let streak = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    const d = past[i];
    if (good(d)) streak++;
    else if (d.date === now && d.score === null) continue; // today not logged yet: keep yesterday's run
    else break;
  }
  const habits = HABITS.map((h) => {
    const counted = past.filter((d) => d.rec?.marks?.[h.id] && d.rec.marks[h.id] !== 'rest');
    const yes = counted.filter((d) => d.rec.marks[h.id] === 'yes').length;
    const eligible = past.filter((d) => d.rec?.marks?.[h.id] !== 'rest').length;
    return { ...h, rate: eligible ? yes / eligible : 0, yes, logged: counted.length };
  });
  const last7 = past.slice(-7).map((d) => d.score ?? 0);
  const avg7 = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
  const avgAll = past.length ? past.reduce((a, d) => a + (d.score ?? 0), 0) / past.length : 0;
  const familyRate = past.length ? past.filter((d) => d.rec?.marks?.family === 'yes').length / past.length : 0;

  // weekly
  const weeklyRec = byId('weekly');
  const weeks = SUNDAYS.map((d) => {
    const rec = weeklyRec[d];
    const status = rec?.done === 'Yes' ? 'done' : d > now ? 'upcoming' : d === now ? 'due' : daysBetween(d, now) <= 1 ? 'due' : 'overdue';
    return { date: d, rec, status };
  });

  // KPIs
  const kpiRec = byId('kpis');
  const kpiStatus = (id, wk) => {
    if (wk > now) return 'upcoming';
    if (kpiRec[id]) return 'logged';
    return addDays(wk, 7) < now ? 'missing' : 'this week';
  };
  const kpis = {
    boi: KPI_WEEKS.map((wk) => ({ week: wk, id: `boi|${wk}`, rec: kpiRec[`boi|${wk}`], status: kpiStatus(`boi|${wk}`, wk) })),
    dha: KPI_WEEKS.map((wk) => ({ week: wk, id: `dha|${wk}`, rec: kpiRec[`dha|${wk}`], status: kpiStatus(`dha|${wk}`, wk) })),
  };

  // career evidence
  const evidence = [...state.evidence].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const evMonths = MONTHS.map((m) => {
    const n = evidence.filter((e) => monthOf(e.date) === m).length;
    const lastDay = months[m].lastDay;
    const status = `${m}-01` > now ? 'upcoming' : n >= s.evidencePerMonth ? 'met' : lastDay < now ? 'missed' : Number(now.slice(8)) >= 20 && monthOf(now) === m ? 'behind' : 'going';
    return { month: m, count: n, status };
  });

  // gates
  const gates = PHASES.map((p) => {
    const inPhase = tasks.filter((t) => t.type === 'Task' && t.phase.id === p.id);
    const done = inPhase.filter((t) => t.status === 'Done').length;
    const readiness = inPhase.length ? done / inPhase.length : 0;
    const criticalOpen = inPhase.filter((t) => t.critical && t.status !== 'Done').length;
    const daysLeft = daysBetween(now, p.gateDate);
    const status = readiness >= 1 ? { label: 'Passed', tone: 'green' }
      : p.gateDate < now ? { label: 'Missed', tone: 'red' }
      : p.start > now ? { label: 'Upcoming', tone: 'grey' }
      : daysLeft <= 5 && readiness < 0.8 ? { label: 'At risk', tone: 'red' }
      : { label: 'In progress', tone: 'blue' };
    return { ...p, total: inPhase.length, done, readiness, criticalOpen, daysLeft, status };
  });
  const phase = now < PLAN_START ? null : now > PLAN_END ? null : phaseOf(now);
  const nextGate = gates.find((g) => g.gateDate >= now) ?? null;

  // pillars
  const pillars = PILLARS.filter((p) => p.id !== 'Programme').map((p) => {
    const mine = tasks.filter((t) => t.pillar === p.id && t.type === 'Task');
    const done = mine.filter((t) => t.status === 'Done').length;
    return { ...p, total: mine.length, done, progress: mine.length ? done / mine.length : 0,
      overdue: tasks.filter((t) => t.pillar === p.id && t.flag === 'overdue').length };
  });
  const realTasks = tasks.filter((t) => t.type === 'Task');
  const overall = realTasks.length ? realTasks.filter((t) => t.status === 'Done').length / realTasks.length : 0;
  const criticalOpen = realTasks.filter((t) => t.critical && t.status !== 'Done').length;

  // accounts
  const accountRec = byId('accounts');
  const accounts = ACCOUNTS.map((acc) => {
    const t = acc.task ? task[acc.task] : null;
    const ready = !t || t.status === 'Done';
    const state_ = ready
      ? { label: acc.verified || t?.status === 'Done' ? 'ACTIVE / VERIFIED' : acc.standing, tone: 'green' }
      : t.end < now ? { label: `${acc.standing} · OVERDUE`, tone: 'red' }
      : t.status === 'In progress' ? { label: `${acc.standing} · IN PROGRESS`, tone: 'blue' }
      : { label: acc.priority ? `${acc.standing} · PRIORITY` : acc.standing, tone: acc.priority ? 'red' : 'amber' };
    return { ...acc, t, ready, state: state_, notes: accountRec[acc.id]?.notes ?? '' };
  });
  const account = Object.fromEntries(accounts.map((a) => [a.id, a]));

  // what needs you
  const alerts = [
    { key: 'overdue', label: 'Overdue tasks', n: count((t) => t.flag === 'overdue'), href: '/plan/gantt?show=overdue', tone: 'red' },
    { key: 'late', label: 'Tasks that should have started', n: count((t) => t.flag === 'late'), href: '/plan/gantt?show=late', tone: 'amber' },
    { key: 'stale', label: `In-progress tasks not updated for ${s.staleDays}+ days`, n: count((t) => t.flag === 'stale'), href: '/plan/gantt?show=stale', tone: 'amber' },
    { key: 'blocked', label: 'Blocked tasks', n: count((t) => t.flag === 'blocked'), href: '/plan/gantt?show=blocked', tone: 'red' },
    { key: 'today', label: "Today's check-in not done", n: days.filter((d) => d.status === 'today').length, href: '/plan/daily', tone: 'amber' },
    { key: 'missed', label: 'Days with no check-in', n: days.filter((d) => d.status === 'missed').length, href: '/plan/daily', tone: 'red' },
    { key: 'weekly', label: 'Sunday reviews overdue', n: weeks.filter((w) => w.status === 'overdue').length, href: '/plan/weekly', tone: 'red' },
    { key: 'tx', label: txGap === null ? 'No money logged yet' : `No money logged for ${txGap} days`, n: now >= PLAN_START && (txGap === null || txGap > s.txDays) ? 1 : 0, href: '/plan/money', tone: 'amber' },
    { key: 'kpi', label: 'Weeks of product numbers missing', n: [...kpis.boi, ...kpis.dha].filter((k) => k.status === 'missing').length, href: '/plan/kpis', tone: 'red' },
    { key: 'evidence', label: 'Career evidence behind', n: evMonths.filter((m) => m.status === 'behind' || m.status === 'missed').length, href: '/plan/career', tone: 'amber' },
    { key: 'invest', label: investAge === null ? 'Balances never verified' : `Balances last verified ${investAge} days ago`, n: investStale ? 1 : 0, href: '/plan/funds', tone: 'amber' },
    { key: 'gates', label: 'Gates missed', n: gates.filter((g) => g.status.label === 'Missed').length, href: '/plan/gates', tone: 'red' },
  ];
  const needs = alerts.filter((a) => a.n > 0);

  // scorecard
  const taskState = (id) => {
    const t = task[id]; if (!t) return { label: 'Not started', tone: 'grey' };
    return t.status === 'Done' ? { label: 'Achieved', tone: 'green' } : t.status === 'Blocked' ? { label: 'At risk', tone: 'red' }
      : t.status === 'In progress' ? { label: 'In progress', tone: 'blue' } : { label: 'Not started', tone: 'grey' };
  };
  const acctState = (id) => {
    const t = account[id]?.t;
    if (!t) return { label: 'Achieved', tone: 'green' };
    return t.status === 'Done' ? { label: 'Achieved', tone: 'green' }
      : t.end < now ? { label: 'At risk', tone: 'red' }
      : t.status === 'In progress' ? { label: 'In progress', tone: 'blue' }
      : { label: 'Not started', tone: 'grey' };
  };
  const customers = state.kpis.reduce((a, k) => a + (Number(k.purchases) || 0), 0)
    + Math.max(0, ...state.kpis.map((k) => Number(k.paidSubs) || 0));
  const scorecard = [
    ['Finance', 'Emergency Fund', '≥ RM5,000', rm(fund['Emergency Fund'].balance), fund['Emergency Fund'].balance >= fund['Emergency Fund'].yearEnd ? { label: 'Achieved', tone: 'green' } : { label: 'In progress', tone: 'blue' }],
    ['Finance', 'Investment Portfolio', '~RM10k+, market permitting', `${rm(assets.moomooTotal)} total account assets`, assets.moomooTotal >= 10000 ? { label: 'Achieved', tone: 'green' } : { label: 'At risk', tone: 'red' }],
    ['Finance', 'EPF (retirement, separate)', 'Kept separate from cash and investments', rm(assets.epfTotal), { label: 'Achieved', tone: 'green' }],
    ['Finance', 'HSBC', 'Opened', account.HSBC.state.label, acctState('HSBC')],
    ['Finance', 'Wise', 'Opened', account.Wise.state.label, acctState('Wise')],
    ['Finance', 'Stripe', 'Reactivated', account.Stripe.state.label, acctState('Stripe')],
    ['Finance', 'Sampath', 'Reactivated', account['Sampath Bank'].state.label, acctState('Sampath Bank')],
    ['Finance', 'Luno', 'Reactivated, not necessarily funded', account.Luno.state.label, acctState('Luno')],
    ['Finance', 'AIGP', 'Funded / in progress, preferably completed', `Fund ${rm(fund['AIGP Fund'].balance)} · exam ${task['C-04']?.status ?? '?'}`,
      task['C-04']?.status === 'Done' ? { label: 'Achieved', tone: 'green' } : fund['AIGP Fund'].balance > 0 || task['C-02']?.status === 'Done' ? { label: 'In progress', tone: 'blue' } : { label: 'Not started', tone: 'grey' }],
    ['Blood of Icetear', 'Blood of Icetear', 'LIVE', task['B-24']?.status, taskState('B-24')],
    ['Blood of Icetear', 'Trial of Character', 'LIVE + monetised', task['B-12']?.status, taskState('B-12')],
    ['Blood of Icetear', '31 Archetypes', 'Built into product system', task['B-11']?.status, taskState('B-11')],
    ['Blood of Icetear', 'Character parallels', 'Operational in premium reports', task['B-10']?.status, taskState('B-10')],
    ['Dharmalogist', 'Dharmalogist', 'LIVE', task['D-25']?.status, taskState('D-25')],
    ['Dharmalogist', 'Dharmalogist AI', 'LIVE', task['D-11']?.status, taskState('D-11')],
    ['Dharmalogist', 'Subscription', 'US$9 plan operational', task['D-15']?.status, taskState('D-15')],
    ['Products', 'Marketing', 'Active from 15 Nov', task['B-25']?.status, taskState('B-25')],
    ['Products', 'Customers', 'First real paying strangers', num(customers), customers > 0 ? { label: 'Achieved', tone: 'green' } : { label: 'Not started', tone: 'grey' }],
    ['Portfolio', 'Portfolio', 'MVP live', task['P-10']?.status, taskState('P-10')],
    ['Personal', 'Daily health system', 'Established (average score ≥ 70%)', pct(avgAll), avgAll * 100 >= s.goodDay ? { label: 'Achieved', tone: 'green' } : { label: 'In progress', tone: 'blue' }],
    ['Personal', 'Family system', 'Established (family ✓ on ≥ 80% of days)', pct(familyRate), familyRate >= 0.8 ? { label: 'Achieved', tone: 'green' } : { label: 'In progress', tone: 'blue' }],
    ['Career', 'Work evidence', 'Documented (≥ 8 entries)', num(evidence.length), evidence.length >= 8 ? { label: 'Achieved', tone: 'green' } : { label: 'In progress', tone: 'blue' }],
    ['Career', '2027 strategy', 'Written', task['C-08']?.status, taskState('C-08')],
  ].map(([area, objective, target, current, status]) => ({ area, objective, target, current, status }));

  return {
    now, s, tasks, task, tx, lastTx, txGap, months, curMonth, money: months[curMonth], funds, fund, investStale, investAge,
    assets, snapshots,
    days, streak, habits, avg7, avgAll, weeks, kpis, evidence, evMonths, gates, phase, nextGate, pillars, overall,
    criticalOpen, accounts, alerts, needs, scorecard,
    daysToLaunch: daysBetween(now, LAUNCH), daysToEnd: daysBetween(now, PLAN_END),
    planDay: Math.min(Math.max(daysBetween(PLAN_START, now) + 1, 0), daysBetween(PLAN_START, PLAN_END) + 1),
    planLength: daysBetween(PLAN_START, PLAN_END) + 1, recurringList: RECURRING,
  };
}
