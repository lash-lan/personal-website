'use strict';
/**
 * api.js — every question the screen can ask the system, and every change it
 * can make. The browser talks to these addresses; nothing else does.
 */

const fs = require('fs');
const path = require('path');

const store = require('./store');
const ids = require('./ids');
const seed = require('./seed');
const catalog = require('./catalog');
const analysis = require('./analysis');
const rules = require('./rules');
const llm = require('./llm');
const formsLib = require('./forms');
const settings = require('./settings');
const extract = require('./extract');
const intake = require('./intake');
const guidesLib = require('./guides');

const ROOT = path.join(__dirname, '..');

/* ------------------------------------------------------------ collections */

function workstreams() {
  return store.read('workstreams', () =>
    seed.WORKSTREAMS.map((w) => ({ ...w, builtIn: true, archived: false, createdAt: new Date().toISOString() })));
}

function tasks() {
  return store.read('tasks', []);
}

function docs() {
  return store.read('documents', []);
}

function finance() {
  return store.read('finance', []);
}

function masterList() {
  return store.read('masterlist', { name: null, importedAt: null, columns: [], rows: [] });
}

function findWorkstream(id) {
  return workstreams().find((w) => w.id === id);
}

/* ---------------------------------------------------------------- helpers */

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function require_(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new HttpError(400, `${name} is required.`);
  }
  return typeof value === 'string' ? value.trim() : value;
}

const VALID_STATUS = new Set(seed.STATUSES.map((s) => s.key));

function normaliseTask(input, existing) {
  const base = existing || {};
  const t = { ...base };

  if (input.title !== undefined) t.title = require_(input.title, 'Title');
  if (input.workstreamId !== undefined) t.workstreamId = require_(input.workstreamId, 'Workstream');
  if (input.description !== undefined) t.description = String(input.description || '').trim();
  if (input.subcategory !== undefined) t.subcategory = input.subcategory || null;
  if (input.theme !== undefined) t.theme = String(input.theme || '').trim() || null;
  if (input.stage !== undefined) t.stage = input.stage || null;
  if (input.owner !== undefined) t.owner = String(input.owner || '').trim() || null;
  if (input.nextActionBy !== undefined) t.nextActionBy = String(input.nextActionBy || '').trim() || null;
  if (input.priority !== undefined) t.priority = input.priority || 'normal';
  if (input.deadline !== undefined) t.deadline = input.deadline || null;
  if (input.notes !== undefined) t.notes = String(input.notes || '').trim();
  if (input.linkedDocs !== undefined) t.linkedDocs = [].concat(input.linkedDocs || []);
  if (input.blockers !== undefined) {
    t.blockers = [].concat(input.blockers || [])
      .map((b) => (typeof b === 'string' ? { text: b, kind: 'blocker' } : b))
      .filter((b) => b && String(b.text || '').trim())
      .map((b) => ({ text: String(b.text).trim(), kind: b.kind === 'risk' ? 'risk' : 'blocker' }));
  }
  if (input.status !== undefined) {
    const s = String(input.status);
    if (!VALID_STATUS.has(s)) throw new HttpError(400, `Status must be one of: ${[...VALID_STATUS].join(', ')}.`);
    t.status = s;
  }
  return t;
}

function diffSummary(before, after) {
  const watched = ['title', 'status', 'stage', 'deadline', 'owner', 'nextActionBy', 'theme', 'subcategory', 'priority', 'description'];
  const out = [];
  for (const k of watched) {
    const a = before[k] ?? null;
    const b = after[k] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ field: k, from: a, to: b });
  }
  const bb = JSON.stringify(before.blockers || []);
  const ab = JSON.stringify(after.blockers || []);
  if (bb !== ab) out.push({ field: 'blockers', from: before.blockers || [], to: after.blockers || [] });
  return out;
}

/* ----------------------------------------------------------------- routes */

const routes = [];
function on(method, pattern, handler) {
  // Patterns look like '/api/tasks/:id'. Segments starting with ':' capture.
  const parts = pattern.split('/').filter(Boolean);
  routes.push({ method, parts, handler });
}

function match(method, pathname) {
  const given = pathname.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.method !== method || r.parts.length !== given.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < r.parts.length; i++) {
      const p = r.parts[i];
      if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(given[i]);
      else if (p !== given[i]) { ok = false; break; }
    }
    if (ok) return { handler: r.handler, params };
  }
  return null;
}

/* -------------------------------------------------------------- bootstrap */

