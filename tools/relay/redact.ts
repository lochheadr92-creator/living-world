// Removes what must never be shown from a piece of text: API keys, and the absolute paths of the owner's machine. Everything the
// relay prints, logs or hands to another model passes through a redactor first, because a vendor can echo a key back in an error
// body, and a tool's output names the clone and home directories in several spellings (as typed, with backslashes doubled by JSON,
// with slashes, and on Windows in any letter case). The redactor is pure and total: a failure inside it returns a fixed string and
// never the original text, since the original is the thing that was not to be shown.
import type { ProviderName, RelayConfig } from './types';

/** a key shorter than this is not replaced: it would also eat ordinary words, and no real key is this short */
const MIN_SECRET = 8;
const REDACTED = '[redacted]';

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WINDOWS_DRIVE = /^[A-Za-z]:[\\/]/;
const WINDOWS_UNC = /^\\\\[^\\]/;

/** the spellings a secret takes in a JSON body: as it is, and with JSON's escapes (a key with a quote or backslash in it) */
function secretSpellings(secret: string): string[] {
  const escaped = JSON.stringify(secret).slice(1, -1);
  return escaped === secret ? [secret] : [secret, escaped];
}

interface PathRule {
  /** every spelling, longest first */
  spellings: string[];
  to: string;
  caseless: boolean;
  /** the length of the path as given, so a longer path is dealt with before a shorter one that may sit inside it */
  weight: number;
}

function pathRule(from: string, to: string): PathRule | null {
  if (typeof from !== 'string' || typeof to !== 'string') return null;
  // A trailing separator is dropped so that "C:\work\clone\" still matches "C:\work\clone\src"; the separator then stays in the text.
  const base = from.replace(/[\\/]+$/, '');
  if (from.length < 2 || base.length < 2 || /^[A-Za-z]:$/.test(base)) return null;
  const windows = WINDOWS_DRIVE.test(from) || WINDOWS_UNC.test(from);
  const slashes = base.replace(/\\/g, '/');
  const spellings = new Set<string>([base, base.replace(/\\/g, '\\\\'), slashes]);
  if (windows) {
    const backslashes = slashes.replace(/\//g, '\\');
    spellings.add(backslashes);
    spellings.add(backslashes.replace(/\\/g, '\\\\'));
  }
  // a stack frame inside an ES module is a file URL, where a space is %20 and a non-ASCII letter is percent-encoded
  try {
    const encoded = encodeURI(slashes);
    if (encoded !== slashes) spellings.add(encoded);
  } catch {
    // a lone surrogate cannot be encoded; the other spellings still apply
  }
  return { spellings: [...spellings].sort((a, b) => b.length - a.length), to, caseless: windows, weight: base.length };
}

/**
 * A function that replaces every secret of at least 8 characters with "[redacted]" and every path prefix with its placeholder.
 * Paths are matched in the spellings above; longer paths go first. An empty or one-character path is ignored, as is a bare drive
 * root such as "C:\", which would turn every "C:" in a message into a placeholder.
 */
export function makeRedactor(secrets: readonly string[], paths: ReadonlyArray<{ from: string; to: string }>): (text: string) => string {
  const keys = new Set<string>();
  for (const s of Array.isArray(secrets) ? secrets : []) {
    if (typeof s === 'string' && s.length >= MIN_SECRET) for (const v of secretSpellings(s)) keys.add(v);
  }
  const orderedKeys = [...keys].sort((a, b) => b.length - a.length);

  const rules: PathRule[] = [];
  for (const p of Array.isArray(paths) ? paths : []) {
    const rule = p ? pathRule(p.from, p.to) : null;
    if (rule) rules.push(rule);
  }
  rules.sort((a, b) => b.weight - a.weight);
  const compiled = rules.map((r) => ({ re: new RegExp(r.spellings.map(escapeRegExp).join('|'), r.caseless ? 'gi' : 'g'), to: r.to }));

  return (text: string): string => {
    try {
      let out = typeof text === 'string' ? text : String(text ?? '');
      for (const k of orderedKeys) out = out.split(k).join(REDACTED);
      // a replacement function, so a "$&" in a placeholder is text and not a pattern
      for (const c of compiled) out = out.replace(c.re, () => c.to);
      return out;
    } catch {
      return '[text withheld: redaction failed]';
    }
  };
}

/** The key value of every provider that has one in the environment, for makeRedactor. A blank value is no key. */
export function secretsFrom(cfg: RelayConfig, env: Record<string, string | undefined>): string[] {
  const out = new Set<string>();
  const providers = (cfg && cfg.providers ? cfg.providers : {}) as Partial<Record<ProviderName, { keyEnv?: string }>>;
  for (const p of Object.values(providers)) {
    const name = p?.keyEnv;
    if (typeof name !== 'string' || !name) continue;
    const value = env[name];
    if (typeof value === 'string' && value.trim()) out.add(value.trim());
  }
  return [...out];
}
