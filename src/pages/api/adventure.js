import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../../lib/session.js';
import { STORY, chapterProse, chapterCount, CHAPTERS } from '../../data/rangers.js';

export const prerender = false;

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'cognitivecomputations/dolphin-mistral-24b-venice-edition';

const MAX_REPLY_TOKENS = 500;
const MAX_HISTORY = 30;
const MAX_NAME = 40;

export async function POST({ request, cookies }) {
  if (!(await ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies)))) {
    return json({ error: 'Locked.' }, 401);
  }
  const key = env.OPENROUTER_API_KEY;
  if (!key) return json({ error: 'No API key is set on the server yet.' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Could not read that.' }, 400); }

  const at = Number(body.chapter);
  if (!Number.isInteger(at) || at < 0 || at >= chapterCount) {
    return json({ error: 'There is no such chapter.' }, 400);
  }

  const name = (String(body.name ?? '').trim() || STORY.heroFirst).slice(0, MAX_NAME);
  const beginning = body.begin === true;

  const turns = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-MAX_HISTORY)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  const chapter = CHAPTERS[at];
  const next = CHAPTERS[at + 1];

  // Order matters more than wording here. The chapter runs to thousands of
  // words, and anything placed before it is read as background; the rules that
  // must actually be obeyed go last, after the text, where they are closest to
  // the reply being written.
  const system = [
    `You are running an interactive telling of one chapter of "${STORY.title}", from the ${STORY.saga} saga.`,

    `THE CHAPTER, AS WRITTEN — this is canon. Its people, places and events are fixed, ` +
    `and they happen in this order. Invent nothing that contradicts it, and no characters ` +
    `who are not in the saga.\n\n───\n${chapterProse(at)}\n───`,

    `THE PLAYER. The narrator of that chapter is the player. In the text above he is ` +
    `called ${STORY.hero}. He is not called that here. He is called ${name}. ` +
    `Wherever the text says "${STORY.heroFirst}" or "${STORY.hero}", the person meant is ${name}. ` +
    `Every character addresses him as ${name}. Write to him as "you", never as "I".`,

    `YOUR WORK. Let the player live through this chapter instead of reading it. The events ` +
    `stand; how the player meets them is theirs. If they do something the chapter did not, ` +
    `let it play out honestly, then bring the scene back towards the events that must happen.`,

    `Make the world answer. Name what is underfoot, what is within reach, who is watching. ` +
    `When there is a fight, a spar or a duel, run it blow by blow: one exchange per turn, ` +
    `the outcome uncertain, the player choosing each move. Let them be hurt, disarmed or ` +
    `beaten. Nothing is settled in a single turn.`,

    `HOW TO WRITE A TURN:`,
    `- Address the player as "you". Put every spoken word in double quotation marks.`,
    `- About seventy words. Never longer.`,
    `- Roughly half description and action, half speech.`,
    `- Only what could be seen or heard. Never write the player's thoughts, feelings or choices.`,
    `- Never act or speak for the player. Stop, and let them decide.`,
    `- Stay inside the story. Do not comment on it, hedge, apologise or add notes.`,

    beginning
      ? `THIS IS THE FIRST TURN OF THE CHAPTER. It has three parts and all three are required.\n` +
        `First, one line in exactly this form:\n` +
        `BRIEF: about forty words saying plainly where things stand as the chapter opens — ` +
        `where ${name} is, who is with him, what is bearing down on him. Name him: begin it ` +
        `"You are ${name}, ..." or work his name in. Written to "you". Nothing from later in the chapter.\n` +
        `Then a blank line. Then the chapter's opening moment, seventy words at most. ` +
        `Then the OPTIONS line, which is required on this turn exactly as on every other.`
      : ``,

    `When the chapter's closing events have played out, put CHAPTER COMPLETE on its own line.` +
    (next ? ` The story then goes on to "${next.title}".` : ` This is the last chapter.`),

    // Last, and stated twice, because these two are the ones that were dropped.
    `TWO RULES ABOVE ALL OTHERS:`,
    `1. The player is ${name}. The name "${STORY.heroFirst}" must never appear in your reply.`,
    `2. Your reply MUST end with a line in exactly this form, and nothing after it:\n` +
    `OPTIONS: something to do | something else | a third thing\n` +
    `Three things ${name} could do right now, two to six words each — one careful, one bold, ` +
    `one spoken aloud. Never the same three twice. A reply without this line is wrong.`,
  ].filter(Boolean).join('\n\n');

  const opening = beginning
    ? [{ role: 'user', content: `Begin chapter ${chapter.numeral}, "${chapter.title}".` }]
    : [];

  const upstream = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bloodoficetear.com',
      'X-Title': 'LASH Red Rangers',
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      max_tokens: MAX_REPLY_TOKENS,
      temperature: 0.85,
      messages: [{ role: 'system', content: system }, ...opening, ...turns],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return json({ error: `The story would not continue (${upstream.status}).`, detail: detail.slice(0, 400) }, 502);
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  });
}

function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
