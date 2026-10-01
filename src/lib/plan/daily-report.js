// The daily progress report, as a PDF.
//
// This one is not for Lash. It is for Amelia, and that changes what belongs in
// it. A screen can afford to show a conclusion and hide the working, because
// the person reading it was there. A document handed to someone who was not
// there has to carry the working too, or the reader is reduced to agreeing
// with whatever the number says.
//
// So three rules run through all of it.
//
// Raw before cooked. Every note, reflection and remark is reproduced word for
// word, never summarised, never tidied. Where a number exists, the thing it was
// worked out from is printed beside it.
//
// Missing is not zero. A habit nobody recorded is printed as unrecorded and
// kept out of the score, and the report says how much of the day is actually
// known. An incomplete day still produces a report, clearly marked as one.
//
// Provenance last, and always. The final section says which scoring era the day
// belongs to, the exact arithmetic behind both numbers, where the walking state
// came from, and what was deliberately left out. A disagreement with this
// document should be traceable to a rule rather than to a mood.
//
// The monthly report prints through the browser, which is right for a long
// document full of tables. This one is built with pdf-lib instead, because it
// has to end as a file that can be attached in one tap on a phone, and a print
// dialog does not reliably give you that.

import { fmtDay, fmtDayLong, fmtMonth, monthOf, rm, num, pct } from './engine-dates.js';
import { STATE, DOMAINS, SCORED, UNSCORED, CARE_PARTS, NUTRITION, V2_FROM } from './schema.js';
import { HABITS, LINE_ITEMS } from './seed.js';

const A4 = [595.28, 841.89];
const M = 48;                 // page margin
const FOOT = 44;              // space kept for the footer

const INK = '#15171c';
const MUTE = '#5d6470';
const FAINT = '#9aa1ad';
const RULE = '#d4d8de';
const PAPER = '#ffffff';
const WELL = '#f3f5f8';       // background for quoted text

// Darker than the screen's palette: these have to read as ink on white paper.
const TONE = {
  done: '#1f7a4d', rest: '#92690f', missed: '#a8322f',
  excused: '#5d6470', unrecorded: '#9aa1ad',
};

