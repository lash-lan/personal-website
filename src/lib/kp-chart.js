// The KP chart engine.
//
// This file does arithmetic and nothing else. It takes a moment and a place on
// Earth and returns where the nine KP planets and the twelve Placidus cusps
// stood, in the sidereal zodiac, with the sign, star and sub lord of each.
// It makes no claims about what any of that means -- that is kp-report.js,
// and it is kept separate on purpose so the maths can be checked against any
// other KP program without the prose getting in the way.
//
// Runs in the reader's browser. Birth data never leaves their machine.

import {
  SIGNS, NAKSHATRA_SPAN, SUB_TABLE,
  KP_AYANAMSA_EPOCH_JD, KP_AYANAMSA_AT_EPOCH,
} from '../data/kp.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const sin = (d) => Math.sin(d * D2R);
const cos = (d) => Math.cos(d * D2R);
const tan = (d) => Math.tan(d * D2R);
const norm = (d) => ((d % 360) + 360) % 360;

// astronomy-engine is loaded on demand: a reader who never casts a chart
// should not download an ephemeris.
let _ae;
const ae = async () => (_ae ||= await import('astronomy-engine'));

// ─── time ──────────────────────────────────────────────────────────────

// The offset a zone was actually running at a given instant, in minutes east
// of UTC. Read from the browser's own time zone database rather than assumed,
// which is the only way to get history right: India ran an hour ahead during
// 1942-45, and before 1906 it kept local mean time.
function zoneOffsetMinutes(ms, zone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms)).reduce((a, p) => (a[p.type] = p.value, a), {});
  const asUtc = Date.UTC(
    +parts.year, +parts.month - 1, +parts.day,
    parts.hour === '24' ? 0 : +parts.hour, +parts.minute, +parts.second,
  );
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

// A wall-clock birth time in some zone, resolved to a real instant. Solved by
// iteration because the offset depends on the instant we are trying to find.
export function localToInstant({ year, month, day, hour, minute }, zone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  let ms = naive;
  for (let i = 0; i < 3; i++) ms = naive - zoneOffsetMinutes(ms, zone) * 60000;
  return { date: new Date(ms), offsetMinutes: zoneOffsetMinutes(ms, zone) };
}

// ─── obliquity and the ayanamsa ────────────────────────────────────────

// Mean obliquity of the ecliptic, IAU 2006, plus the leading terms of the
// nutation in obliquity. Accurate to a fraction of an arcsecond, which is far
// finer than the narrowest sub.
function obliquity(T) {
  const mean = (84381.406
    - 46.836769 * T
    - 0.0001831 * T ** 2
    + 0.00200340 * T ** 3
    - 5.76e-7 * T ** 4
    - 4.34e-8 * T ** 5) / 3600;
  const omega = 125.04452 - 1934.136261 * T;           // mean lunar node
  const lSun = 280.4665 + 36000.7698 * T;              // mean longitude, Sun
  const lMoon = 218.3165 + 481267.8813 * T;            // mean longitude, Moon
  const dEps = (9.205 * cos(omega) + 0.573 * cos(2 * lSun)
    + 0.098 * cos(2 * lMoon) + 0.089 * cos(2 * omega)) / 3600;
  return mean + dEps;
}

// General precession in longitude since J2000, IAU 2006, in degrees.
function precessionInLongitude(T) {
  return (5028.796195 * T
    + 1.1054348 * T ** 2
    + 0.00007964 * T ** 3
    - 0.000023857 * T ** 4
    - 0.0000000383 * T ** 5) / 3600;
}

// The Krishnamurti ayanamsa at a given Julian Day: its anchored 1900 value,
// carried forward by precession.
export function kpAyanamsa(jd) {
  const T = (jd - 2451545.0) / 36525;
  const T0 = (KP_AYANAMSA_EPOCH_JD - 2451545.0) / 36525;
  return KP_AYANAMSA_AT_EPOCH + precessionInLongitude(T) - precessionInLongitude(T0);
}

// ─── Placidus cusps ────────────────────────────────────────────────────
//
// Placidus divides each body's own day-arc and night-arc into thirds, so an
// intermediate cusp depends on its own declination, which depends on the
// longitude being solved for. That circle is broken by iteration. The system
// has no solution inside the polar circles, where bodies never rise or set,
// and this refuses rather than returning a confident wrong answer.

