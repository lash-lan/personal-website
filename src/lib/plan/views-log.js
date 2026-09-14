import { h, chip, pick, segmented, patch, save, remove, newId, refresh, toast } from './client.js';
import { HABITS, BACK, PLAN_START, PLAN_END, SKILLS, USE_FOR, TRAFFIC, BOI_DROPOFF, MONTHS } from './seed.js';
import { fmtDay, fmtDayLong, fmtMonth, addDays, daysBetween, weekday, pct, rm, num } from './engine.js';
import { ring, bar, habitGrid, empty } from './ui.js';

// ─── Daily check-in ───
const d = { date: null };

export function daily(a) {
  const clampDate = (x) => (x < PLAN_START ? PLAN_START : x > PLAN_END ? PLAN_END : x);
  const date = d.date ?? clampDate(a.now);
  const day = a.days.find((x) => x.date === date);
  const rec = day?.rec;
  const go = (x) => { d.date = clampDate(x); refresh(); };
  const logged = Object.values(rec?.marks ?? {}).filter(Boolean).length;
  const statusChip = chip(...{ logged: ['Complete ✓', 'green'], partial: ['Partly logged', 'amber'], missed: ['Missed', 'red'], today: ['Log today', 'amber'], upcoming: ['Upcoming', 'grey'] }[day.status]);

  const picker = h('section', { class: 'card' },
    h('div', { class: 'daynav' },
      h('button', { class: 'btn', onclick: () => go(addDays(date, -1)), disabled: date <= PLAN_START || null, 'aria-label': 'Previous day' }, '←'),
      h('div', { class: 'daynav-mid' },
        h('div', { class: 'big' }, date === a.now ? 'Today' : fmtDayLong(date)),
        h('div', { class: 'row' }, h('span', { class: 'dim small' }, date === a.now ? fmtDayLong(date) : ''), statusChip)),
      h('button', { class: 'btn', onclick: () => go(addDays(date, 1)), disabled: date >= PLAN_END || date >= a.now || null, 'aria-label': 'Next day' }, '→')),
    date !== a.now && a.now >= PLAN_START && a.now <= PLAN_END ? h('div', { class: 'center mt' }, h('button', { class: 'btn small', onclick: () => go(a.now) }, 'Back to today')) : null);

  if (date > a.now) return [picker, h('section', { class: 'card' }, empty('Not yet.', 'You can only check in for today or earlier.'))];

  const scoreCard = h('section', { class: 'card daysum' },
    ring(day.score ?? 0, 96, 9, (day.score ?? 0) * 100 >= a.s.goodDay ? '#56cf8a' : '#f2b04b',
      h('div', { class: 'ring-label sm' }, h('b', {}, day.score === null ? '–' : pct(day.score)))),
    h('div', {},
      h('strong', {}, logged === 0 ? 'Nothing logged yet' : `${logged} of ${HABITS.length} habits logged`),
      h('div', { class: 'small dim' }, `A good day is ${a.s.goodDay}% or more. Rest days are left out of the score.`),
      h('div', { class: 'row mt' }, chip(`🔥 ${a.streak} good day${a.streak === 1 ? '' : 's'} in a row`, a.streak ? 'gold' : 'grey'), chip(`Last 7 days ${pct(a.avg7)}`, 'grey'))));

  const extras = h('section', { class: 'card' },
    h('h2', {}, 'Body & notes'),
    h('div', { class: 'form mt' },
      h('label', { class: 'field' }, 'Steps', h('input', { type: 'number', inputmode: 'numeric', min: '0', step: '100', value: rec?.steps ?? '', placeholder: 'e.g. 5200',
        onchange: (e) => patch('daily', date, { steps: e.target.value === '' ? '' : Number(e.target.value) }) })),
      h('label', { class: 'field' }, 'How is your back?', pick(BACK, rec?.back ?? '', (v) => patch('daily', date, { back: v }), { placeholder: 'Pick one…' })),
      h('label', { class: 'field wide' }, 'Notes', h('input', { type: 'text', value: rec?.notes ?? '', placeholder: 'Anything about today',
        onchange: (e) => patch('daily', date, { notes: e.target.value }) }))),
    rec?.back === 'Sore' || rec?.back === 'Flare-up' ? h('p', { class: 'small amber-text mt' }, 'Back is sore: mark Walking and Strength as Rest. A streak is not worth reinjuring yourself over.') : null);

  // calendar
  const cal = h('section', { class: 'card' },
    h('h2', {}, 'History', h('span', { class: 'small dim' }, 'tap a day to open it')),
    h('div', { class: 'cals mt' }, MONTHS.map((m) => {
      const first = `${m}-01`;
      const cells = [];
      const lead = (weekday(first) + 6) % 7;
      for (let i = 0; i < lead; i++) cells.push(h('i', { class: 'blank' }));
      for (let x = first; x.slice(0, 7) === m; x = addDays(x, 1)) {
        const dd = a.days.find((y) => y.date === x);
        const cls = !dd ? 'out' : dd.status === 'upcoming' ? 'future' : dd.score === null ? (dd.status === 'missed' ? 'missed' : 'none')
          : dd.score * 100 >= a.s.goodDay ? 'good' : dd.score >= 0.4 ? 'mid' : 'low';
        cells.push(h('button', { class: `cal-day ${cls} ${x === date ? 'sel' : ''} ${x === a.now ? 'now' : ''}`, disabled: !dd || dd.status === 'upcoming' || null,
          onclick: () => go(x), title: dd?.score != null ? `${fmtDay(x)} · ${pct(dd.score)}` : fmtDay(x) }, Number(x.slice(8))));
      }
      return h('div', { class: 'cal' }, h('div', { class: 'cal-title' }, fmtMonth(m)),
        h('div', { class: 'cal-grid' }, ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w) => h('b', {}, w)), cells));
    })),
    h('div', { class: 'legend small mt' }, [['good', 'Good day'], ['mid', 'Partial'], ['low', 'Low'], ['missed', 'No check-in']].map(([c, l]) => h('span', {}, h('i', { class: `sw cal-${c}` }), l))));

  const rates = h('section', { class: 'card' },
    h('h2', {}, 'How each habit is going'),
    h('div', { class: 'stack mt' }, a.habits.map((hb) => h('div', {},
      h('div', { class: 'spread small' }, h('span', {}, `${hb.icon} ${hb.name} · `, h('span', { class: 'dim' }, hb.target)), h('b', {}, pct(hb.rate))),
      bar(hb.rate, hb.rate >= 0.8 ? 'green' : hb.rate >= 0.5 ? 'amber' : 'red')))));

  return h('div', { class: 'stack' }, picker,
    h('div', { class: 'grid g2' }, h('section', { class: 'card' }, h('h2', {}, 'Habits'), h('div', { class: 'sub' }, 'Tap once to mark. Tap the same button again to clear it.'), h('div', { class: 'mt' }, habitGrid(date, rec))),
      h('div', { class: 'stack' }, scoreCard, extras, rates)),
    cal);
}

