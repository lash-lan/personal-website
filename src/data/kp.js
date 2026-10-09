// The fixed furniture of Krishnamurti Paddhati (KP).
//
// Nothing here is opinion. These are the system's own definitions: the twelve
// signs and their rulers, the twenty-seven nakshatras and their rulers, and the
// Vimshottari proportions that cut each nakshatra into nine subs.
//
// The only judgement call is the ayanamsa constant, and it is documented where
// it is declared.

// ─── signs ─────────────────────────────────────────────────────────────
export const SIGNS = [
  { name: 'Aries',       lord: 'Mars' },
  { name: 'Taurus',      lord: 'Venus' },
  { name: 'Gemini',      lord: 'Mercury' },
  { name: 'Cancer',      lord: 'Moon' },
  { name: 'Leo',         lord: 'Sun' },
  { name: 'Virgo',       lord: 'Mercury' },
  { name: 'Libra',       lord: 'Venus' },
  { name: 'Scorpio',     lord: 'Mars' },
  { name: 'Sagittarius', lord: 'Jupiter' },
  { name: 'Capricorn',   lord: 'Saturn' },
  { name: 'Aquarius',    lord: 'Saturn' },
  { name: 'Pisces',      lord: 'Jupiter' },
];

// ─── the Vimshottari order and its years ───────────────────────────────
// The nine lords in their fixed cycle, with the years each is allotted of the
// 120-year Vimshottari total. These proportions size the subs.
export const VIMSHOTTARI = [
  { lord: 'Ketu',    years: 7 },
  { lord: 'Venus',   years: 20 },
  { lord: 'Sun',     years: 6 },
  { lord: 'Moon',    years: 10 },
  { lord: 'Mars',    years: 7 },
  { lord: 'Rahu',    years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn',  years: 19 },
  { lord: 'Mercury', years: 17 },
];

export const VIMSHOTTARI_TOTAL = 120; // years; the nine above sum to this

// ─── the twenty-seven nakshatras ───────────────────────────────────────
// Each spans 13 degrees 20 minutes. Their lords run in the Vimshottari order
// above, starting at Ketu for Ashwini and repeating three times over.
export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

export const NAKSHATRA_SPAN = 360 / 27;   // 13.3333... degrees

export const NAKSHATRAS = NAKSHATRA_NAMES.map((name, i) => ({
  index: i,
  name,
  lord: VIMSHOTTARI[i % 9].lord,
  start: i * NAKSHATRA_SPAN,
  end: (i + 1) * NAKSHATRA_SPAN,
}));

// ─── the subs ──────────────────────────────────────────────────────────
// Inside each nakshatra the nine lords take a share proportional to their
// Vimshottari years, beginning with the nakshatra's own lord. That is 27 x 9 =
// 243 spans.
function buildSubSpans() {
  const spans = [];
  for (const nak of NAKSHATRAS) {
    const startIdx = VIMSHOTTARI.findIndex((v) => v.lord === nak.lord);
    let cursor = nak.start;
    for (let k = 0; k < 9; k++) {
      const v = VIMSHOTTARI[(startIdx + k) % 9];
      const width = (v.years / VIMSHOTTARI_TOTAL) * NAKSHATRA_SPAN;
      spans.push({
        nakIndex: nak.index,
        nakName: nak.name,
        starLord: nak.lord,
        subLord: v.lord,
        start: cursor,
        end: Math.min(cursor + width, nak.end),
      });
      cursor += width;
    }
  }
  return spans;
}

export const SUB_SPANS = buildSubSpans();   // 243

// The published KP table is the same 243 spans cut again at every sign
// boundary, because a sub that straddles two signs carries two different sign
// lords and has to be listed twice. Six of the eleven interior sign boundaries
// fall inside a sub, so the table has 249 rows -- the numbers used in KP
// horary. This is a tabulation convention, not extra geometry.
function buildSubTable() {
  const cells = [];
  for (const span of SUB_SPANS) {
    let from = span.start;
    while (from < span.end - 1e-9) {
      const signIndex = Math.min(11, Math.floor(from / 30));
      const to = Math.min(span.end, (signIndex + 1) * 30);
      cells.push({
        number: cells.length + 1,            // 1..249, the horary numbers
        start: from,
        end: to,
        signIndex,
        signLord: SIGNS[signIndex].lord,
        nakIndex: span.nakIndex,
        nakName: span.nakName,
        starLord: span.starLord,
        subLord: span.subLord,
      });
      from = to;
    }
  }
  return cells;
}

export const SUB_TABLE = buildSubTable();    // 249

// ─── the nine planets KP actually uses ─────────────────────────────────
// Krishnamurti worked with the seven classical bodies plus the two lunar
// nodes. The outer planets are deliberately absent: the system's rules were
// never written for them, so adding them would be our invention, not KP.
export const KP_PLANETS = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu',
];

// ─── the ayanamsa ──────────────────────────────────────────────────────
// KP is sidereal, so every tropical longitude has the ayanamsa subtracted from
// it. This is the Krishnamurti ayanamsa as implemented in the Swiss Ephemeris,
// anchored at J1900 (JD 2415020.0, Ephemeris Time) at 22.363889 degrees, which
// is 22 degrees 21 minutes 50.04 seconds.
//
// Honest caveat: KP practitioners do not all agree on this constant. Swiss
// Ephemeris took it from Solar Fire, which took it from Robert Hand's Nova,
// and some readers of Krishnamurti's own tables argue the anchor belongs on
// 15 April rather than 1 January -- a difference of roughly 14 arcseconds.
// Fourteen arcseconds will not move a planet into a different sub except at
// the very edge of one. It is declared here so it can be argued with.
export const KP_AYANAMSA_EPOCH_JD = 2415020.0;
export const KP_AYANAMSA_AT_EPOCH = 22.363889;
