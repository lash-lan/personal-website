// Today.
//
// The screen Lash opens most nights and should be able to close in under a
// minute. Everything here is arranged around that, which mostly means deciding
// what NOT to put on it: no overdue totals, no cumulative missed days, no
// percentage of 114 tasks, no launch countdown, no alert pile. Those still
// exist, one level down, for the days he wants them.
//
// The shape of the day comes before the number. Three domains with a few dots
// each say more at a glance than "74%" does, and a number that moves for two
// different reasons — behaviour and logging — is worse than useless as a
// headline. The score is still there, further down, next to how much of the
// day is actually known.
//
// Optional stays optional. Notes, reflection and context are offered and never
// required. A screen that must be filled in is a screen that gets skipped.

import { h, chip, patch, save, refresh, toast, newId, pick, segmented } from './client.js';
import { HABITS, STATUSES, LINE_ITEMS, PAY_FROM, SKILLS } from './seed.js';
import { fmtDayLong, fmtDay, rm, num, pct, addDays } from './engine.js';
import {
  STATE, STATES, DOMAINS, CARE_PARTS, NUTRITION_ORDER, NUTRITION,
  DAY_CONTEXTS, SUGGEST_EXCUSE, BACK_SUGGESTS, stepBand,
} from './schema.js';
import { empty } from './ui.js';

const ui = { date: null, care: false, quick: null, draft: {}, reflecting: false, context: false };

/** Every write from this screen stamps the record as V2. */
const setDay = (date, fields) => patch('daily', date, { ...fields, v: 2 }, true);

const MARK_BTN = [
  { id: 'done',    label: '✓',  title: 'Done' },
  { id: 'rest',    label: '◐',  title: 'Rest — chose not to today' },
  { id: 'missed',  label: '✗',  title: 'Missed — meant to and did not' },
  { id: 'excused', label: '–',  title: 'Excused — genuinely not applicable today' },
];

/** The four-state control, as small and quick as it can sensibly be. */
function marker(date, id, state, marks) {
  return h('div', { class: 'mk', role: 'group', 'aria-label': 'How did it go?' },
    ...MARK_BTN.map((b) => h('button', {
      class: `mk-b mk-${b.id} ${state === b.id ? 'on' : ''}`,
      type: 'button', title: b.title, 'aria-pressed': state === b.id ? 'true' : 'false',
      onclick: () => setDay(date, { marks: { ...marks, [id]: state === b.id ? '' : b.id } }),
    }, b.label)));
}

// ─── the rows that are not just a marker ────────────────────────────────────

function walkingRow(date, day, marks) {
  const d = day.habits.walking.detail;
  const band = stepBand(d.steps, d.target);
  return h('div', { class: 'hrow' },
    h('div', { class: 'hrow-top' },
      h('div', { class: 'hname' }, h('span', { class: 'hi' }, '🚶'), h('strong', {}, 'Walking')),
      marker(date, 'walking', day.habits.walking.state, marks)),
    h('div', { class: 'hrow-body' },
      h('label', { class: 'stepfield' },
        h('span', { class: 'visually-hidden' }, 'Steps today'),
        h('input', {
          type: 'number', inputmode: 'numeric', min: '0', step: '100',
          placeholder: 'Steps', value: d.steps ?? '',
          onchange: (e) => setDay(date, { steps: e.target.value === '' ? '' : Number(e.target.value) }),
        })),
      d.steps != null
        ? h('span', { class: `stepband ${d.steps >= d.target ? 'at' : ''}` },
            `${num(d.steps)} / ${num(d.target)} · ${band}`)
        : h('span', { class: 'dim small' }, `Target ${num(d.target)}`),
      // Said out loud rather than quietly corrected. Lash decides, and the PDF
      // shows both so it can be argued with later.
      d.inconsistent ? h('span', { class: 'note-flag' }, `Marked ${STATE[day.habits.walking.state].label}, with ${num(d.steps)} steps recorded`) : null));
}

