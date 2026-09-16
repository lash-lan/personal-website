// The starting shape of the 2026 plan: every task, fund, budget line and
// setting as it stood on 14 September 2026. The database is filled from this
// once, on the first visit; after that the database is the truth and this file
// is only consulted for the fixed lists (pillars, habits, line items).

export const PLAN_START = '2026-09-14';
export const PLAN_END = '2026-12-31';
export const LAUNCH = '2026-11-15';

export const PHASES = [
  { id: 'P1', name: 'Foundation', start: '2026-09-14', end: '2026-09-30', gate: 'September Gate', gateDate: '2026-09-30',
    criterion: 'Financial architecture established and both products have clearly defined launch requirements.' },
  { id: 'P2', name: 'Build', start: '2026-10-01', end: '2026-10-20', gate: 'October Gate', gateDate: '2026-10-20',
    criterion: 'Both products functionally complete enough for testing.' },
  { id: 'P3', name: 'Test', start: '2026-10-21', end: '2026-11-05', gate: 'Feature Freeze', gateDate: '2026-11-05',
    criterion: 'Tested as a stranger and by trusted testers. Only launch-critical fixes after this point.' },
  { id: 'P4', name: 'Soft Launch', start: '2026-11-06', end: '2026-11-15', gate: '15 November Launch', gateDate: '2026-11-15',
    criterion: 'Blood of Icetear live · Dharmalogist live · Payments live · Marketing begins. This date does not move.' },
  { id: 'P5', name: 'Market & Validate', start: '2026-11-16', end: '2026-12-15', gate: 'Validation Checkpoint', gateDate: '2026-12-15',
    criterion: 'Real traffic, real KPIs, first paying strangers, at least one measured experiment per product.' },
  { id: 'P6', name: 'Review & 2027', start: '2026-12-16', end: '2026-12-31', gate: '31 December Review', gateDate: '2026-12-31',
    criterion: 'All four pillars evaluated, scorecard complete, 2027 strategy written.' },
];

export const PILLARS = [
  { id: 'Programme', icon: '◆', colour: '#b48ef0' },
  { id: 'Finance', icon: '₪', colour: '#e3b341' },
  { id: 'Blood of Icetear', icon: '⚔', colour: '#7fb2ff' },
  { id: 'Dharmalogist', icon: '☸', colour: '#f0a35e' },
  { id: 'Portfolio', icon: '▣', colour: '#6fd0c0' },
  { id: 'Health & Family', icon: '♥', colour: '#ef7b8b' },
  { id: 'Career', icon: '↗', colour: '#9fd36b' },
];

export const STATUSES = ['Not started', 'In progress', 'Blocked', 'Done'];
export const TYPES = ['Task', 'Milestone', 'Ongoing', 'Backlog'];
export const PERCENTS = [0, 10, 25, 50, 75, 90, 100];

const t = (id, pillar, workstream, task, start, end, type = 'Task', critical = false, notes = '') =>
  ({ id, pillar, workstream, task, start: `2026-${start}`, end: `2026-${end}`, type, critical, notes,
     status: 'Not started', pct: 0, updated: '' });

