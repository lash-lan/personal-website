'use strict';
/**
 * store.js — every piece of information this system remembers lives in a plain
 * JSON file inside the `data/` folder. Nothing is hidden in a database, so the
 * whole system can be copied to another computer by copying the folder.
 *
 * Writes are "atomic": we write to a temporary file first and then rename it,
 * so a crash mid-save can never leave a half-written file behind.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const cache = new Map();

function filePath(name) {
  return path.join(DATA_DIR, name + '.json');
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function read(name, fallback) {
  if (cache.has(name)) return cache.get(name);
  ensureDir();
  const p = filePath(name);
  let value;
  if (fs.existsSync(p)) {
    try {
      value = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
      // A corrupt file is kept aside rather than destroyed, so nothing is lost.
      const backup = p + '.corrupt-' + Date.now();
      fs.renameSync(p, backup);
      console.error(`[store] ${name}.json could not be read; kept at ${backup}`);
      value = typeof fallback === 'function' ? fallback() : fallback;
      writeNow(name, value);
    }
  } else {
    value = typeof fallback === 'function' ? fallback() : fallback;
    writeNow(name, value);
  }
  cache.set(name, value);
  return value;
}

function writeNow(name, value) {
  ensureDir();
  const p = filePath(name);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, p);
  cache.set(name, value);
  return value;
}

/** Read a collection, change it with `fn`, then save. Returns whatever fn returns. */
function update(name, fallback, fn) {
  const value = read(name, fallback);
  const result = fn(value);
  writeNow(name, value);
  return result;
}

function backupAll(label) {
  ensureDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(DATA_DIR, '_backups', `${stamp}${label ? '-' + label : ''}`);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (f.endsWith('.json')) fs.copyFileSync(path.join(DATA_DIR, f), path.join(dir, f));
  }
  return dir;
}

module.exports = { DATA_DIR, read, write: writeNow, update, backupAll };
