// The page that makes a daily report.
//
// Deliberately thin. All it does is choose a day, say honestly what is and is
// not in that day's record, and hand over a file. The judgement lives in
// daily-report.js and the recording lives on Today, so this page never becomes
// a third place where a day can be edited.

import { h, chip, patch, toast, refresh } from './client.js';
import { fmtDay, fmtDayLong, addDays, pct } from './engine.js';
import { empty } from './ui.js';
import { DOMAINS } from './schema.js';

const ui = { date: null, busy: false };

/** Make the file and hand it to the browser. Shared with the button on Today. */
export async function downloadDailyReport(a, date) {
  const { buildDailyReport } = await import('./daily-report.js');
  const { blob, filename } = await buildDailyReport(a, date, { finances: a.s.dailyPdfFinances !== false });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked a moment later: Safari needs the URL alive while the click runs.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

/** One line per thing the report will carry, so nothing is a surprise. */
function contents(day) {
  const written = (x) => Boolean(String(x || '').trim());
  return [
    [`${day.recorded + day.excused} of ${day.scoredHabits} habits recorded`, day.recorded + day.excused > 0],
    ['Steps', day.steps != null],
    ['Reflection, word for word', written(day.reflection)],
    ['Note about the day, word for word', written(day.notes)],
    ['Family note', written(day.familyNote)],
    ['What you ate', written(day.habits.nutrition?.detail?.note)],
    [`Priorities (${day.priorities.length})`, day.priorities.length > 0],
    ['Kind of day and back', day.context !== 'normal' || Boolean(day.back)],
  ];
}

export function dailyReport(a) {
  const date = ui.date ?? a.now;
  const day = a.days.find((d) => d.date === date);
  const isToday = date === a.now;
  const first = a.days[0]?.date;
  const finances = a.s.dailyPdfFinances !== false;

  const go = async () => {
    if (ui.busy) return;
    ui.busy = true; refresh();
    try {
      const name = await downloadDailyReport(a, date);
      toast(`Saved ${name}`);
    } catch (err) {
      toast(`The report could not be made: ${err.message}`, 'bad');
    } finally {
      ui.busy = false; refresh();
    }
  };

  const picker = h('section', { class: 'card' },
    h('h2', {}, 'Daily report'),
    h('p', { class: 'dim small' },
      'One day as a PDF, written for someone who was not there. It carries your own words exactly as you wrote them, ',
      'the working behind every number, and a note of anything you did not record. You can make one for a day that is ',
      'still running.'),
    h('div', { class: 'daypick mt' },
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Previous day',
        disabled: first && date <= first ? true : null,
        onclick: () => { ui.date = addDays(date, -1); refresh(); } }, '←'),
      h('input', {
        type: 'date', value: date, max: a.now, min: first ?? undefined,
        onchange: (e) => { ui.date = e.target.value || null; refresh(); },
      }),
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Next day',
        disabled: date >= a.now ? true : null,
        onclick: () => { ui.date = addDays(date, 1); refresh(); } }, '→'),
      !isToday ? h('button', { class: 'btn small', type: 'button', onclick: () => { ui.date = null; refresh(); } }, 'Today') : null));

  if (!day) {
    return h('div', { class: 'stack' }, picker,
      h('section', { class: 'card' }, empty('Outside the plan', `${fmtDayLong(date)} is not a day the plan knows about.`)));
  }

  const verdict = {
    untracked: ['Nothing logged', 'grey'],
    partial: ['Partly recorded', 'amber'],
    good: ['A good day', 'green'],
    below: ['Below your bar', 'red'],
  }[day.verdict];

  const preview = h('section', { class: 'card' },
    h('div', { class: 'spread' },
      h('h2', {}, fmtDayLong(date)),
      chip(verdict[0], verdict[1])),
    day.legacy ? h('p', { class: 'dim small mt' }, 'Recorded under the old system. The report says so and explains the difference.') : null,
    isToday ? h('p', { class: 'dim small mt' }, 'Still running. The report will say it was made before the day ended.') : null,
    h('div', { class: 'domain-line mt' }, ...DOMAINS.map((dm) => {
      const d = day.domain[dm.id];
      return h('span', { class: 'dim small' }, `${dm.label}: ${d.score === null ? 'unrecorded' : pct(d.score)}`);
    })),
    h('ul', { class: 'willhave mt' }, ...contents(day).map(([label, has]) =>
      h('li', { class: has ? 'has' : 'hasnt' }, h('span', { class: 'tickmark' }, has ? '✓' : '·'), label))),
    day.unrecorded
      ? h('p', { class: 'dim small mt' },
          `${day.unrecorded} habit${day.unrecorded === 1 ? '' : 's'} left blank. The report will list ${day.unrecorded === 1 ? 'it' : 'them'} as unrecorded rather than counting ${day.unrecorded === 1 ? 'it' : 'them'} against you.`)
      : null,
    h('div', { class: 'row mt' },
      h('button', { class: 'btn primary', type: 'button', disabled: ui.busy || null, onclick: go },
        ui.busy ? 'Making it…' : 'Download PDF'),
      h('span', { class: 'dim small' }, `Saves as daily-${date}.pdf`)));

  const setting = h('section', { class: 'card' },
    h('h2', {}, 'What goes in'),
    h('label', { class: 'toggle mt' },
      h('input', {
        type: 'checkbox', checked: finances || null,
        onchange: (e) => patch('settings', 'main', { dailyPdfFinances: e.target.checked }),
      }),
      h('span', {},
        h('strong', {}, 'Include detailed finances'),
        h('small', { class: 'dim' }, finances
          ? 'Every transaction for the day is listed with its amount, account and note.'
          : 'Only a count and a total go in. No items, accounts or notes.'))),
    h('p', { class: 'dim tiny mt' }, 'This setting applies to every daily report from now on, including the one you save from Today.'));

  return h('div', { class: 'stack' }, picker, preview, setting);
}
