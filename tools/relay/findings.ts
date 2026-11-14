// What the model relay does with reviews. A reviewer answers one JSON object; this file checks its shape, gives each finding the
// relay's own id, adds mechanical triage flags (does the file exist, is the quote really there, is the line in the diff), checks
// the adjudicator's verdicts, and renders the feedback that goes back to the writer.
//
// The rule that shapes all of it: a reviewer's prose is data. It is shown to the adjudicator as data and it never reaches the
// writer, which sees only what the adjudicator (Claude) wrote in a verdict's fixInstruction, plus the output of a test the
// adjudicator ran. That is why renderFeedback names a finding only by id and place and quotes none of the reviewer's fields: a
// reviewer that is wrong, confused or hostile can then do no more than waste an adjudication.
import { canonicalPath } from './paths';
import type { Finding, GateVerdict, Severity, Verdict, VerdictKind } from './types';

/** Pasted into the reviewer's prompt as it stands, so the shape parseFindings expects and the shape asked for cannot drift apart. */
export const FINDINGS_FORMAT: string = [
  'ANSWER FORMAT',
  'Answer with one JSON object and nothing else. No prose before or after it, no code fence. Shape:',
  '{',
  '  "findings": [',
  '    {',
  '      "severity": "P1",',
  '      "file": "src/sim/example.ts",',
  '      "start_line": 120,',
  '      "end_line": 124,',
  '      "title": "one sentence naming the defect",',
  '      "mechanism": "how the code produces the wrong result",',
  '      "trigger": "the inputs or state that trigger it, and the wrong result that follows",',
  '      "quote": "the offending line or lines, copied character for character from the files you were given",',
  '      "direction": "which way a fix lies, in one or two sentences; do not write a patch"',
  '    }',
  '  ],',
  '  "need_files": ["path/you/would/need.ts"],',
  '  "notes": "optional: older defects you noticed that this change did not introduce, in a few lines"',
  '}',
  '"findings" may be an empty list. Severity is "P0", "P1" or "P2" only.',
].join('\n');

export interface ParsedReview {
  findings: Array<Omit<Finding, 'flags'>>;
  /** findings left out: P3s, and anything beyond the cap */
  dropped: number;
  needFiles: string[];
  notes: string;
}

const MAX_NEED_FILES = 10;
const CAPS = { title: 200, mechanism: 2000, trigger: 2000, quote: 1500, direction: 2000, notes: 2000, evidence: 4000, fixInstruction: 4000 } as const;
const SEVERITIES: readonly Severity[] = ['P0', 'P1', 'P2'];
const VERDICT_KINDS: readonly VerdictKind[] = ['confirmed', 'refuted', 'not_reproduced', 'out_of_scope', 'unadjudicated'];
const ACTIONS: readonly Verdict['action'][] = ['fix', 'owner', 'drop'];

// C0 controls except tab and newline, DEL and the C1 controls, bidirectional controls (they reorder what a reader sees), and
// zero-width or invisible characters (they hide text from a reader). The same idea as the writer's forbidden characters, written
// out here so this module depends on no other implementer's file.
const FORBIDDEN = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/**
 * Text from a model made safe to show: CRLF becomes LF, every forbidden character becomes "?", and anything longer than `max`
 * is cut with " [cut]" after it. A cut never leaves half of a surrogate pair behind.
 */
export function cleanText(s: string, max: number): string {
  const text = String(s).replace(/\r\n/g, '\n').replace(FORBIDDEN, '?');
  if (text.length <= max) return text;
  let end = max;
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end--;
  return `${text.slice(0, end)} [cut]`;
}

type Json = { ok: true; value: unknown } | { ok: false; error: string };

