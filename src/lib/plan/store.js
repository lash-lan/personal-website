// Where the plan is kept: a small Cloudflare D1 database, bound to this site
// as `PLAN_DB`. Everything lives in one table of JSON records, grouped by
// collection (tasks, daily, transactions…), so adding a new kind of thing to
// track never needs the database itself to change shape.
//
// The table creates itself on first use, and the starting plan is written in
// the same moment, so there is no setup step to remember.

import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../session.js';
import { COLLECTIONS, seedRecords, VERIFIED, VERIFIED_ON, snapshot } from './seed.js';

const MAX_RECORD_CHARS = 20000;

/** Only you may read or change the plan. Locally, the preview is open. */
export async function allowed(cookies) {
  if (import.meta.env.DEV) return true;
  return ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies));
}

export function db() {
  const d = env.PLAN_DB;
  if (!d) throw new Error('The plan database is not connected to this site yet.');
  return d;
}

/**
 * Changes to a database that has already been filled in. Each one runs once,
 * ever, and then the revision number is remembered — so anything you edit
 * afterwards in the pages is never overwritten by a later visit.
 *
 * `merge` adds or replaces the named fields and leaves the rest of the record
 * alone; `set` writes the whole record.
 */
const REVISION = 2;
const REVISIONS = {
  // 16 Sep 2026: real balances, checked against Maybank, MooMoo and EPF.
  2: [
    { op: 'merge', collection: 'funds', id: 'Emergency Fund', data: { opening: 1000, heldAt: 'Maybank Savings' } },
    { op: 'merge', collection: 'funds', id: 'Investment Fund', data: { opening: VERIFIED.moomooTotal, heldAt: 'MooMoo' } },
    { op: 'merge', collection: 'settings', id: 'main', data: { ...VERIFIED } },
    { op: 'merge', collection: 'tasks', id: 'F-06', data: { status: 'Done', pct: 100, updated: VERIFIED_ON, notes: `EPF verified at RM${VERIFIED.epfTotal.toFixed(2)} on 16 Sep 2026.` } },
    { op: 'merge', collection: 'tasks', id: 'F-07', data: { status: 'Done', pct: 100, updated: VERIFIED_ON, notes: `MooMoo total account assets verified at RM${VERIFIED.moomooTotal.toFixed(2)} on 16 Sep 2026.` } },
    { op: 'set', collection: 'snapshots', id: VERIFIED_ON, data: snapshot(VERIFIED_ON, 1000) },
  ],
};

async function applyRevisions(d) {
  const row = await d.prepare(`SELECT data FROM records WHERE collection = 'meta' AND id = 'rev'`).first();
  let at = 0;
  try { at = Number(JSON.parse(row?.data ?? '{}').at) || 0; } catch {}
  if (at >= REVISION) return;

  for (let rev = at + 1; rev <= REVISION; rev++) {
    for (const step of REVISIONS[rev] ?? []) {
      const { id, ...data } = step.data;
      if (step.op === 'merge') {
        const cur = await d.prepare(`SELECT data FROM records WHERE collection = ?1 AND id = ?2`).bind(step.collection, step.id).first();
        if (!cur) continue; // nothing to merge into: the seed already carries these values
        let existing = {};
        try { existing = JSON.parse(cur.data); } catch {}
        await writeRecord(d, step.collection, step.id, { ...existing, ...data });
      } else {
        await writeRecord(d, step.collection, step.id, data);
      }
    }
  }
  await writeRecord(d, 'meta', 'rev', { at: REVISION, on: new Date().toISOString() });
}

const writeRecord = (d, collection, id, data) =>
  d.prepare(
    `INSERT INTO records (collection, id, data, updated_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).bind(collection, id, JSON.stringify(data), Date.now()).run();

let ready = false;

async function ensure(d) {
  if (ready) return;
  await d.prepare(
    `CREATE TABLE IF NOT EXISTS records (
       collection TEXT NOT NULL,
       id TEXT NOT NULL,
       data TEXT NOT NULL,
       updated_at INTEGER NOT NULL,
       PRIMARY KEY (collection, id)
     )`
  ).run();

  const seeded = await d.prepare(`SELECT 1 FROM records WHERE collection = 'meta' AND id = 'seeded'`).first();
  if (!seeded) {
    const now = Date.now();
    const insert = d.prepare(
      `INSERT OR IGNORE INTO records (collection, id, data, updated_at) VALUES (?1, ?2, ?3, ?4)`
    );
    const rows = [];
    for (const [collection, records] of Object.entries(seedRecords())) {
      for (const { id, ...data } of records) rows.push(insert.bind(collection, id, JSON.stringify(data), now));
    }
    rows.push(insert.bind('meta', 'seeded', JSON.stringify({ at: new Date(now).toISOString() }), now));
    rows.push(insert.bind('meta', 'rev', JSON.stringify({ at: REVISION, on: new Date(now).toISOString() }), now));
    // D1 caps how many statements go in one batch; chunk to stay well inside it.
    for (let i = 0; i < rows.length; i += 50) await d.batch(rows.slice(i, i + 50));
  } else {
    await applyRevisions(d);
  }
  ready = true;
}

export async function loadAll() {
  const d = db();
  await ensure(d);
  const { results } = await d.prepare(
    `SELECT collection, id, data, updated_at FROM records WHERE collection != 'meta'`
  ).all();
  const out = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
  for (const r of results) {
    if (!out[r.collection]) continue;
    try {
      out[r.collection].push({ ...JSON.parse(r.data), id: r.id, updatedAt: r.updated_at });
    } catch {}
  }
  return out;
}

export function validate(body) {
  const collection = String(body?.collection ?? '');
  const id = String(body?.id ?? '');
  if (!COLLECTIONS.includes(collection)) return { error: 'Unknown kind of record.' };
  if (!id || id.length > 120) return { error: 'That record has no usable name.' };
  return { collection, id };
}

export async function save(collection, id, data) {
  const clean = { ...(data && typeof data === 'object' ? data : {}) };
  delete clean.id; delete clean.updatedAt;
  const json = JSON.stringify(clean);
  if (json.length > MAX_RECORD_CHARS) throw new Error('That is too much to save in one go.');
  const d = db();
  await ensure(d);
  const now = Date.now();
  await d.prepare(
    `INSERT INTO records (collection, id, data, updated_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).bind(collection, id, json, now).run();
  return { ...clean, id, updatedAt: now };
}

export async function remove(collection, id) {
  const d = db();
  await ensure(d);
  await d.prepare(`DELETE FROM records WHERE collection = ?1 AND id = ?2`).bind(collection, id).run();
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
