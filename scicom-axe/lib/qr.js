'use strict';
/**
 * qr.js — a QR code, drawn in the terminal.
 *
 * Typing http://192.168.1.42:4173 into a phone is miserable and easy to get
 * wrong. Pointing the camera at the laptop is not. So when Scicom Axe is
 * started for phone use, it prints the address as a QR code you can scan.
 *
 * Written from scratch rather than installed, for the same reason as the rest
 * of this system: no dependencies, so the folder still runs anywhere it is
 * copied to.
 *
 * Supports byte mode, versions 1 to 10, error correction levels L and M —
 * comfortably more than a local URL needs. Anything longer is rejected rather
 * than silently mangled.
 */

/* ----------------------------------------------------------- the tables */

/** Total codewords (data + error correction) for versions 1–10. */
const TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

/**
 * Block structure per version and level:
 *   [ EC codewords per block, blocks in group 1, data codewords each,
 *     blocks in group 2, data codewords each ]
 */
const BLOCKS = {
  L: [null,
    [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0],
    [26, 1, 108, 0, 0], [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0],
    [30, 2, 116, 0, 0], [18, 2, 68, 2, 69]],
  M: [null,
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]],
};

/** Where the small alignment squares go, by version. */
const ALIGNMENT = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

/** Version information, needed from version 7 upwards. */
const VERSION_BITS = { 7: 0x07C94, 8: 0x085BC, 9: 0x09A99, 10: 0x0A4D3 };

const EC_BITS = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

/* ------------------------------------------------ Galois field arithmetic */

// Reed–Solomon works in GF(256). These two tables turn its multiplication
// into addition of exponents, which is the whole trick.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;        // the QR generator polynomial
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function mul(a, b) {
  return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
}

/** The generator polynomial for `degree` error correction codewords. */
function generator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** The error correction codewords for one block of data. */
function ecCodewords(data, count) {
  const gen = generator(count);
  const out = new Array(count).fill(0);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.shift();
    out.push(0);
    for (let i = 0; i < count; i++) out[i] ^= mul(gen[i + 1], factor);
  }
  return out;
}

/* --------------------------------------------------------- the bitstream */

function buildBitstream(bytes, version, level) {
  const [ecPerBlock, n1, d1, n2, d2] = BLOCKS[level][version];
  const dataCodewords = n1 * d1 + n2 * d2;
  const capacityBits = dataCodewords * 8;

  const bits = [];
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4);                                   // byte mode
  push(bytes.length, version <= 9 ? 8 : 16);         // how many bytes follow
  for (const b of bytes) push(b, 8);

  if (bits.length > capacityBits) return null;       // does not fit this version

  // Terminator, then pad to a whole number of bytes.
  for (let i = 0; i < 4 && bits.length < capacityBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  // Then the two standard filler bytes, alternating, to the end.
  const padBytes = [0xEC, 0x11];
  for (let i = 0; bits.length < capacityBits; i++) push(padBytes[i % 2], 8);

  // Bits back into codewords.
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  // Split into blocks, compute each block's error correction, then interleave
  // both — which is what makes a QR code survive a thumb over one corner.
  const blocks = [];
  let at = 0;
  for (let i = 0; i < n1; i++) { blocks.push(codewords.slice(at, at + d1)); at += d1; }
  for (let i = 0; i < n2; i++) { blocks.push(codewords.slice(at, at + d2)); at += d2; }

  const ecBlocks = blocks.map((b) => ecCodewords(b, ecPerBlock));

  const out = [];
  const longest = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < longest; i++) {
    for (const b of blocks) if (i < b.length) out.push(b[i]);
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const b of ecBlocks) out.push(b[i]);
  }
  return out;
}

/* ------------------------------------------------------------ the matrix */

function emptyMatrix(size) {
  return {
    size,
    cells: Array.from({ length: size }, () => new Array(size).fill(null)),
    fixed: Array.from({ length: size }, () => new Array(size).fill(false)),
  };
}

function place(m, row, col, value) {
  m.cells[row][col] = value;
  m.fixed[row][col] = true;
}

