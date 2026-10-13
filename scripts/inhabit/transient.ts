// How long a provider asks us to wait, when it says: the Retry-After header (seconds or an HTTP date), else the "try again in 1.5s"
// that OpenAI puts in a 429 message. Undefined when it says nothing; the gate then backs off on its own schedule.

/** "1.234s", "20ms", "6m0s", "1h2m3s" in milliseconds; undefined when there is no such thing in the text */
export function parseDuration(text: string): number | undefined {
  const re = /(\d+(?:\.\d+)?)(ms|h|m|s)/g;
  let ms = 0;
  let any = false;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    any = true;
    const n = Number(m[1]);
    ms += m[2] === 'h' ? n * 3_600_000 : m[2] === 'm' ? n * 60_000 : m[2] === 'ms' ? n : n * 1000;
  }
  return any ? Math.ceil(ms) : undefined;
}

export function retryAfterMs(e: { headers?: unknown; message?: string }): number | undefined {
  const h = e.headers;
  const raw = h instanceof Headers ? h.get('retry-after') : h && typeof h === 'object' ? (h as Record<string, string | undefined>)['retry-after'] : undefined;
  if (raw) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds)) return Math.ceil(seconds * 1000);
    const at = Date.parse(raw);
    if (Number.isFinite(at)) return Math.max(0, at - Date.now());
  }
  const m = /try again in ([0-9hms.]+)/i.exec(e.message ?? '');
  return m ? parseDuration(m[1]) : undefined;
}
