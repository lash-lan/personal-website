// Every tool's actual work, run in the reader's browser.
//
// Each engine takes (files, opts, report) and resolves to [{name, blob}].
// Heavy libraries are imported only when a tool that needs them is used, so
// visiting the Workshop does not download a PDF engine you never asked for.

const QUALITY = {
  // jpeg/webp encoder quality
  jpeg:  { high: 0.94, medium: 0.78, low: 0.55 },
  // how many device pixels per PDF point when rasterising
  scale: { high: 2.6,  medium: 1.7,  low: 1.05 },
};
const q = (table, opts) => table[opts.quality] ?? table.medium;

const stem = (name) => name.replace(/\.[^.]+$/, '');
const ext = (mime) => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[mime] || 'bin');
const text = (f) => f.text();
const bytes = async (f) => new Uint8Array(await f.arrayBuffer());

// ─── lazy library loaders ──────────────────────────────────────────────
let _pdfjs;
async function pdfjs() {
  if (!_pdfjs) {
    const lib = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url');
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    _pdfjs = lib;
  }
  return _pdfjs;
}
const pdflib = () => import('pdf-lib');

// ─── shared helpers ────────────────────────────────────────────────────
function canvasBlob(canvas, type, quality) {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode image'))), type, quality)
  );
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
}

async function drawToBlob(src, w, h, type, quality) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return canvasBlob(c, type, quality);
}

async function renderPdfPage(page, scale, type, quality) {
  const vp = page.getViewport({ scale });
  const c = document.createElement('canvas');
  c.width = Math.round(vp.width);
  c.height = Math.round(vp.height);
  const ctx = c.getContext('2d');
  if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return canvasBlob(c, type, quality);
}

