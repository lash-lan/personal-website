import { h, chip, pick, patch, save, remove, refresh, toast } from './client.js';
import { LINE_ITEMS, MONTHS, STATUSES } from './seed.js';
import { fmtDay, fmtDayLong, fmtMonth, monthOf, rm, pct, lineItem, daysBetween } from './engine.js';
import { ring, bar, moneyForm, spendBar, savingsMeter, updateTask, empty } from './ui.js';

const TONE = { Income: 'green', Expense: 'red', 'Fund Add': 'gold', 'Fund Spend': 'blue' };
const SIGN = { Income: '+', Expense: '−', 'Fund Add': '→', 'Fund Spend': '←' };
const CAT_LABEL = { Income: 'Money in', Expense: 'Spending', 'Fund Add': 'Saved', 'Fund Spend': 'Paid from fund' };

// ─── Log money ───
const mo = { draft: {}, month: null };

export function money(a) {
  mo.month ??= a.curMonth;
  const shown = a.tx.filter((t) => !mo.month || monthOf(t.date) === mo.month);
  const sum = (cat) => shown.filter((t) => lineItem(t.item)?.category === cat).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const byDate = [];
  for (const t of shown) {
    const last = byDate[byDate.length - 1];
    if (last?.date === t.date) last.rows.push(t); else byDate.push({ date: t.date, rows: [t] });
  }

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', {}, '＋ Log money'),
      h('div', { class: 'sub' }, 'Always type a positive amount. Spent something? Pick what it was. Moving money into savings? Pick “… Fund (Add)”. Paying for something with saved money? Pick “… Fund (Spend)”.'),
      h('div', { class: 'mt' }, moneyForm(mo.draft, a.now))),
    h('section', { class: 'card' },
      h('div', { class: 'spread' },
        h('div', { class: 'field', style: { maxWidth: '14rem' } }, pick([{ value: '', label: 'All months' }, ...MONTHS.map((m) => ({ value: m, label: fmtMonth(m) }))], mo.month ?? '', (v) => { mo.month = v; refresh(); })),
        h('div', { class: 'row' }, chip(`In ${rm(sum('Income'))}`, 'green'), chip(`Spent ${rm(sum('Expense'))}`, 'red'), chip(`Saved ${rm(sum('Fund Add'))}`, 'gold'))),
      shown.length
        ? h('div', { class: 'txlist mt' }, byDate.map((g) => [
            h('div', { class: 'txdate' }, g.date === a.now ? 'Today' : fmtDayLong(g.date)),
            g.rows.map((t) => {
              const cat = lineItem(t.item)?.category ?? 'Expense';
              return h('div', { class: 'tx' },
                h('div', { class: 'tx-main' }, h('strong', {}, t.item), h('div', { class: 'small dim' }, [CAT_LABEL[cat], t.account, t.remarks].filter(Boolean).join(' · '))),
                h('div', { class: `tx-amt ${TONE[cat]}` }, `${SIGN[cat]} RM${Number(t.amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
                h('button', { class: 'btn small ghost', 'aria-label': 'Delete', title: 'Delete', onclick: () => confirm(`Delete ${t.item} ${rm(t.amount)}?`) && remove('transactions', t.id) }, '✕'));
            }),
          ]))
        : empty('Nothing logged for this month yet.', 'Your first entry takes ten seconds.')));
}

// ─── Monthly budget ───
const bu = { month: null };

/**
 * Spending: what is left, or how far over (red). Income and savings: how much
 * is still to come, which is normal early in a month and so is never red.
 */
function leftCell(kind, plan, actual) {
  if (!plan && !actual) return h('td', {});
  if (kind === 'expense') {
    const left = plan - actual;
    return h('td', { class: `num ${left < 0 ? 'redtext' : ''}` }, left < 0 ? `${rm(-left)} over` : `${rm(left)} left`);
  }
  const toGo = plan - actual;
  return h('td', { class: `num ${toGo > 0 ? 'dim' : 'greentext'}` }, toGo > 0 ? `${rm(toGo)} to go` : actual > plan ? `${rm(actual - plan)} extra` : 'Done ✓');
}
const GROUPS = [
  ['Money in', (l) => l.category === 'Income', 'income'],
  ['Housing & food', (l) => l.group === 'Housing' || l.group === 'Food', 'expense'],
  ['Subscriptions, services & transport', (l) => l.group === 'Recurring', 'expense'],
  ['Household, medical & other', (l) => l.group === 'Household' || l.group === 'Unplanned', 'expense'],
  ['Savings (target RM1,000 = 20%)', (l) => l.category === 'Fund Add', 'saving'],
];

export function budget(a, raw) {
  bu.month ??= a.curMonth;
  const m = a.months[bu.month];
  const rec = raw.budget.find((b) => b.id === bu.month) ?? { id: bu.month, lines: {}, estimates: [] };

  const setLine = (item, value) => {
    const lines = { ...rec.lines, [item]: Math.max(0, Number(value) || 0) };
    save('budget', { ...rec, lines, estimates: (rec.estimates ?? []).filter((x) => x !== item) });
  };
  const copyForward = () => {
    const later = MONTHS.filter((x) => x > bu.month);
    if (!later.length) return toast('There are no later months to copy to.', 'bad');
    if (!confirm(`Copy ${fmtMonth(bu.month)}’s plan to ${later.map(fmtMonth).join(', ')}? Their current plans will be replaced.`)) return;
    for (const x of later) save('budget', { ...rec, id: x }, true);
    toast('Copied ✓');
  };

  const rows = GROUPS.map(([title, f, kind]) => {
    const items = LINE_ITEMS.filter(f);
    let plan = 0, actual = 0;
    const body = items.map((li) => {
      const p = Number(m.lines[li.name]) || 0;
      const act = m.actualByItem[li.name] || 0;
      plan += p; actual += act;
      const est = (m.estimates ?? []).includes(li.name);
      return h('tr', {},
        h('td', {}, li.name, est ? h('span', { title: 'This price is a guess. Type the real one to clear this.' }, ' ', chip('estimate', 'amber')) : null),
        h('td', { class: 'num' }, h('input', { type: 'number', min: '0', step: '10', inputmode: 'decimal', class: 'cellinput', value: p, 'aria-label': `Budget for ${li.name}`,
          onchange: (e) => setLine(li.name, e.target.value) })),
        h('td', { class: 'num' }, act ? rm(act) : h('span', { class: 'dim' }, '–')),
        leftCell(kind, p, act),
        h('td', { class: 'barcell' }, p || act ? bar(p ? act / p : 1, kind === 'expense' ? (act > p ? 'red' : act / (p || 1) > 0.85 ? 'amber' : 'blue') : 'green') : null));
    });
    return [
      h('tr', { class: 'group' }, h('td', { colspan: '5' }, title)),
      body,
      h('tr', { class: 'total' }, h('td', {}, 'Subtotal'), h('td', { class: 'num' }, rm(plan)), h('td', { class: 'num' }, rm(actual)),
        leftCell(kind, plan, actual), h('td', {})),
    ];
  });

  const tile = (label, value, note, tone = '') => h('section', { class: `card tally ${tone}` }, h('div', { class: 'small dim' }, label), h('div', { class: 'big' }, value), h('div', { class: 'small' }, note));
  const before = a.now < `${bu.month}-01`;

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('div', { class: 'spread' },
        h('div', { class: 'field', style: { maxWidth: '14rem' } }, pick(MONTHS.map((x) => ({ value: x, label: fmtMonth(x) })), bu.month, (v) => { bu.month = v; refresh(); })),
        h('button', { class: 'btn small', onclick: copyForward }, 'Copy this plan to later months')),
      h('p', { class: 'small dim mt' }, 'Type any budget amount to change it; it saves when you leave the box. “Actual” fills itself in from Log Money.')),
    h('div', { class: 'grid g4' },
      tile('Income planned', rm(m.income.plan), `${rm(m.income.actual)} received`),
      tile('Living ceiling', rm(m.living.plan), m.living.actual > m.living.plan ? `${rm(m.living.actual - m.living.plan)} over` : `${rm(m.living.plan - m.living.actual)} left`, m.living.actual > m.living.plan ? 'red' : ''),
      tile('Savings planned', rm(m.savings.plan), `${pct(m.rate.plan)} of income`),
      tile('Unallocated', m.unallocated === 0 ? 'RM0 ✓' : rm(m.unallocated), m.unallocated === 0 ? 'Every ringgit has a job' : m.unallocated > 0 ? 'Give this money a job' : 'Plan spends more than income', m.unallocated === 0 ? 'green' : 'amber')),
    h('section', { class: 'card' }, h('div', { class: 'scrollx' }, h('table', { class: 'data budget' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Item'), h('th', { class: 'num' }, 'Budget'), h('th', { class: 'num' }, 'Actual'), h('th', { class: 'num' }, 'Left / over'), h('th', {}, ''))),
      h('tbody', {}, rows)))),
    h('div', { class: 'grid g2' },
      h('section', { class: 'card' }, h('h2', {}, 'Month result'),
        h('div', { class: 'stack mt' },
          h('div', { class: 'spread' }, h('span', {}, 'Saved so far'), h('span', {}, h('b', {}, rm(m.savings.actual)), ' ', before ? null : chip(m.rating.label, m.rating.tone))),
          savingsMeter(m.savings.actual, a.s),
          h('div', { class: 'spread' }, h('span', {}, 'Savings rate'), h('b', {}, `${pct(m.rate.actual)} (target 20%)`)),
          h('div', { class: 'small amber-text' }, 'The RM1,050 recurring-expense figure stays provisional until each subscription is priced individually on 20 September (task F-11).'),
          h('div', { class: 'spread' }, h('span', {}, 'Subscriptions vs RM1,050 cap'),
            m.recurring.plan > a.s.recurringCap ? chip(`Plan over by ${rm(m.recurring.plan - a.s.recurringCap)}`, 'red') : chip('Plan within cap', 'green')))),
      h('section', { class: 'card' }, h('h2', {}, 'End-of-month sweep'),
        h('p', { class: 'mt' }, 'Food money not spent so far: ', h('b', {}, rm(m.foodSweep))),
        h('p', { class: 'small dim mt' }, 'At month end, move whatever is left of the food budget into savings (log it as “Emergency Fund (Add)”). It does not quietly turn into another subscription.'))));
}

// ─── Funds ───
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fullDate = (d) => (d ? `${Number(d.slice(8))} ${LONG_MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : 'never');
/** Exact ringgit and sen, for balances that were checked against a real account. */
const rm2 = (n) => `RM${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fu = { adding: false, draft: {} };

const verifiedTag = (date) => h('span', { class: 'verified' }, `Last verified: ${fullDate(date)}`);

/** The form for recording a fresh check of the real accounts. */
function verifyForm(a) {
  const d = fu.draft;
  const v = a.assets;
  d.date ??= a.now;
  d.emergencyCash ??= v.emergencyCash;
  for (const k of ['moomooTotal', 'moomooInvested', 'moomooCash', 'moomooPL', 'epfTotal', 'epfAccount1', 'epfAccount2', 'epfAccount3']) d[k] ??= v[k];
  const num = (key, label, hint) => h('label', { class: 'field' }, label,
    h('input', { type: 'number', step: '0.01', inputmode: 'decimal', value: d[key] ?? '', onchange: (e) => { d[key] = e.target.value; } }),
    hint ? h('small', { class: 'dim' }, hint) : null);

  const submit = () => {
    const n = (x) => Number(x) || 0;
    const cash = n(d.emergencyCash);
    const fund = a.fund['Emergency Fund'];
    // The emergency balance is worked out as opening + money in − money out, so
    // the opening is nudged to make that come to the cash you actually counted.
    patch('funds', 'Emergency Fund', { opening: Number((cash - fund.added + fund.spent).toFixed(2)) }, true);
    patch('funds', 'Investment Fund', { opening: n(d.moomooTotal) }, true);
    patch('settings', 'main', {
      moomooTotal: n(d.moomooTotal), moomooInvested: n(d.moomooInvested), moomooCash: n(d.moomooCash), moomooPL: n(d.moomooPL),
      epfTotal: n(d.epfTotal), epfAccount1: n(d.epfAccount1), epfAccount2: n(d.epfAccount2), epfAccount3: n(d.epfAccount3),
      verifiedOn: d.date,
    }, true);
    save('snapshots', {
      id: d.date, emergencyCash: cash,
      moomooTotal: n(d.moomooTotal), moomooInvested: n(d.moomooInvested), moomooCash: n(d.moomooCash), moomooPL: n(d.moomooPL),
      epfTotal: n(d.epfTotal),
      total: Number((cash + n(d.moomooTotal) + n(d.epfTotal)).toFixed(2)),
    });
    fu.adding = false; fu.draft = {};
    toast('Balances verified ✓');
  };

  return h('form', { class: 'form mt', onsubmit: (e) => { e.preventDefault(); submit(); } },
    h('label', { class: 'field' }, 'Date checked', h('input', { type: 'date', value: d.date, onchange: (e) => { d.date = e.target.value; } })),
    num('emergencyCash', 'Maybank emergency cash (RM)', 'Dedicated savings only'),
    num('moomooTotal', 'MooMoo total assets (RM)', 'Shares + cash'),
    num('moomooInvested', 'MooMoo invested market value (RM)'),
    num('moomooCash', 'MooMoo cash (RM)'),
    num('moomooPL', 'MooMoo total position P/L (RM)', 'A loss is a minus figure'),
    num('epfTotal', 'EPF total (RM)'),
    num('epfAccount1', 'EPF Akaun Persaraan (RM)'),
    num('epfAccount2', 'EPF Akaun Sejahtera (RM)'),
    num('epfAccount3', 'EPF Akaun Fleksibel (RM)'),
    h('div', { class: 'row wide' },
      h('button', { class: 'btn primary', type: 'submit' }, 'Save this check'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => { fu.adding = false; fu.draft = {}; refresh(); } }, 'Cancel'),
      h('span', { class: 'small dim' }, 'The previous check is kept, so you can see the change over time.')));
}

export function funds(a) {
  const v = a.assets;
  const total = a.funds.reduce((s, f) => s + f.balance, 0);
  const target = a.funds.reduce((s, f) => s + (Number(f.target) || 0), 0);
  const numField = (f, key, label) => h('label', { class: 'field' }, label,
    h('input', { type: 'number', min: '0', step: '100', inputmode: 'decimal', value: f[key] ?? 0,
      onchange: (e) => patch('funds', f.id, { ...pickFund(f), [key]: Number(e.target.value) || 0 }) }));

  // ─── the snapshot: three separate pots, never added into "savings" ───
  const line = (icon, label, amount, note, tone = '') => h('div', { class: 'assetrow' },
    h('div', {}, h('strong', {}, `${icon} ${label}`), h('div', { class: 'small dim' }, note)),
    h('div', { class: `assetamt ${tone}` }, rm2(amount)));

  const snapshotCard = h('section', { class: 'card' },
    h('div', { class: 'spread' }, h('h2', {}, '📋 Current financial snapshot'), verifiedTag(v.verifiedOn)),
    h('div', { class: 'stack mt' },
      line('🛡', 'Maybank emergency cash', v.emergencyCash, 'Liquid. The only true emergency reserve.'),
      line('📈', 'MooMoo total assets', v.moomooTotal, 'Shares at market value plus uninvested cash. Not cash savings.'),
      line('🏛', 'EPF retirement savings', v.epfTotal, 'Locked retirement money. Not available in an emergency.'),
      h('div', { class: 'assetrow total' },
        h('div', {}, h('strong', {}, 'Known financial assets total'), h('div', { class: 'small dim' }, 'A net snapshot across all categories')),
        h('div', { class: 'assetamt' }, rm2(v.total)))),
    h('p', { class: 'small amber-text mt' }, 'This total is a net financial snapshot, not the Emergency Fund balance. Each category stays separate: investments are never counted as cash savings, and EPF is never counted as a liquid emergency reserve.'),
    h('div', { class: 'row mt' },
      !fu.adding ? h('button', { class: 'btn primary', onclick: () => { fu.adding = true; refresh(); } }, 'Record a new check of the balances') : null,
      a.investStale ? chip(v.verifiedOn ? `Last checked ${a.investAge} days ago` : 'Never checked', 'amber') : chip('Up to date', 'green')),
    fu.adding ? verifyForm(a) : null);

  // ─── the RM50,000 structure ───
  const hero = h('section', { class: 'card fundhero' },
    ring(target ? total / target : 0, 120, 11, '#56cf8a', h('div', { class: 'ring-label' }, h('b', {}, pct(target ? total / target : 0)), h('span', {}, 'built'))),
    h('div', {}, h('div', { class: 'eyebrow' }, 'Total financial structure'), h('div', { class: 'big' }, `${rm2(total)} / ${rm(target)}`),
      h('p', { class: 'small dim mt' }, 'Balances change when you log “… (Add)” or “… (Spend)” on Log Money, or when you record a new check above. EPF sits outside this structure.')));

  const fundCard = (f) => h('section', { class: 'card fund' },
    h('div', { class: 'spread' }, h('h2', {}, `${f.icon} ${f.id}`), chip(f.status.label, f.status.tone)),
    h('div', { class: 'small dim' }, `Held at ${f.heldAt}`),
    h('div', { class: 'spread mt' }, h('span', { class: 'big' }, rm2(f.balance)), h('span', { class: 'dim' }, `of ${rm(f.target)} · ${pct(f.target ? f.balance / f.target : 0)}`)),
    bar(f.target ? f.balance / f.target : 0, f.balance >= f.target ? 'green' : f.balance > 0 ? 'blue' : '', 'tall'),
    f.id === 'Investment Fund'
      ? h('div', { class: 'breakdown mt' },
          h('div', { class: 'spread small' }, h('span', {}, 'Invested market value'), h('b', {}, rm2(v.moomooInvested))),
          h('div', { class: 'spread small' }, h('span', {}, 'Uninvested cash in account'), h('b', {}, rm2(v.moomooCash))),
          h('div', { class: 'spread small' }, h('span', {}, 'Total position P/L'), h('b', { class: v.moomooPL < 0 ? 'redtext' : 'greentext' }, `${v.moomooPL < 0 ? '−' : '+'}${rm2(Math.abs(v.moomooPL))}`)),
          h('div', { class: 'spread small' }, h('span', {}, 'Visible positions'), h('b', {}, v.moomooHoldings || '—')),
          verifiedTag(v.verifiedOn))
      : null,
    h('div', { class: 'row small mt' },
      chip(`31 Dec target ${rm(f.yearEnd)}`, f.yearEnd && f.balance >= f.yearEnd ? 'green' : 'grey'),
      chip(`If the plan is followed: ${rm(f.projected)} by 31 Dec`, 'grey'),
      f.added ? chip(`+${rm(f.added)} added`, 'gold') : null, f.spent ? chip(`−${rm(f.spent)} spent`, 'blue') : null),
    h('p', { class: 'small dim mt' }, f.note),
    h('details', { class: 'mt' }, h('summary', {}, 'Change targets'),
      h('div', { class: 'form mt' }, numField(f, 'yearEnd', '31 Dec target (RM)'), numField(f, 'target', 'Long-term target (RM)'),
        numField(f, 'opening', 'Starting balance (RM)'))));

  // ─── EPF, deliberately outside the funds ───
  const epfCard = h('section', { class: 'card fund epf' },
    h('div', { class: 'spread' }, h('h2', {}, '🏛 EPF / KWSP · retirement'), chip('Separate asset', 'blue')),
    h('div', { class: 'small dim' }, 'Not part of the RM25,000 Emergency Fund or the RM10,000 Investment Fund.'),
    h('div', { class: 'spread mt' }, h('span', { class: 'big' }, rm2(v.epfTotal)), verifiedTag(v.verifiedOn)),
    h('div', { class: 'breakdown mt' },
      h('div', { class: 'spread small' }, h('span', {}, 'Account 1 · Akaun Persaraan'), h('b', {}, rm2(v.epfAccount1))),
      h('div', { class: 'spread small' }, h('span', {}, 'Account 2 · Akaun Sejahtera'), h('b', {}, rm2(v.epfAccount2))),
      h('div', { class: 'spread small' }, h('span', {}, 'Account 3 · Akaun Fleksibel'), h('b', {}, rm2(v.epfAccount3))),
      h('div', { class: 'spread small' }, h('span', {}, '2026 contributions'), h('b', {}, rm2(v.epfContributions2026)))));

  // ─── history ───
  const history = h('section', { class: 'card' },
    h('h2', {}, '🕘 History of checks'),
    h('div', { class: 'sub' }, 'Every check is kept, so you can see movement rather than just the latest figure.'),
    a.snapshots.length
      ? h('div', { class: 'scrollx mt' }, h('table', { class: 'data' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Date checked'), h('th', { class: 'num' }, 'Maybank cash'), h('th', { class: 'num' }, 'MooMoo total'),
            h('th', { class: 'num' }, 'EPF'), h('th', { class: 'num' }, 'Total'), h('th', { class: 'num' }, 'Change'))),
          h('tbody', {}, a.snapshots.map((s, i) => {
            const prev = a.snapshots[i + 1];
            const diff = prev ? Number(s.total) - Number(prev.total) : null;
            return h('tr', {},
              h('td', {}, fullDate(s.id)), h('td', { class: 'num' }, rm2(s.emergencyCash)), h('td', { class: 'num' }, rm2(s.moomooTotal)),
              h('td', { class: 'num' }, rm2(s.epfTotal)), h('td', { class: 'num' }, h('b', {}, rm2(s.total))),
              h('td', { class: `num ${diff === null ? 'dim' : diff < 0 ? 'redtext' : 'greentext'}` },
                diff === null ? 'first check' : `${diff < 0 ? '−' : '+'}${rm2(Math.abs(diff))}`));
          }))))
      : empty('No checks recorded yet.', 'Record one above.'));

  const rules = h('section', { class: 'card rules' }, h('h2', {}, 'The rules'),
    h('ul', {},
      h('li', {}, 'Emergency Fund target RM25,000 ≈ six months of independent living (RM4,000 × 6, rounded up).'),
      h('li', { class: 'strong' }, 'MooMoo investments, MooMoo cash and EPF never count towards the RM25,000.'),
      h('li', {}, 'The investment portfolio is a secondary reserve only if something genuinely serious happens.'),
      h('li', {}, 'Market value is not cash savings, and EPF is not a liquid reserve.'),
      h('li', { class: 'strong' }, 'Emergency, AIGP, Resilience and Project money never goes into crypto.'),
      h('li', {}, 'Underspent money at month end moves to savings.')));

  return h('div', { class: 'stack' }, snapshotCard, hero,
    h('div', { class: 'grid g2' }, a.funds.map(fundCard)), epfCard, history, rules);
}
const pickFund = ({ id, heldAt, target, opening, yearEnd, note }) => ({ heldAt, target, opening, yearEnd, note });

// ─── Accounts ───
export function accounts(a) {
  const done = a.accounts.filter((x) => x.ready).length;
  return h('div', { class: 'stack' },
    h('section', { class: 'card' }, h('div', { class: 'spread' },
      h('div', {}, h('div', { class: 'big' }, `${done} of ${a.accounts.length}`), h('div', { class: 'dim small' }, 'accounts set up and ready')),
      ring(done / a.accounts.length, 72, 7, '#e3b341')),
      h('p', { class: 'small dim mt' }, 'Target: all set up by 30 September. Changing the status here also updates the task in your plan.')),
    h('div', { class: 'grid g3' }, a.accounts.map((acc) => h('section', { class: 'card account' },
      h('div', { class: 'spread' }, h('h2', {}, acc.id), chip(acc.state.label, acc.state.tone)),
      h('div', { class: 'small dim' }, acc.purpose),
      acc.verified ? h('div', { class: 'mt' }, h('span', { class: 'verified' }, `Verified ${fullDate(acc.verified)}`)) : null,
      acc.ready ? null : h('div', { class: 'small mt' }, h('b', {}, 'To do: '), acc.action),
      acc.t ? h('div', { class: 'form mt' },
        h('label', { class: 'field' }, `Task ${acc.t.id} · due ${fmtDay(acc.t.end)}`, pick(STATUSES, acc.t.status, (v) => updateTask(acc.t, { status: v }, a.now)))) : null,
      acc.id === 'Luno' ? h('p', { class: 'small amber-text mt' }, 'Reactivating Luno does not mean funding Luno.') : null,
      h('label', { class: 'field mt' }, 'Notes', h('input', { type: 'text', value: acc.notes, placeholder: 'e.g. branch visit booked', onchange: (e) => patch('accounts', acc.id, { notes: e.target.value }) }))))));
}
