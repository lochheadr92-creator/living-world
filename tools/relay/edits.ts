// Turns the writer's reply into file contents. The reply is untrusted text: it is parsed into SEARCH/REPLACE blocks, every block is
// checked against the paths the work order names, and the blocks become new file texts all together or not at all. Nothing is
// written by parsing or planning; only writePlanned touches the disk, and it undoes itself if a step fails.
//
// Prior art compared (docs/MODEL_RELAY.md): aider's "diff" edit format for the block syntax (Apache-2.0; the syntax only, no code
// copied); the exactly-one-match rule of Anthropic's text-editor str_replace contract and of Cline's editor; and aider's
// uniform-indentation fallback, kept as the single tolerance tier. Deliberately not taken from aider: first match wins,
// retargeting a failed block to another file, appending when SEARCH is empty, writing the blocks that passed, and any
// similarity matching. A block that is almost right is sent back to the writer with the real lines, not guessed at here.
//
// Two reasons for the shape of the checks. Hidden characters (bidirectional controls, zero-width characters) would let a reviewer
// read something other than what runs, so REPLACE text containing them is refused. And every SEARCH is matched against the file
// as it was given, never against the result of an earlier block, so the order the writer sends blocks in cannot change what they
// mean.
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { canonicalPath, resolveInside } from './paths';
import type { BlockFailure, EditBlock, FilePolicy, FileStore, ParseResult, PlanResult, PlannedFile } from './types';

// The marker lines are built, not written out, so this file never holds a line that a merge tool or an editor would take for a
// conflict marker.
const MARK_SEARCH = `${'<'.repeat(7)} SEARCH`;
const MARK_SPLIT = '='.repeat(7);
const MARK_REPLACE = `${'>'.repeat(7)} REPLACE`;
const FENCE = '```';

/** The text that teaches the writer the format; pack.ts pastes it into the prompt. */
export const WRITER_FORMAT: string = `HOW TO ANSWER
Answer with SEARCH/REPLACE blocks, then a NOTES section, then one final line. Every block has exactly this shape:

path/from/repo/root.ts
${FENCE}ts
${MARK_SEARCH}
lines copied character for character from the current file
${MARK_SPLIT}
the lines that replace them
${MARK_REPLACE}
${FENCE}

Rules:
1. The path stands alone on the line before the opening fence, exactly as the work order writes it, with forward slashes.
2. SEARCH must match the file exactly, including indentation and comments, and must match in exactly ONE place. Add surrounding lines until it is unique. Keep it small: the lines that change and a few around them, not whole functions.
3. Every SEARCH is matched against the file as you were given it, not against the result of your earlier blocks. Blocks for one file must not overlap.
4. To create a file listed under "create": the same block with an EMPTY SEARCH section; REPLACE is the whole file.
5. You may edit only files listed under "edit" and create only files listed under "create". Any other path is refused.
6. Never write "..." or "rest unchanged" inside a block. Never number lines.
7. All blocks are applied together or not at all.

If you cannot do the work correctly from what you were given, do not guess. Send no blocks, and begin NOTES with a line "BLOCKED:" saying exactly what is missing (for example "NEED_FILE: src/sim/x.ts").

After the last block write:
NOTES
- what you changed and why, one line per file
- anything in the work order you did not do, and why
- anything you could not check
and then, as the very last line of your answer, the number of blocks you sent:
END-OF-EDITS blocks=<number>`;

// ---- parsing ----

const RE_SEARCH = new RegExp(`^${'<'.repeat(7)} SEARCH[ \\t]*$`);
const RE_SPLIT = new RegExp(`^${'='.repeat(7)}[ \\t]*$`);
const RE_REPLACE = new RegExp(`^${'>'.repeat(7)} REPLACE[ \\t]*$`);
const RE_OPEN_FENCE = /^`{3,}[A-Za-z0-9_+.-]*[ \t]*$/;
const RE_CLOSE_FENCE = /^`{3,}[ \t]*$/;
const RE_END = /^END-OF-EDITS blocks=(\d+)[ \t]*$/;
const RE_BLOCKED = /^\s*(?:-\s+)?BLOCKED:/;