/** The one JSON object of an answer: bare, or inside a single code fence, with only whitespace around it. */
function unwrapObject(raw: string, what: string): Json {
  let text = String(raw).replace(/^\uFEFF/, '').trim();
  const fenced = /^```[A-Za-z0-9_-]*[ \t]*\r?\n([\s\S]*?)\r?\n?[ \t]*```$/.exec(text);
  if (fenced) text = fenced[1].trim();
  if (!text) return { ok: false, error: `the answer is empty; answer with ${what}` };
  if (!text.startsWith('{')) return { ok: false, error: `there is text before the JSON object; answer with ${what} and nothing else` };
  if (!text.endsWith('}')) return { ok: false, error: `there is text after the JSON object; answer with ${what} and nothing else` };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: `the answer is not valid JSON (${e instanceof Error ? e.message : String(e)})` };
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isWhole = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const shown = (v: unknown): string => {
  const s = JSON.stringify(v) ?? String(v);
  return s.length > 60 ? `${s.slice(0, 60)}...` : s;
};

/**
 * Validate a reviewer's answer. Every problem found is reported at once, each naming the finding (counted from 1) and the field,
 * so a single repair request can put them all right. `max` findings are kept, most severe first.
 */
export function parseFindings(text: string, opts: { idPrefix: string; max: number }): { ok: true; review: ParsedReview } | { ok: false; error: string } {
  const unwrapped = unwrapObject(text, 'one JSON object');
  if (!unwrapped.ok) return unwrapped;
  const root = unwrapped.value;
  if (!isObject(root) || !Array.isArray(root.findings)) return { ok: false, error: 'the JSON object must have a "findings" list (it may be empty)' };

  const errors: string[] = [];
  const kept: Array<Omit<Finding, 'flags' | 'id'>> = [];
  let skipped = 0;
  root.findings.forEach((raw, i) => {
    const at = `finding ${i + 1}`;
    if (!isObject(raw)) {
      errors.push(`${at}: must be an object`);
      return;
    }
    const sev = raw.severity;
    if (sev === 'P3') {
      skipped++;
      return;
    }
    const before = errors.length;
    if (sev !== 'P0' && sev !== 'P1' && sev !== 'P2') errors.push(`${at}, severity: must be "P0", "P1" or "P2", not ${shown(sev)}`);
    const file = typeof raw.file === 'string' ? canonicalPath(raw.file) : null;
    if (file === null) errors.push(`${at}, file: ${shown(raw.file)} is not a repository-relative path (forward slashes, no "..", no leading dot or drive)`);
    const startRaw = raw.start_line !== undefined && raw.start_line !== null ? raw.start_line : raw.line;
    let startLine = 1;
    if (!isWhole(startRaw) || startRaw < 1) errors.push(`${at}, start_line: must be a whole number of at least 1, not ${shown(startRaw)}`);
    else startLine = startRaw;
    let endLine = startLine;
    if (raw.end_line !== undefined && raw.end_line !== null) {
      if (!isWhole(raw.end_line) || raw.end_line < 1) errors.push(`${at}, end_line: must be a whole number of at least 1, not ${shown(raw.end_line)}`);
      else if (raw.end_line < startLine) errors.push(`${at}, end_line: ${raw.end_line} is smaller than start_line ${startLine}`);
      else endLine = raw.end_line;
    }
    for (const f of ['title', 'mechanism', 'trigger', 'quote', 'direction'] as const) {
      if (!nonEmpty(raw[f])) errors.push(`${at}, ${f}: must be a non-empty string`);
    }
    if (errors.length > before) return;
    const clean = (f: 'title' | 'mechanism' | 'trigger' | 'direction'): string => cleanText((raw[f] as string).trim(), CAPS[f]);
    kept.push({
      severity: sev as Severity,
      file: file as string,
      startLine,
      endLine,
      title: clean('title'),
      mechanism: clean('mechanism'),
      trigger: clean('trigger'),
      // the quote keeps its own leading spaces: triage compares it with the file's indentation
      quote: cleanText(raw.quote as string, CAPS.quote),
      direction: clean('direction'),
    });
  });
  if (errors.length) return { ok: false, error: errors.join('; ') };

  const ranked = SEVERITIES.flatMap((s) => kept.filter((f) => f.severity === s));
  const max = Math.max(0, Math.floor(opts.max));
  const findings = ranked.slice(0, max).map((f, i) => ({ id: `${opts.idPrefix}-F${String(i + 1).padStart(2, '0')}`, ...f }));

  const needFiles: string[] = [];
  if (Array.isArray(root.need_files)) {
    for (const n of root.need_files) {
      const c = typeof n === 'string' ? canonicalPath(n) : null;
      if (c !== null && !needFiles.includes(c) && needFiles.length < MAX_NEED_FILES) needFiles.push(c);
    }
  }
  const notes = typeof root.notes === 'string' ? cleanText(root.notes.trim(), CAPS.notes) : '';
  return { ok: true, review: { findings, dropped: ranked.length - findings.length + skipped, needFiles, notes } };
}