function nutritionRow(date, day) {
  const d = day.habits.nutrition.detail;
  return h('div', { class: 'hrow' },
    h('div', { class: 'hrow-top' },
      h('div', { class: 'hname' }, h('span', { class: 'hi' }, '🥗'), h('strong', {}, 'Nutrition')),
      h('div', { class: 'mk' }, ...NUTRITION_ORDER.map((r) => h('button', {
        class: `mk-b nut-${r} ${d.rating === r ? 'on' : ''}`, type: 'button',
        onclick: () => setDay(date, { nutrition: d.rating === r ? '' : r }),
      }, NUTRITION[r].label)))),
    h('div', { class: 'hrow-body' },
      h('input', {
        type: 'text', class: 'notefield', placeholder: 'What did you eat? (optional)',
        value: d.note ?? '',
        onchange: (e) => setDay(date, { nutritionNote: e.target.value }),
      })),
    d.legacyOnly && day.habits.nutrition.state !== 'unrecorded'
      ? h('p', { class: 'dim tiny' }, 'Recorded before this screen existed, so there is no Good / Mixed / Poor for it.') : null);
}

function careRow(date, day, marks) {
  const d = day.habits.care.detail;
  const parts = d.parts ?? {};
  const done = CARE_PARTS.filter((p) => parts[p.id] === true).length;
  const anyRecorded = CARE_PARTS.some((p) => parts[p.id] != null);
  return h('div', { class: 'hrow' },
    h('div', { class: 'hrow-top' },
      h('button', { class: 'hname as-button', type: 'button', onclick: () => { ui.care = !ui.care; refresh(); } },
        h('span', { class: 'hi' }, '🪥'), h('strong', {}, 'Personal care'),
        // Count and caret share the second line, where the other rows put their
        // target, so the row does not need a width it has not got.
        h('span', { class: 'dim tiny' },
          anyRecorded ? `${done} of ${CARE_PARTS.length}` : `${CARE_PARTS.length} parts`,
          h('span', { class: 'caret' }, ui.care ? ' ▴' : ' ▾'))),
      marker(date, 'care', day.habits.care.state, marks)),
    ui.care ? h('div', { class: 'hrow-body parts' }, ...CARE_PARTS.map((p) => h('button', {
      class: `part ${parts[p.id] === true ? 'on' : parts[p.id] === false ? 'off' : ''}`, type: 'button',
      onclick: () => setDay(date, { care: { ...parts, [p.id]: parts[p.id] === true ? false : parts[p.id] === false ? null : true } }),
    }, parts[p.id] === true ? '✓ ' : parts[p.id] === false ? '✗ ' : '· ', p.label))) : null,
    d.legacyOnly && day.habits.care.state !== 'unrecorded'
      ? h('p', { class: 'dim tiny' }, 'Recorded as one tick before this screen existed, so there is no breakdown for it.') : null);
}

function familyRow(date, day, marks) {
  return h('div', { class: 'hrow' },
    h('div', { class: 'hrow-top' },
      h('div', { class: 'hname' }, h('span', { class: 'hi' }, '👪'), h('strong', {}, 'Family')),
      marker(date, 'family', day.habits.family.state, marks)),
    h('div', { class: 'hrow-body' },
      h('input', {
        type: 'text', class: 'notefield', placeholder: 'Who, and what? (optional)',
        value: day.familyNote ?? '',
        onchange: (e) => setDay(date, { familyNote: e.target.value }),
      })));
}

function plainRow(date, day, id, marks) {
  const hb = day.habits[id];
  return h('div', { class: 'hrow' },
    h('div', { class: 'hrow-top' },
      h('div', { class: 'hname' }, h('span', { class: 'hi' }, hb.icon), h('strong', {}, hb.name),
        h('span', { class: 'dim tiny' }, hb.target)),
      marker(date, id, hb.state, marks)));
}

// ─── a domain ───────────────────────────────────────────────────────────────

