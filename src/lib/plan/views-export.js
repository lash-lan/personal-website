// Backup & Export.
//
// Stage 0 of the V2 redesign. Everything here reads; nothing writes. The page
// deliberately shows the receipt — counts, date ranges and a fingerprint —
// because a backup you have not checked is only a hope.

import { h, chip, refresh, toast } from './client.js';
import { fmtDay } from './engine.js';
import {
  fetchEverything, buildBackup, summarise, csvFiles, download, stamp,
  COLLECTION_ORDER, EXPORT_VERSION, SCHEMA_VERSION,
} from './export.js';

const ex = { busy: false, receipt: null, error: '' };

const LABEL = {
  tasks: 'Tasks', daily: 'Daily logs', weekly: 'Sunday reviews', transactions: 'Transactions',
  kpis: 'Product numbers', evidence: 'Career evidence', budget: 'Monthly budgets',
  funds: 'Funds', settings: 'Settings', accounts: 'Account notes', snapshots: 'Financial snapshots',
};

const CSV_LABEL = {
  daily: 'Daily logs', transactions: 'Transactions', 'career-evidence': 'Career evidence',
  tasks: 'Tasks', 'weekly-reviews': 'Sunday reviews', 'financial-snapshots': 'Financial snapshots',
  budgets: 'Monthly budgets', funds: 'Funds',
};

async function runBackup() {
  if (ex.busy) return;
  ex.busy = true; ex.error = ''; refresh();
  try {
    const collections = await fetchEverything();
    const backup = buildBackup(collections);
    const text = JSON.stringify(backup, null, 1);
    ex.receipt = await summarise(backup, text);
    download(`lash-plan-backup-${stamp()}.json`, text);
    toast('Backup downloaded ✓');
  } catch (err) {
    ex.error = err.message || 'The export did not finish.';
    toast(ex.error, 'bad');
  }
  ex.busy = false; refresh();
}

async function runCsv(which) {
  if (ex.busy) return;
  ex.busy = true; ex.error = ''; refresh();
  try {
    const files = csvFiles(await fetchEverything());
    const wanted = which ? { [which]: files[which] } : files;
    for (const [name, text] of Object.entries(wanted)) {
      if (text === undefined) continue;
      download(`lash-plan-${name}-${stamp()}.csv`, text, 'text/csv');
      // A short gap between downloads: browsers block a burst of them.
      await new Promise((r) => setTimeout(r, 350));
    }
    toast(which ? 'Downloaded ✓' : `${Object.keys(files).length} files downloaded ✓`);
  } catch (err) {
    ex.error = err.message || 'The export did not finish.';
    toast(ex.error, 'bad');
  }
  ex.busy = false; refresh();
}

function receiptCard(r) {
  const row = (label, value) => h('div', { class: 'spread small' }, h('span', { class: 'dim' }, label), h('b', {}, value));
  const ranges = Object.entries(r.ranges).filter(([, v]) => v);
  return h('section', { class: 'card' },
    h('h2', {}, 'Your backup receipt'),
    h('p', { class: 'small dim' },
      'This describes the file without showing anything that is in it. It is safe to send to me, ',
      'or to keep beside the backup so you can tell later whether a copy is intact.'),
    h('div', { class: 'stack mt' },
      row('Taken', new Date(r.generatedAt).toLocaleString()),
      row('Total records', String(r.totalRecords)),
      row('File size', `${(r.bytes / 1024).toFixed(1)} KB`),
      row('Export format', `v${r.exportVersion}`),
      row('Schema', `v${r.schemaVersion} (legacy, pre-V2)`)),
    h('h3', { class: 'mt2' }, 'Records by kind'),
    h('div', { class: 'stack mt' }, COLLECTION_ORDER.map((k) =>
      row(LABEL[k] ?? k, String(r.counts[k] ?? 0)))),
    ranges.length ? h('div', {},
      h('h3', { class: 'mt2' }, 'Dates covered'),
      h('div', { class: 'stack mt' }, ranges.map(([k, v]) => row(LABEL[k] ?? k, v)))) : null,
    h('h3', { class: 'mt2' }, 'Fingerprint'),
    h('p', { class: 'small dim' }, 'A SHA-256 of the file. Two copies with the same fingerprint are identical.'),
    h('code', { class: 'fingerprint' }, r.fingerprint),
    h('div', { class: 'row mt' },
      h('button', { class: 'btn small', onclick: () => {
        navigator.clipboard?.writeText(JSON.stringify({ ...r }, null, 1))
          .then(() => toast('Receipt copied ✓'), () => toast('Could not copy.', 'bad'));
      } }, 'Copy receipt')));
}

export function exportView() {
  const names = Object.keys(CSV_LABEL);
  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', {}, 'Back up everything'),
      h('p', { class: 'dim' },
        'One file containing every record in the plan, exactly as the database holds it. ',
        'This is the copy to keep. Nothing is changed, moved or tidied on the way out.'),
      h('p', { class: 'small dim mt' },
        'It is read fresh from the server each time, not from what this page happens to be showing, ',
        'so it cannot quietly save you a stale copy.'),
      h('div', { class: 'row mt' },
        h('button', { class: 'btn primary', disabled: ex.busy || null, onclick: runBackup },
          ex.busy ? 'Working…' : 'Download full backup (JSON)'),
        h('span', { class: 'small dim' }, `lash-plan-backup-${stamp()}.json`)),
      ex.error ? h('p', { class: 'redtext small mt' }, ex.error) : null),

    ex.receipt ? receiptCard(ex.receipt) : null,

    h('section', { class: 'card' },
      h('h2', {}, 'Spreadsheet copies'),
      h('p', { class: 'dim' },
        'For reading and for Amelia. One file per kind of record, with nested fields flattened into columns. ',
        'These are for looking at. The JSON above is the actual backup.'),
      h('div', { class: 'row mt' },
        h('button', { class: 'btn primary', disabled: ex.busy || null, onclick: () => runCsv() },
          ex.busy ? 'Working…' : 'Download all CSVs')),
      h('div', { class: 'stack mt2' }, names.map((n) =>
        h('div', { class: 'spread' },
          h('span', {}, CSV_LABEL[n]),
          h('button', { class: 'btn small ghost', disabled: ex.busy || null, onclick: () => runCsv(n) }, 'CSV'))))),

    h('section', { class: 'card' },
      h('h2', {}, 'Before the V2 changes'),
      h('p', { class: 'dim' },
        'Nothing about the plan has changed yet. This page is the first step, and the only one taken so far: ',
        'the data can now be taken out whole before anything is rebuilt around it.'),
      h('ol', { class: 'steps mt' },
        h('li', {}, 'Download the full backup.'),
        h('li', {}, 'Check the receipt looks right, especially the record counts.'),
        h('li', {}, 'Put the file somewhere that is not this laptop.'),
        h('li', {}, 'Send me the receipt, which contains no private information.')),
      h('p', { class: 'small dim mt' },
        'September stays exactly as it is. It was recorded under the old rules and it keeps them, ',
        'labelled as such, so the historical record still means what it meant at the time.')));
}