/**
 * The new-side line ranges of each file's hunks in a unified diff, keyed by lower-cased path. A hunk that adds nothing (d = 0) is a
 * pure deletion and is recorded as the single line [c, c] where the deletion sits. Hunk bodies are read by their line counts, so
 * an added line that happens to begin with "++ " is never mistaken for a file header.
 */
export function diffRanges(unifiedDiff: string): Map<string, Array<[number, number]>> {
  const out = new Map<string, Array<[number, number]>>();
  let current: string | null = null;
  let oldLeft = 0;
  let newLeft = 0;
  for (const line of unifiedDiff.split(/\r?\n/)) {
    if (oldLeft > 0 || newLeft > 0) {
      if (line.startsWith('diff --git ') || line.startsWith('@@ ')) {
        oldLeft = 0;
        newLeft = 0;
      } else {
        const c = line[0];
        if (c === '+') newLeft--;
        else if (c === '-') oldLeft--;
        else if (c === '\\') continue;
        else {
          oldLeft--;
          newLeft--;
        }
        continue;
      }
    }
    if (line.startsWith('+++ ')) {
      let p = line.slice(4).split('\t')[0].trim();
      if (p === '/dev/null') {
        current = null;
        continue;
      }
      if (p.startsWith('b/')) p = p.slice(2);
      current = p.toLowerCase();
      continue;
    }
    const h = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (h && current !== null) {
      oldLeft = h[1] === undefined ? 1 : Number(h[1]);
      const start = Number(h[2]);
      const count = h[3] === undefined ? 1 : Number(h[3]);
      newLeft = count;
      const list = out.get(current) ?? [];
      list.push(count === 0 ? [start, start] : [start, start + count - 1]);
      out.set(current, list);
    }
  }
  return out;
}

/** CRLF to LF and no trailing whitespace on any line: the two spellings a quote and a file may differ in without meaning anything. */
function normaliseLines(s: string): string[] {
  return s.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/[ \t\r\f\v]+$/, ''));
}

/** Mechanical flags per finding. They inform the adjudicator; none of them replaces reproducing the defect. */
export function triage(review: ParsedReview, ctx: { read(path: string): string | null; ranges: Map<string, Array<[number, number]>> }): Finding[] {
  return review.findings.map((f) => {
    const text = ctx.read(f.file);
    let quoteFound = false;
    if (text !== null) {
      const quote = normaliseLines(f.quote);
      while (quote.length && quote[0] === '') quote.shift();
      while (quote.length && quote[quote.length - 1] === '') quote.pop();
      if (quote.length) quoteFound = normaliseLines(text).join('\n').includes(quote.join('\n'));
    }
    const ranges = ctx.ranges.get(f.file.toLowerCase()) ?? [];
    const inDiff = ranges.some(([a, b]) => f.startLine <= b && f.endLine >= a);
    return { ...f, flags: { fileExists: text !== null, quoteFound, inDiff } };
  });
}

/**
 * Check the adjudicator's verdicts against the findings that were put to them: every id exactly once, no stranger, and the rules
 * that stop a "fix" going to the writer without a confirmed defect, evidence and an instruction. Verdicts come back in the
 * findings' order.
 */