// ─── Sunday review ───
const w = { open: undefined };
const YES_NO = [{ value: 'Yes', label: 'Yes', tone: 'green' }, { value: 'No', label: 'No', tone: 'red' }];

export function weekly(a) {
  if (w.open === undefined) w.open = (a.weeks.find((x) => x.status === 'due' || x.status === 'overdue') ?? a.weeks.find((x) => x.status === 'upcoming'))?.date ?? null;
  const STATUS = { done: ['Done ✓', 'green'], due: ['Due now', 'amber'], overdue: ['Overdue', 'red'], upcoming: ['Upcoming', 'grey'] };

  const steps = h('section', { class: 'card' },
    h('h2', {}, 'The 20-minute Sunday routine'),
    h('ol', { class: 'steps mt' },
      h('li', {}, h('a', { href: '/plan/gantt?show=attention' }, 'Plan & Gantt'), ': update every task you touched this week.'),
      h('li', {}, h('a', { href: '/plan/money' }, 'Log Money'), ': check your Maybank app and add anything missing.'),
      h('li', {}, h('a', { href: '/plan/kpis' }, 'Product Numbers'), ': enter last week (from 16 November).'),
      h('li', {}, 'Fill in this week below and set your top 3 for next week.')));

  const form = (wk) => {
    const r = wk.rec ?? {};
    const set = (f) => patch('weekly', wk.date, f);
    const q = (label, key, opts = YES_NO) => h('div', { class: 'qrow' }, h('span', {}, label), segmented(opts, r[key] ?? '', (v) => set({ [key]: v })));
    return h('div', { class: 'weekform mt' },
      q('Did you do this review?', 'done'),
      q('All tasks you worked on are updated?', 'planUpdated'),
      q('Money checked against your bank?', 'moneyChecked'),
      wk.date >= '2026-11-22' ? q('Product numbers entered?', 'kpisEntered') : null,
      q('Is 15 November still safe?', 'safe', [{ value: 'Yes', label: 'Yes', tone: 'green' }, { value: 'Unsure', label: 'Unsure', tone: 'gold' }, { value: 'No', label: 'No', tone: 'red' }]),
      h('div', { class: 'form mt' },
        h('label', { class: 'field' }, 'Saved this week (RM)', h('input', { type: 'number', min: '0', inputmode: 'decimal', value: r.saved ?? '', onchange: (e) => set({ saved: e.target.value === '' ? '' : Number(e.target.value) }) })),
        h('label', { class: 'field wide' }, 'Wins', h('textarea', { rows: '2', placeholder: 'What went well?', onchange: (e) => set({ wins: e.target.value }) }, r.wins ?? '')),
        h('label', { class: 'field wide' }, 'Blockers', h('textarea', { rows: '2', placeholder: 'What got in the way?', onchange: (e) => set({ blockers: e.target.value }) }, r.blockers ?? '')),
        h('label', { class: 'field wide' }, 'Top 3 for next week', h('textarea', { rows: '3', placeholder: '1.\n2.\n3.', onchange: (e) => set({ top3: e.target.value }) }, r.top3 ?? ''))),
      r.safe === 'No' ? h('p', { class: 'redtext small mt' }, 'Launch is at risk. Cut scope, not the date: move non-critical tasks to Backlog.') : null);
  };

  return h('div', { class: 'stack' }, steps,
    a.weeks.map((wk) => h('section', { class: `card week ${w.open === wk.date ? 'open' : ''}` },
      h('button', { class: 'weekhead', onclick: () => { w.open = w.open === wk.date ? null : wk.date; refresh(); } },
        h('span', {}, h('strong', {}, `Week ending Sunday ${fmtDay(wk.date)}`),
          wk.rec?.safe ? h('span', { class: 'small dim' }, ` · 15 Nov safe: ${wk.rec.safe}`) : null),
        chip(...STATUS[wk.status])),
      w.open === wk.date ? (wk.date > addDays(a.now, 6) ? h('p', { class: 'dim small mt' }, 'Not yet.') : form(wk)) : null)));
}

