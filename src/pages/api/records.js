// Saving and listing a reader's Trial records.
//
// The answers are stored, not the finished prose, so a record can be rebuilt
// exactly as it was and will always agree with what the page shows.
import { env } from 'cloudflare:workers';
import { currentUser, randomToken, json } from '../../lib/server/auth.js';
import { evaluateDeep } from '../../lib/trial-engine-deep.js';

export const prerender = false;

const MAX_RECORDS = 50;

export async function GET({ request }) {
  if (!env.DB) return json({ records: [] });
  const user = await currentUser(env.DB, request);
  if (!user) return json({ error: 'not signed in' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT id, archetype, tier, mask, clarity, taken_at
       FROM records WHERE user_id = ? ORDER BY taken_at DESC LIMIT ?`
  ).bind(user.id, MAX_RECORDS).all();
  return json({ records: results || [] });
}

export async function POST({ request }) {
  if (!env.DB) return json({ error: 'not configured' }, 503);
  const user = await currentUser(env.DB, request);
  if (!user) return json({ error: 'not signed in' }, 401);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'bad request' }, 400); }

  const answers = body && body.answers;
  if (!answers || !Array.isArray(answers.trial) || answers.trial.length !== 24) {
    return json({ error: 'that does not look like a completed Trial' }, 400);
  }

  // Score it here rather than trusting what the page sent. A record should
  // always be the honest result of the answers behind it.
  let result;
  try { result = evaluateDeep(answers); }
  catch { return json({ error: 'those answers could not be scored' }, 400); }

  const takenAt = Number(body.takenAt) || Date.now();
  const id = randomToken(16);
  await env.DB.prepare(
    `INSERT INTO records (id, user_id, archetype, tier, mask, clarity, answers, taken_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, user.id, result.archetype.name, result.tier, result.mask,
         result.clarity.score, JSON.stringify(answers), takenAt, Date.now()).run();

  // Keep the list from growing without limit.
  await env.DB.prepare(
    `DELETE FROM records WHERE user_id = ? AND id NOT IN (
       SELECT id FROM records WHERE user_id = ? ORDER BY taken_at DESC LIMIT ?)`
  ).bind(user.id, user.id, MAX_RECORDS).run();

  return json({ ok: true, id, archetype: result.archetype.name, tier: result.tier });
}