function domainCard(date, day, dm, marks) {
  const d = day.domain[dm.id];
  const dots = h('span', { class: 'dots', 'aria-hidden': 'true' },
    ...Array.from({ length: Math.max(d.shape.of, 1) }, (_, i) =>
      h('i', { class: i < d.shape.filled ? 'on' : '' })));
  return h('section', { class: `card domain d-${dm.id}` },
    h('div', { class: 'domain-head' },
      h('h2', {}, dm.label),
      h('div', { class: 'domain-state' }, dots,
        h('span', { class: 'shape-label' }, d.shape.label))),
    h('div', { class: 'hrows' }, ...dm.habits.map((id) =>
      id === 'walking' ? walkingRow(date, day, marks)
        : id === 'nutrition' ? nutritionRow(date, day)
        : id === 'care' ? careRow(date, day, marks)
        : id === 'family' ? familyRow(date, day, marks)
        : plainRow(date, day, id, marks))),
    // Reflection sits with Life but outside its score, which is the honest
    // place for it: worth recording, not a wellbeing behaviour to be marked.
    dm.id === 'life' ? reflectionRow(date, day, marks) : null);
}

function reflectionRow(date, day, marks) {
  const st = day.habits.aunty.state;
  return h('div', { class: 'hrow unscored' },
    h('div', { class: 'hrow-top' },
      h('div', { class: 'hname' }, h('span', { class: 'hi' }, '📨'), h('strong', {}, 'Reflection'),
        h('span', { class: 'dim tiny' }, 'not scored')),
      marker(date, 'aunty', st, marks)),
    h('div', { class: 'hrow-body' },
      ui.reflecting || day.reflection
        ? h('textarea', {
            class: 'notefield', rows: '3', placeholder: 'How was today, in your own words?',
            onchange: (e) => setDay(date, { reflection: e.target.value }),
          }, day.reflection ?? '')
        : h('button', { class: 'btn ghost small', type: 'button', onclick: () => { ui.reflecting = true; refresh(); } },
            'Write a few words')));
}

// ─── quick add ──────────────────────────────────────────────────────────────

function quickAdd(a, date) {
  const close = () => { ui.quick = null; ui.draft = {}; refresh(); };
  const d = ui.draft;

  const expense = () => {
    d.date ??= date; d.account ??= 'Maybank';
    const submit = () => {
      const amount = Number(d.amount);
      if (!d.item) return toast('Pick what it was first.', 'bad');
      if (!(amount > 0)) return toast('Type an amount above zero.', 'bad');
      save('transactions', { id: newId(), date: d.date, item: d.item, amount: Math.round(amount * 100) / 100,
        account: d.account, remarks: d.remarks ?? '' });
      close();
    };
    return h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); submit(); } },
      h('label', { class: 'field wide' }, 'What was it?',
        pick([{ value: '', label: 'Pick one…' }, ...LINE_ITEMS.map((l) => ({ value: l.name, label: l.name }))],
          d.item ?? '', (v) => { d.item = v; })),
      h('label', { class: 'field' }, 'Amount (RM)',
        h('input', { type: 'number', inputmode: 'decimal', min: '0', step: '0.01', placeholder: '0.00',
          oninput: (e) => { d.amount = e.target.value; } })),
      h('label', { class: 'field' }, 'From', pick(PAY_FROM, d.account, (v) => { d.account = v; })),
      h('label', { class: 'field wide' }, 'Note', h('input', { type: 'text', placeholder: 'optional', oninput: (e) => { d.remarks = e.target.value; } })),
      h('div', { class: 'row wide' }, h('button', { class: 'btn primary', type: 'submit' }, 'Save'),
        h('button', { class: 'btn ghost', type: 'button', onclick: close }, 'Cancel')));
  };

  const win = () => {
    d.date ??= date;
    const submit = () => {
      if (!d.problem?.trim() || !d.action?.trim()) return toast('The problem and what you did are enough to start.', 'bad');
      save('evidence', { id: newId(), date: d.date, problem: d.problem.trim(), responsibility: d.responsibility ?? '',
        action: d.action.trim(), result: d.result ?? '', evidence: d.evidence ?? '', skill: d.skill ?? '', skill2: '', useFor: '' });
      close();
    };
    const t = (k, label, ph) => h('label', { class: 'field wide' }, label,
      h('input', { type: 'text', placeholder: ph, oninput: (e) => { d[k] = e.target.value; } }));
    return h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); submit(); } },
      t('problem', 'The problem', 'What needed solving?'),
      t('action', 'What you did', 'Your part in it'),
      t('result', 'The result', 'optional'),
      h('label', { class: 'field wide' }, 'Skill', pick([{ value: '', label: 'optional' }, ...SKILLS.map((s) => ({ value: s, label: s }))], d.skill ?? '', (v) => { d.skill = v; })),
      h('div', { class: 'row wide' }, h('button', { class: 'btn primary', type: 'submit' }, 'Save'),
        h('button', { class: 'btn ghost', type: 'button', onclick: close }, 'Cancel')));
  };

  const note = () => h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); close(); } },
    h('label', { class: 'field wide' }, 'A note about today',
      h('textarea', { rows: '3', placeholder: 'Anything worth remembering',
        onchange: (e) => setDay(date, { notes: e.target.value }) }, a.todayDay?.notes ?? '')),
    h('div', { class: 'row wide' }, h('button', { class: 'btn primary', type: 'submit' }, 'Done')));

  const SHEETS = { expense: ['＋ Expense', expense], win: ['★ Career win', win], note: ['✎ Note', note] };

  return h('section', { class: 'card quick' },
    h('div', { class: 'quick-row' },
      ...Object.entries(SHEETS).map(([k, [label]]) => h('button', {
        class: `btn quick-b ${ui.quick === k ? 'on' : ''}`, type: 'button',
        onclick: () => { ui.quick = ui.quick === k ? null : k; ui.draft = {}; refresh(); },
      }, label))),
    ui.quick ? h('div', { class: 'sheet mt' }, SHEETS[ui.quick][1]()) : null);
}