export function parseVerdicts(text: string, findings: Finding[]): { ok: true; verdicts: Verdict[] } | { ok: false; error: string } {
  const unwrapped = unwrapObject(text, 'one JSON object with a "verdicts" list');
  if (!unwrapped.ok) return unwrapped;
  const root = unwrapped.value;
  if (!isObject(root) || !Array.isArray(root.verdicts)) return { ok: false, error: 'the JSON object must have a "verdicts" list' };

  const known = new Set(findings.map((f) => f.id));
  const seen = new Map<string, Verdict>();
  const errors: string[] = [];
  root.verdicts.forEach((raw, i) => {
    if (!isObject(raw)) {
      errors.push(`verdict ${i + 1}: must be an object`);
      return;
    }
    const id = raw.id;
    if (typeof id !== 'string' || !known.has(id)) {
      errors.push(`verdict ${i + 1}: unknown id ${shown(id)}; the findings are ${[...known].join(', ') || 'none'}`);
      return;
    }
    if (seen.has(id)) {
      errors.push(`${id}: appears more than once`);
      return;
    }
    const before = errors.length;
    const bad = (rule: string): void => void errors.push(`${id}: ${rule}`);
    const verdict = raw.verdict as VerdictKind;
    const action = raw.action as Verdict['action'];
    if (!VERDICT_KINDS.includes(verdict)) bad(`verdict must be one of ${VERDICT_KINDS.join(', ')}, not ${shown(raw.verdict)}`);
    if (!ACTIONS.includes(action)) bad(`action must be one of ${ACTIONS.join(', ')}, not ${shown(raw.action)}`);
    let severity: Severity | undefined;
    if (raw.severity !== undefined && raw.severity !== null) {
      if (raw.severity === 'P0' || raw.severity === 'P1' || raw.severity === 'P2') severity = raw.severity;
      else bad(`severity must be "P0", "P1" or "P2" when given, not ${shown(raw.severity)}`);
    }
    if (raw.evidence !== undefined && typeof raw.evidence !== 'string') bad('evidence must be a string');
    if (raw.fixInstruction !== undefined && raw.fixInstruction !== null && typeof raw.fixInstruction !== 'string') bad('fixInstruction must be a string');
    const evidence = typeof raw.evidence === 'string' ? cleanText(raw.evidence.trim(), CAPS.evidence) : '';
    const fixInstruction = typeof raw.fixInstruction === 'string' ? cleanText(raw.fixInstruction.trim(), CAPS.fixInstruction) : '';
    if (VERDICT_KINDS.includes(verdict) && ACTIONS.includes(action)) {
      if (action === 'fix' && verdict !== 'confirmed') bad(`action "fix" requires verdict "confirmed", not "${verdict}"`);
      if (action === 'fix' && !fixInstruction) bad('action "fix" requires a non-empty fixInstruction');
      if (action === 'fix' && !evidence) bad('action "fix" requires non-empty evidence');
      if (verdict === 'confirmed' && !evidence) bad('verdict "confirmed" requires non-empty evidence');
      if (verdict === 'unadjudicated' && action !== 'owner' && action !== 'drop') bad('verdict "unadjudicated" requires action "owner" or "drop"');
    }
    let unlockTests: string[] | undefined;
    if (raw.unlockTests !== undefined && raw.unlockTests !== null) {
      if (!Array.isArray(raw.unlockTests)) bad('unlockTests must be a list of repository-relative paths');
      else {
        const paths: string[] = [];
        raw.unlockTests.forEach((p, k) => {
          const c = typeof p === 'string' ? canonicalPath(p) : null;
          if (c === null) bad(`unlockTests[${k}]: ${shown(p)} is not a repository-relative path`);
          else if (!paths.includes(c)) paths.push(c);
        });
        unlockTests = paths;
      }
    }
    if (errors.length > before) return;
    const v: Verdict = { id, verdict, action, evidence };
    if (severity) v.severity = severity;
    if (fixInstruction) v.fixInstruction = fixInstruction;
    if (unlockTests) v.unlockTests = unlockTests;
    seen.set(id, v);
  });
  for (const f of findings) if (!seen.has(f.id) && !errors.some((e) => e.startsWith(`${f.id}:`))) errors.push(`${f.id}: no verdict given`);
  if (errors.length) return { ok: false, error: errors.join('; ') };
  return { ok: true, verdicts: findings.map((f) => seen.get(f.id) as Verdict) };
}

