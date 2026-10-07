// A minimal Chrome DevTools Protocol driver, for checking the real page with a real requestAnimationFrame loop.
//
// It starts a headless Chrome (new headless mode, throwaway profile) and returns small helpers: evaluate JavaScript in the page,
// take screenshots, send real keyboard and mouse events. Headless pages are "visible" (document.visibilityState === 'visible'),
// so requestAnimationFrame and ResizeObserver behave as in a foreground tab — unlike a browser pane that is hidden.
//
// Chrome is found from CHROME_PATH or the usual install locations; CHROME_FLAGS adds command-line flags (e.g. --no-sandbox, needed when
// running as root in a container). Needs Node 22+ (global WebSocket and fetch).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

export function findChrome() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error('no Chrome found: set CHROME_PATH');
  return found;
}

export async function launch({ port = 9333, width = 1440, height = 900, profile = join(tmpdir(), `living-world-cdp-${port}`) } = {}) {
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const proc = spawn(
    findChrome(),
    ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`, '--force-device-scale-factor=1', '--no-first-run', '--no-default-browser-check', '--disable-extensions', ...(process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(' ') : []), 'about:blank'],
    { stdio: 'ignore' },
  );
  let list;
  for (let i = 0; i < 80; i++) {
    try {
      list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      if (list.length) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!list?.length) throw new Error('chrome did not start');
  const page = list.find((t) => t.type === 'page') ?? list[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) rej(new Error(m.error.message));
      else res(m.result);
    } else if (m.method) events.push(m);
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  /** run an expression in the page and return its (JSON-able) value; promises are awaited */
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`page error: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shot = async (file) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(file, Buffer.from(r.data, 'base64'));
  };
  /** a real key press (keyDown then keyUp), e.g. key(' ', 'Space', 32) or key('.', 'Period', 190) */
  const key = async (k, code, vk) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text: k.length === 1 ? k : undefined });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
  };
  const click = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  const close = async () => {
    try {
      await send('Browser.close');
    } catch {
      /* already gone */
    }
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
  };
  return { send, evaluate, sleep, shot, key, click, close, events };
}
