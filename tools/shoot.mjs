// Takes the entry's screenshots and verifies the app in a real browser.
//
//   NODE_OPTIONS=--max-old-space-size=3072 node tools/shoot.mjs
//
// What it does, in order:
//   1. Serves app/ with serve.ts on http://127.0.0.1:8137.
//   2. Opens the app in headless Chrome over the DevTools protocol and
//      checks: no console errors, export with no photo is refused on screen,
//      a non-image file is refused on screen, and each of the three export
//      sizes produces a PNG at the exact pixel dimensions.
//   3. Takes one 1280 x 720 JPEG per scene in shots.json into screenshots/.
//   4. Checks every network request the app made stayed local.
// It prints one JSON summary and exits non-zero on any failed check.
// Standard library only; Chrome is the Playwright-cached Chromium.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORK = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8137;
const CDP_PORT = 9223;
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = process.env.CHROME
  ?? join(homedir(), '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');
const PROFILE = '/tmp/gta6-shoot-profile';

const shots = JSON.parse(readFileSync(join(WORK, 'shots.json'), 'utf8'));
const failures = [];
const notes = [];
function check(name, ok, detail = '') {
  notes.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      if (await fn()) return true;
    } catch { /* retry until the deadline */ }
    if (Date.now() > deadline) throw new Error(`timed out: ${label}`);
    await sleep(200);
  }
}

function startServer() {
  const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
    cwd: WORK,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=3072' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return server;
}