const hex = (rgb, s) => {
  const n = parseInt(String(s).replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** The four-state glyphs, in characters the standard PDF fonts actually have. */
const GLYPH = { done: '[x]', rest: '[-]', missed: '[ ]', excused: '[/]', unrecorded: '[?]' };

/**
 * Build the report for one day.
 *
 * @param a      the analysis object the screens are drawn from
 * @param date   YYYY-MM-DD
 * @param opts   { finances: boolean }  whether to itemise the day's money
 * @returns      { blob, filename }
 */
export async function buildDailyReport(a, date, opts = {}) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ital = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const C = (s) => hex(rgb, s);

  const W = A4[0] - M * 2;
  const pages = [];
  let page, y;

  const newPage = () => {
    page = pdf.addPage(A4);
    page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: C(PAPER) });
    pages.push(page);
    y = A4[1] - M;
  };
  const need = (hh) => { if (y - hh < FOOT + 16) newPage(); };

  // The standard PDF fonts only cover WinAnsi, and the plan is full of emoji
  // and typographic punctuation. Everything outside the range is folded down
  // here rather than thrown, so one unusual character cannot break the file.
  const safe = (t) => String(t ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/·/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const wrap = (text, font, size, width) => {
    const words = safe(text).split(' ').filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = w; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  };

  const text = (s, x, size, font, colour) =>
    page.drawText(safe(s), { x, y, size, font, color: C(colour) });

  const para = (s, o = {}) => {
    const font = o.font || body;
    const size = o.size ?? 9.6;
    const lead = o.lead ?? 13.2;
    const x = M + (o.indent || 0);
    for (const ln of wrap(s, font, size, W - (o.indent || 0))) {
      need(lead);
      page.drawText(ln, { x, y, size, font, color: C(o.colour || INK) });
      y -= lead;
    }
    y -= o.gap ?? 5;
  };

  const heading = (s) => {
    need(44);
    y -= 10;
    text(String(s).toUpperCase(), M, 8.4, bold, MUTE);
    y -= 7;
    page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.7, color: C(RULE) });
    y -= 15;
  };

  const sub = (s) => { need(26); y -= 3; text(s, M, 9.6, bold, INK); y -= 14; };

  /** A label on the left, its value on the right, both wrapping sensibly. */
  const kv = (label, value, o = {}) => {
    const lw = o.labelWidth ?? 132;
    const lines = wrap(value, o.font || body, 9.4, W - lw);
    need(Math.max(lines.length, 1) * 12.6 + 2);
    const top = y;
    page.drawText(safe(label), { x: M, y: top, size: 9.4, font: body, color: C(MUTE) });
    lines.forEach((ln, i) => page.drawText(ln, {
      x: M + lw, y: top - i * 12.6, size: 9.4, font: o.font || body, color: C(o.colour || INK),
    }));
    y = top - lines.length * 12.6;
  };

  /**
   * Something Lash wrote, reproduced exactly: his line breaks kept, nothing
   * shortened, in a tinted well so it is obvious where his words start and the
   * report's words stop.
   */
  const verbatim = (s) => {
    const raw = String(s ?? '').replace(/\r\n?/g, '\n');
    const paras = raw.split('\n');
    const inner = W - 22;
    const lines = paras.flatMap((p) => (p.trim() ? wrap(p, body, 9.4, inner) : ['']));
    // Kept on one page where it fits, so a short note is never split in two.
    const h = lines.length * 12.8 + 16;
    if (h < 240) need(h); else need(60);
    let i = 0;
    while (i < lines.length) {
      const room = Math.max(1, Math.floor((y - FOOT - 16 - 16) / 12.8));
      const chunk = lines.slice(i, i + room);
      const boxH = chunk.length * 12.8 + 14;
      page.drawRectangle({ x: M, y: y - boxH + 6, width: W, height: boxH, color: C(WELL) });
      page.drawRectangle({ x: M, y: y - boxH + 6, width: 2.4, height: boxH, color: C(RULE) });
      let yy = y - 6;
      for (const ln of chunk) {
        page.drawText(ln, { x: M + 11, y: yy, size: 9.4, font: body, color: C(INK) });
        yy -= 12.8;
      }
      y = y - boxH - 2;
      i += chunk.length;
      if (i < lines.length) newPage();
    }
    y -= 6;
  };

  const bullet = (s, o = {}) => {
    const lines = wrap(s, o.font || body, 9.4, W - 14);
    need(lines.length * 12.6 + 2);
    const top = y;
    page.drawText('-', { x: M + 2, y: top, size: 9.4, font: body, color: C(FAINT) });
    lines.forEach((ln, i) => page.drawText(ln, {
      x: M + 14, y: top - i * 12.6, size: 9.4, font: o.font || body, color: C(o.colour || INK),
    }));
    y = top - lines.length * 12.6;
  };

  /** One habit: its state in words and colour, then everything behind it. */
  const habitBlock = (hb, detailLines) => {
    const st = hb.state;
    const head = `${GLYPH[st]} ${hb.name}`;
    need(14 + detailLines.length * 12.2 + 4);
    page.drawText(safe(head), { x: M, y, size: 9.8, font: bold, color: C(TONE[st]) });
    // Half credit is called Rest everywhere else, which is the right word for a
    // habit you chose to skip and the wrong one for a mixed meal or a care
    // routine you got two thirds of the way through.
    const label = stateWord(hb);
    page.drawText(safe(label), {
      x: A4[0] - M - body.widthOfTextAtSize(safe(label), 9), y, size: 9, font: body, color: C(TONE[st]),
    });
    y -= 13;
    for (const ln of detailLines) {
      for (const w of wrap(ln, body, 8.9, W - 16)) {
        need(11.6);
        page.drawText(w, { x: M + 16, y, size: 8.9, font: body, color: C(MUTE) });
        y -= 11.6;
      }
    }
    y -= 5;
  };

  // ── the day ───────────────────────────────────────────────────────────────

  const day = a.days.find((d) => d.date === date);
  if (!day) throw new Error(`There is no day ${date} in the plan.`);

  const s = a.s;
  const finances = opts.finances !== false;
  const isToday = date === a.now;
  const generated = new Date();
  const stamp = generated.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });

  const month = monthOf(date);
  const tx = a.tx.filter((t) => t.date === date);
  const evidence = a.evidence.filter((e) => e.date === date);
  const dueToday = a.tasks.filter((t) => t.end === date);
  const startedToday = a.tasks.filter((t) => t.start === date);
  const touchedToday = a.tasks.filter((t) => t.updated === date);
  const openNow = a.tasks.filter((t) => t.type === 'Task' && t.status !== 'Done' && t.start <= date && t.end >= date);

  // ── cover block ───────────────────────────────────────────────────────────

  newPage();
  text('LASH 2026 - DAILY PROGRESS REPORT', M, 8.4, bold, MUTE);
  y -= 24;
  text(fmtDayLong(date), M, 22, bold, INK);
  y -= 16;
  text(`${fmtMonth(month)}  -  day ${a.planDay} of the programme  -  phase: ${a.phase?.name ?? 'outside the programme'}`,
    M, 9.4, body, MUTE);
  y -= 20;

  // The headline is a sentence, not a percentage, and it says plainly when the
  // day is still open or was never written down.
  const verdictLine = {
    untracked: isToday ? 'Nothing has been logged for today yet.' : 'Nothing was logged for this day.',
    partial: 'Partially recorded. There is not enough here to judge the day fairly.',
    good: 'A good day by the standard set in the plan.',
    below: 'Below the standard set in the plan.',
  }[day.verdict];
  para(verdictLine, { font: bold, size: 11.4, lead: 15, gap: 8 });

  if (isToday) {
    para('This report was generated while the day was still in progress, so anything not yet recorded may simply not have happened yet.',
      { font: ital, size: 9, colour: MUTE, gap: 6 });
  }
  if (day.legacy) {
    para(`This day falls before ${fmtDay(V2_FROM)} and is scored under the original rules. Its numbers are not directly comparable with days after that date. The difference is set out at the end.`,
      { font: ital, size: 9, colour: MUTE, gap: 6 });
  }

  y -= 2;
  kv('Behaviour', day.score === null ? 'not scored, nothing recorded' : pct(day.score), { font: bold });
  kv('Day known', day.legacy
    ? `${day.recorded + day.excused} of ${day.scoredHabits} habits carry a mark`
    : `${pct(day.completeness)} - ${day.recorded + day.excused} of ${day.scoredHabits} habits recorded`
      + (day.unrecorded ? `, ${day.unrecorded} left blank` : ''));
  kv('Kind of day', capital(day.context || 'normal') + (day.back ? `, back ${String(day.back).toLowerCase()}` : ''));
  kv('Steps', day.steps == null ? 'not recorded' : `${num(day.steps)} against a target of ${num(s.stepTarget || 5000)}`);
  kv('Consistency', a.consistency7?.rate == null
    ? 'not enough judged days in the last seven'
    : `${pct(a.consistency7.rate)} of the last seven judged days were good (${a.consistency7.good} of ${a.consistency7.judged})`);

  // ── the three domains ─────────────────────────────────────────────────────

  heading('The shape of the day');
  para('Three areas, scored separately. A domain with nothing recorded is reported as unrecorded rather than as a zero.',
    { size: 9, colour: MUTE, gap: 7 });

  for (const dm of DOMAINS) {
    const d = day.domain[dm.id];
    const line = d.score === null
      ? 'unrecorded'
      : `${pct(d.score)} - ${d.shape.label} (${fmtCredit(d.credit)} of ${d.eligible} counted`
        + (d.excused ? `, ${d.excused} excused` : '')
        + (d.unrecorded ? `, ${d.unrecorded} blank` : '') + ')';
    kv(dm.label, line, { labelWidth: 78, colour: d.score === null ? MUTE : INK });
  }

  // ── every habit, with its working ─────────────────────────────────────────

  heading('Every habit');

  for (const dm of DOMAINS) {
    sub(dm.label);
    for (const id of dm.habits) habitBlock(day.habits[id], detailFor(day, id, s));
  }
  sub('Recorded but not scored');
  for (const id of UNSCORED) habitBlock(day.habits[id], detailFor(day, id, s));

  // ── his own words ─────────────────────────────────────────────────────────

  heading('In his own words');
  para('Reproduced exactly as written. Nothing here has been shortened, corrected or summarised.',
    { size: 9, colour: MUTE, gap: 7 });

  sub('Reflection');
  if (String(day.reflection || '').trim()) verbatim(day.reflection);
  else para('Not written.', { colour: FAINT, font: ital, gap: 6 });

  sub('Note about the day');
  if (String(day.notes || '').trim()) verbatim(day.notes);
  else para('Not written.', { colour: FAINT, font: ital, gap: 6 });

  if (String(day.familyNote || '').trim()) {
    sub('Family');
    verbatim(day.familyNote);
  }
  const nutritionNote = day.habits.nutrition?.detail?.note;
  if (String(nutritionNote || '').trim()) {
    sub('Food');
    verbatim(nutritionNote);
  }

  // ── priorities ────────────────────────────────────────────────────────────

  heading("The day's three");
  if (!day.priorities.length) {
    para('None were set. The screen holds at most three, so an empty list means none were chosen, not that they were lost.',
      { colour: MUTE, size: 9 });
  } else {
    for (const p of day.priorities) {
      bullet(`${p.done ? GLYPH.done : GLYPH.missed}  ${p.text}`, { colour: p.done ? TONE.done : INK });
    }
    y -= 4;
    para(`${day.priorities.filter((p) => p.done).length} of ${day.priorities.length} finished.`,
      { size: 9, colour: MUTE });
  }

  // ── the plan around the day ───────────────────────────────────────────────

  heading('The plan on this day');
  const taskLine = (t) => `${t.id}  ${t.task ?? ''} - ${t.status ?? 'no status'}`
    + (t.pct != null && t.pct !== '' ? ` (${Math.round(Number(t.pct))}%)` : '')
    + (t.workstream ? ` - ${t.workstream}` : '');

  if (dueToday.length) { sub(`Fell due today (${dueToday.length})`); for (const t of dueToday) bullet(taskLine(t)); y -= 4; }
  if (startedToday.length) { sub(`Due to start today (${startedToday.length})`); for (const t of startedToday) bullet(taskLine(t)); y -= 4; }
  if (touchedToday.length) { sub(`Updated today (${touchedToday.length})`); for (const t of touchedToday) bullet(taskLine(t)); y -= 4; }
  if (!dueToday.length && !startedToday.length && !touchedToday.length) {
    para('No task fell due, began or was updated on this day.', { colour: MUTE, size: 9, gap: 7 });
  }
  kv('Open and running', `${openNow.length} task${openNow.length === 1 ? '' : 's'} were underway on this date`,
    { labelWidth: 132 });
  if (a.nextGate) {
    kv('Next gate', `${a.nextGate.name} on ${fmtDay(a.nextGate.gateDate)} - ${a.nextGate.done} of ${a.nextGate.total} tasks done`);
  }

  // ── money ─────────────────────────────────────────────────────────────────

  heading('Money');
  if (!finances) {
    const total = tx.reduce((t, x) => t + (Number(x.amount) || 0), 0);
    para(`Detailed finances are turned off for this report. ${tx.length} transaction${tx.length === 1 ? '' : 's'} totalling ${rm(total)} ${tx.length === 1 ? 'was' : 'were'} recorded on this day. Turn the setting on in the plan if the detail is wanted.`,
      { colour: MUTE, size: 9 });
  } else if (!tx.length) {
    para('Nothing was recorded in or out on this day. That is not the same as nothing having been spent.',
      { colour: MUTE, size: 9 });
  } else {
    for (const t of tx) {
      const amount = Number(t.amount) || 0;
      const income = /Income|Fund Add/i.test(categoryOf(t.item));
      bullet(`${rm(amount)}  ${t.item ?? 'unlabelled'}${t.account ? ` - from ${t.account}` : ''}${t.remarks ? ` - "${t.remarks}"` : ''}`,
        { colour: income ? TONE.done : INK });
    }
    y -= 5;
    // Kept apart on purpose. Money moved into a fund has not left, and adding it
    // to the day's spending is the single most misleading thing this page could
    // do. The three lines total the day between them.
    const sum = (f) => tx.filter(f).reduce((v, t) => v + (Number(t.amount) || 0), 0);
    kv('Came in', rm(sum((t) => categoryOf(t.item) === 'Income')));
    kv('Spent', rm(sum((t) => categoryOf(t.item) === 'Expense' || categoryOf(t.item) === 'Fund Spend')));
    kv('Moved into funds', rm(sum((t) => categoryOf(t.item) === 'Fund Add')));
    const mm = a.months[month];
    if (mm) {
      kv(`${fmtMonth(month)} so far`,
        `in ${rm(mm.income.actual)}, living costs ${rm(mm.living.actual)}, into savings ${rm(mm.savings.actual)}, out of funds ${rm(mm.fundSpend.actual)}`);
    }
  }

  // ── career evidence ───────────────────────────────────────────────────────

  if (evidence.length) {
    heading('Career evidence recorded today');
    for (const e of evidence) {
      for (const [field, label] of [['problem', 'Problem'], ['responsibility', 'Responsibility'],
        ['action', 'Action'], ['result', 'Result'], ['evidence', 'Evidence'], ['skill', 'Skill']]) {
        if (String(e[field] || '').trim()) kv(label, e[field], { labelWidth: 100 });
      }
      y -= 8;
    }
  }

  // ── provenance ────────────────────────────────────────────────────────────

  if (y < FOOT + 300) newPage();
  heading('Where these numbers came from');
  para('So that anything in this report can be argued with on the facts rather than taken on trust.',
    { size: 9, colour: MUTE, gap: 8 });

  sub('The two numbers');
  para('Behaviour says how the recorded behaviour went. Day known says how much of the day was written down at all. They are reported separately and never combined, because "it went badly" and "it was not recorded" are different facts and only the first is about behaviour.',
    { size: 9, colour: MUTE, gap: 7 });

  if (day.legacy) {
    para(`Scoring era: the original rules, which apply to every day before ${fmtDay(V2_FROM)}. Under them a Rest left the sum entirely, and a habit left blank counted against the day exactly as a miss did. Behaviour = marks done divided by (${HABITS.length} - rests).`,
      { size: 9, gap: 7 });
    para('These days are never re-scored under the current rules. The day happened under the contract it was recorded under, and rewriting it afterwards would make the record untrustworthy in both directions.',
      { size: 9, colour: MUTE, gap: 7 });
  } else {
    para(`Scoring era: the current rules, which apply from ${fmtDay(V2_FROM)}.`, { size: 9, gap: 6 });
    bullet('Done counts 1. Rest counts a half, because it is a real choice with a real cost. Missed counts 0.', { colour: MUTE });
    bullet('Excused leaves the sum entirely. It is for a day where the habit was genuinely not available, not for a day it was skipped.', { colour: MUTE });
    bullet('Unrecorded leaves the behaviour score too, and is counted instead as missing information.', { colour: MUTE });
    y -= 6;
    para(`Behaviour for this day = ${fmtCredit(creditOf(day))} credit over ${day.eligible} counted habit${day.eligible === 1 ? '' : 's'} = ${day.score === null ? 'not scored' : pct(day.score)}.`,
      { size: 9, gap: 5 });
    para(`Day known = (${day.recorded} recorded + ${day.excused} excused) over (${day.recorded} + ${day.excused} + ${day.unrecorded} blank) = ${pct(day.completeness)}.`,
      { size: 9, gap: 7 });
    para(`A day is only called good or below once at least ${s.minTracking ?? 70}% of it is known. Below that it is reported as partial, so an unrecorded day is never mistaken for a bad one. The bar for a good day is ${s.goodDay}%.`,
      { size: 9, colour: MUTE, gap: 7 });
  }

  sub('Walking');
  const wd = day.habits.walking.detail;
  para(wd.source === 'manual'
    ? `Taken from the mark Lash set by hand. ${wd.steps == null ? 'No step count was entered.' : `A step count of ${num(wd.steps)} was also recorded.`} A mark set by hand always wins over the step count.`
    : wd.source === 'steps'
      ? `Worked out from the step count: ${num(wd.steps)} against a target of ${num(wd.target)}. No mark was set by hand.`
      : 'Neither a mark nor a step count was recorded, so walking is unrecorded for this day.',
  { size: 9, colour: MUTE, gap: 6 });
  if (wd.inconsistent) {
    para(`The two disagree: the day is marked ${STATE[day.habits.walking.state].label} while ${num(wd.steps)} steps are recorded against a target of ${num(wd.target)}. The plan does not quietly correct this. It is printed so it can be settled by the people who were there.`,
      { size: 9, colour: TONE.missed, gap: 6 });
  }

  sub('What is deliberately left out');
  bullet('Reflection is recorded and never scored. It is worth reading, and it is not a wellbeing behaviour to be marked out of ten.', { colour: MUTE });
  bullet('Nothing in this report is generated, inferred or filled in. A blank in the plan is a blank here.', { colour: MUTE });
  if (!finances) bullet('Itemised finances were turned off for this report by setting.', { colour: MUTE });
  y -= 6;

  sub('The record itself');
  kv('Source', 'the plan\'s own database, read live at the moment this file was made', { labelWidth: 108 });
  kv('Record', day.rec ? `daily/${date}` : `daily/${date} - no record exists`, { labelWidth: 108 });
  kv('Last changed', day.rec?.updatedAt
    ? new Date(day.rec.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : 'never', { labelWidth: 108 });
  kv('Generated', stamp, { labelWidth: 108 });
  kv('Day complete', isToday ? 'no, the day was still running' : 'the day had ended', { labelWidth: 108 });

  // ── footers ───────────────────────────────────────────────────────────────

  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 34 }, end: { x: A4[0] - M, y: 34 }, thickness: 0.6, color: C(RULE) });
    p.drawText(safe(`Daily progress - ${fmtDayLong(date)}`),
      { x: M, y: 22, size: 7.4, font: body, color: C(FAINT) });
    const n = `${i + 1} of ${pages.length}`;
    p.drawText(n, { x: A4[0] - M - body.widthOfTextAtSize(n, 7.4), y: 22, size: 7.4, font: body, color: C(FAINT) });
  });

  const bytes = await pdf.save();
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: `daily-${date}.pdf`,
  };
}