export const TASKS = [
  t('M-01', 'Programme', 'Gate', 'SEPTEMBER GATE: finances established + launch requirements defined', '09-30', '09-30', 'Milestone', true),
  t('M-02', 'Programme', 'Gate', 'OCTOBER GATE: both products functionally complete for testing', '10-20', '10-20', 'Milestone', true),
  t('M-03', 'Programme', 'Gate', 'FEATURE FREEZE: launch-critical fixes only from here', '11-05', '11-05', 'Milestone', true),
  t('M-04', 'Programme', 'Gate', '15 NOV LAUNCH: BoI live, Dharmalogist live, payments live, marketing begins', '11-15', '11-15', 'Milestone', true, 'Does not move because you thought of more features.'),
  t('M-05', 'Programme', 'Gate', 'VALIDATION CHECKPOINT: first paying strangers + measured experiments', '12-15', '12-15', 'Milestone'),
  t('M-06', 'Programme', 'Gate', '31 DEC REVIEW: scorecard complete + 2027 strategy written', '12-31', '12-31', 'Milestone'),

  t('F-01', 'Finance', 'Accounts', 'Open HSBC account (Emergency + Resilience funds)', '09-14', '09-25'),
  t('F-02', 'Finance', 'Accounts', 'Open Wise account (international transfers/currency)', '09-14', '09-25'),
  t('F-03', 'Finance', 'Accounts', 'Reactivate Stripe (payments for both products)', '09-14', '09-22', 'Task', true, 'Blocks B-12 and D-15.'),
  t('F-04', 'Finance', 'Accounts', 'Reactivate Sampath Bank', '09-14', '09-30'),
  t('F-05', 'Finance', 'Accounts', 'Reactivate Luno (access only; do NOT fund)', '09-14', '09-30', 'Task', false, 'Reactivating Luno does not mean funding Luno.'),
  t('F-06', 'Finance', 'Accounts', 'Confirm EPF access', '09-14', '09-19'),
  t('F-07', 'Finance', 'Accounts', 'Confirm MooMoo access + holdings; record market value on Funds', '09-14', '09-19'),
  t('F-08', 'Finance', 'Savings', 'Set up RM1,000 automatic monthly savings transfer', '09-21', '09-30'),
  t('F-09', 'Finance', 'AIGP', 'Confirm AIGP exam cost + payment timing', '09-14', '09-25', 'Task', false, 'Then set the AIGP 31 Dec target on Funds.'),
  t('F-10', 'Finance', 'Admin', 'Begin driving-licence / admin cleanup', '09-21', '09-30'),
  t('F-11', 'Finance', 'Budget', 'Price each recurring subscription individually (replace Budget estimates)', '09-14', '09-20'),
  t('F-12', 'Finance', 'Monthly close', 'Money close: Sep (reconcile, sweep unspent to savings)', '09-28', '09-30'),
  t('F-13', 'Finance', 'AIGP', 'Set AIGP Fund contribution plan (once cost known)', '10-01', '10-10'),
  t('F-14', 'Finance', 'Monthly close', 'Money close: Oct', '10-29', '10-31'),
  t('F-15', 'Finance', 'Monthly close', 'Money close: Nov', '11-28', '11-30'),
  t('F-16', 'Finance', 'Budget', 'Subscription audit: cancel anything not earning its place', '11-16', '11-30'),
  t('F-17', 'Finance', 'Review', 'Dec close + financial review (cash, investments, expenses, savings rate, AIGP, project spend vs revenue)', '12-16', '12-31'),

  t('B-01', 'Blood of Icetear', 'Scope', 'Freeze Trial of Character MVP scope', '09-14', '09-18', 'Task', true),
  t('B-02', 'Blood of Icetear', 'Monetisation', 'Finalise free vs premium model (1 free attempt; premium report + paid attempts)', '09-14', '09-20', 'Task', true),
  t('B-03', 'Blood of Icetear', 'Archetypes', 'Consolidate the 31-archetype framework', '09-14', '09-25', 'Task', true),
  t('B-04', 'Blood of Icetear', 'Archetypes', 'Begin archetype × character mapping (Healthy / Strained / Shadow)', '09-21', '09-30', 'Task', true),
  t('B-05', 'Blood of Icetear', 'Monetisation', 'Define premium report (facets, secondary Calling, H/S/S analysis, character parallels)', '09-21', '09-27', 'Task', true),
  t('B-06', 'Blood of Icetear', 'Payments', 'Design payment journey: free result → offer → pay → premium result', '09-24', '09-30', 'Task', true),
  t('B-07', 'Blood of Icetear', 'Artwork', 'Identify launch-critical artwork list', '09-21', '09-30', 'Task', true),
  t('B-08', 'Blood of Icetear', 'Product', 'Trial of Character operational end-to-end', '10-01', '10-08', 'Task', true),
  t('B-09', 'Blood of Icetear', 'Product', 'Free result: basic archetype, Calling, interpretation, lore intro', '10-01', '10-10', 'Task', true),
  t('B-10', 'Blood of Icetear', 'Product', 'Premium report operational (incl. character parallels)', '10-06', '10-17', 'Task', true),
  t('B-11', 'Blood of Icetear', 'Archetypes', 'Character/archetype database populated (31 archetypes × parallels)', '10-01', '10-17', 'Task', true),
  t('B-12', 'Blood of Icetear', 'Payments', 'Stripe integration (premium report + paid attempts)', '10-08', '10-17', 'Task', true, 'Needs F-03.'),
  t('B-13', 'Blood of Icetear', 'Product', 'User handling (accounts, attempt tracking, result delivery)', '10-05', '10-15', 'Task', true),
  t('B-14', 'Blood of Icetear', 'Artwork', 'Produce launch-critical artwork (trial results, archetypes)', '10-01', '10-20', 'Task', true),
  t('B-15', 'Blood of Icetear', 'Testing', 'Full journey test as a stranger: mobile + desktop', '10-21', '10-27', 'Task', true),
  t('B-16', 'Blood of Icetear', 'Testing', 'Payment tests: success, failure, emails', '10-21', '10-28', 'Task', true),
  t('B-17', 'Blood of Icetear', 'Testing', 'Trusted testers with no explanation; log confusion points', '10-26', '11-02', 'Task', true),
  t('B-18', 'Blood of Icetear', 'Testing', 'Analytics events, broken links, performance', '10-28', '11-03', 'Task', true),
  t('B-19', 'Blood of Icetear', 'Testing', 'Fix launch-critical bugs', '10-28', '11-05', 'Task', true),
  t('B-20', 'Blood of Icetear', 'Launch', 'Landing page + pricing', '11-06', '11-10', 'Task', true),
  t('B-21', 'Blood of Icetear', 'Launch', 'Premium report samples for the sales page', '11-06', '11-10', 'Task', true),
  t('B-22', 'Blood of Icetear', 'Marketing', 'Marketing artwork + social creatives', '11-06', '11-12', 'Task', true),
  t('B-23', 'Blood of Icetear', 'Marketing', 'Launch messaging + basic SEO/discovery', '11-08', '11-13', 'Task', true),
  t('B-24', 'Blood of Icetear', 'Launch', 'Soft launch to initial audience; fix critical issues', '11-12', '11-15', 'Task', true),
  t('B-25', 'Blood of Icetear', 'Marketing', 'Organic content cycle #1: publish, measure', '11-16', '11-30'),
  t('B-26', 'Blood of Icetear', 'Marketing', 'Small experiment #1: attack the biggest drop-off point', '11-23', '12-06'),
  t('B-27', 'Blood of Icetear', 'Marketing', 'Paid experiment (capped, from Project & Scaling Fund)', '12-01', '12-15', 'Task', false, 'Not RM5,000 → Meta Ads → prayer.'),
  t('B-28', 'Blood of Icetear', 'Analytics', 'Enter weekly KPIs (Product KPIs page)', '11-16', '12-31', 'Ongoing'),
  t('B-29', 'Blood of Icetear', 'Review', 'BoI review: traffic, completion, conversion, popular archetypes, revenue', '12-16', '12-23'),
  t('B-30', 'Blood of Icetear', 'Lore backlog', 'Dark Lord Saga', '11-16', '12-31', 'Backlog', false, 'Must not delay Trial commercialisation.'),
  t('B-31', 'Blood of Icetear', 'Lore backlog', 'Red Rangers', '11-16', '12-31', 'Backlog'),
  t('B-32', 'Blood of Icetear', 'Lore backlog', 'Elves', '11-16', '12-31', 'Backlog'),
  t('B-33', 'Blood of Icetear', 'Lore backlog', 'Humans', '11-16', '12-31', 'Backlog'),
  t('B-34', 'Blood of Icetear', 'Lore backlog', 'Beast Lords', '11-16', '12-31', 'Backlog'),
  t('B-35', 'Blood of Icetear', 'Artwork backlog', 'Visual library: characters, scenes, locations, artifacts, houses', '11-16', '12-31', 'Backlog', false, 'Launch-critical art first (B-14).'),

  t('D-01', 'Dharmalogist', 'Content', 'Audit remaining content', '09-14', '09-20', 'Task', true),
  t('D-02', 'Dharmalogist', 'Content', 'Complete content backlog plan', '09-18', '09-25', 'Task', true),
  t('D-03', 'Dharmalogist', 'Monetisation', 'Define free AI allowance', '09-21', '09-25', 'Task', true),
  t('D-04', 'Dharmalogist', 'Monetisation', 'Define Dharmalogist Premium: US$9/month', '09-21', '09-25', 'Task', true),
  t('D-05', 'Dharmalogist', 'AI costs', 'Define OpenRouter usage limits + cost-per-user model', '09-21', '09-27', 'Task', true),
  t('D-06', 'Dharmalogist', 'Payments', 'Design payment journey: free limit → subscribe → pay → continue', '09-24', '09-30', 'Task', true),
  t('D-07', 'Dharmalogist', 'Content', 'Timeline completion', '10-01', '10-14', 'Task', true),
  t('D-08', 'Dharmalogist', 'Content', 'Key Figures completion', '10-01', '10-14', 'Task', true),
  t('D-09', 'Dharmalogist', 'Content', 'Schools of Buddhism completion', '10-05', '10-18', 'Task', true),
  t('D-10', 'Dharmalogist', 'Content', 'Gate 2 completion', '10-08', '10-20', 'Task', true),
  t('D-11', 'Dharmalogist', 'AI', 'Gate 3: Dharmalogist AI development + stabilisation', '10-01', '10-17', 'Task', true),
  t('D-12', 'Dharmalogist', 'Platform', 'User authentication', '10-01', '10-08', 'Task', true),
  t('D-13', 'Dharmalogist', 'AI', 'Usage tracking + free allowance + rate limits', '10-06', '10-13', 'Task', true, 'No genuinely unlimited AI until cost per subscriber is known.'),
  t('D-14', 'Dharmalogist', 'AI costs', 'OpenRouter cost tracking', '10-08', '10-15', 'Task', true),
  t('D-15', 'Dharmalogist', 'Payments', 'Subscription + Stripe: success, failed payment, cancellation', '10-10', '10-20', 'Task', true, 'Needs F-03.'),
  t('D-16', 'Dharmalogist', 'Analytics', 'Basic analytics', '10-14', '10-20', 'Task', true),
  t('D-17', 'Dharmalogist', 'Testing', 'Registration/login + full journey test: mobile + desktop', '10-21', '10-27', 'Task', true),
  t('D-18', 'Dharmalogist', 'Testing', 'Subscription tests: pay, fail, cancel, emails', '10-21', '10-28', 'Task', true),
  t('D-19', 'Dharmalogist', 'Testing', 'AI limit tests + cost per conversation check', '10-24', '10-30', 'Task', true),
  t('D-20', 'Dharmalogist', 'Testing', 'Trusted testers with no explanation; log confusion points', '10-26', '11-02', 'Task', true),
  t('D-21', 'Dharmalogist', 'Testing', 'Fix launch-critical bugs', '10-28', '11-05', 'Task', true),
  t('D-22', 'Dharmalogist', 'Launch', 'Landing page + US$9 pricing page', '11-06', '11-10', 'Task', true),
  t('D-23', 'Dharmalogist', 'Marketing', 'Marketing artwork + social creatives', '11-06', '11-12', 'Task', true),
  t('D-24', 'Dharmalogist', 'Marketing', 'Launch messaging + basic SEO/discovery', '11-08', '11-13', 'Task', true),
  t('D-25', 'Dharmalogist', 'Launch', 'Soft launch to initial audience; fix critical issues', '11-12', '11-15', 'Task', true),
  t('D-26', 'Dharmalogist', 'Marketing', 'Organic content cycle #1: publish, measure', '11-16', '11-30'),
  t('D-27', 'Dharmalogist', 'Marketing', 'Small experiment #1: free-limit / paywall conversion', '11-23', '12-06'),
  t('D-28', 'Dharmalogist', 'Marketing', 'Paid experiment (capped, from Project & Scaling Fund)', '12-01', '12-15'),
  t('D-29', 'Dharmalogist', 'Analytics', 'Enter weekly KPIs (Product KPIs page)', '11-16', '12-31', 'Ongoing'),
  t('D-30', 'Dharmalogist', 'AI costs', 'Set usage caps from real cost-per-subscriber data', '12-01', '12-12'),
  t('D-31', 'Dharmalogist', 'Review', 'Dharmalogist review: traffic, AI engagement, subscribers, MRR, API cost, retention', '12-16', '12-23'),

  t('P-01', 'Portfolio', 'Structure', 'Create portfolio information architecture', '09-21', '09-30'),
  t('P-02', 'Portfolio', 'Build', 'Basic website structure live', '10-01', '10-20'),
  t('P-03', 'Portfolio', 'Content', 'Qualifications page (AIGP, certifications, learning)', '11-16', '12-05'),
  t('P-04', 'Portfolio', 'Content', 'Experience & knowledge pages (AI PM, implementation, governance, PMO)', '11-16', '12-10'),
  t('P-05', 'Portfolio', 'Blog', 'Blog post #1: AI governance / AI project management', '11-16', '11-30'),
  t('P-06', 'Portfolio', 'Blog', 'Blog post #2: lessons from building AI products', '12-01', '12-15'),
  t('P-07', 'Portfolio', 'Case studies', 'Case study: Blood of Icetear', '12-01', '12-15'),
  t('P-08', 'Portfolio', 'Case studies', 'Case study: Dharmalogist', '12-01', '12-15'),
  t('P-09', 'Portfolio', 'Case studies', 'Case study: AI Governance in Project Management', '12-01', '12-15'),
  t('P-10', 'Portfolio', 'Launch', 'Portfolio MVP live', '12-16', '12-31'),

  t('H-01', 'Health & Family', 'System', 'Start using the Daily Log every day', '09-14', '09-16'),
  t('H-02', 'Health & Family', 'Health', 'Back recovery: get cleared before step/squat targets', '09-14', '10-15', 'Ongoing', false, 'Recovery overrides streaks.'),
  t('H-03', 'Health & Family', 'Family', 'Set weekday Mom/brothers + weekend Dad/Mom/brothers time', '09-14', '09-20', 'Task', false, 'Presence, not KPIs.'),
  t('H-04', 'Health & Family', 'Review', 'Monthly personal review: Sep', '09-28', '09-30'),
  t('H-05', 'Health & Family', 'Review', 'Monthly personal review: Oct', '10-29', '10-31'),
  t('H-06', 'Health & Family', 'Review', 'Monthly personal review: Nov', '11-28', '11-30'),
  t('H-07', 'Health & Family', 'Review', 'Year-end personal review (health, walking, strength, nutrition, reading, voice, grooming, family)', '12-16', '12-31'),

  t('C-01', 'Career', 'Evidence', 'Start the Career Evidence log', '09-14', '09-20'),
  t('C-02', 'Career', 'AIGP', 'AIGP study plan + choose exam date', '09-14', '09-30'),
  t('C-03', 'Career', 'AIGP', 'AIGP study (≥15 min/day, tracked in Daily Log)', '10-01', '12-20', 'Ongoing'),
  t('C-04', 'Career', 'AIGP', 'Sit the AIGP exam (preferably by 31 Dec)', '12-01', '12-31'),
  t('C-05', 'Career', 'Evidence', 'Monthly evidence review: Sep', '09-28', '09-30'),
  t('C-06', 'Career', 'Evidence', 'Monthly evidence review: Oct', '10-29', '10-31'),
  t('C-07', 'Career', 'Evidence', 'Monthly evidence review: Nov', '11-28', '11-30'),
  t('C-08', 'Career', 'Strategy', 'Write 2027 salary / job strategy', '12-16', '12-31'),
];

