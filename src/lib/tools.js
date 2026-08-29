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
