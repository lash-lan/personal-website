import { env } from 'cloudflare:workers';
import { issueTicket, secretsMatch, COOKIE, cookieOptions } from '../../lib/session.js';

export const prerender = false;

// A deliberate pause on every attempt, right or wrong. It costs a person
// nothing and makes guessing at the password thousands of times a night
// impractical.
const PAUSE_MS = 700;

export async function POST({ request, cookies, redirect }) {
  const form = await request.formData();
  const given = String(form.get('password') ?? '');

  await new Promise((r) => setTimeout(r, PAUSE_MS));

  const expected = env.ATELIER_PASSWORD;
  const signing = env.ATELIER_SESSION_SECRET;

  if (!expected || !signing) {
    return redirect('/atelier?e=unconfigured', 303);
  }

  if (!(await secretsMatch(given, expected))) {
    return redirect('/atelier?e=wrong', 303);
  }

  cookies.set(COOKIE, await issueTicket(signing), cookieOptions);
  return redirect('/atelier', 303);
}
