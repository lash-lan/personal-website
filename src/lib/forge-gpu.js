// The video GPU: rented from Runpod when the forge needs it, turned off when idle.
//
// There is at most one, found by its name, so any page or device talks to the same
// machine. It is reachable only through a small proxy on the pod that checks a
// password made fresh for that pod; the password is kept in the pod's own settings,
// so this site holds no state of its own between requests.

const REST = 'https://rest.runpod.io/v1';
// Runpod's firewall turns away requests that do not name themselves.
const UA = 'icetear-forge/1.0';

export const POD_NAME = 'icetear-forge-gpu';
const IMAGE = 'runpod/worker-comfyui:5.10.0-base';
const MODEL_REPO = 'lashlan1/icetear-video-models';
const MODEL_PATTERNS =
  'unet/wan2.2*,clip/umt5*,vae/wan_2.1*,loras/wan2.2*,' +
  'unet/ltx-2.5*,clip/gemma4*,vae/ltx-2.5*,latent_upscale_models/ltx-2.5*';

// Whole cards with 48 GB or more, cheapest first. No MIG slices: our worker dies on them.
const GPUS = [
  'NVIDIA RTX A6000', 'NVIDIA A40', 'NVIDIA L40', 'NVIDIA L40S',
  'NVIDIA RTX 6000 Ada Generation', 'NVIDIA A100 80GB PCIe', 'NVIDIA A100-SXM4-80GB',
  'NVIDIA RTX PRO 6000 Blackwell Server Edition', 'NVIDIA H100 80GB HBM3',
];

// Runs on the pod: guards ComfyUI behind the pod's password, serves the boot log,
// and deletes the pod itself if nothing has used it for a while — so a closed laptop
// can never leave a GPU running.
const PROXY_PY = String.raw`
import hmac, http.server, os, threading, time, urllib.error, urllib.request
TOKEN = "Bearer " + os.environ["FORGE_TOKEN"]
IDLE = int(os.environ.get("FORGE_SELF_OFF_MINUTES", "20")) * 60
last = [time.time()]
def self_off():
    while True:
        time.sleep(60)
        if time.time() - last[0] > IDLE and os.environ.get("RUNPOD_API_KEY") and os.environ.get("RUNPOD_POD_ID"):
            req = urllib.request.Request("https://rest.runpod.io/v1/pods/" + os.environ["RUNPOD_POD_ID"],
                method="DELETE", headers={"Authorization": "Bearer " + os.environ["RUNPOD_API_KEY"],
                                          "User-Agent": "icetear-forge/1.0"})
            try:
                urllib.request.urlopen(req, timeout=30)
            except Exception:
                pass
threading.Thread(target=self_off, daemon=True).start()
class H(http.server.BaseHTTPRequestHandler):
    def handle_one(self):
        if not hmac.compare_digest(self.headers.get("Authorization", ""), TOKEN):
            return self.reply(401, b"locked", "text/plain")
        last[0] = time.time()
        if self.path == "/icetear/boot.log":
            try:
                data = open("/tmp/icetear/boot.log", "rb").read()[-20000:]
            except OSError:
                data = b""
            return self.reply(200, data, "text/plain")
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else None
        hdrs = {"Content-Type": self.headers["Content-Type"]} if self.headers.get("Content-Type") else {}
        req = urllib.request.Request("http://127.0.0.1:8188" + self.path, data=body, method=self.command, headers=hdrs)
        try:
            r = urllib.request.urlopen(req, timeout=600)
            self.reply(r.status, r.read(), r.headers.get("Content-Type", "application/octet-stream"))
        except urllib.error.HTTPError as e:
            self.reply(e.code, e.read(), e.headers.get("Content-Type", "text/plain"))
        except Exception as e:
            self.reply(502, str(e).encode(), "text/plain")
    def reply(self, code, data, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    do_GET = do_POST = handle_one
    def log_message(self, *args):
        pass
http.server.ThreadingHTTPServer(("0.0.0.0", 8002), H).serve_forever()
`;