const PLACIDUS_LIMIT = 66.0;

function mcLongitude(ramc, eps) {
  return norm(Math.atan2(sin(ramc), cos(ramc) * cos(eps)) * R2D);
}

function ascLongitude(ramc, lat, eps) {
  return norm(Math.atan2(
    cos(ramc),
    -(sin(ramc) * cos(eps) + tan(lat) * sin(eps)),
  ) * R2D);
}

// Right ascension to ecliptic longitude, for a point on the ecliptic.
const raToLongitude = (ra, eps) => norm(Math.atan2(sin(ra), cos(ra) * cos(eps)) * R2D);

// Converges on the right ascension of an intermediate cusp.
// `fraction` is how much of the semi-arc separates it from the meridian it is
// measured from: 3 means one third, 1.5 means two thirds.
function intermediateRa(ramc, offset, fraction, lat, eps, nocturnal) {
  const k = tan(eps) * tan(lat);
  const base = nocturnal ? ramc + 180 : ramc;
  let ra = ramc + offset;
  for (let i = 0; i < 40; i++) {
    // cos(semi-arc) is -tan(dec)tan(lat) by day and +tan(dec)tan(lat) by night;
    // for a point on the ecliptic tan(dec) is sin(ra)tan(obliquity).
    const c = (nocturnal ? 1 : -1) * sin(ra) * k;
    if (Math.abs(c) > 1) return null;                 // circumpolar: no cusp
    const semiArc = Math.acos(c) * R2D;
    const next = nocturnal
      ? base - semiArc / fraction
      : base + semiArc / fraction;
    if (Math.abs(norm(next - ra + 180) - 180) < 1e-10) return next;
    ra = next;
  }
  return ra;
}

export function placidusCusps(ramc, lat, eps) {
  if (Math.abs(lat) >= PLACIDUS_LIMIT) {
    throw new Error(
      'Placidus house division has no solution this close to the poles, so KP '
      + 'cannot be cast for this latitude. This is a limit of the system, not a bug.',
    );
  }
  const c10 = mcLongitude(ramc, eps);
  const c1 = ascLongitude(ramc, lat, eps);

  const ra11 = intermediateRa(ramc, 30, 3, lat, eps, false);
  const ra12 = intermediateRa(ramc, 60, 1.5, lat, eps, false);
  const ra2 = intermediateRa(ramc, 120, 1.5, lat, eps, true);
  const ra3 = intermediateRa(ramc, 150, 3, lat, eps, true);
  if ([ra11, ra12, ra2, ra3].some((r) => r === null)) {
    throw new Error(
      'One or more house cusps are circumpolar at this latitude, so Placidus '
      + 'cannot divide the houses here.',
    );
  }

  const c11 = raToLongitude(ra11, eps);
  const c12 = raToLongitude(ra12, eps);
  const c2 = raToLongitude(ra2, eps);
  const c3 = raToLongitude(ra3, eps);

  // The remaining six are the opposite points of these.
  return [
    c1, c2, c3,
    norm(c10 + 180), norm(c11 + 180), norm(c12 + 180),
    norm(c1 + 180), norm(c2 + 180), norm(c3 + 180),
    c10, c11, c12,
  ];
}

// ─── reading a longitude as KP reads it ────────────────────────────────

export function describeLongitude(sidereal) {
  const lon = norm(sidereal);
  const signIndex = Math.floor(lon / 30);
  const cell = SUB_TABLE.find((c) => lon >= c.start && lon < c.end) ?? SUB_TABLE[0];
  const nakPos = lon - cell.nakIndex * NAKSHATRA_SPAN;
  return {
    longitude: lon,
    sign: SIGNS[signIndex].name,
    signLord: SIGNS[signIndex].lord,
    degreeInSign: lon - signIndex * 30,
    nakshatra: cell.nakName,
    starLord: cell.starLord,
    subLord: cell.subLord,
    subNumber: cell.number,
    // how far through its own sub the point stands, and how wide that sub is;
    // both decide how trustworthy the reading is against a shaky birth time
    subStart: cell.start,
    subEnd: cell.end,
    subWidthMinutes: (cell.end - cell.start) * 60,
    marginMinutes: Math.min(lon - cell.start, cell.end - lon) * 60,
    pada: Math.floor(nakPos / (NAKSHATRA_SPAN / 4)) + 1,
  };
}

