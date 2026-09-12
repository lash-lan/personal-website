// Send one clip to the GPU: upload the first frame, then queue the recipe.
// Answers straight away with a job id; the page then asks /api/forge/result for it.
import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../../../lib/session.js';
import { findPod, startPod, podFetch, podStage } from '../../../lib/forge-gpu.js';
import { MODELS, WORKFLOWS, videoSize } from '../../../lib/forge-workflows.js';

export const prerender = false;

// Ceilings, so a stuck page cannot quietly spend money or memory.
const MAX_PROMPT = 2000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST({ request, cookies }) {
  if (!(await ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies)))) {
    return json({ error: 'Locked.' }, 401);
  }
  const key = env.RUNPOD_API_KEY;
  if (!key) return json({ error: 'The Runpod key has not been set on the server yet.' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Could not read that request.' }, 400);
  }

  const model = MODELS[body.model] ? body.model : 'wan';
  const prompt = String(body.prompt ?? '').slice(0, MAX_PROMPT).trim();
  const shape = String(body.shape ?? 'Match my image');
  const spec = MODELS[model];
  const shortSide = spec.sizes[body.size] ?? Object.values(spec.sizes)[0];
  if (!prompt) return json({ error: 'Describe the motion first.' }, 400);

  const dataUrl = String(body.image ?? '');
  const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : '';
  if (!base64) return json({ error: 'Upload a starting image first.' }, 400);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (bytes.length > MAX_IMAGE_BYTES) return json({ error: 'That image is too large.' }, 413);

  // The page sends the image already cut to the chosen shape, so its size decides the clip's.
  const width = Number(body.width) || 0;
  const height = Number(body.height) || 0;
  const [w, h] = width && height
    ? [width, height]
    : videoSize(shape, shortSide, 16, 9, spec.multiple);

  try {
    const pod = (await findPod(key)) ?? (await startPod(key));
    const { ready, stage } = await podStage(pod);
    if (!ready) return json({ waiting: true, stage, costPerHr: pod.costPerHr });

    const form = new FormData();
    form.append('image', new Blob([bytes], { type: 'image/png' }), 'start.png');
    form.append('overwrite', 'true');
    const upload = await podFetch(pod, '/upload/image', { method: 'POST', body: form });
    if (!upload.ok) return json({ error: `The GPU refused the image (${upload.status}).` }, 502);

    const seed = Math.floor(Math.random() * 2 ** 31);
    const workflow = WORKFLOWS[model](prompt, 'start.png', w, h, spec.seconds, seed);
    const queued = await podFetch(pod, '/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });
    const result = await queued.json();
    if (result.node_errors && Object.keys(result.node_errors).length) {
      return json({ error: `The recipe was rejected: ${JSON.stringify(result.node_errors).slice(0, 300)}` }, 502);
    }
    return json({ id: result.prompt_id, width: w, height: h, seed, costPerHr: pod.costPerHr });
  } catch (e) {
    return json({ error: String(e).slice(0, 300) }, 502);
  }
}
