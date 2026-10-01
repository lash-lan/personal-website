// Plain date arithmetic on YYYY-MM-DD strings.
//
// Pulled out of engine.js so analytics.js can use the same helpers without the
// two importing each other. Everything here is pure: no state, no settings, no
// knowledge of the plan.

const pad = (n) => String(n).padStart(2, '0');
const utc = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };

export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
export const addDays = (s, n) => {
  const d = new Date(utc(s) + n * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
export const monthOf = (s) => (s || '').slice(0, 7);
export const weekday = (s) => new Date(utc(s)).getUTCDay(); // 0 = Sunday

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const fmtDay = (s) => (s ? `${Number(s.slice(8))} ${MON[Number(s.slice(5, 7)) - 1]}` : '');
export const fmtDayLong = (s) => (s ? `${DAY[weekday(s)]} ${fmtDay(s)}` : '');
export const fmtMonth = (m) => `${MON[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
export const rm = (n) => `RM${Math.round(Number(n) || 0).toLocaleString('en-MY')}`;
export const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-MY');
export const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;
