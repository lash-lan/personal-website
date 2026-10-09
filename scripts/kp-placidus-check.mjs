// Does each implementation satisfy the Placidus DEFINITION?
// Cusp 11 must stand one third of its own diurnal semi-arc from the MC;
// cusp 12 two thirds; cusp 3 one third of its nocturnal semi-arc from the IC;
// cusp 2 two thirds. Checked through the full spherical conversion rather than
// the shortcut identity the engine uses, so this tests the shortcut too.
//
// `local` is the wall clock at the birthplace, `utc` the same instant in UTC.
// Both are given explicitly because the comparison library takes local time
// and our engine takes the instant, and conflating them invalidates the test.
import { placidusCusps } from '../src/lib/kp-chart.js';
import * as A from 'astronomy-engine';
import pkg from 'circular-natal-horoscope-js';
const { Origin, Horoscope } = pkg;

const D = Math.PI / 180, R = 180 / Math.PI;
const nrm = (d) => ((d % 360) + 360) % 360;
const smallest = (t) => Math.abs(nrm(t + 180) - 180);

function residual(lam, ramc, lat, eps, which) {
  const dec = Math.asin(Math.sin(eps * D) * Math.sin(lam * D)) * R;
  const ra = nrm(Math.atan2(Math.sin(lam * D) * Math.cos(eps * D), Math.cos(lam * D)) * R);
  const cD = -Math.tan(dec * D) * Math.tan(lat * D);
  if (Math.abs(cD) > 1) return NaN;
  const SD = Math.acos(cD) * R;
  const SN = 180 - SD;
  if (which === 11) return smallest(ra - (ramc + SD / 3));
  if (which === 12) return smallest(ra - (ramc + SD / 1.5));
  if (which === 3) return smallest(ra - (ramc + 180 - SN / 3));
  if (which === 2) return smallest(ra - (ramc + 180 - SN / 1.5));
}

const cases = [
  { label: 'London 1975-06-15',   lat: 51.5074, lon: -0.1278,  local: [1975,6,15,3,30],  utc: [1975,6,15,2,30] },
  { label: 'New Delhi 1990-01-01',lat: 28.6139, lon: 77.2090,  local: [1990,1,1,12,0],   utc: [1990,1,1,6,30] },
  { label: 'Chennai 1963-04-15',  lat: 13.0827, lon: 80.2707,  local: [1963,4,15,18,45], utc: [1963,4,15,13,15] },
  { label: 'Reykjavik 1988-02-02',lat: 64.1466, lon: -21.9426, local: [1988,2,2,22,10],  utc: [1988,2,2,22,10] },
];

for (const c of cases) {
  const [uy, umo, ud, uh, umi] = c.utc;
  const date = new Date(Date.UTC(uy, umo - 1, ud, uh, umi, 0));
  const T = A.MakeTime(date).ut / 36525;
  const eps = (84381.406 - 46.836769 * T - 0.0001831 * T ** 2 + 0.00200340 * T ** 3) / 3600
    + (9.205 * Math.cos((125.04452 - 1934.136261 * T) * D)
     + 0.573 * Math.cos(2 * (280.4665 + 36000.7698 * T) * D)) / 3600;
  const ramc = nrm((((A.SiderealTime(date) + c.lon / 15) % 24 + 24) % 24) * 15);

  const mine = placidusCusps(ramc, c.lat, eps);
  const [ly, lmo, ld, lh, lmi] = c.local;
  const o = new Origin({ year: ly, month: lmo - 1, date: ld, hour: lh, minute: lmi,
    latitude: c.lat, longitude: c.lon });
  const hs = new Horoscope({ origin: o, houseSystem: 'placidus', zodiac: 'tropical', language: 'en' });
  const theirs = hs.Houses.map((x) => x.ChartPosition.StartPosition.Ecliptic.DecimalDegrees);

  // confirm the two agree on the axes, which proves the times line up
  const axis = Math.max(...[1, 10].map((h) => smallest(mine[h - 1] - theirs[h - 1]) * 60));
  console.log(`\n--- ${c.label}  lat ${c.lat}  (Asc/MC agreement ${axis.toFixed(2)}') ---`);
  for (const k of [11, 12, 2, 3]) {
    const rm = residual(mine[k - 1], ramc, c.lat, eps, k) * 60;
    const rt = residual(theirs[k - 1], ramc, c.lat, eps, k) * 60;
    console.log(`  cusp ${String(k).padStart(2)}   ours misses definition by ${rm.toFixed(3)}'`
      + `   |   theirs by ${rt.toFixed(3)}'`);
  }
}
