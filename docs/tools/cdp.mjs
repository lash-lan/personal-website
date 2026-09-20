// Drives headless Chrome over the DevTools protocol for visual QA.
// usage: node cdp.mjs <url> <outdir> <width> <height> <motion: on|off> <script.json>
import { spawn } from "node:child_process"
import { writeFileSync, readFileSync } from "node:fs"

const [, , url, outdir, W, H, motion, planFile] = process.argv
const plan = JSON.parse(readFileSync(planFile, "utf8"))
const port = 9333 + Math.floor(Math.random() * 500)
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--autoplay-policy=no-user-gesture-required", `--remote-debugging-port=${port}`, "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars",
  `--user-data-dir=C:/Users/lashl/AppData/Local/Temp/tl/cdpprof-${port}`, "about:blank",
])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let info
for (let i = 0; i < 40 && !info; i++) {
  try { info = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch { await sleep(250) }
}
const page = info.find((t) => t.type === "page")
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r))
let id = 0
const pending = new Map()
ws.addEventListener("message", (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) }
  if (d.method === "Runtime.exceptionThrown") console.log("PAGE ERROR", JSON.stringify(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 400))
  if (d.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(d.params.type)) console.log("CONSOLE", d.params.type, JSON.stringify(d.params.args.map((a) => a.value ?? a.description)).slice(0, 300))
})
const send = (method, params = {}) => Promise.race([
  new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) }),
  new Promise((r) => setTimeout(() => r({ result: { result: { value: `TIMEOUT ${method}` } } }), 20000)),
])
setTimeout(() => { chrome.kill(); process.exit(2) }, 400000)
const mobile = Number(W) < 768
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 1, mobile })
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: motion === "on" ? "no-preference" : "reduce" }] })
if (motion === "nojs") await send("Emulation.setScriptExecutionDisabled", { value: true })
await send("Page.enable")
await send("Runtime.enable")
await send("Page.navigate", { url })
await sleep(3000)
for (const step of plan) {
  if (step.eval) {
    const r = await send("Runtime.evaluate", { expression: step.eval, awaitPromise: true, returnByValue: true })
    console.log(step.name || "eval", JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.text))
  }
  if (step.wait) await sleep(step.wait)
  if (step.shot) {
    const r = await send("Page.captureScreenshot", { format: "png" })
    if (r.result?.data) writeFileSync(`${outdir}/${step.shot}.png`, Buffer.from(r.result.data, "base64"))
    else console.log("SHOT FAILED", step.shot)
  }
}
ws.close()
chrome.kill()
process.exit(0)
