// Who is signed in, if anyone. Used by the Trial page to decide what to offer.
import { env } from 'cloudflare:workers';
import { currentUser, json } from '../../lib/server/auth.js';

export const prerender = false;

export async function GET({ request }) {
  if (!env.DB) return json({ user: null, configured: false });
  const user = await currentUser(env.DB, request);
  return json({ user, configured: Boolean(env.GOOGLE_CLIENT_ID) });
}