// ─── today's three ──────────────────────────────────────────────────────────

function priorities(date, day) {
  const list = day.priorities ?? [];
  const write = (next) => setDay(date, { priorities: next.slice(0, 3) });
  const done = list.filter((p) => p.done).length;

  return h('section', { class: 'card' },
    h('div', { class: 'spread' },
      h('h2', {}, 'Today’s three'),
      list.length ? h('span', { class: 'dim small' }, `${done} of ${list.length}`) : null),
    list.length === 0 && !ui.addingP
      ? h('p', { class: 'dim small mt' }, 'Nothing set. Three is the most this holds, on purpose.')
      : null,
    h('div', { class: 'prios mt' }, ...list.map((p, i) => h('div', { class: `prio ${p.done ? 'done' : ''}` },
      h('button', { class: 'tick', type: 'button', 'aria-label': p.done ? 'Mark not done' : 'Mark done',
        onclick: () => write(list.map((x, j) => (j === i ? { ...x, done: !x.done } : x))) }, p.done ? '✓' : ''),
      h('span', { class: 'prio-text' }, p.text),
      h('button', { class: 'x', type: 'button', 'aria-label': 'Remove',
        onclick: () => write(list.filter((_, j) => j !== i)) }, '×')))),
    list.length < 3
      ? h('form', { class: 'addprio mt', onsubmit: (e) => {
          e.preventDefault();
          const v = e.target.querySelector('input').value.trim();
          if (!v) return;
          write([...list, { text: v, done: false }]);
          e.target.reset();
        } },
        h('input', { type: 'text', placeholder: 'Add a priority', maxlength: '90' }),
        h('button', { class: 'btn small', type: 'submit' }, 'Add'))
      : null);
}

// ─── context ────────────────────────────────────────────────────────────────