on('GET', '/api/bootstrap', async () => {
  const ws = workstreams().filter((w) => !w.archived);
  const withCounts = ws.map((w) => {
    const c = catalog.forWorkstream(w);
    const mine = tasks().filter((t) => t.workstreamId === w.id);
    return {
      ...w,
      policyCount: c.policies.length,
      formCount: c.forms.length,
      metrics: analysis.metrics(mine),
    };
  });
  return {
    serverTime: new Date().toISOString(),
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    workstreams: withCounts,
    statuses: seed.STATUSES,
    stages: seed.STAGES,
    docKinds: ids.DOC_KINDS,
    rules: rules.all(),
    llm: await llm.check(),
    masterList: (() => { const m = masterList(); return { name: m.name, importedAt: m.importedAt, columns: m.columns, rowCount: m.rows.length }; })(),
    settings: settings.all(),
  };
});

/* --------------------------------------------------------------- settings */

on('GET', '/api/settings', async () => settings.all());

on('PATCH', '/api/settings', async ({ body }) => settings.patch(body));

on('GET', '/api/time', async () => ({ serverTime: new Date().toISOString() }));

/* ------------------------------------------------------------ workstreams */

on('GET', '/api/workstreams', async () => workstreams());

on('POST', '/api/workstreams', async ({ body }) => {
  const name = require_(body.name, 'Name');
  const list = workstreams();
  const id = (body.id || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (list.some((w) => w.id === id)) throw new HttpError(409, `A workstream called "${name}" already exists.`);
  let code = (body.code || name.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase();
  if (code.length < 2) code = id.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase() || 'NEW';
  let suffix = 1;
  while (list.some((w) => w.code === code)) code = code.slice(0, 2) + (suffix++);

  const ws = {
    id,
    code,
    name,
    blurb: String(body.blurb || '').trim(),
    colour: body.colour || '#475569',
    hasPolicies: Boolean(body.hasPolicies),
    hasForms: Boolean(body.hasForms),
    hasFinance: false,
    resourceFolder: body.hasPolicies || body.hasForms ? `${name} resources` : null,
    subcategories: [].concat(body.subcategories || [])
      .map((s) => (typeof s === 'string' ? { id: s.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: s } : s))
      .filter((s) => s && s.name),
    builtIn: false,
    archived: false,
    createdAt: new Date().toISOString(),
  };
  if (ws.resourceFolder) {
    fs.mkdirSync(path.join(catalog.RESOURCES, ws.resourceFolder, catalog.POLICY_DIR), { recursive: true });
    fs.mkdirSync(path.join(catalog.RESOURCES, ws.resourceFolder, catalog.FORM_DIR), { recursive: true });
  }
  list.push(ws);
  store.write('workstreams', list);
  return ws;
});

on('PATCH', '/api/workstreams/:id', async ({ params, body }) => {
  const list = workstreams();
  const i = list.findIndex((w) => w.id === params.id);
  if (i < 0) throw new HttpError(404, 'Workstream not found.');
  const allowed = ['name', 'blurb', 'colour', 'hasPolicies', 'hasForms', 'subcategories', 'archived'];
  for (const k of allowed) if (body[k] !== undefined) list[i][k] = body[k];
  if (Array.isArray(list[i].subcategories)) {
    list[i].subcategories = list[i].subcategories
      .map((s) => (typeof s === 'string' ? { id: s.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: s } : s))
      .filter((s) => s && s.name);
  }
  // Turning policies or forms on for the first time needs somewhere to put them.
  if ((list[i].hasPolicies || list[i].hasForms) && !list[i].resourceFolder) {
    list[i].resourceFolder = `${list[i].name} resources`;
  }
  if (list[i].resourceFolder) {
    fs.mkdirSync(path.join(catalog.RESOURCES, list[i].resourceFolder, catalog.POLICY_DIR), { recursive: true });
    fs.mkdirSync(path.join(catalog.RESOURCES, list[i].resourceFolder, catalog.FORM_DIR), { recursive: true });
  }
  list[i].updatedAt = new Date().toISOString();
  store.write('workstreams', list);
  return list[i];
});

on('GET', '/api/workstreams/:id/resources', async ({ params }) => {
  const ws = findWorkstream(params.id);
  if (!ws) throw new HttpError(404, 'Workstream not found.');
  return catalog.forWorkstream(ws);
});

on('GET', '/api/workstreams/:id/dashboard', async ({ params, query }) => {
  const ws = findWorkstream(params.id);
  if (!ws) throw new HttpError(404, 'Workstream not found.');
  const mine = tasks().filter((t) => t.workstreamId === ws.id);
  const showDone = query.includeCompleted === '1';
  const visible = showDone ? mine : mine.filter((t) => t.status !== 'completed');
  return {
    workstream: ws,
    metrics: analysis.metrics(mine),
    groups: analysis.groupByTheme(visible, ws),
    resources: catalog.forWorkstream(ws),
    rules: rules.all().filter((r) => r.scope === 'global' || r.scope === ws.id),
    documents: docs().filter((d) => d.workstreamId === ws.id),
    guides: guidesLib.forWorkstream(ws.id).map((g) => ({
      id: g.id, title: g.title, subtitle: g.subtitle, subArea: g.subArea || null,
      inOneLine: g.inOneLine, source: g.source || null, stepCount: (g.steps || []).length,
    })),
  };
});

/* ------------------------------------------------------------------ tasks */

on('GET', '/api/tasks', async ({ query }) => {
  let list = tasks();
  if (query.workstream) list = list.filter((t) => t.workstreamId === query.workstream);
  if (query.status) list = list.filter((t) => t.status === query.status);
  if (query.q) {
    const q = query.q.toLowerCase();
    list = list.filter((t) =>
      [t.title, t.description, t.ref, t.theme, t.owner, t.nextActionBy, t.notes]
        .filter(Boolean).join(' ').toLowerCase().includes(q));
  }
  return list;
});

on('POST', '/api/tasks', async ({ body }) => {
  const ws = findWorkstream(require_(body.workstreamId, 'Workstream'));
  if (!ws) throw new HttpError(400, 'That workstream does not exist.');
  const now = new Date().toISOString();
  const t = normaliseTask(body, {
    id: ids.uid('task'),
    ref: ids.nextTaskRef(ws.code),
    status: 'open',
    stage: 'Not started',
    priority: 'normal',
    blockers: [],
    linkedDocs: [],
    description: '',
    notes: '',
    createdAt: now,
    history: [],
  });
  t.updatedAt = now;
  t.history = [{ at: now, what: 'created', detail: `Task created as ${t.ref}.` }];
  const list = tasks();
  list.push(t);
  store.write('tasks', list);
  return t;
});

on('PATCH', '/api/tasks/:id', async ({ params, body }) => {
  const list = tasks();
  const i = list.findIndex((t) => t.id === params.id || t.ref === params.id);
  if (i < 0) throw new HttpError(404, 'Task not found.');
  const before = { ...list[i] };
  const after = normaliseTask(body, list[i]);
  const changes = diffSummary(before, after);
  after.updatedAt = new Date().toISOString();
  if (changes.length) {
    after.history = (after.history || []).concat([{
      at: after.updatedAt,
      what: 'updated',
      detail: changes.map((c) => `${c.field}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`).join('; '),
      changes,
    }]);
  }
  if (body.note) {
    after.history = (after.history || []).concat([{ at: after.updatedAt, what: 'note', detail: String(body.note).trim() }]);
  }
  if (after.status === 'completed' && before.status !== 'completed') after.completedAt = after.updatedAt;
  if (after.status !== 'completed') after.completedAt = null;
  list[i] = after;
  store.write('tasks', list);
  return after;
});

on('DELETE', '/api/tasks/:id', async ({ params }) => {
  const list = tasks();
  const i = list.findIndex((t) => t.id === params.id || t.ref === params.id);
  if (i < 0) throw new HttpError(404, 'Task not found.');
  const [gone] = list.splice(i, 1);
  store.write('tasks', list);
  return { deleted: gone.ref };
});

/* -------------------------------------------------------------- dashboard */

on('GET', '/api/dashboard', async () => {
  const all = tasks();
  const ws = workstreams().filter((w) => !w.archived);
  const wsById = new Map(ws.map((w) => [w.id, w]));
  const live = all.filter((t) => t.status !== 'completed');

  const upcoming = live
    .filter((t) => t.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 40)
    .map((t) => ({
      ...t,
      workstreamName: wsById.get(t.workstreamId)?.name || t.workstreamId,
      workstreamColour: wsById.get(t.workstreamId)?.colour || '#475569',
      daysUntil: analysis.daysUntil(t.deadline),
    }));

  const fin = finance();
  return {
    serverTime: new Date().toISOString(),
    metrics: analysis.metrics(all),
    perWorkstream: ws.map((w) => ({
      id: w.id, name: w.name, colour: w.colour, code: w.code,
      metrics: analysis.metrics(all.filter((t) => t.workstreamId === w.id)),
    })),
    upcoming,
    attention: {
      blocked: live.filter((t) => t.status === 'blocked').length,
      noNextActor: live.filter((t) => !t.nextActionBy).length,
      noDeadline: live.filter((t) => !t.deadline).length,
    },
    finance: { concerns: analysis.financeConcerns(fin, rules.all()).slice(0, 6), summary: analysis.financeSummary(fin) },
  };
});

/* ---------------------------------------------------------------- finance */

on('GET', '/api/finance', async ({ query }) => {
  let list = finance();
  if (query.q) {
    const q = query.q.toLowerCase();
    list = list.filter((r) => Object.values(r).filter((v) => typeof v === 'string').join(' ').toLowerCase().includes(q));
  }
  if (query.month) list = list.filter((r) => r.month === query.month);
  if (query.vendor) list = list.filter((r) => (r.vendor || '').toLowerCase() === query.vendor.toLowerCase());
  return {
    records: list,
    summary: analysis.financeSummary(list),
    concerns: analysis.financeConcerns(finance(), rules.all()),
  };
});

on('POST', '/api/finance', async ({ body }) => {
  const now = new Date().toISOString();
  const rec = {
    id: ids.uid('fin'),
    ref: ids.nextFinanceRef(),
    vendor: require_(body.vendor, 'Vendor'),
    item: body.item || body.vendor,
    company: body.company || null,
    type: body.type || null,
    purpose: body.purpose || null,
    costType: body.costType || null,
    invoiceNo: body.invoiceNo || null,
    card: body.card || null,
    amountUSD: body.amountUSD != null && body.amountUSD !== '' ? Number(body.amountUSD) : null,
    amountRM: body.amountRM != null && body.amountRM !== '' ? Number(body.amountRM) : null,
    fxRate: body.fxRate != null && body.fxRate !== '' ? Number(body.fxRate) : null,
    date: body.date || now.slice(0, 10),
    month: (body.date || now.slice(0, 10)).slice(0, 7),
    accountCode: body.accountCode || null,
    project: body.project || null,
    remark: body.remark || null,
    status: body.status || 'recorded',
    source: 'manual',
    createdAt: now,
  };
  const list = finance();
  list.push(rec);
  store.write('finance', list);
  return rec;
});

/**
 * Throw away every finance record and start again.
 *
 * Everything is copied into data/_backups first, so this can be undone by
 * copying finance.json back out of that folder. The internal FIN- numbering
 * carries on from where it left off rather than restarting, so a number that
 * has already been written on a piece of paper is never handed out twice.
 */
on('POST', '/api/finance/clear', async () => {
  const before = finance().length;
  const savedTo = store.backupAll('before-finance-clear');
  store.write('finance', []);
  return { removed: before, savedTo };
});

on('PATCH', '/api/finance/:id', async ({ params, body }) => {
  const list = finance();
  const i = list.findIndex((r) => r.id === params.id || r.ref === params.id);
  if (i < 0) throw new HttpError(404, 'Finance record not found.');
  const editable = ['vendor', 'company', 'type', 'purpose', 'costType', 'invoiceNo', 'card',
    'amountUSD', 'amountRM', 'fxRate', 'date', 'accountCode', 'project', 'remark', 'status'];
  for (const k of editable) {
    if (body[k] === undefined) continue;
    list[i][k] = ['amountUSD', 'amountRM', 'fxRate'].includes(k)
      ? (body[k] === '' || body[k] == null ? null : Number(body[k]))
      : body[k];
  }
  if (body.date) list[i].month = String(body.date).slice(0, 7);
  list[i].updatedAt = new Date().toISOString();
  store.write('finance', list);
  return list[i];
});

/* -------------------------------------------------------------- documents */

on('GET', '/api/documents', async ({ query }) => {
  let list = docs();
  if (query.workstream) list = list.filter((d) => d.workstreamId === query.workstream);
  if (query.q) {
    const q = query.q.toLowerCase();
    list = list.filter((d) => [d.internalNo, d.officialNo, d.title, d.notes, d.owner]
      .filter(Boolean).join(' ').toLowerCase().includes(q));
  }
  return list;
});

on('POST', '/api/documents', async ({ body }) => {
  const ws = findWorkstream(require_(body.workstreamId, 'Workstream'));
  if (!ws) throw new HttpError(400, 'That workstream does not exist.');
  const kind = ids.DOC_KINDS[body.kind] ? body.kind : 'OTH';
  const now = new Date().toISOString();
  const doc = {
    id: ids.uid('doc'),
    internalNo: ids.nextDocNumber(ws.code, kind),
    workstreamId: ws.id,
    kind,
    kindLabel: ids.DOC_KINDS[kind],
    title: require_(body.title, 'Title'),
    officialNo: body.officialNo || null,
    subject: body.subject || null,
    owner: body.owner || null,
    status: body.status || 'draft',
    taskId: body.taskId || null,
    filePath: body.filePath || null,
    notes: body.notes || '',
    createdAt: now,
    updatedAt: now,
  };
  const list = docs();
  list.push(doc);
  store.write('documents', list);
  return doc;
});

on('PATCH', '/api/documents/:id', async ({ params, body }) => {
  const list = docs();
  const i = list.findIndex((d) => d.id === params.id || d.internalNo === params.id);
  if (i < 0) throw new HttpError(404, 'Document not found.');
  for (const k of ['title', 'officialNo', 'subject', 'owner', 'status', 'taskId', 'notes', 'filePath']) {
    if (body[k] !== undefined) list[i][k] = body[k];
  }
  list[i].updatedAt = new Date().toISOString();
  store.write('documents', list);
  return list[i];
});

/* ------------------------------------------------------------ master list */

on('GET', '/api/masterlist', async ({ query }) => {
  const m = masterList();
  let rows = m.rows;
  if (query.q) {
    const q = query.q.toLowerCase();
    rows = rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q));
  }
  return { ...m, rows, totalRows: m.rows.length };
});

