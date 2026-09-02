import { env } from 'cloudflare:workers';
import { destroySession, clearSessionCookie, json } from '../../../lib/server/auth.js';

export const prerender = false;

export async function POST({ request }) {
  await destroySession(env.DB, request);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}