// The downloader runs in its own throwaway environment: updating Python packages
// inside ComfyUI's own environment stops ComfyUI from starting at all.
const DOWNLOAD_PY =
  "import os; from huggingface_hub import snapshot_download; " +
  `snapshot_download('${MODEL_REPO}', allow_patterns=os.environ['MODEL_PATTERNS'].split(','), ` +
  "local_dir='/comfyui/models', token=os.environ.get('HF_TOKEN')); print('models ready')";

const BOOT_CMD =
  'mkdir -p /tmp/icetear && cd /tmp/icetear && (python3 -c "$PROXY_PY" >/dev/null 2>&1 &) ; ' +
  '{ echo "$(date +%T) downloading models"; ' +
  `uv run --no-project --quiet --with huggingface_hub --with hf_xet python -c "${DOWNLOAD_PY}" 2>&1 | tail -2; ` +
  'echo "$(date +%T) starting ComfyUI"; } >> /tmp/icetear/boot.log 2>&1; ' +
  '/start.sh 2>&1 | tee -a /tmp/icetear/boot.log';

async function runpod(key, method, path, body) {
  const res = await fetch(REST + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'User-Agent': UA },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Runpod ${res.status}: ${text.slice(0, 300).replaceAll(key, '***')}`);
  return text ? JSON.parse(text) : {};
}

/** The forge's pod, or null when none is running. */
export async function findPod(key) {
  const pods = await runpod(key, 'GET', '/pods');
  const mine = pods.find((p) => p.name === POD_NAME && p.desiredStatus === 'RUNNING');
  if (!mine) return null;
  const full = await runpod(key, 'GET', `/pods/${mine.id}`);
  const token = full?.env?.FORGE_TOKEN;
  return token ? { id: mine.id, token, costPerHr: Number(mine.costPerHr ?? 0) } : null;
}

export async function startPod(key) {
  const existing = await findPod(key);
  if (existing) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const pod = await runpod(key, 'POST', '/pods', {
    name: POD_NAME,
    imageName: IMAGE,
    gpuTypeIds: GPUS,
    gpuCount: 1,
    cloudType: 'SECURE',
    minRAMPerGPU: 50,
    containerDiskInGb: 110,
    ports: ['8002/http'],
    env: {
      SERVE_API_LOCALLY: 'true',
      FORGE_TOKEN: token,
      PROXY_PY,
      MODEL_PATTERNS,
      HF_TOKEN: '{{ RUNPOD_SECRET_hf_token }}',
    },
    dockerEntrypoint: ['bash', '-c'],
    dockerStartCmd: [BOOT_CMD],
  });
  return { id: pod.id, token, costPerHr: Number(pod.costPerHr ?? 0) };
}

export async function stopPod(key, id) {
  await runpod(key, 'DELETE', `/pods/${id}`);
}

/** Talk to ComfyUI on the pod, through its password-checking proxy. */
export function podFetch(pod, path, init = {}) {
  return fetch(`https://${pod.id}-8002.proxy.runpod.net${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${pod.token}`, 'User-Agent': UA, ...(init.headers ?? {}) },
  });
}

/** Whether ComfyUI is answering yet, and if not, how far the startup has got. */
export async function podStage(pod) {
  try {
    const res = await podFetch(pod, '/system_stats');
    if (res.ok) return { ready: true, stage: 'ready' };
  } catch { /* still starting */ }
  let log = '';
  try {
    const res = await podFetch(pod, '/icetear/boot.log');
    if (res.ok) log = await res.text();
  } catch { /* proxy not up yet */ }
  if (log.includes('starting ComfyUI') || log.includes('models ready')) {
    return { ready: false, stage: 'loading the video software (almost there)' };
  }
  if (log.includes('downloading models')) {
    return { ready: false, stage: 'downloading the models (1–2 min)' };
  }
  return { ready: false, stage: 'renting a GPU and installing the worker (2–4 min)' };
}