on('POST', '/api/masterlist/import', async ({ body }) => {
  const columns = [].concat(body.columns || []).map(String);
  const incoming = [].concat(body.rows || []);
  if (!columns.length) throw new HttpError(400, 'The file has no column headings.');
  const rows = incoming.map((r, i) => {
    const row = { _id: ids.uid('row'), _n: i + 1 };
    for (const c of columns) row[c] = r[c] == null ? '' : String(r[c]);
    return row;
  });
  const m = {
    name: body.name || 'Master list',
    importedAt: new Date().toISOString(),
    columns,
    rows,
  };
  store.write('masterlist', m);
  return { ...m, rows: m.rows.slice(0, 50), totalRows: m.rows.length };
});

on('PATCH', '/api/masterlist/row/:rowId', async ({ params, body }) => {
  const m = masterList();
  const i = m.rows.findIndex((r) => r._id === params.rowId);
  if (i < 0) throw new HttpError(404, 'Row not found.');
  for (const c of m.columns) if (body[c] !== undefined) m.rows[i][c] = String(body[c]);
  m.rows[i]._updatedAt = new Date().toISOString();
  store.write('masterlist', m);
  return m.rows[i];
});

on('POST', '/api/masterlist/row', async ({ body }) => {
  const m = masterList();
  if (!m.columns.length) throw new HttpError(400, 'Import a master list first.');
  const row = { _id: ids.uid('row'), _n: m.rows.length + 1, _addedAt: new Date().toISOString() };
  for (const c of m.columns) row[c] = body[c] == null ? '' : String(body[c]);
  m.rows.push(row);
  store.write('masterlist', m);
  return row;
});