function drawFinder(m, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r, cc = col + c;
      if (rr < 0 || cc < 0 || rr >= m.size || cc >= m.size) continue;
      const inSquare = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const dark = inSquare && (
        r === 0 || r === 6 || c === 0 || c === 6 ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      place(m, rr, cc, dark);
    }
  }
}

function drawAlignment(m, row, col) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      place(m, row + r, col + c, dark);
    }
  }
}

function drawFunctionPatterns(m, version) {
  const size = m.size;

  drawFinder(m, 0, 0);
  drawFinder(m, 0, size - 7);
  drawFinder(m, size - 7, 0);

  // Timing: the dotted lines that let a scanner count modules.
  for (let i = 8; i < size - 8; i++) {
    place(m, 6, i, i % 2 === 0);
    place(m, i, 6, i % 2 === 0);
  }

  // Alignment squares, except where they would sit on a finder.
  const centres = ALIGNMENT[version];
  for (const r of centres) {
    for (const c of centres) {
      const onFinder = (r <= 8 && c <= 8)
        || (r <= 8 && c >= size - 9)
        || (r >= size - 9 && c <= 8);
      if (!onFinder) drawAlignment(m, r, c);
    }
  }

  place(m, size - 8, 8, true);                 // the always-dark module

  // Reserve the format areas so data never lands there.
  for (let i = 0; i < 9; i++) {
    if (m.cells[8][i] === null) place(m, 8, i, false);
    if (m.cells[i][8] === null) place(m, i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (m.cells[8][size - 1 - i] === null) place(m, 8, size - 1 - i, false);
    if (m.cells[size - 1 - i][8] === null) place(m, size - 1 - i, 8, false);
  }

  // From version 7, the version number is written twice.
  if (version >= 7) {
    const bits = VERSION_BITS[version];
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >> i) & 1) === 1;
      const r = Math.floor(i / 3);
      const c = i % 3;
      place(m, r, size - 11 + c, bit);
      place(m, size - 11 + c, r, bit);
    }
  }
}

/** Lay the codewords out in the zig-zag the standard prescribes. */
function placeData(m, codewords) {
  const size = m.size;
  let bitIndex = 0;
  const nextBit = () => {
    if (bitIndex >= codewords.length * 8) return false;   // remainder bits
    const bit = (codewords[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1;
    bitIndex++;
    return bit === 1;
  };

  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;                            // skip the timing column
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (m.fixed[row][col]) continue;
        m.cells[row][col] = nextBit();
      }
    }
    upward = !upward;
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(m, maskIndex) {
  const out = emptyMatrix(m.size);
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      out.cells[r][c] = m.fixed[r][c]
        ? m.cells[r][c]
        : m.cells[r][c] !== MASKS[maskIndex](r, c);
      out.fixed[r][c] = m.fixed[r][c];
    }
  }
  return out;
}

/** Format information: error correction level and mask, with its own BCH code. */
function drawFormat(m, level, maskIndex) {
  const data = (EC_BITS[level] << 3) | maskIndex;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  const size = m.size;

  // The fifteen bits run most-significant first along each copy: bit 14 lands
  // in the first position, bit 0 in the last. Writing them the other way round
  // produces a code that looks perfectly convincing and that no scanner will
  // read, because the format block is the first thing a scanner decodes.
  const bit = (i) => ((bits >> (14 - i)) & 1) === 1;

  // First copy, around the top-left finder.
  for (let i = 0; i <= 5; i++) place(m, 8, i, bit(i));
  place(m, 8, 7, bit(6));
  place(m, 8, 8, bit(7));
  place(m, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) place(m, 14 - i, 8, bit(i));

  // Second copy, split between the other two finders.
  for (let i = 0; i <= 7; i++) place(m, size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) place(m, 8, size - 15 + i, bit(i));
  place(m, size - 8, 8, true);
}