// ─── Product numbers ───
const k = { product: 'boi', open: undefined };
const ratio = (x, y) => (Number(y) > 0 && x !== '' && x != null ? Number(x) / Number(y) : null);
const shown = (v, f = pct) => (v === null || Number.isNaN(v) ? '–' : f(v));

const FIELDS = {
  boi: [['visitors', 'Visitors'], ['trialStarts', 'Trial starts'], ['trialCompletions', 'Trial completions'], ['premiumViews', 'Premium page views'],
    ['purchases', 'Purchases'], ['revenue', 'Revenue (RM)'], ['retakes', 'Retakes']],
  dha: [['visitors', 'Visitors'], ['freeUsers', 'Free AI users'], ['conversations', 'AI conversations'], ['subViews', 'Subscription page views'],
    ['newSubs', 'New paid subscribers'], ['cancellations', 'Cancellations'], ['paidSubs', 'Paid subscribers (end of week)'], ['aiCost', 'AI cost (US$)']],
};

function derived(product, r, s) {
  if (!r) return [];
  if (product === 'boi') return [
    ['Trial completion', shown(ratio(r.trialCompletions, r.trialStarts))],
    ['Saw premium offer', shown(ratio(r.premiumViews, r.trialCompletions))],
    ['Conversion', shown(ratio(r.purchases, r.trialCompletions))],
  ];
  const paid = Number(r.paidSubs) || 0;
  const startSubs = paid + (Number(r.cancellations) || 0) - (Number(r.newSubs) || 0);
  return [
    ['MRR', r.paidSubs === '' || r.paidSubs == null ? '–' : `US$${num(paid * s.price)}`],
    ['AI cost / subscriber', paid ? `US$${(Number(r.aiCost || 0) / paid).toFixed(2)}` : '–'],
    ['Free → paid', shown(ratio(r.newSubs, r.freeUsers))],
    ['Churn', shown(startSubs > 0 ? (Number(r.cancellations) || 0) / startSubs : null)],
  ];
}