on('DELETE', '/api/masterlist/row/:rowId', async ({ params }) => {
  const m = masterList();
  const i = m.rows.findIndex((r) => r._id === params.rowId);
  if (i < 0) throw new HttpError(404, 'Row not found.');
  const [gone] = m.rows.splice(i, 1);
  store.write('masterlist', m);
  return { deleted: gone._id };
});

/* -------------------------------------------------------------- hard rules */

on('GET', '/api/rules', async ({ query }) => rules.listFor(query.scope || null));

on('POST', '/api/rules/chat', async ({ body }) => {
  const message = String(body.message || '');
  const ws = workstreams().filter((w) => !w.archived);
  const parsed = rules.parse(message, ws);
  const result = await rules.apply(parsed, { workstreams: ws });
  return { ...result, intent: parsed.intent };
});

/* ------------------------------------------------------------------- forms */

/** Find a catalogued form by its id, whichever workstream it belongs to. */
function findForm(formId) {
  const rel = catalog.decodeId(formId);
  if (!rel) return null;
  for (const ws of workstreams()) {
    for (const f of catalog.forWorkstream(ws).forms) {
      if (f.relPath === rel) return { form: f, workstream: ws };
    }
  }
  return null;
}

on('GET', '/api/forms', async ({ query }) => {
  const out = [];
  for (const ws of workstreams().filter((w) => !w.archived)) {
    if (query.workstream && ws.id !== query.workstream) continue;
    for (const f of catalog.forWorkstream(ws).forms) {
      out.push({
        ...f,
        workstreamId: ws.id,
        workstreamName: ws.name,
        guided: /\.docx$/i.test(f.fillablePath || f.relPath),
      });
    }
  }
  return out;
});

