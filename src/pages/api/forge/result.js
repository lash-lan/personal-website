// Is that clip done? Hands back the finished MP4, or says it is still rendering.
import { env } from 'cloudflare:workers';
import { ticketHolds, ticketFrom } from '../../../lib/session.js';
import { findPod, podFetch } from '../../../lib/forge-gpu.js';

export const prerender = false;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function GET({ request, cookies }) {
  if (!(await ticketHolds(env.ATELIER_SESSION_SECRET, ticketFrom(cookies)))) {
    return json({ error: 'Locked.' }, 401);
  }
  const key = env.RUNPOD_API_KEY;
  if (!key) return json({ error: 'The Runpod key has not been set on the server yet.' }, 503);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'No clip was named.' }, 400);

  try {
    const pod = await findPod(key);
    if (!pod) return json({ error: 'The GPU was turned off.' }, 409);

    const res = await podFetch(pod, `/history/${id}`);
    if (!res.ok) return json({ status: 'running' });
    const history = await res.json();
    const entry = history[id];
    if (!entry) return json({ status: 'running' });

    for (const message of entry.status?.messages ?? []) {
      if (message[0] === 'execution_error') {
        const detail = `${message[1]?.exception_type}: ${message[1]?.exception_message}`;
        return json({ error: detail.slice(0, 400) }, 502);
      }
    }

    for (const out of Object.values(entry.outputs ?? {})) {
      for (const items of Object.values(out)) {
        for (const item of Array.isArray(items) ? items : []) {
          if (typeof item?.filename === 'string' && /\.(mp4|webm)$/i.test(item.filename)) {
            const query = new URLSearchParams({
              filename: item.filename, subfolder: item.subfolder ?? '', type: item.type ?? 'output',
            });
            const video = await podFetch(pod, `/view?${query}`);
            if (!video.ok) return json({ error: 'The clip could not be fetched from the GPU.' }, 502);
            return new Response(video.body, {
              headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${item.filename}"`,
                'Cache-Control': 'no-store',
              },
            });
          }
        }
      }
    }
    return json({ error: 'It finished without making a clip.' }, 502);
  } catch (e) {
    return json({ error: String(e).slice(0, 300) }, 502);
  }
}
