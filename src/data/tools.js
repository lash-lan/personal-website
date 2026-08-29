// The Workshop's catalogue.
//
// Framed after Golian's workshop: an inventor's bench, chaotic and useful,
// where things are taken apart and put back together better than they were.
//
// Every tool runs entirely in the reader's browser. Nothing is uploaded, so
// there is no server to pay for, no size limit imposed by us, and a person's
// files never leave their own machine. That constraint is also the honest
// limit: very large files will be slow, because the work happens on their
// device rather than on a farm of ours.

export const BENCHES = [
  {
    slug: 'parchment',
    name: 'The Binding Bench',
    kind: 'PDF',
    blurb: 'Where documents are bound, cleaved and set back in order.',
  },
  {
    slug: 'lens',
    name: 'The Lens Bench',
    kind: 'Images',
    blurb: 'Where pictures are recast into other shapes, formats and weights.',
  },
  {
    slug: 'ledger',
    name: 'The Ledger Bench',
    kind: 'Data',
    blurb: 'Where tables and records are rewritten from one script into another.',
  },
  {
    slug: 'quill',
    name: 'The Scribe’s Bench',
    kind: 'Writing',
    blurb: 'Small instruments for anyone working in words.',
  },
  {
    slug: 'forge',
    name: 'The Great Forge',
    kind: 'Media & Archives',
    blurb: 'The hot end of the room: sound, moving pictures, and bundles.',
  },
];

// quality presets offered where a tool has to choose fidelity against size
export const QUALITY = [
  { id: 'high',   label: 'Highest',  note: 'Best fidelity, largest file' },
  { id: 'medium', label: 'Balanced', note: 'Good quality, much smaller' },
  { id: 'low',    label: 'Smallest', note: 'Lowest quality, tiny file' },
];