function contextCard(date, day, marks) {
  const suggestions = [
    ...(SUGGEST_EXCUSE[day.context] ?? []),
    ...(BACK_SUGGESTS[day.back] ?? []),
  ].filter((id, i, arr) => arr.indexOf(id) === i
    && day.habits[id] && !['excused', 'done'].includes(day.habits[id].state));

  return h('section', { class: 'card ctx' },
    h('button', { class: 'ctx-head', type: 'button', onclick: () => { ui.context = !ui.context; refresh(); } },
      h('span', {}, 'How was the day itself?'),
      h('span', { class: 'dim small' },
        day.context !== 'normal' ? capital(day.context) : '', day.back ? ` · back ${day.back.toLowerCase()}` : '',
        day.context === 'normal' && !day.back ? 'Normal' : '', ' ', ui.context ? '▴' : '▾')),
    ui.context ? h('div', { class: 'mt' },
      h('div', { class: 'form' },
        h('label', { class: 'field' }, 'Kind of day',
          pick(DAY_CONTEXTS.map((c) => ({ value: c, label: capital(c) })), day.context, (v) => setDay(date, { context: v }))),
        h('label', { class: 'field' }, 'Back',
          pick([{ value: '', label: 'Not noted' }, ...['Good', 'Stiff', 'Sore', 'Flare-up'].map((b) => ({ value: b, label: b }))],
            day.back, (v) => setDay(date, { back: v })))),
      // A suggestion, never an action. The system helps him make an honest
      // call; it does not make a medical decision on his behalf.
      suggestions.length ? h('div', { class: 'suggest mt' },
        h('p', { class: 'small' },
          `${suggestions.map((id) => day.habits[id].name).join(' and ')} may not be reasonable today. Mark as Excused?`),
        h('div', { class: 'row' },
          h('button', { class: 'btn small', type: 'button',
            onclick: () => setDay(date, { marks: { ...marks, ...Object.fromEntries(suggestions.map((id) => [id, 'excused'])) } }) },
            'Yes, excuse ' + (suggestions.length === 1 ? 'it' : 'them')),
          h('button', { class: 'btn ghost small', type: 'button', onclick: () => { ui.context = false; refresh(); } }, 'No, leave it'))) : null) : null);
}

const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

// ─── the screen ─────────────────────────────────────────────────────────────

export function today(a) {
  const date = ui.date ?? a.now;
  const day = a.days.find((d) => d.date === date) ?? a.days[a.days.length - 1];
  if (!day) return h('div', { class: 'stack' }, h('section', { class: 'card' }, empty('Nothing here yet.', 'Today is outside the dates the plan knows about.')));
  a.todayDay = day;
  const marks = day.rec?.marks ?? {};
  const isToday = date === a.now;

  // One line, in words, instead of a wall of counters.
  const status = day.verdict === 'untracked'
    ? (isToday ? 'Nothing logged yet.' : 'Nothing was logged.')
    : day.verdict === 'partial'
      ? `Partial day — ${day.recorded + day.excused} of ${day.scoredHabits} recorded.`
      : day.verdict === 'good' ? 'A good day.' : 'Below your usual bar.';

  const header = h('section', { class: 'card today-head' },
    h('div', { class: 'spread' },
      h('div', {},
        h('div', { class: 'eyebrow' }, isToday ? 'Today' : fmtDayLong(date)),
        h('h1', {}, isToday ? fmtDayLong(date) : fmtDay(date))),
      h('div', { class: 'daynav' },
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Previous day',
          onclick: () => { ui.date = addDays(date, -1); refresh(); } }, '←'),
        !isToday ? h('button', { class: 'btn small', type: 'button',
          onclick: () => { ui.date = null; refresh(); } }, 'Today') : null,
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Next day',
          disabled: date >= a.now || null,
          onclick: () => { ui.date = addDays(date, 1); refresh(); } }, '→'))),
    h('p', { class: 'status' }, status),
    day.legacy ? chip('Recorded under the old system', 'grey') : null);

  // The number, kept deliberately small and always beside how much is known.
  const detail = h('section', { class: 'card small-print' },
    h('div', { class: 'spread small' },
      h('span', { class: 'dim' }, 'Behaviour'),
      h('b', {}, day.score === null ? 'not scored yet' : pct(day.score))),
    !day.legacy ? h('div', { class: 'spread small' },
      h('span', { class: 'dim' }, 'Recorded'),
      h('b', {}, `${day.recorded + day.excused} of ${day.scoredHabits}`
        + (day.excused ? ` · ${day.excused} excused` : ''))) : null,
    h('div', { class: 'spread small' },
      h('span', { class: 'dim' }, 'Consistency, last 7 days'),
      h('b', {}, a.consistency7?.rate == null ? '—' : `${pct(a.consistency7.rate)} of ${a.consistency7.judged} judged`)));

  return h('div', { class: 'stack today' },
    header,
    ...DOMAINS.map((dm) => domainCard(date, day, dm, marks)),
    contextCard(date, day, marks),
    priorities(date, day),
    isToday ? quickAdd(a, date) : null,
    detail);
}