export const formatDegree = (deg) => {
  const d = Math.floor(deg);
  const mFloat = (deg - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return s === 60
    ? `${d}° ${String(m + 1).padStart(2, '0')}' 00"`
    : `${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}"`;
};

// ─── the planets ───────────────────────────────────────────────────────

// Tropical geocentric longitude in the true ecliptic of date, which is the
// frame the cusps are computed in too.
async function tropicalLongitude(body, date) {
  const A = await ae();
  if (body === 'Moon') return norm(A.EclipticGeoMoon(date).lon);
  if (body === 'Sun') return norm(A.SunPosition(date).elon);
  return norm(A.Ecliptic(A.GeoVector(A.Body[body], date, true)).elon);
}

// Rahu is the Moon's mean ascending node; Ketu is the point opposite. KP uses
// the mean node, so this is the standard polynomial rather than the wobbling
// true node. Both are always retrograde.
function meanNode(T) {
  return norm(125.04452 - 1934.136261 * T + 0.0020708 * T ** 2 + T ** 3 / 450000);
}

// ─── the whole chart ───────────────────────────────────────────────────

export async function castChart({ local, zone, latitude, longitude, place }) {
  const A = await ae();
  const { date, offsetMinutes } = localToInstant(local, zone);
  const time = A.MakeTime(date);
  const jd = 2451545.0 + time.ut;
  const T = (jd - 2451545.0) / 36525;

  const eps = obliquity(T);
  const ayanamsa = kpAyanamsa(jd);

  // Greenwich apparent sidereal time, in hours, carried east to the birthplace.
  const lstHours = ((A.SiderealTime(date) + longitude / 15) % 24 + 24) % 24;
  const ramc = norm(lstHours * 15);

  const cuspLongitudes = placidusCusps(ramc, latitude, eps);
  const cusps = cuspLongitudes.map((trop, i) => ({
    house: i + 1,
    tropical: trop,
    ...describeLongitude(trop - ayanamsa),
  }));

  // Retrograde motion is measured, not looked up: where the body stood three
  // hours before and after.
  const step = 3 / 24;
  const planets = [];
  for (const name of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
    const trop = await tropicalLongitude(name, date);
    const before = await tropicalLongitude(name, A.MakeTime(time.ut - step));
    const after = await tropicalLongitude(name, A.MakeTime(time.ut + step));
    const drift = norm(after - before + 180) - 180;
    planets.push({
      name,
      tropical: trop,
      retrograde: drift < 0,
      ...describeLongitude(trop - ayanamsa),
    });
  }
  const rahu = meanNode(T);
  planets.push({ name: 'Rahu', tropical: rahu, retrograde: true, ...describeLongitude(rahu - ayanamsa) });
  planets.push({ name: 'Ketu', tropical: norm(rahu + 180), retrograde: true, ...describeLongitude(rahu + 180 - ayanamsa) });

  // Which house each planet falls in, by the cusps just computed.
  const starts = cusps.map((c) => c.longitude);
  for (const p of planets) {
    p.house = 1 + starts.findIndex((s, i) => {
      const next = starts[(i + 1) % 12];
      return next > s ? p.longitude >= s && p.longitude < next
        : p.longitude >= s || p.longitude < next;
    });
  }

  // KP's significators: a house is spoken for by the planets in its star
  // lord's company. Kept as plain tallies here; the report decides what to say.
  const occupants = {};
  const owners = {};
  for (let h = 1; h <= 12; h++) {
    occupants[h] = planets.filter((p) => p.house === h).map((p) => p.name);
    owners[h] = planets.filter((p) => cusps[h - 1].signLord === p.name).map((p) => p.name);
  }

  return {
    input: { local, zone, latitude, longitude, place },
    instant: date.toISOString(),
    offsetMinutes,
    julianDay: jd,
    ayanamsa,
    obliquity: eps,
    ramc,
    planets,
    cusps,
    occupants,
    owners,
  };
}
