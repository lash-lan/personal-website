/* Scicom Axe — the whole screen, in one file.
   Written as plain JavaScript so it runs straight from the folder with no
   build step and no downloaded packages. */

/* ------------------------------------------------------ tiny helpers */

/** Build an element. h('div.card', {onclick}, 'text', child, …) */
function h(spec, props, ...kids) {
  const [tagAndId, ...classes] = String(spec).split('.');
  const [tag, id] = tagAndId.split('#');
  const el = document.createElement(tag || 'div');
  if (id) el.id = id;
  if (classes.length) el.className = classes.join(' ');
  // The second argument is a bag of properties only if it is a plain object.
  // Anything else — including the number 0 and an empty string — is a child.
  const isProps = props !== null && props !== undefined
    && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props);
  if (!isProps) {
    if (props !== undefined) kids.unshift(props);
  } else {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = (el.className ? el.className + ' ' : '') + v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list' && typeof v !== 'object') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  const add = (k) => {
    if (k === null || k === undefined || k === false) return;
    if (Array.isArray(k)) return k.forEach(add);
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  };
  kids.forEach(add);
  return el;
}

const $ = (sel, root = document) => root.querySelector(sel);

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

/**
 * Put children into a node, emptying it first.
 *
 * The browser's own `.append()` does not flatten arrays — hand it one and it
 * prints "[object HTMLDivElement]" instead of the elements. This does flatten,
 * and skips null/undefined/false so `condition && element` is safe.
 */
function fill(node, ...kids) {
  clear(node);
  const add = (k) => {
    if (k === null || k === undefined || k === false) return;
    if (Array.isArray(k)) return k.forEach(add);
    node.append(k instanceof Node ? k : document.createTextNode(String(k)));
  };
  kids.forEach(add);
  return node;
}

function toast(message, kind = '') {
  const t = h('div.toast' + (kind ? '.' + kind : ''), message);
  $('#toasts').append(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 3200);
  setTimeout(() => t.remove(), 3600);
}

/* ------------------------------------------------------------- the API */