on('GET', '/api/forms/:id/questions', async ({ params }) => {
  const found = findForm(params.id);
  if (!found) throw new HttpError(404, 'That form is not in the system.');
  const abs = catalog.absolutePath(found.form);
  if (!/\.docx$/i.test(abs)) {
    throw new HttpError(400,
      'This one is a spreadsheet, so it cannot be filled in by question and answer yet. Download it and fill it in directly.');
  }
  let set;
  try {
    set = formsLib.questionsFor(abs, found.form.title);
  } catch (err) {
    throw new HttpError(500, `That form could not be read: ${err.message}`);
  }
  // Strip the internal document positions — the screen has no business with them.
  const clean = (q) => ({
    id: q.id,
    kind: q.kind,
    type: q.type,
    question: q.question,
    label: q.label,
    hint: q.hint || null,
    section: q.section || null,
    sectionOwner: q.sectionOwner || null,
    optional: true,
    multi: Boolean(q.multi),
    options: q.options ? q.options.map((o) => ({ value: o.value, label: o.label })) : undefined,
  });
  return {
    form: {
      ...found.form,
      workstreamId: found.workstream.id,
      workstreamName: found.workstream.name,
    },
    questions: set.asked.map(clean),
    autoFilled: set.auto.map((q) => ({ label: q.label, value: q.value, why: q.why })),
    llm: await llm.check(),
  };
});

