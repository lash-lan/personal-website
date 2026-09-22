'use strict';
/**
 * ids.js — internal reference numbers.
 *
 * Two different things get numbered:
 *
 *  1. Tasks       RES-T0007        (workstream code + T + running number)
 *  2. Documents   SCAI-RES-FRM-0007
 *                 ^    ^   ^   ^
 *                 |    |   |   running number, never reused
 *                 |    |   kind of document (FRM form, POL policy, INV invoice...)
 *                 |    which workstream it belongs to
 *                 fixed prefix so the number is obviously ours, not Scicom's
 *
 * We use these when the official Scicom document number is unknown, or when
 * there are several copies of the same form and the official number alone
 * cannot tell them apart.
 */

const store = require('./store');

const DOC_KINDS = {
  FRM: 'Form',
  POL: 'Policy / Procedure',
  INV: 'Invoice',
  REQ: 'Requisition',
  CLM: 'Claim',
  MEM: 'Memo / Note',
  RPT: 'Report',
  CON: 'Contract / Agreement',
  OTH: 'Other',
};

function counters() {
  return store.read('counters', {});
}

function nextNumber(key) {
  return store.update('counters', {}, (c) => {
    c[key] = (c[key] || 0) + 1;
    return c[key];
  });
}

function pad(n, width) {
  return String(n).padStart(width, '0');
}

/** RES-T0007 */
function nextTaskRef(workstreamCode) {
  const n = nextNumber(`task:${workstreamCode}`);
  return `${workstreamCode}-T${pad(n, 4)}`;
}

/** SCAI-RES-FRM-0007 */
function nextDocNumber(workstreamCode, kind) {
  const k = DOC_KINDS[kind] ? kind : 'OTH';
  const n = nextNumber(`doc:${workstreamCode}:${k}`);
  return `SCAI-${workstreamCode}-${k}-${pad(n, 4)}`;
}

/** FIN-F0007 — a finance line item. */
function nextFinanceRef() {
  const n = nextNumber('finance');
  return `FIN-F${pad(n, 4)}`;
}

/** Short, collision-resistant internal id for a record (not shown to the user). */
function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = { DOC_KINDS, nextTaskRef, nextDocNumber, nextFinanceRef, uid, counters };
