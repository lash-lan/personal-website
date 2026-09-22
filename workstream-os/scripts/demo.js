#!/usr/bin/env node
'use strict';
/**
 * demo.js — puts a handful of example tasks in, so the screens have something
 * to show while you are deciding whether you like them.
 *
 *   node scripts/demo.js add      add the examples
 *   node scripts/demo.js clear    take every example back out again
 *
 * Examples are tagged `demo: true`, so clearing them cannot touch anything you
 * typed in yourself.
 */

const store = require('../lib/store');
const ids = require('../lib/ids');
const seedWs = require('../lib/seed');

const BASE = 'http://127.0.0.1:4173';

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const EXAMPLES = [
  ['resource-admin', 'hr', 'Consultant onboarding', 'Raise Consultant Requisition for the new NLP consultant',
    'in-progress', 'Awaiting approval', 3, 'Lashlan', 'Edmund (HoD sign-off)', []],
  ['resource-admin', 'hr', 'Consultant onboarding', 'Collect signed Consultant Action Form for Tatiana extension',
    'blocked', 'Awaiting third party', -2, 'Lashlan', 'Tatiana', ['Waiting on the signed copy coming back from the consultant']],
  ['resource-admin', 'hr', 'Probation & confirmation', 'Imran performance assessment — confirmation review',
    'open', 'Not started', 12, 'Lashlan', 'Line manager', []],
  ['resource-admin', 'ict', 'Access management', 'Physical access card request for level 26 — two new joiners',
    'in-progress', 'Drafting', 5, 'Lashlan', 'ICT helpdesk', []],
  ['resource-admin', 'ict', 'Access management', 'AWS local administration rights request for the dev team',
    'open', 'Not started', 9, 'Adha', 'CTO approval', []],

  ['governance', 'ai-gov', 'AI governance rollout', 'Map current AI tooling against the AI Governance Framework',
    'in-progress', 'Internal review', 8, 'Lashlan', 'ISMS manager', []],
  ['governance', 'isms', 'ISMS controls', 'Annual review of ISMS control effectiveness criteria',
    'open', 'Not started', 25, 'Lashlan', 'ISMS representative', []],
  ['governance', 'access', 'Access control list', 'Refresh the Access Control List for the AIES platform',
    'blocked', 'Awaiting approval', 1, 'Lashlan', 'Head of department',
    ['ACL spreadsheet is out of date — waiting on ICT export', 'Two leavers still hold active accounts']],

  ['project-management', 'delivery', 'AIES delivery', 'Agent Assist phase 2 — milestone review with the vendor',
    'in-progress', 'Approved — executing', 6, 'Lashlan', 'Vendor', []],
  ['project-management', 'risks', 'AIES delivery', 'Close out the open dependency on the Asterisk foundation build',
    'open', 'Not started', 18, 'Lashlan', 'Engineering', []],

  ['marketing', 'collateral', 'Capability deck', 'Refresh the AI capability one-pager for client meetings',
    'open', 'Drafting', 14, 'Lashlan', 'Lashlan', []],
  ['new-business', 'proposals', 'Q4 pipeline', 'Draft the AI managed-services proposal for the telco RFP',
    'in-progress', 'Drafting', 4, 'Lashlan', 'Commercial', []],
  ['partners-systems', 'evaluation', 'Vendor evaluation', 'Evaluate Langfuse vs Future AGI for model observability',
    'open', 'Not started', 21, 'Lashlan', 'Lashlan', []],

  ['finance', 'spend', 'Subscription clean-up', 'Reconcile Crayon Azure charges against the account codes',
    'in-progress', 'Internal review', 2, 'Lashlan', 'Finance', []],
  ['finance', 'claims', 'Claims', 'Submit the outstanding expenses claim for the August travel',
    'open', 'Not started', 7, 'Lashlan', 'Lashlan', []],
  ['finance', 'budget', 'FY2026 capitalisation', 'Confirm which AI costs are capitalised versus expensed for FY2026',
    'blocked', 'Awaiting approval', -5, 'Lashlan', 'Group finance',
    ['Group finance has not confirmed the capitalisation treatment']],

  ['ai-advancement', 'tooling', 'Local model capability', 'Stand up a local inference option to cut per-call API spend',
    'in-progress', 'Approved — executing', 11, 'Lashlan', 'Lashlan', []],
  ['ai-advancement', 'enablement', 'Team enablement', 'Run the AI Use at Work briefing for the wider department',
    'open', 'Not started', 16, 'Lashlan', 'Lashlan', []],
];

function workstreams() {
  return store.read('workstreams', () =>
    seedWs.WORKSTREAMS.map((w) => ({ ...w, builtIn: true, archived: false, createdAt: new Date().toISOString() })));
}

function add() {
  const ws = workstreams();
  const list = store.read('tasks', []);
  const now = new Date().toISOString();
  let n = 0;

  for (const [wsId, sub, theme, title, status, stage, due, owner, next, blockers] of EXAMPLES) {
    const w = ws.find((x) => x.id === wsId);
    if (!w) continue;
    if (list.some((t) => t.title === title)) continue;
    list.push({
      id: ids.uid('task'),
      ref: ids.nextTaskRef(w.code),
      demo: true,
      workstreamId: wsId,
      subcategory: sub,
      theme,
      title,
      description: '',
      status,
      stage,
      priority: 'normal',
      deadline: daysFromNow(due),
      owner,
      nextActionBy: next,
      blockers: blockers.map((t) => ({ text: t, kind: 'blocker' })),
      linkedDocs: [],
      notes: '',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      history: [{ at: now, what: 'created', detail: 'Example task added by scripts/demo.js.' }],
    });
    n++;
  }
  store.write('tasks', list);
  console.log(`Added ${n} example tasks.`);
  console.log('Remove them at any time with:  node scripts/demo.js clear');
}

function clearDemo() {
  const list = store.read('tasks', []);
  const kept = list.filter((t) => !t.demo);
  store.write('tasks', kept);
  console.log(`Removed ${list.length - kept.length} example tasks. ${kept.length} of your own tasks kept.`);
}

const cmd = process.argv[2];
if (cmd === 'add') add();
else if (cmd === 'clear') clearDemo();
else {
  console.log('Usage:\n  node scripts/demo.js add     put the example tasks in');
  console.log('  node scripts/demo.js clear   take the example tasks back out');
}
