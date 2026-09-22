'use strict';
/**
 * server.js — start this and the system is running.
 *
 *     npm start          (or: node server.js)
 *     then open http://localhost:4173
 *
 * It listens only on this computer. Nothing is published to the internet and
 * nothing is sent anywhere. Stop it with Ctrl+C.
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { URL } = require('url');

const api = require('./lib/api');
const catalog = require('./lib/catalog');
const qr = require('./lib/qr');

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.doc': 'application/msword',
  '.xls': 'application/vnd.ms-excel',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function readBody(req, limit = 40 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('That file is too large (40 MB limit).'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Serve a file, refusing anything that tries to escape the folder it is in. */
function serveFile(res, baseDir, relPath, { download } = {}) {
  const abs = path.resolve(baseDir, relPath);
  if (!abs.startsWith(path.resolve(baseDir) + path.sep) && abs !== path.resolve(baseDir)) {
    return sendJson(res, 403, { error: 'Not allowed.' });
  }
  let stat;
  try {
    stat = fs.statSync(abs);
  } catch {
    return sendJson(res, 404, { error: 'File not found.' });
  }
  if (!stat.isFile()) return sendJson(res, 404, { error: 'File not found.' });

  const headers = {
    'content-type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream',
    'content-length': stat.size,
  };
  if (download) {
    // Send both forms of the filename. `filename*` carries the real name with
    // its accents and dashes intact; the plain `filename` is a stripped-down
    // ASCII version for anything that does not understand the first, which
    // otherwise saves the file as "download" with no extension.
    const name = path.basename(abs);
    const ascii = name.replace(/[^\x20-\x7E]/g, '-').replace(/["\\]/g, '');
    headers['content-disposition'] =
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
  }
  res.writeHead(200, headers);
  fs.createReadStream(abs).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const query = Object.fromEntries(url.searchParams);

  try {
    /* ---- downloading a policy or a form out of the resources folder ---- */
    if (pathname === '/file' && req.method === 'GET') {
      const rel = catalog.decodeId(query.id || '');
      if (!rel) return sendJson(res, 400, { error: 'Unknown file.' });
      const base = query.fillable === '1' ? catalog.CONVERTED : catalog.RESOURCES;
      return serveFile(res, base, rel, { download: query.download === '1' });
    }

    /* ---- downloading something the system generated ---- */
    if (pathname.startsWith('/exports/') && req.method === 'GET') {
      return serveFile(res, path.join(__dirname, 'exports'), pathname.slice('/exports/'.length), { download: true });
    }

    /* ---- the API ---- */
    if (pathname.startsWith('/api/')) {
      const route = api.match(req.method, pathname);
      if (!route) return sendJson(res, 404, { error: `No such address: ${req.method} ${pathname}` });

      let body = {};
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        const raw = await readBody(req);
        if (raw.length) {
          try {
            body = JSON.parse(raw.toString('utf8'));
          } catch {
            return sendJson(res, 400, { error: 'The request was not valid JSON.' });
          }
        }
      }
      const result = await route.handler({ params: route.params, query, body, req });
      return sendJson(res, 200, result);
    }

    /* ---- the screen itself ---- */
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed.' });
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    const abs = path.resolve(PUBLIC, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return serveFile(res, PUBLIC, rel);
    return serveFile(res, PUBLIC, 'index.html'); // single page app: all routes show the app
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[error]', err);
    return sendJson(res, status, { error: err.message || 'Something went wrong.' });
  }
});

/**
 * Open the browser on the right page, once the server is actually listening.
 *
 * Only runs when started by double-clicking, which sets OPEN=1. If it fails —
 * no desktop, an unusual setup — it fails quietly, because the address is
 * printed above anyway and the system itself is running perfectly well.
 */
function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'cmd'
    : process.platform === 'darwin' ? 'open'
      : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '""', url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* nothing to do; the address is on screen */
  }
}

/** The addresses this machine can be reached on from the rest of the network. */
function networkAddresses() {
  const out = [];
  for (const [, list] of Object.entries(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

server.listen(PORT, HOST, () => {
  const onNetwork = HOST !== '127.0.0.1' && HOST !== 'localhost';
  const line = `  Scicom Axe  —  http://localhost:${PORT}  `;
  const bar = '─'.repeat(line.length);
  console.log(`\n┌${bar}┐\n│${line}│\n└${bar}┘`);
  console.log('  Open that address in your browser. Press Ctrl+C here to stop.');

  if (process.env.OPEN === '1') openBrowser(`http://localhost:${PORT}`);

  if (!onNetwork) {
    console.log('  Only this computer can reach it.\n');
    return;
  }

  // Bound to the whole network, so say so loudly and say what it means.
  const addrs = networkAddresses();
  const W = 58;                                   // inside width of the box
  const row = (text = '') => console.log('  │' + ` ${text}`.padEnd(W) + '│');
  const rule = (label) => console.log('  ' + (label
    ? '├' + `─ ${label} `.padEnd(W, '─') + '┤'
    : '├' + '─'.repeat(W) + '┤'));

  console.log('');
  console.log('  ┌' + '─ ON THE NETWORK '.padEnd(W, '─') + '┐');
  if (addrs.length) {
    row('Point your phone camera at this:');
  } else {
    row('No network address found — are you connected to Wi-Fi?');
  }
  rule();

  // A QR code saves typing an IP address into a phone, which is the single
  // most annoying part of this. If drawing it fails for any reason, the
  // address below is still there to type by hand.
  if (addrs.length) {
    const url = `http://${addrs[0]}:${PORT}`;
    try {
      console.log('');
      for (const line of qr.toText(qr.encode(url, { level: 'M' })).split('\n')) {
        console.log('  ' + line);
      }
      console.log('');
    } catch {
      /* fall through to the typed address */
    }
    row('Or type it in:');
    for (const a of addrs) row(`  http://${a}:${PORT}`);
    rule();
  }
  row('There is NO PASSWORD on this. Anyone else on the');
  row('same network can open it and see your tasks, the');
  row('policies and the finance figures.');
  row();
  row('Fine on your home Wi-Fi. Think twice on an office');
  row('or a public one.');
  row();
  row('Press Ctrl+C when you are finished.');
  console.log('  └' + '─'.repeat(W) + '┘\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use.`);
    console.error('');
    console.error('  The usual reason is that Scicom Axe is ALREADY RUNNING in');
    console.error('  another window. Look for it — you may simply be able to open');
    console.error(`  http://localhost:${PORT} and carry on.`);
    console.error('');
    console.error('  Otherwise, close whatever is using that port, or start this one');
    console.error('  somewhere else:');
    console.error('');
    console.error(`    Windows PowerShell   $env:PORT=${PORT + 1}; npm start`);
    console.error(`    Git Bash or Mac      PORT=${PORT + 1} npm start`);
    console.error('');
    process.exit(1);
  }
  throw err;
});
