// Reading what you drop into the atelier: portraits of any size, and documents
// of several kinds turned into the plain text a language model can actually
// read. Everything happens in the browser — no file is ever uploaded anywhere.

// ─── PORTRAITS ───────────────────────────────────────────────────────────
// There is no size limit worth imposing on the file you choose. A portrait is
// displayed a few centimetres across, so whatever arrives is scaled down to
// something sensible and stored small. A 20 MB photograph and a 40 KB sketch
// end up the same size here.

const PORTRAIT_EDGE = 640;

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

export async function shrinkPortrait(file, edge = PORTRAIT_EDGE) {
  const img = await loadImage(file);
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  if (!w || !h) throw new Error('That file does not look like an image.');

  const scale = Math.min(1, edge / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (typeof img.close === 'function') img.close();

  return c.toDataURL('image/jpeg', 0.82);
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────

const ext = (name) => (name.split('.').pop() || '').toLowerCase();

const tidy = (s) =>
  s.replace(/\r\n?/g, '\n')
   .replace(/[ \t]+\n/g, '\n')
   .replace(/\n{3,}/g, '\n\n')
   .trim();

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

async function fromPdf(file, report) {
  const lib = await pdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    report?.(`Reading page ${i} of ${doc.numPages}`);
    const content = await (await doc.getPage(i)).getTextContent();
    let line = '', page = [];
    for (const item of content.items) {
      line += item.str;
      if (item.hasEOL) { page.push(line); line = ''; }
    }
    if (line) page.push(line);
    pages.push(page.join('\n'));
  }
  return pages.join('\n\n');
}

// A .docx is a zip. The prose lives in one file inside it, marked up in XML;
// paragraph ends are the only structure worth keeping.
async function fromDocx(file) {
  const { unzip } = await import('fflate');
  const data = new Uint8Array(await file.arrayBuffer());
  const entries = await new Promise((res, rej) =>
    unzip(data, (err, out) => (err ? rej(err) : res(out))));

  const doc = entries['word/document.xml'];
  if (!doc) throw new Error('That .docx has no readable document inside it.');

  return tidy(
    new TextDecoder().decode(doc)
      .replace(/<w:p[ >]/g, '\n<w:p ')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
  );
}

async function fromSheet(file) {
  const XLSX = await import('xlsx');
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return book.SheetNames
    .map((n) => `— ${n} —\n${XLSX.utils.sheet_to_csv(book.Sheets[n])}`)
    .join('\n\n');
}

/**
 * Turn one dropped file into plain text.
 * Throws with a plain-language message if the kind is not readable.
 */
export async function readDocument(file, report) {
  const kind = ext(file.name);

  if (kind === 'pdf') return tidy(await fromPdf(file, report));
  if (kind === 'docx') return await fromDocx(file);
  if (kind === 'xlsx' || kind === 'xls') return tidy(await fromSheet(file));
  if (['txt', 'md', 'markdown', 'csv', 'json', 'rtf', 'html'].includes(kind) ||
      file.type.startsWith('text/')) {
    const raw = await file.text();
    // RTF and HTML carry markup a model would only trip over.
    if (kind === 'rtf') return tidy(raw.replace(/\\[a-z]+-?\d* ?/g, '').replace(/[{}]/g, ''));
    if (kind === 'html') return tidy(raw.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' '));
    return tidy(raw);
  }
  if (kind === 'doc') {
    throw new Error('Old .doc files cannot be read. Save it as .docx or PDF first.');
  }
  throw new Error(`Cannot read a .${kind} file. Try PDF, Word, text, or a spreadsheet.`);
}

export const KINDS = '.txt,.md,.markdown,.pdf,.docx,.csv,.json,.rtf,.html,.xlsx,.xls';