export function kpis(a) {
  const weeks = a.kpis[k.product];
  if (k.open === undefined) k.open = (weeks.find((x) => x.status === 'missing' || x.status === 'this week'))?.id ?? null;
  const startsIn = daysBetween(a.now, '2026-11-16');
  const STATUS = { logged: ['Logged ✓', 'green'], missing: ['Missing', 'red'], 'this week': ['This week', 'blue'], upcoming: ['Upcoming', 'grey'] };

  const head = h('section', { class: 'card' },
    h('div', { class: 'spread' },
      segmented([{ value: 'boi', label: '⚔ Blood of Icetear' }, { value: 'dha', label: '☸ Dharmalogist' }], k.product, (v) => { k.product = v; k.open = undefined; refresh(); }),
      startsIn > 0 ? chip(`Tracking starts 16 Nov · ${startsIn} days`, 'grey') : null),
    h('p', { class: 'small dim mt' }, 'Organic content → small experiment → measure → improve → paid experiment → measure → scale winners. Not RM5,000 → Meta Ads → prayer.'),
    k.product === 'dha' ? h('p', { class: 'small amber-text' }, `Do not offer unlimited AI until AI cost per subscriber is known and comfortably below US$${a.s.price}.`) : null);

  const editor = (wk) => {
    const r = wk.rec ?? {};
    const set = (f) => save('kpis', { ...r, ...f, id: wk.id, product: k.product, week: wk.week });
    return h('div', { class: 'mt' },
      h('div', { class: 'form' },
        FIELDS[k.product].map(([key, label]) => h('label', { class: 'field' }, label,
          h('input', { type: 'number', min: '0', step: key === 'aiCost' || key === 'revenue' ? '0.01' : '1', inputmode: 'decimal', value: r[key] ?? '',
            onchange: (e) => set({ [key]: e.target.value === '' ? '' : Number(e.target.value) }) }))),
        h('label', { class: 'field' }, 'Top traffic source', pick(TRAFFIC, r.source ?? '', (v) => set({ source: v }), { placeholder: 'Pick one…' })),
        k.product === 'boi'
          ? h('label', { class: 'field' }, 'Biggest drop-off point', pick(BOI_DROPOFF, r.dropoff ?? '', (v) => set({ dropoff: v }), { placeholder: 'Pick one…' }))
          : h('label', { class: 'field' }, 'Most popular content', h('input', { type: 'text', value: r.popular ?? '', onchange: (e) => set({ popular: e.target.value }) }))),
      wk.rec ? h('div', { class: 'row mt' }, derived(k.product, r, a.s).map(([l, v]) => chip(`${l}: ${v}`, 'blue'))) : null);
  };

  const recs = weeks.map((x) => x.rec).filter(Boolean);
  const sum = (key) => recs.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  const totals = h('section', { class: 'card' }, h('h2', {}, 'Totals so far'),
    h('div', { class: 'grid g4 mt' }, (k.product === 'boi'
      ? [['Visitors', num(sum('visitors'))], ['Trial completions', num(sum('trialCompletions'))], ['Purchases', num(sum('purchases'))], ['Revenue', rm(sum('revenue'))]]
      : [['Visitors', num(sum('visitors'))], ['AI conversations', num(sum('conversations'))], ['Peak paid subscribers', num(Math.max(0, ...recs.map((r) => Number(r.paidSubs) || 0)))], ['AI cost', `US$${sum('aiCost').toFixed(2)}`]])
      .map(([l, v]) => h('div', { class: 'stat' }, h('b', {}, v), h('span', {}, l)))));

  return h('div', { class: 'stack' }, head, totals,
    weeks.map((wk) => h('section', { class: `card week ${k.open === wk.id ? 'open' : ''}` },
      h('button', { class: 'weekhead', onclick: () => { k.open = k.open === wk.id ? null : wk.id; refresh(); } },
        h('span', {}, h('strong', {}, `Week of ${fmtDay(wk.week)} – ${fmtDay(addDays(wk.week, 6))}`),
          wk.rec ? h('span', { class: 'small dim' }, ` · ${derived(k.product, wk.rec, a.s).map(([l, v]) => `${l} ${v}`).join(' · ')}`) : null),
        chip(...STATUS[wk.status])),
      k.open === wk.id ? (wk.status === 'upcoming' ? h('p', { class: 'dim small mt' }, 'This week has not started yet.') : editor(wk)) : null)));
}

// ─── Career evidence ───
const c = { draft: {}, adding: false };

