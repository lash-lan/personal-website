'use strict';
/**
 * analysis.js — the counting and the watching.
 *
 *  - metrics()        how many tasks are open / in progress / completed, what
 *                     is overdue, what is due soon.
 *  - groupByTheme()   puts tasks that belong together under one heading.
 *  - financeConcerns()reads every finance record and raises anything that looks
 *                     wrong: missing invoice numbers, possible double charges,
 *                     subscriptions that have gone quiet, unusually large sums.
 *
 * None of this changes data. It only looks.
 */

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Whole days from today to the deadline. Negative means overdue. */
function daysUntil(deadline, now = new Date()) {
  if (!deadline) return null;
  const end = startOfDay(deadline);
  const today = startOfDay(now);
  return Math.round((end - today) / DAY);
}

function isOpenish(t) {
  return t.status !== 'completed';
}

function metrics(tasks, now = new Date()) {
  const m = {
    total: tasks.length,
    open: 0,
    'in-progress': 0,
    blocked: 0,
    completed: 0,
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0,
    noDeadline: 0,
    noNextActor: 0,
    withBlockers: 0,
  };
  for (const t of tasks) {
    if (m[t.status] !== undefined) m[t.status] += 1;
    const d = daysUntil(t.deadline, now);
    if (isOpenish(t)) {
      if (d === null) m.noDeadline += 1;
      else if (d < 0) m.overdue += 1;
      else if (d === 0) m.dueToday += 1;
      else if (d <= 7) m.dueThisWeek += 1;
      if (!t.nextActionBy) m.noNextActor += 1;
      if (Array.isArray(t.blockers) && t.blockers.length) m.withBlockers += 1;
    }
  }
  return m;
}

/**
 * Group tasks under a heading. We use the task's own theme if it has one,
 * otherwise its subcategory, otherwise "Ungrouped".
 */
function groupByTheme(tasks, workstream) {
  const subNames = new Map((workstream?.subcategories || []).map((s) => [s.id, s.name]));
  const groups = new Map();
  for (const t of tasks) {
    const key = (t.theme && t.theme.trim()) || subNames.get(t.subcategory) || 'Ungrouped';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const order = { blocked: 0, 'in-progress': 1, open: 2, completed: 3 };
  return [...groups.entries()]
    .map(([name, items]) => {
      items.sort((a, b) => {
        const s = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        if (s) return s;
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        return a.deadline ? -1 : b.deadline ? 1 : 0;
      });
      return { name, items, metrics: metrics(items) };
    })
    .sort((a, b) => {
      // Groups with overdue work float to the top; finished groups sink.
      const ao = a.metrics.overdue > 0 ? 0 : a.metrics.completed === a.items.length ? 2 : 1;
      const bo = b.metrics.overdue > 0 ? 0 : b.metrics.completed === b.items.length ? 2 : 1;
      return ao - bo || a.name.localeCompare(b.name);
    });
}

/* ---------------------------------------------------------------- finance */

const LARGE_RM = 10000;
// A monthly subscription charges the same amount roughly every 30 days, which
// is not a duplicate. So the duplicate window is deliberately shorter than a
// month, and recurring charges are excluded from the check entirely.
const DUPLICATE_WINDOW_DAYS = 20;

function monthsBetween(a, b) {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

function financeConcerns(records, rules = []) {
  const concerns = [];
  const add = (level, kind, message, refs) =>
    concerns.push({ level, kind, message, refs: [].concat(refs) });

  const subscriptionKinds = /subscription|monthly|yearly|recurring/i;

  // 1. Records missing the detail finance work needs.
  for (const r of records) {
    const missing = [];
    if (!r.invoiceNo) missing.push('invoice / reference number');
    if (!r.card) missing.push('card or account used');
    if (!r.costType) missing.push('one-time or subscription');
    if (!r.amountRM && !r.amountUSD) missing.push('amount');
    if (!r.date) missing.push('date');
    if (missing.length && r.source !== 'spreadsheet-import') {
      add('warn', 'incomplete',
        `${r.vendor} (${r.ref}) is missing: ${missing.join(', ')}.`, r.ref);
    }
  }

  // Imported rows are summarised once rather than 400 times.
  const importedMissingInvoice = records.filter(
    (r) => r.source === 'spreadsheet-import' && !r.invoiceNo);
  if (importedMissingInvoice.length) {
    add('info', 'incomplete',
      `${importedMissingInvoice.length} charges imported from the spreadsheet have no invoice number or card recorded. The spreadsheet does not carry those columns; add them as you reconcile.`,
      importedMissingInvoice.slice(0, 5).map((r) => r.ref));
  }

  // 2. Possible double charges: same vendor, same amount, unusually close
  //    together. Recurring subscriptions are skipped — charging the same
  //    amount every month is what a subscription is supposed to do.
  const byVendor = new Map();
  for (const r of records) {
    const k = (r.vendor || '').toLowerCase().trim();
    if (!byVendor.has(k)) byVendor.set(k, []);
    byVendor.get(k).push(r);
  }
  for (const [, list] of byVendor) {
    const sorted = [...list]
      .filter((r) => !subscriptionKinds.test(r.costType || ''))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i], b = sorted[j];
        if (!a.date || !b.date) continue;
        const gap = (new Date(b.date) - new Date(a.date)) / DAY;
        if (gap > DUPLICATE_WINDOW_DAYS) break;
        const amtA = a.amountRM ?? a.amountUSD;
        const amtB = b.amountRM ?? b.amountUSD;
        const sameCurrency = (a.amountRM != null) === (b.amountRM != null);
        if (sameCurrency && amtA && amtB && Math.abs(amtA - amtB) < 0.01) {
          add('warn', 'possible-duplicate',
            `${a.vendor} was charged the same amount twice within ${Math.round(gap)} days (${a.date} and ${b.date}). Check this is not a double charge.`,
            [a.ref, b.ref]);
        }
      }
    }
  }

  // 3. Subscriptions that have stopped appearing.
  const allMonths = [...new Set(records.map((r) => r.month).filter(Boolean))].sort();
  const latestMonth = allMonths[allMonths.length - 1];
  if (latestMonth) {
    for (const [, list] of byVendor) {
      const subs = list.filter((r) => subscriptionKinds.test(r.costType || ''));
      if (subs.length < 2) continue;
      const months = [...new Set(subs.map((r) => r.month))].sort();
      const last = months[months.length - 1];
      const gap = monthsBetween(last, latestMonth);
      if (gap >= 2) {
        add('warn', 'subscription-gap',
          `${subs[0].vendor} is recorded as a ${String(subs[0].costType).toLowerCase()} but has no charge since ${last} (${gap} months). Either it was cancelled and should be closed off, or a charge is missing.`,
          subs[subs.length - 1].ref);
      }
    }
  }

  // 4. Unusually large single charges.
  for (const r of records) {
    const rm = r.amountRM;
    if (rm && rm >= LARGE_RM) {
      add('info', 'large-amount',
        `${r.vendor} — RM ${rm.toLocaleString('en-MY', { minimumFractionDigits: 2 })} in ${r.month}. Above the RM ${LARGE_RM.toLocaleString()} review threshold.`,
        r.ref);
    }
  }

  // 5. Charges with no account code cannot be booked.
  const noAccount = records.filter((r) => !r.accountCode);
  if (noAccount.length) {
    add('warn', 'no-account-code',
      `${noAccount.length} charge${noAccount.length === 1 ? ' has' : 's have'} no account code and cannot be booked.`,
      noAccount.slice(0, 5).map((r) => r.ref));
  }

  const rank = { alert: 0, warn: 1, info: 2 };
  concerns.sort((a, b) => (rank[a.level] ?? 9) - (rank[b.level] ?? 9));
  return rollUp(concerns);
}

