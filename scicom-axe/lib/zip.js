'use strict';
/**
 * zip.js — just enough ZIP to open a Word file and put it back together.
 *
 * A .docx is a ZIP archive with XML inside it. To fill a form in we have to
 * open that archive, change one file inside it, and write it out again.
 *
 * Node can already compress and decompress (`node:zlib`), but it cannot read
 * or write the ZIP container itself. Rather than install a package — which
 * would break the "copy the folder and it runs" rule this whole system is
 * built on — this reads and writes the container directly. It is about two
 * hundred lines and it only has to handle the kind of ZIP that Word produces.
 *
 * Supported: stored (no compression) and deflate entries, which is everything
 * Word and Excel emit. Not supported: encryption, ZIP64, multi-part archives.
 */

const zlib = require('zlib');

const LOCAL_SIG = 0x04034b50;   // start of a file inside the archive
const CENTRAL_SIG = 0x02014b50; // entry in the index at the end
const END_SIG = 0x06054b50;     // the marker that closes the archive

/** Find the end-of-archive record, which sits in the last 64KB. */
function findEnd(buf) {
  const from = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= from; i--) {
    if (buf.readUInt32LE(i) === END_SIG) return i;
  }
  throw new Error('This does not look like a Word or Excel file (no ZIP end record).');
}

/**
 * Read an archive into a list of entries, in the order they appear.
 * Each entry is { name, data, method, ... } with `data` already decompressed.
 */
function read(buf) {
  const end = findEnd(buf);
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);          // offset of the index
  const entries = [];

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== CENTRAL_SIG) {
      throw new Error('The file is damaged (bad entry in the ZIP index).');
    }
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const time = buf.readUInt16LE(p + 12);
    const date = buf.readUInt16LE(p + 14);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const rawSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    // The local header repeats the name and extra field, and its extra field
    // can be a different length from the one in the index, so read it again.
    if (buf.readUInt32LE(localOffset) !== LOCAL_SIG) {
      throw new Error(`The file is damaged (bad header for ${name}).`);
    }
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const stored = buf.subarray(start, start + compSize);

    let data;
    if (method === 0) data = Buffer.from(stored);
    else if (method === 8) data = zlib.inflateRawSync(stored);
    else throw new Error(`${name} uses an unsupported compression method (${method}).`);

    entries.push({ name, data, method, flags, time, date, crc, rawSize });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/* CRC-32, which every ZIP entry carries so readers can spot corruption. */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function dosTime(d = new Date()) {
  return {
    time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
    date: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
  };
}

/**
 * Write entries back out as a ZIP.
 *
 * Entry order is preserved. Word is fussy about `[Content_Types].xml` coming
 * first, and since we keep the order we read them in, it always does.
 */
function write(entries) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const e of entries) {
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8');
    // Keep whatever the entry already used; default to deflate for new content.
    const method = e.method === 0 ? 0 : 8;
    const body = method === 0 ? raw : zlib.deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw);
    const name = Buffer.from(e.name, 'utf8');
    const { time, date } = e.time !== undefined && e.date !== undefined
      ? { time: e.time, date: e.date }
      : dosTime();

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(20, 4);              // version needed
    local.writeUInt16LE(0, 6);               // flags — no data descriptor
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);              // no extra field
    name.copy(local, 30);

    locals.push(local, body);

    const cen = Buffer.alloc(46 + name.length);
    cen.writeUInt32LE(CENTRAL_SIG, 0);
    cen.writeUInt16LE(20, 4);                // version made by
    cen.writeUInt16LE(20, 6);                // version needed
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(method, 10);
    cen.writeUInt16LE(time, 12);
    cen.writeUInt16LE(date, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(body.length, 20);
    cen.writeUInt32LE(raw.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt16LE(0, 30);                // extra
    cen.writeUInt16LE(0, 32);                // comment
    cen.writeUInt16LE(0, 34);                // disk number
    cen.writeUInt16LE(0, 36);                // internal attributes
    cen.writeUInt32LE(0, 38);                // external attributes
    cen.writeUInt32LE(offset, 42);
    name.copy(cen, 46);
    central.push(cen);

    offset += local.length + body.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_SIG, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, end]);
}

/** Convenience: pull one file out of an archive as text. */
function readText(entries, name) {
  const e = entries.find((x) => x.name === name);
  return e ? e.data.toString('utf8') : null;
}

/** Convenience: replace one file's contents in place. */
function replaceText(entries, name, text) {
  const e = entries.find((x) => x.name === name);
  if (!e) throw new Error(`${name} is not in this file.`);
  e.data = Buffer.from(text, 'utf8');
  if (e.method !== 0) e.method = 8;
  return entries;
}

module.exports = { read, write, readText, replaceText, crc32 };
