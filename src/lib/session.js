// The lock on the private pages.
//
// There are no accounts. One password, checked against a secret that lives in
// Cloudflare and never in this repository. Get it right and you are handed a
// signed ticket, kept in a cookie, which proves on later visits that you passed
// the door — without the password being stored or sent again.

const enc = new TextEncoder();

export const COOKIE = 'lash_pass';
const DAYS = 30;

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

const toB64 = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64 = (s) => {
  const p = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(p + '='.repeat((4 - (p.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** A ticket good for DAYS days. */
export async function issueTicket(secret) {
  const expires = String(Date.now() + DAYS * 86400000);
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(expires));
  return `${expires}.${toB64(sig)}`;
}

/** True only for a ticket this site signed, that has not expired. */
export async function ticketHolds(secret, ticket) {
  if (!secret || typeof ticket !== 'string') return false;
  const [expires, sig] = ticket.split('.');
  if (!expires || !sig) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  try {
    return await crypto.subtle.verify(
      'HMAC', await hmacKey(secret), fromB64(sig), enc.encode(expires)
    );
  } catch {
    return false;
  }
}

/**
 * Compare two secrets without leaking, through timing, how much of a guess was
 * right. Both sides are hashed first so that even their lengths do not show.
 */
export async function secretsMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Read the ticket the browser is carrying, if any. */
export function ticketFrom(cookies) {
  return cookies.get(COOKIE)?.value ?? '';
}

export const cookieOptions = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: DAYS * 86400,
};
