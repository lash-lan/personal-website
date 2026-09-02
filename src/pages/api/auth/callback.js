// Google sends the reader back here. Check the state, swap the code for a
// profile, then make a session and drop them back at the Trial.
import { env } from 'cloudflare:workers';
import {
  exchangeCodeForProfile, upsertUser, createSession,
  setSessionCookie, clearStateCookie, readStateCookie,
} from '../../../lib/server/auth.js';

export const prerender = false;

export async function GET({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readStateCookie(request);
  const back = (why) => new Response(null, {
    status: 302,
    headers: { location: `/trial/?signin=${why}`, 'set-cookie': clearStateCookie() },
  });

  if (url.searchParams.get('error')) return back('cancelled');
  if (!code || !state || !expected || state !== expected) return back('failed');

  try {
    const profile = await exchangeCodeForProfile({
      code,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: new URL('/api/auth/callback', request.url).toString(),
    });
    const userId = await upsertUser(env.DB, profile);
    const token = await createSession(env.DB, userId);
    // Two cookies means two headers. Joining them with a comma into one
    // header looks like it works and quietly breaks on some values.
    const headers = new Headers({ location: '/trial/?signin=ok' });
    headers.append('set-cookie', setSessionCookie(token));
    headers.append('set-cookie', clearStateCookie());
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('sign in failed', err);
    return back('failed');
  }
}