const isMarker = (line: string): boolean => RE_SEARCH.test(line) || RE_SPLIT.test(line) || RE_REPLACE.test(line);

function quote(line: string): string {
  return JSON.stringify(line.length > 200 ? `${line.slice(0, 200)}...` : line);
}

/** Backticks, asterisks and quotes around a path, a trailing colon, and backslashes: what models put on a path line. */
function cleanPath(raw: string): string {
  const wrap = /^[`*"'‘’“”\s]+|[`*"'‘’“”\s]+$/g;
  let s = raw;
  for (;;) {
    const before = s;
    s = s.replace(wrap, '').replace(/:$/, '');
    if (s === before) break;
  }
  return s.replace(/\\/g, '/');
}

export function parseEdits(reply: string): ParseResult {
  const lines = reply.replace(/\r\n?/g, '\n').split('\n');
  let last = lines.length - 1;
  while (last >= 0 && lines[last].trim() === '') last--;
  const end = last >= 0 ? RE_END.exec(lines[last]) : null;
  if (!end) return { ok: false, error: 'the answer did not end with END-OF-EDITS blocks=N: it was cut off or the final line was left out' };
  const claimed = Number(end[1]);
  const body = lines.slice(0, last);

  const fail = (at: number, expected: string): ParseResult => ({ ok: false, error: `line ${at + 1}: expected ${expected}; found ${quote(body[at] ?? '')}` });

  const blocks: EditBlock[] = [];
  // the first line a path may sit on: just after the previous block, closing fence included
  let floor = 0;
  let i = 0;
  while (i < body.length) {
    const line = body[i];
    if (RE_SPLIT.test(line) || RE_REPLACE.test(line)) {
      return fail(i, `no marker here: this ${RE_SPLIT.test(line) ? 'divider' : 'REPLACE'} line is outside any block (a marker line inside a body cannot be told from a real one)`);
    }
    if (!RE_SEARCH.test(line)) {
      i++;
      continue;
    }
    let p = i - 1;
    while (p >= floor && body[p].trim() === '') p--;
    if (p >= floor && RE_OPEN_FENCE.test(body[p])) p--;
    while (p >= floor && body[p].trim() === '') p--;
    const path = p >= floor ? cleanPath(body[p]) : '';
    if (path === '') return fail(i, 'a path line (the file path on its own line) before the SEARCH marker');

    let j = i + 1;
    const search: string[] = [];
    while (j < body.length && !RE_SPLIT.test(body[j])) {
      if (RE_SEARCH.test(body[j]) || RE_REPLACE.test(body[j])) return fail(j, `the ${MARK_SPLIT} divider that ends the SEARCH section of the block opened on line ${i + 1} (markers must balance)`);
      search.push(body[j]);
      j++;
    }
    if (j >= body.length) return fail(i, `the ${MARK_SPLIT} divider for this block, but the answer reached its end first`);
    j++;
    const replace: string[] = [];
    while (j < body.length && !RE_REPLACE.test(body[j])) {
      if (RE_SEARCH.test(body[j]) || RE_SPLIT.test(body[j])) return fail(j, `the ${MARK_REPLACE} line that ends the block opened on line ${i + 1} (markers must balance)`);
      replace.push(body[j]);
      j++;
    }
    if (j >= body.length) return fail(i, `the ${MARK_REPLACE} line for this block, but the answer reached its end first`);
    j++;
    if (j < body.length && RE_CLOSE_FENCE.test(body[j])) j++;

    blocks.push({ path, search: search.join('\n'), replace: replace.join('\n'), index: blocks.length + 1 });
    floor = j;
    i = j;
  }

  if (claimed !== blocks.length) {
    return { ok: false, error: `the last line says END-OF-EDITS blocks=${claimed} but ${blocks.length} block${blocks.length === 1 ? '' : 's'} could be read: send every block and state the true number` };
  }
  const noteLines = body.slice(floor);
  const notes = noteLines.join('\n').trim();
  let blocked: string | null = null;
  if (blocks.length === 0) {
    const at = noteLines.findIndex((l) => RE_BLOCKED.test(l));
    if (at < 0) return { ok: false, error: 'no blocks and no BLOCKED: line' };
    blocked = noteLines.slice(at).join('\n').trim();
  }
  return { ok: true, blocks, notes, blocked };
}

// ---- policy and store ----

/** Keys are the lower-cased canonical paths, values the work order's own spelling. locked = locked minus unlocked, lower-cased. */
export function buildPolicy(order: { edit: string[]; create: string[] }, locked: Iterable<string>, unlock: Iterable<string>): FilePolicy {
  const keyed = (list: string[], what: string): Map<string, string> => {
    const m = new Map<string, string>();
    for (const p of list) {
      const c = canonicalPath(p);
      if (c === null) throw new Error(`work order ${what} path is not one the relay can handle: ${JSON.stringify(p)}`);
      m.set(c.toLowerCase(), p);
    }
    return m;
  };
  const norm = (p: string): string => (canonicalPath(p) ?? p.trim().replace(/\\/g, '/')).toLowerCase();
  const open = new Set([...unlock].map(norm));
  const lockedSet = new Set<string>();
  for (const p of locked) {
    const k = norm(p);
    if (!open.has(k)) lockedSet.add(k);
  }
  return { edit: keyed(order.edit, 'edit'), create: keyed(order.create, 'create'), locked: lockedSet };
}

/** Reads under a root with the path checks of resolveInside. A BOM is kept as the first character; invalid UTF-8 is an error. */
export function diskStore(root: string): FileStore {
  return {
    read(path: string): string | null {
      const abs = resolveInside(root, path);
      let st;
      try {
        st = statSync(abs);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw e;
      }
      if (!st.isFile()) throw new Error(`not a regular file: ${path}`);
      try {
        return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(abs));
      } catch (e) {
        throw new Error(`${path} could not be read as UTF-8 text: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

// ---- forbidden characters ----

function isForbidden(cp: number): boolean {
  return (
    (cp < 0x20 && cp !== 9 && cp !== 10 && cp !== 13) ||
    (cp >= 0x7f && cp <= 0x9f) ||
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2060 && cp <= 0x2064) ||
    (cp >= 0x2066 && cp <= 0x2069) ||
    cp === 0xfeff ||
    // a lone surrogate would be written as U+FFFD, silently changing the text
    (cp >= 0xd800 && cp <= 0xdfff)
  );
}

const hex = (cp: number): string => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

/** The first control, bidirectional, zero-width or invisible character in the text, with its 1-based line; null when there is none. */
export function forbiddenCharacter(text: string): { codePoint: number; line: number } | null {
  let line = 1;
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp === 10) line++;
    else if (isForbidden(cp)) return { codePoint: cp, line };
  }
  return null;
}

/** text with each forbidden character written as <U+XXXX>, for echoing a block back where it can be seen */
function visible(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    out += isForbidden(cp) ? `<${hex(cp)}>` : ch;
  }
  return out;
}

// ---- planning ----

interface Matched {
  block: EditBlock;
  start: number;
  end: number;
  replacement: string;
  tier: number;
}

interface EditGroup {
  path: string;
  raw: string;
  bom: string;
  text: string;
  eol: '\n' | '\r\n';
  problem: null | 'mixed_line_endings' | 'marker_in_file';
  matched: Matched[];
}

const MARKER_IN_FILE = [new RegExp(`^${'<'.repeat(7)} SEARCH\\s*$`, 'm'), new RegExp(`^${'='.repeat(7)}\\s*$`, 'm'), new RegExp(`^${'>'.repeat(7)} REPLACE\\s*$`, 'm')];

function openGroup(path: string, raw: string): EditGroup {
  const bom = raw.startsWith('﻿') ? '﻿' : '';
  const text = raw.slice(bom.length);
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/(?<!\r)\n/g) ?? []).length;
  const loneCr = (text.match(/\r(?!\n)/g) ?? []).length;
  let problem: EditGroup['problem'] = null;
  if (loneCr > 0 || (crlf > 0 && lf > 0)) problem = 'mixed_line_endings';
  else if (MARKER_IN_FILE.some((re) => re.test(text))) problem = 'marker_in_file';
  return { path, raw, bom, text, eol: crlf > 0 && lf === 0 ? '\r\n' : '\n', problem, matched: [] };
}

function lineAt(text: string, offset: number): number {
  let n = 1;
  for (let i = text.indexOf('\n'); i >= 0 && i < offset; i = text.indexOf('\n', i + 1)) n++;
  return n;
}

/** every place the needle starts, overlapping ones included: a match that could be read two ways is not unique */
function findAll(text: string, needle: string): number[] {
  const hits: number[] = [];
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) hits.push(at);
  return hits;
}

const manyDetail = (count: number, lineNumbers: number[]): string => `matches ${count} places (lines ${lineNumbers.slice(0, 3).join(', ')}${count > 3 ? ' and others' : ''})`;

const isBlank = (l: string): boolean => l.trim() === '';
const indentOf = (l: string): number => (/^[ \t]*/.exec(l) as RegExpExecArray)[0].length;

type Found = { ok: true; match: Matched } | { ok: false; reason: 'no_match' | 'many_matches'; detail: string };

function matchBlock(g: EditGroup, block: EditBlock): Found {
  const { text, eol } = g;
  const toFile = (s: string): string => (eol === '\n' ? s : s.replace(/\n/g, eol));
  const needle = toFile(block.search);
  const hits = findAll(text, needle);
  if (hits.length === 1) return { ok: true, match: { block, start: hits[0], end: hits[0] + needle.length, replacement: toFile(block.replace), tier: 0 } };
  if (hits.length > 1) return { ok: false, reason: 'many_matches', detail: manyDetail(hits.length, hits.map((h) => lineAt(text, h))) };

  const searchLines = block.search.split('\n');
  if (searchLines.every(isBlank)) return { ok: false, reason: 'no_match', detail: 'SEARCH text not found' };
  const replaceLines = block.replace.split('\n');
  const d = Math.min(...[...searchLines, ...replaceLines].filter((l) => !isBlank(l)).map(indentOf));
  const outdent = (l: string): string => (isBlank(l) ? l : l.slice(d));
  const wantS = searchLines.map(outdent);
  const wantR = replaceLines.map(outdent);

  const fileLines = text.split(eol);
  const starts: number[] = [];
  let off = 0;
  for (const l of fileLines) {
    starts.push(off);
    off += l.length + eol.length;
  }
  const windows: Array<{ at: number; prefix: string }> = [];
  for (let s = 0; s + searchLines.length <= fileLines.length; s++) {
    let prefix: string | null = null;
    let ok = true;
    for (let k = 0; k < searchLines.length && ok; k++) {
      const f = fileLines[s + k];
      if (isBlank(searchLines[k])) {
        ok = isBlank(f);
        continue;
      }
      const want = wantS[k];
      if (!f.endsWith(want)) {
        ok = false;
        continue;
      }
      const pre = f.slice(0, f.length - want.length);
      if (!/^[ \t]*$/.test(pre) || (prefix !== null && prefix !== pre)) ok = false;
      else prefix = pre;
    }
    if (ok && prefix !== null) windows.push({ at: s, prefix });
  }
  if (windows.length === 0) return { ok: false, reason: 'no_match', detail: 'SEARCH text not found' };
  if (windows.length > 1) return { ok: false, reason: 'many_matches', detail: manyDetail(windows.length, windows.map((w) => w.at + 1)) };
  const w = windows[0];
  const last = w.at + searchLines.length - 1;
  const replacement = wantR.map((l) => (isBlank(l) ? l : w.prefix + l)).join(eol);
  return { ok: true, match: { block, start: starts[w.at], end: starts[last] + fileLines[last].length, replacement, tier: 1 } };
}

export function planEdits(blocks: EditBlock[], policy: FilePolicy, store: FileStore): PlanResult {
  const failures: BlockFailure[] = [];
  const fail = (b: EditBlock, path: string, reason: BlockFailure['reason'], detail: string): void => {
    failures.push({ index: b.index, path, reason, detail });
  };
  const reads = new Map<string, string | null>();
  const read = (path: string): string | null => {
    if (!reads.has(path)) reads.set(path, store.read(path));
    return reads.get(path) ?? null;
  };
  const allowed = (): string => `edit: ${[...policy.edit.values()].join(', ') || 'none'}; create: ${[...policy.create.values()].join(', ') || 'none'}`;

  const edits = new Map<string, EditGroup | 'missing'>();
  const creates = new Map<string, { path: string; content: string; index: number }>();
  const createFirst = new Map<string, number>();

  for (const b of blocks) {
    const canon = canonicalPath(b.path);
    const key = canon === null ? null : canon.toLowerCase();
    const createPath = key === null ? undefined : policy.create.get(key);
    const editPath = key === null || createPath !== undefined ? undefined : policy.edit.get(key);
    if (key === null || (createPath === undefined && editPath === undefined)) {
      fail(b, b.path, 'path_not_allowed', `this path is not listed in the work order, so it cannot be edited or created (${allowed()}); use only those paths, spelled as listed`);
      continue;
    }
    const path = (createPath ?? editPath) as string;

    const badReplace = forbiddenCharacter(b.replace);
    const badSearch = createPath !== undefined ? forbiddenCharacter(b.search) : null;
    if (badReplace || badSearch) {
      const bad = badReplace ?? (badSearch as { codePoint: number; line: number });
      fail(b, path, 'forbidden_characters', `${hex(bad.codePoint)} at line ${bad.line} of ${badReplace ? 'REPLACE' : 'SEARCH'}`);
      continue;
    }

    if (createPath !== undefined) {
      if (b.search.trim() !== '') {
        fail(b, path, 'path_not_allowed', 'this path is under create: its SEARCH must be empty');
        continue;
      }
      const first = createFirst.get(key);
      if (first !== undefined) {
        fail(b, path, 'file_exists', `block ${first} already creates this file; a file is created by exactly one block, with its whole text in REPLACE`);
        continue;
      }
      createFirst.set(key, b.index);
      if (read(path) !== null) {
        fail(b, path, 'file_exists', 'this file already exists, so it cannot be created; edit it only if the work order lists it under edit');
        continue;
      }
      creates.set(key, { path, content: `${b.replace.replace(/\n+$/, '')}\n`, index: b.index });
      continue;
    }

    let group = edits.get(key);
    if (group === undefined) {
      const raw = read(path);
      group = raw === null ? 'missing' : openGroup(path, raw);
      edits.set(key, group);
    }
    if (group === 'missing') {
      fail(b, path, 'file_missing', 'this file does not exist, so there is nothing to edit; check the path against the work order');
      continue;
    }
    if (b.search.trim() === '') {
      fail(b, path, 'empty_search_on_edit', 'this block edits an existing file but its SEARCH is empty; copy the lines to change into SEARCH, and use an empty SEARCH only for a file under create');
      continue;
    }
    if (policy.locked.has(key)) {
      fail(b, path, 'locked_test', 'this test file was frozen when the gate first passed; it can be changed only when the feedback names it');
      continue;
    }
    if (group.problem === 'mixed_line_endings') {
      fail(b, path, 'mixed_line_endings', 'this file mixes line endings, so no edit to it can be applied safely; send no block for it and say so in NOTES, beginning with BLOCKED:');
      continue;
    }
    if (group.problem === 'marker_in_file') {
      fail(b, path, 'marker_in_file', 'this file has a line that looks like a block marker, so an edit to it could not be told from the format; send no block for it and say so in NOTES, beginning with BLOCKED:');
      continue;
    }
    const found = matchBlock(group, b);
    if (found.ok) group.matched.push(found.match);
    else fail(b, path, found.reason, found.detail);
  }

  // blocks that matched are checked against each other, in the original text
  for (const g of edits.values()) {
    if (g === 'missing') continue;
    const byStart = [...g.matched].sort((a, b) => a.start - b.start || a.block.index - b.block.index);
    const refused = new Set<number>();
    let holder: Matched | null = null;
    let reach = -1;
    for (const m of byStart) {
      if (holder !== null && m.start < reach) {
        const later = m.block.index > holder.block.index ? m : holder;
        const other = later === m ? holder : m;
        if (!refused.has(later.block.index)) {
          refused.add(later.block.index);
          fail(later.block, g.path, 'overlap', `this SEARCH overlaps the text matched by block ${other.block.index} of the same file; blocks for one file must not overlap, so merge them into one block`);
        }
      }
      if (m.end > reach) {
        reach = m.end;
        holder = m;
      }
    }
  }

  if (failures.length > 0) {
    failures.sort((a, b) => a.index - b.index);
    return { ok: false, failures, repairMessage: renderRepair(failures, blocks, store, policy) };
  }

  const files: PlannedFile[] = [];
  for (const key of policy.edit.keys()) {
    const g = edits.get(key);
    if (g === undefined || g === 'missing') continue;
    let text = g.text;
    for (const m of [...g.matched].sort((a, b) => b.start - a.start)) text = text.slice(0, m.start) + m.replacement + text.slice(m.end);
    const inOrder = [...g.matched].sort((a, b) => a.block.index - b.block.index);
    files.push({ path: g.path, created: false, before: g.raw, after: g.bom + text, tiers: inOrder.map((m) => m.tier) });
  }
  for (const key of policy.create.keys()) {
    const c = creates.get(key);
    if (c !== undefined) files.push({ path: c.path, created: true, before: null, after: c.content, tiers: [0] });
  }
  return { ok: true, files };
}

// ---- the message that goes back to the writer ----

const REASON_WORDS: Record<BlockFailure['reason'], string> = {
  path_not_allowed: 'path not allowed',
  file_missing: 'file does not exist',
  file_exists: 'file already exists',
  no_match: 'SEARCH not found in the file',
  many_matches: 'SEARCH matches more than one place',
  overlap: 'overlaps another block',
  mixed_line_endings: 'file has mixed line endings',
  marker_in_file: 'file contains a marker-like line',
  forbidden_characters: 'forbidden characters',
  locked_test: 'test file is locked',
  empty_search_on_edit: 'empty SEARCH on an existing file',
};

/** a fence longer than any run of backticks in the text, so the text cannot close it */
function fenceFor(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((r) => r.length));
  return '`'.repeat(Math.max(3, longest + 1));
}

function fenced(text: string, language = ''): string {
  const fence = fenceFor(text);
  return `${fence}${language}\n${text}\n${fence}`;
}

function echoBlock(path: string, b: EditBlock): string {
  const body = [MARK_SEARCH, ...(b.search === '' ? [] : b.search.split('\n')), MARK_SPLIT, ...(b.replace === '' ? [] : b.replace.split('\n')), MARK_REPLACE].join('\n');
  return `${path}\n${fenced(visible(body), 'ts')}`;
}

function sentence(detail: string): string {
  const s = detail.charAt(0).toUpperCase() + detail.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

/** The real lines near where the first SEARCH line occurs, trimmed on both sides; null when it does not occur. */
function candidate(fileText: string, search: string): { lines: string[]; replaceNote: (replace: string) => boolean } | null {
  const fileLines = fileText.replace(/^﻿/, '').split(/\r?\n/);
  const searchLines = search.split('\n');
  const first = searchLines.find((l) => !isBlank(l));
  if (first === undefined) return null;
  const at = fileLines.findIndex((l) => l.trim() === first.trim());
  const replaceNote = (replace: string): boolean => {
    const rl = replace.split('\n');
    if (rl.every(isBlank)) return false;
    for (let s = 0; s + rl.length <= fileLines.length; s++) if (rl.every((l, k) => fileLines[s + k] === l)) return true;
    return false;
  };
  if (at < 0) return { lines: [], replaceNote };
  return { lines: fileLines.slice(Math.max(0, at - 2), at + searchLines.length + 3).slice(0, 40), replaceNote };
}

export function renderRepair(failures: BlockFailure[], blocks: EditBlock[], store: FileStore, policy: FilePolicy): string {
  const out: string[] = [`# ${failures.length} of ${blocks.length} blocks could not be applied. Nothing was written.`];
  for (const f of failures) {
    out.push('', `## Block ${f.index}: ${f.path}: ${REASON_WORDS[f.reason]}`);
    const block = blocks.find((b) => b.index === f.index);
    if (block) out.push('', echoBlock(f.path, block));
    out.push('');
    if (f.reason === 'no_match') {
      out.push(`This SEARCH does not match the current text of ${f.path} exactly (indentation and comments included).`);
      const key = canonicalPath(f.path)?.toLowerCase();
      if (block && key !== undefined && policy.edit.has(key)) {
        let text: string | null = null;
        try {
          text = store.read(policy.edit.get(key) as string);
        } catch {
          text = null;
        }
        const cand = text === null ? null : candidate(text, block.search);
        if (cand && cand.lines.length > 0) out.push('', `Did you mean these actual lines from ${f.path}?`, fenced(visible(cand.lines.join('\n'))));
        if (cand && cand.replaceNote(block.replace)) out.push('', `The REPLACE lines are already in ${f.path}: this block may not be needed.`);
      }
    } else if (f.reason === 'many_matches') {
      const m = /^matches (\d+) places \(lines (.+)\)$/.exec(f.detail);
      out.push(m ? `This SEARCH matches ${m[1]} places in ${f.path} (lines ${m[2]}). Add surrounding lines until it matches exactly one.` : `This SEARCH matches several places in ${f.path}. Add surrounding lines until it matches exactly one.`);
    } else if (f.reason === 'forbidden_characters') {
      out.push(`The block contains a hidden or control character (${f.detail}): remove it and write plain visible characters only.`);
    } else {
      out.push(sentence(f.detail));
    }
  }
  out.push('', 'Send ALL your blocks again, corrected, in the same format, ending with END-OF-EDITS blocks=<number>.');
  return out.join('\n');
}

// ---- writing ----

function lstatOrNull(path: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(path);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

/**
 * Writes the planned files: each to a temporary sibling ending ".relay-tmp" that is then renamed over the target. If any step
 * fails, what this call already did is undone (edited files rewritten byte for byte, created files and the directories made for
 * them removed, temporaries removed) and the error is rethrown. An edited file that no longer holds the text the plan was made
 * from, or a created file whose target has appeared since, is an error: the plan would overwrite somebody else's change.
 */
export function writePlanned(root: string, files: PlannedFile[]): void {
  const targets = files.map((file) => ({ file, abs: resolveInside(root, file.path) }));
  const undo: Array<() => void> = [];
  let temp: string | null = null;
  try {
    for (const { file, abs } of targets) {
      temp = `${abs}.relay-tmp`;
      const bytes = Buffer.from(file.after, 'utf8');
      if (lstatOrNull(temp)) rmSync(temp, { force: true });
      if (file.created) {
        if (lstatOrNull(abs)) throw new Error(`${file.path} appeared since the plan was made; it was not overwritten`);
        const made: string[] = [];
        undo.push(() => {
          for (const dir of [...made].reverse()) {
            try {
              rmdirSync(dir);
            } catch {
              // not empty or already gone: leave it
            }
          }
        });
        const missing: string[] = [];
        for (let d = dirname(abs); !existsSync(d); d = dirname(d)) {
          missing.unshift(d);
          if (dirname(d) === d) break;
        }
        for (const d of missing) {
          mkdirSync(d);
          made.push(d);
        }
        writeFileSync(temp, bytes, { flag: 'wx' });
        renameSync(temp, abs);
        undo.push(() => rmSync(abs, { force: true }));
      } else {
        if (file.before === null) throw new Error(`${file.path} is planned as an edit but has no earlier text`);
        const current = readFileSync(abs);
        if (!current.equals(Buffer.from(file.before, 'utf8'))) throw new Error(`${file.path} changed since the plan was made; it was not overwritten`);
        const mode = statSync(abs).mode & 0o777;
        writeFileSync(temp, bytes, { flag: 'wx' });
        try {
          chmodSync(temp, mode);
        } catch {
          // keeping the mode is best effort
        }
        renameSync(temp, abs);
        undo.push(() => writeFileSync(abs, current));
      }
      temp = null;
    }
  } catch (e) {
    if (temp !== null) {
      try {
        rmSync(temp, { force: true });
      } catch {
        // the undo below must still run
      }
    }
    for (const step of undo.reverse()) {
      try {
        step();
      } catch {
        // keep undoing the rest
      }
    }
    throw e;
  }
}