function startChrome() {
  return spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--user-data-dir=${PROFILE}`,
    '--window-size=1280,720',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
}

// --- minimal CDP client over the global WebSocket ---------------------------
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.requestUrls = [];
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(msg.params.exceptionDetails.text || 'exception');
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      } else if (msg.method === 'Network.requestWillBeSent') {
        this.requestUrls.push(msg.params.request.url);
      }
    };
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, awaitPromise = false) {
    const result = await this.send('Runtime.evaluate', {
      expression, awaitPromise, returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'evaluate failed');
    }
    return result.result.value;
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
  }
}

async function main() {
  if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}`);
  const server = startServer();
  const chrome = startChrome();
  try {
    await waitFor(async () => {
      const res = await fetch(`${BASE}/`);
      return res.ok;
    }, 15000, 'server up');
    await waitFor(async () => {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      return res.ok;
    }, 20000, 'chrome devtools up');

    // A fresh blank tab to drive.
    const created = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
    const target = await created.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    const cdp = new Cdp(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    // Pin the viewport: headless Chrome's window size alone leaves the
    // viewport shorter than 720 px, which would shrink every screenshot.
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 720, deviceScaleFactor: 1, mobile: false,
    });

    // --- verification pass on the plain app --------------------------------
    await cdp.navigate(`${BASE}/`);
    await waitFor(async () => cdp.evaluate(`document.querySelector('#cover') !== null`), 10000, 'app loads');
    await sleep(800);

    // Export with no photo yet must be refused on screen, not downloaded.
    await cdp.evaluate(`document.getElementById('exportBtn').click()`);
    await sleep(200);
    const emptyStatus = await cdp.evaluate(`document.getElementById('status').textContent`);
    check('export-before-photo refused', /Load a photo first/.test(emptyStatus), emptyStatus);

    // A non-image file must be refused on screen.
    await cdp.evaluate(`(() => {
      const input = document.getElementById('photoFile');
      const dt = new DataTransfer();
      dt.items.add(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
      return true;
    })()`);
    await sleep(200);
    const badStatus = await cdp.evaluate(`document.getElementById('status').textContent`);
    check('non-image file refused', /not an image file/.test(badStatus), badStatus);

    // Load a sample, then check every layout renders and every export size
    // produces a PNG at the exact pixel dimensions (parsed from the PNG's
    // own IHDR header, not from the canvas attributes alone).
    await cdp.evaluate(`document.querySelector('[data-sample="sunset-boulevard"]').click()`);
    await waitFor(async () => cdp.evaluate(`document.getElementById('status').textContent.includes('Sample loaded')`), 10000, 'sample loads');
    for (const layout of ['trio', 'quad', 'strips']) {
      await cdp.evaluate(`document.querySelector('[data-layout="${layout}"]').click()`);
      await sleep(300);
      const pixels = await cdp.evaluate(`(() => {
        const c = document.getElementById('cover');
        const ctx = c.getContext('2d');
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 997) sum += d[i];
        return sum;
      })()`, true);
      check(`layout ${layout} renders`, pixels > 0, `pixel sample sum ${pixels}`);
    }
    for (const [id, w, h] of [['1080x1080', 1080, 1080], ['1080x1350', 1080, 1350], ['1920x1080', 1920, 1080]]) {
      await cdp.evaluate(`(() => {
        const s = document.getElementById('exportSize');
        s.value = '${id}';
        s.dispatchEvent(new Event('change'));
        return true;
      })()`);
      await sleep(400);
      const dims = await cdp.evaluate(`(async () => {
        const c = document.getElementById('cover');
        const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
        const buf = new Uint8Array(await blob.arrayBuffer());
        const view = new DataView(buf.buffer);
        // PNG signature (8) + IHDR length (4) + 'IHDR' (4), then width/height.
        return { canvasW: c.width, canvasH: c.height, pngW: view.getUint32(16), pngH: view.getUint32(20), bytes: blob.size };
      })()`, true);
      check(`export ${id} exact dimensions`, dims.canvasW === w && dims.canvasH === h && dims.pngW === w && dims.pngH === h,
        `canvas ${dims.canvasW}x${dims.canvasH}, PNG ${dims.pngW}x${dims.pngH}, ${dims.bytes} bytes`);
    }

    // Caption edits repaint live: change the caption and confirm the canvas
    // pixels actually change (a checksum over sampled pixels — two different
    // captions can compress to the same byte count, so length is no proof).
    const before = await cdp.evaluate(`(() => {
      const c = document.getElementById('cover');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 131) sum = (sum + d[i] * (i % 97 + 1)) % 1000000007;
      return sum;
    })()`, true);
    await cdp.evaluate(`(() => {
      const input = document.getElementById('captionText');
      input.value = 'Neon Run';
      input.dispatchEvent(new Event('input'));
      return true;
    })()`);
    await sleep(300);
    const after = await cdp.evaluate(`(() => {
      const c = document.getElementById('cover');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 131) sum = (sum + d[i] * (i % 97 + 1)) % 1000000007;
      return sum;
    })()`, true);
    check('caption edit repaints', before !== after, `pixel checksum ${before} -> ${after}`);

    // --- screenshots --------------------------------------------------------
    mkdirSync(join(WORK, 'screenshots'), { recursive: true });
    for (const shot of shots) {
      await cdp.navigate(`${BASE}/${shot.query}`);
      await waitFor(async () => cdp.evaluate(`window.__shotReady === true`), 20000, `shot ready ${shot.name}`);
      await sleep(300);
      const shotResult = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
      const path = join(WORK, 'screenshots', shot.name);
      writeFileSync(path, Buffer.from(shotResult.data, 'base64'));
      const { size } = await import('node:fs').then((fs) => fs.statSync(path));
      check(`screenshot ${shot.name} <= 256 KiB`, size <= 262144, `${size} bytes`);
    }

    // --- runtime network: everything must have stayed local -----------------
    const external = cdp.requestUrls.filter((u) => !u.startsWith(BASE) && !u.startsWith('blob:') && !u.startsWith('data:') && u !== 'about:blank');
    check('no network requests at runtime', external.length === 0, external.slice(0, 3).join(', ') || `${cdp.requestUrls.length} local requests`);
    check('no console errors', cdp.consoleErrors.length === 0, cdp.consoleErrors.slice(0, 3).join(' | '));

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
    server.kill('SIGTERM');
  }
  for (const note of notes) console.log(note);
  console.log(JSON.stringify({ failures }));
  if (failures.length > 0) {
    console.error(`SHOOT FAILED: ${failures.length} check(s) failed`);
    process.exit(1);
  }
  console.log('SHOOT OK');
}

main().catch((error) => {
  console.error(`SHOOT ERROR: ${error.message}`);
  process.exit(1);
});
