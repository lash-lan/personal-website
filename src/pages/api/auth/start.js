// Send the reader to Google. A random state value goes with them and is
// checked when they come back, so a sign in cannot be started by someone else.
import { env } from 'cloudflare:workers';
import { googleAuthUrl, randomToken, setStateCookie } from '../../../lib/server/auth.js';

export const prerender = false;

export async function GET({ request }) {
  if (!env.GOOGLE_CLIENT_ID) {
    return new Response('Sign in is not configured yet.', { status: 503 });
  }
  const state = randomToken(16);
  const redirectUri = new URL('/api/auth/callback', request.url).toString();
  return new Response(null, {
    status: 302,
    headers: {
      location: googleAuthUrl({ clientId: env.GOOGLE_CLIENT_ID, redirectUri, state }),
      'set-cookie': setStateCookie(state),
    },
  });
}