// ─── the per-habit working ────────────────────────────────────────────────────

/** Everything behind one habit's state, in sentences rather than a table. */
function detailFor(day, id, s) {
  const hb = day.habits[id];
  const out = [];
  if (hb.target) out.push(`Target: ${hb.target}`);

  if (id === 'walking') {
    const d = hb.detail;
    if (d.steps == null) out.push('No step count recorded.');
    else out.push(`${num(d.steps)} steps against a target of ${num(d.target)}.`);
    if (d.source) out.push(d.source === 'manual' ? 'State set by hand.' : 'State taken from the step count.');
    if (d.inconsistent) out.push(`The mark and the step count disagree, and have been left as recorded.`);
  }

  if (id === 'nutrition') {
    const d = hb.detail;
    if (d.rating) out.push(`Rated ${NUTRITION[d.rating].label}, which counts ${d.rating === 'good' ? 'in full' : d.rating === 'mixed' ? 'as a half' : 'as nothing'}.`);
    else if (d.legacyOnly && hb.state !== 'unrecorded') out.push('Recorded as a single tick under the old system, so there is no Good, Mixed or Poor behind it.');
    if (String(d.note || '').trim()) out.push(`What was eaten is reproduced in full further down.`);
  }

  if (id === 'care') {
    const d = hb.detail;
    if (d.legacyOnly) out.push('Recorded as one tick under the old system, so there is no breakdown behind it.');
    else if (d.recorded === 0) out.push('None of the three parts were recorded.');
    else {
      out.push(CARE_PARTS.map((p) => {
        const v = d.parts?.[p.id];
        return `${p.label}: ${v === true ? 'done' : v === false ? 'not done' : 'blank'}`;
      }).join(', ') + '.');
      out.push(`${d.done} of ${d.recorded} recorded part${d.recorded === 1 ? '' : 's'} done.`);
    }
  }

  if (id === 'family' && String(day.familyNote || '').trim()) {
    out.push('A note was written and is reproduced in full further down.');
  }

  if (id === 'aunty') out.push('Recorded, never scored.');

  if (hb.state === 'unrecorded' && SCORED.includes(id)) {
    out.push('Left blank. Kept out of the behaviour score and counted as missing information instead.');
  }
  if (hb.state === 'excused') {
    out.push('Excused, so it leaves the sum entirely rather than counting as a miss.');
  }
  return out;
}