export const HABITS = [
  { id: 'reading', name: 'Reading', target: '≥1 page', icon: '📖' },
  { id: 'voice', name: 'Voice', target: '≥5 minutes', icon: '🎙' },
  { id: 'walking', name: 'Walking', target: '≥5,000 steps (once back permits)', icon: '🚶' },
  { id: 'strength', name: 'Strength', target: '10+ squats (once back permits)', icon: '💪' },
  { id: 'aigp', name: 'AIGP', target: '≥15 minutes study', icon: '🎓' },
  { id: 'nutrition', name: 'Nutrition', target: 'Protein-centred, minimally processed', icon: '🥗' },
  { id: 'care', name: 'Personal care', target: 'Skin + hair + teeth', icon: '🪥' },
  { id: 'family', name: 'Family', target: 'Meaningful contact (weekends: Dad, Mom, brothers)', icon: '👪' },
  { id: 'aunty', name: 'Aunty report', target: 'Daily report sent', icon: '📨' },
];
export const MARKS = [
  { id: 'yes', label: 'Done', glyph: '✓' },
  { id: 'no', label: 'Missed', glyph: '✗' },
  { id: 'rest', label: 'Rest', glyph: '–' },
];
export const BACK = ['Good', 'Stiff', 'Sore', 'Flare-up'];

