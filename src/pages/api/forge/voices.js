// Which voices the home PC can speak in (and whether it is reachable at all).
import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../../../lib/session.js';
import { voiceConfig, voiceFetch, OFFLINE } from '../../../lib/forge-voice.js';

export const prerender = false;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function GET({ cookies }) {
  if (!(await ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies)))) {
    return json({ error: 'Locked.' }, 401);
  }
  const config = voiceConfig(env);
  if (!config) return json({ error: 'The voice server password has not been set on the server yet.' }, 503);

  try {
    const res = await voiceFetch(config, '/voices');
    if (!res.ok) return json({ error: res.status === 401 ? 'The voice server refused the password.' : OFFLINE }, 503);
    return json(await res.json());
  } catch {
    return json({ offline: true, error: OFFLINE }, 503);
  }
}