/** Credit earned on a day, re-derived so the provenance section shows its working. */
function creditOf(day) {
  let credit = 0;
  for (const id of SCORED) {
    const hb = day.habits[id];
    const st = hb?.state;
    if (!st || st === 'excused' || st === 'unrecorded') continue;
    credit += id === 'nutrition' && hb.detail?.rating
      ? NUTRITION[hb.detail.rating].weight
      : STATE[st].weight;
  }
  return credit;
}

/**
 * What to call a habit's state in the report. Identical to the state's own name
 * everywhere except the two habits that are not a yes or a no underneath.
 */
function stateWord(hb) {
  if (hb.id === 'nutrition' && hb.detail?.rating) return NUTRITION[hb.detail.rating].label;
  if (hb.id === 'care' && hb.state === 'rest' && hb.detail?.recorded) {
    return `${hb.detail.done} of ${hb.detail.recorded}`;
  }
  return STATE[hb.state].label;
}

const fmtCredit = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
const capital = (x) => (x ? String(x)[0].toUpperCase() + String(x).slice(1) : '');

// Whether a line item is money coming in or going out. Read from the same list
// the rest of the plan budgets against, so the report cannot disagree with it.
const LINE_CAT = Object.fromEntries(LINE_ITEMS.map((l) => [l.name, l.category]));
const categoryOf = (item) => LINE_CAT[item] ?? '';