// The day the balances below were checked against the real accounts.
export const VERIFIED_ON = '2026-09-16';

export const FUNDS = [
  { id: 'Emergency Fund', icon: '🛡', heldAt: 'Maybank Savings', target: 25000, opening: 1000, yearEnd: 5000,
    note: '≈ 6 months of independent living (RM4,000 × 6, rounded up). Dedicated cash only: MooMoo investments, MooMoo cash and EPF are NOT counted towards this target.' },
  { id: 'Investment Fund', icon: '📈', heldAt: 'MooMoo', target: 10000, opening: 10814.34, yearEnd: 10000,
    note: 'Secondary reserve, and only if something genuinely serious happens. The balance is the verified MooMoo account total: shares at market value plus uninvested cash. Market value moves on its own.' },
  { id: 'AIGP Fund', icon: '🎓', heldAt: 'Maybank', target: 5000, opening: 0, yearEnd: 0,
    note: 'Set the 31 Dec target once F-09 confirms the exam cost.' },
  { id: 'Resilience Fund', icon: '🔧', heldAt: 'HSBC (Maybank until opened)', target: 5000, opening: 0, yearEnd: 0,
    note: 'Misc resilience. Never goes to crypto.' },
  { id: 'Project & Scaling Fund', icon: '🚀', heldAt: 'Maybank', target: 5000, opening: 0, yearEnd: 0,
    note: 'Marketing experiments, tools, scaling. Measured spend only.' },
];