async function call(path, options = {}) {
  const res = await fetch(path, {
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: 'The server replied with something unreadable.' }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
}

const api = {
  bootstrap: () => call('/api/bootstrap'),
  dashboard: () => call('/api/dashboard'),
  workstreamDash: (id, includeCompleted) =>
    call(`/api/workstreams/${id}/dashboard${includeCompleted ? '?includeCompleted=1' : ''}`),
  createWorkstream: (body) => call('/api/workstreams', { method: 'POST', body }),
  patchWorkstream: (id, body) => call(`/api/workstreams/${id}`, { method: 'PATCH', body }),
  tasks: (q) => call('/api/tasks' + (q ? '?' + new URLSearchParams(q) : '')),
  createTask: (body) => call('/api/tasks', { method: 'POST', body }),
  patchTask: (id, body) => call(`/api/tasks/${id}`, { method: 'PATCH', body }),
  deleteTask: (id) => call(`/api/tasks/${id}`, { method: 'DELETE' }),
  finance: (q) => call('/api/finance' + (q ? '?' + new URLSearchParams(q) : '')),
  patchFinance: (id, body) => call(`/api/finance/${id}`, { method: 'PATCH', body }),
  createFinance: (body) => call('/api/finance', { method: 'POST', body }),
  documents: (q) => call('/api/documents' + (q ? '?' + new URLSearchParams(q) : '')),
  createDocument: (body) => call('/api/documents', { method: 'POST', body }),
  masterList: (q) => call('/api/masterlist' + (q ? '?' + new URLSearchParams(q) : '')),
  importMasterList: (body) => call('/api/masterlist/import', { method: 'POST', body }),
  patchRow: (id, body) => call(`/api/masterlist/row/${id}`, { method: 'PATCH', body }),
  addRow: (body) => call('/api/masterlist/row', { method: 'POST', body }),
  deleteRow: (id) => call(`/api/masterlist/row/${id}`, { method: 'DELETE' }),
  ruleChat: (message, scope) => call('/api/rules/chat', { method: 'POST', body: { message, scope } }),
  forms: (q) => call('/api/forms' + (q ? '?' + new URLSearchParams(q) : '')),
  formQuestions: (id) => call(`/api/forms/${id}/questions`),
  fillForm: (id, body) => call(`/api/forms/${id}/fill`, { method: 'POST', body }),
  guides: (q) => call('/api/guides' + (q ? '?' + new URLSearchParams(q) : '')),
  guide: (id) => call(`/api/guides/${id}`),
  buildGuide: (id) => call(`/api/guides/${id}/build`, { method: 'POST', body: {} }),
  buildAllGuides: (workstream) => call('/api/guides/build-all', { method: 'POST', body: { workstream } }),
  llm: () => call('/api/llm'),
  backup: () => call('/api/backup', { method: 'POST' }),
};

/* -------------------------------------------------------------- state */

const state = {
  boot: null,
  route: { view: 'home', id: null, tab: null },
  chatLog: [],
};

const money = (n, cur = 'RM') =>
  n == null ? '—' : `${cur} ${Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* -------------------------------------------------------- live clocking */

const DAY_MS = 86400000;

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

/** How the deadline reads right now, recomputed every second. */
function countdown(deadline) {
  if (!deadline) return { text: 'no deadline', cls: 'none', days: null };
  const now = new Date();
  // Deadlines are dates, so they run out at the end of that day.
  const end = new Date(deadline + 'T23:59:59');
  const ms = end - now;
  const days = Math.floor((startOfDay(end) - startOfDay(now)) / DAY_MS);

  if (ms < 0) {
    const over = Math.abs(days);
    return { text: over === 0 ? 'overdue today' : `${over} day${over === 1 ? '' : 's'} overdue`, cls: 'past', days };
  }
  if (days === 0) {
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return { text: `due today — ${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`, cls: 'today', days };
  }
  if (days === 1) return { text: 'due tomorrow', cls: 'soon', days };
  if (days <= 7) return { text: `${days} days left`, cls: 'soon', days };
  if (days <= 30) return { text: `${days} days left`, cls: 'far', days };
  const weeks = Math.round(days / 7);
  return { text: days <= 90 ? `${weeks} weeks left` : `${Math.round(days / 30)} months left`, cls: 'far', days };
}

/** Every element with data-deadline gets refreshed once a second. */
function tickCountdowns() {
  for (const el of document.querySelectorAll('[data-deadline]')) {
    const c = countdown(el.dataset.deadline || null);
    el.textContent = c.text;
    el.className = 'countdown ' + c.cls;
  }
}

function tickClock() {
  const now = new Date();
  $('#clock-date').textContent = now.toLocaleDateString(undefined,
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#clock-time').textContent = now.toLocaleTimeString(undefined, { hour12: false });
  tickCountdowns();
}

/* --------------------------------------------------------- small views */

function metricTile(kind, n, label) {
  return h('div.metric.' + kind, h('div.n', n), h('div.k', label));
}

function metricRow(m) {
  return h('div.metrics',
    metricTile('open', m.open, 'Open'),
    metricTile('progress', m['in-progress'], 'In progress'),
    metricTile('blocked', m.blocked, 'Blocked'),
    metricTile('done', m.completed, 'Completed'),
    m.overdue ? metricTile('overdue', m.overdue, 'Overdue') : null,
    m.dueThisWeek + m.dueToday ? metricTile('soon', m.dueToday + m.dueThisWeek, 'Due in 7 days') : null,
  );
}

function statusPill(status) {
  const label = (state.boot?.statuses || []).find((s) => s.key === status)?.label || status;
  return h('span.pill.' + status, label);
}

function deadlineEl(deadline) {
  const c = countdown(deadline);
  return h('span.countdown.' + c.cls, { 'data-deadline': deadline || '' }, c.text);
}

function progressBar(m) {
  const total = Math.max(m.total, 1);
  const seg = (n, colour) => n ? h('span', { style: { width: (n / total * 100) + '%', background: colour } }) : null;
  return h('div.bar',
    seg(m.completed, 'var(--done)'),
    seg(m['in-progress'], 'var(--progress)'),
    seg(m.blocked, 'var(--blocked)'),
    seg(m.open, 'var(--open)'));
}

function emptyState(text, action) {
  return h('div.empty', text, action ? h('div', { style: { marginTop: '12px' } }, action) : null);
}

/* ------------------------------------------------------------ the shell */

function go(hash) { location.hash = hash; }

/* ---- the sidebar menu on a narrow screen ---- */

/**
 * On a phone the sidebar slides in over the page. On a wide screen it is
 * always there and none of this runs.
 */
const menu = {
  get button() { return $('#menu-btn'); },
  get backdrop() { return $('#sidebar-backdrop'); },
  get isNarrow() { return window.matchMedia('(max-width: 860px)').matches; },

  open() {
    $('#sidebar').classList.add('open');
    this.button.setAttribute('aria-expanded', 'true');
    this.backdrop.hidden = false;
  },
  close() {
    $('#sidebar').classList.remove('open');
    this.button.setAttribute('aria-expanded', 'false');
    this.backdrop.hidden = true;
  },
  toggle() {
    $('#sidebar').classList.contains('open') ? this.close() : this.open();
  },
};

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [view, id, tab] = raw.split('/');
  return { view: view || 'home', id: id || null, tab: tab || null };
}

function renderSidebar() {
  const nav = clear($('#sidebar'));
  const r = state.route;
  // Tapping anything in here navigates, so the menu should get out of the way.
  nav.onclick = (e) => { if (e.target.closest('a, button') && menu.isNarrow) menu.close(); };

  const item = (view, id, label, opts = {}) => {
    const active = r.view === view && (!id || r.id === id);
    return h('a.nav-item' + (active ? '.active' : ''), { href: '#/' + view + (id ? '/' + id : '') },
      opts.dot ? h('span.nav-dot', { style: { background: opts.dot } }) : h('span.nav-dot', { style: { background: 'transparent' } }),
      h('span.nav-text', label),
      opts.count != null ? h('span.nav-count' + (opts.alarm ? '.alarm' : ''), opts.count) : null);
  };

  nav.append(h('div.nav-label', 'Overview'));
  nav.append(item('home', null, 'Dashboard'));
  nav.append(item('deadlines', null, 'All deadlines'));

  nav.append(h('div.nav-label', 'Workstreams'));
  for (const ws of state.boot.workstreams) {
    const live = ws.metrics.total - ws.metrics.completed;
    nav.append(item('ws', ws.id, ws.name, {
      dot: ws.colour,
      count: live || null,
      alarm: ws.metrics.overdue > 0,
    }));
  }

  nav.append(h('div.nav-label', 'Manage'));
  nav.append(item('new-initiative', null, 'New initiative'));
  nav.append(item('update-workstream', null, 'Update a workstream'));

  nav.append(h('div.nav-label', 'Reference'));
  nav.append(item('guides', null, 'New joiner guides'));
  nav.append(item('masterlist', null, 'Master list'));
  nav.append(item('rules', null, 'Hard rules', { count: state.boot.rules.length }));

  nav.append(h('div', { style: { padding: '18px 10px 0' } },
    h('button.btn.btn-sm', {
      style: { width: '100%' },
      onclick: async () => {
        try { const r = await api.backup(); toast('Backup saved inside data/_backups.', 'good'); console.log(r.savedTo); }
        catch (e) { toast(e.message, 'bad'); }
      },
    }, 'Back up my data now')));
}

/* ----------------------------------------------------------- dashboard */

async function viewHome(main) {
  const d = await api.dashboard();
  clear(main);

  main.append(h('div.page-head',
    h('div.grow',
      h('h1', 'Dashboard'),
      h('p', 'Everything across all workstreams, as it stands right now.'))));

  main.append(metricRow(d.metrics));

  const attention = [];
  if (d.metrics.overdue) attention.push(['alert-alert', `${d.metrics.overdue} task${d.metrics.overdue === 1 ? ' is' : 's are'} past their deadline.`]);
  if (d.attention.blocked) attention.push(['warn', `${d.attention.blocked} task${d.attention.blocked === 1 ? ' is' : 's are'} blocked and waiting on something.`]);
  if (d.attention.noNextActor) attention.push(['warn', `${d.attention.noNextActor} unfinished task${d.attention.noNextActor === 1 ? ' does' : 's do'} not say whose action is required next.`]);
  if (d.attention.noDeadline) attention.push(['info', `${d.attention.noDeadline} unfinished task${d.attention.noDeadline === 1 ? ' has' : 's have'} no deadline set.`]);
  if (!attention.length && d.metrics.total) attention.push(['good', 'Nothing overdue, nothing blocked and every task has an owner. All clear.']);

  if (attention.length) {
    main.append(h('div.card', { style: { marginTop: '16px' } },
      h('header', h('h2.grow', 'Needs your attention')),
      h('div.card-body',
        attention.map(([kind, text]) => h('div.alert.' + kind, h('span.icon', kind === 'good' ? '✓' : '!'), h('span', text))))));
  }

  main.append(h('div.grid.cols-2',
    upcomingCard(d.upcoming.slice(0, 12), 'Next deadlines'),
    workstreamBreakdownCard(d.perWorkstream)));

  if (d.finance.concerns.length) {
    main.append(h('div.card',
      h('header', h('h2.grow', 'Finance — points of concern'),
        h('a.btn.btn-sm', { href: '#/ws/finance/finance' }, 'Open finances')),
      h('div.card-body',
        d.finance.concerns.map((c) => h('div.alert.' + (c.level === 'alert' ? 'alert-alert' : c.level),
          h('span.icon', c.level === 'info' ? 'i' : '!'),
          h('span', c.message, c.refs?.length ? h('span.muted.small', '  ' + c.refs.join(', ')) : null))))));
  }
}

function upcomingCard(items, title) {
  return h('div.card',
    h('header', h('h2.grow', title), h('a.btn.btn-sm', { href: '#/deadlines' }, 'See all')),
    h('div.card-body.tight',
      items.length ? items.map(taskRow) : emptyState('No deadlines yet. Add a task to get started.',
        h('button.btn.btn-primary', { onclick: () => openTaskDrawer(null) }, '+ New task'))));
}

function workstreamBreakdownCard(rows) {
  return h('div.card',
    h('header', h('h2.grow', 'By workstream')),
    h('div.card-body.tight',
      rows.map((w) => h('a.doc-row', { href: '#/ws/' + w.id },
        h('span.nav-dot', { style: { background: w.colour } }),
        h('div.grow',
          h('div.name', w.name),
          h('div', { style: { marginTop: '6px' } }, progressBar(w.metrics)),
          h('div.sub', `${w.metrics.total - w.metrics.completed} live · ${w.metrics.completed} done`
            + (w.metrics.overdue ? ` · ${w.metrics.overdue} overdue` : ''))),
        w.metrics.overdue ? h('span.pill.danger', w.metrics.overdue + ' overdue') : null))));
}

function taskRow(t) {
  const c = countdown(t.deadline);
  const ws = state.boot.workstreams.find((w) => w.id === t.workstreamId);
  return h('div.task' + (c.cls === 'past' ? '.overdue' : ''), { onclick: () => openTaskDrawer(t.id) },
    h('div.body',
      h('div.title', t.title),
      h('div.meta',
        h('span.ref', t.ref),
        ws ? h('span', { style: { color: ws.colour, fontWeight: 600 } }, ws.name) : null,
        t.stage ? h('span', '· ' + t.stage) : null,
        t.nextActionBy ? h('span', '· next: ' + t.nextActionBy) : h('span.pill.warn', 'no next actor'),
        (t.blockers || []).length ? h('span.pill.danger', `${t.blockers.length} blocker${t.blockers.length === 1 ? '' : 's'}`) : null)),
    h('div.right',
      statusPill(t.status),
      deadlineEl(t.deadline)));
}

async function viewDeadlines(main) {
  const d = await api.dashboard();
  clear(main);
  main.append(h('div.page-head', h('div.grow',
    h('h1', 'All deadlines'),
    h('p', 'Every unfinished task across every workstream, soonest first. The countdowns update as you watch.'))));

  const overdue = d.upcoming.filter((t) => countdown(t.deadline).cls === 'past');
  const rest = d.upcoming.filter((t) => countdown(t.deadline).cls !== 'past');

  if (overdue.length) {
    main.append(h('div.card',
      h('header', h('h2.grow', { style: { color: 'var(--blocked)' } }, `Overdue (${overdue.length})`)),
      h('div.card-body.tight', overdue.map(taskRow))));
  }
  main.append(h('div.card',
    h('header', h('h2.grow', 'Coming up')),
    h('div.card-body.tight', rest.length ? rest.map(taskRow) : emptyState('Nothing else scheduled.'))));
}

/* ---------------------------------------------------------- workstream */

async function viewWorkstream(main, id, tab) {
  const d = await api.workstreamDash(id, false);
  const ws = d.workstream;
  clear(main);

  const tabs = [['observe', 'Observability'], ['act', 'Action']];
  if (ws.hasFinance) tabs.push(['finance', 'Finances']);
  const current = tabs.some((t) => t[0] === tab) ? tab : 'observe';

  main.append(h('div.page-head',
    h('span.nav-dot', { style: { background: ws.colour, width: '14px', height: '14px', marginTop: '8px' } }),
    h('div.grow', h('h1', ws.name), h('p', ws.blurb || '')),
    h('button.btn.btn-primary', { onclick: () => openTaskDrawer(null, { workstreamId: ws.id }) }, '+ New task')));

  main.append(h('div.tabs', tabs.map(([key, label]) =>
    h('button.tab' + (key === current ? '.active' : ''),
      { onclick: () => go(`/ws/${ws.id}/${key}`) }, label))));

  if (current === 'observe') renderObservability(main, d);
  else if (current === 'act') renderActions(main, d);
  else renderFinance(main, d);
}

function renderObservability(main, d) {
  const ws = d.workstream;
  main.append(metricRow(d.metrics));

  if ((d.guides || []).length) {
    main.append(h('div.card', { style: { marginTop: '16px' } },
      h('header',
        h('h2.grow', 'New joiner guides'),
        h('span.pill.ghost', `${d.guides.length} written`),
        h('a.btn.btn-sm', { href: '#/guides/' + ws.id }, 'Open them')),
      h('div.card-body',
        h('p.soft.small', { style: { margin: 0 } },
          'The Scicom policies below, rewritten in plain English as step-by-step guides. '
          + 'Each downloads as a Word file with the logo on it.')),
      h('div.card-body.tight', d.guides.slice(0, 4).map(guideRow)),
      d.guides.length > 4
        ? h('div.card-body', h('a.btn.btn-sm', { href: '#/guides/' + ws.id }, `See all ${d.guides.length}`))
        : null));
  }

  if (ws.hasPolicies) {
    const list = d.resources.policies;
    main.append(h('div.card', { style: { marginTop: '16px' } },
      h('header',
        h('h2.grow', 'Scicom policies & procedures'),
        h('span.pill.ghost', `${list.length} document${list.length === 1 ? '' : 's'}`)),
      h('div.card-body.tight',
        list.length ? list.map(resourceRow) : emptyState('No policies filed for this workstream yet.'))));
  }

  const groups = d.groups;
  main.append(h('div.card',
    h('header',
      h('h2.grow', 'Active tasks, grouped by theme'),
      h('a.btn.btn-sm', { href: '#/ws/' + ws.id + '/act' }, 'Add or update')),
    h('div.card-body.tight',
      groups.length
        ? groups.map((g) => [
          h('div.group-head',
            h('span.grow', g.name),
            g.metrics.overdue ? h('span.pill.danger', g.metrics.overdue + ' overdue') : null,
            h('span.pill.ghost', `${g.items.length} task${g.items.length === 1 ? '' : 's'}`)),
          g.items.map(taskRow),
        ])
        : emptyState('No active tasks in this workstream.',
          h('button.btn.btn-primary', { onclick: () => openTaskDrawer(null, { workstreamId: ws.id }) }, '+ Add the first task')))));

  if (d.documents.length) {
    main.append(h('div.card',
      h('header', h('h2.grow', 'Documents tracked in this workstream'),
        h('span.pill.ghost', d.documents.length)),
      h('div.card-body.tight', d.documents.map(documentRow))));
  }

  if (d.rules.length) {
    main.append(h('div.card',
      h('header', h('h2.grow', 'Hard rules that apply here'),
        h('a.btn.btn-sm', { href: '#/rules' }, 'Change rules')),
      h('div.card-body.tight', d.rules.map((r, i) =>
        h('div.rule',
          h('span.n', i + 1),
          h('div.txt', r.text,
            h('div.scope', r.scope === 'global' ? 'Applies to every workstream' : 'Specific to ' + ws.name)))))));
  }
}

function resourceRow(r) {
  // A Word form can be filled in by question and answer; a spreadsheet or a
  // PDF policy can only be opened.
  const guided = r.kind === 'form' && /docx/i.test(r.fillablePath || r.format);
  return h('div.doc-row',
    h('span.fmt.' + r.format, r.format),
    h('div.grow',
      h('div.name', r.title),
      h('div.sub',
        r.officialNo ? r.officialNo : 'no official number',
        r.version ? ' · v' + r.version : '',
        r.subArea ? ' · ' + r.subArea : '',
        r.legacy ? ' · converted from the older format' : '')),
    guided ? h('a.btn.btn-sm.btn-navy', { href: '#/form/' + r.id }, 'Fill it in') : null,
    h('a.btn.btn-sm', { href: `/file?id=${r.id}`, target: '_blank', rel: 'noopener' }, 'Open'),
    h('a.btn.btn-sm', { href: `/file?id=${r.id}&download=1` }, 'Download'));
}

function documentRow(d) {
  return h('div.doc-row',
    h('span.ref', d.internalNo),
    h('div.grow',
      h('div.name', d.title),
      h('div.sub', d.kindLabel + (d.officialNo ? ' · official ' + d.officialNo : ' · no official number yet')
        + (d.owner ? ' · ' + d.owner : ''))),
    h('span.pill.ghost', d.status));
}

/* ------------------------------------------------------------- actions */

function renderActions(main, d) {
  const ws = d.workstream;

  main.append(h('div.grid.cols-2',
    actionCard('Add a new task',
      'The quickest way in. Name it, pick a deadline, done — everything else can be filled in later.',
      'Add task', () => openTaskDrawer(null, { workstreamId: ws.id })),
    actionCard('Update an existing task',
      'Change the status, move the stage on, record a blocker or say whose action is next.',
      'Choose a task', () => openTaskPicker(ws.id))));

  main.append(h('div.grid.cols-2',
    actionCard('Assign an internal document number',
      'Use this when there are several copies of the same form and the official Scicom number cannot tell them apart.',
      'Assign a number', () => openDocumentDrawer(ws.id)),
    ws.hasForms
      ? actionCard('Fill out a form',
        'Pick a form and I will ask you what it needs, one question at a time. '
        + 'You get a Word file to check, and an internal document number so the copy stays tracked.',
        'Choose a form', () => openFormPicker(ws.id))
      : null));

  if (ws.hasForms) {
    const forms = d.resources.forms;
    main.append(h('div.card',
      h('header',
        h('h2.grow', 'Forms'),
        h('span.pill.ghost',
          `${forms.filter((f) => /docx/i.test(f.fillablePath || f.format)).length} of ${forms.length} can be filled in here`)),
      h('div.card-body',
        h('div.alert.info',
          h('span.icon', 'i'),
          h('span', 'Anything marked "Fill it in" can be answered question by question. '
            + 'The answers are written into the real Scicom template, so the letterhead, the borders and the '
            + 'signature blocks come through untouched. Spreadsheet forms have to be filled in by hand for now.'))),
      h('div.card-body.tight', forms.map(resourceRow))));
  }
}

function actionCard(title, blurb, buttonLabel, onclick) {
  return h('div.card',
    h('header', h('h2.grow', title)),
    h('div.card-body',
      h('p.soft.small', blurb),
      h('button.btn.btn-navy', { onclick }, buttonLabel)));
}

/* ------------------------------------------------------------- finance */

async function renderFinance(main, d) {
  const holder = h('div', h('div.loading', 'Loading finance records…'));
  main.append(holder);
  const f = await api.finance();
  clear(holder);

  const s = f.summary;
  holder.append(h('div.metrics',
    h('div.metric', h('div.n', s.count), h('div.k', 'Charges recorded')),
    h('div.metric', h('div.n', { style: { fontSize: '1.3rem' } }, money(s.totalRM)), h('div.k', 'Total (RM)')),
    h('div.metric', h('div.n', { style: { fontSize: '1.3rem' } }, money(s.totalUSD, 'USD')), h('div.k', 'Total (USD)')),
    h('div.metric' + (f.concerns.filter((c) => c.level !== 'info').length ? '.overdue' : ''),
      h('div.n', f.concerns.length), h('div.k', 'Points of concern'))));

  holder.append(h('div.card', { style: { marginTop: '16px' } },
    h('header', h('h2.grow', 'Points of concern'),
      h('span.pill.ghost', 'checked against the hard rules')),
    h('div.card-body',
      f.concerns.length
        ? f.concerns.map((c) => h('div.alert.' + (c.level === 'alert' ? 'alert-alert' : c.level),
          h('span.icon', c.level === 'info' ? 'i' : '!'),
          h('span', c.message, c.refs?.length ? h('span.muted.small', '  ' + c.refs.join(', ')) : null)))
        : h('div.alert.good', h('span.icon', '✓'), h('span', 'Nothing looks wrong.')))));

  holder.append(h('div.grid.cols-2',
    h('div.card',
      h('header', h('h2.grow', 'Spend by month (RM)')),
      h('div.card-body', monthChart(s.byMonth))),
    h('div.card',
      h('header', h('h2.grow', 'Biggest vendors (RM)')),
      h('div.card-body.tight', h('table',
        h('tbody', s.topVendors.map(([v, amt]) =>
          h('tr', h('td', v), h('td.num', money(amt))))))))));

  const search = h('input', { type: 'search', placeholder: 'Search vendor, project, account code, purpose…' });
  const tableHolder = h('div.scroll-x.scroll-y');
  const draw = (records) => {
    fill(tableHolder, financeTable(records));
  };
  draw(f.records);
  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = search.value.trim();
      const r = await api.finance(q ? { q } : null);
      draw(r.records);
    }, 200);
  });

  holder.append(h('div.card',
    h('header', h('h2.grow', 'Every charge'),
      h('div', { style: { width: '320px' } }, search),
      h('button.btn.btn-sm.btn-navy', { onclick: () => openFinanceDrawer(null) }, '+ Record a charge')),
    h('div.card-body.tight', tableHolder)));
}

function financeTable(records) {
  return h('table',
    h('thead', h('tr',
      h('th', 'Ref'), h('th', 'Vendor'), h('th', 'Month'), h('th', 'Type'),
      h('th', 'Cost type'), h('th', 'Invoice'), h('th', 'Card'),
      h('th.right', 'USD'), h('th.right', 'RM'), h('th', 'Account'), h('th', 'Project'))),
    h('tbody', records.length
      ? records.slice(0, 400).map((r) => h('tr', { style: { cursor: 'pointer' }, onclick: () => openFinanceDrawer(r.id) },
        h('td', h('span.ref', r.ref)),
        h('td', r.vendor),
        h('td.nowrap', r.month || '—'),
        h('td.small.soft', r.type || '—'),
        h('td.small.soft', r.costType || h('span.pill.warn', 'not set')),
        h('td', r.invoiceNo || h('span.pill.warn', 'missing')),
        h('td', r.card || h('span.pill.warn', 'missing')),
        h('td.num', r.amountUSD != null ? r.amountUSD.toFixed(2) : '—'),
        h('td.num', r.amountRM != null ? r.amountRM.toFixed(2) : '—'),
        h('td.mono.small', r.accountCode || '—'),
        h('td.small', r.project || '—')))
      : h('tr', h('td', { colspan: 11 }, emptyState('No charges match that search.')))));
}

function monthChart(byMonth) {
  if (!byMonth.length) return emptyState('Nothing to chart yet.');
  const max = Math.max(...byMonth.map(([, v]) => v));
  return h('div.stack', byMonth.map(([m, v]) =>
    h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
      h('span.mono.small', { style: { width: '62px', flex: '0 0 62px', color: 'var(--text-soft)' } }, m),
      h('div', { style: { flex: '1', height: '16px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' } },
        h('div', { style: { width: (v / max * 100) + '%', height: '100%', background: 'var(--navy)' } })),
      h('span.num', { style: { width: '92px', flex: '0 0 92px' } }, Math.round(v).toLocaleString()))));
}

/* --------------------------------------------------------- master list */

async function viewMasterList(main) {
  clear(main);
  main.append(h('div.page-head', h('div.grow',
    h('h1', 'Master list'),
    h('p', 'Your own list, imported from a spreadsheet, then editable and searchable here. Click any cell to change it.'))));

  const data = await api.masterList();

  const importCard = h('div.card',
    h('header', h('h2.grow', data.columns.length ? 'Replace the master list' : 'Import your master list')),
    h('div.card-body',
      h('p.soft.small', 'Save your spreadsheet as CSV (in Excel: File → Save As → CSV UTF-8), then choose it here. The first row is treated as the column headings.'),
      h('input', {
        type: 'file', accept: '.csv,text/csv',
        onchange: async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const text = await file.text();
            const { columns, rows } = parseCsv(text);
            if (!columns.length) throw new Error('That file has no column headings.');
            await api.importMasterList({ name: file.name.replace(/\.csv$/i, ''), columns, rows });
            toast(`Imported ${rows.length} rows.`, 'good');
            render();
          } catch (err) { toast(err.message, 'bad'); }
        },
      })));

  if (!data.columns.length) {
    main.append(importCard);
    main.append(h('div.card', h('div.card-body',
      emptyState('No master list imported yet. Use the box above, or paste the file into this conversation and I will load it for you.'))));
    return;
  }

  const search = h('input', { type: 'search', placeholder: `Search all ${data.totalRows} rows…` });
  const holder = h('div.scroll-x.scroll-y');
  const draw = (rows) => fill(holder, masterTable(data.columns, rows));
  draw(data.rows);

  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = search.value.trim();
      const r = await api.masterList(q ? { q } : null);
      draw(r.rows);
    }, 180);
  });

  main.append(h('div.card',
    h('header',
      h('h2.grow', data.name || 'Master list'),
      h('span.pill.ghost', `${data.totalRows} rows · ${data.columns.length} columns`),
      h('div', { style: { width: '300px' } }, search)),
    h('div.card-body.tight', holder)));

  main.append(importCard);
}

function masterTable(columns, rows) {
  return h('table',
    h('thead', h('tr', h('th', '#'), columns.map((c) => h('th', c)), h('th', ''))),
    h('tbody', rows.length
      ? rows.map((row) => h('tr',
        h('td.mono.small.muted', row._n),
        columns.map((c) => h('td', {
          contentEditable: 'true',
          style: { minWidth: '110px', outline: 'none' },
          onblur: async (e) => {
            const value = e.target.textContent.trim();
            if (value === (row[c] || '')) return;
            try { await api.patchRow(row._id, { [c]: value }); row[c] = value; toast('Saved.', 'good'); }
            catch (err) { toast(err.message, 'bad'); e.target.textContent = row[c] || ''; }
          },
        }, row[c] || '')),
        h('td', h('button.btn.btn-sm.btn-danger', {
          onclick: async (e) => {
            if (!confirm('Delete this row? This cannot be undone.')) return;
            try { await api.deleteRow(row._id); e.target.closest('tr').remove(); toast('Row deleted.'); }
            catch (err) { toast(err.message, 'bad'); }
          },
        }, 'Delete'))))
      : h('tr', h('td', { colspan: columns.length + 2 }, emptyState('No rows match that search.')))));
}

/** Read a CSV, handling quoted fields and commas inside them. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((v) => String(v).trim() !== ''));
  if (!nonEmpty.length) return { columns: [], rows: [] };

  const seen = new Map();
  const columns = nonEmpty[0].map((c, i) => {
    let name = String(c).trim() || `Column ${i + 1}`;
    if (seen.has(name)) { const n = seen.get(name) + 1; seen.set(name, n); name = `${name} (${n})`; }
    else seen.set(name, 1);
    return name;
  });
  const out = nonEmpty.slice(1).map((r) => {
    const o = {};
    columns.forEach((c, i) => { o[c] = r[i] == null ? '' : String(r[i]).trim(); });
    return o;
  });
  return { columns, rows: out };
}

/* ---------------------------------------------------------- hard rules */

async function viewRules(main) {
  clear(main);
  main.append(h('div.page-head', h('div.grow',
    h('h1', 'Hard rules'),
    h('p', 'The standing instructions this system holds you to. Talk to the box below to add, change, move or remove one — no forms to fill in.'))));

  const listHolder = h('div.card-body.tight');
  const drawRules = (rules) => {
    fill(listHolder, rules.length
      ? rules.map((r, i) => h('div.rule',
        h('span.n', i + 1),
        h('div.txt', r.text,
          h('div.scope',
            (r.scope === 'global' ? 'Applies everywhere' : 'Only in ' + (state.boot.workstreams.find((w) => w.id === r.scope)?.name || r.scope))
            + (r.source === 'chat' ? ' · added by you' : ' · built in')))))
      : emptyState('No rules yet. Type one below.'));
  };
  drawRules(state.boot.rules);

  main.append(h('div.card',
    h('header', h('h2.grow', 'Current rules'), h('span.pill.ghost', state.boot.rules.length)),
    listHolder));

  const log = h('div.chat-log');
  const input = h('input', { type: 'text', placeholder: 'e.g. for finance add rule: always record which card was used' });

  const addMsg = (who, text) => {
    log.append(h('div.msg.' + who, text));
    log.scrollTop = log.scrollHeight;
  };

  if (!state.chatLog.length) {
    state.chatLog.push(['bot',
      'Tell me a rule and I will hold you to it.\n\n' +
      'Examples:\n' +
      '• add rule: every purchase over RM 5,000 needs two approvers\n' +
      '• for finance add rule: always record which card was used\n' +
      '• change rule 2 to: deadlines are counted in working days\n' +
      '• move rule 3 to governance\n' +
      '• remove rule 4\n\n' +
      'Type help at any time.']);
  }
  state.chatLog.forEach(([who, text]) => addMsg(who, text));

  const send = async () => {
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    addMsg('user', message);
    state.chatLog.push(['user', message]);
    try {
      const r = await api.ruleChat(message, null);
      addMsg('bot', r.reply);
      state.chatLog.push(['bot', r.reply]);
      state.boot.rules = r.rules;
      drawRules(r.rules);
      renderSidebar();
      if (r.changed) toast('Rules updated.', 'good');
    } catch (err) {
      addMsg('bot', 'Something went wrong: ' + err.message);
      toast(err.message, 'bad');
    }
  };

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  main.append(h('div.card',
    h('header', h('h2.grow', 'Talk to the rules'),
      state.boot.llm.available
        ? h('span.pill.ghost', 'local AI on — wording will be tidied')
        : h('span.pill.ghost', 'working without AI — your words kept as typed')),
    log,
    h('div.chat-input', input, h('button.btn.btn-navy', { onclick: send }, 'Send'))));
}

/* ------------------------------------------- new & updated workstreams */

function viewNewInitiative(main) {
  clear(main);
  main.append(h('div.page-head', h('div.grow',
    h('h1', 'New initiative'),
    h('p', 'Create a brand new workstream. It gets its own dashboard, its own task numbering and, if you want them, its own policy and form shelves.'))));

  const name = h('input', { type: 'text', placeholder: 'e.g. Customer Insights' });
  const blurb = h('textarea', { placeholder: 'One line on what this workstream covers.' });
  const subs = h('input', { type: 'text', placeholder: 'e.g. Research, Reporting, Tooling' });
  const wantPolicies = h('input', { type: 'checkbox' });
  const wantForms = h('input', { type: 'checkbox' });
  const colour = h('input', { type: 'color', value: '#475569', style: { height: '36px', padding: '2px' } });

  main.append(h('div.card',
    h('header', h('h2.grow', 'Set it up')),
    h('div.card-body',
      h('div.field', h('label', 'Name'), name),
      h('div.field.optional', h('label', 'What it covers'), blurb),
      h('div.field.optional',
        h('label', 'Sub-categories, separated by commas'), subs,
        h('div.hint', 'These become the headings your tasks get grouped under. You can change them later.')),
      h('div.row',
        h('div.field', h('label', 'Colour'), colour),
        h('div.field',
          h('label', 'Observability'),
          h('label.small.soft', { style: { fontWeight: 400, display: 'flex', gap: '7px', alignItems: 'center' } },
            wantPolicies, 'This workstream has its own policies & procedures'),
          h('label.small.soft', { style: { fontWeight: 400, display: 'flex', gap: '7px', alignItems: 'center', marginTop: '6px' } },
            wantForms, 'This workstream has its own forms'))),
      h('div.alert.info', h('span.icon', 'i'),
        h('span', 'Ticking either box creates a folder for it inside the resources folder. Drop the PDFs or Word files in there and they appear here automatically.')),
      h('div.flex.end',
        h('button.btn.btn-primary', {
          onclick: async (e) => {
            if (!name.value.trim()) return toast('Give the workstream a name first.', 'bad');
            e.target.disabled = true;
            try {
              const ws = await api.createWorkstream({
                name: name.value.trim(),
                blurb: blurb.value.trim(),
                colour: colour.value,
                hasPolicies: wantPolicies.checked,
                hasForms: wantForms.checked,
                subcategories: subs.value.split(',').map((s) => s.trim()).filter(Boolean),
              });
              state.boot = await api.bootstrap();
              toast(`"${ws.name}" created. Task numbers will start ${ws.code}-T0001.`, 'good');
              go('/ws/' + ws.id);
            } catch (err) { toast(err.message, 'bad'); e.target.disabled = false; }
          },
        }, 'Create workstream')))));
}

function viewUpdateWorkstream(main, id) {
  clear(main);
  main.append(h('div.page-head', h('div.grow',
    h('h1', 'Update a workstream'),
    h('p', 'Rename one, change what it covers, adjust its sub-categories, or turn its policy and form shelves on and off.'))));

  const picker = h('select', { onchange: () => go('/update-workstream/' + picker.value) },
    h('option', { value: '' }, '— choose a workstream —'),
    state.boot.workstreams.map((w) => h('option', { value: w.id, selected: w.id === id }, w.name)));

  main.append(h('div.card', h('div.card-body', h('div.field', h('label', 'Which workstream?'), picker))));

  if (!id) return;
  const ws = state.boot.workstreams.find((w) => w.id === id);
  if (!ws) return main.append(h('div.card', h('div.card-body', emptyState('That workstream no longer exists.'))));

  const name = h('input', { type: 'text', value: ws.name });
  const blurb = h('textarea', ws.blurb || '');
  const subs = h('input', { type: 'text', value: (ws.subcategories || []).map((s) => s.name).join(', ') });
  const colour = h('input', { type: 'color', value: ws.colour, style: { height: '36px', padding: '2px' } });
  const wantPolicies = h('input', { type: 'checkbox', checked: !!ws.hasPolicies });
  const wantForms = h('input', { type: 'checkbox', checked: !!ws.hasForms });

  main.append(h('div.card',
    h('header', h('h2.grow', 'Details')),
    h('div.card-body',
      h('div.field', h('label', 'Name'), name),
      h('div.field.optional', h('label', 'What it covers'), blurb),
      h('div.field.optional', h('label', 'Sub-categories, separated by commas'), subs),
      h('div.row',
        h('div.field', h('label', 'Colour'), colour),
        h('div.field',
          h('label', 'Observability'),
          h('label.small.soft', { style: { fontWeight: 400, display: 'flex', gap: '7px', alignItems: 'center' } },
            wantPolicies, 'Has its own policies & procedures'),
          h('label.small.soft', { style: { fontWeight: 400, display: 'flex', gap: '7px', alignItems: 'center', marginTop: '6px' } },
            wantForms, 'Has its own forms'))),
      h('div.flex.end',
        h('button.btn.btn-primary', {
          onclick: async (e) => {
            e.target.disabled = true;
            try {
              await api.patchWorkstream(ws.id, {
                name: name.value.trim() || ws.name,
                blurb: blurb.value.trim(),
                colour: colour.value,
                hasPolicies: wantPolicies.checked,
                hasForms: wantForms.checked,
                subcategories: subs.value.split(',').map((s) => s.trim()).filter(Boolean),
              });
              state.boot = await api.bootstrap();
              toast('Saved.', 'good');
              render();
            } catch (err) { toast(err.message, 'bad'); e.target.disabled = false; }
          },
        }, 'Save changes')))));

  main.append(h('div.card',
    h('header', h('h2.grow', 'Add, replace or remove a policy or form')),
    h('div.card-body',
      ws.resourceFolder
        ? [
          h('p.soft.small', 'This workstream reads its documents straight out of this folder:'),
          h('p.mono.small', { style: { background: 'var(--surface-2)', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--line)' } },
            `scicom-axe/resources/${ws.resourceFolder}/`),
          h('ul.small.soft', { style: { paddingLeft: '20px', lineHeight: '1.8' } },
            h('li', h('strong', 'To add one:'), ' put the file into the "Procedures - Policies" or "Forms" folder inside it.'),
            h('li', h('strong', 'To replace one:'), ' overwrite the file, keeping the same name.'),
            h('li', h('strong', 'To remove one:'), ' delete the file, or move it out to a folder of your own.')),
          h('p.soft.small', 'Then refresh this page — the list updates itself. Nothing here needs code changing.'),
        ]
        : emptyState('Turn on policies or forms above and save, and a folder will be created for this workstream.'))));
}


/* ------------------------------------------------- the guided form filler */

/**
 * Fill a Scicom form by answering one question at a time.
 *
 * The answers are written into the real template, so the finished file keeps
 * the Scicom letterhead, the borders and the signature blocks exactly as they
 * are. Every question can be skipped — a blank on this screen is a blank on
 * the form, which is how a paper form works too.
 */
async function viewFormFiller(main, formId) {
  fill(main, h('div.loading', 'Reading the form…'));

  let data;
  try {
    data = await api.formQuestions(formId);
  } catch (err) {
    return fill(main, h('div.card', h('div.card-body',
      h('div.alert.alert-alert', h('span.icon', '!'), h('span', err.message)),
      h('a.btn', { href: '#/home' }, 'Back to the dashboard'))));
  }

  const { form, questions, autoFilled } = data;
  const answers = {};
  let at = 0;

  const log = h('div.chat-log', { style: { maxHeight: '54vh' } });
  const inputArea = h('div.chat-input', { style: { flexWrap: 'wrap' } });
  const progress = h('div.bar', { style: { margin: '0 16px 12px' } },
    h('span', { style: { width: '0%', background: 'var(--orange)' } }));
  const counter = h('span.pill.ghost', `0 of ${questions.length}`);

  const say = (who, text, extra) => {
    const node = h('div.msg.' + who, text, extra || null);
    log.append(node);
    log.scrollTop = log.scrollHeight;
    return node;
  };

  const setProgress = () => {
    progress.firstChild.style.width = (questions.length ? (at / questions.length) * 100 : 100) + '%';
    counter.textContent = `${Math.min(at, questions.length)} of ${questions.length}`;
  };

  say('bot',
    `${form.title}.\n\n` +
    `${questions.length} question${questions.length === 1 ? '' : 's'}, and every one of them can be skipped — ` +
    `a blank here is a blank on the form.` +
    (autoFilled.length
      ? `\n\nAlready filled in for you: ${autoFilled.map((a) => `${a.label} — ${a.value}`).join('; ')}.`
      : ''));

  /* ---- asking ---- */

  function ask() {
    setProgress();
    if (at >= questions.length) return review();

    const q = questions[at];
    say('bot', q.question
      + (q.hint ? `\n\nThe form suggests: ${q.hint}` : '')
      + (q.sectionOwner ? `\n\n(This part of the form is normally completed by the ${q.sectionOwner}.)` : ''));

    fill(inputArea, ...controlsFor(q));
    const first = inputArea.querySelector('input, textarea, select');
    if (first) first.focus();
  }

  function advance(q, value, shown) {
    if (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && !value.length)) {
      answers[q.id] = value;
      say('user', shown);
    } else {
      say('user', '— skipped —');
    }
    at += 1;
    ask();
  }

  function controlsFor(q) {
    const back = at > 0
      ? h('button.btn.btn-sm', { onclick: () => { at -= 1; rewind(); } }, '← Back')
      : null;

    if (q.kind === 'choice') {
      const boxes = q.options.map((o) => {
        const cb = h('input', { type: 'checkbox', value: o.value });
        return h('label.small', {
          style: {
            display: 'flex', gap: '7px', alignItems: 'center', padding: '4px 9px',
            border: '1px solid var(--line)', borderRadius: '6px', cursor: 'pointer',
            background: 'var(--surface)',
          },
        }, cb, o.label);
      });
      const picked = () => q.options
        .filter((o, i) => boxes[i].querySelector('input').checked)
        .map((o) => o.value);
      return [
        h('div', { style: { display: 'flex', gap: '7px', flexWrap: 'wrap', width: '100%', marginBottom: '9px' } }, boxes),
        back,
        h('div.spacer'),
        h('button.btn', { onclick: () => advance(q, null) }, 'Skip'),
        h('button.btn.btn-navy', {
          onclick: () => {
            const chosen = picked();
            const labels = q.options.filter((o) => chosen.includes(o.value)).map((o) => o.label);
            advance(q, chosen, labels.join(', '));
          },
        }, 'Next'),
      ];
    }

    const input = q.type === 'long'
      ? h('textarea', { placeholder: 'Write it however it comes out — I will tidy the wording.', style: { minHeight: '64px' } })
      : h('input', {
        type: q.type === 'date' ? 'date' : q.type === 'number' ? 'number' : 'text',
        placeholder: q.type === 'date' ? '' : 'Your answer',
      });

    const submit = () => advance(q, input.value.trim(), input.value.trim());
    if (q.type !== 'long') {
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    }

    return [
      h('div', { style: { width: '100%', marginBottom: '9px' } }, input),
      back,
      h('div.spacer'),
      h('button.btn', { onclick: () => advance(q, null) }, 'Skip'),
      h('button.btn.btn-navy', { onclick: submit }, 'Next'),
    ];
  }

  /** Going back drops the answer to the question we are returning to. */
  function rewind() {
    const q = questions[at];
    delete answers[q.id];
    // Remove the last exchange from the log: our question and their answer.
    for (let i = 0; i < 2 && log.lastChild; i++) log.lastChild.remove();
    if (log.lastChild && log.lastChild.classList.contains('msg')) log.lastChild.remove();
    ask();
  }

  /* ---- the review, then the file ---- */

  function review() {
    fill(inputArea);
    const given = questions.filter((q) => answers[q.id] !== undefined);
    const blank = questions.length - given.length;

    say('bot',
      `That is everything.\n\n` +
      `${given.length} answered, ${blank} left blank.\n\n` +
      `Check the list below, then make the Word file. You will get a document ` +
      `number with it so this copy stays tracked.`);

    const summary = h('div.card', { style: { margin: '0 16px 12px' } },
      h('header', h('h3.grow', 'What will go on the form')),
      h('div.card-body.tight',
        autoFilled.map((a) => reviewRow(a.label, a.value, 'filled in for you')),
        given.map((q) => {
          const v = answers[q.id];
          const shown = Array.isArray(v)
            ? q.options.filter((o) => v.includes(o.value)).map((o) => o.label).join(', ')
            : v;
          return reviewRow(q.label || q.section, shown, null, () => { at = questions.indexOf(q); rewindTo(); });
        }),
        given.length || autoFilled.length ? null : emptyState('Nothing was filled in.')));

    const owner = h('input', { type: 'text', placeholder: 'Who is handling it (optional)' });
    const subject = h('input', { type: 'text', placeholder: 'Who or what it is about (optional)' });

    const makeBtn = h('button.btn.btn-primary', {
      onclick: async () => {
        makeBtn.disabled = true;
        makeBtn.textContent = 'Writing the Word file…';
        try {
          const r = await api.fillForm(formId, {
            answers,
            owner: owner.value.trim() || null,
            subject: subject.value.trim() || null,
          });
          done(r);
        } catch (err) {
          toast(err.message, 'bad');
          makeBtn.disabled = false;
          makeBtn.textContent = 'Make the Word file';
        }
      },
    }, 'Make the Word file');

    fill(inputArea,
      h('div', { style: { width: '100%' } },
        summary,
        h('div.row', { style: { margin: '0 0 10px' } },
          h('div.field.optional', { style: { margin: 0 } }, h('label', 'Owner'), owner),
          h('div.field.optional', { style: { margin: 0 } }, h('label', 'Subject'), subject)),
        h('div.flex.end',
          h('button.btn', { onclick: () => { at = 0; fill(log); ask(); } }, 'Start again'),
          makeBtn)));
  }

  function rewindTo() {
    // Re-ask from the chosen question, keeping the answers already given.
    fill(log);
    say('bot', 'Back to that one.');
    ask();
  }

  function reviewRow(label, value, note, onEdit) {
    return h('div.doc-row',
      h('div.grow',
        h('div.name', label),
        h('div.sub', value || '—', note ? h('span.muted', '  · ' + note) : null)),
      onEdit ? h('button.btn.btn-sm', { onclick: onEdit }, 'Change') : null);
  }

  function done(r) {
    fill(inputArea);
    say('bot',
      `Done.\n\n` +
      `Internal number: ${r.document.internalNo}\n` +
      `File: ${r.fileName}` +
      (r.polishedCount ? `\n\n${r.polishedCount} answer${r.polishedCount === 1 ? ' was' : 's were'} reworded by the local model.` : ''));

    fill(inputArea, h('div', { style: { width: '100%' } },
      h('div.alert.good', { style: { marginBottom: '10px' } },
        h('span.icon', '✓'),
        h('span', 'Open it in Word and read it through before you send it anywhere. Nothing has been signed and nothing has been submitted.')),
      h('div.flex',
        h('a.btn.btn-primary', { href: r.downloadUrl, download: r.fileName }, '⤓ Download the Word file'),
        h('a.btn', { href: '#/ws/' + form.workstreamId }, 'Back to ' + form.workstreamName),
        h('button.btn', {
          onclick: () => { Object.keys(answers).forEach((k) => delete answers[k]); at = 0; fill(log); ask(); },
        }, 'Fill in another copy'))));
    render_sidebarRefresh();
  }

  async function render_sidebarRefresh() {
    try { state.boot = await api.bootstrap(); renderSidebar(); } catch { /* not important */ }
  }

  /* ---- the page ---- */

  fill(main,
    h('div.page-head',
      h('div.grow',
        h('h1', form.title),
        h('p', `${form.workstreamName}${form.officialNo ? ' · ' + form.officialNo : ''}`
          + (form.legacy ? ' · converted from the older Word format' : ''))),
      h('a.btn', { href: `/file?id=${form.id}&download=1` }, 'Download the blank form')),
    h('div.card',
      h('header',
        h('h2.grow', 'Guided filling'),
        counter,
        data.llm.available
          ? h('span.pill.ghost', 'local AI on — wording will be tightened')
          : h('span.pill.ghost', 'no local AI — your words kept as typed')),
      progress,
      log,
      inputArea));

  ask();
}


/* ------------------------------------------------- the new-joiner guides */

/**
 * Plain-English guides, one per Scicom policy, written for somebody in their
 * first week. Each one downloads as a Word file with the logo on it, ready to
 * hand over.
 */
async function viewGuides(main, workstreamId) {
  fill(main, h('div.loading', 'Loading the guides…'));
  const list = await api.guides(workstreamId ? { workstream: workstreamId } : null);

  const groups = new Map();
  for (const g of list) {
    const key = g.workstreamName + (g.subArea ? ' — ' + g.subArea : '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }

  fill(main,
    h('div.page-head',
      h('div.grow',
        h('h1', 'New joiner guides'),
        h('p', `${list.length} Scicom policies rewritten as simple step-by-step guides. `
          + 'Each one downloads as a Word file with the logo on it, ready to hand to somebody on their first week.')),
      h('button.btn.btn-primary', {
        onclick: async (e) => {
          e.target.disabled = true;
          e.target.textContent = 'Writing all of them…';
          try {
            const r = await api.buildAllGuides(workstreamId || null);
            toast(`${r.built.length} guides written into the exports folder.`, 'good');
            e.target.textContent = `✓ ${r.built.length} written to ${r.folder}`;
          } catch (err) {
            toast(err.message, 'bad');
            e.target.disabled = false;
            e.target.textContent = 'Download all of them';
          }
        },
      }, 'Download all of them')),

    h('div.card',
      h('div.card-body',
        h('div.alert.info',
          h('span.icon', 'i'),
          h('span', 'Every guide says on its last page that it is a summary and not the policy itself, '
            + 'and names the Scicom document it came from. Read one through before you hand it to anybody — '
            + 'policies get revised, and a guide is only as current as the policy behind it.')))),

    [...groups.entries()].map(([name, items]) => h('div.card',
      h('header', h('h2.grow', name), h('span.pill.ghost', items.length)),
      h('div.card-body.tight', items.map(guideRow)))));
}

function guideRow(g) {
  return h('div.doc-row',
    h('div.grow',
      h('div.name', g.title),
      h('div.sub', g.subtitle || ''),
      h('div.sub', { style: { marginTop: '4px', color: 'var(--text-soft)' } }, g.inOneLine),
      h('div.sub', { style: { marginTop: '4px' } },
        g.source?.officialNo ? 'From ' + g.source.officialNo : 'From the Scicom policy',
        g.source?.version ? ' v' + g.source.version : '',
        g.stepCount ? ` · ${g.stepCount} steps` : '')),
    h('div', { style: { display: 'flex', gap: '8px', flex: '0 0 auto' } },
      h('button.btn.btn-sm', { onclick: () => openGuidePreview(g.id) }, 'Read it'),
      h('button.btn.btn-sm.btn-navy', {
        onclick: async (e) => {
          const was = e.target.textContent;
          e.target.disabled = true;
          e.target.textContent = 'Writing…';
          try {
            const r = await api.buildGuide(g.id);
            // Navigating to it lets the server's own filename be used. Setting
            // a `download` attribute here overrode it and saved the file as
            // "download" with no extension.
            location.href = r.downloadUrl;
            e.target.textContent = '✓ Word file';
            setTimeout(() => { e.target.textContent = was; e.target.disabled = false; }, 2500);
          } catch (err) {
            toast(err.message, 'bad');
            e.target.textContent = was;
            e.target.disabled = false;
          }
        },
      }, '⤓ Word')));
}

/** Read a guide on screen without downloading it. */
async function openGuidePreview(id) {
  let g;
  try {
    g = await api.guide(id);
  } catch (err) {
    return toast(err.message, 'bad');
  }

  const section = (title, node) => node
    ? h('div', h('h3', { style: { marginTop: '16px', marginBottom: '6px', color: 'var(--navy)' } }, title), node)
    : null;

  const body = h('div',
    h('div.alert.info', { style: { background: 'var(--navy-light)', borderColor: 'var(--navy-light)', color: 'var(--navy-dark)' } },
      h('span', g.inOneLine)),

    section('Who this is for', g.appliesTo ? h('p.small', g.appliesTo) : null),

    section('Before you start', (g.before || []).length
      ? h('ul.small', { style: { paddingLeft: '20px', lineHeight: '1.7' } }, g.before.map((t) => h('li', t)))
      : null),

    section('At a glance', (g.atAGlance || []).length
      ? h('table', h('tbody', g.atAGlance.map(([k, v]) =>
        h('tr', h('td', { style: { fontWeight: '600', width: '38%' } }, k), h('td', v)))))
      : null),

    section('What to do, step by step', (g.steps || []).length
      ? h('div', g.steps.map((s, i) => h('div', { style: { display: 'flex', gap: '12px', padding: '9px 0', borderBottom: '1px solid var(--line)' } },
        h('span', { style: { color: 'var(--orange)', fontWeight: '700', fontSize: '1.1rem', flex: '0 0 22px' } }, i + 1),
        h('div',
          h('div', { style: { fontWeight: '600' } }, s.title),
          h('div.small.soft', s.body),
          s.who ? h('div.small.muted', { style: { fontStyle: 'italic', marginTop: '2px' } }, 'Who does this: ' + s.who) : null))))
      : null),

    section('Who does what', (g.whoDoesWhat || []).length
      ? h('table', h('tbody', g.whoDoesWhat.map(([k, v]) =>
        h('tr', h('td', { style: { fontWeight: '600', width: '32%' } }, k), h('td', v)))))
      : null),

    section('Watch out for', (g.watchOut || []).length
      ? h('div', g.watchOut.map((t) => h('p.small', {
        style: { borderLeft: '3px solid var(--orange)', paddingLeft: '10px', margin: '0 0 8px' },
      }, t)))
      : null),

    section('Questions people actually ask', (g.questions || []).length
      ? h('div', g.questions.map(([q, a]) => h('div', { style: { marginBottom: '10px' } },
        h('div', { style: { fontWeight: '600', color: 'var(--navy)' } }, q),
        h('div.small.soft', a))))
      : null),

    section('Forms you will need', (g.forms || []).length
      ? h('ul.small', { style: { paddingLeft: '20px', lineHeight: '1.7' } }, g.forms.map((t) => h('li', t)))
      : null),

    h('div.alert.warn', { style: { marginTop: '18px' } },
      h('span.icon', '!'),
      h('span', `This is a plain-English summary, not the policy itself. It is based on `
        + `${g.source?.officialNo || 'the Scicom policy'}${g.source?.version ? ', version ' + g.source.version : ''}. `
        + 'Where the two disagree, the policy is right.')));

  const foot = h('div', { style: { display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end' } },
    h('button.btn', { onclick: closeDrawer }, 'Close'),
    h('button.btn.btn-primary', {
      onclick: async (e) => {
        e.target.disabled = true;
        e.target.textContent = 'Writing…';
        try {
          const r = await api.buildGuide(id);
          location.href = r.downloadUrl;
          e.target.textContent = '✓ Downloaded';
        } catch (err) {
          toast(err.message, 'bad');
          e.target.disabled = false;
          e.target.textContent = '⤓ Download as Word';
        }
      },
    }, '⤓ Download as Word'));

  openDrawer(g.title, body, foot);
}

/* --------------------------------------------------------- the drawer */

function closeDrawer() {
  $('#drawer').hidden = true;
  $('#drawer-backdrop').hidden = true;
}

function openDrawer(title, bodyNode, footNode) {
  const drawer = clear($('#drawer'));
  drawer.append(
    h('header', h('h2.grow', title), h('button.icon-btn', { onclick: closeDrawer, title: 'Close' }, '×')),
    h('div.drawer-body', bodyNode),
    footNode ? h('div.drawer-foot', footNode) : null);
  drawer.hidden = false;
  $('#drawer-backdrop').hidden = false;
  const first = drawer.querySelector('input, textarea, select');
  if (first) first.focus();
}

$('#drawer-backdrop').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

/* ---- task add / edit ---- */

async function openTaskDrawer(taskId, defaults = {}) {
  let task = null;
  if (taskId) {
    const all = await api.tasks();
    task = all.find((t) => t.id === taskId || t.ref === taskId);
    if (!task) return toast('That task could not be found.', 'bad');
  }
  const isNew = !task;
  const v = task || {
    workstreamId: defaults.workstreamId || state.boot.workstreams[0].id,
    status: 'open', stage: 'Not started', priority: 'normal', blockers: [], deadline: '',
  };

  const wsSelect = h('select', state.boot.workstreams.map((w) =>
    h('option', { value: w.id, selected: w.id === v.workstreamId }, w.name)));
  const subSelect = h('select');
  const fillSubs = () => {
    const ws = state.boot.workstreams.find((w) => w.id === wsSelect.value);
    fill(subSelect, 
      h('option', { value: '' }, '— none —'),
      (ws?.subcategories || []).map((s) => h('option', { value: s.id, selected: s.id === v.subcategory }, s.name)));
  };
  fillSubs();
  wsSelect.addEventListener('change', fillSubs);

  const title = h('input', { type: 'text', value: v.title || '', placeholder: 'What needs doing?' });
  const deadline = h('input', { type: 'date', value: v.deadline || '' });
  const statusSel = h('select', state.boot.statuses.map((s) =>
    h('option', { value: s.key, selected: s.key === v.status }, s.label)));
  const stageSel = h('select',
    h('option', { value: '' }, '— not set —'),
    state.boot.stages.map((s) => h('option', { value: s, selected: s === v.stage }, s)));
  const theme = h('input', { type: 'text', value: v.theme || '', placeholder: 'e.g. Consultant onboarding' });
  const owner = h('input', { type: 'text', value: v.owner || '', placeholder: 'Who owns it' });
  const nextBy = h('input', { type: 'text', value: v.nextActionBy || '', placeholder: 'Whose action is required next' });
  const description = h('textarea', { placeholder: 'Any detail worth keeping.' }, v.description || '');
  const blockers = h('textarea', { placeholder: 'One per line. Leave empty if nothing is in the way.' },
    (v.blockers || []).map((b) => b.text).join('\n'));

  const body = h('div',
    h('div.field', h('label', 'Task'), title),
    h('div.row',
      h('div.field', h('label', 'Workstream'), wsSelect),
      h('div.field.optional', h('label', 'Sub-category'), subSelect)),
    h('div.row',
      h('div.field', h('label', 'Deadline'), deadline,
        h('div.hint', 'The countdown on every screen is driven by this.')),
      h('div.field', h('label', 'Status'), statusSel)),
    h('div.row',
      h('div.field.optional', h('label', 'Stage'), stageSel),
      h('div.field.optional', h('label', 'Theme / group'), theme,
        h('div.hint', 'Tasks sharing a theme are shown together.'))),
    h('div.row',
      h('div.field.optional', h('label', 'Owner'), owner),
      h('div.field.optional', h('label', 'Next action by'), nextBy)),
    h('div.field.optional', h('label', 'Detail'), description),
    h('div.field.optional', h('label', 'Blockers / potential blockers'), blockers),
    task ? h('div.field', h('label', 'Reference'), h('p', h('span.ref', task.ref),
      h('span.muted.small', '  created ' + new Date(task.createdAt).toLocaleDateString()))) : null,
    task && task.history?.length
      ? h('div.field', h('label', 'History'),
        h('div.small.soft', { style: { maxHeight: '160px', overflowY: 'auto' } },
          task.history.slice().reverse().map((e) =>
            h('div', { style: { padding: '4px 0', borderBottom: '1px solid var(--line)' } },
              h('span.mono.small.muted', new Date(e.at).toLocaleString() + '  '), e.detail))))
      : null);

  const collect = () => ({
    title: title.value.trim(),
    workstreamId: wsSelect.value,
    subcategory: subSelect.value || null,
    deadline: deadline.value || null,
    status: statusSel.value,
    stage: stageSel.value || null,
    theme: theme.value.trim() || null,
    owner: owner.value.trim() || null,
    nextActionBy: nextBy.value.trim() || null,
    description: description.value.trim(),
    blockers: blockers.value.split('\n').map((s) => s.trim()).filter(Boolean).map((t) => ({ text: t, kind: 'blocker' })),
  });

  const save = async (e) => {
    const payload = collect();
    if (!payload.title) return toast('Give the task a name first.', 'bad');
    e.target.disabled = true;
    try {
      if (isNew) await api.createTask(payload);
      else await api.patchTask(task.id, payload);
      state.boot = await api.bootstrap();
      closeDrawer();
      toast(isNew ? 'Task added.' : 'Task updated.', 'good');
      render();
    } catch (err) { toast(err.message, 'bad'); e.target.disabled = false; }
  };

  const foot = h('div', { style: { display: 'flex', gap: '10px', width: '100%' } },
    task ? h('button.btn.btn-danger', {
      onclick: async () => {
        if (!confirm(`Delete ${task.ref}? This cannot be undone.`)) return;
        try {
          await api.deleteTask(task.id);
          state.boot = await api.bootstrap();
          closeDrawer(); toast('Task deleted.'); render();
        } catch (err) { toast(err.message, 'bad'); }
      },
    }, 'Delete') : null,
    h('div.spacer'),
    h('button.btn', { onclick: closeDrawer }, 'Cancel'),
    h('button.btn.btn-primary', { onclick: save }, isNew ? 'Add task' : 'Save changes'));

  openDrawer(isNew ? 'New task' : 'Update task', body, foot);
}

async function openTaskPicker(workstreamId) {
  const all = await api.tasks(workstreamId ? { workstream: workstreamId } : null);
  const live = all.filter((t) => t.status !== 'completed');
  const search = h('input', { type: 'search', placeholder: 'Search by name or reference…' });
  const holder = h('div.card-body.tight');
  const draw = (items) => fill(holder, items.length
    ? items.map((t) => h('div.task', { onclick: () => { closeDrawer(); openTaskDrawer(t.id); } },
      h('div.body', h('div.title', t.title),
        h('div.meta', h('span.ref', t.ref), t.stage ? h('span', '· ' + t.stage) : null)),
      h('div.right', statusPill(t.status), deadlineEl(t.deadline))))
    : emptyState('Nothing matches.'));
  draw(live);
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    draw(live.filter((t) => (t.title + ' ' + t.ref + ' ' + (t.theme || '')).toLowerCase().includes(q)));
  });
  openDrawer('Which task?', h('div',
    h('div.field', search),
    h('div.card', { style: { margin: 0 } }, holder),
    h('p.soft.small', { style: { marginTop: '12px' } },
      'Completed tasks are hidden here. Find them on the workstream dashboard.')));
}

/** Choose a form to fill in. */
async function openFormPicker(workstreamId) {
  const all = await api.forms(workstreamId ? { workstream: workstreamId } : null);
  const guided = all.filter((f) => f.guided);
  const manual = all.filter((f) => !f.guided);

  openDrawer('Which form?', h('div',
    h('p.soft.small', 'Pick one and I will ask you what it needs, one question at a time.'),
    h('div.card', { style: { margin: '0 0 14px' } },
      h('div.card-body.tight', guided.length
        ? guided.map((f) => h('div.doc-row', {
          style: { cursor: 'pointer' },
          onclick: () => { closeDrawer(); go('/form/' + f.id); },
        },
          h('span.fmt.docx', 'docx'),
          h('div.grow',
            h('div.name', f.title),
            h('div.sub', (f.officialNo || 'no official number')
              + (f.subArea ? ' · ' + f.subArea : '')
              + (workstreamId ? '' : ' · ' + f.workstreamName))),
          h('span.pill.ghost', 'fill in')))
        : emptyState('No forms here can be filled in automatically yet.'))),
    manual.length
      ? h('div.card', { style: { margin: 0 } },
        h('header', h('h3.grow', 'Fill these in by hand')),
        h('div.card-body',
          h('p.soft.small', 'These are spreadsheets. Download one, fill it in, then give it an internal number so it stays tracked.')),
        h('div.card-body.tight', manual.map((f) => h('div.doc-row',
          h('span.fmt.' + f.format, f.format),
          h('div.grow', h('div.name', f.title)),
          h('a.btn.btn-sm', { href: `/file?id=${f.id}&download=1` }, 'Download')))))
      : null));
}

/* ---- internal document number ---- */

async function openDocumentDrawer(workstreamId) {
  const wsSelect = h('select', state.boot.workstreams.map((w) =>
    h('option', { value: w.id, selected: w.id === workstreamId }, w.name)));
  const kindSelect = h('select', Object.entries(state.boot.docKinds).map(([k, label]) =>
    h('option', { value: k, selected: k === 'FRM' }, label)));
  const title = h('input', { type: 'text', placeholder: 'e.g. Personnel Action Form — A. Rahman' });
  const officialNo = h('input', { type: 'text', placeholder: 'Leave blank if you do not have one' });
  const subject = h('input', { type: 'text', placeholder: 'Who or what it is about' });
  const owner = h('input', { type: 'text', placeholder: 'Who is handling it' });
  const notes = h('textarea', { placeholder: 'Anything worth remembering.' });

  const body = h('div',
    h('div.alert.info', h('span.icon', 'i'),
      h('span', 'You will get a number like SCAI-RES-FRM-0004. It is unique, it is never reused, and it lets you talk about one specific copy of a form even when several copies share the same official Scicom number.')),
    h('div.field', h('label', 'What is it?'), title),
    h('div.row',
      h('div.field', h('label', 'Workstream'), wsSelect),
      h('div.field', h('label', 'Kind of document'), kindSelect)),
    h('div.row',
      h('div.field.optional', h('label', 'Official Scicom number'), officialNo),
      h('div.field.optional', h('label', 'Subject'), subject)),
    h('div.field.optional', h('label', 'Owner'), owner),
    h('div.field.optional', h('label', 'Notes'), notes));

  const foot = h('div', { style: { display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end' } },
    h('button.btn', { onclick: closeDrawer }, 'Cancel'),
    h('button.btn.btn-primary', {
      onclick: async (e) => {
        if (!title.value.trim()) return toast('Say what the document is first.', 'bad');
        e.target.disabled = true;
        try {
          const doc = await api.createDocument({
            workstreamId: wsSelect.value, kind: kindSelect.value, title: title.value.trim(),
            officialNo: officialNo.value.trim() || null, subject: subject.value.trim() || null,
            owner: owner.value.trim() || null, notes: notes.value.trim(),
          });
          closeDrawer();
          toast(`Assigned ${doc.internalNo}.`, 'good');
          render();
        } catch (err) { toast(err.message, 'bad'); e.target.disabled = false; }
      },
    }, 'Assign a number'));

  openDrawer('Assign an internal document number', body, foot);
}

/* ---- finance record ---- */

async function openFinanceDrawer(recordId) {
  let rec = null;
  if (recordId) {
    const f = await api.finance();
    rec = f.records.find((r) => r.id === recordId);
  }
  const v = rec || { date: new Date().toISOString().slice(0, 10) };
  const field = (label, node, optional) =>
    h('div.field' + (optional ? '.optional' : ''), h('label', label), node);

  const vendor = h('input', { type: 'text', value: v.vendor || '' });
  const type = h('input', { type: 'text', value: v.type || '', placeholder: 'e.g. Inference API' });
  const purpose = h('input', { type: 'text', value: v.purpose || '', placeholder: 'e.g. R&D' });
  const costType = h('select',
    ['', 'One time cost', 'Monthly Subscription', 'Yearly subscription', 'Pay per Use', 'Project Cost']
      .map((c) => h('option', { value: c, selected: c === (v.costType || '') }, c || '— not set —')));
  const invoiceNo = h('input', { type: 'text', value: v.invoiceNo || '', placeholder: 'Invoice or reference number' });
  const card = h('input', { type: 'text', value: v.card || '', placeholder: 'Which card or account paid' });
  const usd = h('input', { type: 'number', step: '0.01', value: v.amountUSD ?? '' });
  const rm = h('input', { type: 'number', step: '0.01', value: v.amountRM ?? '' });
  const fx = h('input', { type: 'number', step: '0.0001', value: v.fxRate ?? '' });
  const date = h('input', { type: 'date', value: v.date || '' });
  const accountCode = h('input', { type: 'text', value: v.accountCode || '', placeholder: 'e.g. 90040-160-508-00' });
  const project = h('input', { type: 'text', value: v.project || '', placeholder: 'e.g. AIES' });
  const remark = h('input', { type: 'text', value: v.remark || '' });

  const body = h('div',
    rec ? h('p', h('span.ref', rec.ref), rec.source === 'spreadsheet-import'
      ? h('span.muted.small', '  imported from ' + rec.sourceFile) : null) : null,
    field('Vendor / item', vendor),
    h('div.row', field('Date', date), field('Cost type', costType)),
    h('div.row', field('Invoice / reference number', invoiceNo), field('Card or account used', card)),
    h('div.row', field('Amount USD', usd, true), field('Amount RM', rm, true), field('Exchange rate', fx, true)),
    h('div.row', field('Type', type, true), field('Purpose', purpose, true)),
    h('div.row', field('Account code', accountCode, true), field('Project', project, true)),
    field('Remark', remark, true),
    h('div.alert.warn', h('span.icon', '!'),
      h('span', 'Finance is checked hardest. A record with no invoice number, no card or no cost type is flagged as a point of concern until it is filled in.')));

  const payload = () => ({
    vendor: vendor.value.trim(), type: type.value.trim() || null, purpose: purpose.value.trim() || null,
    costType: costType.value || null, invoiceNo: invoiceNo.value.trim() || null, card: card.value.trim() || null,
    amountUSD: usd.value, amountRM: rm.value, fxRate: fx.value, date: date.value || null,
    accountCode: accountCode.value.trim() || null, project: project.value.trim() || null,
    remark: remark.value.trim() || null,
  });

  const foot = h('div', { style: { display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end' } },
    h('button.btn', { onclick: closeDrawer }, 'Cancel'),
    h('button.btn.btn-primary', {
      onclick: async (e) => {
        if (!vendor.value.trim()) return toast('Name the vendor first.', 'bad');
        e.target.disabled = true;
        try {
          if (rec) await api.patchFinance(rec.id, payload());
          else await api.createFinance(payload());
          closeDrawer(); toast('Saved.', 'good'); render();
        } catch (err) { toast(err.message, 'bad'); e.target.disabled = false; }
      },
    }, rec ? 'Save changes' : 'Record charge'));

  openDrawer(rec ? 'Charge ' + rec.ref : 'Record a charge', body, foot);
}

/* ------------------------------------------------------------ routing */

async function render() {
  state.route = parseRoute();
  renderSidebar();
  const main = clear($('#main'));
  main.append(h('div.loading', 'Loading…'));

  try {
    const { view, id, tab } = state.route;
    if (view === 'home') await viewHome(main);
    else if (view === 'deadlines') await viewDeadlines(main);
    else if (view === 'ws' && id) await viewWorkstream(main, id, tab);
    else if (view === 'form' && id) await viewFormFiller(main, id);
    else if (view === 'guides') await viewGuides(main, id);
    else if (view === 'masterlist') await viewMasterList(main);
    else if (view === 'rules') await viewRules(main);
    else if (view === 'new-initiative') viewNewInitiative(main);
    else if (view === 'update-workstream') viewUpdateWorkstream(main, id);
    else {
      fill(main, h('div.card', h('div.card-body',
        emptyState('That page does not exist.', h('a.btn.btn-primary', { href: '#/home' }, 'Back to the dashboard')))));
    }
  } catch (err) {
    fill(main, h('div.card', h('div.card-body',
      h('div.alert.alert-alert', h('span.icon', '!'), h('span', err.message)),
      h('button.btn', { onclick: render }, 'Try again'))));
  }
  tickCountdowns();
}

/* -------------------------------------------------------------- start */

async function start() {
  tickClock();
  setInterval(tickClock, 1000);

  try {
    state.boot = await api.bootstrap();
  } catch (err) {
    fill($('#main'), h('div.card', h('div.card-body',
      h('h2', 'The system could not start'),
      h('p.soft', err.message),
      h('p.soft.small', 'Make sure the server is still running in the terminal window.'))));
    return;
  }

  const pill = $('#llm-pill');
  const setPill = (llm) => {
    pill.className = 'llm-pill ' + (llm.available ? 'on' : 'off');
    pill.textContent = llm.available ? `local AI: ${llm.model}` : 'no local AI — still fine';
    pill.title = llm.available
      ? `Ollama is running on this computer with ${llm.model}. Wording gets tidied automatically.`
      : 'Ollama is not running. Everything works; your wording is kept exactly as typed. Install Ollama later to turn tidying on.';
  };
  setPill(state.boot.llm);
  pill.style.cursor = 'pointer';
  pill.addEventListener('click', async () => { setPill(await api.llm()); toast('Checked for a local AI.'); });

  $('#quick-add-btn').addEventListener('click', () => openTaskDrawer(null));

  menu.button.addEventListener('click', () => menu.toggle());
  menu.backdrop.addEventListener('click', () => menu.close());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.close(); });
  // Rotating the phone, or widening the window, should not leave it half open.
  window.addEventListener('resize', () => { if (!menu.isNarrow) menu.close(); });

  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#/home';
  await render();
}

start();