/**
 * A wall of forty near-identical warnings hides the one that matters. Where the
 * same kind of concern repeats more than a few times, show the first few and
 * replace the rest with a single line saying how many there are.
 */
const SHOW_PER_KIND = 4;

function rollUp(concerns) {
  const seen = new Map();
  const out = [];
  const overflow = new Map();

  for (const c of concerns) {
    const n = (seen.get(c.kind) || 0) + 1;
    seen.set(c.kind, n);
    if (n <= SHOW_PER_KIND) out.push(c);
    else overflow.set(c.kind, (overflow.get(c.kind) || 0) + 1);
  }

  const wording = {
    'possible-duplicate': 'other possible double charges',
    'large-amount': 'other charges above the review threshold',
    'subscription-gap': 'other subscriptions with no recent charge',
    incomplete: 'other incomplete records',
  };

  for (const [kind, n] of overflow) {
    out.push({
      level: 'info',
      kind,
      message: `…and ${n} ${wording[kind] || 'more of the same kind'}. Open the finances screen to work through them.`,
      refs: [],
      rolledUp: n,
    });
  }
  return out;
}

function financeSummary(records) {
  const byMonth = new Map();
  const byVendor = new Map();
  const byProject = new Map();
  let totalRM = 0, totalUSD = 0;
  for (const r of records) {
    const rm = r.amountRM || 0;
    const usd = r.amountUSD || 0;
    totalRM += rm; totalUSD += usd;
    if (r.month) byMonth.set(r.month, (byMonth.get(r.month) || 0) + rm);
    if (r.vendor) byVendor.set(r.vendor, (byVendor.get(r.vendor) || 0) + rm);
    const p = r.project || 'Unassigned';
    byProject.set(p, (byProject.get(p) || 0) + rm);
  }
  const sortDesc = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  return {
    count: records.length,
    totalRM: Math.round(totalRM * 100) / 100,
    totalUSD: Math.round(totalUSD * 100) / 100,
    byMonth: [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    topVendors: sortDesc(byVendor).slice(0, 12),
    byProject: sortDesc(byProject),
  };
}

module.exports = { daysUntil, metrics, groupByTheme, financeConcerns, financeSummary };
