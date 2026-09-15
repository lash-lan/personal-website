// The voice server lives on the home PC, reached through a Cloudflare Tunnel. It only
// answers while that PC is on, awake and running the server, so every call here is
// quick to give up and says so plainly.

export const VOICE_TIMEOUT_MS = 5 * 60 * 1000; // a long passage can take a few minutes
const LIST_TIMEOUT_MS = 8000;
export const MAX_CHARS = 1500;

export const OFFLINE =
  "Your PC's voice server isn't answering. The PC may be off or asleep, or the voice server isn't running.";

export function voiceConfig(env) {
  const url = String(env.VOICE_SERVER_URL ?? 'https://voice.bloodoficetear.com').replace(/\/+$/, '');
  const token = env.VOICE_SERVER_TOKEN;
  return token ? { url, token } : null;
}

export function voiceFetch(config, path, init = {}, timeoutMs = LIST_TIMEOUT_MS) {
  return fetch(config.url + path, {
    ...init,
    headers: { Authorization: `Bearer ${config.token}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
}