export const RECURRING = [
  ['Haircut', 130, false], ['Claude', 95, true], ['ChatGPT', 100, false], ['Canva', 50, true],
  ['YouTube', 20, false], ['RunPod', 150, true], ['OpenRouter', 100, true],
  ["Touch 'n Go / Transport", 245, true], ['Celcom', 40, false], ['Maxis', 120, false],
];

// name, category, group, fund
export const LINE_ITEMS = [
  ['Salary', 'Income', 'Income'], ['Claim', 'Income', 'Income'],
  ['Revenue: Blood of Icetear', 'Income', 'Income'], ['Revenue: Dharmalogist', 'Income', 'Income'],
  ['Other Income', 'Income', 'Income'],
  ['Rent + Utilities', 'Expense', 'Housing'], ['Food', 'Expense', 'Food'],
  ...RECURRING.map(([n]) => [n, 'Expense', 'Recurring']),
  ['Household / Medical / Misc', 'Expense', 'Household'], ['Unplanned / Other', 'Expense', 'Unplanned'],
  ...FUNDS.map((f) => [`${f.id} (Add)`, 'Fund Add', 'Savings', f.id]),
  ...FUNDS.map((f) => [`${f.id} (Spend)`, 'Fund Spend', 'Fund Spend', f.id]),
].map(([name, category, group, fund = '']) => ({ name, category, group, fund }));

