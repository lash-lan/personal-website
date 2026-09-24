// Things Lash shows the Council: in through POST, back out through GET.
import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../../../lib/session.js';
import { shelve, unshelve, shelveAs, typeOf, MAX_UPLOAD } from '../../../lib/council.js';

export const prerender = false;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

async function locked(cookies) {
  return !(await ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies)));
}

// Only ever the shelf, and never a path that tries to climb out of it.
const onTheShelf = (p) => /^uploads\/[A-Za-z0-9._-]+$/.test(p) && !p.includes('..');

/** Hand a file back to the page. */
export async function GET({ url, cookies }) {
  if (await locked(cookies)) return json({ error: 'Locked.' }, 401);

  const token = env.COUNCIL_GITHUB_TOKEN;
  if (!token) return json({ error: 'The key to the room has not been set on the server yet.' }, 503);

  const path = url.searchParams.get('path') || '';
  if (!onTheShelf(path)) return json({ error: 'That is not a thing in this room.' }, 400);

  try {
    const res = await unshelve(token, path);
    return new Response(res.body, {
      headers: {
        'Content-Type': typeOf(path),
        // Its name never changes once shelved, so it may be kept a good while.
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    return json({ error: (err && err.message) || 'Could not fetch that.' }, 502);
  }
}

/** Take a file in. */
export async function POST({ request, cookies }) {
  if (await locked(cookies)) return json({ error: 'Locked.' }, 401);

  const token = env.COUNCIL_GITHUB_TOKEN;
  if (!token) return json({ error: 'The key to the room has not been set on the server yet.' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Could not read that upload.' }, 400);
  }

  const data = String(body.data ?? '');
  if (!data) return json({ error: 'Nothing was sent.' }, 400);

  // Base64 carries three bytes in every four characters.
  if (data.length * 0.75 > MAX_UPLOAD) {
    return json({ error: 'That file is too big for the room. Keep it under 24 MB.' }, 413);
  }

  const path = shelveAs(body.name);
  try {
    await shelve(token, path, data);
    return json({ path: path });
  } catch (err) {
    return json({ error: (err && err.message) || 'GitHub would not keep that.' }, 502);
  }
}