export const TOOLS = [
  // ─── PDF ────────────────────────────────────────────────────────────
  {
    slug: 'merge-pdf', bench: 'parchment', engine: 'pdfMerge',
    name: 'Bind Pages', sub: 'Merge PDFs',
    blurb: 'Join several PDFs into one, in the order you choose.',
    accept: 'application/pdf', multiple: true, minFiles: 2,
  },
  {
    slug: 'split-pdf', bench: 'parchment', engine: 'pdfSplit',
    name: 'Cleave', sub: 'Split a PDF',
    blurb: 'Break a document into pieces, by page ranges or one file per page.',
    accept: 'application/pdf',
    fields: [
      { id: 'ranges', type: 'text', label: 'Pages to keep', placeholder: 'e.g. 1-3, 7, 10-12 — leave blank to split every page' },
    ],
  },
  {
    slug: 'organise-pdf', bench: 'parchment', engine: 'pdfOrganise',
    name: 'Reorder the Leaves', sub: 'Rotate, delete, reorder',
    blurb: 'Turn pages the right way up, drop the ones you do not want, and set the order.',
    accept: 'application/pdf', interactive: 'pdf-pages',
  },
  {
    slug: 'pdf-to-images', bench: 'parchment', engine: 'pdfToImages',
    name: 'Cast to Plates', sub: 'PDF → images',
    blurb: 'Render every page as a picture. Choose the resolution.',
    accept: 'application/pdf', quality: true,
    fields: [
      { id: 'format', type: 'select', label: 'Format', options: [
        { value: 'image/png', label: 'PNG (lossless)' },
        { value: 'image/jpeg', label: 'JPEG (smaller)' },
        { value: 'image/webp', label: 'WebP (smallest)' },
      ] },
    ],
  },
  {
    slug: 'images-to-pdf', bench: 'parchment', engine: 'imagesToPdf',
    name: 'Bind Plates', sub: 'Images → PDF',
    blurb: 'Gather pictures into a single document, one per page.',
    accept: 'image/*', multiple: true,
    fields: [
      { id: 'fit', type: 'select', label: 'Page size', options: [
        { value: 'image', label: 'Fit page to each image' },
        { value: 'a4', label: 'A4' },
        { value: 'letter', label: 'US Letter' },
      ] },
    ],
  },
  {
    slug: 'pdf-text', bench: 'parchment', engine: 'pdfText',
    name: 'Read the Ink', sub: 'Extract text',
    blurb: 'Pull the words out of a PDF as plain text.',
    accept: 'application/pdf',
  },
  {
    slug: 'compress-pdf', bench: 'parchment', engine: 'pdfCompress',
    name: 'Press Thin', sub: 'Compress a PDF',
    blurb: 'Shrink a heavy document by re-rendering its pages. Best on scans and image-heavy files.',
    accept: 'application/pdf', quality: true,
    caution: 'This rasterises pages, so selectable text becomes picture. Keep your original.',
  },

  // ─── IMAGES ─────────────────────────────────────────────────────────
  {
    slug: 'convert-image', bench: 'lens', engine: 'imageConvert',
    name: 'Recast', sub: 'Convert images',
    blurb: 'Change pictures between PNG, JPEG and WebP.',
    accept: 'image/*', multiple: true, quality: true,
    fields: [
      { id: 'format', type: 'select', label: 'Convert to', options: [
        { value: 'image/webp', label: 'WebP' },
        { value: 'image/jpeg', label: 'JPEG' },
        { value: 'image/png', label: 'PNG (lossless)' },
      ] },
    ],
  },
  {
    slug: 'resize-image', bench: 'lens', engine: 'imageResize',
    name: 'Redraw to Scale', sub: 'Resize images',
    blurb: 'Set a maximum width or height. Proportions are kept.',
    accept: 'image/*', multiple: true, quality: true,
    fields: [
      { id: 'maxw', type: 'number', label: 'Max width (px)', placeholder: '1920' },
      { id: 'maxh', type: 'number', label: 'Max height (px)', placeholder: 'blank for auto' },
    ],
  },
  {
    slug: 'compress-image', bench: 'lens', engine: 'imageCompress',
    name: 'Temper', sub: 'Compress images',
    blurb: 'Reduce file size while keeping the picture as sharp as the setting allows.',
    accept: 'image/*', multiple: true, quality: true,
  },

  // ─── DATA ───────────────────────────────────────────────────────────
  {
    slug: 'csv-json', bench: 'ledger', engine: 'csvJson',
    name: 'Transcribe', sub: 'CSV ↔ JSON',
    blurb: 'Turn a spreadsheet export into JSON, or JSON back into CSV.',
    accept: '.csv,.json,text/csv,application/json', multiple: true,
  },
  {
    slug: 'csv-xlsx', bench: 'ledger', engine: 'csvXlsx',
    name: 'Rebind the Ledger', sub: 'CSV ↔ XLSX',
    blurb: 'Move between plain CSV and Excel workbooks.',
    accept: '.csv,.xlsx,.xls,text/csv', multiple: true,
  },
  {
    slug: 'format-json', bench: 'ledger', engine: 'jsonFormat',
    name: 'Set in Order', sub: 'Format JSON',
    blurb: 'Indent JSON so a person can read it, or minify it for a machine.',
    accept: '.json,application/json', multiple: true,
    fields: [
      { id: 'mode', type: 'select', label: 'Mode', options: [
        { value: 'pretty', label: 'Readable (2-space indent)' },
        { value: 'pretty4', label: 'Readable (4-space indent)' },
        { value: 'min', label: 'Minify' },
      ] },
    ],
  },
  {
    slug: 'clean-csv', bench: 'ledger', engine: 'csvClean',
    name: 'Sift', sub: 'Clean a CSV',
    blurb: 'Trim stray spaces, drop empty rows and exact duplicates, tidy the headers.',
    accept: '.csv,text/csv', multiple: true,
    fields: [
      { id: 'dedupe', type: 'checkbox', label: 'Remove duplicate rows', checked: true },
      { id: 'blank', type: 'checkbox', label: 'Remove empty rows', checked: true },
      { id: 'trim', type: 'checkbox', label: 'Trim whitespace in every cell', checked: true },
    ],
  },

  // ─── WRITING ────────────────────────────────────────────────────────
  {
    slug: 'clean-manuscript', bench: 'quill', engine: 'manuscript',
    name: 'Scribe’s Polish', sub: 'Clean a manuscript',
    blurb: 'Straighten quotes, replace em dashes and semicolons, collapse double spaces. Built from the tidy-up done on this site’s own stories.',
    accept: '.txt,.md,text/plain', multiple: true,
    fields: [
      { id: 'dashes', type: 'checkbox', label: 'Replace em and en dashes', checked: true },
      { id: 'semis', type: 'checkbox', label: 'Replace semicolons with full stops', checked: true },
      { id: 'quotes', type: 'checkbox', label: 'Straighten curly quotes', checked: false },
      { id: 'spaces', type: 'checkbox', label: 'Collapse double spaces', checked: true },
    ],
  },
  {
    slug: 'make-epub', bench: 'quill', engine: 'epub',
    name: 'Bind a Book', sub: 'Text → EPUB',
    blurb: 'Turn text files into an EPUB a Kindle, Kobo or phone can read. One file becomes one chapter, in the order you set.',
    accept: '.txt,.md,text/plain', multiple: true,
    fields: [
      { id: 'title', type: 'text', label: 'Book title', placeholder: 'leave blank to use the first filename' },
      { id: 'author', type: 'text', label: 'Author', placeholder: 'Lash' },
    ],
  },
  {
    slug: 'count-words', bench: 'quill', engine: 'wordCount',
    name: 'Take the Measure', sub: 'Word count & reading time',
    blurb: 'Words, characters, paragraphs, reading time and the longest sentences.',
    accept: '.txt,.md,.json,text/plain', multiple: true,
  },

  // ─── MEDIA & ARCHIVES ───────────────────────────────────────────────
  {
    slug: 'zip-files', bench: 'forge', engine: 'zipCreate',
    name: 'Bundle', sub: 'Compress to ZIP',
    blurb: 'Pack any number of files into a single archive.',
    accept: '*/*', multiple: true,
    fields: [
      { id: 'level', type: 'select', label: 'Compression', options: [
        { value: '9', label: 'Smallest file (slowest)' },
        { value: '6', label: 'Balanced' },
        { value: '1', label: 'Fastest (largest)' },
      ] },
    ],
  },
  {
    slug: 'unzip-files', bench: 'forge', engine: 'zipExtract',
    name: 'Unbind', sub: 'Extract a ZIP',
    blurb: 'Open an archive and take the files out.',
    accept: '.zip,application/zip',
  },
  {
    slug: 'video-to-mp3', bench: 'forge', engine: 'mediaToMp3',
    name: 'Draw the Voice', sub: 'Video → MP3',
    blurb: 'Lift the sound out of a video and keep it as an MP3.',
    accept: 'video/*,audio/*', multiple: true, quality: true,
    note: 'Quality sets the bitrate: 320, 192 or 128 kbps.',
  },
  {
    slug: 'convert-audio', bench: 'forge', engine: 'audioConvert',
    name: 'Retune', sub: 'Audio converter',
    blurb: 'Move audio into MP3, or into WAV when you need it uncompressed.',
    accept: 'audio/*,video/*', multiple: true, quality: true,
    fields: [
      { id: 'format', type: 'select', label: 'Convert to', options: [
        { value: 'mp3', label: 'MP3 (compressed)' },
        { value: 'wav', label: 'WAV (uncompressed)' },
      ] },
    ],
  },
  {
    slug: 'trim-media', bench: 'forge', engine: 'mediaTrim',
    name: 'Cut to Length', sub: 'Trim audio',
    blurb: 'Keep only the stretch you want. Works on audio, or on the soundtrack of a video.',
    accept: 'audio/*,video/*', multiple: true, quality: true,
    fields: [
      { id: 'start', type: 'text', label: 'Start', placeholder: '0:00' },
      { id: 'end', type: 'text', label: 'End', placeholder: '1:30 — leave blank for the end' },
      { id: 'format', type: 'select', label: 'Save as', options: [
        { value: 'mp3', label: 'MP3' },
        { value: 'wav', label: 'WAV' },
      ] },
    ],
  },
  {
    slug: 'video-to-gif', bench: 'forge', engine: 'videoToGif',
    name: 'Still the Motion', sub: 'Video → GIF',
    blurb: 'Turn a stretch of video into a looping image.',
    accept: 'video/*', quality: true,
    fields: [
      { id: 'start', type: 'text', label: 'Start', placeholder: '0:00' },
      { id: 'end', type: 'text', label: 'End', placeholder: '0:05' },
      { id: 'fps', type: 'number', label: 'Frames per second', placeholder: '10' },
      { id: 'width', type: 'number', label: 'Width (px)', placeholder: '480' },
    ],
    caution: 'GIF is a heavy format. Keep clips short, the width modest and the rate low.',
  },
];

export const toolsIn = (bench) => TOOLS.filter((t) => t.bench === bench);
export const toolBySlug = (slug) => TOOLS.find((t) => t.slug === slug);
export const READY = TOOLS.filter((t) => !t.soon);
