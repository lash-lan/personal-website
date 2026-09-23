'use strict';
/**
 * settings.js — the handful of facts about you that forms keep asking for.
 *
 * Every Scicom form wants the same things written into it: who is asking, what
 * their job title is, which department, and who signs it off. Typing those
 * again on every form is how mistakes get in. They are kept here once, and
 * filled in automatically.
 *
 * Everything here is editable on the Settings screen. Nothing here is secret —
 * it is a name and a job title, the same things printed on the form itself.
 */

const store = require('./store');

const DEFAULTS = {
  // The person raising the form. Taken from the requestor line of the change
  // request already in the resources folder, and editable.
  requesterName: 'Lashlan Alfred Hemachandra',
  requesterDesignation: 'Specialist – AI Program Office',
  requesterEmail: '',
  requesterMobile: '',
  requesterEmployeeId: '',
  department: 'AI Enterprise Solutions',
  company: 'Scicom (MSC) Bhd',

  // The standing second-level approver. On a change request this is the
  // HOD / L2 (VP/SVP) column, and it is always the same person.
  hodApprover: 'Shefeeque Abdul Rahman',
  hodDesignation: '',

  // Fill the standing names into forms automatically. Turning this off leaves
  // every one of those boxes blank, as if the form had been printed.
  autoFillStandingNames: true,
};

function all() {
  const saved = store.read('settings', () => ({ ...DEFAULTS }));
  // A setting added after this file was first saved still gets its default.
  return { ...DEFAULTS, ...saved };
}

function get(key) {
  return all()[key];
}

/** Change some settings. Unknown keys are ignored rather than stored. */
function patch(changes) {
  const current = all();
  for (const [k, v] of Object.entries(changes || {})) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, k)) continue;
    current[k] = typeof DEFAULTS[k] === 'boolean' ? Boolean(v) : String(v == null ? '' : v).trim();
  }
  store.write('settings', current);
  return current;
}

module.exports = { DEFAULTS, all, get, patch };
