import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../../lib/session.js';

export const prerender = false;

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'cognitivecomputations/dolphin-mistral-24b-venice-edition';

// Ceilings, so that a runaway loop or a stuck key cannot quietly drain the
// credit balance. Generous for real conversation, fatal to an accident.
const MAX_REPLY_TOKENS = 900;
const MAX_HISTORY = 40;
const MAX_CHARS = 60000;

export async function POST({ request, cookies }) {
  if (!(await ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies)))) {
    return json({ error: 'Locked.' }, 401);
  }

  const key = env.OPENROUTER_API_KEY;
  if (!key) return json({ error: 'No API key is set on the server yet.' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Could not read that request.' }, 400);
  }

  const instructions = String(body.instructions ?? '').slice(0, MAX_CHARS);
  const knowledge = String(body.knowledge ?? '').slice(0, MAX_CHARS);

  const history = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : [];
  const turns = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (!turns.length) return json({ error: 'Nothing was said.' }, 400);

  // The knowledge base rides along as part of the standing instructions, which
  // is what the model reads before every reply.
  const system = [
    instructions.trim(),
    knowledge.trim() && `Reference material you may draw on:\n\n${knowledge.trim()}`,
  ].filter(Boolean).join('\n\n');

  const upstream = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bloodoficetear.com',
      'X-Title': 'LASH Atelier',
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      max_tokens: MAX_REPLY_TOKENS,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.9,
      messages: system ? [{ role: 'system', content: system }, ...turns] : turns,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return json(
      { error: `The model refused the request (${upstream.status}).`, detail: detail.slice(0, 500) },
      502
    );
  }

  // Pass the stream straight through so words appear as they are written
  // rather than after a long silence.
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
