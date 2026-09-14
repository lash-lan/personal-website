import { h, pick, patch } from './client.js';

export function settings(a) {
  const set = (key) => (v) => patch('settings', 'main', { [key]: Number(v) });
  const choose = (key, label, options, fmt = (x) => x, hint = '') =>
    h('label', { class: 'field' }, label, pick(options.map((o) => ({ value: o, label: fmt(o) })), a.s[key], set(key)), hint ? h('small', { class: 'dim' }, hint) : null);
  const money = (key, label) =>
    h('label', { class: 'field' }, label, h('input', { type: 'number', min: '0', step: '50', value: a.s[key], onchange: (e) => set(key)(e.target.value) }));

  return h('div', { class: 'stack' },
    h('section', { class: 'card' }, h('h2', {}, 'When should the plan nag you?'),
      h('div', { class: 'form mt' },
        choose('staleDays', 'In-progress task needs an update after', [3, 5, 7, 10, 14], (x) => `${x} days`),
        choose('txDays', 'Warn if no money is logged for', [1, 2, 3, 5, 7], (x) => `${x} day${x === 1 ? '' : 's'}`),
        choose('valueDays', 'Investment value needs checking after', [7, 14, 30, 35, 45, 60], (x) => `${x} days`),
        choose('goodDay', 'A “good day” is a check-in score of', [50, 60, 70, 80, 90], (x) => `${x}% or more`),
        choose('evidencePerMonth', 'Career evidence entries per month', [1, 2, 3, 4, 5], (x) => `${x}`))),
    h('section', { class: 'card' }, h('h2', {}, 'Money targets'),
      h('div', { class: 'form mt' },
        money('savMin', 'Savings: minimum acceptable (RM)'),
        money('savTarget', 'Savings: target (RM)'),
        money('savExcellent', 'Savings: excellent month (RM)'),
        money('livingCap', 'Living expenses ceiling (RM)'),
        money('recurringCap', 'Subscriptions & transport cap (RM)'),
        h('label', { class: 'field' }, 'Dharmalogist Premium price (US$ / month)', h('input', { type: 'number', min: '0', step: '1', value: a.s.price, onchange: (e) => set('price')(e.target.value) })))));
}

export function help() {
  const sec = (title, ...body) => h('section', { class: 'card prose' }, h('h2', {}, title), ...body);
  const li = (...x) => h('li', {}, ...x);
  const a = (href, text) => h('a', { href }, text);
  return h('div', { class: 'stack' },
    sec('The idea',
      h('p', {}, 'This is your whole 2026 plan in one private place: the tasks and Gantt chart, your daily habits, your money, your funds and the numbers for both products. It works everything out for you and updates itself as the days pass.'),
      h('p', {}, 'The Dashboard has one job: tell you what needs you. If its banner is red, clear those things first. That is how the plan keeps you honest.')),
    sec('Every day (about 2 minutes)',
      h('ol', {},
        li(a('/plan/daily', 'Daily Check-in'), ': tap Done, Missed or Rest for each habit. You can do it straight from the Dashboard too.'),
        li(a('/plan/money', 'Log Money'), ': add anything you spent or received. Pick what it was from the list and type the amount.'),
        li(a('/plan/gantt', 'Plan & Gantt'), ': if you worked on a task, change its status or %. The date is recorded for you.'))),
    sec('Every Sunday (about 20 minutes)',
      h('ol', {},
        li('Update every task you touched this week.'),
        li('Open your Maybank app and make sure Log Money matches it.'),
        li('From 16 November, enter last week’s numbers on ', a('/plan/kpis', 'Product Numbers'), '.'),
        li('Fill in the week on ', a('/plan/weekly', 'Sunday Review'), ', including whether 15 November is still safe.'))),
    sec('At the end of each month',
      h('ol', {},
        li('Check the month result on ', a('/plan/budget', 'Monthly Budget'), '.'),
        li('Move unspent food money into savings, and log it as “Emergency Fund (Add)”.'),
        li('Check MooMoo and update the value on ', a('/plan/funds', 'Funds'), '.'),
        li('Make sure you have at least two ', a('/plan/career', 'Career Evidence'), ' entries.'))),
    sec('What the colours mean',
      h('ul', {},
        li(h('b', { class: 'redtext' }, 'Red'), ': overdue, missed or blocked. Deal with it now.'),
        li(h('b', { class: 'amber-text' }, 'Amber'), ': slipping. A task that should have started, or one you have not updated in a while.'),
        li(h('b', { style: { color: 'var(--blue)' } }, 'Blue'), ': in progress and on track.'),
        li(h('b', { style: { color: 'var(--green)' } }, 'Green'), ': done or healthy.'),
        li(h('b', { class: 'dim' }, 'Grey'), ': not started yet, and not due yet.'))),
    sec('Money, simply',
      h('ul', {},
        li(h('b', {}, 'Money in'), ' (salary, claims, product revenue) adds to what you have.'),
        li(h('b', {}, 'Spending'), ' is gone.'),
        li(h('b', {}, '“… Fund (Add)”'), ' moves money into a savings pot. It is still yours.'),
        li(h('b', {}, '“… Fund (Spend)”'), ' pays for something out of a pot you already saved.'))),
    sec('On your phone',
      h('p', {}, 'Open this page in Safari or Chrome, then choose “Add to Home Screen”. It will open like an app. You stay signed in for 30 days.')));
}
