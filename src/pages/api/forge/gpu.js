// Switch the forge's video GPU on or off, and report what it is doing.
import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../../../lib/session.js';
import { findPod, startPod, stopPod, podStage } from '../../../lib/forge-gpu.js';

export const prerender = false;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST({ request, cookies }) {
  if (!(await ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies)))) {
    return json({ error: 'Locked.' }, 401);
  }
  const key = env.RUNPOD_API_KEY;
  if (!key) return json({ error: 'The Runpod key has not been set on the server yet.' }, 503);

  let action = 'status';
  try {
    action = String((await request.json()).action ?? 'status');
  } catch { /* status is a fine default */ }

  try {
    if (action === 'start') {
      const pod = await startPod(key);
      return json({ on: true, costPerHr: pod.costPerHr, ready: false, stage: 'starting' });
    }
    const pod = await findPod(key);
    if (action === 'stop') {
      if (pod) await stopPod(key, pod.id);
      return json({ on: false });
    }
    if (!pod) return json({ on: false });
    const { ready, stage } = await podStage(pod);
    return json({ on: true, ready, stage, costPerHr: pod.costPerHr });
  } catch (e) {
    return json({ error: String(e).slice(0, 300) }, 502);
  }
}
