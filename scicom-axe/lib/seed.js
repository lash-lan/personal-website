'use strict';
/**
 * seed.js — the starting shape of the system the very first time it runs.
 * After that first run everything lives in data/*.json and is edited from the
 * screen, not from here.
 */

/** The eight standing workstreams, in the order they appear down the sidebar. */
const WORKSTREAMS = [
  {
    id: 'resource-admin',
    code: 'RES',
    name: 'Resource Administrative',
    blurb: 'People and equipment: HR/staff matters and ICT/tech resources.',
    colour: '#2563eb',
    hasPolicies: true,
    hasForms: true,
    resourceFolder: 'Administrative resources',
    subcategories: [
      { id: 'hr', name: 'HR / Staff', resourceFolder: 'Administrative resources/HR' },
      { id: 'ict', name: 'ICT / Tech Resources', resourceFolder: 'Administrative resources/ICT' },
    ],
  },
  {
    id: 'governance',
    code: 'GOV',
    name: 'Governance',
    blurb: 'Information security, AI governance, access control and continuity.',
    colour: '#7c3aed',
    hasPolicies: true,
    hasForms: true,
    resourceFolder: 'Governance resources',
    subcategories: [
      { id: 'isms', name: 'ISMS & Information Security' },
      { id: 'ai-gov', name: 'AI Governance' },
      { id: 'access', name: 'Access Control' },
      { id: 'continuity', name: 'Business Continuity' },
    ],
  },
  {
    id: 'project-management',
    code: 'PRJ',
    name: 'Project Management',
    blurb: 'Delivery of active projects: scope, milestones and dependencies.',
    colour: '#0891b2',
    hasPolicies: false,
    hasForms: false,
    subcategories: [
      { id: 'delivery', name: 'Delivery & Milestones' },
      { id: 'risks', name: 'Risks & Dependencies' },
      { id: 'reporting', name: 'Reporting' },
    ],
  },
  {
    id: 'marketing',
    code: 'MKT',
    name: 'Marketing',
    blurb: 'Positioning, collateral, campaigns and events.',
    colour: '#db2777',
    hasPolicies: false,
    hasForms: false,
    subcategories: [
      { id: 'collateral', name: 'Collateral & Content' },
      { id: 'campaigns', name: 'Campaigns' },
      { id: 'events', name: 'Events' },
    ],
  },
  {
    id: 'new-business',
    code: 'NBZ',
    name: 'New Business',
    blurb: 'Pipeline, proposals, pitches and commercial pursuit.',
    colour: '#ea580c',
    hasPolicies: false,
    hasForms: false,
    subcategories: [
      { id: 'pipeline', name: 'Pipeline' },
      { id: 'proposals', name: 'Proposals & RFPs' },
      { id: 'pitches', name: 'Pitches & Demos' },
    ],
  },
  {
    id: 'partners-systems',
    code: 'PTS',
    name: 'New Partners / Systems',
    blurb: 'Onboarding new vendors, partners and platforms.',
    colour: '#059669',
    hasPolicies: false,
    hasForms: false,
    subcategories: [
      { id: 'evaluation', name: 'Evaluation' },
      { id: 'onboarding', name: 'Onboarding' },
      { id: 'integration', name: 'Integration' },
    ],
  },
  {
    id: 'finance',
    code: 'FIN',
    name: 'Department Finances',
    blurb: 'Spend, claims, requisitions and capitalised cost tracking.',
    colour: '#ca8a04',
    hasPolicies: true,
    hasForms: true,
    hasFinance: true,
    resourceFolder: 'Finance resources',
    subcategories: [
      { id: 'spend', name: 'Spend & Subscriptions' },
      { id: 'claims', name: 'Claims & Advances' },
      { id: 'requisitions', name: 'Purchase Requisitions' },
      { id: 'budget', name: 'Budget & Capitalisation' },
    ],
  },
  {
    id: 'ai-advancement',
    code: 'AIA',
    name: 'AI Advancement Initiatives',
    blurb: 'Research, tooling, model work and internal AI capability.',
    colour: '#4f46e5',
    hasPolicies: false,
    hasForms: false,
    subcategories: [
      { id: 'research', name: 'Research & Experiments' },
      { id: 'tooling', name: 'Tooling & Platform' },
      { id: 'enablement', name: 'Enablement & Training' },
    ],
  },
];

/** Statuses used everywhere. `key` is stored; `label` is shown. */
const STATUSES = [
  { key: 'open', label: 'Open', colour: '#64748b' },
  { key: 'in-progress', label: 'In Progress', colour: '#2563eb' },
  { key: 'blocked', label: 'Blocked', colour: '#dc2626' },
  { key: 'completed', label: 'Completed', colour: '#16a34a' },
];

const STAGES = [
  'Not started',
  'Drafting',
  'Internal review',
  'Awaiting approval',
  'Approved — executing',
  'Awaiting third party',
  'Final checks',
  'Done',
];

/** The hard rules the system starts with. Everything here is editable on screen. */
const RULES = [
  {
    id: 'rule-seed-1',
    scope: 'global',
    title: 'Every task must have a deadline',
    text: 'No task is saved without a deadline. If the true deadline is unknown, set a review date and mark the task Blocked with the reason.',
    createdAt: null,
    updatedAt: null,
    source: 'seed',
  },
  {
    id: 'rule-seed-2',
    scope: 'global',
    title: 'Every document gets an internal number',
    text: 'Where the official Scicom document number is not known or there are several copies of the same form, the system assigns an internal number in the form SCAI-<WORKSTREAM>-<TYPE>-<0000>. Quote the internal number in all correspondence until the official number is confirmed.',
    createdAt: null,
    updatedAt: null,
    source: 'seed',
  },
  {
    id: 'rule-seed-3',
    scope: 'finance',
    title: 'Finance entries need invoice, amount, date and card',
    text: 'A finance entry is incomplete unless it records: invoice or reference number, amount and currency, the date, whether it is one-time or a subscription, and which card or account paid it. Incomplete entries are flagged as a concern.',
    createdAt: null,
    updatedAt: null,
    source: 'seed',
  },
  {
    id: 'rule-seed-4',
    scope: 'finance',
    title: 'Flag duplicate and unusual spend',
    text: 'Flag any two non-recurring finance entries with the same vendor and amount within 20 days of each other, any subscription with no charge for two consecutive months, and any single entry above RM 10,000. Recurring subscriptions are not treated as duplicates, because charging the same amount every month is what they are meant to do.',
    createdAt: null,
    updatedAt: null,
    source: 'seed',
  },
  {
    id: 'rule-seed-5',
    scope: 'global',
    title: 'Name who acts next',
    text: 'Every task that is not Completed must name whose action is required next. A task with no named next actor is treated as at risk.',
    createdAt: null,
    updatedAt: null,
    source: 'seed',
  },
];

module.exports = { WORKSTREAMS, STATUSES, STAGES, RULES };
