// Signing in with Google, and keeping a session afterwards.
//
// Written out rather than pulled from a library, because the flow is small,
// well defined, and worth being able to read. Notes on the parts that matter:
//
//   - the session cookie is HttpOnly, so page scripts cannot read it
//   - the session token is stored hashed, so a leak of the table grants nothing
//   - the OAuth "state" value is checked on return, which is what stops
//     someone else starting a sign in that lands in your account
//   - no password is stored anywhere, because none is ever collected

const SESSION_COOKIE = 'boi_session';
const STATE_COOKIE = 'boi_oauth_state';
const SESSION_DAYS = 60;

const enc = new TextEncoder();

/** Random, URL safe, and long enough not to be guessed. */
export function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── cookies ─────────────────────────────────────────────────────────
const cookieHeader = (name, value, maxAgeSeconds) => {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  return parts.join('; ');
};

export const setSessionCookie = (token) =>
  cookieHeader(SESSION_COOKIE, token, SESSION_DAYS * 24 * 60 * 60);
export const clearSessionCookie = () => cookieHeader(SESSION_COOKIE, '', 0);
export const setStateCookie = (state) => cookieHeader(STATE_COOKIE, state, 600);
export const clearStateCookie = () => cookieHeader(STATE_COOKIE, '', 0);

export function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const bit of raw.split(';')) {
    const [k, ...v] = bit.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}
export const readSessionToken = (request) => readCookie(request, SESSION_COOKIE);
export const readStateCookie = (request) => readCookie(request, STATE_COOKIE);

// ─── the Google side of the handshake ────────────────────────────────
export function googleAuthUrl({ clientId, redirectUri, state }) {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'openid email profile');
  u.searchParams.set('state', state);
  u.searchParams.set('prompt', 'select_account');
  return u.toString();
}

/** Swap the one time code for tokens, then read who the person is. */
export async function exchangeCodeForProfile({ code, clientId, clientSecret, redirectUri }) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google rejected the code exchange (${res.status})`);
  const tokens = await res.json();

  const who = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!who.ok) throw new Error(`Could not read the Google profile (${who.status})`);
  const profile = await who.json();

  if (!profile.sub) throw new Error('Google returned a profile with no id');
  return { sub: profile.sub, email: profile.email || null, name: profile.name || null };
}

// ─── our side: users and sessions ────────────────────────────────────
export async function upsertUser(db, profile) {
  const now = Date.now();
  const existing = await db.prepare('SELECT id FROM users WHERE google_sub = ?')
    .bind(profile.sub).first();
  if (existing) {
    await db.prepare('UPDATE users SET email = ?, name = ? WHERE id = ?')
      .bind(profile.email, profile.name, existing.id).run();
    return existing.id;
  }
  const id = randomToken(16);
  await db.prepare(
    'INSERT INTO users (id, google_sub, email, name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, profile.sub, profile.email, profile.name, now).run();
  return id;
}

export async function createSession(db, userId) {
  const token = randomToken(32);
  const now = Date.now();
  await db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(await sha256(token), userId, now, now + SESSION_DAYS * 864e5).run();
  return token;
}

/** The signed in reader, or null. Expired sessions are cleaned up as found. */
export async function currentUser(db, request) {
  const token = readSessionToken(request);
  if (!token) return null;
  const hash = await sha256(token);
  const row = await db.prepare(
    `SELECT u.id, u.email, u.name, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`
  ).bind(hash).first();
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
}

export async function destroySession(db, request) {
  const token = readSessionToken(request);
  if (!token) return;
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?')
    .bind(await sha256(token)).run();
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