export const ACCOUNTS = [
  { id: 'Maybank', purpose: 'Salary, operating account and current emergency savings', standing: 'ACTIVE', action: 'Keep as operating account', task: '' },
  { id: 'MooMoo', purpose: 'Investments and secondary reserve', standing: 'ACTIVE', verified: VERIFIED_ON, action: 'Confirm access + holdings', task: 'F-07' },
  { id: 'EPF', purpose: 'Retirement', standing: 'ACTIVE', verified: VERIFIED_ON, action: 'Confirm access', task: 'F-06' },
  { id: 'HSBC', purpose: 'Future Emergency Fund + Resilience Fund separation', standing: 'TO OPEN', action: 'Open account', task: 'F-01' },
  { id: 'Wise', purpose: 'International transfers and foreign currency', standing: 'TO OPEN', action: 'Open account', task: 'F-02' },
  { id: 'Stripe', purpose: 'Blood of Icetear and Dharmalogist payment processing', standing: 'TO REACTIVATE', priority: true, action: 'Reactivate', task: 'F-03' },
  { id: 'Sampath Bank', purpose: 'Sri Lankan banking / fallback', standing: 'TO REACTIVATE', action: 'Reactivate', task: 'F-04' },
  { id: 'Luno', purpose: 'Speculative crypto account', standing: 'TO REACTIVATE', accessOnly: true, action: 'Reactivate — access only, do not fund', task: 'F-05' },
  { id: "Touch 'n Go", purpose: 'Transport and small daily transactions', standing: 'ACTIVE', action: 'None', task: '' },
];
export const PAY_FROM = [...ACCOUNTS.map((a) => a.id), 'Cash'];

