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
const path = require('path');
const { URL } = require('url');

const api = require('./lib/api');
const catalog = require('./lib/catalog');

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

server.listen(PORT, HOST, () => {
  const line = `  Scicom Axe  —  http://${HOST}:${PORT}  `;
  const bar = '─'.repeat(line.length);
  console.log(`\n┌${bar}┐\n│${line}│\n└${bar}┘`);
  console.log('  Open that address in your browser. Press Ctrl+C here to stop.\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use — something else is running there.`);
    console.error(`Either stop it, or start this on a different port:  PORT=4174 npm start\n`);
    process.exit(1);
  }
  throw err;
});
