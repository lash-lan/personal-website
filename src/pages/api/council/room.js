import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../../../lib/session.js';
import { readRoom, speak, diagnose, MAX_MESSAGE } from '../../../lib/council.js';

export const prerender = false;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

// The same door as the atelier: past it, or nothing.
async function locked(cookies) {
  return !(await ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies)));
}

// Say what actually went wrong. This page is behind the password, so there is
// nobody to keep the detail from, and a vague message costs an hour of guessing.
// A "cannot see it" answer is chased down to the layer that refused.
async function trouble(err, token) {
  const said = err && err.message ? String(err.message) : '';
  if (said.startsWith('__blind__')) {
    return json({ error: await diagnose(token, said.slice(9)) }, 502);
  }
  return json({ error: said || 'GitHub would not answer. Try again in a moment.' }, 502);
}

/** Read the room. */
export async function GET({ cookies }) {
  if (await locked(cookies)) return json({ error: 'Locked.' }, 401);

  const token = env.COUNCIL_GITHUB_TOKEN;
  if (!token) return json({ error: 'The key to the room has not been set on the server yet.' }, 503);

  try {
    return json({ messages: await readRoom(token) });
  } catch (err) {
    return await trouble(err, token);
  }
}

/** Say something in the room. */
export async function POST({ request, cookies }) {
  if (await locked(cookies)) return json({ error: 'Locked.' }, 401);

  const token = env.COUNCIL_GITHUB_TOKEN;
  if (!token) return json({ error: 'The key to the room has not been set on the server yet.' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Could not read that request.' }, 400);
  }

  const text = String(body.text ?? '').trim();
  if (!text) return json({ error: 'Nothing was said.' }, 400);
  if (text.length > MAX_MESSAGE) return json({ error: 'That message is too long.' }, 400);

  try {
    return json({ message: await speak(token, text) });
  } catch (err) {
    return await trouble(err, token);
  }
}