on('POST', '/api/forms/:id/fill', async ({ params, body }) => {
  const found = findForm(params.id);
  if (!found) throw new HttpError(404, 'That form is not in the system.');
  const abs = catalog.absolutePath(found.form);

  // Every completed form gets an internal number, so it stays tracked even
  // when several copies of it share one official Scicom number.
  const kind = /requisition/i.test(found.form.title) ? 'REQ'
    : /claim/i.test(found.form.title) ? 'CLM' : 'FRM';
  const doc = await routeHandler('POST', '/api/documents', {
    body: {
      workstreamId: found.workstream.id,
      kind,
      title: body.title || found.form.title,
      officialNo: found.form.officialNo || null,
      subject: body.subject || null,
      owner: body.owner || null,
      status: 'draft',
      taskId: body.taskId || null,
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const safe = `${doc.internalNo} ${found.form.title}`
    .replace(/[^A-Za-z0-9 ._-]/g, '').replace(/\s+/g, ' ').trim();
  const fileName = `${safe} ${stamp}.docx`;
  const outPath = path.join(ROOT, 'exports', fileName);

  let result;
  try {
    result = await formsLib.fill(abs, body.answers || {}, {
      outPath,
      formTitle: found.form.title,
      usePolish: body.usePolish !== false,
    });
  } catch (err) {
    throw new HttpError(500, `The form could not be written: ${err.message}`);
  }

  // Note where the file ended up against the document entry.
  const list = docs();
  const i = list.findIndex((d) => d.id === doc.id);
  if (i >= 0) {
    list[i].filePath = fileName;
    store.write('documents', list);
  }

  return {
    document: { ...doc, filePath: fileName },
    downloadUrl: '/exports/' + encodeURIComponent(fileName),
    fileName,
    filled: result.filled,
    polishedCount: result.polishedCount,
  };
});

/* ------------------------------------------------------------------ guides */

on('GET', '/api/guides', async ({ query }) => {
  let list = guidesLib.all();
  if (query.workstream) list = list.filter((g) => g.workstream === query.workstream);
  const wsById = new Map(workstreams().map((w) => [w.id, w]));
  return list.map((g) => ({
    id: g.id,
    title: g.title,
    subtitle: g.subtitle,
    workstream: g.workstream,
    workstreamName: wsById.get(g.workstream)?.name || g.workstream,
    subArea: g.subArea || null,
    inOneLine: g.inOneLine,
    source: g.source || null,
    stepCount: (g.steps || []).length,
  }));
});

on('GET', '/api/guides/:id', async ({ params }) => {
  const g = guidesLib.load(params.id);
  if (!g) throw new HttpError(404, 'There is no guide with that name.');
  return g;
});

/** Build one guide as a Word file and hand back a download link. */
on('POST', '/api/guides/:id/build', async ({ params }) => {
  const g = guidesLib.load(params.id);
  if (!g) throw new HttpError(404, 'There is no guide with that name.');
  const fileName = `${g.title} — a guide for new joiners.docx`.replace(/[\\/:*?"<>|]/g, '-');
  const outPath = path.join(ROOT, 'exports', fileName);
  try {
    guidesLib.build(g, outPath);
  } catch (err) {
    throw new HttpError(500, `That guide could not be written: ${err.message}`);
  }
  return { fileName, downloadUrl: '/exports/' + encodeURIComponent(fileName) };
});

/** Build every guide at once — the whole new-joiner pack. */
on('POST', '/api/guides/build-all', async ({ body }) => {
  const list = body && body.workstream
    ? guidesLib.forWorkstream(body.workstream)
    : guidesLib.all();
  const built = [];
  const failed = [];
  for (const g of list) {
    const fileName = `${g.title} — a guide for new joiners.docx`.replace(/[\\/:*?"<>|]/g, '-');
    try {
      guidesLib.build(g, path.join(ROOT, 'exports', fileName));
      built.push({ id: g.id, title: g.title, fileName, downloadUrl: '/exports/' + encodeURIComponent(fileName) });
    } catch (err) {
      failed.push({ id: g.id, title: g.title, error: err.message });
    }
  }
  return { built, failed, folder: 'scicom-axe/exports' };
});

/* -------------------------------------------------------------------- llm */

on('GET', '/api/llm', async () => llm.check(true));

on('POST', '/api/llm/polish', async ({ body }) => {
  const out = await llm.polish(String(body.text || ''), { field: body.field, formName: body.formName, maxWords: body.maxWords });
  return out;
});

/* ---------------------------------------------------------------- backups */

/* ---------------------------------------------------------------- uploads */

/**
 * The uploader.
 *
 * An uploaded file is kept exactly as it arrived, in the `uploads` folder, and
 * a proposal is worked out from it. Nothing is written into the finance
 * records, the master list or the documents register until a separate, second
 * request says so — so an amount read wrongly off a scan is something you
 * correct on screen, not something you discover in your accounts later.
 */

const UPLOAD_DIR = path.join(ROOT, 'uploads');

function uploads() {
  return store.read('uploads', []);
}

function uploadPath(rec) {
  return path.join(UPLOAD_DIR, rec.savedAs);
}

/** A filename safe on every operating system, that still reads like the original. */
function safeName(original) {
  const ext = path.extname(original).toLowerCase().slice(0, 12);
  const base = path.basename(original, path.extname(original))
    .replace(/[^A-Za-z0-9 ._-]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70) || 'file';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${stamp}-${base}${ext}`;
}

function knownVendors() {
  return [...new Set(finance().map((r) => r.vendor).filter(Boolean))];
}

on('GET', '/api/uploads', async () => uploads().slice().reverse());

on('POST', '/api/uploads', async ({ body }) => {
  const filename = require_(body.filename, 'File name');
  const raw = require_(body.dataBase64, 'File contents');
  const buf = Buffer.from(String(raw).replace(/^data:[^,]*,/, ''), 'base64');
  if (!buf.length) throw new HttpError(400, 'That file arrived empty.');

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const savedAs = safeName(filename);
  fs.writeFileSync(path.join(UPLOAD_DIR, savedAs), buf);

  const extraction = extract.extract(filename, buf);
  const proposal = await intake.propose(filename, extraction, { knownVendors: knownVendors() });

  const rec = {
    id: ids.uid('up'),
    filename,
    savedAs,
    size: buf.length,
    kind: extraction.kind,
    readable: extraction.readable,
    target: proposal.target,
    confidence: proposal.confidence,
    status: 'proposed',
    uploadedAt: new Date().toISOString(),
    applied: null,
  };
  const list = uploads();
  list.push(rec);
  store.write('uploads', list);

  return { upload: rec, proposal, excerpt: (extraction.text || '').slice(0, 4000) };
});

/** Look at an upload again — the file is still there, so it is read afresh. */
on('GET', '/api/uploads/:id', async ({ params }) => {
  const rec = uploads().find((u) => u.id === params.id);
  if (!rec) throw new HttpError(404, 'That upload is not in the system.');
  const abs = uploadPath(rec);
  if (!fs.existsSync(abs)) throw new HttpError(404, 'The file itself is no longer in the uploads folder.');
  const buf = fs.readFileSync(abs);
  const extraction = extract.extract(rec.filename, buf);
  const proposal = await intake.propose(rec.filename, extraction, { knownVendors: knownVendors() });
  return { upload: rec, proposal, excerpt: (extraction.text || '').slice(0, 4000) };
});

/**
 * Save what was proposed, after you have checked it.
 *
 * Whatever the screen sends is what gets written — the figures you can see,
 * not the ones the system first guessed at.
 */
on('POST', '/api/uploads/:id/apply', async ({ params, body }) => {
  const list = uploads();
  const i = list.findIndex((u) => u.id === params.id);
  if (i < 0) throw new HttpError(404, 'That upload is not in the system.');
  const rec = list[i];
  const target = body.target || rec.target;
  const written = { finance: [], documents: [], masterListRows: 0, tasks: [] };

  if (target === 'finance') {
    const rows = [].concat(body.records || (body.fields ? [body.fields] : []));
    if (!rows.length) throw new HttpError(400, 'There is nothing to save — every row was left out.');
    for (const row of rows) {
      const created = await routeHandler('POST', '/api/finance', { body: { ...row, vendor: row.vendor || rec.filename } });
      created.sourceUploadId = rec.id;
      created.sourceFile = rec.filename;
      created.source = 'uploaded';
      written.finance.push(created);
    }
    // Stamp the source onto the records just written.
    const fin = finance();
    for (const c of written.finance) {
      const f = fin.find((x) => x.id === c.id);
      if (f) Object.assign(f, { sourceUploadId: rec.id, sourceFile: rec.filename, source: 'uploaded' });
    }
    store.write('finance', fin);
  } else if (target === 'masterlist') {
    const columns = [].concat(body.columns || []);
    const rows = [].concat(body.rows || []);
    if (!columns.length) throw new HttpError(400, 'No column headings were given for the master list.');
    const imported = await routeHandler('POST', '/api/masterlist/import', {
      body: { columns, rows, name: body.name || rec.filename },
    });
    written.masterListRows = imported.totalRows;
  } else if (target === 'document') {
    const doc = await routeHandler('POST', '/api/documents', {
      body: {
        workstreamId: require_(body.workstreamId, 'Workstream'),
        kind: body.kindCode || 'OTH',
        title: body.title || rec.filename,
        officialNo: body.officialNo || null,
        subject: body.subject || null,
        status: 'received',
        filePath: path.join('uploads', rec.savedAs),
        notes: body.notes || `Uploaded on ${new Date().toLocaleDateString('en-GB')}.`,
      },
    });
    written.documents.push(doc);
  } else {
    throw new HttpError(400, `"${target}" is not something this can be saved as.`);
  }

  if (body.createTask && body.createTask.title) {
    const task = await routeHandler('POST', '/api/tasks', {
      body: {
        ...body.createTask,
        workstreamId: body.createTask.workstreamId || body.workstreamId,
        linkedDocs: written.documents.map((d) => d.internalNo),
      },
    });
    written.tasks.push(task);
  }

  rec.status = 'applied';
  rec.target = target;
  rec.applied = {
    at: new Date().toISOString(),
    financeRefs: written.finance.map((f) => f.ref),
    documentNos: written.documents.map((d) => d.internalNo),
    masterListRows: written.masterListRows,
    taskRefs: written.tasks.map((t) => t.ref),
  };
  store.write('uploads', list);

  return { upload: rec, written };
});

/** Put an upload aside without recording anything from it. */
on('POST', '/api/uploads/:id/dismiss', async ({ params }) => {
  const list = uploads();
  const rec = list.find((u) => u.id === params.id);
  if (!rec) throw new HttpError(404, 'That upload is not in the system.');
  rec.status = 'set aside';
  store.write('uploads', list);
  return rec;
});

/** Forget an upload entirely, and delete the file with it. */
on('DELETE', '/api/uploads/:id', async ({ params }) => {
  const list = uploads();
  const i = list.findIndex((u) => u.id === params.id);
  if (i < 0) throw new HttpError(404, 'That upload is not in the system.');
  const [rec] = list.splice(i, 1);
  try { fs.unlinkSync(uploadPath(rec)); } catch { /* already gone */ }
  store.write('uploads', list);
  return { removed: rec.filename };
});

on('POST', '/api/backup', async () => ({ savedTo: store.backupAll('manual') }));

/** Call one of the routes above from inside another one. */
async function routeHandler(method, pathname, ctx) {
  const r = match(method, pathname);
  if (!r) throw new HttpError(500, `Internal route missing: ${method} ${pathname}`);
  return r.handler({ params: r.params, query: {}, body: {}, ...ctx });
}

module.exports = { match, HttpError, workstreams, tasks, docs, finance, masterList, ROOT };
