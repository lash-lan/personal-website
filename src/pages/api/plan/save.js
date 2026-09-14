import { allowed, validate, save, remove, json } from '../../../lib/plan/store.js';

export const prerender = false;

// One endpoint for both writing and deleting a record, so the pages have a
// single place to talk to. Body: { collection, id, data } or { collection, id, delete: true }.
export async function POST({ request, cookies }) {
  if (!(await allowed(cookies))) return json({ error: 'Locked. Sign in again.' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Could not read that request.' }, 400);
  }

  const v = validate(body);
  if (v.error) return json({ error: v.error }, 400);

  try {
    if (body.delete === true) {
      await remove(v.collection, v.id);
      return json({ deleted: true });
    }
    return json({ record: await save(v.collection, v.id, body.data) });
  } catch (err) {
    return json({ error: err.message || 'Could not save.' }, 503);
  }
}
