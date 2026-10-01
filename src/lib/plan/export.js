// Getting your plan out of the plan.
//
// Stage 0 of the V2 redesign, and deliberately the first thing built: nothing
// else should touch the schema until the data can be taken out whole and put
// somewhere safe.
//
// Two rules shape this file.
//
// It reads from the SERVER, not from the copy the page is already holding. A
// backup that quietly saves a stale in-memory snapshot is worse than no backup,
// because you would believe you had one.
//
// It changes NOTHING. No writes, no migration, no normalising, no tidying. The
// JSON contains each record exactly as the database returned it, so restoring
// is a straight write-back rather than an interpretation.

export const EXPORT_VERSION = 1;

/** The schema the records are in today. V2 will stamp daily records with v: 2. */
export const SCHEMA_VERSION = 1;

export const COLLECTION_ORDER = [
  'tasks', 'daily', 'weekly', 'transactions', 'kpis',
  'evidence', 'budget', 'funds', 'settings', 'accounts', 'snapshots',
];

/**
 * Fetch everything from the server, as it is.
 * Throws rather than returning half a backup.
 */
export async function fetchEverything() {
  const res = await fetch('/api/plan/data', { headers: { Accept: 'application/json' } });
  if (res.status === 401) throw new Error('Signed out. Sign in again and retry the export.');
  if (!res.ok) throw new Error(`The server returned ${res.status}. Nothing was exported.`);
  const body = await res.json();
  if (!body || typeof body.collections !== 'object') throw new Error('The server sent something unexpected. Nothing was exported.');
  return body.collections;
}

/** The backup object, exactly as it will be written to the file. */
export function buildBackup(collections) {
  const ordered = {};
  for (const name of COLLECTION_ORDER) ordered[name] = collections[name] ?? [];
  // Anything the server knows about that this build has not heard of is kept
  // too, rather than silently dropped on the floor.
  for (const [name, rows] of Object.entries(collections)) {
    if (!(name in ordered)) ordered[name] = rows;
  }
  const counts = Object.fromEntries(Object.entries(ordered).map(([k, v]) => [k, v.length]));
  return {
    exportVersion: EXPORT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: location.origin,
    counts,
    totalRecords: Object.values(counts).reduce((a, b) => a + b, 0),
    collections: ordered,
  };
}

/**
 * What the file contains, described without revealing what is in it.
 *
 * This is the part you can send me, or paste anywhere, to prove the backup
 * worked: counts, date ranges and a fingerprint, and not one word of content.
 */
export async function summarise(backup, text) {
  const dateRange = (rows, field) => {
    const dates = rows.map((r) => r[field]).filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)).sort();
    return dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : '';
  };
  const c = backup.collections;
  return {
    generatedAt: backup.generatedAt,
    exportVersion: backup.exportVersion,
    schemaVersion: backup.schemaVersion,
    totalRecords: backup.totalRecords,
    counts: backup.counts,
    bytes: text.length,
    fingerprint: await sha256(text),
    ranges: {
      daily: dateRange(c.daily ?? [], 'id'),
      transactions: dateRange(c.transactions ?? [], 'date'),
      evidence: dateRange(c.evidence ?? [], 'date'),
      weekly: dateRange(c.weekly ?? [], 'id'),
      snapshots: dateRange(c.snapshots ?? [], 'id'),
    },
  };
}

/** A fingerprint of the file, so two copies can be compared without opening them. */
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── CSV ────────────────────────────────────────────────────────────────────
//
// One file per thing you might want to read in a spreadsheet. These are for
// looking at; the JSON is the backup. Nested fields are flattened into columns
// here, which loses nothing because the JSON keeps the original shape.

const cell = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (headers, rows) =>
  [headers.join(','), ...rows.map((r) => headers.map((hh) => cell(r[hh])).join(','))].join('\r\n');

/**
 * The habit ids as they exist in the stored records, gathered from the data
 * itself rather than from the current HABITS list, so a habit that is renamed
 * or retired later still exports its history.
 */
const habitIds = (daily) => {
  const seen = new Set();
  for (const d of daily) for (const k of Object.keys(d.marks ?? {})) seen.add(k);
  return [...seen].sort();
};

export function csvFiles(collections) {
  const c = (n) => collections[n] ?? [];
  const daily = [...c('daily')].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const marks = habitIds(daily);

  const files = {};

  files['daily'] = toCsv(
    ['date', ...marks.map((m) => `mark_${m}`), 'steps', 'back', 'notes', 'updatedAt'],
    daily.map((d) => ({
      date: d.id,
      ...Object.fromEntries(marks.map((m) => [`mark_${m}`, d.marks?.[m] ?? ''])),
      steps: d.steps ?? '', back: d.back ?? '', notes: d.notes ?? '',
      updatedAt: iso(d.updatedAt),
    })));

  files['transactions'] = toCsv(
    ['id', 'date', 'item', 'amount', 'account', 'remarks', 'updatedAt'],
    [...c('transactions')].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map((t) => ({ ...t, updatedAt: iso(t.updatedAt) })));

  files['career-evidence'] = toCsv(
    ['id', 'date', 'problem', 'responsibility', 'action', 'result', 'evidence', 'skill', 'skill2', 'useFor', 'updatedAt'],
    [...c('evidence')].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map((e) => ({ ...e, updatedAt: iso(e.updatedAt) })));

  files['tasks'] = toCsv(
    ['id', 'pillar', 'workstream', 'task', 'start', 'end', 'type', 'critical', 'status', 'pct', 'updated', 'notes', 'updatedAt'],
    [...c('tasks')].sort((a, b) => (a.id || '').localeCompare(b.id || ''))
      .map((t) => ({ ...t, updatedAt: iso(t.updatedAt) })));

  files['weekly-reviews'] = toCsv(
    ['sunday', 'done', 'planUpdated', 'moneyChecked', 'kpisEntered', 'safe', 'saved', 'wins', 'blockers', 'top3', 'updatedAt'],
    [...c('weekly')].sort((a, b) => (a.id || '').localeCompare(b.id || ''))
      .map((w) => ({ sunday: w.id, ...w, updatedAt: iso(w.updatedAt) })));

  files['financial-snapshots'] = toCsv(
    ['date', 'emergencyCash', 'moomooTotal', 'moomooInvested', 'moomooCash', 'moomooPL', 'epfTotal', 'total', 'updatedAt'],
    [...c('snapshots')].sort((a, b) => (a.id || '').localeCompare(b.id || ''))
      .map((s) => ({ date: s.id, ...s, updatedAt: iso(s.updatedAt) })));

  // Useful to have, even though they were not asked for: the budget is the
  // only other thing you would have to retype by hand.
  files['budgets'] = toCsv(
    ['month', 'line', 'planned', 'isEstimate'],
    [...c('budget')].sort((a, b) => (a.id || '').localeCompare(b.id || ''))
      .flatMap((b) => Object.entries(b.lines ?? {}).map(([line, planned]) => ({
        month: b.id, line, planned, isEstimate: (b.estimates ?? []).includes(line) ? 'yes' : '',
      }))));

  files['funds'] = toCsv(
    ['fund', 'heldAt', 'target', 'opening', 'yearEnd', 'note'],
    [...c('funds')].map((f) => ({ fund: f.id, ...f })));

  return files;
}

const iso = (ms) => (ms ? new Date(ms).toISOString() : '');

// ─── saving to the device ───────────────────────────────────────────────────

export function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  // Revoked on the next turn of the event loop: Safari needs the URL to still
  // be alive when the click is handled.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const stamp = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
