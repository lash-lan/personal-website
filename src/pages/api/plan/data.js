import { allowed, loadAll, json } from '../../../lib/plan/store.js';

export const prerender = false;

export async function GET({ cookies }) {
  if (!(await allowed(cookies))) return json({ error: 'Locked.' }, 401);
  try {
    return json({ collections: await loadAll() });
  } catch (err) {
    return json({ error: err.message || 'Could not read the plan.' }, 503);
  }
}
