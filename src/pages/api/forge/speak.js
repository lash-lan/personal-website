// Speak a passage in one of the library voices, on the home PC, and hand back the audio.
import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../../../lib/session.js';
import { voiceConfig, voiceFetch, OFFLINE, MAX_CHARS, VOICE_TIMEOUT_MS } from '../../../lib/forge-voice.js';

export const prerender = false;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST({ request, cookies }) {
  if (!(await ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies)))) {
    return json({ error: 'Locked.' }, 401);
  }
  const config = voiceConfig(env);
  if (!config) return json({ error: 'The voice server password has not been set on the server yet.' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Could not read that request.' }, 400);
  }
  const text = String(body.text ?? '').slice(0, MAX_CHARS).trim();
  if (!text) return json({ error: 'Write something to say.' }, 400);
  const format = body.format === 'wav' ? 'wav' : 'mp3';

  let res;
  try {
    res = await voiceFetch(config, '/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice: String(body.voice ?? ''), text, language: String(body.language ?? 'English'), format }),
    }, VOICE_TIMEOUT_MS);
  } catch {
    return json({ offline: true, error: OFFLINE }, 503);
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error ?? ''; } catch { /* not JSON */ }
    return json({ error: detail || `The voice server failed (${res.status}).` }, 502);
  }
  return new Response(res.body, {
    headers: {
      'Content-Type': format === 'wav' ? 'audio/wav' : 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}