/** How ugly a masked code is. The standard's four rules; lowest score wins. */
function penalty(m) {
  const n = m.size;
  const at = (r, c) => m.cells[r][c] === true;
  let score = 0;

  // Rule 1 — runs of five or more of the same colour.
  for (let i = 0; i < n; i++) {
    for (const rowwise of [true, false]) {
      let run = 1;
      for (let j = 1; j < n; j++) {
        const a = rowwise ? at(i, j) : at(j, i);
        const b = rowwise ? at(i, j - 1) : at(j - 1, i);
        if (a === b) { run++; } else { if (run >= 5) score += run - 2; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }
  }

  // Rule 2 — any 2×2 block of one colour.
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = at(r, c);
      if (v === at(r, c + 1) && v === at(r + 1, c) && v === at(r + 1, c + 1)) score += 3;
    }
  }

  // Rule 3 — the finder-like pattern appearing in the data.
  const p1 = [true, false, true, true, true, false, true, false, false, false, false];
  const p2 = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (get) => {
    for (let i = 0; i + 11 <= n; i++) {
      let a = true, b = true;
      for (let j = 0; j < 11; j++) {
        const v = get(i + j);
        if (v !== p1[j]) a = false;
        if (v !== p2[j]) b = false;
      }
      if (a) score += 40;
      if (b) score += 40;
    }
  };
  for (let i = 0; i < n; i++) {
    matches((j) => at(i, j));
    matches((j) => at(j, i));
  }

  // Rule 4 — how far the proportion of dark modules is from half.
  let dark = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (at(r, c)) dark++;
  const percent = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/* ------------------------------------------------------------- the front */

/**
 * Turn text into a QR matrix.
 * Returns { size, cells } where cells[row][col] is true for a dark module.
 */
function encode(text, { level = 'M', forceMask = null } = {}) {
  const bytes = [...Buffer.from(String(text), 'utf8')];

  let version = 0;
  let codewords = null;
  for (let v = 1; v <= 10; v++) {
    const attempt = buildBitstream(bytes, v, level);
    if (attempt) { version = v; codewords = attempt; break; }
  }
  if (!version) {
    throw new Error('That text is too long for this QR encoder (10 versions, byte mode).');
  }

  const size = version * 4 + 17;
  const base = emptyMatrix(size);
  drawFunctionPatterns(base, version);
  placeData(base, codewords);

  let best = null;
  let bestScore = Infinity;
  const masks = forceMask === null ? [0, 1, 2, 3, 4, 5, 6, 7] : [forceMask];
  for (const mask of masks) {
    const candidate = applyMask(base, mask);
    drawFormat(candidate, level, mask);
    const score = penalty(candidate);
    if (score < bestScore) { bestScore = score; best = candidate; }
  }
  return { size: best.size, cells: best.cells, version };
}

/**
 * Draw it for a terminal.
 *
 * Two module rows per line of text, using the upper-half block. The colours
 * are set explicitly rather than left to the terminal: a QR code has to be
 * dark-on-light to scan, and a terminal might be black-on-white or
 * white-on-black. Letting it inherit the theme means it works on one machine
 * and silently fails on the next.
 *
 * A quiet border of four modules is part of the specification, not padding.
 */
const WHITE_FG = '\u001b[97m';
const BLACK_FG = '\u001b[30m';
const WHITE_BG = '\u001b[107m';
const BLACK_BG = '\u001b[40m';
const RESET = '\u001b[0m';

function toText(matrix, { quiet = 4, colour = true } = {}) {
  const n = matrix.size;
  const dark = (r, c) => {
    if (r < 0 || c < 0 || r >= n || c >= n) return false;   // the quiet border
    return matrix.cells[r][c] === true;
  };

  const lines = [];
  for (let r = -quiet; r < n + quiet; r += 2) {
    let line = '';
    for (let c = -quiet; c < n + quiet; c++) {
      const top = dark(r, c);
      const bottom = dark(r + 1, c);
      if (colour) {
        line += (top ? BLACK_FG : WHITE_FG) + (bottom ? BLACK_BG : WHITE_BG) + '\u2580';
      } else {
        // Without colour, assume a dark terminal: draw the light modules.
        line += !top && !bottom ? '\u2588' : !top ? '\u2580' : !bottom ? '\u2584' : ' ';
      }
    }
    lines.push(colour ? line + RESET : line);
  }
  return lines.join('\n');
}

module.exports = { encode, toText };