// "1-3, 7, 10-12" -> [0,1,2,6,9,10,11]
function parseRanges(spec, total) {
  const out = [];
  for (const part of String(spec || '').split(',')) {
    const s = part.trim();
    if (!s) continue;
    const m = s.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (m) {
      let [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
      if (a > b) [a, b] = [b, a];
      for (let i = a; i <= b; i++) if (i >= 1 && i <= total) out.push(i - 1);
    } else if (/^\d+$/.test(s)) {
      const n = parseInt(s, 10);
      if (n >= 1 && n <= total) out.push(n - 1);
    } else {
      throw new Error(`Could not read "${s}" as a page or range`);
    }
  }
  return [...new Set(out)];
}

// ─── CSV ───────────────────────────────────────────────────────────────
function parseCSV(str) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  str = str.replace(/^﻿/, '');
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (quoted) {
      if (c === '"') {
        if (str[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && str[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

const blobOf = (data, type) => new Blob([data], { type });

// ─── audio & video helpers ─────────────────────────────────────────────
// "1:23", "83", "1:02:03" -> seconds
function timecode(v, fallback) {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  const parts = s.split(':').map((p) => parseFloat(p));
  if (parts.some((n) => Number.isNaN(n))) throw new Error(`Could not read "${s}" as a time`);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}
const fmtTime = (s) => {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return `${m}m${String(r).padStart(2, '0')}s`;
};

/** Decode any media the browser can play into raw samples. */
async function decodeAudio(file) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('This browser cannot decode audio');
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error(`Could not decode the audio in ${file.name}. Try a different file.`);
  } finally {
    ctx.close?.();
  }
}

function sliceAudio(buffer, from, to) {
  const rate = buffer.sampleRate;
  const a = Math.floor(from * rate);
  const len = Math.floor((to - from) * rate);
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const out = new Ctx(buffer.numberOfChannels, len, rate);
  const made = out.createBuffer(buffer.numberOfChannels, len, rate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    made.copyToChannel(buffer.getChannelData(c).subarray(a, a + len), c);
  }
  return made;
}

function encodeWav(buffer) {
  const chans = buffer.numberOfChannels, rate = buffer.sampleRate;
  const frames = buffer.length;
  const data = new DataView(new ArrayBuffer(44 + frames * chans * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); data.setUint32(4, 36 + frames * chans * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
  data.setUint16(22, chans, true); data.setUint32(24, rate, true);
  data.setUint32(28, rate * chans * 2, true); data.setUint16(32, chans * 2, true);
  data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, frames * chans * 2, true);
  const chan = [];
  for (let c = 0; c < chans; c++) chan.push(buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < chans; c++) {
      const v = Math.max(-1, Math.min(1, chan[c][i]));
      data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return blobOf(data.buffer, 'audio/wav');
}

async function encodeMp3(buffer, kbps, report) {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const chans = Math.min(2, buffer.numberOfChannels);
  const enc = new Mp3Encoder(chans, buffer.sampleRate, kbps);
  const toPcm = (f32) => {
    const out = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const v = Math.max(-1, Math.min(1, f32[i]));
      out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    return out;
  };
  const left = toPcm(buffer.getChannelData(0));
  const right = chans > 1 ? toPcm(buffer.getChannelData(1)) : null;

  const parts = [];
  const BLOCK = 1152;
  for (let i = 0; i < left.length; i += BLOCK) {
    const l = left.subarray(i, i + BLOCK);
    const r = right ? right.subarray(i, i + BLOCK) : undefined;
    const chunk = right ? enc.encodeBuffer(l, r) : enc.encodeBuffer(l);
    if (chunk.length) parts.push(chunk);
    if (report && i % (BLOCK * 400) === 0) {
      report(`Encoding at ${kbps}kbps`, i / left.length);
      await new Promise((res) => setTimeout(res, 0));   // let the page breathe
    }
  }
  const last = enc.flush();
  if (last.length) parts.push(last);
  // each part is its own chunk: passing the array itself would stringify it
  return new Blob(parts, { type: 'audio/mpeg' });
}

/** Seek a <video> and wait until that frame is actually ready to draw. */
function seekTo(video, t) {
  return new Promise((res, rej) => {
    const done = () => { cleanup(); res(); };
    const fail = () => { cleanup(); rej(new Error('Could not read that frame')); };
    const cleanup = () => {
      video.removeEventListener('seeked', done);
      video.removeEventListener('error', fail);
      clearTimeout(timer);
    };
    const timer = setTimeout(done, 3000);              // never hang on one frame
    video.addEventListener('seeked', done);
    video.addEventListener('error', fail);
    video.currentTime = Math.max(0, t);
  });
}

// ─── engines ───────────────────────────────────────────────────────────
export const ENGINES = {
  // PDF ────────────────────────────────────────────────────────────────
  async pdfMerge(files, opts, report) {
    const { PDFDocument } = await pdflib();
    const out = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
      report(`Reading ${files[i].name}`, i / files.length);
      const src = await PDFDocument.load(await bytes(files[i]), { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    report('Binding', 0.95);
    return [{ name: 'merged.pdf', blob: blobOf(await out.save(), 'application/pdf') }];
  },

  async pdfSplit(files, opts, report) {
    const { PDFDocument } = await pdflib();
    const file = files[0];
    const src = await PDFDocument.load(await bytes(file), { ignoreEncryption: true });
    const total = src.getPageCount();
    const wanted = parseRanges(opts.ranges, total);
    const base = stem(file.name);

    if (wanted.length) {
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, wanted);
      pages.forEach((p) => out.addPage(p));
      return [{ name: `${base} (pages ${opts.ranges.trim()}).pdf`,
                blob: blobOf(await out.save(), 'application/pdf') }];
    }
    const results = [];
    for (let i = 0; i < total; i++) {
      report(`Page ${i + 1} of ${total}`, i / total);
      const out = await PDFDocument.create();
      const [p] = await out.copyPages(src, [i]);
      out.addPage(p);
      results.push({ name: `${base} p${String(i + 1).padStart(3, '0')}.pdf`,
                     blob: blobOf(await out.save(), 'application/pdf') });
    }
    return results;
  },

  // driven by the page grid: opts.pages = [{index, rotate, keep}]
  async pdfOrganise(files, opts, report) {
    const { PDFDocument, degrees } = await pdflib();
    const src = await PDFDocument.load(await bytes(files[0]), { ignoreEncryption: true });
    const plan = (opts.pages || []).filter((p) => p.keep);
    if (!plan.length) throw new Error('No pages selected');
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, plan.map((p) => p.index));
    copied.forEach((page, i) => {
      const turn = plan[i].rotate % 360;
      if (turn) page.setRotation(degrees((page.getRotation().angle + turn) % 360));
      out.addPage(page);
    });
    report('Rebinding', 0.9);
    return [{ name: `${stem(files[0].name)} (arranged).pdf`,
              blob: blobOf(await out.save(), 'application/pdf') }];
  },

  async pdfToImages(files, opts, report) {
    const lib = await pdfjs();
    const doc = await lib.getDocument({ data: await bytes(files[0]) }).promise;
    const type = opts.format || 'image/png';
    const scale = q(QUALITY.scale, opts);
    const quality = type === 'image/png' ? undefined : q(QUALITY.jpeg, opts);
    const base = stem(files[0].name);
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) {
      report(`Rendering page ${i} of ${doc.numPages}`, (i - 1) / doc.numPages);
      const page = await doc.getPage(i);
      out.push({ name: `${base} p${String(i).padStart(3, '0')}.${ext(type)}`,
                 blob: await renderPdfPage(page, scale, type, quality) });
    }
    return out;
  },

  async imagesToPdf(files, opts, report) {
    const { PDFDocument } = await pdflib();
    const out = await PDFDocument.create();
    const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
    for (let i = 0; i < files.length; i++) {
      report(`Placing ${files[i].name}`, i / files.length);
      const f = files[i];
      let data = await bytes(f);
      let embed;
      if (/png$/i.test(f.type) || /\.png$/i.test(f.name)) {
        embed = await out.embedPng(data);
      } else if (/jpe?g$/i.test(f.type) || /\.jpe?g$/i.test(f.name)) {
        embed = await out.embedJpg(data);
      } else {
        // anything else (webp, avif...) is redrawn as PNG first
        const img = await loadImage(f);
        const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
        const png = await drawToBlob(img, w, h, 'image/png');
        embed = await out.embedPng(new Uint8Array(await png.arrayBuffer()));
      }
      if (opts.fit === 'image' || !SIZES[opts.fit]) {
        const page = out.addPage([embed.width, embed.height]);
        page.drawImage(embed, { x: 0, y: 0, width: embed.width, height: embed.height });
      } else {
        const [pw, ph] = SIZES[opts.fit];
        const page = out.addPage([pw, ph]);
        const s = Math.min(pw / embed.width, ph / embed.height);
        const w = embed.width * s, h = embed.height * s;
        page.drawImage(embed, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      }
    }
    return [{ name: 'images.pdf', blob: blobOf(await out.save(), 'application/pdf') }];
  },

  async pdfText(files, opts, report) {
    const lib = await pdfjs();
    const out = [];
    for (const f of files) {
      const doc = await lib.getDocument({ data: await bytes(f) }).promise;
      const parts = [];
      for (let i = 1; i <= doc.numPages; i++) {
        report(`Reading page ${i} of ${doc.numPages}`, (i - 1) / doc.numPages);
        const content = await (await doc.getPage(i)).getTextContent();
        let line = '', page = [];
        for (const item of content.items) {
          line += item.str;
          if (item.hasEOL) { page.push(line); line = ''; }
        }
        if (line) page.push(line);
        parts.push(page.join('\n'));
      }
      out.push({ name: `${stem(f.name)}.txt`,
                 blob: blobOf(parts.join('\n\n'), 'text/plain;charset=utf-8') });
    }
    return out;
  },

  async pdfCompress(files, opts, report) {
    const lib = await pdfjs();
    const { PDFDocument } = await pdflib();
    const scale = q(QUALITY.scale, opts);
    const quality = q(QUALITY.jpeg, opts);
    const out = [];
    for (const f of files) {
      const doc = await lib.getDocument({ data: await bytes(f) }).promise;
      const built = await PDFDocument.create();
      for (let i = 1; i <= doc.numPages; i++) {
        report(`Pressing page ${i} of ${doc.numPages}`, (i - 1) / doc.numPages);
        const page = await doc.getPage(i);
        const jpg = await renderPdfPage(page, scale, 'image/jpeg', quality);
        const embed = await built.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        const vp = page.getViewport({ scale: 1 });
        const p = built.addPage([vp.width, vp.height]);
        p.drawImage(embed, { x: 0, y: 0, width: vp.width, height: vp.height });
      }
      out.push({ name: `${stem(f.name)} (compressed).pdf`,
                 blob: blobOf(await built.save(), 'application/pdf') });
    }
    return out;
  },

  // IMAGES ─────────────────────────────────────────────────────────────
  async imageConvert(files, opts, report) {
    const type = opts.format || 'image/webp';
    const quality = type === 'image/png' ? undefined : q(QUALITY.jpeg, opts);
    const out = [];
    for (let i = 0; i < files.length; i++) {
      report(`Recasting ${files[i].name}`, i / files.length);
      const img = await loadImage(files[i]);
      const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
      out.push({ name: `${stem(files[i].name)}.${ext(type)}`,
                 blob: await drawToBlob(img, w, h, type, quality) });
    }
    return out;
  },

  async imageResize(files, opts, report) {
    const maxw = parseInt(opts.maxw, 10) || 0;
    const maxh = parseInt(opts.maxh, 10) || 0;
    if (!maxw && !maxh) throw new Error('Give a maximum width or height');
    const out = [];
    for (let i = 0; i < files.length; i++) {
      report(`Redrawing ${files[i].name}`, i / files.length);
      const f = files[i];
      const img = await loadImage(f);
      const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
      let s = 1;
      if (maxw) s = Math.min(s, maxw / w);
      if (maxh) s = Math.min(s, maxh / h);
      s = Math.min(s, 1);                       // never upscale
      const type = /png$/i.test(f.type) ? 'image/png' : (f.type || 'image/jpeg');
      const quality = type === 'image/png' ? undefined : q(QUALITY.jpeg, opts);
      out.push({ name: `${stem(f.name)} (${Math.round(w * s)}px).${ext(type)}`,
                 blob: await drawToBlob(img, w * s, h * s, type, quality) });
    }
    return out;
  },

  async imageCompress(files, opts, report) {
    const quality = q(QUALITY.jpeg, opts);
    const out = [];
    for (let i = 0; i < files.length; i++) {
      report(`Tempering ${files[i].name}`, i / files.length);
      const f = files[i];
      const img = await loadImage(f);
      const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
      const type = /png/i.test(f.type) ? 'image/webp' : (f.type || 'image/jpeg');
      const blob = await drawToBlob(img, w, h, type, quality);
      out.push({ name: `${stem(f.name)} (small).${ext(type)}`, blob, was: f.size });
    }
    return out;
  },

  // DATA ───────────────────────────────────────────────────────────────
  async csvJson(files, opts, report) {
    const out = [];
    for (const f of files) {
      const raw = await text(f);
      if (/\.json$/i.test(f.name) || /json/.test(f.type)) {
        const data = JSON.parse(raw);
        const arr = Array.isArray(data) ? data : [data];
        const cols = [...new Set(arr.flatMap((o) => Object.keys(o || {})))];
        const rows = [cols, ...arr.map((o) => cols.map((c) => {
          const v = o?.[c];
          return v === null || v === undefined ? ''
            : typeof v === 'object' ? JSON.stringify(v) : v;
        }))];
        out.push({ name: `${stem(f.name)}.csv`, blob: blobOf(toCSV(rows), 'text/csv;charset=utf-8') });
      } else {
        const rows = parseCSV(raw).filter((r) => r.some((c) => c !== ''));
        if (!rows.length) throw new Error(`${f.name} looks empty`);
        const [head, ...body] = rows;
        const data = body.map((r) => Object.fromEntries(head.map((h, i) => [h || `column${i + 1}`, r[i] ?? ''])));
        out.push({ name: `${stem(f.name)}.json`,
                   blob: blobOf(JSON.stringify(data, null, 2), 'application/json') });
      }
    }
    return out;
  },

  async csvXlsx(files, opts, report) {
    const XLSX = await import('xlsx');
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      report(`Rebinding ${f.name}`, i / files.length);
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
        for (const sheet of wb.SheetNames) {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheet]);
          const suffix = wb.SheetNames.length > 1 ? ` - ${sheet}` : '';
          out.push({ name: `${stem(f.name)}${suffix}.csv`, blob: blobOf(csv, 'text/csv;charset=utf-8') });
        }
      } else {
        const rows = parseCSV(await text(f));
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        out.push({ name: `${stem(f.name)}.xlsx`,
                   blob: blobOf(buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') });
      }
    }
    return out;
  },

  async jsonFormat(files, opts) {
    const out = [];
    for (const f of files) {
      let data;
      try { data = JSON.parse(await text(f)); }
      catch (e) { throw new Error(`${f.name} is not valid JSON: ${e.message}`); }
      const s = opts.mode === 'min' ? JSON.stringify(data)
        : JSON.stringify(data, null, opts.mode === 'pretty4' ? 4 : 2);
      out.push({ name: f.name, blob: blobOf(s, 'application/json') });
    }
    return out;
  },

  async csvClean(files, opts) {
    const out = [];
    for (const f of files) {
      let rows = parseCSV(await text(f));
      if (!rows.length) throw new Error(`${f.name} looks empty`);
      if (opts.trim) rows = rows.map((r) => r.map((c) => c.trim().replace(/\s+/g, ' ')));
      const [head, ...body0] = rows;
      let body = body0;
      if (opts.blank) body = body.filter((r) => r.some((c) => c !== ''));
      if (opts.dedupe) {
        const seen = new Set();
        body = body.filter((r) => { const k = r.join(' '); if (seen.has(k)) return false; seen.add(k); return true; });
      }
      const cleanHead = head.map((h, i) => (h.trim() || `column${i + 1}`));
      out.push({ name: `${stem(f.name)} (clean).csv`,
                 blob: blobOf(toCSV([cleanHead, ...body]), 'text/csv;charset=utf-8'),
                 note: `${body0.length} rows in, ${body.length} out` });
    }
    return out;
  },

  // WRITING ────────────────────────────────────────────────────────────
  async manuscript(files, opts) {
    const out = [];
    for (const f of files) {
      let s = await text(f);
      if (opts.dashes) {
        s = s.replace(/\s*[—–]\s*/g, ', ')       // dash used as an aside
             .replace(/,\s*,/g, ',');
      }
      if (opts.semis) {
        // a semicolon becomes a full stop, so what follows starts a sentence
        s = s.replace(/;\s*([a-z])/g, (_, c) => '. ' + c.toUpperCase())
             .replace(/;\s*/g, '. ');
      }
      if (opts.quotes) {
        s = s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
      }
      if (opts.spaces) s = s.replace(/[ \t]{2,}/g, ' ');
      s = s.replace(/ +([.,!?;:])/g, '$1');
      out.push({ name: `${stem(f.name)} (polished)${f.name.match(/\.[^.]+$/)?.[0] || '.txt'}`,
                 blob: blobOf(s, 'text/plain;charset=utf-8') });
    }
    return out;
  },

  async wordCount(files) {
    const lines = [];
    for (const f of files) {
      const s = await text(f);
      const words = (s.match(/\S+/g) || []).length;
      const paras = s.split(/\n\s*\n/).filter((p) => p.trim()).length;
      const sentences = (s.match(/[.!?]+(\s|$)/g) || []).length || 1;
      lines.push(
        f.name,
        '  words          ' + words.toLocaleString(),
        '  characters     ' + s.length.toLocaleString(),
        '  paragraphs     ' + paras.toLocaleString(),
        '  sentences      ' + sentences.toLocaleString(),
        '  avg sentence   ' + (words / sentences).toFixed(1) + ' words',
        '  reading time   ' + Math.max(1, Math.round(words / 230)) + ' min',
        '  aloud (~150wpm)' + ' ' + Math.max(1, Math.round(words / 150)) + ' min',
        ''
      );
    }
    return [{ name: 'measure.txt', blob: blobOf(lines.join('\n'), 'text/plain;charset=utf-8'),
              preview: lines.join('\n') }];
  },

  // ARCHIVES ───────────────────────────────────────────────────────────
  async zipCreate(files, opts, report) {
    const { zip } = await import('fflate');
    const level = parseInt(opts.level, 10);
    const entries = {};
    for (let i = 0; i < files.length; i++) {
      report(`Adding ${files[i].name}`, i / files.length);
      entries[files[i].name] = [new Uint8Array(await files[i].arrayBuffer()),
                                { level: Number.isFinite(level) ? level : 6 }];
    }
    report('Sealing the bundle', 0.9);
    const data = await new Promise((res, rej) =>
      zip(entries, (err, out) => (err ? rej(err) : res(out))));
    return [{ name: 'bundle.zip', blob: blobOf(data, 'application/zip') }];
  },

  // MEDIA ──────────────────────────────────────────────────────────────
  // Decoding uses the browser's own codecs, so whatever it can play, we can
  // read. Encoding is done here in JS, which keeps this to a few hundred KB
  // instead of the 31 MB a full ffmpeg build would cost every visitor.
  async mediaToMp3(files, opts, report) {
    const rate = { high: 320, medium: 192, low: 128 }[opts.quality] ?? 192;
    const out = [];
    for (let i = 0; i < files.length; i++) {
      report(`Decoding ${files[i].name}`, i / files.length);
      const audio = await decodeAudio(files[i]);
      report(`Encoding ${files[i].name} at ${rate}kbps`, (i + 0.5) / files.length);
      out.push({ name: `${stem(files[i].name)}.mp3`,
                 blob: await encodeMp3(audio, rate, report), was: files[i].size });
    }
    return out;
  },

  async audioConvert(files, opts, report) {
    const rate = { high: 320, medium: 192, low: 128 }[opts.quality] ?? 192;
    const out = [];
    for (let i = 0; i < files.length; i++) {
      report(`Decoding ${files[i].name}`, i / files.length);
      const audio = await decodeAudio(files[i]);
      if (opts.format === 'wav') {
        out.push({ name: `${stem(files[i].name)}.wav`, blob: encodeWav(audio), was: files[i].size });
      } else {
        out.push({ name: `${stem(files[i].name)}.mp3`,
                   blob: await encodeMp3(audio, rate, report), was: files[i].size });
      }
    }
    return out;
  },

  async mediaTrim(files, opts, report) {
    const start = timecode(opts.start, 0);
    const end = timecode(opts.end, Infinity);
    if (!(end > start)) throw new Error('The end must come after the start');
    const rate = { high: 320, medium: 192, low: 128 }[opts.quality] ?? 192;
    const out = [];
    for (const f of files) {
      report(`Decoding ${f.name}`);
      const audio = await decodeAudio(f);
      const from = Math.min(start, audio.duration);
      const to = Math.min(end, audio.duration);
      if (!(to > from)) throw new Error(`That range falls outside ${f.name} (${audio.duration.toFixed(1)}s long)`);
      report('Cutting');
      const cut = sliceAudio(audio, from, to);
      const blob = opts.format === 'wav'
        ? encodeWav(cut)
        : await encodeMp3(cut, rate, report);
      out.push({ name: `${stem(f.name)} (${fmtTime(from)}-${fmtTime(to)}).${opts.format === 'wav' ? 'wav' : 'mp3'}`,
                 blob, note: `${(to - from).toFixed(1)}s of ${audio.duration.toFixed(1)}s` });
    }
    return out;
  },

  async videoToGif(files, opts, report) {
    const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
    const fps = Math.min(24, Math.max(2, parseInt(opts.fps, 10) || 10));
    const maxw = parseInt(opts.width, 10) || 480;
    const colours = { high: 256, medium: 128, low: 64 }[opts.quality] ?? 128;

    const file = files[0];
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto'; video.src = url;
    try {
      await new Promise((res, rej) => {
        video.onloadedmetadata = res;
        video.onerror = () => rej(new Error('The browser could not open that video'));
      });
      const start = timecode(opts.start, 0);
      const end = Math.min(timecode(opts.end, Infinity), video.duration || 0);
      if (!(end > start)) throw new Error('That range is empty');

      const scale = Math.min(1, maxw / (video.videoWidth || maxw));
      const w = Math.max(2, Math.round((video.videoWidth || maxw) * scale / 2) * 2);
      const h = Math.max(2, Math.round((video.videoHeight || maxw) * scale / 2) * 2);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const gif = GIFEncoder();
      const step = 1 / fps;
      const total = Math.max(1, Math.floor((end - start) / step));
      if (total > 900) throw new Error('That would be over 900 frames. Shorten the range or lower the rate.');

      for (let n = 0; n < total; n++) {
        const t = start + n * step;
        await seekTo(video, t);
        ctx.drawImage(video, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const palette = quantize(data, colours);
        gif.writeFrame(applyPalette(data, palette), w, h,
                       { palette, delay: Math.round(step * 1000) });
        if (n % 3 === 0) report(`Frame ${n + 1} of ${total}`, n / total);
      }
      gif.finish();
      return [{ name: `${stem(file.name)}.gif`,
                blob: blobOf(gif.bytes(), 'image/gif'),
                note: `${total} frames · ${w}×${h}` }];
    } finally {
      URL.revokeObjectURL(url);
    }
  },

  // WRITING ────────────────────────────────────────────────────────────
  async epub(files, opts, report) {
    const { zip } = await import('fflate');
    const enc = new TextEncoder();
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const title = (opts.title || stem(files[0].name)).trim() || 'Untitled';
    const author = (opts.author || 'Unknown').trim();
    const uid = 'urn:uuid:' + (crypto.randomUUID ? crypto.randomUUID()
      : Date.now().toString(16) + Math.random().toString(16).slice(2));

    const chapters = [];
    for (let i = 0; i < files.length; i++) {
      report(`Setting ${files[i].name}`, i / files.length);
      const raw = await text(files[i]);
      const name = stem(files[i].name);
      const body = raw
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`)
        .join('\n');
      chapters.push({ id: `ch${i + 1}`, file: `ch${i + 1}.xhtml`, title: name, body });
    }

    const page = (c) => `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en"><head>
<title>${esc(c.title)}</title><link rel="stylesheet" href="style.css" type="text/css"/></head>
<body><section epub:type="chapter" xmlns:epub="http://www.idpf.org/2007/ops">
<h1>${esc(c.title)}</h1>
${c.body}
</section></body></html>`;

    const files_ = {
      'mimetype': [enc.encode('application/epub+zip'), { level: 0 }],
      'META-INF/container.xml': enc.encode(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`),
      'OEBPS/style.css': enc.encode(
        `body{font-family:Georgia,serif;line-height:1.6;margin:1em}` +
        `h1{font-size:1.4em;text-align:center;margin:2em 0 1.5em;font-weight:normal;letter-spacing:.04em}` +
        `p{margin:0 0 .9em;text-indent:0}`),
      'OEBPS/content.opf': enc.encode(`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${uid}</dc:identifier>
<dc:title>${esc(title)}</dc:title>
<dc:creator>${esc(author)}</dc:creator>
<dc:language>en</dc:language>
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
${chapters.map((c) => `<item id="${c.id}" href="${c.file}" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine>
${chapters.map((c) => `<itemref idref="${c.id}"/>`).join('\n')}
</spine>
</package>`),
      'OEBPS/nav.xhtml': enc.encode(`<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head><title>Contents</title></head><body>
<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>
${chapters.map((c) => `<li><a href="${c.file}">${esc(c.title)}</a></li>`).join('\n')}
</ol></nav></body></html>`),
    };
    chapters.forEach((c) => { files_[`OEBPS/${c.file}`] = enc.encode(page(c)); });

    report('Binding the book', 0.9);
    const data = await new Promise((res, rej) =>
      zip(files_, { level: 6 }, (err, o) => (err ? rej(err) : res(o))));
    return [{ name: `${title}.epub`, blob: blobOf(data, 'application/epub+zip'),
              note: `${chapters.length} chapter${chapters.length === 1 ? '' : 's'}` }];
  },

  async zipExtract(files, opts, report) {
    const { unzip } = await import('fflate');
    const data = await bytes(files[0]);
    report('Opening the bundle', 0.3);
    const entries = await new Promise((res, rej) =>
      unzip(data, (err, out) => (err ? rej(err) : res(out))));
    const out = [];
    for (const [name, content] of Object.entries(entries)) {
      if (name.endsWith('/') || !content.length) continue;
      out.push({ name: name.split('/').pop(), blob: blobOf(content, 'application/octet-stream') });
    }
    if (!out.length) throw new Error('That archive held no files');
    return out;
  },
};