export function career(a) {
  const dr = c.draft;
  dr.date ??= a.now;
  const MSTATUS = { met: ['Target met', 'green'], missed: ['Missed', 'red'], behind: ['Behind', 'amber'], going: ['In progress', 'blue'], upcoming: ['Upcoming', 'grey'] };

  const months = h('div', { class: 'grid g4' }, a.evMonths.map((m) =>
    h('section', { class: 'card tally' }, h('div', { class: 'spread' }, h('strong', {}, fmtMonth(m.month)), chip(...MSTATUS[m.status])),
      h('div', { class: 'big mt' }, `${m.count} / ${a.s.evidencePerMonth}`), h('div', { class: 'small dim' }, 'entries'))));

  const skillCount = (sk) => a.evidence.filter((e) => e.skill === sk || e.skill2 === sk).length;
  const skills = h('section', { class: 'card' }, h('h2', {}, 'Skills you have proof for'),
    h('div', { class: 'row mt' }, SKILLS.map((sk) => chip(`${sk} · ${skillCount(sk)}`, skillCount(sk) ? 'green' : 'grey'))));

  const submit = () => {
    if (!dr.problem?.trim() || !dr.action?.trim()) return toast('Fill in at least the problem and what you did.', 'bad');
    save('evidence', { id: newId(), date: dr.date, problem: dr.problem.trim(), responsibility: dr.responsibility ?? '', action: dr.action.trim(),
      result: dr.result ?? '', evidence: dr.evidence ?? '', skill: dr.skill ?? '', skill2: dr.skill2 ?? '', useFor: dr.useFor ?? '' });
    c.draft = {}; c.adding = false;
  };
  const text = (key, label, ph, wide = true) => h('label', { class: `field ${wide ? 'wide' : ''}` }, label,
    h('input', { type: 'text', value: dr[key] ?? '', placeholder: ph, oninput: (e) => { dr[key] = e.target.value; } }));

  const form = h('section', { class: 'card' },
    h('div', { class: 'spread' }, h('h2', {}, '＋ Record something you did'),
      !c.adding ? h('button', { class: 'btn primary', onclick: () => { c.adding = true; refresh(); } }, 'Add entry') : null),
    h('p', { class: 'small dim' }, 'Problem → Responsibility → Action → Result → Evidence → Skill. Keep it private and factual.'),
    c.adding ? h('form', { class: 'form mt', onsubmit: (e) => { e.preventDefault(); submit(); } },
      h('label', { class: 'field' }, 'Date', h('input', { type: 'date', value: dr.date, onchange: (e) => { dr.date = e.target.value; } })),
      h('label', { class: 'field' }, 'Main skill', pick(SKILLS, dr.skill ?? '', (v) => { dr.skill = v; }, { placeholder: 'Pick one…' })),
      h('label', { class: 'field' }, 'Second skill', pick(SKILLS, dr.skill2 ?? '', (v) => { dr.skill2 = v; }, { placeholder: 'Optional…' })),
      h('label', { class: 'field' }, 'Use it for', pick(USE_FOR, dr.useFor ?? '', (v) => { dr.useFor = v; }, { placeholder: 'Pick one…' })),
      text('problem', 'The problem', 'e.g. A vendor AI model had no risk assessment before go-live'),
      text('responsibility', 'Your responsibility', 'e.g. PMO lead for the rollout'),
      text('action', 'What you did', 'e.g. Ran a governance checklist workshop with legal and data teams'),
      text('result', 'The result', 'e.g. Assessment signed off; go-live kept on schedule'),
      text('evidence', 'Evidence (where the proof is)', 'e.g. Workshop notes in the shared drive'),
      h('div', { class: 'row wide' }, h('button', { class: 'btn primary', type: 'submit' }, 'Save entry'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { c.adding = false; refresh(); } }, 'Cancel'))) : null);

  const entries = a.evidence.length
    ? a.evidence.map((e) => h('section', { class: 'card evidence' },
        h('div', { class: 'spread' }, h('div', { class: 'row' }, h('strong', {}, fmtDay(e.date)), e.skill ? chip(e.skill, 'green') : null, e.skill2 ? chip(e.skill2, 'grey') : null, e.useFor ? chip(e.useFor, 'gold') : null),
          h('button', { class: 'btn small ghost danger', onclick: () => confirm('Delete this entry?') && remove('evidence', e.id) }, 'Delete')),
        h('dl', { class: 'pars mt' },
          [['Problem', e.problem], ['Responsibility', e.responsibility], ['Action', e.action], ['Result', e.result], ['Evidence', e.evidence]]
            .filter(([, v]) => v).map(([l, v]) => [h('dt', {}, l), h('dd', {}, v)]))))
    : [h('section', { class: 'card' }, empty('No entries yet.', 'Aim for at least two a month. They become your portfolio, CV and salary story.'))];

  return h('div', { class: 'stack' }, months, form, skills, ...entries);
}