export const SKILLS = ['Communication', 'Coordination', 'Planning', 'AI implementation', 'AI usage', 'AI governance',
  'Tracking/reporting', 'Stakeholder management', 'Managing others', 'Commercial understanding',
  'Decision-making under ambiguity'];
export const USE_FOR = ['Portfolio', 'CV', 'Interview story', 'Salary negotiation'];
export const TRAFFIC = ['Instagram', 'TikTok', 'YouTube', 'Reddit', 'Google search', 'Facebook', 'Direct / word of mouth', 'Paid ads', 'Other'];
export const BOI_DROPOFF = ['Landing page', 'Trial start', 'Mid-trial', 'Free result', 'Premium offer', 'Checkout', 'Not sure yet'];

export const MONTHS = ['2026-09', '2026-10', '2026-11', '2026-12'];

/**
 * What the real accounts said when they were last checked. Three separate
 * pots that are never added together into one "savings" figure:
 *   · Maybank cash is the emergency reserve, and the only liquid one.
 *   · MooMoo is investments plus uninvested cash, held as a secondary reserve.
 *   · EPF is locked retirement money.
 */
export const VERIFIED = {
  moomooTotal: 10814.34,      // total account assets = shares + cash
  moomooInvested: 9596.72,    // market value of the shares alone
  moomooCash: 1217.61,        // uninvested cash sitting in the account
  moomooPL: -1008.02,         // total position profit/loss
  moomooHoldings: 'VOO, SPCX',
  epfTotal: 2431.23,
  epfAccount1: 1823.42,       // Akaun Persaraan
  epfAccount2: 364.69,        // Akaun Sejahtera
  epfAccount3: 243.12,        // Akaun Fleksibel
  epfContributions2026: 1990.00,
  verifiedOn: VERIFIED_ON,
};

export const SETTINGS = {
  goodDay: 70, staleDays: 7, txDays: 3, valueDays: 35, evidencePerMonth: 2,
  savMin: 750, savTarget: 1000, savExcellent: 1250, livingCap: 4000, recurringCap: 1050, price: 9,
  ...VERIFIED,
};

export function budgetMonth() {
  const lines = {};
  for (const li of LINE_ITEMS) {
    if (li.category === 'Fund Spend') continue;
    lines[li.name] = 0;
  }
  Object.assign(lines, { Salary: 5000, 'Rent + Utilities': 1500, Food: 1200, 'Household / Medical / Misc': 250,
    'Emergency Fund (Add)': 1000 });
  for (const [n, amt] of RECURRING) lines[n] = amt;
  return { lines, estimates: RECURRING.filter((r) => r[2]).map((r) => r[0]) };
}

/**
 * One dated record of what every account held, so later checks show movement
 * instead of quietly replacing the last figure.
 */
export function snapshot(date, emergencyCash, v = VERIFIED) {
  return {
    id: date,
    emergencyCash,
    moomooTotal: v.moomooTotal, moomooInvested: v.moomooInvested, moomooCash: v.moomooCash, moomooPL: v.moomooPL,
    epfTotal: v.epfTotal,
    total: Number((Number(emergencyCash) + Number(v.moomooTotal) + Number(v.epfTotal)).toFixed(2)),
  };
}

/** Every record the database starts with, by collection. */
export function seedRecords() {
  return {
    tasks: TASKS.map((x) => ({ ...x })),
    funds: FUNDS.map(({ id, heldAt, target, opening, yearEnd, note }) => ({ id, heldAt, target, opening, yearEnd, note })),
    budget: MONTHS.map((id) => ({ id, ...budgetMonth() })),
    settings: [{ id: 'main', ...SETTINGS }],
    snapshots: [snapshot(VERIFIED_ON, 1000)],
  };
}

export const COLLECTIONS = ['tasks', 'daily', 'weekly', 'transactions', 'kpis', 'evidence', 'budget', 'funds', 'settings', 'accounts', 'snapshots'];