/** A fence longer than any run of backticks inside the text, so output that holds a fence cannot close ours early. */
function fenced(text: string): string {
  let longest = 0;
  for (const m of text.matchAll(/`+/g)) longest = Math.max(longest, m[0].length);
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}\n${text.replace(/\n+$/, '')}\n${fence}`;
}

const ANSI = /\u001B\[[0-9;]*[A-Za-z]/g;

/** Tool output made fit to show: colour codes removed, forbidden characters replaced, and only the last `max` characters kept. */
function tail(text: string, max: number): string {
  const clean = String(text).replace(ANSI, '').replace(/\r\n/g, '\n').replace(FORBIDDEN, '?');
  return clean.length > max ? `[earlier output cut]\n${clean.slice(clean.length - max)}` : clean;
}

/** digit runs padded, so R1-F2 sorts before R1-F10 */
const naturalKey = (id: string): string => id.replace(/\d+/g, (d) => d.padStart(8, '0'));

/**
 * What the writer is told about the confirmed findings: the adjudicator's instruction and, where the adjudicator ran one, a test
 * that fails on the writer's code. Nothing a reviewer wrote is repeated here; see the file's header. Empty when nothing is to be
 * fixed. Test files named by unlockTests are listed only for verdicts that are being fixed this round.
 */
export function renderFeedback(findings: Finding[], verdicts: Verdict[], probeOutputs: Record<string, string>): string {
  const byId = new Map(findings.map((f) => [f.id, f]));
  const fixes = verdicts.filter((v) => v.action === 'fix' && byId.has(v.id)).sort((a, b) => (naturalKey(a.id) < naturalKey(b.id) ? -1 : naturalKey(a.id) > naturalKey(b.id) ? 1 : 0));
  if (!fixes.length) return '';
  const parts: string[] = [];
  const unlock: string[] = [];
  for (const v of fixes) {
    const f = byId.get(v.id) as Finding;
    const lines = [`## ${v.id} (${v.severity ?? f.severity})`, `Where: ${f.file}:${f.startLine}-${f.endLine}`, '', v.fixInstruction ?? ''];
    const probe = Object.prototype.hasOwnProperty.call(probeOutputs, v.id) ? probeOutputs[v.id] : undefined;
    if (probe) lines.push('', 'A test that fails on your code:', fenced(tail(probe, 4000)));
    parts.push(lines.join('\n'));
    for (const t of v.unlockTests ?? []) if (!unlock.includes(t)) unlock.push(t);
  }
  if (unlock.length) parts.push(`In this round you may also change these test files: ${unlock.sort().join(', ')}.`);
  return `${parts.join('\n\n')}\n`;
}

/** What the writer is told when the gate fails: the type errors, then each test the change newly broke. */
export function renderGateFeedback(verdict: GateVerdict, typecheckOutput: string): string {
  const parts: string[] = [];
  if (verdict.typecheckBroken) parts.push(`The type check fails:\n\n${fenced(tail(typecheckOutput, 6000))}`);
  for (const t of verdict.newFailures) {
    const id = t.id.replace(/[\r\n]+/g, ' ').replace(FORBIDDEN, '?');
    const message = cleanText(String(t.message).replace(ANSI, ''), 2000);
    parts.push(`### ${id}\n\n${fenced(message)}`);
  }
  if (!parts.length) return '';
  parts.push('The tests state the required behaviour; change the code, not what the tests assert, unless the feedback above says a test is wrong.');
  return `${parts.join('\n\n')}\n`;
}
