import { castChart, kpAyanamsa, formatDegree } from '../src/lib/kp-chart.js';
import pkg from 'circular-natal-horoscope-js';
const { Origin, Horoscope } = pkg;

// 1. ayanamsa sanity: KP should sit about 6' below Lahiri (~24 13' in 2026)
for (const [label, jd] of [['1900-01-01', 2415020.0], ['2000-01-01', 2451544.5], ['2026-01-01', 2461041.5]]) {
  console.log(`ayanamsa ${label}: ${formatDegree(kpAyanamsa(jd))}`);
}

// 2. cross-check cusps against an independent Placidus implementation
const cases = [
  { label: 'New Delhi 1990-01-01 12:00', local:{year:1990,month:1,day:1,hour:12,minute:0}, zone:'Asia/Kolkata', latitude:28.6139, longitude:77.2090 },
  { label: 'London 1975-06-15 03:30',    local:{year:1975,month:6,day:15,hour:3,minute:30}, zone:'Europe/London', latitude:51.5074, longitude:-0.1278 },
  { label: 'Chennai 1963-04-15 18:45',   local:{year:1963,month:4,day:15,hour:18,minute:45}, zone:'Asia/Kolkata', latitude:13.0827, longitude:80.2707 },
  { label: 'Sydney 2001-11-20 09:05',    local:{year:2001,month:11,day:20,hour:9,minute:5},  zone:'Australia/Sydney', latitude:-33.8688, longitude:151.2093 },
  { label: 'Bombay 1943-07-09 05:20 (war DST)', local:{year:1943,month:7,day:9,hour:5,minute:20}, zone:'Asia/Kolkata', latitude:19.0760, longitude:72.8777 },
];

const BODIES = { Sun:'sun', Moon:'moon', Mercury:'mercury', Venus:'venus', Mars:'mars', Jupiter:'jupiter', Saturn:'saturn' };
const diff = (a,b) => { let d = ((a-b)%360+540)%360-180; return d; };

for (const c of cases) {
  const chart = await castChart(c);
  const o = new Origin({ year:c.local.year, month:c.local.month-1, date:c.local.day,
    hour:c.local.hour, minute:c.local.minute, latitude:c.latitude, longitude:c.longitude });
  const h = new Horoscope({ origin:o, houseSystem:'placidus', zodiac:'tropical', language:'en' });

  const mine = chart.cusps.map(x=>x.tropical);
  const theirs = h.Houses.map(x=>x.ChartPosition.StartPosition.Ecliptic.DecimalDegrees);
  const cuspErr = mine.map((m,i)=>Math.abs(diff(m,theirs[i])*60));

  const pErr = {};
  for (const [mineName, theirName] of Object.entries(BODIES)) {
    const p = chart.planets.find(x=>x.name===mineName);
    const t = h.CelestialBodies[theirName].ChartPosition.Ecliptic.DecimalDegrees;
    pErr[mineName] = Math.abs(diff(p.tropical, t)*60);
  }

  console.log(`\n--- ${c.label} ---`);
  console.log(`  UTC instant      : ${chart.instant}  (offset ${chart.offsetMinutes} min)`);
  console.log(`  cusp max error   : ${Math.max(...cuspErr).toFixed(2)}'   (per cusp: ${cuspErr.map(e=>e.toFixed(1)).join(', ')})`);
  console.log(`  planet max error : ${Math.max(...Object.values(pErr)).toFixed(2)}'   ${Object.entries(pErr).map(([k,v])=>k+':'+v.toFixed(1)).join(' ')}`);
}
