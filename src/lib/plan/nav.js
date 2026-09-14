// The plan's pages, in the order they appear in the menu.
export const NAV = [
  { group: 'Overview', items: [
    { view: 'home', href: '/plan', icon: '◉', label: 'Dashboard', short: 'Home', blurb: 'Where you stand today, and what needs you.' },
    { view: 'gates', href: '/plan/gates', icon: '⛳', label: 'Phases & Gates', blurb: 'Six phases, six gates. 15 November does not move.' },
    { view: 'scorecard', href: '/plan/scorecard', icon: '🏁', label: '31 Dec Scorecard', blurb: 'The objectives for the end of the year, worked out from everything you record.' },
  ] },
  { group: 'Every day', items: [
    { view: 'daily', href: '/plan/daily', icon: '✓', label: 'Daily Check-in', short: 'Today', blurb: 'Two minutes. Tap Done, Missed or Rest for each habit. Rest never counts against you.' },
    { view: 'gantt', href: '/plan/gantt', icon: '▤', label: 'Plan & Gantt', short: 'Plan', blurb: 'Every task from 14 Sep to 31 Dec. Change a status and it saves instantly.' },
    { view: 'weekly', href: '/plan/weekly', icon: '☀', label: 'Sunday Review', blurb: 'Twenty minutes every Sunday. The row turns red if you skip it.' },
  ] },
  { group: 'Money', items: [
    { view: 'money', href: '/plan/money', icon: '＋', label: 'Log Money', short: 'Money', blurb: 'Everything in and out. Pick what it was, type the amount, done.' },
    { view: 'budget', href: '/plan/budget', icon: '▦', label: 'Monthly Budget', blurb: 'The RM5,000 month: RM4,000 living + RM1,000 savings, planned against what really happened.' },
    { view: 'funds', href: '/plan/funds', icon: '🛡', label: 'Funds', blurb: 'The RM50,000 financial structure and how full each pot is.' },
    { view: 'accounts', href: '/plan/accounts', icon: '🏦', label: 'Accounts', blurb: 'Your financial account setup. Each one follows its task in the plan.' },
  ] },
  { group: 'Grow', items: [
    { view: 'kpis', href: '/plan/kpis', icon: '📊', label: 'Product Numbers', blurb: 'From 16 November: what people actually do on Blood of Icetear and the Dharmalogist.' },
    { view: 'career', href: '/plan/career', icon: '↗', label: 'Career Evidence', blurb: 'Work is a training ground, not your identity. Record what you did and what it proves.' },
  ] },
  { group: 'Setup', items: [
    { view: 'settings', href: '/plan/settings', icon: '⚙', label: 'Settings', blurb: 'Thresholds that decide when something is flagged.' },
    { view: 'help', href: '/plan/help', icon: '?', label: 'How it works', blurb: 'The rhythm, in plain words.' },
  ] },
];

export const VIEWS = NAV.flatMap((g) => g.items.map((i) => i.view));
